"use client"

import { Button } from "@/components/ui/button"
import { marcarComoPedidoAlSupplier } from "./actions"
import { useTransition } from "react"
import { toast } from "sonner"
import { Check } from "lucide-react"

export function ConfirmButton({
  productoIds,
  grupos,
}: {
  productoIds: string[]
  grupos: number
}) {
  const [isPending, startTransition] = useTransition()
  function handle() {
    if (
      !confirm(
        `¿Marcar los ${grupos} producto(s) como pedidos al supplier? Esto avanza el estado de todos los pedidos relacionados.`
      )
    )
      return
    startTransition(async () => {
      const result = await marcarComoPedidoAlSupplier(productoIds)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`${result.count} pedido(s) actualizado(s)`)
    })
  }
  return (
    <Button
      type="button"
      onClick={handle}
      disabled={isPending || productoIds.length === 0}
    >
      <Check size={14} />{" "}
      {isPending ? "Procesando..." : "Marcar todos como pedidos al supplier"}
    </Button>
  )
}
