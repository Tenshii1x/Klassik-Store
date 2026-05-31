import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Topbar } from "@/components/admin/topbar"
import { AjusteInventarioTable } from "@/components/admin/AjusteInventarioTable"

export const dynamic = "force-dynamic"

export default async function InventarioPage() {
  const supabase = await createSupabaseServerClient()
  const { data: productos } = await supabase
    .from("productos")
    .select("id, nombre, stock_unidades, precio_venta, costo_temu, costo_envio_unitario")
    .eq("estado", "publicado")
    .eq("modo", "stock")
    .order("nombre")

  return (
    <div className="space-y-6">
      <Topbar
        title="Ajuste de inventario"
        subtitle="Actualiza el stock de varios productos a la vez"
      />
      <AjusteInventarioTable productos={productos ?? []} />
    </div>
  )
}
