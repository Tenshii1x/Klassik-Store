"use client"

import { useCart } from "./CartProvider"
import { CartItem } from "./CartItem"
import { Button } from "@/components/ui/button"
import { formatUSD } from "@/lib/utils"
import { buildWhatsappMessage, buildWhatsappUrl } from "./whatsapp-message"
import { X } from "lucide-react"
import { createPortal } from "react-dom"
import { useEffect, useState } from "react"
import Link from "next/link"

interface Props {
  whatsappNumber: string | null
  storeName: string
}

export function CartDrawerClient({ whatsappNumber, storeName }: Props) {
  const { items, open, setOpen, clear, pagarCompletoPreorden, setPagarCompletoPreorden } = useCart()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  if (!mounted) return null

  const totalPedido = items.reduce((acc, i) => acc + i.precio * i.cantidad, 0)
  const subtotalStock = items
    .filter((i) => i.modo !== "preorden")
    .reduce((acc, i) => acc + i.precio * i.cantidad, 0)
  const subtotalPreorden = items
    .filter((i) => i.modo === "preorden")
    .reduce((acc, i) => acc + i.precio * i.cantidad, 0)
  const hayPreorden = subtotalPreorden > 0
  const depositoPreorden = pagarCompletoPreorden ? subtotalPreorden : subtotalPreorden / 2
  const pagoHoy = subtotalStock + depositoPreorden
  const pagoAlRecibir = totalPedido - pagoHoy

  function handleWhatsApp() {
    if (!whatsappNumber || items.length === 0) return
    const msg = buildWhatsappMessage(items, storeName)
    window.open(buildWhatsappUrl(whatsappNumber, msg), "_blank")
  }

  return createPortal(
    <>
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setOpen(false)}
      />
      <aside
        className={`fixed top-0 right-0 bottom-0 w-full sm:max-w-md bg-black-surface border-l border-border z-50 flex flex-col transition-transform ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <header className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="font-serif text-2xl text-white">Tu carrito</h2>
          <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-white">
            <X size={20} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5">
          {items.length === 0 ? (
            <div className="text-center py-20 text-muted">
              <p className="font-serif text-xl text-white mb-2">Carrito vacío</p>
              <p className="text-sm">Agrega productos para empezar.</p>
            </div>
          ) : (
            items.map((i) => (
              <CartItem
                key={`${i.productoId}-${i.varianteId ?? ""}-${i.modo}`}
                productoId={i.productoId}
                varianteId={i.varianteId}
                nombre={i.nombre}
                precio={i.precio}
                imagen={i.imagen}
                cantidad={i.cantidad}
                modo={i.modo}
                stockMax={i.stockMax}
              />
            ))
          )}
        </div>
        {items.length > 0 && (
          <footer className="p-5 border-t border-border space-y-3">
            {hayPreorden && (
              <div className="bg-black rounded-md p-3 text-xs space-y-2">
                {subtotalStock > 0 && (
                  <div className="flex items-center justify-between text-white/80">
                    <span>En stock</span>
                    <span>{formatUSD(subtotalStock)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-white/80">
                  <span>Pre-orden</span>
                  <span>{formatUSD(subtotalPreorden)}</span>
                </div>
                <label className="flex items-start gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pagarCompletoPreorden}
                    onChange={(e) => setPagarCompletoPreorden(e.target.checked)}
                    className="accent-gold-primary mt-0.5"
                  />
                  <span className="text-white/85 leading-snug">
                    Pagar pre-orden 100% ahora
                    <span className="text-muted block text-[10px]">
                      Por defecto se paga 50% ahora y 50% al recibir (~15 días).
                    </span>
                  </span>
                </label>
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="eyebrow">Pago hoy</span>
                <span className="font-serif text-2xl text-gold-primary">{formatUSD(pagoHoy)}</span>
              </div>
              {pagoAlRecibir > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">Pago al recibir pre-orden</span>
                  <span className="text-info">{formatUSD(pagoAlRecibir)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                <span className="text-muted">Total del pedido</span>
                <span className="text-white/70">{formatUSD(totalPedido)}</span>
              </div>
            </div>
            <Link href="/checkout" onClick={() => setOpen(false)} className="block">
              <Button type="button" size="lg" className="w-full">
                Finalizar pedido →
              </Button>
            </Link>
            {whatsappNumber && (
              <button type="button" onClick={handleWhatsApp} className="w-full text-xs text-muted hover:text-gold-primary py-1">
                ¿Prefieres WhatsApp? Escríbenos
              </button>
            )}
            <button type="button" onClick={clear} className="w-full text-xs text-muted hover:text-danger py-2">
              Vaciar carrito
            </button>
          </footer>
        )}
      </aside>
    </>,
    document.body
  )
}
