"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function actualizarStocks(cambios: { id: string; stock: number }[]) {
  if (!cambios.length) return
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autorizado")

  await Promise.all(
    cambios.map(({ id, stock }) =>
      supabase.from("productos").update({ stock_unidades: stock }).eq("id", id)
    )
  )

  revalidatePath("/admin/inventario")
  revalidatePath("/admin/productos")
  revalidatePath("/", "layout")
}
