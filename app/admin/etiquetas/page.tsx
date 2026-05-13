import { Topbar } from "@/components/admin/topbar"
import { EtiquetaForm } from "@/components/admin/forms/EtiquetaForm"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export default async function EtiquetasPage() {
  const supabase = await createSupabaseServerClient()
  const { data: etiquetas } = await supabase
    .from("etiquetas")
    .select("id, nombre, slug, color")
    .order("nombre", { ascending: true })

  return (
    <div className="max-w-3xl">
      <Topbar
        title="Etiquetas"
        subtitle="Tags transversales para potenciar filtros y carruseles del home (ej. Regalo Perfecto, Bajo $30)"
      />
      <div className="space-y-3">
        {etiquetas?.map((e) => (
          <EtiquetaForm key={e.id} initial={e} />
        ))}
        <div>
          <h3 className="eyebrow mb-2">Crear nueva</h3>
          <EtiquetaForm />
        </div>
      </div>
    </div>
  )
}
