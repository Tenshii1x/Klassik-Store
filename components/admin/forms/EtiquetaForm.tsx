"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardBody } from "@/components/ui/card"
import { toSlug } from "@/lib/helpers/slug"
import { createEtiqueta, updateEtiqueta, deleteEtiqueta } from "@/app/admin/etiquetas/actions"
import type { EtiquetaInput } from "@/lib/validations/etiqueta"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/admin/ConfirmDialog"
import { Trash2 } from "lucide-react"

interface Props {
  initial?: EtiquetaInput & { id: string }
  onDone?: () => void
}

export function EtiquetaForm({ initial, onDone }: Props) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState<EtiquetaInput>({
    nombre: initial?.nombre || "",
    slug: initial?.slug || "",
    color: initial?.color || "#c9a86a",
  })

  function set<K extends keyof EtiquetaInput>(k: K, v: EtiquetaInput[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = initial ? await updateEtiqueta(initial.id, form) : await createEtiqueta(form)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(initial ? "Etiqueta actualizada" : "Etiqueta creada")
      if (!initial) setForm({ nombre: "", slug: "", color: "#c9a86a" })
      onDone?.()
    })
  }

  function handleDelete() {
    if (!initial) return
    startTransition(async () => {
      const result = await deleteEtiqueta(initial.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Etiqueta borrada")
      onDone?.()
    })
  }

  return (
    <Card>
      <CardBody>
        <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-4">
            <label className="eyebrow block mb-1.5">Nombre</label>
            <Input
              value={form.nombre}
              onChange={(e) => {
                set("nombre", e.target.value)
                if (!initial) set("slug", toSlug(e.target.value))
              }}
              placeholder="Ej. Regalo Perfecto"
              required
            />
          </div>
          <div className="col-span-4">
            <label className="eyebrow block mb-1.5">Slug</label>
            <Input value={form.slug} onChange={(e) => set("slug", toSlug(e.target.value))} required />
          </div>
          <div className="col-span-2">
            <label className="eyebrow block mb-1.5">Color</label>
            <input
              type="color"
              value={form.color}
              onChange={(e) => set("color", e.target.value)}
              className="w-full h-10 rounded-md border border-border bg-black cursor-pointer"
            />
          </div>
          <div className="col-span-2 flex gap-1">
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "..." : initial ? "Guardar" : "Crear"}
            </Button>
            {initial && (
              <ConfirmDialog
                trigger={
                  <Button type="button" variant="danger" size="sm">
                    <Trash2 size={14} />
                  </Button>
                }
                title="¿Borrar etiqueta?"
                description={`"${initial.nombre}" desaparecerá de todos los productos que la usaban.`}
                onConfirm={handleDelete}
              />
            )}
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
