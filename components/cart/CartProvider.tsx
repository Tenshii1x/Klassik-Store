"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"

const STORAGE_KEY = "klassik_cart_v1"

interface CartItem {
  productoId: string
  varianteId?: string | null
  nombre: string
  precio: number
  imagen: string | null
  cantidad: number
  modo: string
}

interface CartContextValue {
  items: CartItem[]
  open: boolean
  setOpen: (v: boolean) => void
  add: (item: CartItem) => void
  remove: (productoId: string, varianteId?: string | null) => void
  setCantidad: (productoId: string, cantidad: number, varianteId?: string | null) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

function sameItem(a: CartItem, b: { productoId: string; varianteId?: string | null }) {
  return a.productoId === b.productoId && (a.varianteId ?? null) === (b.varianteId ?? null)
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [open, setOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw))
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items, hydrated])

  function add(item: CartItem) {
    setItems((prev) => {
      const existing = prev.find((p) => sameItem(p, item))
      if (existing) {
        return prev.map((p) => (sameItem(p, item) ? { ...p, cantidad: p.cantidad + item.cantidad } : p))
      }
      return [...prev, item]
    })
  }

  function remove(productoId: string, varianteId?: string | null) {
    setItems((prev) => prev.filter((p) => !sameItem(p, { productoId, varianteId })))
  }

  function setCantidad(productoId: string, cantidad: number, varianteId?: string | null) {
    if (cantidad <= 0) {
      remove(productoId, varianteId)
      return
    }
    setItems((prev) => prev.map((p) => (sameItem(p, { productoId, varianteId }) ? { ...p, cantidad } : p)))
  }

  function clear() {
    setItems([])
  }

  return (
    <CartContext.Provider value={{ items, open, setOpen, add, remove, setCantidad, clear }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be inside CartProvider")
  return ctx
}
