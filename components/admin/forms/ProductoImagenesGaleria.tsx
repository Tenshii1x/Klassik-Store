"use client"

import { useState, useRef, useTransition } from "react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { uploadFile, deleteFile, pathFromUrl } from "@/lib/storage/upload"
import {
  addProductoImagen,
  removeProductoImagen,
  markImagenWatermarkLimpio,
} from "@/app/admin/productos/actions"
import { toast } from "sonner"
import { Upload, X, AlertTriangle, Check } from "lucide-react"

interface Imagen {
  id: string
  url: string
  tipo: string
  watermark_limpio: boolean
  orden: number
}

interface Props {
  productoId: string
  initial: Imagen[]
}

export function ProductoImagenesGaleria({ productoId, initial }: Props) {
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    for (const file of files) {
      const ext = file.name.split(".").pop() || "jpg"
      const isVideo = file.type.startsWith("video/")
      const path = `productos/${productoId}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`
      const { url, error } = await uploadFile("productos", path, file)
      if (error) {
        toast.error(`Error con ${file.name}: ${error}`)
        continue
      }
      const result = await addProductoImagen(productoId, url!, isVideo ? "video" : "imagen", false)
      if (result.error) toast.error(result.error)
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ""
    toast.success("Multimedia subida. Marca como limpia cuando confirmes que no tiene watermark.")
  }

  function handleRemove(img: Imagen) {
    startTransition(async () => {
      const path = pathFromUrl(img.url, "productos")
      if (path) await deleteFile("productos", path)
      const result = await removeProductoImagen(img.id, productoId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Eliminada")
    })
  }

  function handleToggleLimpio(img: Imagen) {
    startTransition(async () => {
      const result = await markImagenWatermarkLimpio(img.id, productoId, !img.watermark_limpio)
      if (result.error) toast.error(result.error)
    })
  }

  return (
    <div className="space-y-3">
      <label className="eyebrow block">Galería · {initial.length} archivos</label>
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
        {initial.map((img, idx) => (
          <div
            key={img.id}
            className="relative aspect-square rounded-md overflow-hidden border border-border bg-black group"
          >
            {img.tipo === "video" ? (
              <video src={img.url} className="w-full h-full object-cover" muted />
            ) : (
              <Image src={img.url} alt="" fill className="object-cover" sizes="200px" />
            )}
            {idx === 0 && (
              <span className="absolute top-1 left-1 bg-gold-primary text-black text-[0.6rem] px-1.5 py-0.5 rounded-full font-bold">
                PORTADA
              </span>
            )}
            <div className="absolute bottom-1 left-1">
              {img.watermark_limpio ? (
                <Badge tone="success" className="text-[0.6rem]">
                  <Check size={10} /> Limpia
                </Badge>
              ) : (
                <Badge tone="warning" className="text-[0.6rem]">
                  <AlertTriangle size={10} /> Sin verificar
                </Badge>
              )}
            </div>
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleToggleLimpio(img)}
                className="text-white text-xs px-3 py-1 rounded bg-success/20 border border-success hover:bg-success/30"
                disabled={isPending}
              >
                {img.watermark_limpio ? "Marcar pendiente" : "Marcar limpia"}
              </button>
              <button
                type="button"
                onClick={() => handleRemove(img)}
                className="text-white text-xs px-3 py-1 rounded bg-danger/20 border border-danger hover:bg-danger/30"
                disabled={isPending}
              >
                <X size={12} className="inline" /> Borrar
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="aspect-square rounded-md border-2 border-dashed border-border-strong flex flex-col items-center justify-center gap-1 text-muted hover:border-gold-primary hover:text-gold-primary transition-colors"
        >
          <Upload size={20} />
          <span className="text-xs">{uploading ? "Subiendo..." : "Agregar"}</span>
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFiles} />
      <p className="text-muted text-xs">
        El primer archivo es la portada. Antes de publicar, marca cada imagen/video como &ldquo;limpia&rdquo; (sin watermark de origen visible).
      </p>
    </div>
  )
}
