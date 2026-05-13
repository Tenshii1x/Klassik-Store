"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { BulkActionsBar } from "./BulkActionsBar"
import { formatUSD } from "@/lib/utils"
import { ChevronRight } from "lucide-react"

interface Producto {
  id: string
  nombre: string
  modelo: string | null
  estado: string
  modo: string
  stock_unidades: number | null
  precio_venta: number
  precio_anterior: number | null
  destacado: boolean
  secciones: { nombre: string } | null
  producto_imagenes: { url: string }[]
}

export function ProductosTable({ productos }: { productos: Producto[] }) {
  const [selected, setSelected] = useState<string[]>([])

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function toggleAll() {
    if (selected.length === productos.length) setSelected([])
    else setSelected(productos.map((p) => p.id))
  }

  if (productos.length === 0) {
    return (
      <Card>
        <div className="p-12 text-center text-muted">
          <p className="font-serif text-xl text-white mb-2">No hay productos</p>
          <p className="text-sm">Crea uno nuevo o ajusta los filtros.</p>
        </div>
      </Card>
    )
  }

  return (
    <>
      <BulkActionsBar selected={selected} onClear={() => setSelected([])} />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-black/40 text-muted text-xs uppercase tracking-wider">
              <tr>
                <th className="p-3 text-left w-8">
                  <input
                    type="checkbox"
                    onChange={toggleAll}
                    checked={selected.length === productos.length && productos.length > 0}
                    className="accent-gold-primary"
                  />
                </th>
                <th className="p-3 text-left w-16"></th>
                <th className="p-3 text-left">Producto</th>
                <th className="p-3 text-left">Sección</th>
                <th className="p-3 text-left">Modo</th>
                <th className="p-3 text-left">Estado</th>
                <th className="p-3 text-right">Precio</th>
                <th className="p-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => {
                const img = p.producto_imagenes?.[0]?.url
                const isStock = p.modo === "stock"
                const agotado = isStock && (p.stock_unidades ?? 0) === 0
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-white/2">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(p.id)}
                        onChange={() => toggle(p.id)}
                        className="accent-gold-primary"
                      />
                    </td>
                    <td className="p-3">
                      <div className="relative w-12 h-12 rounded-md overflow-hidden bg-black">
                        {img ? (
                          <Image src={img} alt={p.nombre} fill className="object-cover" sizes="48px" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gold-deep/30 to-black" />
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <Link href={`/admin/productos/${p.id}`} className="font-serif text-white hover:text-gold-primary">
                        {p.nombre}
                      </Link>
                      {p.modelo && <div className="text-xs text-muted">{p.modelo}</div>}
                      {p.destacado && <Badge tone="gold" className="mt-1">Destacado</Badge>}
                    </td>
                    <td className="p-3 text-muted">{p.secciones?.nombre ?? "—"}</td>
                    <td className="p-3">
                      <Badge tone={isStock ? "success" : "info"}>
                        {isStock ? `Stock · ${p.stock_unidades ?? 0}` : "Pre-orden"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge tone={p.estado === "publicado" ? "success" : p.estado === "borrador" ? "warning" : "neutral"}>
                        {p.estado}
                      </Badge>
                      {agotado && <Badge tone="danger" className="ml-1">Agotado</Badge>}
                    </td>
                    <td className="p-3 text-right">
                      <div className="font-serif text-gold-primary">{formatUSD(p.precio_venta)}</div>
                      {p.precio_anterior && (
                        <div className="text-xs text-muted line-through">{formatUSD(p.precio_anterior)}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <Link href={`/admin/productos/${p.id}`} className="text-muted hover:text-gold-primary">
                        <ChevronRight size={16} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
