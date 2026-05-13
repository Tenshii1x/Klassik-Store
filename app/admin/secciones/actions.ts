"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { seccionSchema, subseccionSchema, type SeccionInput, type SubseccionInput } from "@/lib/validations/seccion"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createSeccion(input: SeccionInput) {
  const parsed = seccionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Datos inválidos" }
  }
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("secciones")
    .insert(parsed.data)
    .select("id")
    .single()
  if (error) return { error: error.message }
  revalidatePath("/admin/secciones")
  redirect(`/admin/secciones/${data.id}`)
}

export async function updateSeccion(id: string, input: SeccionInput) {
  const parsed = seccionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Datos inválidos" }
  }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("secciones").update(parsed.data).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/secciones")
  revalidatePath(`/admin/secciones/${id}`)
  return { success: true }
}

export async function deleteSeccion(id: string) {
  const supabase = await createSupabaseServerClient()
  const { count } = await supabase
    .from("productos")
    .select("*", { count: "exact", head: true })
    .eq("seccion_id", id)
  if ((count ?? 0) > 0) {
    return { error: `No se puede borrar — tiene ${count} producto(s). Mueve o archiva los productos primero.` }
  }
  const { error } = await supabase.from("secciones").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/secciones")
  return { success: true }
}

export async function reorderSecciones(ids: string[]) {
  const supabase = await createSupabaseServerClient()
  await Promise.all(
    ids.map((id, idx) =>
      supabase.from("secciones").update({ orden: idx }).eq("id", id)
    )
  )
  revalidatePath("/admin/secciones")
  return { success: true }
}

export async function createSubseccion(input: SubseccionInput) {
  const parsed = subseccionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Datos inválidos" }
  }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("subsecciones").insert(parsed.data)
  if (error) return { error: error.message }
  revalidatePath(`/admin/secciones/${input.seccion_id}`)
  return { success: true }
}

export async function updateSubseccion(id: string, input: SubseccionInput) {
  const parsed = subseccionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Datos inválidos" }
  }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("subsecciones").update(parsed.data).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath(`/admin/secciones/${input.seccion_id}`)
  return { success: true }
}

export async function deleteSubseccion(id: string, seccion_id: string) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("subsecciones").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath(`/admin/secciones/${seccion_id}`)
  return { success: true }
}
