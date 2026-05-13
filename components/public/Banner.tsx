import { getConfiguracion } from "@/lib/catalog/queries"
import Link from "next/link"

export async function Banner() {
  const config = await getConfiguracion()
  if (!config?.banner_activo || !config.banner_texto) return null
  return (
    <div
      className="w-full text-center py-2.5 px-4 text-sm font-semibold"
      style={{ backgroundColor: config.banner_color ?? "#c9a86a", color: "#0a0a0a" }}
    >
      {config.banner_texto}
      {config.banner_cta_texto && config.banner_cta_url && (
        <Link href={config.banner_cta_url} className="ml-3 underline">
          {config.banner_cta_texto}
        </Link>
      )}
    </div>
  )
}
