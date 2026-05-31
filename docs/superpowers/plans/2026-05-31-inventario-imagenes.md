# Ajuste de Inventario + Pegar Imágenes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar una vista de ajuste rápido de inventario y soporte de pegar imágenes desde portapapeles en la galería de productos.

**Architecture:** Feature 1 usa un server component que pasa datos a un client component con estado local de cambios pendientes y un server action para el bulk update. Feature 2 modifica `ProductoImagenesGaleria` para interceptar paste events a nivel de documento y mostrar un banner orientador cuando no hay imágenes.

**Tech Stack:** Next.js 14 App Router, Supabase, TypeScript, Tailwind CSS, Lucide React, Server Actions

---

## Mapa de archivos

| Acción | Ruta |
|---|---|
| Crear | `app/admin/inventario/actions.ts` |
| Crear | `app/admin/inventario/page.tsx` |
| Crear | `components/admin/AjusteInventarioTable.tsx` |
| Modificar | `components/admin/sidebar.tsx` |
| Modificar | `components/admin/forms/ProductoImagenesGaleria.tsx` |

---

## Task 1: Server action + sidebar para inventario

**Files:**
- Create: `app/admin/inventario/actions.ts`
- Modify: `components/admin/sidebar.tsx`

- [ ] **Step 1: Crear el server action**

Crear `app/admin/inventario/actions.ts`:

```typescript
"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function actualizarStocks(cambios: { id: string; stock: number }[]) {
  if (!cambios.length) return
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autorizado")

  await Promise.all(
    cambios.map(({ id, stock }) =>
      supabase.from("productos").update({ stock_unidades: stock }).eq("id", id)
    )
  )

  revalidatePath("/admin/inventario")
  revalidatePath("/admin/productos")
  revalidatePath("/", "layout")
}
```

- [ ] **Step 2: Agregar "Inventario" al sidebar**

En `components/admin/sidebar.tsx`, agregar `Layers` a los imports de lucide-react:

```typescript
import {
  LayoutDashboard,
  Package,
  Tags,
  Star,
  ShoppingBag,
  TrendingUp,
  Truck,
  Settings,
  Download,
  Megaphone,
  Puzzle,
  Save,
  ShoppingCart,
  Layers,
} from "lucide-react"
```

En el grupo `"Catálogo"`, agregar el item después de "Combos":

```typescript
  {
    title: "Catálogo",
    items: [
      { label: "Productos", href: "/admin/productos", icon: Package },
      { label: "Secciones", href: "/admin/secciones", icon: Tags },
      { label: "Destacados", href: "/admin/destacados", icon: Star },
      { label: "Etiquetas", href: "/admin/etiquetas", icon: Tags },
      { label: "Combos", href: "/admin/combos", icon: Package },
      { label: "Inventario", href: "/admin/inventario", icon: Layers },
    ],
  },
```

- [ ] **Step 3: Verificar TypeScript**

```powershell
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```powershell
git add app/admin/inventario/actions.ts components/admin/sidebar.tsx
git commit -m "feat(inventario): server action actualizarStocks y link en sidebar"
```

---

## Task 2: AjusteInventarioTable + página de inventario

**Files:**
- Create: `components/admin/AjusteInventarioTable.tsx`
- Create: `app/admin/inventario/page.tsx`

- [ ] **Step 1: Crear AjusteInventarioTable**

Crear `components/admin/AjusteInventarioTable.tsx`:

```typescript
"use client"

import { useState, useTransition } from "react"
import { Save } from "lucide-react"
import { Card } from "@/components/ui/card"
import { actualizarStocks } from "@/app/admin/inventario/actions"
import { formatUSD } from "@/lib/utils"
import { toast } from "sonner"

interface Producto {
  id: string
  nombre: string
  stock_unidades: number | null
  precio_venta: number
  costo_temu: number
  costo_envio_unitario: number
}

interface Props {
  productos: Producto[]
}

