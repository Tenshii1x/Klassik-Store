import { createClient } from "supabase"

type SupabaseClient = ReturnType<typeof createClient>

export async function downloadAndStore(
  supabase: SupabaseClient,
  url: string,
  productoId: string,
  index: number
): Promise<{ url: string | null; error: string | null }> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://www.temu.com/",
      },
    })
    if (!res.ok) return { url: null, error: `HTTP ${res.status}` }
    const blob = await res.blob()
    const contentType = blob.type || "image/jpeg"
    const ext = contentType.split("/")[1]?.split(";")[0] || "jpg"
    const safeExt = ext.replace(/[^a-z0-9]/gi, "").slice(0, 5) || "jpg"
    const path = `productos/${productoId}/imported-${Date.now()}-${index}.${safeExt}`
    const { error } = await supabase.storage.from("productos").upload(path, blob, {
      cacheControl: "3600",
      upsert: false,
      contentType,
    })
    if (error) return { url: null, error: error.message }
    const { data } = supabase.storage.from("productos").getPublicUrl(path)
    return { url: data.publicUrl, error: null }
  } catch (e) {
    return { url: null, error: e instanceof Error ? e.message : "unknown" }
  }
}
