"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { bulkPublish, bulkArchive, bulkDelete, bulkApplyMargen } from "@/app/admin/productos/actions"
import { ConfirmDialog } from "@/components/admin/ConfirmDialog"
import { toast } from "sonner"
import { Check, Archive, Trash2, Percent } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface Props {
  selected: string[]
  onClear: () => void
}

export function BulkActionsBar({ selected, onClear }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [margen, setMargen] = useState<string>("")

  if (selected.length === 0) return null

  function handle(fn: () => Promise<{ success?: boolean; count?: number; error?: string }>, label: string) {
    startTransition(async () => {
      const r = await fn()
      if (r.error) {
        toast.error(r.error)
        return
      }
      toast.success(`${label}: ${r.count} producto(s)`)
      onClear()
      router.refresh()
    })
  }

  return (
    <div className="sticky top-0 z-10 bg-black-surface border border-gold-primary/40 rounded-lg p-3 flex items-center gap-3 flex-wrap mb-4">
      <span className="text-gold-primary font-semibold text-sm">
        {selected.length} seleccionado(s)
      </span>
      <div className="flex-1" />
      <Button size="sm" variant="ghost" onClick={() => handle(() => bulkPublish(selected), "Publicados")} disabled={isPending}>
        <Check size={14} />
        Publicar
      </Button>
      <Button size="sm" variant="ghost" onClick={() => handle(() => bulkArchive(selected), "Archivados")} disabled={isPending}>
        <Archive size={14} />
        Archivar
      </Button>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          min={0}
          max={500}
          value={margen}
          onChange={(e) => setMargen(e.target.value)}
          placeholder="%"
          className="w-20"
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            const n = parseInt(margen)
            if (isNaN(n) || n < 0) {
              toast.error("Margen inválido")
              return
            }
            handle(() => bulkApplyMargen(selected, n), "Margen aplicado")
          }}
          disabled={isPending || !margen}
        >
          <Percent size={14} />
          Aplicar margen
        </Button>
      </div>
      <ConfirmDialog
        trigger={
          <Button size="sm" variant="danger">
            <Trash2 size={14} />
            Borrar
          </Button>
        }
        title={`¿Borrar ${selected.length} producto(s)?`}
        description="Esta acción no se puede deshacer. Las imágenes en Storage NO se borran automáticamente."
        onConfirm={async () => handle(() => bulkDelete(selected), "Borrados")}
      />
      <Button size="sm" variant="ghost" onClick={onClear} disabled={isPending}>
        Cancelar selección
      </Button>
    </div>
  )
}
