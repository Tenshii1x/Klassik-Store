import { Topbar } from "@/components/admin/topbar"
import { Button } from "@/components/ui/button"
import { Card, CardBody } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Plus } from "lucide-react"

export default async function SeccionesPage() {
  const supabase = await createSupabaseServerClient()
  const { data: secciones } = await supabase
    .from("secciones")
    .select("id, nombre, slug, tono, activa, orden")
    .order("orden", { ascending: true })

  return (
    <div>
      <Topbar
        title="Secciones"
        subtitle="Organiza tu catálogo en categorías visibles para el cliente"
        actions={
          <Link href="/admin/secciones/nueva">
            <Button size="md">
              <Plus size={16} />
              Nueva sección
            </Button>
          </Link>
        }
      />
      {secciones && secciones.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {secciones.map((s) => (
            <Link key={s.id} href={`/admin/secciones/${s.id}`}>
              <Card className="hover:border-gold-primary transition-colors cursor-pointer">
                <CardBody>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-serif text-xl text-white">{s.nombre}</h3>
                    <Badge tone={s.activa ? "success" : "neutral"}>
                      {s.activa ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                  <p className="text-muted text-xs">/{s.slug}</p>
                  <p className="text-muted text-xs mt-2">Tono: {s.tono}</p>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardBody className="text-center py-16 text-muted">
            <p className="font-serif text-xl text-white mb-2">Aún no tienes secciones</p>
            <p className="text-sm mb-6">Crea tu primera sección para empezar a organizar productos.</p>
            <Link href="/admin/secciones/nueva">
              <Button>
                <Plus size={16} />
                Crear primera sección
              </Button>
            </Link>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
