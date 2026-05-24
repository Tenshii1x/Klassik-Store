"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/ui/number-input"
import { addVariante, removeVariante, updateVariante } from "@/app/admin/productos/actions"
import { toast } from "sonner"
import { Plus, Trash2, ImageIcon, Pencil, Check, X } from "lucide-react"
import Image from "next/image"
import { VariantImagenPicker } from "./VariantImagenPicker"

interface Variante {
  id: string
  tipo: string
  valor: string
  precio_extra: number
  stock_unidades: number | null
  imagen_url: string | null
  orden: number
}

interface ImagenGaleria {
  id: string
  url: string
  tipo: string
}

interface Props {
  productoId: string
  initial: Variante[]
  imagenes: ImagenGaleria[]
}

export function ProductoVariantes({ productoId, initial, imagenes }: Props) {
  const [isPending, startTransition] = useTransition()
  const [draft, setDraft] = useState<{
    tipo: string
    valor: string
    precio_extra: number | null
    stock_unidades: number | null
  }>({
    tipo: "Color",
    valor: "",
    precio_extra: null,
    stock_unidades: null,
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<{
    tipo: string
    valor: string
    precio_extra: number
    stock_unidades: number | null
    imagen_url: string | null
  }>({ tipo: "", valor: "", precio_extra: 0, stock_unidades: null, imagen_url: null })
  const [newDraftImagenUrl, setNewDraftImagenUrl] = useState<string | null>(null)

  function handleAdd() {
    if (!draft.tipo || !draft.valor) {
      toast.error("Tipo y valor son requeridos")
      return
    }
    startTransition(async () => {
      const result = await addVariante(productoId, {
        tipo: draft.tipo,
        valor: draft.valor,
        precio_extra: draft.precio_extra ?? 0,
        stock_unidades: draft.stock_unidades,
        imagen_url: newDraftImagenUrl,
        orden: initial.length,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Variante agregada")
      setDraft({ tipo: "Color", valor: "", precio_extra: null, stock_unidades: null })
      setNewDraftImagenUrl(null)
    })
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      const result = await removeVariante(id, productoId)
      if (result.error) toast.error(result.error)
    })
  }

  function startEdit(v: Variante) {
    setEditingId(v.id)
    setEditDraft({
      tipo: v.tipo,
      valor: v.valor,
      precio_extra: v.precio_extra,
      stock_unidades: v.stock_unidades,
      imagen_url: v.imagen_url,
    })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  function handleSave(v: Variante) {
    if (!editDraft.tipo || !editDraft.valor) {
      toast.error("Tipo y valor son requeridos")
      return
    }
    startTransition(async () => {
      const result = await updateVariante(v.id, productoId, {
        tipo: editDraft.tipo,
        valor: editDraft.valor,
        precio_extra: editDraft.precio_extra,
        stock_unidades: editDraft.stock_unidades,
        imagen_url: editDraft.imagen_url,
        orden: v.orden,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Variante actualizada")
      setEditingId(null)
    })
  }

  return (
    <div className="space-y-2">
      <label className="eyebrow block">Variantes</label>
      {initial.length === 0 && (
        <p className="text-muted text-xs">Sin variantes. El producto se vende sin opciones.</p>
      )}
      {initial.map((v) => (
        <div key={v.id} className="grid grid-cols-12 gap-2 items-center p-2 bg-black rounded-md border border-border">
          {editingId === v.id ? (
            <>
              <div className="col-span-1">
                <VariantImagenPicker
                  imagenes={imagenes}
                  productoId={productoId}
                  uploadTarget={v.id}
                  currentUrl={editDraft.imagen_url}
                  onSelect={(url) => setEditDraft((prev) => ({ ...prev, imagen_url: url }))}
                />
              </div>
              <div className="col-span-2">
                <select
                  value={editDraft.tipo}
                  onChange={(e) => setEditDraft({ ...editDraft, tipo: e.target.value })}
                  className="w-full bg-black border border-border rounded-md px-2 py-2 text-white text-sm"
                >
                  <option value="Color">Color</option>
                  <option value="Talla">Talla</option>
                  <option value="Modelo">Modelo</option>
                  <option value="Material">Material</option>
                </select>
              </div>
              <div className="col-span-3">
                <Input
                  value={editDraft.valor}
                  onChange={(e) => setEditDraft({ ...editDraft, valor: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <NumberInput
                  min={0}
                  value={editDraft.precio_extra}
                  onChange={(v) => setEditDraft({ ...editDraft, precio_extra: v ?? 0 })}
                />
              </div>
              <div className="col-span-2">
                <NumberInput
                  integer
                  min={0}
                  value={editDraft.stock_unidades}
                  onChange={(v) => setEditDraft({ ...editDraft, stock_unidades: v })}
                  placeholder="—"
                />
              </div>
              <div className="col-span-2 flex gap-1 justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => handleSave(v)} disabled={isPending}>
                  <Check size={14} className="text-success" />
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={cancelEdit} disabled={isPending}>
                  <X size={14} />
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="col-span-1">
                <VariantThumbReadonly url={v.imagen_url} />
              </div>
              <div className="col-span-2 text-sm">
                <span className="text-muted text-xs">Tipo:</span> {v.tipo}
              </div>
              <div className="col-span-3 text-sm">
                <span className="text-muted text-xs">Valor:</span> {v.valor}
              </div>
              <div className="col-span-2 text-sm text-gold-primary">+${v.precio_extra.toFixed(2)}</div>
              <div className="col-span-2 text-sm">
                {v.stock_unidades !== null ? `${v.stock_unidades} unid.` : "—"}
              </div>
              <div className="col-span-2 flex gap-1 justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(v)} disabled={isPending || !!editingId}>
                  <Pencil size={14} />
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => handleRemove(v.id)} disabled={isPending || !!editingId}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </>
          )}
        </div>
      ))}
      <div className="grid grid-cols-12 gap-2 items-end pt-2 border-t border-border">
        <div className="col-span-1">
          <label className="text-xs text-muted block mb-1">Foto</label>
          <VariantImagenPicker
            imagenes={imagenes}
            productoId={productoId}
            uploadTarget="new"
            currentUrl={newDraftImagenUrl}
            onSelect={setNewDraftImagenUrl}
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-muted">Tipo</label>
          <select
            value={draft.tipo}
            onChange={(e) => setDraft({ ...draft, tipo: e.target.value })}
            className="w-full bg-black border border-border rounded-md px-2 py-2 text-white text-sm"
          >
            <option value="Color">Color</option>
            <option value="Talla">Talla</option>
            <option value="Modelo">Modelo</option>
            <option value="Material">Material</option>
          </select>
        </div>
        <div className="col-span-4">
          <label className="text-xs text-muted">Valor</label>
          <Input
            value={draft.valor}
            onChange={(e) => setDraft({ ...draft, valor: e.target.value })}
            placeholder="Burdeos / M / Acero"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-muted">Precio extra</label>
          <NumberInput
            min={0}
            value={draft.precio_extra}
            onChange={(v) => setDraft({ ...draft, precio_extra: v })}
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-muted">Stock</label>
          <NumberInput
            integer
            min={0}
            value={draft.stock_unidades}
            onChange={(v) => setDraft({ ...draft, stock_unidades: v })}
            placeholder="—"
          />
        </div>
        <div className="col-span-1">
          <Button type="button" size="sm" onClick={handleAdd} disabled={isPending}>
            <Plus size={14} />
          </Button>
        </div>
      </div>
    </div>
  )
}

function VariantThumbReadonly({ url }: { url: string | null }) {
  if (url) {
    return (
      <div className="relative w-12 h-12 rounded overflow-hidden border border-border">
        <Image src={url} alt="" fill className="object-cover" sizes="48px" />
      </div>
    )
  }
  return (
    <div className="w-12 h-12 rounded border border-border bg-gold-deep/10 flex items-center justify-center text-gold-deep">
      <ImageIcon size={16} />
    </div>
  )
}
