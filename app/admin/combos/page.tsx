import { Topbar } from "@/components/admin/topbar"
import { Button } from "@/components/ui/button"
import { Card, CardBody } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Plus } from "lucide-react"
import { formatUSD } from "@/lib/utils"

export default async function CombosPage() {
  const supabase = await createSupabaseServerClient()
  const { data: combos } = await supabase
    .from("combos")
    .select("id, nombre, precio_combo, activo, imagen_url, combo_productos(producto_id)")
    .order("created_at", { ascending: false })

  return (
    <div>
      <Topbar
        title="Combos"
        subtitle="Bundles de productos con precio especial"
        actions={
          <Link href="/admin/combos/nuevo">
            <Button>
              <Plus size={16} /> Nuevo combo
            </Button>
          </Link>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {combos?.map((c) => (
          <Link key={c.id} href={`/admin/combos/${c.id}`}>
            <Card className="hover:border-gold-primary transition-colors cursor-pointer">
              <CardBody>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-serif text-lg text-white">{c.nombre}</h3>
                  <Badge tone={c.activo ? "success" : "neutral"}>
                    {c.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
                <p className="text-muted text-sm">{c.combo_productos?.length || 0} productos</p>
                <p className="text-gold-primary font-serif text-xl mt-2">{formatUSD(c.precio_combo)}</p>
              </CardBody>
            </Card>
          </Link>
        ))}
        {!combos?.length && (
          <Card>
            <CardBody className="text-center py-16 text-muted">
              <p className="font-serif text-xl text-white mb-2">Sin combos</p>
              <p className="text-sm mb-4">Crea un combo para vender productos juntos con descuento.</p>
              <Link href="/admin/combos/nuevo">
                <Button>
                  <Plus size={16} /> Crear combo
                </Button>
              </Link>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  )
}
