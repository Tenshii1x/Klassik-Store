import { notFound } from "next/navigation"
import { getEtiqueta, getProductosPorEtiqueta } from "@/lib/catalog/queries"
import { ProductoCard } from "@/components/public/ProductoCard"

export default async function EtiquetaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [etiqueta, productos] = await Promise.all([
    getEtiqueta(slug),
    getProductosPorEtiqueta(slug),
  ])
  if (!etiqueta) notFound()

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-16">
      <div className="text-center mb-12">
        <div className="eyebrow mb-3">— Etiqueta —</div>
        <h1 className="font-serif text-5xl text-white" style={{ color: etiqueta.color }}>{etiqueta.nombre}</h1>
      </div>
      {productos.length === 0 ? (
        <div className="text-center py-12 text-muted">
          <p className="font-serif text-2xl text-white">Sin productos con esta etiqueta</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {productos.map((p) => <ProductoCard key={p.id} p={p as never} />)}
        </div>
      )}
    </section>
  )
}
