"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatUSD } from "@/lib/utils"
import { useCart } from "@/components/cart/CartProvider"
import { Markdown } from "@/lib/markdown"
import { Plus, Minus } from "lucide-react"
import { toast } from "sonner"
import { WishlistButton } from "@/components/wishlist/WishlistButton"

interface Variante {
  id: string
  tipo: string
  valor: string
  precio_extra: number
  stock_unidades: number | null
  imagen_url: string | null
}

interface Producto {
  id: string
  nombre: string
  descripcion: string | null
  modelo: string | null
  modo: string
  stock_unidades: number | null
  precio_venta: number
  precio_anterior: number | null
  fecha_llegada_inicio: string | null
  fecha_llegada_fin: string | null
  producto_variantes: Variante[]
  producto_imagenes: { url: string }[]
}

function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function formatRange(inicio: string | null, fin: string | null) {
  if (!inicio || !fin) return null
  const a = parseLocalDate(inicio).toLocaleDateString("es-PA", { day: "numeric", month: "long" })
  const b = parseLocalDate(fin).toLocaleDateString("es-PA", { day: "numeric", month: "long" })
  return `${a} y ${b}`
}

export function ProductoInfo({
  p,
  onVariantChange,
}: {
  p: Producto
  onVariantChange?: (variante: Variante | null) => void
}) {
  const variantsByTipo = p.producto_variantes.reduce<Record<string, Variante[]>>((acc, v) => {
    if (!acc[v.tipo]) acc[v.tipo] = []
    acc[v.tipo].push(v)
    return acc
  }, {})

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    p.producto_variantes[0]?.id ?? null
  )
  const [cantidad, setCantidad] = useState(1)
  const { add, setOpen } = useCart()

  const selectedVariant = p.producto_variantes.find((v) => v.id === selectedVariantId)
  const precioFinal = p.precio_venta + (selectedVariant?.precio_extra ?? 0)
  const isStock = p.modo === "stock"
  const stockEfectivo =
    selectedVariant && selectedVariant.stock_unidades !== null
      ? selectedVariant.stock_unidades
      : isStock
      ? p.stock_unidades ?? 0
      : 0
  const sinStock = isStock && stockEfectivo === 0
  const excedeStock = isStock && cantidad > stockEfectivo
  const fechaRango = formatRange(p.fecha_llegada_inicio, p.fecha_llegada_fin)

  function handleAdd() {
    const nombreBase = selectedVariant ? `${p.nombre} (${selectedVariant.valor})` : p.nombre
    const imagen = p.producto_imagenes[0]?.url ?? null
    const baseItem = {
      productoId: p.id,
      varianteId: selectedVariant?.id ?? null,
      precio: precioFinal,
      imagen,
    }

    if (!isStock || sinStock) {
      // Modo preorden puro (producto preorden, o stock con 0 unidades)
      add({ ...baseItem, nombre: nombreBase, cantidad, modo: "preorden" })
      toast.success(sinStock ? "Agregado como pre-orden" : "Agregado al carrito")
      setOpen(true)
      return
    }

    if (excedeStock) {
      // Split: lo que hay como stock + el resto como pre-orden
      const stockQty = stockEfectivo
      const preordenQty = cantidad - stockEfectivo
      if (stockQty > 0) {
        add({ ...baseItem, nombre: nombreBase, cantidad: stockQty, modo: "stock" })
      }
      add({ ...baseItem, nombre: nombreBase, cantidad: preordenQty, modo: "preorden" })
      toast.success(`${stockQty} en stock + ${preordenQty} como pre-orden`)
      setOpen(true)
      return
    }

    add({ ...baseItem, nombre: nombreBase, cantidad, modo: "stock" })
    toast.success("Agregado al carrito")
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          {sinStock ? (
            <Badge tone="info">Pre-orden · llega en ~15 días</Badge>
          ) : isStock ? (
            <Badge tone="gold">
              Entrega inmediata · {stockEfectivo} {stockEfectivo === 1 ? "disponible" : "disponibles"}
            </Badge>
          ) : (
            <Badge tone="info">Pre-orden{fechaRango ? ` · llega entre ${fechaRango}` : ""}</Badge>
          )}
        </div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-serif text-4xl md:text-5xl text-white">{p.nombre}</h1>
          <WishlistButton productoId={p.id} className="!w-11 !h-11 flex-shrink-0" />
        </div>
        {p.modelo && <p className="text-muted text-xs tracking-wider mt-2">Modelo {p.modelo}</p>}
      </div>

      <div className="flex items-baseline gap-3">
        {p.precio_anterior && (
          <span className="text-muted line-through text-lg">{formatUSD(p.precio_anterior)}</span>
        )}
        <span className="font-serif text-4xl text-gold-primary">{formatUSD(precioFinal)}</span>
      </div>

      {Object.entries(variantsByTipo).length > 0 && (
        <div className="space-y-3">
          {Object.entries(variantsByTipo).map(([tipo, variantes]) => (
            <div key={tipo}>
              <label className="eyebrow block mb-2">{tipo}</label>
              <div className="flex flex-wrap gap-2">
                {variantes.map((v) => {
                  const isSel = v.id === selectedVariantId
                  const variantAgotado = v.stock_unidades !== null && v.stock_unidades === 0
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        setSelectedVariantId(v.id)
                        onVariantChange?.(v)
                      }}
                      disabled={variantAgotado}
                      className={`px-4 py-2 rounded-md border text-sm transition-colors ${
                        isSel
                          ? "border-gold-primary bg-gold-primary/10 text-gold-primary"
                          : "border-border text-white hover:border-gold-primary/60"
                      } ${variantAgotado ? "opacity-40 line-through cursor-not-allowed" : ""}`}
                    >
                      {v.valor}
                      {v.precio_extra > 0 && <span className="text-muted text-xs ml-1">+{formatUSD(v.precio_extra)}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-border rounded-md">
            <button type="button" onClick={() => setCantidad(Math.max(1, cantidad - 1))} className="px-3 py-2 text-white hover:text-gold-primary">
              <Minus size={14} />
            </button>
            <span className="px-4 font-semibold">{cantidad}</span>
            <button type="button" onClick={() => setCantidad(cantidad + 1)} className="px-3 py-2 text-white hover:text-gold-primary">
              <Plus size={14} />
            </button>
          </div>
          <Button type="button" size="lg" className="flex-1" onClick={handleAdd}>
            {sinStock
              ? "Pedir como pre-orden"
              : excedeStock
              ? `Agregar (${stockEfectivo} stock + ${cantidad - stockEfectivo} pre-orden)`
              : "Agregar al carrito"}
          </Button>
        </div>
        {(sinStock || excedeStock) && (
          <div className="bg-info/5 border border-info/30 rounded-md p-3 text-xs text-white/85 leading-relaxed">
            <p className="font-semibold text-info mb-1">
              {sinStock ? "Sin stock por ahora — disponible bajo pre-orden" : "Más unidades que las disponibles"}
            </p>
            <p>
              {sinStock
                ? "Lo pedimos especialmente para ti. Pagas 50% ahora y 50% al recibir. Llega en aproximadamente 15 días (puede variar)."
                : `Hay ${stockEfectivo} ${stockEfectivo === 1 ? "unidad disponible" : "unidades disponibles"} para entrega inmediata. Las otras ${cantidad - stockEfectivo} se piden como pre-orden — 50% ahora, 50% al recibir, ~15 días.`}
            </p>
          </div>
        )}
      </div>

      {p.descripcion && (
        <div className="pt-6 border-t border-border">
          <Markdown content={p.descripcion} className="prose prose-invert prose-sm text-white/80 max-w-none" />
        </div>
      )}
    </div>
  )
}
