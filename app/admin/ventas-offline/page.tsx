import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Topbar } from "@/components/admin/topbar"
import { Card, CardBody } from "@/components/ui/card"
import { VentaOfflineModal } from "@/components/admin/VentaOfflineModal"
import { formatUSD } from "@/lib/utils"
import { Package, TrendingUp, DollarSign, BarChart2 } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function VentasOfflinePage() {
  const supabase = await createSupabaseServerClient()

  const [productosRes, ventasRes] = await Promise.all([
    supabase
      .from("productos")
      .select("id, nombre, precio_venta, costo_temu, costo_envio_unitario, stock_unidades, modo")
      .eq("estado", "publicado")
      .order("nombre"),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("ventas_offline")
      .select("id, cantidad, precio_vendido, costo_snapshot, canal, fecha, producto_id, productos(nombre)")
      .order("fecha", { ascending: false })
      .limit(50),
  ])

  const productos = productosRes.data ?? []
  const ventas = ((ventasRes.data ?? []) as unknown) as {
    id: string
    cantidad: number
    precio_vendido: number
    costo_snapshot: number
    canal: string
    fecha: string
    producto_id: string | null
    productos: { nombre: string } | null
  }[]

  // Métricas de inventario
  const inversionTotal = productos.reduce((acc, p) => {
    const costo = (Number(p.costo_temu) + Number(p.costo_envio_unitario)) * (p.stock_unidades ?? 0)
    return acc + costo
  }, 0)

  const gananciaPotencial = productos.reduce((acc, p) => {
    const costo = Number(p.costo_temu) + Number(p.costo_envio_unitario)
    const margen = Number(p.precio_venta) - costo
    return acc + margen * (p.stock_unidades ?? 0)
  }, 0)

  const gananciaRealOffline = ventas.reduce((acc, v) => {
    return acc + (Number(v.precio_vendido) - Number(v.costo_snapshot)) * v.cantidad
  }, 0)

  const totalUnidades = productos.reduce((acc, p) => acc + (p.stock_unidades ?? 0), 0)

  // Tabla de productos con margen
  const productosConMargen = productos
    .map((p) => {
      const costo = Number(p.costo_temu) + Number(p.costo_envio_unitario)
      const margen = Number(p.precio_venta) - costo
      const stock = p.stock_unidades ?? 0
      return { ...p, costo, margen, gananciaPotencial: margen * stock }
    })
    .sort((a, b) => b.gananciaPotencial - a.gananciaPotencial)

  return (
    <div className="space-y-8">
      <Topbar
        title="Ventas Offline & Profit"
        subtitle="Inventario, márgenes y ventas por WhatsApp o presencial"
        actions={<VentaOfflineModal productos={productos} />}
      />

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardBody className="space-y-2">
            <div className="flex items-center gap-2 text-muted text-xs uppercase tracking-wider">
              <DollarSign size={14} />
              Inversión en inventario
            </div>
            <div className="font-serif text-3xl text-gold-primary">{formatUSD(inversionTotal)}</div>
            <p className="text-muted text-xs">Lo que tienes invertido en stock actual</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-2">
            <div className="flex items-center gap-2 text-muted text-xs uppercase tracking-wider">
              <TrendingUp size={14} />
              Ganancia potencial
            </div>
            <div className="font-serif text-3xl text-gold-primary">{formatUSD(gananciaPotencial)}</div>
            <p className="text-muted text-xs">Si vendes todo el stock actual</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-2">
            <div className="flex items-center gap-2 text-muted text-xs uppercase tracking-wider">
              <BarChart2 size={14} />
              Ganancia real offline
            </div>
            <div className="font-serif text-3xl text-gold-primary">{formatUSD(gananciaRealOffline)}</div>
            <p className="text-muted text-xs">De ventas por WhatsApp y presencial</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-2">
            <div className="flex items-center gap-2 text-muted text-xs uppercase tracking-wider">
              <Package size={14} />
              Unidades en stock
            </div>
            <div className="font-serif text-3xl text-gold-primary">{totalUnidades}</div>
            <p className="text-muted text-xs">Total de unidades disponibles</p>
          </CardBody>
        </Card>
      </div>

      {/* Tabla de productos con márgenes */}
      <section className="space-y-3">
        <h2 className="eyebrow">Margen por producto</h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted text-xs uppercase tracking-wider">
                <tr className="border-b border-border">
                  <th className="text-left p-3">Producto</th>
                  <th className="text-right p-3">Costo</th>
                  <th className="text-right p-3">Precio venta</th>
                  <th className="text-right p-3">Margen/und</th>
                  <th className="text-right p-3">Stock</th>
                  <th className="text-right p-3">Ganancia potencial</th>
                </tr>
              </thead>
              <tbody>
                {productosConMargen.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="p-3 text-white">{p.nombre}</td>
                    <td className="p-3 text-right text-muted">{formatUSD(p.costo)}</td>
                    <td className="p-3 text-right text-white">{formatUSD(p.precio_venta)}</td>
                    <td className="p-3 text-right">
                      <span className={p.margen >= 0 ? "text-success" : "text-danger"}>
                        {formatUSD(p.margen)}
                      </span>
                    </td>
                    <td className="p-3 text-right text-white">{p.stock_unidades ?? "—"}</td>
                    <td className="p-3 text-right font-serif text-gold-primary">{formatUSD(p.gananciaPotencial)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* Historial de ventas offline */}
      <section className="space-y-3">
        <h2 className="eyebrow">Ventas offline recientes <span className="text-muted text-xs normal-case font-normal">(últimas 50)</span></h2>
        {ventas.length === 0 ? (
          <Card>
            <CardBody className="text-center py-8 text-muted">
              Aún no hay ventas offline registradas. Usa el botón &quot;Registrar venta&quot; para agregar una.
            </CardBody>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted text-xs uppercase tracking-wider">
                  <tr className="border-b border-border">
                    <th className="text-left p-3">Producto</th>
                    <th className="text-right p-3">Cant.</th>
                    <th className="text-right p-3">Precio vendido</th>
                    <th className="text-right p-3">Ganancia</th>
                    <th className="text-left p-3">Canal</th>
                    <th className="text-left p-3">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.map((v) => {
                    const ganancia = (Number(v.precio_vendido) - Number(v.costo_snapshot)) * v.cantidad
                    return (
                      <tr key={v.id} className="border-b border-border last:border-0">
                        <td className="p-3 text-white">{v.productos?.nombre ?? "Producto eliminado"}</td>
                        <td className="p-3 text-right text-white">{v.cantidad}</td>
                        <td className="p-3 text-right text-white">{formatUSD(Number(v.precio_vendido) * v.cantidad)}</td>
                        <td className="p-3 text-right font-serif text-gold-primary">{formatUSD(ganancia)}</td>
                        <td className="p-3">
                          <span className="text-xs text-muted capitalize">{v.canal}</span>
                        </td>
                        <td className="p-3 text-muted text-xs">{v.fecha}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>
    </div>
  )
}
