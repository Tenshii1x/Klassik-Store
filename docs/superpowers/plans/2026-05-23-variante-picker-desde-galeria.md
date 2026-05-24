# Picker de imagen de variante desde galería — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir asignar como imagen de variante una foto que ya está en la galería del producto (en lugar de re-subirla), vía popover. El server protege archivos compartidos para no romper la galería.

**Architecture:** Componente nuevo `VariantImagenPicker` (popover manual sin Radix) encapsula el thumbnail + upload + selección desde galería. `ProductoVariantes` lo usa en modo edit y en bloque "agregar nueva". Server actions verifican `producto_imagenes` antes de borrar archivos del storage.

**Tech Stack:** Next.js 15 App Router, Server Actions, Supabase (Postgres + Storage), TypeScript, Tailwind, lucide-react, sonner.

**Spec:** `docs/superpowers/specs/2026-05-23-variante-picker-desde-galeria-design.md`

**Nota sobre tests:** Igual que la feature anterior — no hay infraestructura de tests para UI/server actions. Verificación manual al final de cada tarea con `npm run dev`.

---

## Task 1: Helper compartido para cleanup de imagen de variante

**Goal:** Extraer una función privada en `actions.ts` que decide si un archivo de variante puede borrarse del storage (no está compartido con la galería). Usada por `updateVariante` y `removeVariante` en las siguientes tareas.

**Files:**
- Modify: `app/admin/productos/actions.ts`

- [ ] **Step 1: Agregar helper privado**

En `app/admin/productos/actions.ts`, después de los imports y antes de las funciones públicas (alrededor de la línea 7-10), agrega:

```ts
async function tryDeleteVariantImage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  producto_id: string,
  url: string | null
): Promise<void> {
  if (!url) return

  const { data: galeriaRef } = await supabase
    .from("producto_imagenes")
    .select("id")
    .eq("producto_id", producto_id)
    .eq("url", url)
    .maybeSingle()

  if (galeriaRef) {
    return
  }

  const path = pathFromUrl(url, "productos")
  if (!path) return

  const { error: removeErr } = await supabase.storage.from("productos").remove([path])
  if (removeErr) {
    console.warn("[tryDeleteVariantImage] no se pudo borrar imagen:", path, removeErr.message)
  }
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: build pasa. Si falla por tipo de `supabase`, importa el tipo correcto o usa `any` temporalmente (NO — usa el `Awaited<ReturnType<...>>` como en el snippet).

- [ ] **Step 3: Commit**

```bash
git add app/admin/productos/actions.ts
git commit -m "refactor(admin): helper tryDeleteVariantImage protege archivos de galeria"
```

---

## Task 2: Usar el helper en `updateVariante` y `removeVariante`

**Goal:** Reemplazar la lógica inline de borrado en ambas funciones por el helper. Resultado neto: `updateVariante` y `removeVariante` ya no borran un archivo que está en `producto_imagenes`.

**Files:**
- Modify: `app/admin/productos/actions.ts`

- [ ] **Step 1: Reemplazar el bloque de cleanup en `updateVariante`**

En `updateVariante`, busca el bloque actual (alrededor de las líneas 215-225):

```ts
const previa = existing?.imagen_url ?? null
const nueva = parsed.data.imagen_url ?? null
if (previa && previa !== nueva) {
  const path = pathFromUrl(previa, "productos")
  if (path) {
    const { error: removeErr } = await supabase.storage.from("productos").remove([path])
    if (removeErr) {
      console.warn("[updateVariante] no se pudo borrar imagen anterior:", path, removeErr.message)
    }
  }
}
```

Reemplázalo por:

```ts
const previa = existing?.imagen_url ?? null
const nueva = parsed.data.imagen_url ?? null
if (previa && previa !== nueva) {
  await tryDeleteVariantImage(supabase, producto_id, previa)
}
```

- [ ] **Step 2: Reemplazar el bloque de cleanup en `removeVariante`**

En `removeVariante`, busca (alrededor de las líneas 247-255):

```ts
if (existing?.imagen_url) {
  const path = pathFromUrl(existing.imagen_url, "productos")
  if (path) {
    const { error: removeErr } = await supabase.storage.from("productos").remove([path])
    if (removeErr) {
      console.warn("[removeVariante] no se pudo borrar imagen:", path, removeErr.message)
    }
  }
}
```

Reemplázalo por:

```ts
await tryDeleteVariantImage(supabase, producto_id, existing?.imagen_url ?? null)
```

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: build pasa.

- [ ] **Step 4: Commit**

```bash
git add app/admin/productos/actions.ts
git commit -m "fix(admin): no borrar archivo de variante si esta en galeria del producto"
```

---

## Task 3: Crear componente `VariantImagenPicker` — esqueleto

**Goal:** Crear el archivo nuevo con el componente, props, estado y trigger (el thumbnail). Sin popover todavía — solo el shell para iterar en pasos pequeños.

**Files:**
- Create: `components/admin/forms/VariantImagenPicker.tsx`

- [ ] **Step 1: Crear el archivo con el esqueleto**

Crea `components/admin/forms/VariantImagenPicker.tsx`:

```tsx
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
    </div>
  )
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: build pasa. Hay un warning de `uploading`/`uploadTarget`/etc. sin usar — eso se resuelve en las siguientes tareas. Si Next falla el build por unused vars, agrega `// eslint-disable-next-line @typescript-eslint/no-unused-vars` SOLO si bloquea (preferible es seguir y agregar lógica enseguida en Task 4-5).

