import { notFound } from "next/navigation"
import { getSeccionBySlug, getProductosBySeccion, getMarcasBySeccion } from "@/lib/catalog/queries"
import { SeccionHero } from "@/components/public/SeccionHero"
import { FiltrosSection } from "@/components/public/FiltrosSection"
import { ProductoCard } from "@/components/public/ProductoCard"

export default async function SeccionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ sort?: string; modo?: string; marca?: string }>
}) {
  const { slug } = await params
  const filters = await searchParams
  const seccion = await getSeccionBySlug(slug)
  if (!seccion) notFound()

  const [productos, marcas] = await Promise.all([
    getProductosBySeccion(seccion.id, filters),
    getMarcasBySeccion(seccion.id),
  ])

  return (
    <>
      <SeccionHero seccion={seccion} />
      <FiltrosSection
        subsecciones={seccion.subsecciones || []}
        marcas={marcas}
        baseHref={`/seccion/${slug}`}
      />
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        {productos.length === 0 ? (
          <div className="text-center py-20 text-muted">
            <p className="font-serif text-2xl text-white mb-2">Sin productos por ahora</p>
            <p>Pronto agregaremos novedades en esta sección.</p>
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
