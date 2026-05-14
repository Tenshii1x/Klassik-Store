import type { ReactNode } from "react"

interface Producto {
  nombre: string
  descripcion: string | null
  modelo: string | null
  precio_venta: number
  precio_anterior: number | null
  modo: string
  stock_unidades: number | null
  slug: string
  producto_imagenes?: { url: string }[]
}

interface Props {
  producto: Producto
  baseUrl: string
  storeName: string
}

export function ProductSchemaData({ producto, baseUrl, storeName }: Props): ReactNode {
  const availability =
    producto.modo === "stock" && (producto.stock_unidades ?? 0) === 0
      ? "https://schema.org/OutOfStock"
      : producto.modo === "preorden"
      ? "https://schema.org/PreOrder"
      : "https://schema.org/InStock"

  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: producto.nombre,
    description: producto.descripcion?.slice(0, 5000) || `${producto.nombre} en ${storeName}.`,
    sku: producto.modelo || undefined,
    image: (producto.producto_imagenes || []).map((i) => i.url),
    brand: {
      "@type": "Brand",
      name: storeName,
    },
    offers: {
      "@type": "Offer",
      url: `${baseUrl}/producto/${producto.slug}`,
      priceCurrency: "USD",
      price: producto.precio_venta,
      availability,
      seller: {
        "@type": "Organization",
        name: storeName,
      },
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
