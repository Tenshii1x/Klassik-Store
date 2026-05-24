"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { ImageIcon, Upload, X } from "lucide-react"
import { uploadFile, deleteFile, pathFromUrl } from "@/lib/storage/upload"
import { toast } from "sonner"

interface ImagenGaleria {
  id: string
  url: string
  tipo: string
}

interface Props {
  imagenes: ImagenGaleria[]
  productoId: string
  uploadTarget: "new" | string
  currentUrl: string | null
  onSelect: (url: string | null) => void
}

export function VariantImagenPicker({
  imagenes,
  productoId,
  uploadTarget,
  currentUrl,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const imagenesSoloFoto = imagenes.filter((i) => i.tipo === "imagen")

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="block w-12 h-12 cursor-pointer relative group"
      >
        {currentUrl ? (
          <div className="relative w-12 h-12 rounded overflow-hidden border border-gold-primary/40 group-hover:border-gold-primary">
            <Image src={currentUrl} alt="" fill className="object-cover" sizes="48px" />
          </div>
        ) : (
          <div className="w-12 h-12 rounded border border-dashed border-gold-deep/40 bg-gold-deep/5 flex items-center justify-center text-gold-deep group-hover:border-gold-primary group-hover:text-gold-primary">
            <ImageIcon size={16} />
          </div>
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-14 z-50 w-72 bg-black border border-border-strong rounded-md shadow-deep p-3 space-y-3">
          <div className="eyebrow">Elegir foto del producto</div>
          {imagenesSoloFoto.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {imagenesSoloFoto.map((img) => {
                const isCurrent = img.url === currentUrl
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => {
                      onSelect(img.url)
                      setOpen(false)
                    }}
                    className={`relative aspect-square rounded overflow-hidden border-2 transition-colors ${
                      isCurrent ? "border-gold-primary" : "border-border hover:border-gold-primary/60"
                    }`}
                  >
                    <Image src={img.url} alt="" fill className="object-cover" sizes="56px" />
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="text-muted text-xs italic">
              Sin fotos en la galería del producto. Sube primero las fotos generales o usa &ldquo;Subir foto nueva&rdquo; abajo.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
