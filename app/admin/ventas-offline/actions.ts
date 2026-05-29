"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function registrarVentaOffline(data: {
  producto_id: string
  cantidad: number
  precio_vendido: number
  costo_snapshot: number
  canal: "whatsapp" | "presencial"
  fecha: string
}) {
  const supabase = await createSupabaseServerClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertError } = await (supabase as any).from("ventas_offline").insert({
    producto_id: data.producto_id,
    cantidad: data.cantidad,
    precio_vendido: data.precio_vendido,
    costo_snapshot: data.costo_snapshot,
    canal: data.canal,
    fecha: data.fecha,
  })

  if (insertError) throw new Error(insertError.message)

  // Descontar del stock del producto
  const { data: producto } = await supabase
    .from("productos")
    .select("stock_unidades")
    .eq("id", data.producto_id)
    .single()

  if (producto && producto.stock_unidades !== null) {
    await supabase
      .from("productos")
      .update({ stock_unidades: Math.max(0, producto.stock_unidades - data.cantidad) })
      .eq("id", data.producto_id)
  }

  revalidatePath("/admin/ventas-offline")
}
