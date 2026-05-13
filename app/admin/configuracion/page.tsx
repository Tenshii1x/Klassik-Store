import { Topbar } from "@/components/admin/topbar"
import { ConfiguracionForm } from "@/components/admin/forms/ConfiguracionForm"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export default async function ConfiguracionPage() {
  const supabase = await createSupabaseServerClient()
  const { data: config } = await supabase.from("configuracion").select("*").eq("id", 1).single()
  if (!config) {
    return <div className="text-danger">No se encontró configuración (debe haber 1 fila con id=1).</div>
  }
  return (
    <div className="max-w-4xl">
      <Topbar
        title="Configuración de la tienda"
        subtitle="Datos generales, pagos, operación y políticas"
      />
      <ConfiguracionForm initial={config as never} />
    </div>
  )
}
