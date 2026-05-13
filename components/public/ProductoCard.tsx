import Link from "next/link"
import Image from "next/image"
import { formatUSD } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ArrowRight } from "lucide-react"

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
  producto_imagenes: { url: string; watermark_limpio: boolean }[]
}

function parseLocalDate(s: string): Date {
  // Postgres DATE comes as "YYYY-MM-DD"; parse as local-time to avoid UTC day shift
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
  const imagen = p.producto_imagenes.filter((i) => i.watermark_limpio)[0]?.url
  const isStock = p.modo === "stock"
  const agotado = isStock && (p.stock_unidades ?? 0) === 0
  const fechaRango = formatRange(p.fecha_llegada_inicio, p.fecha_llegada_fin)

  return (
    <Link
      href={`/producto/${p.slug}`}
      className="group block bg-black-surface border border-border rounded-md overflow-hidden hover:border-gold-primary/50 hover:shadow-deep transition-all"
    >
      <div className="aspect-square relative bg-gradient-to-br from-gold-deep/30 to-black overflow-hidden">
        {imagen && (
          <Image
            src={imagen}
            alt={p.nombre}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 300px"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        )}
        <div className="absolute top-3 left-3">
          {agotado ? (
            <Badge tone="danger">Agotado</Badge>
          ) : isStock ? (
            <Badge tone="gold">Entrega inmediata</Badge>
          ) : (
            <Badge tone="info">Pre-orden</Badge>
          )}
        </div>
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
