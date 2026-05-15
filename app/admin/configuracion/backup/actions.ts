"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"

interface BackupRow {
  id: string
  nombre: string
  slug: string
  modelo: string | null
  seccion_nombre: string | null
  modo: string
  stock_unidades: number | null
  costo_temu: number
  costo_envio_unitario: number
  precio_venta: number
  precio_anterior: number | null
  estado: string
  destacado: boolean
  etiquetas: string[]
  temu_url: string | null
  temu_goods_id: string | null
  notas_internas: string | null
  imagenes: string[]
  created_at: string
  updated_at: string
}

export async function getBackupData(): Promise<{ csv: string; productos: BackupRow[] }> {
  const supabase = await createSupabaseServerClient()
  const { data: productos } = await supabase
    .from("productos")
    .select(`
      id, nombre, slug, modelo, modo, stock_unidades,
      costo_temu, costo_envio_unitario, precio_venta, precio_anterior,
      estado, destacado, etiquetas, temu_url, temu_goods_id, notas_internas,
      created_at, updated_at,
      secciones(nombre),
      producto_imagenes(url)
    `)
    .order("created_at", { ascending: false })

  const rows: BackupRow[] = (productos || []).map((p) => {
    const seccion = Array.isArray(p.secciones) ? p.secciones[0] : p.secciones
    return {
      id: p.id,
      nombre: p.nombre,
      slug: p.slug,
      modelo: p.modelo,
      seccion_nombre: seccion?.nombre ?? null,
      modo: p.modo,
      stock_unidades: p.stock_unidades,
      costo_temu: p.costo_temu,
      costo_envio_unitario: p.costo_envio_unitario,
      precio_venta: p.precio_venta,
      precio_anterior: p.precio_anterior,
      estado: p.estado,
      destacado: p.destacado,
      etiquetas: p.etiquetas || [],
      temu_url: p.temu_url,
      temu_goods_id: p.temu_goods_id,
      notas_internas: p.notas_internas,
      imagenes: (p.producto_imagenes || []).map((i: { url: string }) => i.url),
      created_at: p.created_at,
      updated_at: p.updated_at,
    }
  })

  const headers = [
    "id", "nombre", "slug", "modelo", "seccion", "modo", "stock",
    "costo_temu", "costo_envio", "precio_venta", "precio_anterior",
    "estado", "destacado", "etiquetas", "temu_url", "temu_goods_id",
    "imagenes_count", "created_at", "updated_at",
  ]
  function esc(v: unknown): string {
    if (v == null) return ""
    const s = Array.isArray(v) ? v.join("|") : String(v)
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const csvLines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.id, r.nombre, r.slug, r.modelo, r.seccion_nombre, r.modo, r.stock_unidades,
        r.costo_temu, r.costo_envio_unitario, r.precio_venta, r.precio_anterior,
        r.estado, r.destacado, r.etiquetas, r.temu_url, r.temu_goods_id,
        r.imagenes.length, r.created_at, r.updated_at,
      ].map(esc).join(",")
    ),
  ]

  return { csv: csvLines.join("\n"), productos: rows }
}
