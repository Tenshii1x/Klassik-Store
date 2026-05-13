"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/ui/number-input"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { ImageUploader } from "@/components/admin/ImageUploader"
import { createCombo, updateCombo, deleteCombo } from "@/app/admin/combos/actions"
import { ConfirmDialog } from "@/components/admin/ConfirmDialog"
import type { ComboInput } from "@/lib/validations/combo"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { formatUSD } from "@/lib/utils"

interface Producto {
  id: string
  nombre: string
  precio_venta: number
}

interface Props {
  initial?: ComboInput & { id: string }
  productosDisponibles: Producto[]
}

export function ComboForm({ initial, productosDisponibles }: Props) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState<ComboInput>({
    nombre: initial?.nombre || "",
    descripcion: initial?.descripcion || null,
    precio_combo: initial?.precio_combo ?? 0,
    imagen_url: initial?.imagen_url || null,
    activo: initial?.activo ?? true,
    productos: initial?.productos || [],
  })

  function set<K extends keyof ComboInput>(k: K, v: ComboInput[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function addProducto(productoId: string) {
    if (form.productos.find((p) => p.producto_id === productoId)) return
    set("productos", [...form.productos, { producto_id: productoId, cantidad: 1 }])
  }

  function removeProducto(productoId: string) {
    set("productos", form.productos.filter((p) => p.producto_id !== productoId))
  }

  function updateCantidad(productoId: string, cantidad: number) {
    set(
      "productos",
      form.productos.map((p) => (p.producto_id === productoId ? { ...p, cantidad } : p))
    )
  }

  const totalSinDescuento = form.productos.reduce((acc, p) => {
    const prod = productosDisponibles.find((d) => d.id === p.producto_id)
    return acc + (prod?.precio_venta || 0) * p.cantidad
  }, 0)
  const ahorro = totalSinDescuento - form.precio_combo

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = initial?.id ? await updateCombo(initial.id, form) : await createCombo(form)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success(initial?.id ? "Combo actualizado" : "Combo creado")
    })
  }

  function handleDelete() {
    if (!initial?.id) return
    startTransition(async () => {
      await deleteCombo(initial.id)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="font-serif text-lg text-white">Información</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <label className="eyebrow block mb-1.5">Nombre del combo</label>
            <Input
              value={form.nombre}
              onChange={(e) => set("nombre", e.target.value)}
              placeholder="Set Para Pareja: Royal Blue + Pink Diamond"
              required
            />
          </div>
          <div>
            <label className="eyebrow block mb-1.5">Descripción</label>
            <textarea
              value={form.descripcion ?? ""}
              onChange={(e) => set("descripcion", e.target.value || null)}
              rows={2}
              className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm"
              placeholder="Para él y para ella. La pareja perfecta para tu próxima ocasión."
            />
          </div>
          <ImageUploader
            bucket="productos"
            pathPrefix="combos"
            value={form.imagen_url ?? null}
            onChange={(url) => set("imagen_url", url)}
            label="Imagen del combo"
          />
          <label className="flex items-center gap-2 text-sm text-white">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => set("activo", e.target.checked)}
              className="accent-gold-primary"
            />
            Activo en catálogo
          </label>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-serif text-lg text-white">Productos incluidos</h3>
        </CardHeader>
        <CardBody className="space-y-3">
          {form.productos.length === 0 && <p className="text-muted text-sm">Agrega al menos 2 productos.</p>}
          {form.productos.map((p) => {
            const prod = productosDisponibles.find((d) => d.id === p.producto_id)
            return (
              <div key={p.producto_id} className="flex items-center gap-2 p-2 bg-black rounded-md border border-border">
                <span className="flex-1 text-white text-sm">{prod?.nombre ?? "(producto no encontrado)"}</span>
                <span className="text-muted text-xs">{formatUSD(prod?.precio_venta ?? 0)}</span>
                <NumberInput
                  integer
                  min={1}
                  value={p.cantidad}
                  onChange={(v) => updateCantidad(p.producto_id, v ?? 1)}
                  className="w-20"
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => removeProducto(p.producto_id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            )
          })}
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) addProducto(e.target.value)
              e.target.value = ""
            }}
            className="w-full bg-black border border-border rounded-md px-3 py-2.5 text-white text-sm"
          >
            <option value="">+ Agregar producto al combo</option>
            {productosDisponibles
              .filter((p) => !form.productos.find((fp) => fp.producto_id === p.id))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} — {formatUSD(p.precio_venta)}
                </option>
              ))}
          </select>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-serif text-lg text-white">Precio</h3>
        </CardHeader>
        <CardBody className="space-y-3">
          <div>
            <label className="eyebrow block mb-1.5">Precio del combo</label>
            <NumberInput
              min={0}
              value={form.precio_combo}
              onChange={(v) => set("precio_combo", v ?? 0)}
              required
            />
          </div>
          <div className="bg-black rounded-md p-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted text-xs">Suma individual</div>
              <div className="font-serif text-lg text-white">{formatUSD(totalSinDescuento)}</div>
            </div>
            <div>
              <div className="text-muted text-xs">Ahorro para el cliente</div>
              <div className={`font-serif text-lg ${ahorro > 0 ? "text-success" : "text-danger"}`}>
                {formatUSD(ahorro)}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="flex justify-between items-center sticky bottom-0 bg-black-surface border border-border rounded-lg p-4">
        {initial?.id ? (
          <ConfirmDialog
            trigger={
              <Button type="button" variant="danger" size="sm">
                <Trash2 size={14} /> Borrar combo
              </Button>
            }
            title="¿Borrar combo?"
            description={`"${initial.nombre}" será borrado.`}
            onConfirm={handleDelete}
          />
        ) : (
          <div />
        )}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : initial?.id ? "Guardar combo" : "Crear combo"}
        </Button>
      </div>
    </form>
  )
}
