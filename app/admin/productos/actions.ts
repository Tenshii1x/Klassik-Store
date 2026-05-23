"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { productoSchema, varianteSchema, type ProductoInput, type VarianteInput } from "@/lib/validations/producto"
import { redirect } from "next/navigation"
import { pathFromUrl } from "@/lib/storage/upload"

export async function bulkPublish(ids: string[]) {
  if (ids.length === 0) return { error: "Sin selección" }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from("productos")
    .update({ estado: "publicado", published_at: new Date().toISOString() })
    .in("id", ids)
  if (error) return { error: error.message }
  revalidatePath("/admin/productos")
  revalidatePath("/", "layout")
  return { success: true, count: ids.length }
}

export async function bulkArchive(ids: string[]) {
  if (ids.length === 0) return { error: "Sin selección" }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("productos").update({ estado: "archivado" }).in("id", ids)
  if (error) return { error: error.message }
  revalidatePath("/admin/productos")
  revalidatePath("/", "layout")
  return { success: true, count: ids.length }
}

export async function bulkDelete(ids: string[]) {
  if (ids.length === 0) return { error: "Sin selección" }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("productos").delete().in("id", ids)
  if (error) return { error: error.message }
  revalidatePath("/admin/productos")
  revalidatePath("/", "layout")
  return { success: true, count: ids.length }
}

export async function bulkAssignSeccion(ids: string[], seccionId: string) {
  if (ids.length === 0) return { error: "Sin selección" }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from("productos")
    .update({ seccion_id: seccionId, subseccion_id: null })
    .in("id", ids)
  if (error) return { error: error.message }
  revalidatePath("/admin/productos")
  revalidatePath("/", "layout")
  return { success: true, count: ids.length }
}

export async function bulkApplyMargen(ids: string[], margenPorcentaje: number) {
  if (ids.length === 0) return { error: "Sin selección" }
  const supabase = await createSupabaseServerClient()
  const { data: productos } = await supabase
    .from("productos")
    .select("id, costo_temu, costo_envio_unitario")
    .in("id", ids)
  if (!productos) return { error: "No se pudo leer productos" }
  await Promise.all(
    productos.map((p) => {
      const total = (p.costo_temu || 0) + (p.costo_envio_unitario || 0)
      const precio = Math.round(total * (1 + margenPorcentaje / 100) * 100) / 100
      return supabase
        .from("productos")
        .update({ precio_venta: precio, margen_override_porcentaje: margenPorcentaje })
        .eq("id", p.id)
    })
  )
  revalidatePath("/admin/productos")
  revalidatePath("/", "layout")
  return { success: true, count: ids.length }
}

export async function createProducto(input: ProductoInput) {
  const parsed = productoSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Datos inválidos" }
  const supabase = await createSupabaseServerClient()
  const payload = {
    ...parsed.data,
    published_at: parsed.data.estado === "publicado" ? new Date().toISOString() : null,
  }
  const { data, error } = await supabase.from("productos").insert(payload).select("id").single()
  if (error) return { error: error.message }
  revalidatePath("/admin/productos")
  revalidatePath("/", "layout")
  redirect(`/admin/productos/${data.id}`)
}

export async function updateProducto(id: string, input: ProductoInput) {
  const parsed = productoSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Datos inválidos" }
  const supabase = await createSupabaseServerClient()
  const { data: existing } = await supabase
    .from("productos")
    .select("published_at, estado")
    .eq("id", id)
    .single()
  const payload = {
    ...parsed.data,
    published_at:
      parsed.data.estado === "publicado" && !existing?.published_at
        ? new Date().toISOString()
        : existing?.published_at,
  }
  const { error } = await supabase.from("productos").update(payload).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/productos")
  revalidatePath(`/admin/productos/${id}`)
  revalidatePath("/", "layout")
  return { success: true }
}

export async function deleteProducto(id: string) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("productos").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/productos")
  revalidatePath("/", "layout")
  redirect("/admin/productos")
}

// === Imágenes ===

export async function addProductoImagen(
  producto_id: string,
  url: string,
  tipo: "imagen" | "video" = "imagen",
  watermark_limpio = false
) {
  const supabase = await createSupabaseServerClient()
  const { count } = await supabase
    .from("producto_imagenes")
    .select("*", { count: "exact", head: true })
    .eq("producto_id", producto_id)
  const { error } = await supabase.from("producto_imagenes").insert({
    producto_id,
    url,
    tipo,
    watermark_limpio,
    orden: count ?? 0,
  })
  if (error) return { error: error.message }
  revalidatePath(`/admin/productos/${producto_id}`)
  revalidatePath("/", "layout")
  return { success: true }
}

export async function removeProductoImagen(id: string, producto_id: string) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("producto_imagenes").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath(`/admin/productos/${producto_id}`)
  revalidatePath("/", "layout")
  return { success: true }
}

export async function reorderProductoImagenes(producto_id: string, ids: string[]) {
  const supabase = await createSupabaseServerClient()
  const results = await Promise.all(
    ids.map((id, idx) =>
      supabase.from("producto_imagenes").update({ orden: idx }).eq("id", id).eq("producto_id", producto_id)
    )
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) return { error: failed.error.message }
  revalidatePath(`/admin/productos/${producto_id}`)
  revalidatePath("/", "layout")
  return { success: true as const }
}

export async function markImagenWatermarkLimpio(id: string, producto_id: string, limpio: boolean) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from("producto_imagenes")
    .update({ watermark_limpio: limpio })
    .eq("id", id)
  if (error) return { error: error.message }
  revalidatePath(`/admin/productos/${producto_id}`)
  revalidatePath("/", "layout")
  return { success: true }
}

// === Variantes ===

export async function addVariante(producto_id: string, input: VarianteInput) {
  const parsed = varianteSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Datos inválidos" }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("producto_variantes").insert({ producto_id, ...parsed.data })
  if (error) return { error: error.message }
  revalidatePath(`/admin/productos/${producto_id}`)
  revalidatePath("/", "layout")
  return { success: true }
}

export async function updateVariante(id: string, producto_id: string, input: VarianteInput) {
  const parsed = varianteSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Datos inválidos" }
  const supabase = await createSupabaseServerClient()

  // Leer imagen anterior para detectar cambio
  const { data: existing } = await supabase
    .from("producto_variantes")
    .select("imagen_url")
    .eq("id", id)
    .single()

  const { error } = await supabase.from("producto_variantes").update(parsed.data).eq("id", id)
  if (error) return { error: error.message }

  // Si la imagen cambió y había una previa, borrar el archivo viejo
  const previa = existing?.imagen_url ?? null
  const nueva = parsed.data.imagen_url ?? null
  if (previa && previa !== nueva) {
    const path = pathFromUrl(previa, "productos")
    if (path) {
      const { error: removeErr } = await supabase.storage.from("productos").remove([path])
      if (removeErr) {
        console.warn("[updateVariante] no se pudo borrar imagen anterior:", path, removeErr.message)
      }
    }
  }

  revalidatePath(`/admin/productos/${producto_id}`)
  revalidatePath("/", "layout")
  return { success: true }
}

export async function removeVariante(id: string, producto_id: string) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("producto_variantes").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath(`/admin/productos/${producto_id}`)
  return { success: true }
}
