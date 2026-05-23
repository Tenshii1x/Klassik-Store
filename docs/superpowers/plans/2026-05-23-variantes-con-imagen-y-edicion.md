# Variantes con imagen y edición — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir editar variantes existentes desde el admin (con imagen) y hacer que la galería pública salte a la imagen de la variante seleccionada como portada.

**Architecture:** El backend (DB + Zod schema + server actions) ya soporta `imagen_url` en variantes. El trabajo es: (1) agregar limpieza de archivos en storage cuando una imagen de variante cambia o se borra, (2) refactor del admin a edición inline con uploader, (3) crear wrapper cliente `ProductoView` que coordina la selección de variante con la galería en la vista pública.

**Tech Stack:** Next.js App Router (Server Components + Client Components), Supabase (Postgres + Storage), Zod, Tailwind, lucide-react, sonner (toasts).

**Spec:** `docs/superpowers/specs/2026-05-23-variantes-con-imagen-y-edicion-design.md`

**Nota sobre tests:** Esta base de código solo tiene tests para edge functions (`tests/edge-functions/`). No hay infraestructura para tests de UI/server actions. Cada tarea termina con **verificación manual** explícita en `npm run dev`. Si quieres añadir tests automatizados, primero hay que montar Vitest + Testing Library (fuera del alcance de este plan).

---

## Task 1: Limpiar imagen en storage al actualizar variante

**Goal:** Cuando `updateVariante` recibe una `imagen_url` distinta a la anterior (incluido pasar a null), borrar el archivo viejo del bucket `productos` para evitar acumular basura.

**Files:**
- Modify: `app/admin/productos/actions.ts` (función `updateVariante`, líneas 198-206)

- [ ] **Step 1: Agregar imports**

En la parte superior de `app/admin/productos/actions.ts`, junto a los otros imports, agregar:

```ts
import { pathFromUrl } from "@/lib/storage/upload"
```

Verifica que NO se importe `deleteFile` directamente — el server action usará el cliente Supabase ya creado, no la versión browser.

- [ ] **Step 2: Reemplazar la función `updateVariante` existente**

Reemplaza el cuerpo completo de `updateVariante` (líneas 198-206) por:

```ts
export async function updateVariante(id: string, producto_id: string, input: VarianteInput) {
  const parsed = varianteSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Datos inválidos" }
  const supabase = await createSupabaseServerClient()

  // Leer imagen anterior para detectar cambio
  const { data: existing } = await supabase
    .from("producto_variantes")
    .select("imagen_url")
    .eq("id", id)
    .single()

  const { error } = await supabase.from("producto_variantes").update(parsed.data).eq("id", id)
  if (error) return { error: error.message }

  // Si la imagen cambió y había una previa, borrar el archivo viejo
  const previa = existing?.imagen_url ?? null
  const nueva = parsed.data.imagen_url ?? null
  if (previa && previa !== nueva) {
    const path = pathFromUrl(previa, "productos")
    if (path) {
      await supabase.storage.from("productos").remove([path])
    }
  }

  revalidatePath(`/admin/productos/${producto_id}`)
  revalidatePath("/", "layout")
  return { success: true }
}
```

Cambios respecto al original:
- Lee `imagen_url` previo antes del `update`.
- Tras el `update` exitoso, si hubo cambio, borra el archivo viejo.
- Agregó `revalidatePath("/", "layout")` para que la vista pública refresque.

- [ ] **Step 3: Verificar tipos en build**

Ejecuta:

```bash
npm run build
```

Expected: build pasa sin errores de TypeScript. Si hay error sobre `pathFromUrl` no exportada, abre `lib/storage/upload.ts` y confirma que la línea 30 sigue exportándola.

- [ ] **Step 4: Commit**

```bash
git add app/admin/productos/actions.ts
git commit -m "fix(admin): updateVariante borra imagen anterior al cambiarla"
```

---

## Task 2: Limpiar imagen en storage al borrar variante

**Goal:** Cuando `removeVariante` borra una variante con `imagen_url`, borrar también el archivo del bucket.

**Files:**
- Modify: `app/admin/productos/actions.ts` (función `removeVariante`)

- [ ] **Step 1: Reemplazar la función `removeVariante` existente**

Reemplaza el cuerpo completo de `removeVariante` (al final del archivo) por:

