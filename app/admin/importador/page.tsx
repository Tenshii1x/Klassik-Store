import { Topbar } from "@/components/admin/topbar"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import Link from "next/link"
import { ExternalLink, Key } from "lucide-react"

export default async function ImportadorPage() {
  const supabase = await createSupabaseServerClient()
  const { data: logs } = await supabase
    .from("importaciones_log")
    .select(
      "id, status, error_message, imagenes_count, imagenes_failed, created_at, temu_url, temu_goods_id, producto_id, productos(nombre, estado)"
    )
    .order("created_at", { ascending: false })
    .limit(50)

  return (
    <div className="max-w-5xl">
      <Topbar
        title="Importador Temu"
        subtitle="Historial de importaciones desde la extensión Chrome"
        actions={
          <Link href="/admin/configuracion/extension">
            <Button variant="ghost">
              <Key size={14} />
              Gestionar API keys
            </Button>
          </Link>
        }
      />

      {!logs || logs.length === 0 ? (
        <Card>
          <CardBody className="text-center py-16">
            <p className="font-serif text-2xl text-white mb-2">Aún no has importado nada</p>
            <p className="text-muted text-sm mb-6">
              Instala la extensión Chrome, navega un producto de Temu logueada, y click el ícono KS.
            </p>
            <Link href="/admin/configuracion/extension">
              <Button>
                <Key size={14} />
                Configurar extensión
              </Button>
            </Link>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <h3 className="font-serif text-lg text-white">Últimas {logs.length} importaciones</h3>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted text-xs uppercase tracking-wider">
                  <tr className="border-b border-border">
                    <th className="text-left py-3">Fecha</th>
                    <th className="text-left py-3">Producto</th>
                    <th className="text-left py-3">Estado</th>
                    <th className="text-left py-3">Imágenes</th>
                    <th className="text-left py-3">Origen</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const fecha = new Date(log.created_at).toLocaleString("es-PA", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                    const producto = Array.isArray(log.productos) ? log.productos[0] : log.productos
                    return (
                      <tr key={log.id} className="border-b border-border hover:bg-white/2">
                        <td className="py-3 text-muted">{fecha}</td>
                        <td className="py-3">
                          {producto ? (
                            <Link
                              href={`/admin/productos/${log.producto_id}`}
                              className="text-white hover:text-gold-primary font-serif"
                            >
                              {producto.nombre}
                            </Link>
                          ) : (
                            <span className="text-muted italic">(borrado)</span>
                          )}
                        </td>
                        <td className="py-3">
                          {log.status === "success" && <Badge tone="success">Éxito</Badge>}
                          {log.status === "partial" && <Badge tone="warning">Parcial</Badge>}
                          {log.status === "failed" && <Badge tone="danger">Falló</Badge>}
                          {log.error_message && (
                            <div className="text-xs text-danger mt-1 max-w-xs truncate" title={log.error_message}>
                              {log.error_message}
                            </div>
                          )}
                        </td>
                        <td className="py-3 text-muted">
                          {log.imagenes_count} OK · {log.imagenes_failed} falló
                        </td>
                        <td className="py-3">
                          {log.temu_url ? (
                            <a
                              href={log.temu_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted hover:text-gold-primary text-xs inline-flex items-center gap-1"
                              title={log.temu_url}
                            >
                              <ExternalLink size={12} />
                              <span className="truncate max-w-[140px]">{log.temu_goods_id}</span>
                            </a>
                          ) : (
                            <span className="text-muted text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3"></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
