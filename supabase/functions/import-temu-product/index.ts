// @ts-nocheck — Deno runtime, esm imports
import { createClient } from "supabase"
import { importPayloadSchema } from "./lib/validation.ts"
import { downloadAndStore } from "./lib/images.ts"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  })
}

async function hashKey(key: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function genSlug(goodsId: string): string {
  return `temu-${goodsId.slice(0, 20)}-${Date.now().toString(36)}`
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405)
  }

  // Auth: bearer key
  const auth = req.headers.get("authorization") || ""
  const bearer = auth.replace(/^Bearer\s+/i, "").trim()
  if (!bearer) {
    return jsonResponse({ error: "Missing API key" }, 401)
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  const keyHash = await hashKey(bearer)
  const { data: keyRow } = await supabase
    .from("extension_api_keys")
    .select("id, revoked_at")
    .eq("key_hash", keyHash)
    .maybeSingle()

  if (!keyRow || keyRow.revoked_at) {
    return jsonResponse({ error: "Invalid API key" }, 401)
  }

  // Touch last_used_at (fire-and-forget; don't await error)
  supabase
    .from("extension_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRow.id)
    .then(() => {}, () => {})

  // Parse body
  let body
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400)
  }

  const parsed = importPayloadSchema.safeParse(body)
  if (!parsed.success) {
    return jsonResponse({ error: parsed.error.issues[0]?.message || "Invalid payload" }, 400)
  }
  const data = parsed.data

  // Check duplicate by temu_goods_id
  const { data: existing } = await supabase
    .from("productos")
    .select("id, nombre, estado")
    .eq("temu_goods_id", data.temu_goods_id)
    .maybeSingle()

  if (existing) {
    return jsonResponse({
      error: "duplicate",
      existing_id: existing.id,
      existing_nombre: existing.nombre,
      existing_estado: existing.estado,
    }, 409)
  }

  // Create draft product
  const slug = genSlug(data.temu_goods_id)
  const { data: producto, error: prodError } = await supabase
    .from("productos")
    .insert({
      nombre: data.nombre_temu.slice(0, 150),
      nombre_temu: data.nombre_temu,
      descripcion: data.descripcion,
      slug,
      modo: "preorden",
      costo_temu: data.precio ?? 0,
      precio_venta: 0,
      precio_anterior: data.precio_anterior,
      temu_url: data.temu_url,
      temu_goods_id: data.temu_goods_id,
      estado: "borrador",
    })
    .select("id")
    .single()

  if (prodError || !producto) {
    // log failure
    await supabase.from("importaciones_log").insert({
      temu_url: data.temu_url,
      temu_goods_id: data.temu_goods_id,
      api_key_id: keyRow.id,
      status: "failed",
      error_message: prodError?.message || "insert failed",
    })
    return jsonResponse({ error: prodError?.message || "insert failed" }, 500)
  }

  // Download images sequentially (to keep memory low)
  let imagenesOk = 0
  let imagenesFailed = 0
  for (let i = 0; i < data.imagenes.length; i++) {
    const img = data.imagenes[i]
    const { url, error } = await downloadAndStore(supabase, img.url, producto.id, i)
    if (error || !url) {
      imagenesFailed++
      continue
    }
    const { error: imgInsertErr } = await supabase.from("producto_imagenes").insert({
      producto_id: producto.id,
      url,
      tipo: img.tipo,
      orden: i,
      watermark_limpio: false,
    })
    if (imgInsertErr) {
      imagenesFailed++
    } else {
      imagenesOk++
    }
  }

  // Insert variantes
  for (let i = 0; i < (data.variantes || []).length; i++) {
    const v = data.variantes![i]
    await supabase.from("producto_variantes").insert({
      producto_id: producto.id,
      tipo: v.tipo,
      valor: v.valor,
      precio_extra: 0,
      orden: i,
    })
  }

  // Log
  await supabase.from("importaciones_log").insert({
    producto_id: producto.id,
    temu_url: data.temu_url,
    temu_goods_id: data.temu_goods_id,
    api_key_id: keyRow.id,
    status: imagenesFailed === 0 ? "success" : "partial",
    imagenes_count: imagenesOk,
    imagenes_failed: imagenesFailed,
  })

  return jsonResponse({
    success: true,
    producto_id: producto.id,
    imagenes_ok: imagenesOk,
    imagenes_failed: imagenesFailed,
    redirect_url: `/admin/productos/${producto.id}`,
  })
})
