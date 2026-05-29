"use client"

import { useEffect, useState } from "react"
import { useWishlist } from "@/components/wishlist/WishlistProvider"
import { ProductoCard } from "@/components/public/ProductoCard"
import Link from "next/link"
import { Heart } from "lucide-react"

type Producto = {
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

export function FavoritosGrid() {
  const { ids } = useWishlist()
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (ids.length === 0) {
      setProductos([])
      setLoading(false)
      return
    }
    setLoading(true)
    fetch("/api/favoritos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })
      .then((r) => r.json())
      .then((data) => {
        setProductos(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [ids])

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="aspect-[3/4] bg-black-surface animate-pulse rounded-md" />
        ))}
      </div>
    )
  }

  if (productos.length === 0) {
    return (
      <div className="text-center py-24 space-y-6">
        <Heart size={48} className="text-gold-primary/30 mx-auto" />
        <p className="font-serif text-2xl text-white">Aún no tienes favoritos</p>
        <p className="text-muted text-sm">Guarda las piezas que te gustan tocando el corazón en cualquier producto.</p>
        <Link
          href="/buscar"
          className="inline-block px-6 py-3 border border-gold-primary text-gold-primary text-sm uppercase tracking-widest hover:bg-gold-primary hover:text-black transition-colors"
        >
          Explorar catálogo
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
      {productos.map((p) => (
        <ProductoCard key={p.id} p={p as never} />
      ))}
    </div>
  )
}