- [ ] **Step 3: Commit**

```bash
git add components/admin/forms/VariantImagenPicker.tsx
git commit -m "feat(admin): esqueleto VariantImagenPicker"
```

---

## Task 4: Popover — markup, click-outside, ESC

**Goal:** Agregar el panel del popover con click-outside y ESC. Contenido placeholder por ahora (lo llenamos en Task 5-6).

**Files:**
- Modify: `components/admin/forms/VariantImagenPicker.tsx`

- [ ] **Step 1: Agregar useEffect de click-outside + ESC**

Después del `useState` y `useRef`, antes del `return`, agrega:

```ts
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
```

- [ ] **Step 2: Agregar markup del popover**

En el return, ANTES del cierre `</div>` final del `rootRef`, agrega el bloque del popover:

```tsx
{open && (
  <div className="absolute left-0 top-14 z-50 w-72 bg-surface border border-border-strong rounded-md shadow-deep p-3 space-y-3">
    <div className="eyebrow">Elegir foto</div>
    <div className="text-muted text-xs">Popover funcional — contenido en próximos pasos.</div>
  </div>
)}
```

Nota: usa `bg-surface` si existe en el tema; si no, `bg-black`. Verifica abriendo otro componente del admin con popovers similares — si no encuentras, usa `bg-black`.

- [ ] **Step 3: Verify manual**

```bash
npm run dev
```

En el admin, en una variante existente, click lápiz → click thumbnail. Debe aparecer un panel pequeño con "Elegir foto" + el placeholder. Click fuera → cierra. Tecla ESC → cierra.

- [ ] **Step 4: Commit**

```bash
git add components/admin/forms/VariantImagenPicker.tsx
git commit -m "feat(admin): popover de VariantImagenPicker con click-outside y ESC"
```

---

## Task 5: Popover — grid de imágenes de galería

**Goal:** Reemplazar el placeholder del popover con el grid de fotos del producto.

**Files:**
- Modify: `components/admin/forms/VariantImagenPicker.tsx`

- [ ] **Step 1: Reemplazar el contenido del popover**

Busca el bloque actual:

```tsx
{open && (
  <div className="absolute left-0 top-14 z-50 w-72 bg-surface border border-border-strong rounded-md shadow-deep p-3 space-y-3">
    <div className="eyebrow">Elegir foto</div>
    <div className="text-muted text-xs">Popover funcional — contenido en próximos pasos.</div>
  </div>
)}
```

Reemplázalo por:

```tsx
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
```

- [ ] **Step 2: Agregar derived list arriba del return**

Antes del `return` (después del `useEffect`), agrega:

```ts
const imagenesSoloFoto = imagenes.filter((i) => i.tipo === "imagen")
```

- [ ] **Step 3: Verify manual**

`npm run dev` → admin → editar variante → click thumbnail. El popover ahora muestra las fotos del producto (solo imágenes, no videos). Si la variante ya tiene una foto que ES de la galería, esa foto tiene borde dorado. Click en otra foto → cambia el thumbnail en la fila (gracias a `onSelect`) y cierra el popover.

- [ ] **Step 4: Commit**

```bash
git add components/admin/forms/VariantImagenPicker.tsx
git commit -m "feat(admin): grid de fotos del producto en popover de variante"
```

---

## Task 6: Popover — botón "subir foto nueva" + "quitar imagen"

**Goal:** Completar el popover con upload + quitar. Manejo de cleanup local (borrar archivo previo si NO es de galería).

**Files:**
- Modify: `components/admin/forms/VariantImagenPicker.tsx`

- [ ] **Step 1: Agregar handler de upload**