export function AjusteInventarioTable({ productos }: Props) {
  const [cambios, setCambios] = useState<Record<string, string>>({})
  const [isPending, startTransition] = useTransition()

  const cantidadCambios = Object.values(cambios).filter((v) => v !== "").length

  function handleChange(id: string, value: string) {
    setCambios((prev) => ({ ...prev, [id]: value }))
  }

  function handleGuardar() {
    const payload = Object.entries(cambios)
      .filter(([, v]) => v !== "" && !isNaN(Number(v)) && Number(v) >= 0)
      .map(([id, v]) => ({ id, stock: Math.floor(Number(v)) }))

    if (!payload.length) return

    startTransition(async () => {
      try {
        await actualizarStocks(payload)
        toast.success(
          `${payload.length} producto${payload.length > 1 ? "s" : ""} actualizado${payload.length > 1 ? "s" : ""}`
        )
        setCambios({})
      } catch {
        toast.error("Error al guardar los cambios")
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {cantidadCambios > 0 ? (
          <span className="text-sm text-gold-primary">
            {cantidadCambios} producto{cantidadCambios > 1 ? "s" : ""} modificado{cantidadCambios > 1 ? "s" : ""}
          </span>
        ) : (
          <span className="text-sm text-muted">
            Escribe el nuevo stock en los productos que cambiaron
          </span>
        )}
        <button
          onClick={handleGuardar}
          disabled={cantidadCambios === 0 || isPending}
          className="flex items-center gap-2 px-4 py-2 bg-gold-primary text-black text-sm font-semibold rounded-md hover:bg-gold-primary/90 transition-colors disabled:opacity-40"
        >
          <Save size={14} />
          {isPending ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted text-xs uppercase tracking-wider">
              <tr className="border-b border-border">
                <th className="text-left p-3">Producto</th>
                <th className="text-right p-3">Stock actual</th>
                <th className="text-right p-3 w-36">Nuevo stock</th>
                <th className="text-right p-3">Precio venta</th>
                <th className="text-right p-3">Costo</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => {
                const costo = Number(p.costo_temu) + Number(p.costo_envio_unitario)
                const valorNuevo = cambios[p.id] ?? ""
                const tieneCambio = valorNuevo !== ""
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-border last:border-0 transition-colors ${
                      tieneCambio ? "bg-gold-primary/5" : ""
                    }`}
                  >
                    <td className="p-3 text-white">{p.nombre}</td>
                    <td className="p-3 text-right">
                      <span className={(p.stock_unidades ?? 0) === 0 ? "text-danger" : "text-white"}>
                        {p.stock_unidades ?? 0}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={valorNuevo}
                        onChange={(e) => handleChange(p.id, e.target.value)}
                        placeholder={String(p.stock_unidades ?? 0)}
                        className="w-24 bg-black border border-border rounded px-2 py-1 text-white text-right text-sm focus:outline-none focus:border-gold-primary"
                      />
                    </td>
                    <td className="p-3 text-right text-white">{formatUSD(Number(p.precio_venta))}</td>
                    <td className="p-3 text-right text-muted">{formatUSD(costo)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Crear la página de inventario**

Crear `app/admin/inventario/page.tsx`:

```typescript
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Topbar } from "@/components/admin/topbar"
import { AjusteInventarioTable } from "@/components/admin/AjusteInventarioTable"

export const dynamic = "force-dynamic"

export default async function InventarioPage() {
  const supabase = await createSupabaseServerClient()
  const { data: productos } = await supabase
    .from("productos")
    .select("id, nombre, stock_unidades, precio_venta, costo_temu, costo_envio_unitario")
    .eq("estado", "publicado")
    .eq("modo", "stock")
    .order("nombre")

  return (
    <div className="space-y-6">
      <Topbar
        title="Ajuste de inventario"
        subtitle="Actualiza el stock de varios productos a la vez"
      />
      <AjusteInventarioTable productos={productos ?? []} />
    </div>
  )
}
```

- [ ] **Step 3: Verificar TypeScript**

```powershell
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```powershell
git add components/admin/AjusteInventarioTable.tsx app/admin/inventario/page.tsx
git commit -m "feat(inventario): pagina de ajuste rapido de stock con edicion en tabla"
```

---

## Task 3: Paste desde portapapeles + banner en ProductoImagenesGaleria

**Files:**
- Modify: `components/admin/forms/ProductoImagenesGaleria.tsx`

La galería actual tiene su lógica de upload en `handleFiles`. Este task extrae esa lógica a una función compartida `uploadFiles`, agrega un paste listener a nivel de documento, y muestra un banner cuando no hay imágenes.

- [ ] **Step 1: Leer el archivo actual**

Leer `components/admin/forms/ProductoImagenesGaleria.tsx` para entender la estructura completa antes de modificar.

- [ ] **Step 2: Extraer uploadFiles y agregar handlePaste**

Reemplazar la función `handleFiles` existente (líneas 97-116) y agregar las nuevas funciones. En la función `ProductoImagenesGaleria`, después de declarar `const [uploading, setUploading] = useState(false)` y antes del primer `useEffect`, agregar un `useRef` para el handler de paste:

```typescript
  const uploadFilesRef = useRef<((files: File[]) => Promise<void>) | null>(null)
```

Luego reemplazar la función `handleFiles` existente con estas tres funciones:

```typescript
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
```

- [ ] **Step 3: Agregar useEffect para el paste listener y mantener la ref actualizada**

Después de los `useEffect` existentes (el que hace `setItems(initial)`), agregar:

```typescript
  useEffect(() => {
    uploadFilesRef.current = uploadFiles
  })

  useEffect(() => {
    document.addEventListener("paste", handlePasteEvent)
    return () => document.removeEventListener("paste", handlePasteEvent)
  }, [])
```

- [ ] **Step 4: Agregar banner y actualizar el hint**

En el JSX del return, antes del `<DndContext>`, agregar el banner condicional:

```typescript
      {items.length === 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-gold-primary/10 border border-gold-primary/30 rounded-md text-gold-primary text-xs">
          <Upload size={14} />
          Producto guardado. Ahora agrega las imágenes — arrastra archivos, haz click en &quot;Agregar&quot; o pega con Ctrl+V.
        </div>
      )}
```

Reemplazar el párrafo de ayuda al final (línea ~169):

```typescript
      <p className="text-muted text-xs">
        Arrastra para reordenar. El primer archivo es la portada — usa el botón <Star size={10} className="inline" /> para cambiarla. Antes de publicar, marca cada imagen como &ldquo;limpia&rdquo; (sin watermark visible). También puedes pegar imágenes con <kbd className="bg-black border border-border rounded px-1">Ctrl+V</kbd>.
      </p>
```

- [ ] **Step 5: Verificar TypeScript**

```powershell
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```powershell
git add components/admin/forms/ProductoImagenesGaleria.tsx
git commit -m "feat(productos): pegar imagenes con Ctrl+V y banner orientador en galeria"
```

---

## Verificación final

- [ ] Abrir `/admin/inventario` — verificar tabla con productos y sus stocks
- [ ] Editar el stock de 2-3 productos → verificar que el contador "X productos modificados" aparece
- [ ] Guardar → verificar toast de éxito y que los inputs se limpian
- [ ] Abrir `/admin/productos/{id}` → tomar un screenshot → Ctrl+V en la página → verificar que sube
- [ ] Crear un producto nuevo → al guardar, verificar que aparece el banner amarillo en la galería
- [ ] Push: `git push origin main`
