import { notFound } from "next/navigation"
import Link from "next/link"
import { Topbar } from "@/components/admin/topbar"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { formatUSD } from "@/lib/utils"
import { ZONAS } from "@/lib/pedidos/reglas-pago"
import { PedidoEstadoMachine } from "@/components/admin/PedidoEstadoMachine"
import { NotasEditor } from "./notas-editor"
import { DeletePedidoButton } from "./delete-button"
import { ArrowLeft, ExternalLink, MessageCircle } from "lucide-react"

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

const METODO_LABEL: Record<string, string> = {
  yappy_full: "100% Yappy",
  transferencia_full: "100% Transferencia",
  yappy_50_50: "50% Yappy + 50% al recibir",
  transferencia_50_50: "50% Transferencia + 50% al recibir",
  efectivo_full: "100% Efectivo al recibir",
}

function zonaLabel(value: string | null): string {
  if (!value) return "—"
  return ZONAS.find((z) => z.value === value)?.label ?? value
}

function waLink(numero: string | null): string | null {
  if (!numero) return null
  const cleaned = numero.replace(/\D/g, "")
  if (!cleaned) return null
  return `https://wa.me/${cleaned}`
}

export default async function PedidoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const [{ data: pedido }, { data: items }] = await Promise.all([
    supabase.from("pedidos").select("*").eq("id", id).single(),
    supabase
      .from("pedido_items")
      .select(
        "id, producto_id, variante_id, nombre_snapshot, precio_snapshot, cantidad, modo"
      )
      .eq("pedido_id", id),
  ])

  if (!pedido) notFound()

  const estadoTone = ESTADO_TONE[pedido.estado_interno] || "neutral"
  const estadoText = ESTADO_LABEL[pedido.estado_interno] || pedido.estado_interno
  const waHref = waLink(pedido.whatsapp_cliente)
  const itemsList = items || []
  const totalCalculado = itemsList.reduce(
    (acc, it) => acc + Number(it.precio_snapshot) * it.cantidad,
    0
  )

  return (
    <div className="max-w-4xl space-y-6">
      <Topbar
        title={pedido.codigo_publico}
        subtitle={`Pedido creado el ${new Date(pedido.created_at).toLocaleString("es-PA", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}`}
        actions={
          <div className="flex items-center gap-3">
            <Badge tone={estadoTone}>{estadoText}</Badge>
            <Link href="/admin/pedidos">
              <Button type="button" variant="ghost" size="sm">
                <ArrowLeft size={14} /> Volver
              </Button>
            </Link>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <h2 className="font-serif text-lg text-white">Cliente</h2>
        </CardHeader>
        <CardBody className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted">Nombre</span>
            <span className="text-white">{pedido.nombre_cliente}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted">WhatsApp</span>
            <span className="text-white">
              {waHref ? (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-gold-primary hover:underline"
                >
                  <MessageCircle size={14} /> {pedido.whatsapp_cliente}
                </a>
              ) : (
                "—"
              )}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted">Email</span>
            <span className="text-white">{pedido.email_cliente ?? "—"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted">Zona</span>
            <span className="text-white text-right">{zonaLabel(pedido.zona_entrega)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted">Dirección</span>
            <span className="text-white text-right max-w-md whitespace-pre-wrap">
              {pedido.direccion_entrega ?? "—"}
            </span>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-serif text-lg text-white">
            Items <span className="text-muted text-sm">({itemsList.length})</span>
          </h2>
        </CardHeader>
        <CardBody>
          {itemsList.length === 0 ? (
            <p className="text-muted text-sm">Sin items.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted text-xs uppercase tracking-wider">
                  <tr className="border-b border-border">
                    <th className="text-left p-2">Producto</th>
                    <th className="text-left p-2">Modo</th>
                    <th className="text-right p-2">Precio</th>
                    <th className="text-right p-2">Cant.</th>
                    <th className="text-right p-2">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsList.map((it) => {
                    const subtotal = Number(it.precio_snapshot) * it.cantidad
                    return (
                      <tr key={it.id} className="border-b border-border last:border-0">
                        <td className="p-2 text-white">{it.nombre_snapshot}</td>
                        <td className="p-2">
                          <Badge tone={it.modo === "stock" ? "success" : "info"}>
                            {it.modo === "stock" ? "Stock" : "Pre-orden"}
                          </Badge>
                        </td>
                        <td className="p-2 text-right text-muted">
                          {formatUSD(Number(it.precio_snapshot))}
                        </td>
                        <td className="p-2 text-right text-white">{it.cantidad}</td>
                        <td className="p-2 text-right text-gold-primary font-serif">
                          {formatUSD(subtotal)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} className="p-2 text-right text-muted text-xs uppercase tracking-wider">
                      Total calculado
                    </td>
                    <td className="p-2 text-right text-gold-primary font-serif">
                      {formatUSD(totalCalculado)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="p-2 text-right text-muted text-xs uppercase tracking-wider">
                      Total guardado
                    </td>
                    <td className="p-2 text-right text-gold-primary font-serif text-lg">
                      {formatUSD(Number(pedido.total))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-serif text-lg text-white">Pago</h2>
        </CardHeader>
        <CardBody className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted">Método</span>
            <span className="text-white text-right">
              {pedido.metodo_pago
                ? METODO_LABEL[pedido.metodo_pago] ?? pedido.metodo_pago
                : "—"}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted">Monto inicial pagado</span>
            <span className="text-gold-primary font-serif">
              {pedido.monto_pagado_inicial != null
                ? formatUSD(Number(pedido.monto_pagado_inicial))
                : "—"}
            </span>
          </div>
          {pedido.comprobante_inicial_url && (
            <div className="space-y-2">
              <span className="text-muted text-xs uppercase tracking-wider">
                Comprobante inicial
              </span>
              <a
                href={pedido.comprobante_inicial_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-gold-primary hover:underline text-sm"
              >
                <ExternalLink size={14} /> Abrir comprobante en nueva pestaña
              </a>
            </div>
          )}
          <div className="flex justify-between gap-4 pt-2 border-t border-border">
            <span className="text-muted">Monto final pagado</span>
            <span className="text-gold-primary font-serif">
              {pedido.monto_pagado_final != null
                ? formatUSD(Number(pedido.monto_pagado_final))
                : "—"}
            </span>
          </div>
          {pedido.comprobante_final_url && (
            <div className="space-y-2">
              <span className="text-muted text-xs uppercase tracking-wider">
                Comprobante final
              </span>
              <a
                href={pedido.comprobante_final_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-gold-primary hover:underline text-sm"
              >
                <ExternalLink size={14} /> Abrir comprobante en nueva pestaña
              </a>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-serif text-lg text-white">Avanzar estado</h2>
          <p className="text-muted text-xs mt-1">
            Estado actual: <span className="text-white">{estadoText}</span>
          </p>
        </CardHeader>
        <CardBody>
          <PedidoEstadoMachine id={pedido.id} estadoActual={pedido.estado_interno} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-serif text-lg text-white">Notas internas</h2>
        </CardHeader>
        <CardBody>
          <NotasEditor id={pedido.id} initial={pedido.notas_internas} />
        </CardBody>
      </Card>

      <Card className="border-danger/30">
        <CardHeader>
          <h2 className="font-serif text-lg text-danger">Zona peligrosa</h2>
        </CardHeader>
        <CardBody>
          <DeletePedidoButton id={pedido.id} codigo={pedido.codigo_publico} />
        </CardBody>
      </Card>
    </div>
  )
}
