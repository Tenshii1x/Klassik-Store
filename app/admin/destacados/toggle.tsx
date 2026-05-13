"use client"

import { useTransition } from "react"
import Image from "next/image"
import { toggleDestacado } from "./actions"
import { toast } from "sonner"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  id: string
  nombre: string
  imagenUrl: string | null
  destacado: boolean
}

export function DestacadosToggle({ id, nombre, imagenUrl, destacado }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const result = await toggleDestacado(id, !destacado)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(destacado ? "Removido de destacados" : "Agregado a destacados")
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        "relative aspect-square rounded-md overflow-hidden border-2 transition-colors",
        destacado ? "border-gold-primary" : "border-border hover:border-border-strong"
      )}
    >
      {imagenUrl ? (
        <Image src={imagenUrl} alt={nombre} fill className="object-cover" sizes="200px" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-gold-deep/30 to-black" />
      )}
      <div className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-end p-2">
        <span className="text-white text-xs">{nombre}</span>
      </div>
      {destacado && (
        <div className="absolute top-1 right-1 bg-gold-primary text-black rounded-full p-1">
          <Star size={12} fill="currentColor" />
        </div>
      )}
    </button>
  )
}
