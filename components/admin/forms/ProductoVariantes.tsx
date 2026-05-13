"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/ui/number-input"
import { addVariante, removeVariante } from "@/app/admin/productos/actions"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"

interface Variante {
  id: string
  tipo: string
  valor: string
  precio_extra: number
  stock_unidades: number | null
  orden: number
}

interface Props {
  productoId: string
  initial: Variante[]
}

export function ProductoVariantes({ productoId, initial }: Props) {
  const [isPending, startTransition] = useTransition()
  const [draft, setDraft] = useState<{
    tipo: string
    valor: string
    precio_extra: number
    stock_unidades: number | null
  }>({
    tipo: "Color",
    valor: "",
    precio_extra: 0,
    stock_unidades: null,
  })

  function handleAdd() {
    if (!draft.tipo || !draft.valor) {
      toast.error("Tipo y valor son requeridos")
      return
    }
    startTransition(async () => {
      const result = await addVariante(productoId, {
        tipo: draft.tipo,
        valor: draft.valor,
        precio_extra: draft.precio_extra || 0,
        stock_unidades: draft.stock_unidades,
        orden: initial.length,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Variante agregada")
      setDraft({ tipo: "Color", valor: "", precio_extra: 0, stock_unidades: null })
    })
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      const result = await removeVariante(id, productoId)
      if (result.error) toast.error(result.error)
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
          <div className="col-span-3 text-sm">
            <span className="text-muted text-xs">Tipo:</span> {v.tipo}
          </div>
          <div className="col-span-4 text-sm">
            <span className="text-muted text-xs">Valor:</span> {v.valor}
          </div>
          <div className="col-span-2 text-sm text-gold-primary">+${v.precio_extra.toFixed(2)}</div>
          <div className="col-span-2 text-sm">
            {v.stock_unidades !== null ? `${v.stock_unidades} unid.` : "—"}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => handleRemove(v.id)} disabled={isPending}>
            <Trash2 size={14} />
          </Button>
        </div>
      ))}
      <div className="grid grid-cols-12 gap-2 items-end pt-2 border-t border-border">
        <div className="col-span-3">
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
            onChange={(v) => setDraft({ ...draft, precio_extra: v ?? 0 })}
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
        <Button type="button" size="sm" onClick={handleAdd} disabled={isPending}>
          <Plus size={14} />
        </Button>
      </div>
    </div>
  )
}
