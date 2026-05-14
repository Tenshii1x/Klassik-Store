import type { MetadataRoute } from "next"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://klassik-store-one.vercel.app"
  const supabase = await createSupabaseServerClient()

  const [{ data: productos }, { data: secciones }] = await Promise.all([
    supabase
      .from("productos")
      .select("slug, updated_at")
      .eq("estado", "publicado")
      .order("updated_at", { ascending: false }),
    supabase
      .from("secciones")
      .select("slug, updated_at")
      .eq("activa", true),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/buscar`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/para-ella`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/para-el`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${baseUrl}/contacto`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/como-comprar`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/politicas`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ]

  const productRoutes: MetadataRoute.Sitemap = (productos || []).map((p) => ({
    url: `${baseUrl}/producto/${p.slug}`,
    lastModified: new Date(p.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }))

  const seccionRoutes: MetadataRoute.Sitemap = (secciones || []).map((s) => ({
    url: `${baseUrl}/seccion/${s.slug}`,
    lastModified: new Date(s.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }))

  return [...staticRoutes, ...seccionRoutes, ...productRoutes]
}
