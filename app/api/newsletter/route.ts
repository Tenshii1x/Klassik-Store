import { createSupabaseServerClient } from "@/lib/supabase/server"
import { rateLimit } from "@/lib/rate-limit"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  const { allowed } = rateLimit(`newsletter:${ip}`, { windowMs: 5 * 60_000, max: 5 })
  if (!allowed) {
    return NextResponse.json({ error: "Demasiados intentos. Intenta más tarde." }, { status: 429 })
  }

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
