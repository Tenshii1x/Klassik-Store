import { Topbar } from "@/components/admin/topbar"
import { SeccionForm } from "@/components/admin/forms/SeccionForm"

export default function NuevaSeccionPage() {
  return (
    <div className="max-w-3xl">
      <Topbar title="Nueva sección" subtitle="Crea una categoría para agrupar productos" />
      <SeccionForm />
    </div>
  )
}
