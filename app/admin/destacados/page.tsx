import { Topbar } from "@/components/admin/topbar"
import { Card, CardBody } from "@/components/ui/card"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { DestacadosToggle } from "./toggle"

export default async function DestacadosPage() {
  const supabase = await createSupabaseServerClient()
  const { data: productos } = await supabase
    .from("productos")
    .select("id, nombre, modelo, destacado, precio_venta, producto_imagenes(url)")
    .eq("estado", "publicado")
    .order("destacado", { ascending: false })
    .order("updated_at", { ascending: false })

  const destacadosCount = productos?.filter((p) => p.destacado).length ?? 0

  return (
    <div>
      <Topbar
        title="Destacados"
        subtitle={`${destacadosCount} destacados · aparecen en el home del catálogo`}
      />
      <Card>
        <CardBody>
          <p className="text-muted text-sm mb-4">
            Marca los productos que quieres que aparezcan en el carrusel &ldquo;Destacados&rdquo; de la home. Recomendado: 6-12 productos.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {productos?.map((p) => (
              <DestacadosToggle
                key={p.id}
                id={p.id}
                nombre={p.nombre}
                imagenUrl={p.producto_imagenes?.[0]?.url || null}
                destacado={p.destacado}
              />
            ))}
          </div>
          {!productos?.length && (
            <p className="text-muted text-center py-8">Sin productos publicados aún.</p>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
