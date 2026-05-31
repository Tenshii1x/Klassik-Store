"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { uploadFile, deleteFile, pathFromUrl } from "@/lib/storage/upload"
import {
  addProductoImagen,
  removeProductoImagen,
  reorderProductoImagenes,
  markImagenWatermarkLimpio,
} from "@/app/admin/productos/actions"
import { toast } from "sonner"
import { Upload, X, AlertTriangle, Check, GripVertical, Star } from "lucide-react"
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

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
  const uploadFilesRef = useRef<((files: File[]) => Promise<void>) | null>(null)
  const [items, setItems] = useState<Imagen[]>(initial)

  useEffect(() => {
    setItems(initial)
  }, [initial])

  useEffect(() => {
    uploadFilesRef.current = uploadFiles
  })

  useEffect(() => {
    document.addEventListener("paste", handlePasteEvent)
    return () => document.removeEventListener("paste", handlePasteEvent)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function persistOrder(next: Imagen[]) {
    const result = await reorderProductoImagenes(
      productoId,
      next.map((i) => i.id)
    )
    if (result.error) {
      toast.error(result.error)
      setItems(initial)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const next = arrayMove(items, oldIndex, newIndex)
    setItems(next)
    startTransition(() => {
      persistOrder(next)
    })
  }

  function handleMakeCover(img: Imagen) {
    const idx = items.findIndex((i) => i.id === img.id)
    if (idx <= 0) return
    const next = [img, ...items.filter((i) => i.id !== img.id)]
    setItems(next)
    startTransition(() => {
      persistOrder(next)
    })
  }

  async function uploadFiles(files: File[]) {
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

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    uploadFiles(Array.from(e.target.files || []))
  }

  function handlePasteEvent(e: ClipboardEvent) {
    const active = document.activeElement
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return
    const files: File[] = []
    const clipItems = e.clipboardData?.items
    if (!clipItems) return
    for (let i = 0; i < clipItems.length; i++) {
      const item = clipItems[i]
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile()
        if (!file) continue
        const extMap: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }
        const ext = extMap[item.type] ?? "png"
        files.push(new File([file], `paste-${Date.now()}.${ext}`, { type: item.type }))
      }
    }
    if (files.length > 0) uploadFilesRef.current?.(files)
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
      {items.length === 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gold-primary/10 border border-gold-primary/30 rounded-md text-gold-primary text-xs">
          <Upload size={14} />
          Producto guardado. Ahora agrega las imágenes — arrastra archivos, haz click en &quot;Agregar&quot; o pega con Ctrl+V.
        </div>
      )}
      <label className="eyebrow block">Galería · {items.length} archivos</label>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {items.map((img, idx) => (
              <SortableImagen
                key={img.id}
                img={img}
                isCover={idx === 0}
                isPending={isPending}
                onMakeCover={() => handleMakeCover(img)}
                onToggleLimpio={() => handleToggleLimpio(img)}
                onRemove={() => handleRemove(img)}
              />
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
        </SortableContext>
      </DndContext>
      <input ref={inputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFiles} />
      <p className="text-muted text-xs">
        Arrastra para reordenar. El primer archivo es la portada — usa el botón <Star size={10} className="inline" /> para cambiarla. Antes de publicar, marca cada imagen como &ldquo;limpia&rdquo; (sin watermark visible). También puedes pegar imágenes con <kbd className="bg-black border border-border rounded px-1">Ctrl+V</kbd>.
      </p>
    </div>
  )
}

interface ItemProps {
  img: Imagen
  isCover: boolean
  isPending: boolean
  onMakeCover: () => void
  onToggleLimpio: () => void
  onRemove: () => void
}

function SortableImagen({ img, isCover, isPending, onMakeCover, onToggleLimpio, onRemove }: ItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: img.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative aspect-square rounded-md overflow-hidden border bg-black group ${
        isDragging ? "border-gold-primary shadow-deep opacity-90" : "border-border"
      }`}
    >
      {img.tipo === "video" ? (
        <video src={img.url} className="w-full h-full object-cover pointer-events-none" muted />
      ) : (
        <Image src={img.url} alt="" fill className="object-cover pointer-events-none" sizes="200px" />
      )}

      {isCover && (
        <span className="absolute top-1 left-1 bg-gold-primary text-black text-[0.6rem] px-1.5 py-0.5 rounded-full font-bold z-10">
          PORTADA
        </span>
      )}

      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Arrastrar para reordenar"
        className="absolute top-1 right-1 z-20 bg-black/80 text-white rounded p-1.5 cursor-grab active:cursor-grabbing touch-none hover:bg-black/95 hover:text-gold-primary transition-colors"
      >
        <GripVertical size={14} />
      </button>

      <div className="absolute bottom-1 left-1 z-10">
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

      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 pointer-events-none">
        {!isCover && (
          <button
            type="button"
            onClick={onMakeCover}
            className="pointer-events-auto text-black text-xs px-3 py-1 rounded bg-gold-primary hover:bg-gold-light font-semibold flex items-center gap-1"
            disabled={isPending}
          >
            <Star size={12} /> Hacer portada
          </button>
        )}
        <button
          type="button"
          onClick={onToggleLimpio}
          className="pointer-events-auto text-white text-xs px-3 py-1 rounded bg-success/20 border border-success hover:bg-success/30"
          disabled={isPending}
        >
          {img.watermark_limpio ? "Marcar pendiente" : "Marcar limpia"}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="pointer-events-auto text-white text-xs px-3 py-1 rounded bg-danger/20 border border-danger hover:bg-danger/30"
          disabled={isPending}
        >
          <X size={12} className="inline" /> Borrar
        </button>
      </div>
    </div>
  )
}
