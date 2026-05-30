"use client"

import { useState, useTransition } from "react"
import { Plus, Trash2 } from "lucide-react"
import { PagoParcialModal } from "@/components/admin/PagoParcialModal"
import { formatUSD } from "@/lib/utils"

export interface PagoParcial {
  id: string
  monto: number
  fecha_pago: string
  fecha_vencimiento?: string | null
  nota?: string | null
}

interface PagoFormData {
  monto: number
  fecha_pago: string
  fecha_vencimiento?: string
  nota?: string
}

interface Props {
  total: number
  pagos: PagoParcial[]
  onAgregarPago: (data: PagoFormData) => Promise<void>
  onEliminarPago: (id: string) => Promise<void>
}

export function PagosPanel({ total, pagos, onAgregarPago, onEliminarPago }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState("")

  const cobrado = pagos.reduce((acc, p) => acc + Number(p.monto), 0)
  const saldoPendiente = Math.max(0, total - cobrado)
  const pct = total > 0 ? Math.min((cobrado / total) * 100, 100) : 0
  const pagado = saldoPendiente <= 0.01

  function handleAgregar(data: PagoFormData) {
    setErrorMsg("")
    startTransition(async () => {
      try {
        await onAgregarPago(data)
        setModalOpen(false)
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Error al guardar el pago.")
      }
    })
  }

  function handleEliminar(id: string) {
    startTransition(async () => {
      try {
        await onEliminarPago(id)
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Error al eliminar el pago.")
      }
    })
  }

  return (
    <div className="space-y-4 pt-2">
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="bg-black rounded-md p-3 space-y-1">
          <div className="text-muted uppercase tracking-wider">Total</div>
          <div className="font-serif text-gold-primary">{formatUSD(total)}</div>
        </div>
        <div className="bg-black rounded-md p-3 space-y-1">
          <div className="text-muted uppercase tracking-wider">Cobrado</div>
          <div className={`font-serif ${pagado ? "text-success" : "text-white"}`}>{formatUSD(cobrado)}</div>
        </div>
        <div className="bg-black rounded-md p-3 space-y-1">
          <div className="text-muted uppercase tracking-wider">Pendiente</div>
          <div className={`font-serif ${pagado ? "text-success" : "text-danger"}`}>
            {pagado ? "Pagado ✓" : formatUSD(saldoPendiente)}
          </div>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="h-1.5 bg-black rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pagado ? "bg-success" : "bg-gold-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Historial de pagos */}
      {pagos.length > 0 && (
        <table className="w-full text-xs">
          <thead className="text-muted uppercase tracking-wider">
            <tr className="border-b border-border">
              <th className="text-left py-1.5">Fecha pago</th>
              <th className="text-right py-1.5">Monto</th>
              <th className="text-left py-1.5 pl-3">Vence</th>
              <th className="text-left py-1.5 pl-3">Nota</th>
              <th className="py-1.5" />
            </tr>
          </thead>
          <tbody>
            {pagos.map((p) => (
              <tr key={p.id} className="border-b border-border/50 last:border-0">
                <td className="py-1.5 text-white">{p.fecha_pago}</td>
                <td className="py-1.5 text-right font-serif text-gold-primary">{formatUSD(Number(p.monto))}</td>
                <td className="py-1.5 pl-3 text-muted">{p.fecha_vencimiento ?? "—"}</td>
                <td className="py-1.5 pl-3 text-muted max-w-[120px] truncate">{p.nota ?? "—"}</td>
                <td className="py-1.5 text-right">
                  <button
                    onClick={() => handleEliminar(p.id)}
                    disabled={isPending}
                    className="text-danger/50 hover:text-danger transition-colors disabled:opacity-30"
                  >
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {errorMsg && <p className="text-danger text-xs">{errorMsg}</p>}

      {/* Botón agregar */}
      {!pagado && (
        <button
          onClick={() => setModalOpen(true)}
          disabled={isPending}
          className="flex items-center gap-1.5 text-xs text-gold-primary hover:text-gold-primary/80 transition-colors disabled:opacity-50"
        >
          <Plus size={12} />
          Agregar pago
        </button>
      )}

      <PagoParcialModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAgregar}
        isPending={isPending}
        saldoPendiente={saldoPendiente}
      />
    </div>
  )
}
