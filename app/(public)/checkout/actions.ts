"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { pedidoInputSchema, type PedidoInput } from "@/lib/validations/pedido"
import { generateCodigoPublico } from "@/lib/pedidos/codigo-publico"
import { metodosPagoDisponibles } from "@/lib/pedidos/reglas-pago"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function crearPedido(input: PedidoInput) {
  const parsed = pedidoInputSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Datos inválidos" }
  }
  const data = parsed.data
  const supabase = await createSupabaseServerClient()

  const productoIds = data.items.map((i) => i.producto_id)
  const { data: productos } = await supabase
    .from("productos")
    .select("id, nombre, slug, precio_venta, modo, stock_unidades, estado")
    .in("id", productoIds)
  if (!productos || productos.length !== productoIds.length) {
    return { error: "Algunos productos no existen o ya no están disponibles" }
  }
  for (const p of productos) {
    if (p.estado !== "publicado") {
      return { error: `El producto "${p.nombre}" ya no está disponible` }
    }
  }

  const productoMap = new Map(productos.map((p) => [p.id, p]))
  let tieneStock = false
  let tienePreorden = false
  let total = 0
  const itemsToInsert: Array<{
    producto_id: string
    variante_id: string | null
    nombre_snapshot: string
    precio_snapshot: number
    cantidad: number
    modo: string
  }> = []

  const varianteIds = data.items.map((i) => i.variante_id).filter((v): v is string => !!v)
  let variantes: Map<string, number> = new Map()
  if (varianteIds.length > 0) {
    const { data: vs } = await supabase
      .from("producto_variantes")
      .select("id, precio_extra")
      .in("id", varianteIds)
    if (vs) variantes = new Map(vs.map((v) => [v.id, v.precio_extra]))
  }

  // Suma de unidades stock por producto para validar contra stock_unidades.
  const stockSolicitadoPorProducto = new Map<string, number>()
  for (const item of data.items) {
    if (item.modo === "stock") {
      stockSolicitadoPorProducto.set(
        item.producto_id,
        (stockSolicitadoPorProducto.get(item.producto_id) || 0) + item.cantidad
      )
    }
  }
  for (const [productoId, qty] of stockSolicitadoPorProducto) {
    const p = productoMap.get(productoId)
    if (!p) continue
    if (p.modo !== "stock") {
      return { error: `El producto "${p.nombre}" no se vende como stock` }
    }
    if ((p.stock_unidades ?? 0) < qty) {
      return {
        error: `Solo quedan ${p.stock_unidades ?? 0} de "${p.nombre}" en stock. Ajusta el carrito.`,
      }
    }
  }

  for (const item of data.items) {
    const p = productoMap.get(item.producto_id)
    if (!p) continue
    const precioExtra = item.variante_id ? variantes.get(item.variante_id) || 0 : 0
    const precio = p.precio_venta + precioExtra
    total += precio * item.cantidad
    // El cliente decide modo por línea — pero un producto preorden puro nunca puede ser "stock".
    const modoEfectivo = p.modo === "preorden" ? "preorden" : item.modo
    if (modoEfectivo === "stock") tieneStock = true
    if (modoEfectivo === "preorden") tienePreorden = true
    itemsToInsert.push({
      producto_id: p.id,
      variante_id: item.variante_id || null,
      nombre_snapshot: p.nombre,
      precio_snapshot: precio,
      cantidad: item.cantidad,
      modo: modoEfectivo,
    })
  }

  const allowed = metodosPagoDisponibles(data.zona_entrega, { tieneStock, tienePreorden, total })
  if (!allowed.find((m) => m.value === data.metodo_pago)) {
    return { error: "El método de pago seleccionado no está permitido para esta zona/pedido" }
  }
  const metodo = allowed.find((m) => m.value === data.metodo_pago)!
  if (metodo.requiereComprobante && !data.comprobante_inicial_url) {
    return { error: "Falta el comprobante de pago" }
  }

  const codigo = generateCodigoPublico()
  const montoInicial =
    metodo.porcentajeInicial > 0
      ? Math.round((total * metodo.porcentajeInicial) / 100 * 100) / 100
      : null

  const metodoPagoStored = data.metodo_pago.includes("50_50")
    ? "50_50"
    : data.metodo_pago.includes("yappy")
    ? "yappy"
    : data.metodo_pago.includes("transferencia")
    ? "transferencia"
    : "efectivo"

  const { data: pedido, error: errPedido } = await supabase
    .from("pedidos")
    .insert({
      codigo_publico: codigo,
      nombre_cliente: data.nombre_cliente,
      whatsapp_cliente: data.whatsapp_cliente,
      email_cliente: data.email_cliente || null,
      zona_entrega: data.zona_entrega,
      direccion_entrega: data.direccion_entrega || null,
      metodo_pago: metodoPagoStored,
      comprobante_url: data.comprobante_inicial_url,
      comprobante_inicial_url: data.comprobante_inicial_url,
      monto_pagado_inicial: montoInicial,
      total,
      notas_internas: data.notas_cliente
        ? `Nota cliente: ${data.notas_cliente}\n\nMétodo elegido: ${metodo.label}`
        : `Método elegido: ${metodo.label}`,
      estado_interno: data.comprobante_inicial_url ? "deposito_recibido" : "nuevo",
    })
    .select("id, codigo_publico")
    .single()

  if (errPedido || !pedido) {
    return { error: errPedido?.message || "Error creando pedido" }
  }

  const { error: errItems } = await supabase
    .from("pedido_items")
    .insert(itemsToInsert.map((i) => ({ ...i, pedido_id: pedido.id })))
  if (errItems) {
    await supabase.from("pedidos").delete().eq("id", pedido.id)
    return { error: errItems.message }
  }

  revalidatePath("/admin/pedidos")
  revalidatePath("/admin")
  redirect(`/pedido/${pedido.codigo_publico}`)
}
