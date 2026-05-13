"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

export function SearchBar() {
  const router = useRouter()
  const params = useSearchParams()
  const [q, setQ] = useState(params.get("q") || "")

  useEffect(() => {
    const t = setTimeout(() => {
      const cur = params.get("q") || ""
      if (q !== cur) {
        const next = new URLSearchParams(params)
        if (q) next.set("q", q)
        else next.delete("q")
        router.push(`/buscar?${next.toString()}`)
      }
    }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  return (
    <div className="relative max-w-xl mx-auto">
      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gold-primary" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar productos..."
        className="pl-12 py-4 text-base"
        autoFocus
      />
    </div>
  )
}
