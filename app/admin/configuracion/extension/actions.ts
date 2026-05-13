"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import crypto from "node:crypto"

function generateKey() {
  const raw = `ks_${crypto.randomBytes(24).toString("hex")}`
  const hash = crypto.createHash("sha256").update(raw).digest("hex")
  const prefix = raw.slice(0, 12)
  return { raw, hash, prefix }
}

export async function createApiKey(nombre: string) {
  if (!nombre || nombre.length < 2) return { error: "Nombre requerido" }
  const supabase = await createSupabaseServerClient()
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return { error: "No autenticado" }

  const { raw, hash, prefix } = generateKey()
  const { error } = await supabase.from("extension_api_keys").insert({
    nombre,
    key_hash: hash,
    key_prefix: prefix,
    created_by: user.user.id,
  })
  if (error) return { error: error.message }
  revalidatePath("/admin/configuracion/extension")
  return { success: true, key: raw }
}

export async function revokeApiKey(id: string) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from("extension_api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/configuracion/extension")
  return { success: true }
}
