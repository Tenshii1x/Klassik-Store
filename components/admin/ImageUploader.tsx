"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { uploadFile, deleteFile, pathFromUrl } from "@/lib/storage/upload"
import { Upload, X } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

interface ImageUploaderProps {
  bucket: "productos" | "configuracion"
  pathPrefix: string
  value: string | null
  onChange: (url: string | null) => void
  label?: string
  accept?: string
}

export function ImageUploader({
  bucket,
  pathPrefix,
  value,
  onChange,
  label = "Imagen",
  accept = "image/*",
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split(".").pop() || "jpg"
    const path = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { url, error } = await uploadFile(bucket, path, file)
    setUploading(false)
    if (error) {
      toast.error(`Error subiendo imagen: ${error}`)
      return
    }
    onChange(url)
    toast.success("Imagen subida")
  }

  async function handleRemove() {
    if (!value) return
    const path = pathFromUrl(value, bucket)
    if (path) await deleteFile(bucket, path)
    onChange(null)
  }

  return (
    <div>
      <label className="eyebrow block mb-1.5">{label}</label>
      <div className="space-y-2">
        {value ? (
          <div className="relative w-40 h-40 rounded-md overflow-hidden border border-border">
            <Image src={value} alt="" fill className="object-cover" sizes="160px" />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-1 right-1 bg-black/80 text-white p-1 rounded-full hover:bg-danger"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="w-40 h-40 rounded-md border-2 border-dashed border-border-strong flex items-center justify-center text-muted">
            Sin imagen
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Upload size={14} />
          {uploading ? "Subiendo..." : value ? "Reemplazar" : "Subir imagen"}
        </Button>
      </div>
    </div>
  )
}
