"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { etiquetaSchema, type EtiquetaInput } from "@/lib/validations/etiqueta"
import { revalidatePath } from "next/cache"

export async function createEtiqueta(input: EtiquetaInput) {
  const parsed = etiquetaSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Datos inválidos" }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("etiquetas").insert(parsed.data)
  if (error) return { error: error.message }
  revalidatePath("/admin/etiquetas")
  return { success: true }
}

export async function updateEtiqueta(id: string, input: EtiquetaInput) {
  const parsed = etiquetaSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Datos inválidos" }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("etiquetas").update(parsed.data).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/etiquetas")
  return { success: true }
}

export async function deleteEtiqueta(id: string) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("etiquetas").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/etiquetas")
  return { success: true }
}
