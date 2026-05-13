"use client"

import Image from "next/image"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface Imagen {
  id: string
  url: string
  tipo: string
  watermark_limpio: boolean
}

export function ProductoGaleria({ imagenes, nombre }: { imagenes: Imagen[]; nombre: string }) {
  const clean = imagenes.filter((i) => i.watermark_limpio)
  const [active, setActive] = useState(0)

  if (clean.length === 0) {
    return (
      <div className="aspect-square bg-gradient-to-br from-gold-deep/30 to-black rounded-md flex items-center justify-center text-muted">
        Sin imágenes
      </div>
    )
  }

  const current = clean[active]

  return (
    <div className="space-y-3">
      <div className="aspect-square relative bg-black rounded-md overflow-hidden">
        {current.tipo === "video" ? (
          <video src={current.url} controls className="w-full h-full object-contain" />
        ) : (
          <Image src={current.url} alt={nombre} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" priority />
        )}
      </div>
      {clean.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {clean.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(idx)}
              className={cn(
                "aspect-square relative rounded-md overflow-hidden border-2 transition-colors",
                idx === active ? "border-gold-primary" : "border-border hover:border-border-strong"
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
