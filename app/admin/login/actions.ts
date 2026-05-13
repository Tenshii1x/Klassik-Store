"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function login(formData: FormData) {
  const email = String(formData.get("email") || "").trim()
  const password = String(formData.get("password") || "")

  if (!email || !password) {
    return { error: "Email y contraseña son requeridos" }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // DEBUG temporal: exponer mensaje real de Supabase para diagnosticar.
    // Revertir a "Credenciales incorrectas" después de resolver.
    console.error("[login] Supabase auth error:", error)
    return { error: `[DEBUG] ${error.message} (status: ${error.status ?? "n/a"})` }
  }

  redirect("/admin")
}

export async function logout() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect("/admin/login")
}
