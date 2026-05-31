"use client"

import { useState, useTransition } from "react"
import { Save } from "lucide-react"
import { Card } from "@/components/ui/card"
import { actualizarStocks } from "@/app/admin/inventario/actions"
import { formatUSD } from "@/lib/utils"
import { toast } from "sonner"

interface Producto {
  id: string
  nombre: string
  stock_unidades: number | null
  precio_venta: number
  costo_temu: number
  costo_envio_unitario: number
}

interface Props {
  productos: Producto[]
}

export function AjusteInventarioTable({ productos }: Props) {
  const [cambios, setCambios] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()

  const cantidadCambios = Object.values(cambios).filter((v) => v !== "").length

  function handleChange(id: string, value: string) {
    setCambios((prev) => ({ ...prev, [id]: value }))
  }

  function handleGuardar() {
    const payload = Object.entries(cambios)
      .filter(([, v]) => v !== "" && !isNaN(Number(v)) && Number(v) >= 0)
      .map(([id, v]) => ({ id, stock: Math.floor(Number(v)) }))

    if (!payload.length) return

    startTransition(async () => {
      try {
        await actualizarStocks(payload)
        toast.success(
          `${payload.length} producto${payload.length > 1 ? "s" : ""} actualizado${payload.length > 1 ? "s" : ""}`
        )
        setCambios({})
      } catch {
        toast.error("Error al guardar los cambios")
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {cantidadCambios > 0 ? (
          <span className="text-sm text-gold-primary">
            {cantidadCambios} producto{cantidadCambios > 1 ? "s" : ""} modificado{cantidadCambios > 1 ? "s" : ""}
          </span>
        ) : (
          <span className="text-sm text-muted">
            Escribe el nuevo stock en los productos que cambiaron
          </span>
        )}
        <button
          onClick={handleGuardar}
          disabled={cantidadCambios === 0 || isPending}
          className="flex items-center gap-2 px-4 py-2 bg-gold-primary text-black text-sm font-semibold rounded-md hover:bg-gold-primary/90 transition-colors disabled:opacity-40"
        >
          <Save size={14} />
          {isPending ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted text-xs uppercase tracking-wider">
              <tr className="border-b border-border">
                <th className="text-left p-3">Producto</th>
                <th className="text-right p-3">Stock actual</th>
                <th className="text-right p-3 w-36">Nuevo stock</th>
                <th className="text-right p-3">Precio venta</th>
                <th className="text-right p-3">Costo</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => {
                const costo = Number(p.costo_temu) + Number(p.costo_envio_unitario)
                const valorNuevo = cambios[p.id] ?? ""
                const tieneCambio = valorNuevo !== ""
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-border last:border-0 transition-colors ${
                      tieneCambio ? "bg-gold-primary/5" : ""
                    }`}
                  >
                    <td className="p-3 text-white">{p.nombre}</td>
                    <td className="p-3 text-right">
                      <span className={(p.stock_unidades ?? 0) === 0 ? "text-danger" : "text-white"}>
                        {p.stock_unidades ?? 0}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={valorNuevo}
                        onChange={(e) => handleChange(p.id, e.target.value)}
                        placeholder={String(p.stock_unidades ?? 0)}
                        className="w-24 bg-black border border-border rounded px-2 py-1 text-white text-right text-sm focus:outline-none focus:border-gold-primary"
                      />
                    </td>
                    <td className="p-3 text-right text-white">{formatUSD(Number(p.precio_venta))}</td>
                    <td className="p-3 text-right text-muted">{formatUSD(costo)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
