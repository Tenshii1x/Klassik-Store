import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ProductoCard } from "@/components/public/ProductoCard"

export default async function ParaElPage() {
  const supabase = await createSupabaseServerClient()
  const { data: productos } = await supabase
    .from("productos")
    .select(
      "id, nombre, slug, precio_venta, precio_anterior, modo, stock_unidades, fecha_llegada_inicio, fecha_llegada_fin, producto_imagenes(url, watermark_limpio)"
    )
    .eq("estado", "publicado")
    .eq("solo_para_el", true)
    .order("destacado", { ascending: false })
    .order("published_at", { ascending: false })

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-16">
      <div className="text-center mb-12">
        <div className="eyebrow mb-3">— Colección Masculina —</div>
        <h1 className="font-serif text-5xl text-white">Para <em className="italic text-gold-primary">Él</em></h1>
        <p className="text-muted text-sm mt-3">Piezas que cuentan más que el tiempo.</p>
      </div>
      {(!productos || productos.length === 0) ? (
        <div className="text-center py-12 text-muted">
          <p className="font-serif text-2xl text-white">Pronto piezas para él</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {productos.map((p) => <ProductoCard key={p.id} p={p as never} />)}
        </div>
      )}
    </section>
  )
}
