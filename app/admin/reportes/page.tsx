import { Topbar } from "@/components/admin/topbar"
import { Card, CardBody } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import Link from "next/link"
import { formatUSD } from "@/lib/utils"
import { TrendingUp, TrendingDown, AlertTriangle, EyeOff, Package } from "lucide-react"

export const dynamic = "force-dynamic"

const ESTADO_TONE: Record<string, "neutral" | "success" | "info" | "warning" | "danger" | "gold"> = {
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
  nuevo: "Nuevos",
  deposito_recibido: "Depósito recibido",
  pendiente_pedir_supplier: "Pendiente pedir",
  pedido_a_supplier: "Pedido al supplier",
  llegado_pais: "Llegó al país",
  listo_entrega: "Listo entrega",
  entregado: "Entregados",
  cancelado: "Cancelados",
}

const STOCK_CRITICO_UMBRAL = 5

interface PedidoItem {
  producto_id: string | null
  cantidad: number
  precio_snapshot: number
  nombre_snapshot: string
  productos: {
    costo_temu: number
    costo_envio_unitario: number
  } | null
}

interface Pedido {
  id: string
  total: number
  estado_interno: string
  created_at: string
  pedido_items: PedidoItem[]
}

function sumIngresos(pedidos: Pedido[], desde: Date): number {
  return pedidos
    .filter((p) => p.estado_interno !== "cancelado" && new Date(p.created_at) >= desde)
    .reduce((acc, p) => acc + Number(p.total), 0)
}

function sumGananciaNeta(pedidos: Pedido[], desde: Date): number {
  let ganancia = 0
  for (const p of pedidos) {
    if (p.estado_interno === "cancelado" || new Date(p.created_at) < desde) continue
    for (const item of p.pedido_items) {
      const costo = item.productos
        ? (Number(item.productos.costo_temu) + Number(item.productos.costo_envio_unitario)) * item.cantidad
        : 0
      const revenue = Number(item.precio_snapshot) * item.cantidad
      ganancia += revenue - costo
    }
  }
  return ganancia
}

function diff(actual: number, anterior: number): { pct: number; positivo: boolean } | null {
  if (anterior === 0) return null
  const pct = ((actual - anterior) / anterior) * 100
  return { pct, positivo: pct >= 0 }
}

