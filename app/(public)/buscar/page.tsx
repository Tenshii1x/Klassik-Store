import { buscarProductos, getSeccionesPublicas } from "@/lib/catalog/queries"
import { SearchBar } from "@/components/public/SearchBar"
import { ProductoCard } from "@/components/public/ProductoCard"
import { SeccionesGrid } from "@/components/public/SeccionesGrid"

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q = "" } = await searchParams

  if (!q) {
    const secciones = await getSeccionesPublicas()
    return (
      <>
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-16 pb-6 text-center">
          <h1 className="font-serif text-4xl text-white mb-6">Catálogo</h1>
          <div className="max-w-xl mx-auto">
            <SearchBar />
          </div>
        </div>
        <SeccionesGrid secciones={secciones} />
      </>
    )
  }

  const productos = await buscarProductos(q)

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-16">
      <h1 className="font-serif text-4xl text-center text-white mb-2">Resultados</h1>
      <p className="text-muted text-center mb-10">
        {productos.length} resultado(s) para &ldquo;{q}&rdquo;
      </p>
      <div className="mb-10">
        <SearchBar />
      </div>
      {productos.length === 0 ? (
        <div className="text-center py-20 text-muted">
          <p className="font-serif text-2xl text-white">Sin resultados</p>
          <p className="mt-2">Intenta con otro término de búsqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {productos.map((p) => <ProductoCard key={p.id} p={p as never} />)}
        </div>
      )}
    </section>
  )
}
