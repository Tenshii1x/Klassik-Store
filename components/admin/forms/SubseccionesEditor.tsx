"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { toSlug } from "@/lib/helpers/slug"
import { createSubseccion, deleteSubseccion } from "@/app/admin/secciones/actions"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"

interface Subseccion {
  id: string
  nombre: string
  slug: string
  orden: number
}

interface Props {
  seccionId: string
  initial: Subseccion[]
}

export function SubseccionesEditor({ seccionId, initial }: Props) {
  const [isPending, startTransition] = useTransition()
  const [nombre, setNombre] = useState("")

  function handleAdd() {
    if (!nombre.trim()) return
    startTransition(async () => {
      const result = await createSubseccion({
        seccion_id: seccionId,
        nombre,
        slug: toSlug(nombre),
        orden: initial.length,
      })
      if (result?.error) {
        toast.error(result.error)
        return
      }
      setNombre("")
      toast.success("Subsección creada")
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteSubseccion(id, seccionId)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success("Subsección borrada")
    })
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="font-serif text-lg text-white">Subsecciones</h3>
        <p className="text-muted text-xs mt-1">Opcional. Para dividir esta sección en grupos más finos.</p>
      </CardHeader>
      <CardBody className="space-y-3">
        {initial.length === 0 && (
          <p className="text-muted text-sm">Sin subsecciones todavía.</p>
        )}
        {initial.map((sub) => (
          <div key={sub.id} className="flex items-center gap-2 p-2 bg-black rounded-md border border-border">
            <span className="flex-1 text-white text-sm">{sub.nombre}</span>
            <span className="text-muted text-xs">/{sub.slug}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(sub.id)} disabled={isPending}>
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
        <div className="flex gap-2 pt-2 border-t border-border">
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre de la subsección (ej. Para Él)"
          />
          <Button type="button" size="sm" onClick={handleAdd} disabled={isPending || !nombre.trim()}>
            <Plus size={14} />
            Agregar
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}
