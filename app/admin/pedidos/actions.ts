"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

type Estado =
  | "nuevo"
  | "deposito_recibido"
  | "pendiente_pedir_supplier"
  | "pedido_a_supplier"
  | "llegado_pais"
  | "listo_entrega"
  | "entregado"
  | "cancelado"

export async function avanzarEstado(id: string, nuevoEstado: Estado) {
  const supabase = await createSupabaseServerClient()

  // If moving to entregado AND item is stock mode, decrement stock
  if (nuevoEstado === "entregado") {
    const { data: items } = await supabase
      .from("pedido_items")
      .select("producto_id, variante_id, cantidad, modo")
      .eq("pedido_id", id)
    for (const item of items || []) {
      if (item.modo !== "stock" || !item.producto_id) continue
      if (item.variante_id) {
        const { data: v } = await supabase
          .from("producto_variantes")
          .select("stock_unidades")
          .eq("id", item.variante_id)
          .single()
        if (v?.stock_unidades != null) {
          await supabase
            .from("producto_variantes")
            .update({ stock_unidades: Math.max(0, v.stock_unidades - item.cantidad) })
            .eq("id", item.variante_id)
        }
      } else {
        const { data: p } = await supabase
          .from("productos")
          .select("stock_unidades")
          .eq("id", item.producto_id)
          .single()
        if (p?.stock_unidades != null) {
          await supabase
            .from("productos")
            .update({ stock_unidades: Math.max(0, p.stock_unidades - item.cantidad) })
            .eq("id", item.producto_id)
        }
      }
    }
  }

  const { error } = await supabase
    .from("pedidos")
    .update({ estado_interno: nuevoEstado })
    .eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/pedidos")
  revalidatePath(`/admin/pedidos/${id}`)
  revalidatePath("/admin/proximo-pedido")
  revalidatePath("/admin")
  return { success: true }
}

export async function actualizarNotas(id: string, notas: string) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from("pedidos")
    .update({ notas_internas: notas })
    .eq("id", id)
  if (error) return { error: error.message }
  revalidatePath(`/admin/pedidos/${id}`)
  return { success: true }
}

export async function marcarPagoFinal(
  id: string,
  monto: number,
  comprobanteUrl: string | null
) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from("pedidos")
    .update({
      monto_pagado_final: monto,
      comprobante_final_url: comprobanteUrl,
    })
    .eq("id", id)
  if (error) return { error: error.message }
  revalidatePath(`/admin/pedidos/${id}`)
  return { success: true }
}

export async function eliminarPedido(id: string) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("pedidos").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/pedidos")
  return { success: true }
}
