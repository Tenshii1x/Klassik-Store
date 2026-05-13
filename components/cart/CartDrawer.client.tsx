"use client"

import { useCart } from "./CartProvider"
import { CartItem } from "./CartItem"
import { Button } from "@/components/ui/button"
import { formatUSD } from "@/lib/utils"
import { buildWhatsappMessage, buildWhatsappUrl } from "./whatsapp-message"
import { X } from "lucide-react"
import { createPortal } from "react-dom"
import { useEffect, useState } from "react"

interface Props {
  whatsappNumber: string | null
  storeName: string
}

export function CartDrawerClient({ whatsappNumber, storeName }: Props) {
  const { items, open, setOpen, clear } = useCart()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  if (!mounted) return null

  const total = items.reduce((acc, i) => acc + i.precio * i.cantidad, 0)

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
                key={`${i.productoId}-${i.varianteId ?? ""}`}
                productoId={i.productoId}
                varianteId={i.varianteId}
                nombre={i.nombre}
                precio={i.precio}
                imagen={i.imagen}
                cantidad={i.cantidad}
              />
            ))
          )}
        </div>
        {items.length > 0 && (
          <footer className="p-5 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Total</span>
              <span className="font-serif text-2xl text-gold-primary">{formatUSD(total)}</span>
            </div>
            <Button type="button" size="lg" className="w-full" onClick={handleWhatsApp} disabled={!whatsappNumber}>
              Pedir por WhatsApp
            </Button>
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
