import { notFound, redirect } from "next/navigation"
import { Topbar } from "@/components/admin/topbar"
import { SeccionForm } from "@/components/admin/forms/SeccionForm"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/admin/ConfirmDialog"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { deleteSeccion } from "@/app/admin/secciones/actions"
import { Trash2 } from "lucide-react"
import { SubseccionesEditor } from "@/components/admin/forms/SubseccionesEditor"
import { DeleteSeccionButton } from "./delete-button"

export default async function EditarSeccionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: seccion } = await supabase.from("secciones").select("*").eq("id", id).single()
  if (!seccion) notFound()

  const { data: subsecciones } = await supabase
    .from("subsecciones")
    .select("id, nombre, slug, orden")
    .eq("seccion_id", id)
    .order("orden", { ascending: true })

  return (
    <div className="max-w-3xl">
      <Topbar title={`Editar: ${seccion.nombre}`} subtitle="Información de sección y subsecciones" />
      <div className="space-y-6">
        <SeccionForm initial={seccion as Parameters<typeof SeccionForm>[0]["initial"]} />
        <SubseccionesEditor seccionId={id} initial={subsecciones || []} />
        <Card>
          <CardHeader>
            <h3 className="font-serif text-lg text-danger">Zona peligrosa</h3>
          </CardHeader>
          <CardBody>
            <p className="text-muted text-sm mb-4">
              Borrar esta sección es permanente. Solo se permite si la sección no tiene productos asociados.
            </p>
            <DeleteSeccionButton id={id} nombre={seccion.nombre} />
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
