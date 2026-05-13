import { Topbar } from "@/components/admin/topbar"
import { Card, CardBody } from "@/components/ui/card"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()

  const [
    { count: productosPublicados },
    { count: productosBorrador },
    { count: pedidosActivos },
  ] = await Promise.all([
    supabase.from("productos").select("*", { count: "exact", head: true }).eq("estado", "publicado"),
    supabase.from("productos").select("*", { count: "exact", head: true }).eq("estado", "borrador"),
    supabase.from("pedidos").select("*", { count: "exact", head: true }).not("estado_interno", "in", "(entregado,cancelado)"),
  ])

  const stats = [
    { label: "Productos publicados", value: productosPublicados ?? 0 },
    { label: "Borradores pendientes", value: productosBorrador ?? 0 },
    { label: "Pedidos activos", value: pedidosActivos ?? 0 },
  ]

  return (
    <div>
      <Topbar
        title="Dashboard"
        subtitle="Bienvenida de vuelta a Klassik Admin"
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardBody>
              <div className="text-xs tracking-widest uppercase text-muted mb-2">
                {s.label}
              </div>
              <div className="font-serif text-4xl text-white">{s.value}</div>
            </CardBody>
          </Card>
        ))}
      </div>
      <Card>
        <CardBody className="text-center py-16 text-muted">
          <p className="font-serif text-2xl text-white mb-2">Tu admin está vacío</p>
          <p className="text-sm">
            Próximo paso (Plan 02): construir el CRUD de productos, secciones y configuración.
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
