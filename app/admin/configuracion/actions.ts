"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  configuracionSchema,
  bannerSchema,
  type ConfiguracionInput,
  type BannerInput,
} from "@/lib/validations/configuracion"
import { revalidatePath } from "next/cache"

export async function updateConfiguracion(input: ConfiguracionInput) {
  const parsed = configuracionSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Datos inválidos" }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("configuracion").update(parsed.data).eq("id", 1)
  if (error) return { error: error.message }
  revalidatePath("/admin/configuracion")
  revalidatePath("/", "layout")
  return { success: true }
}

export async function updateBanner(input: BannerInput) {
  const parsed = bannerSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Datos inválidos" }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("configuracion").update(parsed.data).eq("id", 1)
  if (error) return { error: error.message }
  revalidatePath("/admin/configuracion/banner")
  revalidatePath("/", "layout")
  return { success: true }
}