```ts
export async function removeVariante(id: string, producto_id: string) {
  const supabase = await createSupabaseServerClient()

  // Leer imagen previa para borrar el archivo después
  const { data: existing } = await supabase
    .from("producto_variantes")
    .select("imagen_url")
    .eq("id", id)
    .single()

  const { error } = await supabase.from("producto_variantes").delete().eq("id", id)
  if (error) return { error: error.message }

  if (existing?.imagen_url) {
    const path = pathFromUrl(existing.imagen_url, "productos")
    if (path) {
      await supabase.storage.from("productos").remove([path])
    }
  }

  revalidatePath(`/admin/productos/${producto_id}`)
  revalidatePath("/", "layout")
  return { success: true }
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: build pasa sin errores.

- [ ] **Step 3: Commit**

```bash
git add app/admin/productos/actions.ts
git commit -m "fix(admin): removeVariante borra archivo de imagen del bucket"
```

---

## Task 3: Refactor admin variantes — modo view con thumbnail

**Goal:** Mostrar un thumbnail 48×48 de la imagen de cada variante en la lista, con placeholder dorado tenue si está vacío. Sin botón de editar todavía (eso es Task 4).

**Files:**
- Modify: `components/admin/forms/ProductoVariantes.tsx`

- [ ] **Step 1: Extender la interfaz `Variante`**

En `components/admin/forms/ProductoVariantes.tsx`, líneas 11-18, reemplaza la interfaz `Variante` por:

```ts
interface Variante {
  id: string
  tipo: string
  valor: string
  precio_extra: number
  stock_unidades: number | null
  imagen_url: string | null
  orden: number
}
```

- [ ] **Step 2: Importar Next/Image e Image icon**

En la parte superior del archivo, junto a los otros imports de lucide-react, agrega `ImageIcon`:

```ts
import { Plus, Trash2, ImageIcon } from "lucide-react"
import Image from "next/image"
```

- [ ] **Step 3: Renderizar thumbnail en cada fila**

En el bloque que renderiza `initial.map((v) => ...)` (líneas 74-90), reemplaza el `<div>` exterior y su contenido por:

```tsx
{initial.map((v) => (
  <div key={v.id} className="grid grid-cols-12 gap-2 items-center p-2 bg-black rounded-md border border-border">
    <div className="col-span-1">
      {v.imagen_url ? (
        <div className="relative w-12 h-12 rounded overflow-hidden border border-border">
          <Image src={v.imagen_url} alt="" fill className="object-cover" sizes="48px" />
        </div>
      ) : (
        <div className="w-12 h-12 rounded border border-border bg-gold-deep/10 flex items-center justify-center text-gold-deep">
          <ImageIcon size={16} />
        </div>
      )}
    </div>
    <div className="col-span-2 text-sm">
      <span className="text-muted text-xs">Tipo:</span> {v.tipo}
    </div>
    <div className="col-span-4 text-sm">
      <span className="text-muted text-xs">Valor:</span> {v.valor}
    </div>
    <div className="col-span-2 text-sm text-gold-primary">+${v.precio_extra.toFixed(2)}</div>
    <div className="col-span-2 text-sm">
      {v.stock_unidades !== null ? `${v.stock_unidades} unid.` : "—"}
    </div>
    <Button type="button" variant="ghost" size="sm" onClick={() => handleRemove(v.id)} disabled={isPending}>
      <Trash2 size={14} />
    </Button>
  </div>
))}
```

Cambios: agregó `col-span-1` con thumbnail, ajustó tipo a `col-span-2`. Total 1+2+4+2+2 = 11 + botón = 12 columnas.

- [ ] **Step 4: Verificar consulta server-side incluye imagen_url**

Abre `app/admin/productos/[id]/page.tsx` y busca la consulta de variantes. La selección debe traer `imagen_url`. Si está usando `select("*")` o tiene una lista explícita que la incluye, ok. Si NO la trae, agrégala. Comando para verificar:

```bash
grep -n "producto_variantes" app/admin/productos/\[id\]/page.tsx
```

Si la consulta usa lista de campos sin `imagen_url`, añádelo después de `stock_unidades`. Si usa `select("*")` no toques nada.

- [ ] **Step 5: Verificar manual**

```bash
npm run dev
```

Navega a `http://localhost:3000/admin/productos/<id-cualquier-producto-con-variantes>`. En la sección "Variantes" debes ver:
- Cada variante con su thumbnail a la izquierda
- Variantes sin `imagen_url` muestran un icono dorado tenue

- [ ] **Step 6: Commit**

```bash
git add components/admin/forms/ProductoVariantes.tsx app/admin/productos/\[id\]/page.tsx
git commit -m "feat(admin): mostrar thumbnail de imagen en lista de variantes"
```

---

## Task 4: Admin variantes — modo edit inline

