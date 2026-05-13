import { Topbar } from "@/components/admin/topbar"
import { BannerForm } from "@/components/admin/forms/BannerForm"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export default async function BannerPage() {
  const supabase = await createSupabaseServerClient()
  const { data: config } = await supabase
    .from("configuracion")
    .select("banner_activo, banner_texto, banner_cta_texto, banner_cta_url, banner_color")
    .eq("id", 1)
    .single()

  return (
    <div className="max-w-3xl">
      <Topbar
        title="Banner promocional"
        subtitle="Tira superior visible en todo el catálogo público"
      />
      <BannerForm
        initial={{
          banner_activo: config?.banner_activo ?? false,
          banner_texto: config?.banner_texto ?? null,
          banner_cta_texto: config?.banner_cta_texto ?? null,
          banner_cta_url: config?.banner_cta_url ?? null,
          banner_color: config?.banner_color ?? "#c9a86a",
        }}
      />
    </div>
  )
}
