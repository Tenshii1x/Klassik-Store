"use client"

import Link from "next/link"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useTransition } from "react"

interface Props {
  subsecciones: { id: string; nombre: string; slug: string }[]
  baseHref: string
}

const SORTS = [
  { value: "destacados", label: "Destacados" },
  { value: "nuevos", label: "Más nuevos" },
  { value: "precio_asc", label: "Precio: menor a mayor" },
  { value: "precio_desc", label: "Precio: mayor a menor" },
]

const MODOS = [
  { value: "", label: "Todos" },
  { value: "stock", label: "En stock" },
  { value: "preorden", label: "Pre-orden" },
]

export function FiltrosSection({ subsecciones, baseHref }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [, startTransition] = useTransition()

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    startTransition(() => router.push(`${pathname}?${next.toString()}`))
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 border-b border-border space-y-4">
      {subsecciones.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Link
            href={baseHref}
            className={`px-4 py-2 rounded-full text-xs uppercase tracking-wider whitespace-nowrap border transition-colors ${
              pathname === baseHref ? "bg-gold-primary text-black border-gold-primary" : "text-white border-border hover:border-gold-primary"
            }`}
          >
            Todo
          </Link>
          {subsecciones.map((sub) => {
            const isActive = pathname === `${baseHref}/${sub.slug}`
            return (
              <Link
                key={sub.id}
                href={`${baseHref}/${sub.slug}`}
                className={`px-4 py-2 rounded-full text-xs uppercase tracking-wider whitespace-nowrap border transition-colors ${
                  isActive ? "bg-gold-primary text-black border-gold-primary" : "text-white border-border hover:border-gold-primary"
                }`}
              >
                {sub.nombre}
              </Link>
            )
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center justify-end">
        <select
          value={params.get("modo") || ""}
          onChange={(e) => setParam("modo", e.target.value)}
          className="bg-black border border-border rounded-md px-3 py-2 text-white text-sm"
        >
          {MODOS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={params.get("sort") || "destacados"}
          onChange={(e) => setParam("sort", e.target.value)}
          className="bg-black border border-border rounded-md px-3 py-2 text-white text-sm"
        >
          {SORTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    </div>
  )
}
