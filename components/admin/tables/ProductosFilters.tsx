"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Input } from "@/components/ui/input"
import { useTransition } from "react"
import { Search } from "lucide-react"

interface Props {
  secciones: { id: string; nombre: string }[]
}

const ESTADOS = [
  { value: "", label: "Todos" },
  { value: "publicado", label: "Publicados" },
  { value: "borrador", label: "Borradores" },
  { value: "archivado", label: "Archivados" },
]

const MODOS = [
  { value: "", label: "Todos modos" },
  { value: "stock", label: "En stock" },
  { value: "preorden", label: "Pre-orden" },
]

export function ProductosFilters({ secciones }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [, startTransition] = useTransition()

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`)
    })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      <div className="flex-1 min-w-[260px] relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gold-primary" />
        <Input
          defaultValue={params.get("q") || ""}
          onChange={(e) => setParam("q", e.target.value)}
          placeholder="Buscar por nombre, modelo o ID..."
          className="pl-9"
        />
      </div>
      <select
        defaultValue={params.get("estado") || ""}
        onChange={(e) => setParam("estado", e.target.value)}
        className="bg-black border border-border rounded-md px-3 py-2 text-white text-sm"
      >
        {ESTADOS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <select
        defaultValue={params.get("modo") || ""}
        onChange={(e) => setParam("modo", e.target.value)}
        className="bg-black border border-border rounded-md px-3 py-2 text-white text-sm"
      >
        {MODOS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <select
        defaultValue={params.get("seccion") || ""}
        onChange={(e) => setParam("seccion", e.target.value)}
        className="bg-black border border-border rounded-md px-3 py-2 text-white text-sm"
      >
        <option value="">Toda sección</option>
        {secciones.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
      </select>
    </div>
  )
}
