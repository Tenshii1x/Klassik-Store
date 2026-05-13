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
      .select("id, tipo, valor, precio_extra, stock_unidades, orden")
      .eq("producto_id", id)
      .order("orden"),
  ])

  if (!producto) notFound()

  return (
    <div className="max-w-4xl space-y-6">
      <Topbar
        title={`Editar: ${producto.nombre}`}
        subtitle="Imágenes, variantes y datos del producto"
      />
      <ProductoImagenesGaleria productoId={id} initial={imagenes || []} />
      <ProductoVariantes productoId={id} initial={variantes || []} />
      <ProductoForm
        initial={producto as never}
        secciones={(secciones as never) || []}
        etiquetas={etiquetas || []}
        margenGlobal={config?.margen_global_porcentaje ?? 60}
      />
    </div>
  )
}
