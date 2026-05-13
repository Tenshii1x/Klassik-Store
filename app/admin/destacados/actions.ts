"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function toggleDestacado(id: string, destacado: boolean) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("productos").update({ destacado }).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/destacados")
  revalidatePath("/admin/productos")
  return { success: true }
}
