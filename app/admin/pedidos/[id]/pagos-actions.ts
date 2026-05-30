"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function agregarPagoPedido(data: {
  pedido_id: string
  monto: number
  fecha_pago: string
  fecha_vencimiento?: string | null
  nota?: string | null
}) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autorizado")

  const { error } = await (supabase as any).from("pagos_parciales").insert({
    pedido_id: data.pedido_id,
    monto: data.monto,
    fecha_pago: data.fecha_pago,
    fecha_vencimiento: data.fecha_vencimiento ?? null,
    nota: data.nota ?? null,
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/pedidos/${data.pedido_id}`)
}

export async function eliminarPagoPedido(id: string, pedido_id: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autorizado")

  const { error } = await (supabase as any).from("pagos_parciales").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/pedidos/${pedido_id}`)
}
