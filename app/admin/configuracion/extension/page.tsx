import { Topbar } from "@/components/admin/topbar"
import { ApiKeyManager } from "@/components/admin/forms/ApiKeyManager"
import { Button } from "@/components/ui/button"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Download, ExternalLink } from "lucide-react"

const SUPABASE_PROJECT = "ackefqrcejicepksrwiz"
const EDGE_URL = `https://${SUPABASE_PROJECT}.supabase.co/functions/v1/import-temu-product`

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
            <h3 className="font-serif text-lg text-white">Paso 1 · Descarga la extensión</h3>
            <p className="text-muted text-xs mt-1">
              Es un archivo ZIP que contiene la extensión. Tienes que descargarlo y descomprimirlo.
            </p>
          </CardHeader>
          <CardBody className="space-y-3">
            <a
              href="/extension/klassik-importador.zip"
              download
              className="inline-block"
            >
              <Button size="lg">
                <Download size={16} />
                Descargar klassik-importador.zip
              </Button>
            </a>
            <p className="text-muted text-xs">
              Al descomprimir vas a obtener una carpeta llamada <code className="bg-black px-1.5 py-0.5 rounded text-gold-primary text-[0.7rem]">klassik-importador</code> con varios archivos adentro.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-serif text-lg text-white">Paso 2 · Instálala en Chrome</h3>
          </CardHeader>
          <CardBody className="space-y-3 text-sm text-white/80">
            <ol className="list-decimal list-inside space-y-2.5">
              <li>Abre Chrome y ve a <code className="bg-black px-1.5 py-0.5 rounded text-gold-primary text-[0.7rem]">chrome://extensions</code></li>
              <li>Activa el toggle <strong>&ldquo;Modo desarrollador&rdquo;</strong> (esquina superior derecha)</li>
              <li>Click el botón <strong>&ldquo;Cargar descomprimida&rdquo;</strong> (o &ldquo;Load unpacked&rdquo; en inglés)</li>
              <li>Selecciona la carpeta <code className="bg-black px-1.5 py-0.5 rounded text-gold-primary text-[0.7rem]">klassik-importador</code> que descomprimiste</li>
              <li>La extensión aparece con el ícono <strong>KS</strong> en círculo dorado</li>
              <li>Click el ícono de extensiones (pieza de puzzle) en la barra de Chrome → pin <strong>Klassik Importador</strong> para tenerla siempre visible</li>
            </ol>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-serif text-lg text-white">Paso 3 · Crea y copia tu API key</h3>
            <p className="text-muted text-xs mt-1">
              La key autentica tu extensión con tu admin. Si la pierdes, revócala y crea una nueva.
            </p>
          </CardHeader>
          <CardBody>
            <ApiKeyManager keys={(keys as never) || []} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-serif text-lg text-white">Paso 4 · Configura la extensión</h3>
          </CardHeader>
          <CardBody className="space-y-3 text-sm text-white/80">
            <p>Click el ícono KS en tu Chrome → al abrir el popup por primera vez te pide configurar tres campos:</p>
            <div className="bg-black border border-border rounded-md p-4 space-y-3 font-mono text-xs">
              <div>
                <div className="text-gold-primary mb-1">URL Edge Function</div>
                <div className="text-white/90 break-all">{EDGE_URL}</div>
              </div>
              <div>
                <div className="text-gold-primary mb-1">API Key</div>
                <div className="text-white/90">Pega la que creaste en Paso 3</div>
              </div>
              <div>
                <div className="text-gold-primary mb-1">URL del admin</div>
                <div className="text-white/90">https://klassik-store-one.vercel.app</div>
              </div>
            </div>
            <p className="text-muted text-xs">
              Click <strong>Guardar</strong>. La configuración se guarda solo una vez por instalación.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-serif text-lg text-white">Paso 5 · Usar la extensión</h3>
          </CardHeader>
          <CardBody className="space-y-3 text-sm text-white/80">
            <ol className="list-decimal list-inside space-y-2.5">
              <li>Abre <strong>temu.com</strong> en Chrome (logueada como siempre)</li>
              <li>Navega al producto que quieres importar (cualquier producto con <code className="bg-black px-1.5 py-0.5 rounded text-gold-primary text-[0.7rem]">goods_id</code> en la URL)</li>
              <li>Click el ícono KS en tu barra de Chrome</li>
              <li>El popup detecta automáticamente el producto y muestra preview (imagen, nombre, precio, # variantes)</li>
              <li>Click <strong>&ldquo;Importar a Klassik Store&rdquo;</strong></li>
              <li>El producto aparece en <a href="/admin/productos" className="text-gold-primary underline">/admin/productos</a> como <strong>borrador</strong></li>
              <li>Revisa el producto: marca cada imagen como <strong>&ldquo;Limpia&rdquo;</strong> (sin watermark del proveedor), ajusta nombre/precio/sección y publica</li>
            </ol>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-serif text-lg text-white">Historial de importaciones</h3>
          </CardHeader>
          <CardBody>
            <a href="/admin/importador" className="text-gold-primary text-sm inline-flex items-center gap-1.5 hover:underline">
              Ver historial completo
              <ExternalLink size={12} />
            </a>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
