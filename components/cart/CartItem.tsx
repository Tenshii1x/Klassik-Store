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
}

export function CartItem({ productoId, varianteId, nombre, precio, imagen, cantidad }: Props) {
  const { setCantidad, remove } = useCart()
  return (
    <div className="flex gap-3 py-3 border-b border-border">
      <div className="relative w-16 h-16 rounded-md overflow-hidden bg-black flex-shrink-0">
        {imagen && <Image src={imagen} alt={nombre} fill sizes="64px" className="object-cover" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-medium truncate">{nombre}</div>
        <div className="text-gold-primary text-sm font-serif mt-0.5">{formatUSD(precio)}</div>
        <div className="flex items-center gap-2 mt-2">
          <button type="button" onClick={() => setCantidad(productoId, cantidad - 1, varianteId)} className="w-7 h-7 rounded border border-border text-white hover:text-gold-primary flex items-center justify-center">
            <Minus size={12} />
          </button>
          <span className="text-white text-sm w-6 text-center">{cantidad}</span>
          <button type="button" onClick={() => setCantidad(productoId, cantidad + 1, varianteId)} className="w-7 h-7 rounded border border-border text-white hover:text-gold-primary flex items-center justify-center">
            <Plus size={12} />
          </button>
        </div>
      </div>
      <button type="button" onClick={() => remove(productoId, varianteId)} className="text-muted hover:text-danger self-start" aria-label="Eliminar">
        <X size={16} />
      </button>
    </div>
  )
}