**Goal:** Botón lápiz en cada fila que convierte los textos en inputs editables, con botones Guardar/Cancelar. Solo una variante en edición a la vez. La imagen aún no se edita aquí (eso es Task 5).

**Files:**
- Modify: `components/admin/forms/ProductoVariantes.tsx`

- [ ] **Step 1: Importar acción y nuevos íconos**

En la cima del archivo, agrega `updateVariante` al import existente y añade los íconos `Pencil`, `Check`, `X`:

```ts
import { addVariante, removeVariante, updateVariante } from "@/app/admin/productos/actions"
import { Plus, Trash2, ImageIcon, Pencil, Check, X } from "lucide-react"
```

- [ ] **Step 2: Agregar estado de edición**

Dentro de la función `ProductoVariantes`, después del `useState` de `draft` (línea 27-37), añade:

```ts
const [editingId, setEditingId] = useState<string | null>(null)
const [editDraft, setEditDraft] = useState<{
  tipo: string
  valor: string
  precio_extra: number
  stock_unidades: number | null
  imagen_url: string | null
}>({ tipo: "", valor: "", precio_extra: 0, stock_unidades: null, imagen_url: null })
```

- [ ] **Step 3: Agregar handlers de edición**

Después de `handleRemove` (línea 66), añade:

```ts
function startEdit(v: Variante) {
  setEditingId(v.id)
  setEditDraft({
    tipo: v.tipo,
    valor: v.valor,
    precio_extra: v.precio_extra,
    stock_unidades: v.stock_unidades,
    imagen_url: v.imagen_url,
  })
}

function cancelEdit() {
  setEditingId(null)
}

function handleSave(v: Variante) {
  if (!editDraft.tipo || !editDraft.valor) {
    toast.error("Tipo y valor son requeridos")
    return
  }
  startTransition(async () => {
    const result = await updateVariante(v.id, productoId, {
      tipo: editDraft.tipo,
      valor: editDraft.valor,
      precio_extra: editDraft.precio_extra,
      stock_unidades: editDraft.stock_unidades,
      imagen_url: editDraft.imagen_url,
      orden: v.orden,
    })
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success("Variante actualizada")
    setEditingId(null)
  })
}
```

- [ ] **Step 4: Renderizar modo edit en la fila**

En el bloque `initial.map((v) => ...)` que ya quedó de Task 3, envuelve el contenido en un ternario que verifique `editingId === v.id`. La fila completa pasa a ser:

```tsx
{initial.map((v) => (
  <div key={v.id} className="grid grid-cols-12 gap-2 items-center p-2 bg-black rounded-md border border-border">
    {editingId === v.id ? (
      <>
        {/* Thumbnail (placeholder por ahora — Task 5 lo vuelve uploader) */}
        <div className="col-span-1">
          {v.imagen_url ? (
            <div className="relative w-12 h-12 rounded overflow-hidden border border-border">
              <Image src={v.imagen_url} alt="" fill className="object-cover" sizes="48px" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded border border-border bg-gold-deep/10 flex items-center justify-center text-gold-deep">
              <ImageIcon size={16} />
            </div>
          )}
        </div>
        <div className="col-span-2">
          <select
            value={editDraft.tipo}
            onChange={(e) => setEditDraft({ ...editDraft, tipo: e.target.value })}
            className="w-full bg-black border border-border rounded-md px-2 py-2 text-white text-sm"
          >
            <option value="Color">Color</option>
            <option value="Talla">Talla</option>
            <option value="Modelo">Modelo</option>
            <option value="Material">Material</option>
          </select>
        </div>
        <div className="col-span-3">
          <Input
            value={editDraft.valor}
            onChange={(e) => setEditDraft({ ...editDraft, valor: e.target.value })}
          />
        </div>
        <div className="col-span-2">
          <NumberInput
            min={0}
            value={editDraft.precio_extra}
            onChange={(v) => setEditDraft({ ...editDraft, precio_extra: v ?? 0 })}
          />
        </div>
        <div className="col-span-2">
          <NumberInput
            integer
            min={0}
            value={editDraft.stock_unidades}
            onChange={(v) => setEditDraft({ ...editDraft, stock_unidades: v })}
            placeholder="—"
          />
        </div>
        <div className="col-span-2 flex gap-1 justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={() => handleSave(v)} disabled={isPending}>
            <Check size={14} className="text-success" />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={cancelEdit} disabled={isPending}>
            <X size={14} />
          </Button>
        </div>
      </>
    ) : (
      <>
        <div className="col-span-1">
          {v.imagen_url ? (
            <div className="relative w-12 h-12 rounded overflow-hidden border border-border">
              <Image src={v.imagen_url} alt="" fill className="object-cover" sizes="48px" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded border border-border bg-gold-deep/10 flex items-center justify-center text-gold-deep">
              <ImageIcon size={16} />
            </div>
          )}
        </div>
        <div className="col-span-2 text-sm">
          <span className="text-muted text-xs">Tipo:</span> {v.tipo}
        </div>
        <div className="col-span-3 text-sm">
          <span className="text-muted text-xs">Valor:</span> {v.valor}
        </div>
        <div className="col-span-2 text-sm text-gold-primary">+${v.precio_extra.toFixed(2)}</div>
        <div className="col-span-2 text-sm">
          {v.stock_unidades !== null ? `${v.stock_unidades} unid.` : "—"}
        </div>
        <div className="col-span-2 flex gap-1 justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(v)} disabled={isPending || !!editingId}>
            <Pencil size={14} />
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => handleRemove(v.id)} disabled={isPending || !!editingId}>
            <Trash2 size={14} />
          </Button>
        </div>
      </>
    )}
  </div>
))}
```

