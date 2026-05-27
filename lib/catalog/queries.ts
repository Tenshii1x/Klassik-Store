import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function getConfiguracion() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.from("configuracion").select("*").eq("id", 1).single()
  return data
}

export async function getSeccionesPublicas() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("secciones")
    .select("id, nombre, slug, imagen_portada, descripcion_corta, tono, orden")
    .eq("activa", true)
    .order("orden", { ascending: true })
  return data || []
}

export async function getSeccionBySlug(slug: string) {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("secciones")
    .select("id, nombre, slug, imagen_portada, imagen_banner, descripcion_corta, tono, subsecciones(id, nombre, slug)")
    .eq("activa", true)
    .eq("slug", slug)
    .single()
  return data
}

export async function getProductosBySeccion(
  seccionId: string,
  filters: {
    subseccion?: string
    marca?: string
    modo?: string
    sort?: string
    precio_min?: number
    precio_max?: number
  } = {}
) {
  const supabase = await createSupabaseServerClient()
  let query = supabase
    .from("productos")
    .select(
      "id, nombre, slug, precio_venta, precio_anterior, modo, stock_unidades, destacado, fecha_llegada_inicio, fecha_llegada_fin, producto_imagenes(url, tipo, watermark_limpio)"
    )
    .eq("estado", "publicado")
    .eq("seccion_id", seccionId)

  if (filters.subseccion) query = query.eq("subseccion_id", filters.subseccion)
  if (filters.marca) query = query.ilike("marca", filters.marca)
  if (filters.modo) query = query.eq("modo", filters.modo)
  if (filters.precio_min) query = query.gte("precio_venta", filters.precio_min)
  if (filters.precio_max) query = query.lte("precio_venta", filters.precio_max)

  if (filters.sort === "precio_asc") query = query.order("precio_venta", { ascending: true })
  else if (filters.sort === "precio_desc") query = query.order("precio_venta", { ascending: false })
  else if (filters.sort === "nuevos") query = query.order("published_at", { ascending: false, nullsFirst: false })
  else query = query.order("destacado", { ascending: false }).order("published_at", { ascending: false })

  query = query.order("orden", { referencedTable: "producto_imagenes", ascending: true })

  const { data } = await query.limit(100)
  return data || []
}

export async function getProductoBySlug(slug: string) {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("productos")
    .select(`
      id, nombre, slug, descripcion, modelo, modo, stock_unidades, precio_venta, precio_anterior,
      fecha_llegada_inicio, fecha_llegada_fin, solo_para_ella, solo_para_el, etiquetas,
      seccion_id, secciones(id, nombre, slug, tono),
      producto_imagenes(id, url, tipo, orden, watermark_limpio),
      producto_variantes(id, tipo, valor, precio_extra, stock_unidades, imagen_url, orden)
    `)
    .eq("estado", "publicado")
    .eq("slug", slug)
    .order("orden", { referencedTable: "producto_imagenes", ascending: true })
    .order("orden", { referencedTable: "producto_variantes", ascending: true })
    .single()
  return data
}

export async function getMarcasBySeccion(seccionId: string): Promise<string[]> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("productos")
    .select("marca")
    .eq("estado", "publicado")
    .eq("seccion_id", seccionId)
    .not("marca", "is", null)
  const unicas = new Set<string>()
  for (const row of data || []) {
    if (row.marca) unicas.add(row.marca)
  }
  return Array.from(unicas).sort((a, b) => a.localeCompare(b, "es"))
}

export async function getProductosRelacionados(productoId: string, seccionId: string | null) {
  if (!seccionId) return []
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("productos")
    .select(
      "id, nombre, slug, precio_venta, precio_anterior, modo, stock_unidades, fecha_llegada_inicio, fecha_llegada_fin, producto_imagenes(url, tipo, watermark_limpio)"
    )
    .eq("estado", "publicado")
    .eq("seccion_id", seccionId)
    .neq("id", productoId)
    .order("orden", { referencedTable: "producto_imagenes", ascending: true })
    .limit(4)
  return data || []
}

export async function getTodosProductos(limit = 100) {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("productos")
    .select(
      "id, nombre, slug, precio_venta, precio_anterior, modo, stock_unidades, fecha_llegada_inicio, fecha_llegada_fin, producto_imagenes(url, tipo, watermark_limpio)"
    )
    .eq("estado", "publicado")
    .order("destacado", { ascending: false })
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("orden", { referencedTable: "producto_imagenes", ascending: true })
    .limit(limit)
  return data || []
}

export async function getProductosDestacados(limit = 8) {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("productos")
    .select(
      "id, nombre, slug, precio_venta, precio_anterior, modo, stock_unidades, fecha_llegada_inicio, fecha_llegada_fin, producto_imagenes(url, tipo, watermark_limpio)"
    )
    .eq("estado", "publicado")
    .eq("destacado", true)
    .order("published_at", { ascending: false })
    .order("orden", { referencedTable: "producto_imagenes", ascending: true })
    .limit(limit)
  return data || []
}

export async function getProductosRecientes(limit = 8) {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("productos")
    .select(
      "id, nombre, slug, precio_venta, precio_anterior, modo, stock_unidades, fecha_llegada_inicio, fecha_llegada_fin, producto_imagenes(url, tipo, watermark_limpio)"
    )
    .eq("estado", "publicado")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("orden", { referencedTable: "producto_imagenes", ascending: true })
    .limit(limit)
  return data || []
}

export async function buscarProductos(q: string) {
  if (!q.trim()) return []
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("productos")
    .select(
      "id, nombre, slug, precio_venta, precio_anterior, modo, stock_unidades, fecha_llegada_inicio, fecha_llegada_fin, producto_imagenes(url, tipo, watermark_limpio)"
    )
    .eq("estado", "publicado")
    .or(`nombre.ilike.%${q}%,descripcion.ilike.%${q}%,modelo.ilike.%${q}%`)
    .order("orden", { referencedTable: "producto_imagenes", ascending: true })
    .limit(40)
  return data || []
}

export async function getProductosPorEtiqueta(slug: string) {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("productos")
    .select(
      "id, nombre, slug, precio_venta, precio_anterior, modo, stock_unidades, fecha_llegada_inicio, fecha_llegada_fin, etiquetas, producto_imagenes(url, tipo, watermark_limpio)"
    )
    .eq("estado", "publicado")
    .contains("etiquetas", [slug])
    .order("orden", { referencedTable: "producto_imagenes", ascending: true })
  return data || []
}

export async function getEtiqueta(slug: string) {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.from("etiquetas").select("nombre, slug, color").eq("slug", slug).single()
  return data
}
