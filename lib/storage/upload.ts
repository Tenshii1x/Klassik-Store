import { createSupabaseBrowserClient } from "@/lib/supabase/browser"

export async function uploadFile(
  bucket: "productos" | "configuracion",
  path: string,
  file: File
): Promise<{ url: string; error: null } | { url: null; error: string }> {
  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type,
  })
  if (error) {
    return { url: null, error: error.message }
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}

export async function deleteFile(
  bucket: "productos" | "configuracion",
  path: string
): Promise<{ error: string | null }> {
  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase.storage.from(bucket).remove([path])
  return { error: error?.message ?? null }
}

export function pathFromUrl(url: string, bucket: string): string | null {
  const match = url.match(new RegExp(`/storage/v1/object/public/${bucket}/(.+)$`))
  return match?.[1] ?? null
}