function MetricCard({
  label,
  valor,
  delta,
  subtitle,
}: {
  label: string
  valor: string
  delta?: { pct: number; positivo: boolean } | null
  subtitle?: string
}) {
  return (
    <Card>
      <CardBody className="space-y-2">
        <div className="text-muted text-xs uppercase tracking-wider">{label}</div>
        <div className="font-serif text-3xl text-gold-primary">{valor}</div>
        <div className="flex items-center gap-2">
          {delta ? (
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold ${
                delta.positivo ? "text-success" : "text-danger"
              }`}
            >
              {delta.positivo ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {delta.pct > 0 ? "+" : ""}
              {delta.pct.toFixed(1)}%
            </span>
          ) : (
            <span className="text-muted text-xs">—</span>
          )}
          {subtitle && <span className="text-muted text-xs">{subtitle}</span>}
        </div>
      </CardBody>
    </Card>
  )
}

export default async function ReportesPage() {
  const supabase = await createSupabaseServerClient()

  const ahora = new Date()
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  const hace7d = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000)
  const hace30d = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000)
  const hace14d = new Date(ahora.getTime() - 14 * 24 * 60 * 60 * 1000)
  const hace60d = new Date(ahora.getTime() - 60 * 24 * 60 * 60 * 1000)
  const inicioAyer = new Date(inicioHoy.getTime() - 24 * 60 * 60 * 1000)

  const [pedidosRes, productosRes] = await Promise.all([
    supabase
      .from("pedidos")
      .select(
        "id, total, estado_interno, created_at, pedido_items(producto_id, cantidad, precio_snapshot, nombre_snapshot, productos(costo_temu, costo_envio_unitario))"
      )
      .gte("created_at", hace60d.toISOString())
      .order("created_at", { ascending: false }),
    supabase
      .from("productos")
      .select("id, nombre, slug, modo, stock_unidades, estado, precio_venta, costo_temu, costo_envio_unitario")
      .eq("estado", "publicado"),
  ])

  const pedidos = (pedidosRes.data ?? []) as unknown as Pedido[]
  const productos = productosRes.data ?? []

  // Métricas de ingresos
  const ingresosHoy = sumIngresos(pedidos, inicioHoy)
  const ingresosAyer = sumIngresos(
    pedidos.filter((p) => new Date(p.created_at) < inicioHoy),
    inicioAyer
  )
  const ingresos7d = sumIngresos(pedidos, hace7d)
  const ingresos7dAnterior = sumIngresos(
    pedidos.filter((p) => new Date(p.created_at) < hace7d),
    hace14d
  )
  const ingresos30d = sumIngresos(pedidos, hace30d)
  const ingresos30dAnterior = sumIngresos(
    pedidos.filter((p) => new Date(p.created_at) < hace30d),
    hace60d
  )

  // Métricas de ganancia neta
  const gananciaHoy = sumGananciaNeta(pedidos, inicioHoy)
  const ganancia7d = sumGananciaNeta(pedidos, hace7d)
  const ganancia30d = sumGananciaNeta(pedidos, hace30d)

  // Top productos (últimos 30d, no cancelados)
  const topMap = new Map<
    string,
    { nombre: string; cantidad: number; revenue: number; producto_id: string | null }
  >()
  for (const p of pedidos) {
    if (p.estado_interno === "cancelado" || new Date(p.created_at) < hace30d) continue
    for (const item of p.pedido_items) {
      const key = item.producto_id ?? item.nombre_snapshot
      const prev = topMap.get(key) ?? {
        nombre: item.nombre_snapshot,
        cantidad: 0,
        revenue: 0,
        producto_id: item.producto_id,
      }
      prev.cantidad += item.cantidad
      prev.revenue += Number(item.precio_snapshot) * item.cantidad
      topMap.set(key, prev)
    }
  }
  const topProductos = Array.from(topMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)

  // Pedidos por estado (no cancelados, últimos 30d)
  const estadoCount = new Map<string, number>()
  for (const p of pedidos) {
    if (new Date(p.created_at) < hace30d) continue
    estadoCount.set(p.estado_interno, (estadoCount.get(p.estado_interno) ?? 0) + 1)
  }

  // Stock crítico (modo stock, publicado, stock > 0 y <= umbral)
  const stockCritico = productos
    .filter(
      (p) =>
        p.modo === "stock" &&
        p.stock_unidades !== null &&
        p.stock_unidades > 0 &&
        p.stock_unidades <= STOCK_CRITICO_UMBRAL
    )
    .sort((a, b) => (a.stock_unidades ?? 0) - (b.stock_unidades ?? 0))

  // Productos sin ventas en últimos 30d
  const productosConVentas = new Set<string>()
  for (const p of pedidos) {
    if (p.estado_interno === "cancelado" || new Date(p.created_at) < hace30d) continue
    for (const item of p.pedido_items) {
      if (item.producto_id) productosConVentas.add(item.producto_id)
    }
  }
  const productosSinVentas = productos
    .filter((p) => !productosConVentas.has(p.id))
    .slice(0, 20)

  const totalPedidos30d = Array.from(estadoCount.values()).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-8">
      <Topbar title="Reportes" subtitle="Métricas para decidir qué importar y qué impulsar" />

      <section className="space-y-3">
        <h2 className="eyebrow">Ingresos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            label="Hoy"
            valor={formatUSD(ingresosHoy)}
            delta={diff(ingresosHoy, ingresosAyer)}
            subtitle="vs ayer"
          />
          <MetricCard
            label="Últimos 7 días"
            valor={formatUSD(ingresos7d)}
            delta={diff(ingresos7d, ingresos7dAnterior)}
            subtitle="vs 7d previos"
          />
          <MetricCard
            label="Últimos 30 días"
            valor={formatUSD(ingresos30d)}
            delta={diff(ingresos30d, ingresos30dAnterior)}
            subtitle="vs 30d previos"
          />
        </div>
        <p className="text-muted text-xs">Excluye pedidos cancelados. Incluye pedidos en cualquier estado activo (pipeline + cobrados).</p>
      </section>

      <section className="space-y-3">
        <h2 className="eyebrow">Ganancia neta estimada</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard label="Hoy" valor={formatUSD(gananciaHoy)} />
          <MetricCard label="Últimos 7 días" valor={formatUSD(ganancia7d)} />
          <MetricCard label="Últimos 30 días" valor={formatUSD(ganancia30d)} />
        </div>
        <p className="text-muted text-xs">
          Ingresos menos costos (Temu + envío) por unidad. Aproximado: usa el costo actual del producto, no el costo del momento del pedido.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="eyebrow">Pedidos por estado (últimos 30 días)</h2>
        {totalPedidos30d === 0 ? (
          <Card>
            <CardBody className="text-center py-8 text-muted">Sin pedidos en los últimos 30 días.</CardBody>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {Object.keys(ESTADO_LABEL).map((estado) => {
              const count = estadoCount.get(estado) ?? 0
              return (
                <Link
                  key={estado}
                  href={`/admin/pedidos?estado=${estado}`}
                  className="bg-black-surface border border-border rounded-xl p-4 hover:border-gold-primary/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge tone={ESTADO_TONE[estado]} className="text-[0.6rem]">
                      {ESTADO_LABEL[estado]}
                    </Badge>
                  </div>
                  <div className="font-serif text-2xl text-white">{count}</div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="eyebrow">Top productos (últimos 30 días)</h2>
        {topProductos.length === 0 ? (
          <Card>
            <CardBody className="text-center py-8 text-muted">Sin ventas en los últimos 30 días.</CardBody>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted text-xs uppercase tracking-wider">
                  <tr className="border-b border-border">
                    <th className="text-left p-3">#</th>
                    <th className="text-left p-3">Producto</th>
                    <th className="text-right p-3">Unidades</th>
                    <th className="text-right p-3">Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {topProductos.map((t, idx) => (
                    <tr key={(t.producto_id ?? t.nombre) + idx} className="border-b border-border last:border-0">
                      <td className="p-3 text-muted font-mono">{idx + 1}</td>
                      <td className="p-3 text-white">
                        {t.producto_id ? (
                          <Link
                            href={`/admin/productos/${t.producto_id}`}
                            className="hover:text-gold-primary transition-colors"
                          >
                            {t.nombre}
                          </Link>
                        ) : (
                          <span className="text-muted italic">{t.nombre} (producto eliminado)</span>
                        )}
                      </td>
                      <td className="p-3 text-right text-white">{t.cantidad}</td>
                      <td className="p-3 text-right font-serif text-gold-primary">{formatUSD(t.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-warning" />
          <h2 className="eyebrow !text-warning">Stock crítico</h2>
          <span className="text-muted text-xs">(modo stock con ≤ {STOCK_CRITICO_UMBRAL} unidades)</span>
        </div>
        {stockCritico.length === 0 ? (
          <Card>
            <CardBody className="text-center py-8 text-muted">Todo bien — sin productos en stock crítico.</CardBody>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted text-xs uppercase tracking-wider">
                  <tr className="border-b border-border">
                    <th className="text-left p-3">Producto</th>
                    <th className="text-right p-3">Unidades</th>
                    <th className="text-right p-3">Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {stockCritico.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="p-3 text-white">
                        <Link href={`/admin/productos/${p.id}`} className="hover:text-gold-primary transition-colors">
                          {p.nombre}
                        </Link>
                      </td>
                      <td className="p-3 text-right">
                        <Badge tone="warning">{p.stock_unidades} und</Badge>
                      </td>
                      <td className="p-3 text-right font-serif text-gold-primary">{formatUSD(p.precio_venta)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <EyeOff size={16} className="text-muted" />
          <h2 className="eyebrow">Productos sin ventas (últimos 30 días)</h2>
        </div>
        {productosSinVentas.length === 0 ? (
          <Card>
            <CardBody className="text-center py-8 text-muted">
              <Package size={24} className="inline mb-2" />
              <p>Todos los productos publicados han vendido en los últimos 30 días.</p>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted text-xs uppercase tracking-wider">
                  <tr className="border-b border-border">
                    <th className="text-left p-3">Producto</th>
                    <th className="text-left p-3">Modo</th>
                    <th className="text-right p-3">Precio</th>
                  </tr>
                </thead>
                <tbody>
                  {productosSinVentas.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="p-3 text-white">
                        <Link href={`/admin/productos/${p.id}`} className="hover:text-gold-primary transition-colors">
                          {p.nombre}
                        </Link>
                      </td>
                      <td className="p-3">
                        <Badge tone={p.modo === "stock" ? "success" : "info"} className="text-[0.6rem]">
                          {p.modo === "stock" ? "Stock" : "Pre-orden"}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-serif text-gold-primary">{formatUSD(p.precio_venta)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
        <p className="text-muted text-xs">
          Candidatos a destacar (Destacados de la Semana), bajar precio, o despublicar si llevan mucho tiempo sin moverse.
        </p>
      </section>
    </div>
  )
}
