import { notFound } from "next/navigation"
import { Topbar } from "@/components/admin/topbar"
import { ProductoForm } from "@/components/admin/forms/ProductoForm"
import { ProductoImagenesGaleria } from "@/components/admin/forms/ProductoImagenesGaleria"
import { ProductoVariantes } from "@/components/admin/forms/ProductoVariantes"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const [
    { data: producto },
    { data: secciones },
    { data: etiquetas },
    { data: config },
    { data: imagenes },
    { data: variantes },
    { data: marcasRows },
  ] = await Promise.all([
    supabase.from("productos").select("*").eq("id", id).single(),
    supabase.from("secciones").select("id, nombre, subsecciones(id, nombre)").order("orden"),
    supabase.from("etiquetas").select("id, nombre, slug, color").order("nombre"),
    supabase.from("configuracion").select("margen_global_porcentaje").eq("id", 1).single(),
    supabase
      .from("producto_imagenes")
      .select("id, url, tipo, watermark_limpio, orden")
      .eq("producto_id", id)
      .order("orden"),
    supabase
      .from("producto_variantes")
      .select("id, tipo, valor, precio_extra, stock_unidades, imagen_url, orden")
      .eq("producto_id", id)
      .order("orden"),
    supabase.from("productos").select("marca").not("marca", "is", null).order("marca"),
  ])

  if (!producto) notFound()

  const marcasSugeridas = Array.from(
    new Set((marcasRows || []).map((r) => r.marca).filter((m): m is string => Boolean(m)))
  )

  return (
    <div className="max-w-4xl space-y-6">
      <Topbar
        title={`Editar: ${producto.nombre}`}
        subtitle="Imágenes, variantes y datos del producto"
      />
      <ProductoImagenesGaleria productoId={id} initial={imagenes || []} />
      <ProductoVariantes
        productoId={id}
        initial={variantes || []}
        imagenes={imagenes || []}
      />
      <ProductoForm
        initial={producto as never}
        secciones={(secciones as never) || []}
        etiquetas={etiquetas || []}
        marcasSugeridas={marcasSugeridas}
        margenGlobal={config?.margen_global_porcentaje ?? 60}
      />
    </div>
  )
}
