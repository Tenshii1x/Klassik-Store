"use client"

import Image from "next/image"
import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"

interface Imagen {
  id: string
  url: string
  tipo: string
  watermark_limpio: boolean
}

interface Props {
  imagenes: Imagen[]
  nombre: string
  activeUrl?: string | null
  onSelectUrl?: (url: string) => void
  extraImages?: Imagen[]
}

export function ProductoGaleria({ imagenes, nombre, activeUrl, onSelectUrl, extraImages }: Props) {
  const clean = useMemo(() => {
    const base = imagenes.filter((i) => i.watermark_limpio)
    if (!extraImages?.length) return base
    const baseUrls = new Set(base.map((i) => i.url))
    const extras = extraImages.filter((i) => !baseUrls.has(i.url))
    return [...extras, ...base]
  }, [imagenes, extraImages])

  const isControlled = activeUrl !== undefined && onSelectUrl !== undefined
  const [internalIdx, setInternalIdx] = useState(0)

  const activeIdx = isControlled
    ? Math.max(0, clean.findIndex((i) => i.url === activeUrl))
    : internalIdx

  if (clean.length === 0) {
    return (
      <div className="aspect-square bg-gradient-to-br from-gold-deep/30 to-black rounded-md flex items-center justify-center text-muted">
        Sin imágenes
      </div>
    )
  }

  const current = clean[activeIdx] ?? clean[0]

  function selectIdx(idx: number) {
    if (isControlled) {
      onSelectUrl!(clean[idx].url)
    } else {
      setInternalIdx(idx)
    }
  }

  return (
    <div className="space-y-3">
      <div className="aspect-square relative bg-black rounded-md overflow-hidden">
        {current.tipo === "video" ? (
          <video src={current.url} controls className="w-full h-full object-contain" />
        ) : (
          <Image
            key={current.url}
            src={current.url}
            alt={nombre}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover transition-opacity duration-150"
            priority
          />
        )}
      </div>
      {clean.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {clean.map((img, idx) => (
            <button
              key={img.id || img.url}
              type="button"
              onClick={() => selectIdx(idx)}
              className={cn(
                "aspect-square relative rounded-md overflow-hidden border-2 transition-colors",
                idx === activeIdx ? "border-gold-primary" : "border-border hover:border-border-strong"
              )}
            >
              {img.tipo === "video" ? (
                <video src={img.url} className="w-full h-full object-cover" muted />
              ) : (
                <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
