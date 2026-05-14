import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://klassik-store-one.vercel.app"
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: ["/admin/", "/pedido/", "/api/", "/checkout"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
