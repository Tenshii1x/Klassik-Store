"use client"

import { useState, useTransition } from "react"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/components/cart/CartProvider"
import { ZONAS, metodosPagoDisponibles, isPresencial } from "@/lib/pedidos/reglas-pago"
import { formatUSD } from "@/lib/utils"
import { ComprobanteUploader } from "./ComprobanteUploader"
import { crearPedido } from "@/app/(public)/checkout/actions"
import { toast } from "sonner"

interface Config {
  yappy_numero?: string | null
  yappy_qr_url?: string | null
  banco_nombre?: string | null
  banco_cuenta?: string | null
  banco_titular?: string | null
  banco_tipo?: string | null
}

interface Props {
  config: Config
}

export function CheckoutForm({ config }: Props) {
  const { items, clear } = useCart()
  const [isPending, startTransition] = useTransition()

  const [nombre, setNombre] = useState("")
  const [whatsapp, setWhatsapp] = useState("")
  const [email, setEmail] = useState("")
  const [zona, setZona] = useState<string>("")
  const [direccion, setDireccion] = useState("")
  const [metodoPago, setMetodoPago] = useState<string>("")
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(null)
  const [notas, setNotas] = useState("")

  const tieneStock = items.some((i) => i.modo === "stock")
  const tienePreorden = items.some((i) => i.modo === "preorden")
  const total = items.reduce((acc, i) => acc + i.precio * i.cantidad, 0)
  const metodosDisponibles = zona ? metodosPagoDisponibles(zona, { tieneStock, tienePreorden, total }) : []
  const metodoSel = metodosDisponibles.find((m) => m.value === metodoPago)
  const requiereDireccion = zona && !isPresencial(zona)
  const requiereComprobante = !!metodoSel?.requiereComprobante

  const montoInicial = metodoSel ? Math.round((total * metodoSel.porcentajeInicial / 100) * 100) / 100 : 0
  const montoEntrega = metodoSel ? total - montoInicial : 0

  function canSubmit(): boolean {
    if (items.length === 0) return false
    if (!nombre || nombre.length < 2) return false
    if (!whatsapp || whatsapp.length < 8 || !/^\d+$/.test(whatsapp)) return false
    if (!zona) return false
    if (requiereDireccion && !direccion) return false
    if (!metodoPago) return false
    if (requiereComprobante && !comprobanteUrl) return false
    return true
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit()) {
      toast.error("Faltan campos requeridos")
      return
    }
    startTransition(async () => {
      const result = await crearPedido({
        nombre_cliente: nombre.trim(),
        whatsapp_cliente: whatsapp.trim(),
        email_cliente: email.trim() || null,
        zona_entrega: zona,
        direccion_entrega: direccion.trim() || null,
        metodo_pago: metodoPago as never,
        comprobante_inicial_url: comprobanteUrl,
        notas_cliente: notas.trim() || null,
        items: items.map((i) => ({
          producto_id: i.productoId,
          variante_id: i.varianteId,
          cantidad: i.cantidad,
          modo: i.modo === "preorden" ? "preorden" : "stock",
        })),
      })
      if (result?.error) {
        toast.error(result.error)
        return
      }
      clear()
      // redirect happens server-side
    })
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardBody className="text-center py-12">
          <p className="font-serif text-2xl text-white mb-2">Tu carrito está vacío</p>
          <p className="text-muted text-sm">Agrega productos antes de finalizar el pedido.</p>
        </CardBody>
      </Card>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="font-serif text-lg text-white">Tu pedido</h3>
        </CardHeader>
        <CardBody className="space-y-2">
          {items.map((i) => (
            <div key={`${i.productoId}-${i.varianteId ?? ""}`} className="flex justify-between text-sm py-1">
              <span className="text-white">
                {i.nombre} <span className="text-muted">× {i.cantidad}</span>
                <Badge tone={i.modo === "stock" ? "success" : "info"} className="ml-2 text-[0.6rem]">
                  {i.modo === "stock" ? "Stock" : "Pre-orden"}
                </Badge>
              </span>
              <span className="text-gold-primary font-serif">{formatUSD(i.precio * i.cantidad)}</span>
            </div>
          ))}
          <div className="flex justify-between pt-3 border-t border-border">
            <span className="eyebrow">Total</span>
            <span className="font-serif text-xl text-gold-primary">{formatUSD(total)}</span>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-serif text-lg text-white">Tus datos</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <label className="eyebrow block mb-1.5">Nombre completo *</label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="eyebrow block mb-1.5">WhatsApp (con cód. país) *</label>
              <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))} placeholder="50760000000" required />
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Email (opcional)</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-serif text-lg text-white">Zona de entrega</h3>
          <p className="text-muted text-xs mt-1">Penonomé y estaciones de metro permiten pago en efectivo. Otras zonas requieren pago por adelantado.</p>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <label className="eyebrow block mb-1.5">Zona *</label>
            <select
              value={zona}
              onChange={(e) => { setZona(e.target.value); setMetodoPago("") }}
              className="w-full bg-black border border-border rounded-md px-3 py-2.5 text-white text-sm"
              required
            >
              <option value="">Selecciona…</option>
              {ZONAS.map((z) => (
                <option key={z.value} value={z.value}>{z.label}</option>
              ))}
            </select>
          </div>
          {requiereDireccion && (
            <div>
              <label className="eyebrow block mb-1.5">Dirección de entrega *</label>
              <textarea
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                rows={2}
                className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm"
                placeholder="Ciudad, barrio, calle, casa/apto, referencia"
                required
              />
            </div>
          )}
        </CardBody>
      </Card>

      {zona && (
        <Card>
          <CardHeader>
            <h3 className="font-serif text-lg text-white">Método de pago</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            {metodosDisponibles.map((m) => (
              <label
                key={m.value}
                className={`flex items-start gap-3 p-3 rounded-md border-2 cursor-pointer transition-colors ${
                  metodoPago === m.value ? "border-gold-primary bg-gold-primary/5" : "border-border hover:border-border-strong"
                }`}
              >
                <input
                  type="radio"
                  name="metodo"
                  value={m.value}
                  checked={metodoPago === m.value}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  className="mt-1 accent-gold-primary"
                />
                <div>
                  <div className="text-white text-sm font-semibold">{m.label}</div>
                  <div className="text-muted text-xs mt-1">{m.description}</div>
                </div>
              </label>
            ))}
          </CardBody>
        </Card>
      )}

      {metodoSel && (metodoSel.value.includes("yappy") || metodoSel.value.includes("transferencia")) && (
        <Card>
          <CardHeader>
            <h3 className="font-serif text-lg text-white">Cómo pagar</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            {metodoSel.value.includes("yappy") && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div>
                  <div className="eyebrow mb-1.5">Yappy</div>
                  <div className="text-white text-lg font-mono">{config.yappy_numero ?? "—"}</div>
                  <p className="text-muted text-xs mt-2">Abre Yappy en tu celular, escanea el QR o usa el número de arriba, y paga {formatUSD(montoInicial)}.</p>
                </div>
                {config.yappy_qr_url && (
                  <div className="relative w-40 h-40 rounded-md overflow-hidden border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={config.yappy_qr_url} alt="QR Yappy" className="w-full h-full object-contain bg-white" />
                  </div>
                )}
              </div>
            )}
            {metodoSel.value.includes("transferencia") && (
              <div className="space-y-1 text-sm">
                <div className="eyebrow mb-1.5">Transferencia bancaria</div>
                <div className="text-white">Banco: <span className="font-semibold">{config.banco_nombre ?? "—"}</span></div>
                <div className="text-white">Cuenta {config.banco_tipo}: <span className="font-mono">{config.banco_cuenta ?? "—"}</span></div>
                <div className="text-white">Titular: <span className="font-semibold">{config.banco_titular ?? "—"}</span></div>
                <p className="text-muted text-xs mt-3">Transfiere {formatUSD(montoInicial)} desde tu banco. Sube la captura del comprobante abajo.</p>
              </div>
            )}
            <div className="pt-3 border-t border-border">
              <div className="bg-black/50 p-3 rounded-md text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted">Pagas ahora ({metodoSel.porcentajeInicial}%):</span><span className="text-gold-primary font-serif">{formatUSD(montoInicial)}</span></div>
                {montoEntrega > 0 && (
                  <div className="flex justify-between"><span className="text-muted">Al recibir:</span><span className="text-white font-serif">{formatUSD(montoEntrega)}</span></div>
                )}
              </div>
            </div>
            {requiereComprobante && (
              <div>
                <label className="eyebrow block mb-2">Comprobante de pago *</label>
                <ComprobanteUploader value={comprobanteUrl} onChange={setComprobanteUrl} />
              </div>
            )}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h3 className="font-serif text-lg text-white">Notas (opcional)</h3>
        </CardHeader>
        <CardBody>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={3}
            className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm"
            placeholder="¿Algo que debamos saber? Hora preferida de entrega, instrucciones especiales..."
          />
        </CardBody>
      </Card>

      <div className="sticky bottom-0 bg-black-surface border border-border rounded-lg p-4 flex justify-between items-center">
        <div>
          <div className="text-muted text-xs">Total del pedido</div>
          <div className="font-serif text-2xl text-gold-primary">{formatUSD(total)}</div>
        </div>
        <Button type="submit" size="lg" disabled={!canSubmit() || isPending}>
          {isPending ? "Enviando…" : "Confirmar pedido"}
        </Button>
      </div>
    </form>
  )
}
