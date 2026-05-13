import { notFound } from "next/navigation"
import { Topbar } from "@/components/admin/topbar"
import { ComboForm } from "@/components/admin/forms/ComboForm"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export default async function EditarComboPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const [{ data: combo }, { data: items }, { data: productos }] = await Promise.all([
    supabase.from("combos").select("*").eq("id", id).single(),
    supabase.from("combo_productos").select("producto_id, cantidad").eq("combo_id", id),
    supabase.from("productos").select("id, nombre, precio_venta").eq("estado", "publicado").order("nombre"),
  ])
  if (!combo) notFound()

  return (
    <div className="max-w-3xl">
      <Topbar title={`Editar: ${combo.nombre}`} />
      <ComboForm
        initial={{ ...combo, id: combo.id, productos: items || [] } as never}
        productosDisponibles={productos || []}
      />
    </div>
  )
}