Nota: ajustamos el grid a 1+2+3+2+2+2 = 12 columnas (los botones ahora son `col-span-2` con dos botones). El modo `view` y `edit` mantienen el mismo grid para que la fila no salte de tamaño.

- [ ] **Step 5: Verificar manual**

```bash
npm run dev
```

En `/admin/productos/<id>`:
- Click en el lápiz de una variante → la fila cambia a inputs editables.
- Edita el valor, click en check verde → toast "Variante actualizada", fila vuelve a modo view con el dato nuevo.
- Click otra vez en lápiz, modifica, click en X → cancela sin guardar.
- Mientras una variante está en edición, los botones lápiz/basura de las otras están deshabilitados.

- [ ] **Step 6: Commit**

```bash
git add components/admin/forms/ProductoVariantes.tsx
git commit -m "feat(admin): editar variantes inline (tipo, valor, precio extra, stock)"
```

---

## Task 5: Admin variantes — uploader de imagen por variante

**Goal:** El thumbnail 48×48 se vuelve clickable en modo edit y en el bloque "agregar nueva". Click → file picker → sube al bucket → actualiza el campo `imagen_url` del draft.

**Files:**
- Modify: `components/admin/forms/ProductoVariantes.tsx`

- [ ] **Step 1: Agregar import del helper de upload**

En la cima del archivo, añade:

```ts
import { uploadFile, deleteFile, pathFromUrl } from "@/lib/storage/upload"
```

- [ ] **Step 2: Agregar estado de subida y handler genérico**

Dentro de la función `ProductoVariantes`, después del `useState` de `editDraft` agregado en Task 4, añade:

```ts
const [uploadingFor, setUploadingFor] = useState<"new" | string | null>(null)

async function uploadVarianteImagen(
  file: File,
  target: "new" | string
): Promise<string | null> {
  setUploadingFor(target)
  const ext = file.name.split(".").pop() || "jpg"
  const idPart = target === "new" ? "nueva" : target
  const path = `productos/${productoId}/variantes/${idPart}-${Date.now()}.${ext}`
  const { url, error } = await uploadFile("productos", path, file)
  setUploadingFor(null)
  if (error) {
    toast.error(`Error subiendo: ${error}`)
    return null
  }
  return url
}
```

- [ ] **Step 3: Reemplazar thumbnail del modo `edit` por uploader**

Busca el bloque `editingId === v.id ?` del Step 4 de Task 4. El primer `<div className="col-span-1">` (thumbnail estático) reemplázalo por:

```tsx
<div className="col-span-1">
  <label className="block w-12 h-12 cursor-pointer relative group">
    <input
      type="file"
      accept="image/*"
      className="hidden"
      disabled={uploadingFor === v.id}
      onChange={async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const newUrl = await uploadVarianteImagen(file, v.id)
        if (!newUrl) return
        // Borrar imagen previa del draft si había una distinta
        if (editDraft.imagen_url && editDraft.imagen_url !== newUrl) {
          const prevPath = pathFromUrl(editDraft.imagen_url, "productos")
          if (prevPath) await deleteFile("productos", prevPath)
        }
        setEditDraft({ ...editDraft, imagen_url: newUrl })
      }}
    />
    {editDraft.imagen_url ? (
      <>
        <div className="relative w-12 h-12 rounded overflow-hidden border border-gold-primary/40 group-hover:border-gold-primary">
          <Image src={editDraft.imagen_url} alt="" fill className="object-cover" sizes="48px" />
        </div>
        <button
          type="button"
          onClick={async (e) => {
            e.preventDefault()
            e.stopPropagation()
            const prev = editDraft.imagen_url
            setEditDraft({ ...editDraft, imagen_url: null })
            if (prev) {
              const prevPath = pathFromUrl(prev, "productos")
              if (prevPath) await deleteFile("productos", prevPath)
            }
          }}
          className="absolute -top-1 -right-1 bg-black/90 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100"
        >
          <X size={10} />
        </button>
      </>
    ) : (
      <div className="w-12 h-12 rounded border border-dashed border-gold-deep/40 bg-gold-deep/5 flex items-center justify-center text-gold-deep group-hover:border-gold-primary group-hover:text-gold-primary">
        {uploadingFor === v.id ? <span className="text-[10px]">...</span> : <ImageIcon size={16} />}
      </div>
    )}
  </label>
</div>
```

