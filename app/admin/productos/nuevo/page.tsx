import { Topbar } from "@/components/admin/topbar"
import { ProductoForm } from "@/components/admin/forms/ProductoForm"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export default async function NuevoProductoPage() {
  const supabase = await createSupabaseServerClient()
  const [{ data: secciones }, { data: etiquetas }, { data: config }] = await Promise.all([
    supabase.from("secciones").select("id, nombre, subsecciones(id, nombre)").order("orden"),
    supabase.from("etiquetas").select("id, nombre, slug, color").order("nombre"),
    supabase.from("configuracion").select("margen_global_porcentaje").eq("id", 1).single(),
  ])

  return (
    <div className="max-w-4xl">
      <Topbar title="Nuevo producto" subtitle="Crea un producto y publícalo al catálogo" />
      <ProductoForm
        secciones={(secciones as never) || []}
        etiquetas={etiquetas || []}
        margenGlobal={config?.margen_global_porcentaje ?? 60}
      />
    </div>
  )
}
