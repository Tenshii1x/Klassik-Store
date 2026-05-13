"use client"

import { createContext, useContext, useState, ReactNode } from "react"

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

export function CartProvider({ children }: { children: ReactNode }) {
  const [items] = useState<CartItem[]>([])
  const [open, setOpen] = useState(false)
  // Full implementation in Task 6
  return (
    <CartContext.Provider
      value={{ items, open, setOpen, add: () => {}, remove: () => {}, setCantidad: () => {}, clear: () => {} }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be inside CartProvider")
  return ctx
}
