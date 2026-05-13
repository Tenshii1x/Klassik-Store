"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/admin/ConfirmDialog"
import { deleteSeccion } from "@/app/admin/secciones/actions"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"

export function DeleteSeccionButton({ id, nombre }: { id: string; nombre: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteSeccion(id)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success("Sección borrada")
      router.push("/admin/secciones")
    })
  }

  return (
    <ConfirmDialog
      trigger={
        <Button type="button" variant="danger" size="sm" disabled={isPending}>
          <Trash2 size={14} />
          Borrar sección
        </Button>
      }
      title="¿Borrar sección?"
      description={`Esta acción no se puede deshacer. Se borrará "${nombre}" y todas sus subsecciones.`}
      confirmLabel="Borrar"
      onConfirm={handleDelete}
    />
  )
}
