"use client"

import React, { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { PagosPanel, type PagoParcial } from "@/components/admin/PagosPanel"
import { agregarPagoVentaOffline, eliminarPagoVentaOffline } from "@/app/admin/ventas-offline/pagos-actions"
import { formatUSD } from "@/lib/utils"

interface VentaConPagos {
  id: string
  cantidad: number
  precio_vendido: number
  costo_snapshot: number
  canal: string
  fecha: string
  producto_id: string | null
  productos: { nombre: string } | null
  pagos_parciales: PagoParcial[]
}

interface Props {
  ventas: VentaConPagos[]
}

export function VentasOfflineHistorial({ ventas }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (ventas.length === 0) {
    return (
      <Card>
        <div className="text-center py-8 text-muted text-sm px-4">
          Aún no hay ventas offline registradas. Usa el botón &quot;Registrar venta&quot; para agregar una.
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted text-xs uppercase tracking-wider">
            <tr className="border-b border-border">
              <th className="text-left p-3 w-6" />
              <th className="text-left p-3">Producto</th>
              <th className="text-right p-3">Cant.</th>
              <th className="text-right p-3">Total venta</th>
              <th className="text-right p-3">Cobrado</th>
              <th className="text-left p-3">Canal</th>
              <th className="text-left p-3">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {ventas.map((v) => {
              const totalVenta = Number(v.precio_vendido) * v.cantidad
              const cobrado = v.pagos_parciales.reduce((acc, p) => acc + Number(p.monto), 0)
              const saldo = Math.max(0, totalVenta - cobrado)
              const pagado = saldo <= 0.01
              const isExpanded = expandedId === v.id

              return (
                <React.Fragment key={v.id}>
                  <tr
                    className="border-b border-border cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : v.id)}
                  >
                    <td className="p-3 text-muted">
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </td>
                    <td className="p-3 text-white">{v.productos?.nombre ?? "Producto eliminado"}</td>
                    <td className="p-3 text-right text-white">{v.cantidad}</td>
                    <td className="p-3 text-right text-white">{formatUSD(totalVenta)}</td>
                    <td className="p-3 text-right">
                      <span className={pagado ? "text-success font-semibold" : "text-gold-primary"}>
                        {formatUSD(cobrado)}
                        {pagado && " ✓"}
                      </span>
                      {!pagado && (
                        <div className="text-danger text-xs">−{formatUSD(saldo)}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="text-xs text-muted capitalize">{v.canal}</span>
                    </td>
                    <td className="p-3 text-muted text-xs">{v.fecha}</td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-b border-border bg-black/40">
                      <td colSpan={7} className="px-6 pb-4">
                        <PagosPanel
                          total={totalVenta}
                          pagos={v.pagos_parciales}
                          onAgregarPago={(data) =>
                            agregarPagoVentaOffline({ ...data, venta_offline_id: v.id })
                          }
                          onEliminarPago={(id) => eliminarPagoVentaOffline(id)}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
