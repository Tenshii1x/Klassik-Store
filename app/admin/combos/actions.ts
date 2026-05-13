"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { comboSchema, type ComboInput } from "@/lib/validations/combo"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createCombo(input: ComboInput) {
  const parsed = comboSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Datos inválidos" }
  const supabase = await createSupabaseServerClient()
  const { productos, ...rest } = parsed.data
  const { data, error } = await supabase.from("combos").insert(rest).select("id").single()
  if (error) return { error: error.message }
  if (productos.length > 0) {
    await supabase
      .from("combo_productos")
      .insert(productos.map((p) => ({ ...p, combo_id: data.id })))
  }
  revalidatePath("/admin/combos")
  redirect(`/admin/combos/${data.id}`)
}

export async function updateCombo(id: string, input: ComboInput) {
  const parsed = comboSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Datos inválidos" }
  const supabase = await createSupabaseServerClient()
  const { productos, ...rest } = parsed.data
  const { error } = await supabase.from("combos").update(rest).eq("id", id)
  if (error) return { error: error.message }
  await supabase.from("combo_productos").delete().eq("combo_id", id)
  if (productos.length > 0) {
    await supabase
      .from("combo_productos")
      .insert(productos.map((p) => ({ ...p, combo_id: id })))
  }
  revalidatePath("/admin/combos")
  revalidatePath(`/admin/combos/${id}`)
  return { success: true }
}

export async function deleteCombo(id: string) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("combos").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/combos")
  redirect("/admin/combos")
}
