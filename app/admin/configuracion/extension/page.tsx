import { Topbar } from "@/components/admin/topbar"
import { ApiKeyManager } from "@/components/admin/forms/ApiKeyManager"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export default async function ExtensionPage() {
  const supabase = await createSupabaseServerClient()
  const { data: keys } = await supabase
    .from("extension_api_keys")
    .select("id, nombre, key_prefix, created_at, last_used_at, revoked_at")
    .order("created_at", { ascending: false })

  return (
    <div className="max-w-3xl">
      <Topbar
        title="Extensión Chrome"
        subtitle="Importa productos de Temu en un click a tu admin"
      />
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <h3 className="font-serif text-lg text-white">Cómo instalar la extensión</h3>
          </CardHeader>
          <CardBody className="space-y-3 text-sm text-white/80">
            <p>Las instrucciones de instalación aparecen aquí cuando esté lista la extensión (Plan 04 Task 9).</p>
            <ol className="list-decimal list-inside space-y-2 mt-3 text-muted">
              <li>Crea una API key abajo con el nombre de tu equipo (ej. &ldquo;Mi laptop personal&rdquo;)</li>
              <li>Cópiala (solo verás la clave completa una vez)</li>
              <li>Descarga la extensión .crx (link estará disponible al final del Plan 04)</li>
              <li>Arrástrala a chrome://extensions con &ldquo;Developer mode&rdquo; activado</li>
              <li>Click el ícono KS en Chrome → pega la API key y la URL de Edge Function</li>
              <li>Navega a Temu logueada, abre un producto, click el ícono → importar</li>
            </ol>
          </CardBody>
        </Card>

        <ApiKeyManager keys={(keys as never) || []} />
      </div>
    </div>
  )
}
