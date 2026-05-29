"use client"

import { useState, useTransition } from "react"
import { registrarVentaOffline } from "@/app/admin/ventas-offline/actions"
import { X, Plus } from "lucide-react"

interface Producto {
  id: string
  nombre: string
  precio_venta: number
  costo_temu: number
  costo_envio_unitario: number
  stock_unidades: number | null
}

export function VentaOfflineModal({ productos }: { productos: Producto[] }) {
  const [open, setOpen] = useState(false)
  const [productoId, setProductoId] = useState("")
  const [cantidad, setCantidad] = useState(1)
  const [precioVendido, setPrecioVendido] = useState("")
  const [canal, setCanal] = useState<"whatsapp" | "presencial">("whatsapp")
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0])
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  const productoSeleccionado = productos.find((p) => p.id === productoId)
  const stockDisponible = productoSeleccionado?.stock_unidades ?? null

  function reset() {
    setProductoId("")
    setCantidad(1)
    setPrecioVendido("")
    setCanal("whatsapp")
    setFecha(new Date().toISOString().split("T")[0])
    setError("")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!productoSeleccionado) { setError("Selecciona un producto."); return }
    if (cantidad < 1) { setError("La cantidad debe ser al menos 1."); return }
    if (stockDisponible !== null && cantidad > stockDisponible) {
      setError(`Stock insuficiente. Disponible: ${stockDisponible} unidades.`)
      return
    }
    if (!precioVendido || isNaN(Number(precioVendido))) { setError("Ingresa el precio de venta."); return }

    startTransition(async () => {
      try {
        await registrarVentaOffline({
          producto_id: productoId,
          cantidad,
          precio_vendido: Number(precioVendido),
          costo_snapshot: Number(productoSeleccionado.costo_temu) + Number(productoSeleccionado.costo_envio_unitario),
          canal,
          fecha,
        })
        setOpen(false)
        reset()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error al registrar la venta.")
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gold-primary text-black text-sm font-semibold rounded-md hover:bg-gold-primary/90 transition-colors"
      >
        <Plus size={16} />
        Registrar venta
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-black-surface border border-border rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-xl text-white">Registrar venta offline</h2>
              <button onClick={() => { setOpen(false); reset() }} className="text-muted hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-muted uppercase tracking-wider mb-1">Producto</label>
                <select
                  value={productoId}
                  onChange={(e) => { setProductoId(e.target.value); setPrecioVendido("") }}
                  className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-primary"
                  required
                >
                  <option value="">Selecciona un producto...</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.stock_unidades !== null ? `(${p.stock_unidades} en stock)` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {productoSeleccionado && (
                <div className="bg-black rounded-md p-3 text-xs space-y-1">
                  <div className="flex justify-between text-muted">
                    <span>Precio web</span>
                    <span className="text-gold-primary">${productoSeleccionado.precio_venta.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Costo unitario</span>
                    <span>${(Number(productoSeleccionado.costo_temu) + Number(productoSeleccionado.costo_envio_unitario)).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs text-muted uppercase tracking-wider mb-1">Cantidad</label>
                <input
                  type="number"
                  min={1}
                  max={stockDisponible ?? undefined}
                  value={cantidad}
                  onChange={(e) => setCantidad(Number(e.target.value))}
                  className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-muted uppercase tracking-wider mb-1">Precio vendido (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={precioVendido}
                  onChange={(e) => setPrecioVendido(e.target.value)}
                  placeholder={productoSeleccionado ? `${productoSeleccionado.precio_venta}` : "0.00"}
                  className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-muted uppercase tracking-wider mb-1">Canal</label>
                <select
                  value={canal}
                  onChange={(e) => setCanal(e.target.value as "whatsapp" | "presencial")}
                  className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-primary"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="presencial">Presencial</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-muted uppercase tracking-wider mb-1">Fecha</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-primary"
                  required
                />
              </div>

              {error && <p className="text-danger text-sm">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setOpen(false); reset() }}
                  className="flex-1 px-4 py-2 border border-border text-white text-sm rounded-md hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-4 py-2 bg-gold-primary text-black text-sm font-semibold rounded-md hover:bg-gold-primary/90 transition-colors disabled:opacity-50"
                >
                  {isPending ? "Guardando..." : "Guardar venta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
