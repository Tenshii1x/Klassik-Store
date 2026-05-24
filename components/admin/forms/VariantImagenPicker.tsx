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
          <div className="eyebrow">Elegir foto</div>
          <div className="text-muted text-xs">Popover funcional — contenido en próximos pasos.</div>
        </div>
      )}
    </div>
  )
}
