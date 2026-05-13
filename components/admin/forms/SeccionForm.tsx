"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardBody } from "@/components/ui/card"
import { ImageUploader } from "@/components/admin/ImageUploader"
import { toSlug } from "@/lib/helpers/slug"
import { createSeccion, updateSeccion } from "@/app/admin/secciones/actions"
import type { SeccionInput } from "@/lib/validations/seccion"
import { toast } from "sonner"

interface Props {
  initial?: Partial<SeccionInput> & { id?: string }
}

export function SeccionForm({ initial }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState<SeccionInput>({
    nombre: initial?.nombre || "",
    slug: initial?.slug || "",
    imagen_portada: initial?.imagen_portada || null,
    descripcion_corta: initial?.descripcion_corta || null,
    orden: initial?.orden ?? 0,
    tono: (initial?.tono as SeccionInput["tono"]) || "dark-gold",
    activa: initial?.activa ?? true,
  })

  function set<K extends keyof SeccionInput>(key: K, value: SeccionInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleNombreBlur() {
    if (!form.slug && form.nombre) {
      set("slug", toSlug(form.nombre))
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const action = initial?.id
        ? updateSeccion(initial.id, form)
        : createSeccion(form)
      const result = await action
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success(initial?.id ? "Sección actualizada" : "Sección creada")
      if (!initial?.id) router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardBody className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="eyebrow block mb-1.5">Nombre</label>
              <Input
                value={form.nombre}
                onChange={(e) => set("nombre", e.target.value)}
                onBlur={handleNombreBlur}
                required
              />
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Slug (URL)</label>
              <Input
                value={form.slug}
                onChange={(e) => set("slug", toSlug(e.target.value))}
                required
              />
            </div>
          </div>

          <div>
            <label className="eyebrow block mb-1.5">Descripción corta</label>
            <Input
              value={form.descripcion_corta ?? ""}
              onChange={(e) => set("descripcion_corta", e.target.value || null)}
              placeholder="Ej. Para él y para ella. Piezas que cuentan más que el tiempo."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="eyebrow block mb-1.5">Tono visual</label>
              <select
                value={form.tono}
                onChange={(e) => set("tono", e.target.value as SeccionInput["tono"])}
                className="w-full bg-black border border-border rounded-md px-3.5 py-2.5 text-white text-sm"
              >
                <option value="dark-gold">Dark Gold (default)</option>
                <option value="rose-gold">Rose Gold (femenino)</option>
                <option value="blue-cool">Blue Cool (tech)</option>
              </select>
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Orden</label>
              <Input
                type="number"
                min={0}
                value={form.orden}
                onChange={(e) => set("orden", parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <ImageUploader
            bucket="productos"
            pathPrefix="secciones"
            value={form.imagen_portada ?? null}
            onChange={(url) => set("imagen_portada", url)}
            label="Imagen de portada"
          />

          <label className="flex items-center gap-2 text-sm text-white">
            <input
              type="checkbox"
              checked={form.activa}
              onChange={(e) => set("activa", e.target.checked)}
              className="accent-gold-primary"
            />
            Sección activa (visible en el catálogo)
          </label>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => router.push("/admin/secciones")} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : initial?.id ? "Guardar cambios" : "Crear sección"}
            </Button>
          </div>
        </CardBody>
      </Card>
    </form>
  )
}
