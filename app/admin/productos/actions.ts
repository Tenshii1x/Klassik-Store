"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function bulkPublish(ids: string[]) {
  if (ids.length === 0) return { error: "Sin selección" }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from("productos")
    .update({ estado: "publicado", published_at: new Date().toISOString() })
    .in("id", ids)
  if (error) return { error: error.message }
  revalidatePath("/admin/productos")
  return { success: true, count: ids.length }
}

export async function bulkArchive(ids: string[]) {
  if (ids.length === 0) return { error: "Sin selección" }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("productos").update({ estado: "archivado" }).in("id", ids)
  if (error) return { error: error.message }
  revalidatePath("/admin/productos")
  return { success: true, count: ids.length }
}

export async function bulkDelete(ids: string[]) {
  if (ids.length === 0) return { error: "Sin selección" }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("productos").delete().in("id", ids)
  if (error) return { error: error.message }
  revalidatePath("/admin/productos")
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
  return { success: true, count: ids.length }
}
