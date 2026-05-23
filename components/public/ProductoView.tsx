"use client"

import { useState, useMemo, useCallback } from "react"
import { ProductoGaleria } from "./ProductoGaleria"
import { ProductoInfo } from "./ProductoInfo"

interface Imagen {
  id: string
  url: string
  tipo: string
  watermark_limpio: boolean
  orden?: number
}

interface Variante {
  id: string
  tipo: string
  valor: string
  precio_extra: number
  stock_unidades: number | null
  imagen_url: string | null
}

interface ProductoData {
  id: string
  nombre: string
  descripcion: string | null
  modelo: string | null
  modo: string
  stock_unidades: number | null
  precio_venta: number
  precio_anterior: number | null
  fecha_llegada_inicio: string | null
  fecha_llegada_fin: string | null
  producto_imagenes: Imagen[]
  producto_variantes: Variante[]
}

export function ProductoView({ producto }: { producto: ProductoData }) {
  const imagenesLimpias = useMemo(
    () => producto.producto_imagenes.filter((i) => i.watermark_limpio),
    [producto.producto_imagenes]
  )

  const [activeUrl, setActiveUrl] = useState<string | null>(
    imagenesLimpias[0]?.url ?? null
  )
  const [extraImages, setExtraImages] = useState<Imagen[]>([])

  const handleVariantChange = useCallback(
    (v: Variante | null) => {
      if (!v?.imagen_url) return
      const inGaleria = imagenesLimpias.some((img) => img.url === v.imagen_url)
      if (inGaleria) {
        setActiveUrl(v.imagen_url)
        setExtraImages([])
      } else {
        const extra: Imagen = {
          id: `variante-${v.id}`,
          url: v.imagen_url,
          tipo: "imagen",
          watermark_limpio: true,
        }
        setExtraImages([extra])
        setActiveUrl(v.imagen_url)
      }
    },
    [imagenesLimpias]
  )

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
      <ProductoGaleria
        imagenes={producto.producto_imagenes}
        nombre={producto.nombre}
        activeUrl={activeUrl}
        onSelectUrl={setActiveUrl}
        extraImages={extraImages}
      />
      <ProductoInfo p={producto as never} onVariantChange={handleVariantChange} />
    </section>
  )
}
