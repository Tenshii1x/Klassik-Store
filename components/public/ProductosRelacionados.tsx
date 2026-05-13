import { ProductoCard } from "@/components/public/ProductoCard"

interface Producto {
  id: string
  nombre: string
  slug: string
  precio_venta: number
  precio_anterior: number | null
  modo: string
  producto_imagenes: { url: string; watermark_limpio: boolean }[]
}

export function ProductosRelacionados({ productos }: { productos: Producto[] }) {
  if (productos.length === 0) return null
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 border-t border-border">
      <div className="text-center mb-10">
        <div className="eyebrow mb-3">— También te puede gustar —</div>
        <h2 className="font-serif text-3xl text-white">Más piezas de esta colección</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {productos.map((p) => <ProductoCard key={p.id} p={p as never} />)}
      </div>
    </section>
  )
}
