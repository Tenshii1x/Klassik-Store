import { Topbar } from "@/components/admin/topbar"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { BackupButtons } from "./buttons"
import { getBackupData } from "./actions"

export default async function BackupPage() {
  const data = await getBackupData()
  return (
    <div className="max-w-3xl">
      <Topbar
        title="Backup de tu catálogo"
        subtitle="Descarga toda tu información para tener un respaldo seguro"
      />
      <Card>
        <CardHeader>
          <h3 className="font-serif text-lg text-white">Tu catálogo</h3>
          <p className="text-muted text-xs mt-1">{data.productos.length} producto(s) registrado(s).</p>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-muted text-sm">
            <strong className="text-white">¿Qué incluye?</strong> Todos tus productos con nombres, precios, costos, modelos,
            sección, etiquetas, estado, URLs de imágenes y notas internas.
          </p>
          <p className="text-muted text-sm">
            <strong className="text-white">CSV:</strong> archivo que puedes abrir en Excel/Google Sheets para revisar todo en una tabla.
            Las imágenes se guardan como URLs (no descargadas).
          </p>
          <p className="text-muted text-sm">
            <strong className="text-white">JSON:</strong> formato completo con toda la data estructurada,
            por si necesitas restaurar o migrar a otra plataforma.
          </p>
          <BackupButtons csv={data.csv} productos={data.productos} />
        </CardBody>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <h3 className="font-serif text-lg text-white">Backups regulares</h3>
        </CardHeader>
        <CardBody>
          <p className="text-muted text-sm">
            Recomendación: descarga un backup cada semana. Las imágenes en sí están en Supabase Storage —
            si pierdes acceso al proyecto Supabase necesitas el backup para reconstruir.
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
