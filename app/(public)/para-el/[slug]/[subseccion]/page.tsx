import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getSeccionBySlug, getProductosBySeccion, getMarcasBySeccion } from "@/lib/catalog/queries"
import { SeccionHero } from "@/components/public/SeccionHero"
import { FiltrosSection } from "@/components/public/FiltrosSection"
import { ProductoCard } from "@/components/public/ProductoCard"

export default async function ParaElSubseccionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; subseccion: string }>
  searchParams: Promise<{ sort?: string; modo?: string; marca?: string }>
}) {
  const { slug, subseccion } = await params
  const filters = await searchParams
  const seccion = await getSeccionBySlug(slug)
  if (!seccion) notFound()

  const sub = seccion.subsecciones?.find((s) => s.slug === subseccion)
  if (!sub) notFound()

  const [productos, marcas] = await Promise.all([
    getProductosBySeccion(seccion.id, { ...filters, subseccion: sub.id, solo_para_el: true }),
    getMarcasBySeccion(seccion.id),
  ])

  return (
    <>
      <SeccionHero seccion={{ ...seccion, nombre: `${seccion.nombre} · ${sub.nombre}` }} />
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-4">
        <Link
          href="/para-el"
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-gold-primary transition-colors"
        >
          <ArrowLeft size={12} /> Para Él
        </Link>
      </div>
      <FiltrosSection
        subsecciones={seccion.subsecciones || []}
        marcas={marcas}
        baseHref={`/para-el/${slug}`}
      />
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        {productos.length === 0 ? (
          <div className="text-center py-20 text-muted">
            <p className="font-serif text-2xl text-white">Sin piezas en {sub.nombre}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {productos.map((p) => <ProductoCard key={p.id} p={p as never} />)}
          </div>
        )}
      </section>
    </>
  )
}
