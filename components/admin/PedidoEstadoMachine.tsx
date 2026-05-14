"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { avanzarEstado } from "@/app/admin/pedidos/actions"
import { toast } from "sonner"

const TRANSITIONS: Record<
  string,
  { label: string; next: string; tone?: "primary" | "danger" }[]
> = {
  nuevo: [
    { label: "Marcar depósito recibido", next: "deposito_recibido" },
    { label: "Cancelar", next: "cancelado", tone: "danger" },
  ],
  deposito_recibido: [
    { label: "Listo para pedir al supplier", next: "pendiente_pedir_supplier" },
    { label: "Marcar entregado (era stock)", next: "entregado" },
    { label: "Cancelar", next: "cancelado", tone: "danger" },
  ],
  pendiente_pedir_supplier: [
    { label: "Pedido al supplier ✓", next: "pedido_a_supplier" },
    { label: "Cancelar", next: "cancelado", tone: "danger" },
  ],
  pedido_a_supplier: [{ label: "Llegó al país", next: "llegado_pais" }],
  llegado_pais: [{ label: "Listo para entregar", next: "listo_entrega" }],
  listo_entrega: [{ label: "Entregado ✓", next: "entregado" }],
  entregado: [],
  cancelado: [],
}

export function PedidoEstadoMachine({
  id,
  estadoActual,
}: {
  id: string
  estadoActual: string
}) {
  const [isPending, startTransition] = useTransition()
  const transitions = TRANSITIONS[estadoActual] ?? []

  function handle(next: string, label: string) {
    if (!confirm(`¿Avanzar a "${label}"?`)) return
    startTransition(async () => {
      const result = await avanzarEstado(id, next as never)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`Estado actualizado`)
    })
  }

  if (transitions.length === 0) {
    return <p className="text-muted text-sm">El pedido está en estado final.</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {transitions.map((t) => (
        <Button
          key={t.next}
          type="button"
          variant={t.tone === "danger" ? "danger" : "primary"}
          size="md"
          onClick={() => handle(t.next, t.label)}
          disabled={isPending}
        >
          {t.label}
        </Button>
      ))}
    </div>
  )
}
