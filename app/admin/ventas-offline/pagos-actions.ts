"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function agregarPagoVentaOffline(data: {
  venta_offline_id: string
  monto: number
  fecha_pago: string
  fecha_vencimiento?: string | null
  nota?: string | null
}) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autorizado")

  const { error } = await (supabase as any).from("pagos_parciales").insert({
    venta_offline_id: data.venta_offline_id,
    monto: data.monto,
    fecha_pago: data.fecha_pago,
    fecha_vencimiento: data.fecha_vencimiento ?? null,
    nota: data.nota ?? null,
  })
  if (error) throw new Error(error.message)
  revalidatePath("/admin/ventas-offline")
}

export async function eliminarPagoVentaOffline(id: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autorizado")

  const { error } = await (supabase as any).from("pagos_parciales").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/admin/ventas-offline")
}
