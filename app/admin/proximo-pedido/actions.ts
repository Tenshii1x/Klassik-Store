"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function marcarComoPedidoAlSupplier(productoIds: string[]) {
  const supabase = await createSupabaseServerClient()
  const { data: items } = await supabase
    .from("pedido_items")
    .select("pedido_id")
    .in("producto_id", productoIds)
  const pedidoIds = [...new Set((items || []).map((i) => i.pedido_id))]
  if (pedidoIds.length === 0) return { count: 0 }
  const { data: updated, error } = await supabase
    .from("pedidos")
    .update({ estado_interno: "pedido_a_supplier" })
    .in("id", pedidoIds)
    .in("estado_interno", ["nuevo", "deposito_recibido", "pendiente_pedir_supplier"])
    .select("id")
  if (error) return { error: error.message }
  revalidatePath("/admin/proximo-pedido")
  revalidatePath("/admin/pedidos")
  return { count: updated?.length ?? 0 }
}
