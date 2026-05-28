import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ProductoCard } from "@/components/public/ProductoCard"
import { BloqueFemenino } from "@/components/public/BloqueFemenino"

export default async function ParaEllaPage() {
  const supabase = await createSupabaseServerClient()
  const { data: productos } = await supabase
    .from("productos")
    .select(
      "id, nombre, slug, precio_venta, precio_anterior, modo, stock_unidades, fecha_llegada_inicio, fecha_llegada_fin, producto_imagenes(url, tipo, watermark_limpio)"
    )
    .eq("estado", "publicado")
    .eq("solo_para_ella", true)
    .order("destacado", { ascending: false })
    .order("published_at", { ascending: false })
    .order("orden", { referencedTable: "producto_imagenes", ascending: true })

  return (
    <>
      <BloqueFemenino />
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        {(!productos || productos.length === 0) ? (
          <div className="text-center py-12 text-muted">
            <p className="font-serif text-2xl text-white">Pronto piezas para ella</p>
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