Antes del `return`, después de `imagenesSoloFoto`, agrega:

```ts
async function handleFile(file: File) {
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
  if (currentUrl && currentUrl !== url) {
    const esDeGaleria = imagenes.some((i) => i.url === currentUrl)
    if (!esDeGaleria) {
      const prevPath = pathFromUrl(currentUrl, "productos")
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
```

- [ ] **Step 2: Agregar markup de upload + remove dentro del popover**

Dentro del `<div>` del popover, DESPUÉS del bloque del grid (después del `</div>` de cierre del `imagenesSoloFoto.length > 0 ? ... : ...`), antes del `</div>` final del popover, agrega:

```tsx
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
    <span className="flex items-center justify-center gap-2 text-sm text-gold-primary border border-gold-primary/40 rounded-md py-2 cursor-pointer hover:bg-gold-primary/10">
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
```

- [ ] **Step 3: Verify manual**

`npm run dev` → admin → editar variante → click thumbnail. Verifica:
- Click foto del grid → asigna esa foto + cierra popover.
- Click "Subir foto nueva" → file picker → spinner → asigna foto subida + cierra. (Verifica en Supabase Storage que el archivo se creó.)
- Si la variante tenía foto exclusiva (no de galería), al elegir otra foto la anterior se borra del bucket.
- Si la variante tenía foto DE galería, al elegir otra foto la anterior NO se borra (sigue en galería).
- Click "Quitar imagen" → thumbnail vuelve a placeholder + variante guardada queda sin imagen.

- [ ] **Step 4: Commit**

```bash
git add components/admin/forms/VariantImagenPicker.tsx
git commit -m "feat(admin): subir y quitar imagen desde popover de variante"
```

---

## Task 7: Integrar `VariantImagenPicker` en `ProductoVariantes` (modo edit + nueva)

**Goal:** Reemplazar los dos uploaders inline de `ProductoVariantes.tsx` por `<VariantImagenPicker>`. Eliminar la lógica de upload local que ahora vive en el Picker.

**Files:**
- Modify: `components/admin/forms/ProductoVariantes.tsx`
- Modify: `app/admin/productos/[id]/page.tsx`

- [ ] **Step 1: Agregar prop `imagenes` en `ProductoVariantes`**

En `components/admin/forms/ProductoVariantes.tsx`, busca la interfaz `Props`:

```ts
interface Props {
  productoId: string
  initial: Variante[]
}
```

Reemplázala por:

```ts
interface ImagenGaleria {
  id: string
  url: string
  tipo: string
}

interface Props {
  productoId: string
  initial: Variante[]
  imagenes: ImagenGaleria[]
}
```

Cambia la firma:

```ts
export function ProductoVariantes({ productoId, initial }: Props) {
```

a:

```ts
export function ProductoVariantes({ productoId, initial, imagenes }: Props) {
```

- [ ] **Step 2: Importar `VariantImagenPicker`**

Agrega arriba (con los otros imports):

```ts
import { VariantImagenPicker } from "./VariantImagenPicker"
```

- [ ] **Step 3: Eliminar `uploadingFor` y `uploadVarianteImagen`**

Borra el estado:

```ts
const [uploadingFor, setUploadingFor] = useState<"new" | string | null>(null)
```

Borra la función completa `async function uploadVarianteImagen(...) { ... }` (líneas ~52-67).

Borra los imports si ya no se usan en este archivo:

```ts
import { uploadFile, deleteFile, pathFromUrl } from "@/lib/storage/upload"
```

(Solo bórralo si no quedan otras referencias a esos símbolos en el archivo después de los siguientes pasos. Verifica con `grep`.)

- [ ] **Step 4: Reemplazar el uploader del modo edit**

Busca el bloque del modo edit que renderiza el uploader (el `<label className="block w-12 h-12 cursor-pointer relative group">` con su input file y los dos children — el de imagen actual y el de placeholder). Está dentro de la rama `editingId === v.id ? ( ... )`. Reemplaza el `<div className="col-span-1">` completo (que contiene ese label) por:

```tsx
<div className="col-span-1">
  <VariantImagenPicker
    imagenes={imagenes}
    productoId={productoId}
    uploadTarget={v.id}
    currentUrl={editDraft.imagen_url}
    onSelect={(url) => setEditDraft((prev) => ({ ...prev, imagen_url: url }))}
  />
</div>
```

- [ ] **Step 5: Reemplazar el uploader del bloque "agregar nueva"**

Busca el bloque del formulario de nueva variante. La primera columna actualmente tiene `<div className="col-span-1"><label className="text-xs text-muted block mb-1">Foto</label><label className="block w-12 h-12 ...">...</label></div>`. Reemplaza ese `<div className="col-span-1">` completo por:

