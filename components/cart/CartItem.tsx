"use client"

import Image from "next/image"
import { Plus, Minus, X } from "lucide-react"
import { formatUSD } from "@/lib/utils"
import { useCart } from "./CartProvider"

interface Props {
  productoId: string
  varianteId?: string | null
  nombre: string
  precio: number
  imagen: string | null
  cantidad: number
  modo: string
}

export function CartItem({ productoId, varianteId, nombre, precio, imagen, cantidad, modo }: Props) {
  const { setCantidad, remove } = useCart()
  const esPreorden = modo === "preorden"
  return (
    <div className="flex gap-3 py-3 border-b border-border">
      <div className="relative w-16 h-16 rounded-md overflow-hidden bg-black flex-shrink-0">
        {imagen && <Image src={imagen} alt={nombre} fill sizes="64px" className="object-cover" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-medium truncate">{nombre}</div>
        <span
          className={`inline-block mt-0.5 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
            esPreorden
              ? "bg-info/10 text-info border border-info/30"
              : "bg-gold-primary/10 text-gold-primary border border-gold-primary/30"
          }`}
        >
          {esPreorden ? "Pre-orden · 50% ahora" : "En stock · 2-3 días"}
        </span>
        <div className="text-gold-primary text-sm font-serif mt-1">{formatUSD(precio)}</div>
        <div className="flex items-center gap-2 mt-2">
          <button type="button" onClick={() => setCantidad(productoId, cantidad - 1, varianteId, modo)} className="w-7 h-7 rounded border border-border text-white hover:text-gold-primary flex items-center justify-center">
            <Minus size={12} />
          </button>
          <span className="text-white text-sm w-6 text-center">{cantidad}</span>
          <button type="button" onClick={() => setCantidad(productoId, cantidad + 1, varianteId, modo)} className="w-7 h-7 rounded border border-border text-white hover:text-gold-primary flex items-center justify-center">
            <Plus size={12} />
          </button>
        </div>
      </div>
      <button type="button" onClick={() => remove(productoId, varianteId, modo)} className="text-muted hover:text-danger self-start" aria-label="Eliminar">
        <X size={16} />
      </button>
    </div>
  )
}
