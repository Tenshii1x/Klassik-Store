"use client"

import { Heart } from "lucide-react"
import { useWishlist } from "./WishlistProvider"
import { cn } from "@/lib/utils"

export function WishlistButton({ productoId, className }: { productoId: string; className?: string }) {
  const { has, toggle } = useWishlist()
  const active = has(productoId)
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggle(productoId)
      }}
      className={cn(
        "w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center transition-colors",
        active ? "text-gold-primary" : "text-white hover:text-gold-primary",
        className
      )}
      aria-label="Agregar a wishlist"
    >
      <Heart size={14} fill={active ? "currentColor" : "none"} />
    </button>
  )
}