```tsx
<div className="col-span-1">
  <label className="text-xs text-muted block mb-1">Foto</label>
  <VariantImagenPicker
    imagenes={imagenes}
    productoId={productoId}
    uploadTarget="new"
    currentUrl={newDraftImagenUrl}
    onSelect={setNewDraftImagenUrl}
  />
</div>
```

- [ ] **Step 6: Actualizar `app/admin/productos/[id]/page.tsx`**

Línea 48, reemplaza:

```tsx
<ProductoVariantes productoId={id} initial={variantes || []} />
```

por:

```tsx
<ProductoVariantes
  productoId={id}
  initial={variantes || []}
  imagenes={imagenes || []}
/>
```

- [ ] **Step 7: Build check**

```bash
npm run build
```

Expected: build pasa. Si hay warning de imports sin usar (`uploadFile`, `deleteFile`, `pathFromUrl` en `ProductoVariantes`), bórralos.

- [ ] **Step 8: Verify manual end-to-end**

```bash
npm run dev
```

Test completo del feature:
1. Editar producto con fotos en galería + variantes.
2. Click lápiz en una variante sin imagen → click thumbnail → popover muestra grid de galería + "subir nueva".
3. Click foto del grid → thumbnail de la fila cambia → click check (guardar) → toast "Variante actualizada" → refrescar → persiste.
4. Click lápiz en variante con foto de galería asignada → click thumbnail → la foto actual tiene borde dorado en el grid.
5. Click otra foto del grid → reemplaza. Verifica que el archivo de galería viejo SIGUE en `productos/{id}/imagenes/` (no borrado).
6. Click "Subir foto nueva" → sube → asigna. Refresh → persiste. La foto subida está en `productos/{id}/variantes/`.
7. Para esa variante que ahora tiene foto exclusiva, click thumbnail → "Subir nueva" → reemplaza. El archivo exclusivo anterior debe borrarse del bucket.
8. Click "Quitar imagen" → thumbnail vuelve a placeholder → check (guardar). Refresh → variante sin imagen.
9. Borrar variante con imagen exclusiva → archivo borrado del bucket.
10. Borrar variante con imagen de galería → archivo NO borrado (sigue en `productos/{id}/imagenes/`).
11. Click "agregar nueva" → uploader funciona igual con galería + upload.
12. Galería pública: en ficha de producto público, seleccionar variante con foto de galería → galería pública salta a esa imagen como portada (regresión de feature anterior).

- [ ] **Step 9: Commit**

```bash
git add components/admin/forms/ProductoVariantes.tsx "app/admin/productos/[id]/page.tsx"
git commit -m "feat(admin): variantes usan VariantImagenPicker (galeria + upload)"
```

---

## Self-Review

**Cobertura del spec:**

- Server cleanup respeta galería → Tasks 1 y 2.
- Componente picker con popover, grid, subir, quitar → Tasks 3, 4, 5, 6.
- Integración en `ProductoVariantes` (modo edit + nueva) → Task 7.
- Click fuera / ESC → Task 4.
- Filtrar videos del grid → Task 5 (`imagenesSoloFoto`).
- Foto actual marcada con borde dorado → Task 5 (`isCurrent`).
- Cleanup local al cambiar (no borrar si es de galería) → Task 6 (`esDeGaleria`).
- Pasar `imagenes` desde `page.tsx` → Task 7 Step 6.

**Placeholders:** Ninguno. Todo el código real está pegable.

**Consistencia de tipos:**
- `ImagenGaleria { id, url, tipo }` se usa en `VariantImagenPicker.tsx` (Task 3) y en `ProductoVariantes.tsx` (Task 7). Mismas tres propiedades.
- Prop `imagenes` en `VariantImagenPicker` y en `ProductoVariantes`: misma estructura.
- `uploadTarget: "new" | string` consistente entre Picker y los call sites en Task 7.

**Riesgo no cubierto en el plan:**
- El popover puede salirse del viewport en mobile (admin no es responsive crítico, pero verificarlo en `npm run dev` con devtools). Si se sale, agregar `right-0` cuando el espacio lo requiera — pero esto es follow-up si surge.

**Riesgo cubierto en verify manual (Task 7 Step 8) específico:**
- Caso 5: galería compartida no se borra al reemplazar variante.
- Caso 6+7: archivos exclusivos sí se borran.
- Caso 9+10: borrado de variante respeta galería.
- Caso 12: feature anterior sigue funcionando.
