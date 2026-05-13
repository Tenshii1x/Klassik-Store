"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"

const STORAGE_KEY = "klassik_wishlist_v1"

interface WishlistContextValue {
  ids: string[]
  has: (id: string) => boolean
  toggle: (id: string) => void
}

const Ctx = createContext<WishlistContextValue | null>(null)

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setIds(JSON.parse(raw))
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  }, [ids, hydrated])

  function has(id: string) {
    return ids.includes(id)
  }
  function toggle(id: string) {
    setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return <Ctx.Provider value={{ ids, has, toggle }}>{children}</Ctx.Provider>
}

export function useWishlist() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useWishlist must be inside WishlistProvider")
  return ctx
}
