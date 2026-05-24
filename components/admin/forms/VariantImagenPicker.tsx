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

  async function handleFile(file: File) {
    if (uploading) return
    const prev = currentUrl
    setUploading(true)
    const ext = file.name.split(".").pop() || "jpg"
    const idPart = uploadTarget === "new" ? "nueva" : uploadTarget
    const path = `productos/${productoId}/variantes/${idPart}-${Date.now()}.${ext}`
    const { url, error } = await uploadFile("productos", path, file)
    setUploading(false)
    if (error) {
      toast.error(`Error subiendo: ${error}`)
      return
    }
    if (prev && prev !== url) {
      const esDeGaleria = imagenes.some((i) => i.url === prev)
      if (!esDeGaleria) {
        const prevPath = pathFromUrl(prev, "productos")
        if (prevPath) await deleteFile("productos", prevPath)
      }
    }
    onSelect(url)
    setOpen(false)
  }

  async function handleRemove() {
    if (currentUrl) {
      const esDeGaleria = imagenes.some((i) => i.url === currentUrl)
      if (!esDeGaleria) {
        const prevPath = pathFromUrl(currentUrl, "productos")
        if (prevPath) await deleteFile("productos", prevPath)
      }
    }
    onSelect(null)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={currentUrl ? "Cambiar imagen de variante" : "Elegir imagen de variante"}
        aria-expanded={open}
        aria-haspopup="dialog"
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
              {imagenesSoloFoto.map((img, idx) => {
                const isCurrent = img.url === currentUrl
                return (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => {
                      onSelect(img.url)
                      setOpen(false)
                    }}
                    aria-label={`Elegir foto ${idx + 1}${isCurrent ? " (actual)" : ""}`}
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
          <div className="border-t border-border pt-3">
            <label className="block">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  await handleFile(file)
                  e.target.value = ""
                }}
              />
              <span className={`flex items-center justify-center gap-2 text-sm text-gold-primary border border-gold-primary/40 rounded-md py-2 hover:bg-gold-primary/10 ${uploading ? "opacity-60 pointer-events-none cursor-not-allowed" : "cursor-pointer"}`}>
                {uploading ? (
                  <span className="text-xs">Subiendo...</span>
                ) : (
                  <>
                    <Upload size={14} />
                    Subir foto nueva
                  </>
                )}
              </span>
            </label>
          </div>
          {currentUrl && (
            <button
              type="button"
              onClick={handleRemove}
              className="w-full text-xs text-danger hover:underline flex items-center justify-center gap-1"
            >
              <X size={12} /> Quitar imagen
            </button>
          )}
        </div>
      )}
    </div>
  )
}
