import Link from "next/link"
import Image from "next/image"
import { formatUSD } from "@/lib/utils"
import { ArrowRight, Play } from "lucide-react"
import { WishlistButton } from "@/components/wishlist/WishlistButton"

interface ProductoCardData {
  id: string
  nombre: string
  slug: string
  precio_venta: number
  precio_anterior: number | null
  modo: string
  stock_unidades?: number | null
  fecha_llegada_inicio?: string | null
  fecha_llegada_fin?: string | null
  producto_imagenes: { url: string; tipo?: string | null; watermark_limpio: boolean }[]
}

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function formatRange(inicio: string | null | undefined, fin: string | null | undefined) {
  if (!inicio || !fin) return null
  const a = parseLocalDate(inicio).toLocaleDateString("es-PA", { day: "numeric", month: "short" })
  const b = parseLocalDate(fin).toLocaleDateString("es-PA", { day: "numeric", month: "short" })
  return `${a} — ${b}`
}

export function ProductoCard({ p }: { p: ProductoCardData }) {
  const limpias = p.producto_imagenes.filter((i) => i.watermark_limpio)
  const primeraFoto = limpias.find((i) => i.tipo !== "video")
  const tieneVideo = limpias.some((i) => i.tipo === "video")
  const portadaVisible = primeraFoto ?? limpias[0] ?? null
  const portadaEsSoloVideo = !primeraFoto && portadaVisible?.tipo === "video"
  const isStock = p.modo === "stock"
  const agotado = isStock && (p.stock_unidades ?? 0) === 0
  const fechaRango = formatRange(p.fecha_llegada_inicio, p.fecha_llegada_fin)

  return (
    <Link
      href={`/producto/${p.slug}`}
      className="group block bg-black-surface border border-border rounded-md overflow-hidden hover:border-gold-primary/50 hover:shadow-deep transition-all"
    >
      <div className="aspect-square relative bg-gradient-to-br from-gold-deep/30 to-black overflow-hidden">
        {portadaVisible && (
          portadaEsSoloVideo ? (
            <video
              src={portadaVisible.url}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              muted
              playsInline
              preload="metadata"
              aria-label={p.nombre}
            />
          ) : (
            <Image
              src={portadaVisible.url}
              alt={p.nombre}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 300px"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          )
        )}
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
        <div className="absolute top-3 left-3 z-10">
          {agotado ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.65rem] font-bold uppercase tracking-wider bg-danger text-white shadow-lg ring-1 ring-white/10">
              Agotado
            </span>
          ) : isStock ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.65rem] font-bold uppercase tracking-wider bg-gold-primary text-black shadow-lg ring-1 ring-black/20">
              Entrega inmediata
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.65rem] font-bold uppercase tracking-wider bg-black/85 backdrop-blur-sm text-white shadow-lg ring-1 ring-gold-primary/40">
              Pre-orden
            </span>
          )}
        </div>
        <WishlistButton productoId={p.id} className="absolute top-3 right-3 z-10" />
        {tieneVideo && (
          <div
            aria-hidden="true"
            className="absolute bottom-3 left-3 z-10 w-8 h-8 rounded-full bg-black/70 backdrop-blur-sm ring-1 ring-white/20 flex items-center justify-center"
          >
            <Play size={14} className="text-white fill-white ml-0.5" />
          </div>
        )}
      </div>
      <div className="p-5 space-y-2">
        <h3 className="font-serif text-xl text-white leading-tight">{p.nombre}</h3>
        {fechaRango && !isStock && (
          <p className="text-muted text-[0.7rem]">Llega entre {fechaRango}</p>
        )}
        <div className="flex items-end justify-between pt-2 border-t border-border">
          <div>
            {p.precio_anterior && (
              <div className="text-muted line-through text-xs">{formatUSD(p.precio_anterior)}</div>
            )}
            <div className="text-gold-primary font-serif text-xl">{formatUSD(p.precio_venta)}</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-gold text-black flex items-center justify-center group-hover:rotate-45 transition-transform">
            <ArrowRight size={14} />
          </div>
        </div>
      </div>
    </Link>
  )
}
