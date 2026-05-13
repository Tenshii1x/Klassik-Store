import { Topbar } from "@/components/admin/topbar"
import { ComboForm } from "@/components/admin/forms/ComboForm"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export default async function NuevoComboPage() {
  const supabase = await createSupabaseServerClient()
  const { data: productos } = await supabase
    .from("productos")
    .select("id, nombre, precio_venta")
    .eq("estado", "publicado")
    .order("nombre")
  return (
    <div className="max-w-3xl">
      <Topbar title="Nuevo combo" />
      <ComboForm productosDisponibles={productos || []} />
    </div>
  )
}
