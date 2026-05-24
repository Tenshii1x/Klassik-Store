"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"

const STORAGE_KEY = "klassik_cart_v1"
const PAGAR_COMPLETO_KEY = "klassik_pagar_completo_v1"

export interface CartItem {
  productoId: string
  varianteId?: string | null
  nombre: string
  precio: number
  imagen: string | null
  cantidad: number
  modo: string
  /** Stock máximo conocido del producto (snapshot al agregar). Solo aplica si modo === "stock". */
  stockMax?: number
}

interface CartContextValue {
  items: CartItem[]
  open: boolean
  setOpen: (v: boolean) => void
  add: (item: CartItem) => void
  remove: (productoId: string, varianteId?: string | null, modo?: string) => void
  setCantidad: (productoId: string, cantidad: number, varianteId?: string | null, modo?: string) => void
  clear: () => void
  pagarCompletoPreorden: boolean
  setPagarCompletoPreorden: (v: boolean) => void
}

const CartContext = createContext<CartContextValue | null>(null)

function sameItem(
  a: CartItem,
  b: { productoId: string; varianteId?: string | null; modo?: string }
) {
  return (
    a.productoId === b.productoId &&
    (a.varianteId ?? null) === (b.varianteId ?? null) &&
    (b.modo === undefined || a.modo === b.modo)
  )
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [open, setOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [pagarCompletoPreorden, setPagarCompletoPreorden] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw))
      const flag = localStorage.getItem(PAGAR_COMPLETO_KEY)
      if (flag === "1") setPagarCompletoPreorden(true)
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items, hydrated])

  useEffect(() => {
    if (hydrated) localStorage.setItem(PAGAR_COMPLETO_KEY, pagarCompletoPreorden ? "1" : "0")
  }, [pagarCompletoPreorden, hydrated])

  function add(item: CartItem) {
    setItems((prev) => {
      const match = { productoId: item.productoId, varianteId: item.varianteId, modo: item.modo }
      const existing = prev.find((p) => sameItem(p, match))
      if (existing) {
        return prev.map((p) => (sameItem(p, match) ? { ...p, cantidad: p.cantidad + item.cantidad } : p))
      }
      return [...prev, item]
    })
  }

  function remove(productoId: string, varianteId?: string | null, modo?: string) {
    setItems((prev) => prev.filter((p) => !sameItem(p, { productoId, varianteId, modo })))
  }

  function setCantidad(productoId: string, cantidad: number, varianteId?: string | null, modo?: string) {
    if (cantidad <= 0) {
      remove(productoId, varianteId, modo)
      return
    }
    setItems((prev) => prev.map((p) => (sameItem(p, { productoId, varianteId, modo }) ? { ...p, cantidad } : p)))
  }

  function clear() {
    setItems([])
  }

  return (
    <CartContext.Provider
      value={{
        items,
        open,
        setOpen,
        add,
        remove,
        setCantidad,
        clear,
        pagarCompletoPreorden,
        setPagarCompletoPreorden,
      }}
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
