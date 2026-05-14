"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { actualizarNotas } from "../actions"
import { toast } from "sonner"

export function NotasEditor({
  id,
  initial,
}: {
  id: string
  initial: string | null
}) {
  const [notas, setNotas] = useState(initial ?? "")
  const [isPending, startTransition] = useTransition()
  function save() {
    startTransition(async () => {
      const result = await actualizarNotas(id, notas)
      if (result.error) toast.error(result.error)
      else toast.success("Notas guardadas")
    })
  }
  return (
    <div className="space-y-2">
      <textarea
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        rows={6}
        className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm"
        placeholder="Notas internas (solo admin)"
      />
      <Button type="button" size="sm" onClick={save} disabled={isPending}>
        {isPending ? "Guardando..." : "Guardar notas"}
      </Button>
    </div>
  )
}
