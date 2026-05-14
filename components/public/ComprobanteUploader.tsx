"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { createSupabaseBrowserClient } from "@/lib/supabase/browser"
import { Upload, Check, X } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

interface Props {
  value: string | null
  onChange: (url: string | null) => void
}

export function ComprobanteUploader({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen debe pesar menos de 5 MB")
      return
    }
    setUploading(true)
    const supabase = createSupabaseBrowserClient()
    const ext = (file.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "").slice(0, 5)
    const path = `inicial/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const { error } = await supabase.storage.from("comprobantes").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    })
    if (error) {
      toast.error(`Error subiendo: ${error.message}`)
      setUploading(false)
      return
    }
    const { data: signed } = await supabase.storage
      .from("comprobantes")
      .createSignedUrl(path, 365 * 24 * 3600)
    setUploading(false)
    if (!signed?.signedUrl) {
      toast.error("No se pudo generar URL del comprobante")
      return
    }
    onChange(signed.signedUrl)
    toast.success("Comprobante subido")
  }

  function handleRemove() {
    onChange(null)
  }

  if (value) {
    return (
      <div className="space-y-2">
        <div className="relative w-40 h-40 rounded-md overflow-hidden border border-success">
          <Image src={value} alt="comprobante" fill className="object-cover" sizes="160px" />
          <div className="absolute top-1 right-1 bg-success text-black p-1 rounded-full">
            <Check size={14} />
          </div>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
          <X size={14} /> Quitar comprobante
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full p-6 border-2 border-dashed border-border-strong rounded-md text-center hover:border-gold-primary transition-colors text-muted hover:text-gold-primary"
      >
        <Upload className="mx-auto mb-2" size={24} />
        <div className="text-sm">{uploading ? "Subiendo..." : "Sube captura del comprobante"}</div>
        <div className="text-xs text-muted mt-1">JPG o PNG, max 5 MB</div>
      </button>
    </div>
  )
}
