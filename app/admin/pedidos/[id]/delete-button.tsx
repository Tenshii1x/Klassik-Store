"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/admin/ConfirmDialog"
import { eliminarPedido } from "../actions"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"

export function DeletePedidoButton({
  id,
  codigo,
}: {
  id: string
  codigo: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  function handle() {
    startTransition(async () => {
      const result = await eliminarPedido(id)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success("Pedido borrado")
      router.push("/admin/pedidos")
    })
  }
  return (
    <ConfirmDialog
      trigger={
        <Button type="button" variant="danger" size="sm" disabled={isPending}>
          <Trash2 size={14} /> Borrar pedido
        </Button>
      }
      title="¿Borrar pedido?"
      description={`Esta acción no se puede deshacer. Se borrará el pedido ${codigo} con todos sus items.`}
      onConfirm={handle}
    />
  )
}
