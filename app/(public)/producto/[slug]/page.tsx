import { notFound } from "next/navigation"
import Link from "next/link"
import { getProductoBySlug, getProductosRelacionados, getConfiguracion } from "@/lib/catalog/queries"
import { ProductoView } from "@/components/public/ProductoView"
import { ProductosRelacionados } from "@/components/public/ProductosRelacionados"
import { ProductSchemaData } from "@/components/public/ProductSchemaData"
import { ChevronRight } from "lucide-react"
import type { Metadata } from "next"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const p = await getProductoBySlug(slug)
  if (!p) return { title: "Producto no encontrado" }
  const imagen = p.producto_imagenes?.find((i) => i.watermark_limpio)?.url
  return {
    title: `${p.nombre} · Klassik Store`,
    description: p.descripcion?.slice(0, 160) || `${p.nombre} en Klassik Store. Lujo que se siente. Precio que sorprende.`,
    openGraph: {
      title: p.nombre,
      description: p.descripcion?.slice(0, 160) || undefined,
      images: imagen ? [imagen] : undefined,
    },
  }
}

export default async function ProductoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const producto = await getProductoBySlug(slug)
  if (!producto) notFound()

  const [relacionados, config] = await Promise.all([
    getProductosRelacionados(producto.id, producto.seccion_id),
    getConfiguracion(),
  ])
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://klassik-store-one.vercel.app"
  const storeName = config?.nombre_tienda || "Klassik Store"

  const imagenesOrdenadas = (producto.producto_imagenes || [])
    .slice()
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
  const imagenesLimpias = imagenesOrdenadas.filter((i) => i.watermark_limpio)
  const variantesOrdenadas = (producto.producto_variantes || [])
    .slice()
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))

  const seccion = Array.isArray(producto.secciones) ? producto.secciones[0] : producto.secciones

  return (
    <>
      <ProductSchemaData
        producto={{ ...producto, producto_imagenes: imagenesLimpias }}
        baseUrl={baseUrl}
        storeName={storeName}
      />
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 text-xs text-muted">
        <Link href="/" className="hover:text-gold-primary">Inicio</Link>
        <ChevronRight size={12} className="inline mx-1" />
        {seccion && (
          <>
            <Link href={`/seccion/${seccion.slug}`} className="hover:text-gold-primary">{seccion.nombre}</Link>
            <ChevronRight size={12} className="inline mx-1" />
          </>
        )}
        <span className="text-white">{producto.nombre}</span>
      </div>

      <ProductoView
        producto={{
          ...producto,
          producto_imagenes: imagenesOrdenadas as never,
          producto_variantes: variantesOrdenadas as never,
        } as never}
      />

      <ProductosRelacionados productos={relacionados as never} />
    </>
  )
}
