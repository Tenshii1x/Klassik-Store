import { createSupabaseServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { email } = await request.json()
  if (!email || typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 })
  }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from("suscriptores_newsletter")
    .insert({ email: email.toLowerCase().trim() })
  if (error && !error.message.includes("duplicate")) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
