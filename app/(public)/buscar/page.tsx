import { buscarProductos } from "@/lib/catalog/queries"
import { SearchBar } from "@/components/public/SearchBar"
import { ProductoCard } from "@/components/public/ProductoCard"

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q = "" } = await searchParams
  const productos = q ? await buscarProductos(q) : []

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-16">
      <h1 className="font-serif text-4xl text-center text-white mb-2">
        {q ? "Resultados" : "Catálogo"}
      </h1>
      <p className="text-muted text-center mb-10">
        {q ? `${productos.length} resultado(s) para "${q}"` : "Explora el catálogo completo"}
      </p>
      <div className="mb-10">
        <SearchBar />
      </div>
      {productos.length === 0 ? (
        q && (
          <div className="text-center py-20 text-muted">
            <p className="font-serif text-2xl text-white">Sin resultados</p>
            <p className="mt-2">Intenta con otro término de búsqueda.</p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {productos.map((p) => <ProductoCard key={p.id} p={p as never} />)}
        </div>
      )}
    </section>
  )
}