- [ ] **Step 4: Agregar uploader al bloque "agregar nueva"**

Encuentra el bloque que renderiza el formulario de nueva variante (originalmente líneas 91-134, ahora puede haberse movido). Es el `<div className="grid grid-cols-12 gap-2 items-end pt-2 border-t border-border">`. Antes del primer `<div className="col-span-3"><label className="text-xs text-muted">Tipo</label>...` agrega una primera celda con el uploader:

```tsx
<div className="col-span-1">
  <label className="text-xs text-muted block mb-1">Foto</label>
  <label className="block w-12 h-12 cursor-pointer relative group">
    <input
      type="file"
      accept="image/*"
      className="hidden"
      disabled={uploadingFor === "new"}
      onChange={async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const newUrl = await uploadVarianteImagen(file, "new")
        if (!newUrl) return
        if (newDraftImagenUrl) {
          const prevPath = pathFromUrl(newDraftImagenUrl, "productos")
          if (prevPath) await deleteFile("productos", prevPath)
        }
        setNewDraftImagenUrl(newUrl)
      }}
    />
    {newDraftImagenUrl ? (
      <div className="relative w-12 h-12 rounded overflow-hidden border border-gold-primary/40 group-hover:border-gold-primary">
        <Image src={newDraftImagenUrl} alt="" fill className="object-cover" sizes="48px" />
      </div>
    ) : (
      <div className="w-12 h-12 rounded border border-dashed border-gold-deep/40 bg-gold-deep/5 flex items-center justify-center text-gold-deep group-hover:border-gold-primary group-hover:text-gold-primary">
        {uploadingFor === "new" ? <span className="text-[10px]">...</span> : <ImageIcon size={16} />}
      </div>
    )}
  </label>
</div>
```

Y agrega el estado para esta foto cerca de los otros useState:

```ts
const [newDraftImagenUrl, setNewDraftImagenUrl] = useState<string | null>(null)
```

Modifica el `col-span` del resto del row de "agregar nueva" para que sume 12 con la nueva columna. La distribución pasa a: 1 (foto) + 2 (tipo) + 4 (valor) + 2 (precio) + 2 (stock) + 1 (botón add) = 12. Ajusta esos col-span en los `<div>` correspondientes.

- [ ] **Step 5: Pasar `imagen_url` en `handleAdd`**

Busca la función `handleAdd` (líneas 39-59 originales). En la llamada a `addVariante`, agrega `imagen_url: newDraftImagenUrl`:

```ts
const result = await addVariante(productoId, {
  tipo: draft.tipo,
  valor: draft.valor,
  precio_extra: draft.precio_extra ?? 0,
  stock_unidades: draft.stock_unidades,
  imagen_url: newDraftImagenUrl,
  orden: initial.length,
})
```

Y dentro del `if (result.error) return` del éxito, después del `setDraft(...)`, resetea también `setNewDraftImagenUrl(null)`.

- [ ] **Step 6: Verificar manual**

```bash
npm run dev
```

En `/admin/productos/<id>`:
- Click lápiz en una variante → click en el thumbnail (placeholder dorado) → file picker → selecciona imagen → spinner "..." → aparece foto → click check → toast "Variante actualizada".
- Refresca página: la imagen sigue ahí.
- Click lápiz, hover sobre foto → aparece X → click X → la foto desaparece del draft → click check → al refrescar la imagen ya no está en la variante (y en Storage también se borró por Task 1).
- En el bloque "agregar nueva" abajo: sube una foto, completa los campos, click + → variante nueva aparece con su foto.

- [ ] **Step 7: Verificar limpieza en Supabase Storage**

Abre el dashboard de Supabase del proyecto Klassik (`ackefqrcejicepksrwiz`), bucket `productos`, carpeta `productos/{id}/variantes/`. Confirma que tras reemplazar/borrar imagen de variante en el admin, los archivos viejos NO quedan acumulados.

