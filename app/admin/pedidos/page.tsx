import { Topbar } from "@/components/admin/topbar"
import { Card, CardBody } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import Link from "next/link"
import { formatUSD } from "@/lib/utils"

const ESTADO_TONE: Record<
  string,
  "neutral" | "success" | "info" | "warning" | "danger" | "gold"
> = {
  nuevo: "warning",
  deposito_recibido: "info",
  pendiente_pedir_supplier: "warning",
  pedido_a_supplier: "info",
  llegado_pais: "info",
  listo_entrega: "gold",
  entregado: "success",
  cancelado: "danger",
}

const ESTADO_LABEL: Record<string, string> = {
  nuevo: "Nuevo",
  deposito_recibido: "Depósito recibido",
  pendiente_pedir_supplier: "Pendiente pedir",
  pedido_a_supplier: "Pedido a supplier",
  llegado_pais: "Llegó al país",
  listo_entrega: "Listo entrega",
  entregado: "Entregado",
  cancelado: "Cancelado",
}

export default async function PedidosAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>
}) {
  const { estado } = await searchParams
  const supabase = await createSupabaseServerClient()
  let query = supabase
    .from("pedidos")
    .select(
      "id, codigo_publico, nombre_cliente, total, estado_interno, created_at, zona_entrega, comprobante_inicial_url, pedido_items(id, modo)"
    )
    .order("created_at", { ascending: false })
    .limit(200)
  if (estado) query = query.eq("estado_interno", estado)
  const { data: pedidos } = await query

  const filters = [
    { value: "", label: "Todos" },
    { value: "nuevo", label: "Nuevos" },
    { value: "deposito_recibido", label: "Depósito recibido" },
    { value: "pendiente_pedir_supplier", label: "Pendiente pedir" },
    { value: "pedido_a_supplier", label: "Pedidos al supplier" },
    { value: "llegado_pais", label: "Llegaron al país" },
    { value: "listo_entrega", label: "Listos para entrega" },
    { value: "entregado", label: "Entregados" },
  ]

  return (
    <div>
      <Topbar title="Pedidos" subtitle={`${pedidos?.length ?? 0} pedido(s)`} />
      <div className="flex gap-2 flex-wrap mb-6">
        {filters.map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/admin/pedidos?estado=${f.value}` : "/admin/pedidos"}
            className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-wider border transition-colors ${
              (estado || "") === f.value
                ? "bg-gold-primary text-black border-gold-primary"
                : "text-white border-border hover:border-gold-primary"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {!pedidos || pedidos.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12 text-muted">Sin pedidos.</CardBody>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted text-xs uppercase tracking-wider">
                <tr className="border-b border-border">
                  <th className="text-left p-3">Código</th>
                  <th className="text-left p-3">Fecha</th>
                  <th className="text-left p-3">Cliente</th>
                  <th className="text-left p-3">Items</th>
                  <th className="text-left p-3">Zona</th>
                  <th className="text-right p-3">Total</th>
                  <th className="text-left p-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p) => (
                  <tr key={p.id} className="border-b border-border hover:bg-white/2">
                    <td className="p-3">
                      <Link
                        href={`/admin/pedidos/${p.id}`}
                        className="font-mono text-gold-primary hover:underline"
                      >
                        {p.codigo_publico}
                      </Link>
                    </td>
                    <td className="p-3 text-muted">
                      {new Date(p.created_at).toLocaleString("es-PA", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-3 text-white">{p.nombre_cliente}</td>
                    <td className="p-3 text-muted">{p.pedido_items?.length ?? 0}</td>
                    <td className="p-3 text-muted text-xs">{p.zona_entrega ?? "—"}</td>
                    <td className="p-3 text-right font-serif text-gold-primary">
                      {formatUSD(p.total)}
                    </td>
                    <td className="p-3">
                      <Badge tone={ESTADO_TONE[p.estado_interno] || "neutral"}>
                        {ESTADO_LABEL[p.estado_interno] || p.estado_interno}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
