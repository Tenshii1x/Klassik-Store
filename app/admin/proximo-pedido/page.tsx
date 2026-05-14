import { Topbar } from "@/components/admin/topbar"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { formatUSD } from "@/lib/utils"
import { ConfirmButton } from "./confirm-button"

interface AgrupadoProducto {
  producto_id: string
  nombre: string
  modelo: string | null
  costo_temu: number
  cantidad_total: number
  costo_total: number
  pedidos: { codigo: string; cliente: string; cantidad: number }[]
}

interface RowProducto {
  id: string
  nombre: string
  modelo: string | null
  costo_temu: number | null
}

interface RowPedido {
  id: string
  codigo_publico: string
  nombre_cliente: string
  estado_interno: string
}

interface RowItem {
  cantidad: number
  modo: string
  producto_id: string | null
  producto: RowProducto | RowProducto[] | null
  pedido: RowPedido | RowPedido[] | null
}

export default async function ProximoPedidoPage() {
  const supabase = await createSupabaseServerClient()
  // Get all items from pedidos in states where supplier order is pending.
  // Using PostgREST embedded resource filter on pedido.estado_interno.
  const { data: rows } = (await supabase
    .from("pedido_items")
    .select(
      `
      cantidad, modo, producto_id,
      producto:productos(id, nombre, modelo, costo_temu),
      pedido:pedidos!inner(id, codigo_publico, nombre_cliente, estado_interno)
    `
    )
    .eq("modo", "preorden")
    .in("pedido.estado_interno", [
      "nuevo",
      "deposito_recibido",
      "pendiente_pedir_supplier",
    ])) as unknown as { data: RowItem[] | null }

  const map = new Map<string, AgrupadoProducto>()
  for (const r of rows || []) {
    const prod = Array.isArray(r.producto) ? r.producto[0] : r.producto
    const ped = Array.isArray(r.pedido) ? r.pedido[0] : r.pedido
    if (!prod || !ped) continue
    if (!map.has(prod.id)) {
      map.set(prod.id, {
        producto_id: prod.id,
        nombre: prod.nombre,
        modelo: prod.modelo,
        costo_temu: Number(prod.costo_temu) || 0,
        cantidad_total: 0,
        costo_total: 0,
        pedidos: [],
      })
    }
    const g = map.get(prod.id)!
    g.cantidad_total += r.cantidad
    g.costo_total += (Number(prod.costo_temu) || 0) * r.cantidad
    g.pedidos.push({
      codigo: ped.codigo_publico,
      cliente: ped.nombre_cliente,
      cantidad: r.cantidad,
    })
  }

  const grupos = Array.from(map.values()).sort(
    (a, b) => b.cantidad_total - a.cantidad_total
  )
  const totalInversion = grupos.reduce((acc, g) => acc + g.costo_total, 0)
  const productoIds = grupos.map((g) => g.producto_id)

  return (
    <div>
      <Topbar
        title="Próximo pedido a Temu"
        subtitle={`${grupos.length} producto(s) pendiente(s) · inversión total ${formatUSD(totalInversion)}`}
      />

      {grupos.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12 text-muted">
            No hay productos pendientes de pedir al supplier.
          </CardBody>
        </Card>
      ) : (
        <>
          <Card className="mb-4">
            <CardBody>
              <p className="text-muted text-sm mb-3">
                Cuando hayas hecho el pedido al supplier, marca todos como
                &ldquo;pedidos&rdquo; con un click.
              </p>
              <ConfirmButton productoIds={productoIds} grupos={grupos.length} />
            </CardBody>
          </Card>

          <div className="space-y-3">
            {grupos.map((g) => (
              <Card key={g.producto_id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-serif text-lg text-white">{g.nombre}</h3>
                      {g.modelo && (
                        <p className="text-muted text-xs">{g.modelo}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge tone="gold">{g.cantidad_total}× unidad(es)</Badge>
                      <div className="text-gold-primary font-serif text-sm mt-1">
                        {formatUSD(g.costo_total)} en costo
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="text-muted text-xs mb-2">
                    {g.pedidos.length} pedido(s):
                  </div>
                  <ul className="space-y-1 text-sm">
                    {g.pedidos.map((p, i) => (
                      <li key={i} className="flex justify-between">
                        <span className="text-white">{p.cliente}</span>
                        <span className="text-muted">
                          <span className="font-mono">{p.codigo}</span> · ×
                          {p.cantidad}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
