import { Topbar } from "@/components/admin/topbar"
import { Button } from "@/components/ui/button"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Plus } from "lucide-react"
import { ProductosFilters } from "@/components/admin/tables/ProductosFilters"
import { ProductosTable } from "@/components/admin/tables/ProductosTable"

interface SearchParams {
  q?: string
  estado?: string
  modo?: string
  seccion?: string
}

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createSupabaseServerClient()

  let query = supabase
    .from("productos")
    .select(
      "id, nombre, modelo, estado, modo, stock_unidades, precio_venta, precio_anterior, destacado, secciones(nombre), producto_imagenes(url)"
    )
    .order("updated_at", { ascending: false })
    .limit(100)

  if (params.q) query = query.or(`nombre.ilike.%${params.q}%,modelo.ilike.%${params.q}%`)
  if (params.estado) query = query.eq("estado", params.estado)
  if (params.modo) query = query.eq("modo", params.modo)
  if (params.seccion) query = query.eq("seccion_id", params.seccion)

  const [{ data: productos }, { data: secciones }] = await Promise.all([
    query,
    supabase.from("secciones").select("id, nombre").order("orden"),
  ])

  return (
    <div>
      <Topbar
        title="Productos"
        subtitle={`${productos?.length ?? 0} productos`}
        actions={
          <Link href="/admin/productos/nuevo">
            <Button size="md">
              <Plus size={16} />
              Nuevo producto
            </Button>
          </Link>
        }
      />
      <ProductosFilters secciones={secciones || []} />
      <ProductosTable productos={(productos as never) ?? []} />
    </div>
  )
}