- [ ] **Step 8: Commit**

```bash
git add components/admin/forms/ProductoVariantes.tsx
git commit -m "feat(admin): subir imagen por variante (al crear y al editar)"
```

---

## Task 6: Hacer `ProductoGaleria` controlable

**Goal:** Permitir que un componente padre maneje qué imagen está activa, y poder pasar imágenes "extra" (imagen de variante) que se prependen a la lista. Manteniendo compatibilidad con el uso actual (no controlado).

**Files:**
- Modify: `components/public/ProductoGaleria.tsx`

- [ ] **Step 1: Reemplazar componente completo**

Reemplaza el contenido de `components/public/ProductoGaleria.tsx` por:

```tsx
"use client"

import Image from "next/image"
import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"

interface Imagen {
  id: string
  url: string
  tipo: string
  watermark_limpio: boolean
}

interface Props {
  imagenes: Imagen[]
  nombre: string
  activeUrl?: string | null
  onSelectUrl?: (url: string) => void
  extraImages?: Imagen[]
}

export function ProductoGaleria({ imagenes, nombre, activeUrl, onSelectUrl, extraImages }: Props) {
  const clean = useMemo(() => {
    const base = imagenes.filter((i) => i.watermark_limpio)
    if (!extraImages?.length) return base
    // Prepende extras que no estén ya en base (dedup por url)
    const baseUrls = new Set(base.map((i) => i.url))
    const extras = extraImages.filter((i) => !baseUrls.has(i.url))
    return [...extras, ...base]
  }, [imagenes, extraImages])

  const isControlled = activeUrl !== undefined && onSelectUrl !== undefined
  const [internalIdx, setInternalIdx] = useState(0)

  const activeIdx = isControlled
    ? Math.max(0, clean.findIndex((i) => i.url === activeUrl))
    : internalIdx

  if (clean.length === 0) {
    return (
      <div className="aspect-square bg-gradient-to-br from-gold-deep/30 to-black rounded-md flex items-center justify-center text-muted">
        Sin imágenes
      </div>
    )
  }

  const current = clean[activeIdx] ?? clean[0]

  function selectIdx(idx: number) {
    if (isControlled) {
      onSelectUrl!(clean[idx].url)
    } else {
      setInternalIdx(idx)
    }
  }

  return (
    <div className="space-y-3">
      <div className="aspect-square relative bg-black rounded-md overflow-hidden">
        {current.tipo === "video" ? (
          <video src={current.url} controls className="w-full h-full object-contain" />
        ) : (
          <Image
            key={current.url}
            src={current.url}
            alt={nombre}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover transition-opacity duration-150"
            priority
          />
        )}
      </div>
      {clean.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {clean.map((img, idx) => (
            <button
              key={img.id || img.url}
              type="button"
              onClick={() => selectIdx(idx)}
              className={cn(
                "aspect-square relative rounded-md overflow-hidden border-2 transition-colors",
                idx === activeIdx ? "border-gold-primary" : "border-border hover:border-border-strong"
              )}
            >
              {img.tipo === "video" ? (
                <video src={img.url} className="w-full h-full object-cover" muted />
              ) : (
                <Image src={img.url} alt="" fill sizes="80px" className="object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

Cambios respecto al original:
- Nuevas props opcionales `activeUrl`, `onSelectUrl`, `extraImages`.
- Si vienen `activeUrl` + `onSelectUrl`, modo controlado; si no, mantiene `useState` interno.
- `extraImages` se prependen a `clean` deduplicados por URL.
- `<Image>` recibe `key={current.url}` para forzar remount al cambiar (permite el fade).

- [ ] **Step 2: Verificar que el uso actual no se rompe**

`app/(public)/producto/[slug]/page.tsx:69` invoca `<ProductoGaleria imagenes={...} nombre={...} />` sin las nuevas props. Como son opcionales, debe seguir compilando.

```bash
npm run build
```

Expected: build pasa.

- [ ] **Step 3: Verificar manual**

```bash
npm run dev
```

Navega a cualquier `/producto/<slug>`. La galería sigue funcionando: thumbnails clickeables, imagen principal cambia. No se debe ver ningún cambio de comportamiento todavía — el wrapper viene en Task 8.

- [ ] **Step 4: Commit**

```bash
git add components/public/ProductoGaleria.tsx
git commit -m "feat(public): ProductoGaleria soporta modo controlado e imagenes extra"
```

---

## Task 7: Agregar callback `onVariantChange` a `ProductoInfo`

**Goal:** Cuando el cliente click una variante, además de cambiar el estado interno, dispara un callback opcional con la variante completa para que el padre reaccione.

**Files:**
- Modify: `components/public/ProductoInfo.tsx`

- [ ] **Step 1: Agregar prop opcional**

En `components/public/ProductoInfo.tsx`, busca la firma de `export function ProductoInfo({ p }: { p: Producto })` (línea 49). Reemplázala por:

```tsx
export function ProductoInfo({
  p,
  onVariantChange,
}: {
  p: Producto
  onVariantChange?: (variante: Variante | null) => void
}) {
```

- [ ] **Step 2: Disparar callback al cambiar variante**

Busca el botón que renderiza cada variante (líneas 120-134 originalmente). En el `onClick`, reemplaza:

```tsx
onClick={() => setSelectedVariantId(v.id)}
```

por:

```tsx
onClick={() => {
  setSelectedVariantId(v.id)
  onVariantChange?.(v)
}}
```

- [ ] **Step 3: Disparar callback en el mount inicial**

Justo después de los `useState` de variante/cantidad (líneas 56-59), agrega un `useEffect`:

```tsx
import { useState, useEffect } from "react"
// ...
useEffect(() => {
  const initial = p.producto_variantes.find((v) => v.id === selectedVariantId) ?? null
  onVariantChange?.(initial)
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

Asegúrate de que `useEffect` esté en el import de React (la línea 3 actual: `import { useState } from "react"` → `import { useState, useEffect } from "react"`).

- [ ] **Step 4: Build check**

```bash
npm run build
```

Expected: build pasa.

- [ ] **Step 5: Commit**

```bash
git add components/public/ProductoInfo.tsx
git commit -m "feat(public): ProductoInfo expone callback onVariantChange"
```

---

## Task 8: Crear `ProductoView` (wrapper cliente coordinador)

**Goal:** Componente cliente que envuelve galería + info, mantiene el estado compartido de "imagen activa" y "variante seleccionada", y aplica la lógica de cambio de imagen al seleccionar variante.

**Files:**
- Create: `components/public/ProductoView.tsx`

- [ ] **Step 1: Crear el archivo**

Crea `components/public/ProductoView.tsx` con:

```tsx
"use client"

import { useState, useMemo, useCallback } from "react"
import { ProductoGaleria } from "./ProductoGaleria"
import { ProductoInfo } from "./ProductoInfo"

interface Imagen {
  id: string
  url: string
  tipo: string
  watermark_limpio: boolean
  orden?: number
}

interface Variante {
  id: string
  tipo: string
  valor: string
  precio_extra: number
  stock_unidades: number | null
  imagen_url: string | null
}

interface ProductoData {
  id: string
  nombre: string
  descripcion: string | null
  modelo: string | null
  modo: string
  stock_unidades: number | null
  precio_venta: number
  precio_anterior: number | null
  fecha_llegada_inicio: string | null
  fecha_llegada_fin: string | null
  producto_imagenes: Imagen[]
  producto_variantes: Variante[]
}

export function ProductoView({ producto }: { producto: ProductoData }) {
  const imagenesLimpias = useMemo(
    () => producto.producto_imagenes.filter((i) => i.watermark_limpio),
    [producto.producto_imagenes]
  )

  const [activeUrl, setActiveUrl] = useState<string | null>(
    imagenesLimpias[0]?.url ?? null
  )
  const [extraImages, setExtraImages] = useState<Imagen[]>([])

  const handleVariantChange = useCallback(
    (v: Variante | null) => {
      if (!v?.imagen_url) return
      const inGaleria = imagenesLimpias.some((img) => img.url === v.imagen_url)
      if (inGaleria) {
        setActiveUrl(v.imagen_url)
        setExtraImages([])
      } else {
        const extra: Imagen = {
          id: `variante-${v.id}`,
          url: v.imagen_url,
          tipo: "imagen",
          watermark_limpio: true,
        }
        setExtraImages([extra])
        setActiveUrl(v.imagen_url)
      }
    },
    [imagenesLimpias]
  )

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
      <ProductoGaleria
        imagenes={producto.producto_imagenes}
        nombre={producto.nombre}
        activeUrl={activeUrl}
        onSelectUrl={setActiveUrl}
        extraImages={extraImages}
      />
      <ProductoInfo p={producto as never} onVariantChange={handleVariantChange} />
    </section>
  )
}
```

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: build pasa. Si hay error de tipo en `producto as never`, déjalo así — coincide con el patrón usado en `page.tsx` actual.

- [ ] **Step 3: Commit**

```bash
git add components/public/ProductoView.tsx
git commit -m "feat(public): ProductoView coordina seleccion de variante con galeria"
```

---

## Task 9: Integrar `ProductoView` en la página del producto

**Goal:** Reemplazar el render lado-a-lado de `ProductoGaleria` + `ProductoInfo` en `page.tsx` por un único `<ProductoView />`.

**Files:**
- Modify: `app/(public)/producto/[slug]/page.tsx`

- [ ] **Step 1: Actualizar imports**

En `app/(public)/producto/[slug]/page.tsx` líneas 4-5, reemplaza:

```tsx
import { ProductoGaleria } from "@/components/public/ProductoGaleria"
import { ProductoInfo } from "@/components/public/ProductoInfo"
```

por:

```tsx
import { ProductoView } from "@/components/public/ProductoView"
```

- [ ] **Step 2: Reemplazar el `<section>` con galería + info**

Busca líneas 68-71:

```tsx
<section className="max-w-7xl mx-auto px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
  <ProductoGaleria imagenes={imagenesOrdenadas as never} nombre={producto.nombre} />
  <ProductoInfo p={{ ...producto, producto_variantes: variantesOrdenadas } as never} />
</section>
```

Reemplázalas por:

```tsx
<ProductoView
  producto={{
    ...producto,
    producto_imagenes: imagenesOrdenadas as never,
    producto_variantes: variantesOrdenadas as never,
  } as never}
/>
```

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: build pasa.

- [ ] **Step 4: Verificar manual — caso 1: variante sin imagen**

```bash
npm run dev
```

Navega a un producto con variantes pero sin `imagen_url` asignada. Click entre variantes. **La galería NO debe cambiar de imagen.** El precio y la variante seleccionada visualmente sí cambian.

- [ ] **Step 5: Verificar manual — caso 2: variante con imagen ya en galería**

Asigna desde admin (Task 5) una `imagen_url` a una variante que sea una de las imágenes del producto que ya está en la galería. Refresca la ficha pública.
- Click en esa variante → la galería **salta a esa imagen como portada**.
- Click en otra variante (sin imagen o con imagen distinta) → galería se queda o cambia.

- [ ] **Step 6: Verificar manual — caso 3: variante con imagen NUEVA (no en galería)**

Asigna una `imagen_url` a una variante con una imagen que NO esté en `producto_imagenes` (sube una imagen específicamente al uploader de variante que sea diferente). Refresca la ficha pública.
- Click en esa variante → la imagen aparece **prependida** en la galería como primera y se selecciona como portada.
- Click en otra variante sin imagen → la galería se queda mostrando la imagen de la variante anterior, pero los thumbnails siguen mostrando el extra.

- [ ] **Step 7: Verificar manual — caso 4: variante inicial con imagen**

Asegúrate de que la primera variante de algún producto tiene imagen. Carga la ficha. La galería debe abrir con esa imagen como portada (no con la imagen general del producto).

- [ ] **Step 8: Commit**

```bash
git add app/\(public\)/producto/\[slug\]/page.tsx
git commit -m "feat(public): integrar ProductoView en ficha de producto"
```

---

## Self-Review

**Cobertura del spec:**
- Limpieza de storage al actualizar/borrar variante → Tasks 1 y 2.
- Edición inline de los 4 campos → Task 4.
- Uploader de imagen al editar y al agregar → Task 5.
- Galería controlable con imágenes extra → Task 6.
- Callback de variante → Task 7.
- Wrapper coordinador → Task 8.
- Integración en page.tsx → Task 9.
- Caso borde "variante inicial con imagen" → Task 7 Step 3 (useEffect dispara con la variante inicial) + Task 9 Step 7 (verificación manual).
- Caso borde "variante sin imagen tras una con imagen" → Task 9 Step 6 (verificación explícita).

**Placeholders:** Ninguno. Todos los pasos contienen el código real a pegar.

**Consistencia de tipos:** `ProductoData.producto_imagenes` en Task 8 usa el mismo shape de `Imagen` que `ProductoGaleria.Imagen` (id, url, tipo, watermark_limpio). `Variante` en Task 8 coincide con el de `ProductoInfo.tsx`. `updateVariante` en Task 4 pasa `orden: v.orden` consistente con `VarianteInput.orden` del schema Zod.

**Riesgos no cubiertos:**
- Si dos pestañas editan la misma variante simultáneamente, la segunda gana sin warning. Aceptado: caso muy raro en admin de una persona.
- `pathFromUrl` falla silenciosamente si la URL no tiene el formato esperado del bucket público. Aceptado: el cleanup queda como best-effort.
