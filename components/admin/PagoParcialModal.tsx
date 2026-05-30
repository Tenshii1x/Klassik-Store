"use client"

import { useState } from "react"
import { X } from "lucide-react"

interface PagoFormData {
  monto: number
  fecha_pago: string
  fecha_vencimiento?: string
  nota?: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (data: PagoFormData) => void
  isPending: boolean
  saldoPendiente: number
}

export function PagoParcialModal({ open, onClose, onSubmit, isPending, saldoPendiente }: Props) {
  const [monto, setMonto] = useState("")
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split("T")[0])
  const [fechaVencimiento, setFechaVencimiento] = useState("")
  const [nota, setNota] = useState("")
  const [error, setError] = useState("")

  function reset() {
    setMonto("")
    setFechaPago(new Date().toISOString().split("T")[0])
    setFechaVencimiento("")
    setNota("")
    setError("")
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const montoNum = Number(monto)
    if (!monto || isNaN(montoNum) || montoNum <= 0) {
      setError("Ingresa un monto mayor a $0.")
      return
    }
    if (montoNum > saldoPendiente + 0.01) {
      setError(`El monto no puede superar el saldo pendiente (${saldoPendiente.toFixed(2)}).`)
      return
    }
    onSubmit({
      monto: montoNum,
      fecha_pago: fechaPago,
      fecha_vencimiento: fechaVencimiento || undefined,
      nota: nota || undefined,
    })
    reset()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-black-surface border border-border rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-xl text-white">Registrar pago</h2>
          <button onClick={handleClose} className="text-muted hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-black rounded-md p-3 text-xs flex justify-between">
            <span className="text-muted">Saldo pendiente</span>
            <span className="text-gold-primary font-serif">${saldoPendiente.toFixed(2)}</span>
          </div>

          <div>
            <label className="block text-xs text-muted uppercase tracking-wider mb-1">Monto pagado (USD)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
              className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-muted uppercase tracking-wider mb-1">Fecha de pago</label>
            <input
              type="date"
              value={fechaPago}
              onChange={(e) => setFechaPago(e.target.value)}
              className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-muted uppercase tracking-wider mb-1">
              Fecha límite <span className="text-muted normal-case">(opcional)</span>
            </label>
            <input
              type="date"
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-primary"
            />
          </div>

          <div>
            <label className="block text-xs text-muted uppercase tracking-wider mb-1">
              Nota <span className="text-muted normal-case">(opcional)</span>
            </label>
            <input
              type="text"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Yappy, transferencia, efectivo..."
              className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-primary"
            />
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-border text-white text-sm rounded-md hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2 bg-gold-primary text-black text-sm font-semibold rounded-md hover:bg-gold-primary/90 transition-colors disabled:opacity-50"
            >
              {isPending ? "Guardando..." : "Guardar pago"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
