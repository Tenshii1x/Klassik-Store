import { HeroHome } from "@/components/public/HeroHome"
import { TrustStrip } from "@/components/public/TrustStrip"
import { SeccionesGrid } from "@/components/public/SeccionesGrid"
import { ProductoCard } from "@/components/public/ProductoCard"
import { BloqueFemenino } from "@/components/public/BloqueFemenino"
import {
  getSeccionesPublicas,
  getProductosDestacados,
  getProductosRecientes,
} from "@/lib/catalog/queries"

export default async function HomePage() {
  const [secciones, destacados, recientes] = await Promise.all([
    getSeccionesPublicas(),
    getProductosDestacados(8),
    getProductosRecientes(8),
  ])

  return (
    <>
      <HeroHome />
      <TrustStrip />
      <SeccionesGrid secciones={secciones} />

      {destacados.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 border-t border-border">
          <div className="text-center mb-12">
            <div className="eyebrow mb-3">— Destacados de la Semana —</div>
            <h2 className="font-serif text-4xl text-white">
              Lo que está <em className="italic text-gold-primary">enamorando</em>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {destacados.map((p) => <ProductoCard key={p.id} p={p as never} />)}
          </div>
        </section>
      )}

      <BloqueFemenino />

      {recientes.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-8 py-16">
          <div className="text-center mb-12">
            <div className="eyebrow mb-3">— Recién Llegados —</div>
            <h2 className="font-serif text-4xl text-white">Lo último en piezas</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {recientes.map((p) => <ProductoCard key={p.id} p={p as never} />)}
          </div>
        </section>
      )}
    </>
  )
}
