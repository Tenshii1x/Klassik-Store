# Klassik Store · Plan 02 — Admin de catálogo · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Construir el CRUD completo del admin para que la dueña pueda gestionar manualmente todo el catálogo: secciones, subsecciones, etiquetas, productos (con galería, variantes, costos, notas, relacionados), combos, destacados, configuración de tienda y banner promocional. Al cerrar este plan, la dueña puede subir y publicar productos sin necesitar la extensión Chrome (que viene en Plan 04).

**Architecture:** Server Components para listas (Next.js App Router fetching desde Supabase server client), Client Components para forms con interactividad (variantes dinámicas, gallery drag-and-drop, etc.). Server Actions para mutaciones. Supabase Storage para imágenes/videos. RLS bloquea todo lo no-admin.

**Tech Stack:** Next.js 16, Supabase JS SDK (typed), Tailwind v4, Server Actions, Sonner (toast notifications), react-hook-form (forms), Zod (validation), dnd-kit (drag and drop), Lucide icons.

**Result at end of Plan 02:** Dueña puede entrar al admin → crear secciones, etiquetas, productos manuales con imágenes (upload), variantes, costos, notas → publicarlos → ver en el catálogo público (que vendrá en Plan 03). Configurar Yappy/banco/margen/banner.

**Spec reference:** `docs/superpowers/specs/2026-05-12-klassik-store-design.md` sección 7.

---

## File Structure

```
app/admin/
├── secciones/
│   ├── page.tsx
│   ├── nueva/page.tsx
│   ├── [id]/page.tsx
│   └── actions.ts
├── etiquetas/
│   ├── page.tsx
│   └── actions.ts
├── productos/
│   ├── page.tsx                  (list + filters + bulk)
│   ├── nuevo/page.tsx            (create)
│   ├── [id]/page.tsx             (edit — combines all sub-editors)
│   └── actions.ts
├── combos/
│   ├── page.tsx
│   ├── nuevo/page.tsx
│   ├── [id]/page.tsx
│   └── actions.ts
├── destacados/
│   ├── page.tsx
│   └── actions.ts
├── configuracion/
│   ├── page.tsx                  (datos tienda + pagos)
│   ├── banner/page.tsx           (banner promocional)
│   └── actions.ts
components/admin/
├── forms/
│   ├── SeccionForm.tsx
│   ├── EtiquetaForm.tsx
│   ├── ProductoForm.tsx
│   ├── ProductoImagenesGaleria.tsx
│   ├── ProductoVariantes.tsx
│   ├── ProductoRelacionados.tsx
│   ├── ComboForm.tsx
│   ├── ConfiguracionForm.tsx
│   └── BannerForm.tsx
├── tables/
│   ├── ProductosTable.tsx
│   ├── ProductosFilters.tsx
│   └── BulkActionsBar.tsx
├── ImageUploader.tsx
├── ConfirmDialog.tsx
└── Toast.tsx (Sonner wrapper)
lib/
├── validations/
│   ├── seccion.ts
│   ├── etiqueta.ts
│   ├── producto.ts
│   ├── combo.ts
│   └── configuracion.ts
├── storage/
│   └── upload.ts
└── helpers/
    ├── slug.ts
    └── margen.ts
supabase/migrations/
└── 20260512000003_storage_buckets.sql
```

---

## Task 1: Setup — Storage buckets + helpers + dependencies

**Files:**
- Modify: `package.json` (add deps)
- Create: `supabase/migrations/20260512000003_storage_buckets.sql`
- Create: `lib/storage/upload.ts`
- Create: `lib/helpers/slug.ts`
- Create: `lib/helpers/margen.ts`
- Create: `lib/validations/seccion.ts`
- Create: `lib/validations/etiqueta.ts`
- Create: `lib/validations/producto.ts`
- Create: `lib/validations/combo.ts`
- Create: `lib/validations/configuracion.ts`
- Create: `components/admin/Toast.tsx` (Sonner provider)
- Modify: `app/admin/layout.tsx` (add Toaster)

- [ ] **Step 1.1: Install dependencies**

```bash
npm install zod react-hook-form @hookform/resolvers sonner @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities slugify
npm install -D @types/slugify
```

- [ ] **Step 1.2: Create Supabase Storage buckets migration**

Write `supabase/migrations/20260512000003_storage_buckets.sql`:

```sql
-- Buckets para imágenes/videos de productos y assets de tienda
insert into storage.buckets (id, name, public)
values
  ('productos', 'productos', true),
  ('configuracion', 'configuracion', true)
on conflict (id) do nothing;

-- RLS para los buckets
-- Lectura pública: cualquiera puede ver imágenes (necesario para el catálogo)
create policy "Public read productos" on storage.objects
  for select using (bucket_id = 'productos');

create policy "Public read configuracion" on storage.objects
  for select using (bucket_id = 'configuracion');

-- Solo admin puede subir/actualizar/borrar
create policy "Admin write productos" on storage.objects
  for all
  using (bucket_id = 'productos' and exists (
    select 1 from public.profiles where id = auth.uid() and rol in ('owner', 'staff')
  ))
  with check (bucket_id = 'productos' and exists (
    select 1 from public.profiles where id = auth.uid() and rol in ('owner', 'staff')
  ));

create policy "Admin write configuracion" on storage.objects
  for all
  using (bucket_id = 'configuracion' and exists (
    select 1 from public.profiles where id = auth.uid() and rol in ('owner', 'staff')
  ))
  with check (bucket_id = 'configuracion' and exists (
    select 1 from public.profiles where id = auth.uid() and rol in ('owner', 'staff')
  ));
```

**MANUAL APPLY:** Paste this in Supabase SQL Editor of project `ackefqrcejicepksrwiz`. Verify buckets appear in Storage tab.

- [ ] **Step 1.3: Create `lib/helpers/slug.ts`**

```ts
import slugify from "slugify"

export function toSlug(input: string): string {
  return slugify(input, {
    lower: true,
    strict: true,
    locale: "es",
    trim: true,
  })
}

export function uniqueSlug(base: string, taken: string[]): string {
  let candidate = toSlug(base)
  if (!taken.includes(candidate)) return candidate
  let i = 2
  while (taken.includes(`${candidate}-${i}`)) i++
  return `${candidate}-${i}`
}
```

- [ ] **Step 1.4: Create `lib/helpers/margen.ts`**

```ts
export function calcularPrecioVenta(
  costoTemu: number,
  costoEnvio: number,
  margenPorcentaje: number
): number {
  const costoTotal = costoTemu + costoEnvio
  const precio = costoTotal * (1 + margenPorcentaje / 100)
  return Math.round(precio * 100) / 100
}

export function calcularMargenReal(
  precioVenta: number,
  costoTemu: number,
  costoEnvio: number
): number {
  const costoTotal = costoTemu + costoEnvio
  if (costoTotal === 0) return 0
  const margen = ((precioVenta - costoTotal) / costoTotal) * 100
  return Math.round(margen * 10) / 10
}

export function calcularGananciaNeta(
  precioVenta: number,
  costoTemu: number,
  costoEnvio: number
): number {
  return Math.round((precioVenta - costoTemu - costoEnvio) * 100) / 100
}
```

- [ ] **Step 1.5: Create `lib/storage/upload.ts`**

```ts
import { createSupabaseBrowserClient } from "@/lib/supabase/browser"

export async function uploadFile(
  bucket: "productos" | "configuracion",
  path: string,
  file: File
): Promise<{ url: string; error: null } | { url: null; error: string }> {
  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
    contentType: file.type,
  })
  if (error) {
    return { url: null, error: error.message }
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return { url: data.publicUrl, error: null }
}

export async function deleteFile(
  bucket: "productos" | "configuracion",
  path: string
): Promise<{ error: string | null }> {
  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase.storage.from(bucket).remove([path])
  return { error: error?.message ?? null }
}

export function pathFromUrl(url: string, bucket: string): string | null {
  const match = url.match(new RegExp(`/storage/v1/object/public/${bucket}/(.+)$`))
  return match?.[1] ?? null
}
```

- [ ] **Step 1.6: Create `lib/validations/seccion.ts`**

```ts
import { z } from "zod"

export const seccionSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido").max(80),
  slug: z.string().min(1, "Slug requerido").max(80).regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  imagen_portada: z.string().url().optional().nullable(),
  descripcion_corta: z.string().max(200).optional().nullable(),
  orden: z.number().int().min(0).default(0),
  tono: z.enum(["dark-gold", "rose-gold", "blue-cool"]).default("dark-gold"),
  activa: z.boolean().default(true),
})

export type SeccionInput = z.infer<typeof seccionSchema>

export const subseccionSchema = z.object({
  seccion_id: z.string().uuid(),
  nombre: z.string().min(1).max(80),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  orden: z.number().int().min(0).default(0),
})

export type SubseccionInput = z.infer<typeof subseccionSchema>
```

- [ ] **Step 1.7: Create `lib/validations/etiqueta.ts`**

```ts
import { z } from "zod"

export const etiquetaSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido").max(50),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color hex inválido").default("#c9a86a"),
})

export type EtiquetaInput = z.infer<typeof etiquetaSchema>
```

- [ ] **Step 1.8: Create `lib/validations/producto.ts`**

```ts
import { z } from "zod"

export const productoSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido").max(150),
  nombre_temu: z.string().max(200).optional().nullable(),
  descripcion: z.string().max(5000).optional().nullable(),
  slug: z.string().min(1).max(150).regex(/^[a-z0-9-]+$/),
  modelo: z.string().max(50).optional().nullable(),
  seccion_id: z.string().uuid().optional().nullable(),
  subseccion_id: z.string().uuid().optional().nullable(),
  modo: z.enum(["stock", "preorden"]).default("preorden"),
  stock_unidades: z.number().int().min(0).optional().nullable(),
  costo_temu: z.number().min(0).default(0),
  costo_envio_unitario: z.number().min(0).default(0),
  precio_venta: z.number().min(0).default(0),
  precio_anterior: z.number().min(0).optional().nullable(),
  margen_override_porcentaje: z.number().int().min(0).optional().nullable(),
  temu_url: z.string().url().optional().nullable().or(z.literal("")),
  temu_goods_id: z.string().max(50).optional().nullable(),
  notas_internas: z.string().max(2000).optional().nullable(),
  estado: z.enum(["borrador", "publicado", "archivado"]).default("borrador"),
  destacado: z.boolean().default(false),
  etiquetas: z.array(z.string()).default([]),
  fecha_llegada_inicio: z.string().optional().nullable(),
  fecha_llegada_fin: z.string().optional().nullable(),
  solo_para_ella: z.boolean().default(false),
  solo_para_el: z.boolean().default(false),
})

export type ProductoInput = z.infer<typeof productoSchema>

export const varianteSchema = z.object({
  tipo: z.string().min(1).max(30),
  valor: z.string().min(1).max(80),
  precio_extra: z.number().min(0).default(0),
  stock_unidades: z.number().int().min(0).optional().nullable(),
  imagen_url: z.string().url().optional().nullable(),
  orden: z.number().int().min(0).default(0),
})

export type VarianteInput = z.infer<typeof varianteSchema>
```

- [ ] **Step 1.9: Create `lib/validations/combo.ts`**

```ts
import { z } from "zod"

export const comboSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido").max(100),
  descripcion: z.string().max(1000).optional().nullable(),
  precio_combo: z.number().min(0),
  imagen_url: z.string().url().optional().nullable(),
  activo: z.boolean().default(true),
  productos: z.array(z.object({
    producto_id: z.string().uuid(),
    cantidad: z.number().int().min(1).default(1),
  })).min(2, "Un combo debe tener al menos 2 productos"),
})

export type ComboInput = z.infer<typeof comboSchema>
```

- [ ] **Step 1.10: Create `lib/validations/configuracion.ts`**

```ts
import { z } from "zod"

export const configuracionSchema = z.object({
  nombre_tienda: z.string().min(1).max(80),
  logo_url: z.string().url().optional().nullable(),
  whatsapp: z.string().regex(/^[0-9]+$/, "Solo números, con código de país").max(15).optional().nullable(),
  instagram_handle: z.string().max(50).optional().nullable(),
  instagram_url: z.string().url().optional().nullable(),
  yappy_numero: z.string().max(20).optional().nullable(),
  yappy_qr_url: z.string().url().optional().nullable(),
  banco_nombre: z.string().max(80).optional().nullable(),
  banco_cuenta: z.string().max(30).optional().nullable(),
  banco_titular: z.string().max(100).optional().nullable(),
  banco_tipo: z.enum(["Ahorro", "Corriente"]).optional().nullable(),
  margen_global_porcentaje: z.number().int().min(0).max(500).default(60),
  proxima_fecha_llegada_inicio: z.string().optional().nullable(),
  proxima_fecha_llegada_fin: z.string().optional().nullable(),
  mensaje_preorden: z.string().max(500).optional().nullable(),
  politica_devoluciones: z.string().max(10000).optional().nullable(),
  politica_privacidad: z.string().max(10000).optional().nullable(),
  terminos_condiciones: z.string().max(10000).optional().nullable(),
})

export type ConfiguracionInput = z.infer<typeof configuracionSchema>

export const bannerSchema = z.object({
  banner_activo: z.boolean(),
  banner_texto: z.string().max(150).optional().nullable(),
  banner_cta_texto: z.string().max(30).optional().nullable(),
  banner_cta_url: z.string().url().optional().nullable().or(z.literal("")),
  banner_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#c9a86a"),
})

export type BannerInput = z.infer<typeof bannerSchema>
```

- [ ] **Step 1.11: Create `components/admin/Toast.tsx`**

```tsx
"use client"

import { Toaster as SonnerToaster } from "sonner"

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        className: "!bg-black-surface !border-border !text-white !font-sans",
      }}
    />
  )
}
```

- [ ] **Step 1.12: Modify `app/admin/layout.tsx` to mount the Toaster**

Read existing `app/admin/layout.tsx`. Replace with:

```tsx
import { Sidebar } from "@/components/admin/sidebar"
import { Toaster } from "@/components/admin/Toast"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-black">
      <Sidebar />
      <main className="flex-1 p-8 overflow-x-hidden">{children}</main>
      <Toaster />
    </div>
  )
}
```

- [ ] **Step 1.13: Verify TSC**

```bash
npx tsc --noEmit
```

Should pass.

- [ ] **Step 1.14: Commit**

```bash
git add lib/ components/admin/Toast.tsx app/admin/layout.tsx supabase/migrations/ package.json package-lock.json
git commit -m "feat(admin): setup storage buckets, helpers, validations, toast provider"
```

---

## Task 2: Secciones — CRUD completo

**Files:**
- Create: `app/admin/secciones/page.tsx` (list)
- Create: `app/admin/secciones/nueva/page.tsx`
- Create: `app/admin/secciones/[id]/page.tsx` (edit + subsecciones)
- Create: `app/admin/secciones/actions.ts`
- Create: `components/admin/forms/SeccionForm.tsx`
- Create: `components/admin/ImageUploader.tsx`
- Create: `components/admin/ConfirmDialog.tsx`

- [ ] **Step 2.1: Create `components/admin/ImageUploader.tsx`**

```tsx
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
```

Required Next.js config update — add image domains to `next.config.ts`:

Read existing `next.config.ts`. Replace with:

```ts
import type { NextConfig } from "next"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseHost = supabaseUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "")

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
}

export default nextConfig
```

- [ ] **Step 2.2: Create `components/admin/ConfirmDialog.tsx`**

```tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardBody } from "@/components/ui/card"

interface ConfirmDialogProps {
  trigger: React.ReactNode
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "danger" | "primary"
  onConfirm: () => void | Promise<void>
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleConfirm() {
    setPending(true)
    try {
      await onConfirm()
      setOpen(false)
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm">
            <CardBody className="space-y-4">
              <h2 className="font-serif text-xl text-white">{title}</h2>
              {description && <p className="text-muted text-sm">{description}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
                  {cancelLabel}
                </Button>
                <Button
                  type="button"
                  variant={variant === "danger" ? "danger" : "primary"}
                  size="sm"
                  onClick={handleConfirm}
                  disabled={pending}
                >
                  {pending ? "..." : confirmLabel}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2.3: Create `app/admin/secciones/actions.ts`**

```ts
"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { seccionSchema, subseccionSchema, type SeccionInput, type SubseccionInput } from "@/lib/validations/seccion"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createSeccion(input: SeccionInput) {
  const parsed = seccionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Datos inválidos" }
  }
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from("secciones")
    .insert(parsed.data)
    .select("id")
    .single()
  if (error) return { error: error.message }
  revalidatePath("/admin/secciones")
  redirect(`/admin/secciones/${data.id}`)
}

export async function updateSeccion(id: string, input: SeccionInput) {
  const parsed = seccionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Datos inválidos" }
  }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("secciones").update(parsed.data).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/secciones")
  revalidatePath(`/admin/secciones/${id}`)
  return { success: true }
}

export async function deleteSeccion(id: string) {
  const supabase = await createSupabaseServerClient()
  // Verificar que no tiene productos asociados
  const { count } = await supabase
    .from("productos")
    .select("*", { count: "exact", head: true })
    .eq("seccion_id", id)
  if ((count ?? 0) > 0) {
    return { error: `No se puede borrar — tiene ${count} producto(s). Mueve o archiva los productos primero.` }
  }
  const { error } = await supabase.from("secciones").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/secciones")
  return { success: true }
}

export async function reorderSecciones(ids: string[]) {
  const supabase = await createSupabaseServerClient()
  await Promise.all(
    ids.map((id, idx) =>
      supabase.from("secciones").update({ orden: idx }).eq("id", id)
    )
  )
  revalidatePath("/admin/secciones")
  return { success: true }
}

export async function createSubseccion(input: SubseccionInput) {
  const parsed = subseccionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Datos inválidos" }
  }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("subsecciones").insert(parsed.data)
  if (error) return { error: error.message }
  revalidatePath(`/admin/secciones/${input.seccion_id}`)
  return { success: true }
}

export async function updateSubseccion(id: string, input: SubseccionInput) {
  const parsed = subseccionSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Datos inválidos" }
  }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("subsecciones").update(parsed.data).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath(`/admin/secciones/${input.seccion_id}`)
  return { success: true }
}

export async function deleteSubseccion(id: string, seccion_id: string) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("subsecciones").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath(`/admin/secciones/${seccion_id}`)
  return { success: true }
}
```

- [ ] **Step 2.4: Create `components/admin/forms/SeccionForm.tsx`**

```tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardBody } from "@/components/ui/card"
import { ImageUploader } from "@/components/admin/ImageUploader"
import { toSlug } from "@/lib/helpers/slug"
import { createSeccion, updateSeccion } from "@/app/admin/secciones/actions"
import type { SeccionInput } from "@/lib/validations/seccion"
import { toast } from "sonner"

interface Props {
  initial?: Partial<SeccionInput> & { id?: string }
}

export function SeccionForm({ initial }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState<SeccionInput>({
    nombre: initial?.nombre || "",
    slug: initial?.slug || "",
    imagen_portada: initial?.imagen_portada || null,
    descripcion_corta: initial?.descripcion_corta || null,
    orden: initial?.orden ?? 0,
    tono: (initial?.tono as SeccionInput["tono"]) || "dark-gold",
    activa: initial?.activa ?? true,
  })

  function set<K extends keyof SeccionInput>(key: K, value: SeccionInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleNombreBlur() {
    if (!form.slug && form.nombre) {
      set("slug", toSlug(form.nombre))
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const action = initial?.id
        ? updateSeccion(initial.id, form)
        : createSeccion(form)
      const result = await action
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success(initial?.id ? "Sección actualizada" : "Sección creada")
      if (!initial?.id) router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardBody className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="eyebrow block mb-1.5">Nombre</label>
              <Input
                value={form.nombre}
                onChange={(e) => set("nombre", e.target.value)}
                onBlur={handleNombreBlur}
                required
              />
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Slug (URL)</label>
              <Input
                value={form.slug}
                onChange={(e) => set("slug", toSlug(e.target.value))}
                required
              />
            </div>
          </div>

          <div>
            <label className="eyebrow block mb-1.5">Descripción corta</label>
            <Input
              value={form.descripcion_corta ?? ""}
              onChange={(e) => set("descripcion_corta", e.target.value || null)}
              placeholder="Ej. Para él y para ella. Piezas que cuentan más que el tiempo."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="eyebrow block mb-1.5">Tono visual</label>
              <select
                value={form.tono}
                onChange={(e) => set("tono", e.target.value as SeccionInput["tono"])}
                className="w-full bg-black border border-border rounded-md px-3.5 py-2.5 text-white text-sm"
              >
                <option value="dark-gold">Dark Gold (default)</option>
                <option value="rose-gold">Rose Gold (femenino)</option>
                <option value="blue-cool">Blue Cool (tech)</option>
              </select>
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Orden</label>
              <Input
                type="number"
                min={0}
                value={form.orden}
                onChange={(e) => set("orden", parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <ImageUploader
            bucket="productos"
            pathPrefix="secciones"
            value={form.imagen_portada ?? null}
            onChange={(url) => set("imagen_portada", url)}
            label="Imagen de portada"
          />

          <label className="flex items-center gap-2 text-sm text-white">
            <input
              type="checkbox"
              checked={form.activa}
              onChange={(e) => set("activa", e.target.checked)}
              className="accent-gold-primary"
            />
            Sección activa (visible en el catálogo)
          </label>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={() => router.push("/admin/secciones")} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : initial?.id ? "Guardar cambios" : "Crear sección"}
            </Button>
          </div>
        </CardBody>
      </Card>
    </form>
  )
}
```

- [ ] **Step 2.5: Create `app/admin/secciones/page.tsx` (list)**

```tsx
import { Topbar } from "@/components/admin/topbar"
import { Button } from "@/components/ui/button"
import { Card, CardBody } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Plus } from "lucide-react"

export default async function SeccionesPage() {
  const supabase = await createSupabaseServerClient()
  const { data: secciones } = await supabase
    .from("secciones")
    .select("id, nombre, slug, tono, activa, orden")
    .order("orden", { ascending: true })

  return (
    <div>
      <Topbar
        title="Secciones"
        subtitle="Organiza tu catálogo en categorías visibles para el cliente"
        actions={
          <Link href="/admin/secciones/nueva">
            <Button size="md">
              <Plus size={16} />
              Nueva sección
            </Button>
          </Link>
        }
      />
      {secciones && secciones.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {secciones.map((s) => (
            <Link key={s.id} href={`/admin/secciones/${s.id}`}>
              <Card className="hover:border-gold-primary transition-colors cursor-pointer">
                <CardBody>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-serif text-xl text-white">{s.nombre}</h3>
                    <Badge tone={s.activa ? "success" : "neutral"}>
                      {s.activa ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                  <p className="text-muted text-xs">/{s.slug}</p>
                  <p className="text-muted text-xs mt-2">Tono: {s.tono}</p>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardBody className="text-center py-16 text-muted">
            <p className="font-serif text-xl text-white mb-2">Aún no tienes secciones</p>
            <p className="text-sm mb-6">Crea tu primera sección para empezar a organizar productos.</p>
            <Link href="/admin/secciones/nueva">
              <Button>
                <Plus size={16} />
                Crear primera sección
              </Button>
            </Link>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 2.6: Create `app/admin/secciones/nueva/page.tsx`**

```tsx
import { Topbar } from "@/components/admin/topbar"
import { SeccionForm } from "@/components/admin/forms/SeccionForm"

export default function NuevaSeccionPage() {
  return (
    <div className="max-w-3xl">
      <Topbar title="Nueva sección" subtitle="Crea una categoría para agrupar productos" />
      <SeccionForm />
    </div>
  )
}
```

- [ ] **Step 2.7: Create `app/admin/secciones/[id]/page.tsx` (edit + subsecciones)**

```tsx
import { notFound } from "next/navigation"
import { Topbar } from "@/components/admin/topbar"
import { SeccionForm } from "@/components/admin/forms/SeccionForm"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ConfirmDialog } from "@/components/admin/ConfirmDialog"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { deleteSeccion } from "@/app/admin/secciones/actions"
import { redirect } from "next/navigation"
import { Trash2 } from "lucide-react"
import { SubseccionesEditor } from "@/components/admin/forms/SubseccionesEditor"

export default async function EditarSeccionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: seccion } = await supabase.from("secciones").select("*").eq("id", id).single()
  if (!seccion) notFound()

  const { data: subsecciones } = await supabase
    .from("subsecciones")
    .select("id, nombre, slug, orden")
    .eq("seccion_id", id)
    .order("orden", { ascending: true })

  async function handleDelete() {
    "use server"
    const result = await deleteSeccion(id)
    if (result?.error) return result
    redirect("/admin/secciones")
  }

  return (
    <div className="max-w-3xl">
      <Topbar title={`Editar: ${seccion.nombre}`} subtitle="Información de sección y subsecciones" />
      <div className="space-y-6">
        <SeccionForm initial={seccion} />
        <SubseccionesEditor seccionId={id} initial={subsecciones || []} />
        <Card>
          <CardHeader>
            <h3 className="font-serif text-lg text-danger">Zona peligrosa</h3>
          </CardHeader>
          <CardBody>
            <p className="text-muted text-sm mb-4">
              Borrar esta sección es permanente. Solo se permite si la sección no tiene productos asociados.
            </p>
            <form action={handleDelete}>
              <ConfirmDialog
                trigger={
                  <Button type="button" variant="danger" size="sm">
                    <Trash2 size={14} />
                    Borrar sección
                  </Button>
                }
                title="¿Borrar sección?"
                description={`Esta acción no se puede deshacer. Se borrará "${seccion.nombre}" y todas sus subsecciones.`}
                confirmLabel="Borrar"
                onConfirm={async () => {
                  await handleDelete()
                }}
              />
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 2.8: Create `components/admin/forms/SubseccionesEditor.tsx`**

```tsx
"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { toSlug } from "@/lib/helpers/slug"
import { createSubseccion, deleteSubseccion } from "@/app/admin/secciones/actions"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"

interface Subseccion {
  id: string
  nombre: string
  slug: string
  orden: number
}

interface Props {
  seccionId: string
  initial: Subseccion[]
}

export function SubseccionesEditor({ seccionId, initial }: Props) {
  const [isPending, startTransition] = useTransition()
  const [nombre, setNombre] = useState("")

  function handleAdd() {
    if (!nombre.trim()) return
    startTransition(async () => {
      const result = await createSubseccion({
        seccion_id: seccionId,
        nombre,
        slug: toSlug(nombre),
        orden: initial.length,
      })
      if (result?.error) {
        toast.error(result.error)
        return
      }
      setNombre("")
      toast.success("Subsección creada")
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteSubseccion(id, seccionId)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success("Subsección borrada")
    })
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="font-serif text-lg text-white">Subsecciones</h3>
        <p className="text-muted text-xs mt-1">Opcional. Para dividir esta sección en grupos más finos.</p>
      </CardHeader>
      <CardBody className="space-y-3">
        {initial.length === 0 && (
          <p className="text-muted text-sm">Sin subsecciones todavía.</p>
        )}
        {initial.map((sub) => (
          <div key={sub.id} className="flex items-center gap-2 p-2 bg-black rounded-md border border-border">
            <span className="flex-1 text-white text-sm">{sub.nombre}</span>
            <span className="text-muted text-xs">/{sub.slug}</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(sub.id)} disabled={isPending}>
              <Trash2 size={14} />
            </Button>
          </div>
        ))}
        <div className="flex gap-2 pt-2 border-t border-border">
          <Input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre de la subsección (ej. Para Él)"
          />
          <Button type="button" size="sm" onClick={handleAdd} disabled={isPending || !nombre.trim()}>
            <Plus size={14} />
            Agregar
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}
```

- [ ] **Step 2.9: Verify TSC + commit**

```bash
npx tsc --noEmit
git add app/admin/secciones/ components/admin/forms/SeccionForm.tsx components/admin/forms/SubseccionesEditor.tsx components/admin/ImageUploader.tsx components/admin/ConfirmDialog.tsx next.config.ts
git commit -m "feat(admin): CRUD completo de secciones y subsecciones con upload de portada"
```

---

## Task 3: Etiquetas — CRUD

**Files:**
- Create: `app/admin/etiquetas/page.tsx`
- Create: `app/admin/etiquetas/actions.ts`
- Create: `components/admin/forms/EtiquetaForm.tsx`

- [ ] **Step 3.1: Create `app/admin/etiquetas/actions.ts`**

```ts
"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { etiquetaSchema, type EtiquetaInput } from "@/lib/validations/etiqueta"
import { revalidatePath } from "next/cache"

export async function createEtiqueta(input: EtiquetaInput) {
  const parsed = etiquetaSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Datos inválidos" }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("etiquetas").insert(parsed.data)
  if (error) return { error: error.message }
  revalidatePath("/admin/etiquetas")
  return { success: true }
}

export async function updateEtiqueta(id: string, input: EtiquetaInput) {
  const parsed = etiquetaSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Datos inválidos" }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("etiquetas").update(parsed.data).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/etiquetas")
  return { success: true }
}

export async function deleteEtiqueta(id: string) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("etiquetas").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/etiquetas")
  return { success: true }
}
```

- [ ] **Step 3.2: Create `components/admin/forms/EtiquetaForm.tsx`**

```tsx
"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardBody } from "@/components/ui/card"
import { toSlug } from "@/lib/helpers/slug"
import { createEtiqueta, updateEtiqueta, deleteEtiqueta } from "@/app/admin/etiquetas/actions"
import type { EtiquetaInput } from "@/lib/validations/etiqueta"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/admin/ConfirmDialog"
import { Trash2 } from "lucide-react"

interface Props {
  initial?: EtiquetaInput & { id: string }
  onDone?: () => void
}

export function EtiquetaForm({ initial, onDone }: Props) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState<EtiquetaInput>({
    nombre: initial?.nombre || "",
    slug: initial?.slug || "",
    color: initial?.color || "#c9a86a",
  })

  function set<K extends keyof EtiquetaInput>(k: K, v: EtiquetaInput[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = initial ? await updateEtiqueta(initial.id, form) : await createEtiqueta(form)
      if (result.error) return toast.error(result.error)
      toast.success(initial ? "Etiqueta actualizada" : "Etiqueta creada")
      if (!initial) setForm({ nombre: "", slug: "", color: "#c9a86a" })
      onDone?.()
    })
  }

  function handleDelete() {
    if (!initial) return
    startTransition(async () => {
      const result = await deleteEtiqueta(initial.id)
      if (result.error) return toast.error(result.error)
      toast.success("Etiqueta borrada")
      onDone?.()
    })
  }

  return (
    <Card>
      <CardBody>
        <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-2 items-end">
          <div className="col-span-4">
            <label className="eyebrow block mb-1.5">Nombre</label>
            <Input
              value={form.nombre}
              onChange={(e) => {
                set("nombre", e.target.value)
                if (!initial) set("slug", toSlug(e.target.value))
              }}
              placeholder="Ej. Regalo Perfecto"
              required
            />
          </div>
          <div className="col-span-4">
            <label className="eyebrow block mb-1.5">Slug</label>
            <Input value={form.slug} onChange={(e) => set("slug", toSlug(e.target.value))} required />
          </div>
          <div className="col-span-2">
            <label className="eyebrow block mb-1.5">Color</label>
            <input
              type="color"
              value={form.color}
              onChange={(e) => set("color", e.target.value)}
              className="w-full h-10 rounded-md border border-border bg-black cursor-pointer"
            />
          </div>
          <div className="col-span-2 flex gap-1">
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "..." : initial ? "Guardar" : "Crear"}
            </Button>
            {initial && (
              <ConfirmDialog
                trigger={
                  <Button type="button" variant="danger" size="sm">
                    <Trash2 size={14} />
                  </Button>
                }
                title="¿Borrar etiqueta?"
                description={`"${initial.nombre}" desaparecerá de todos los productos que la usaban.`}
                onConfirm={handleDelete}
              />
            )}
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
```

- [ ] **Step 3.3: Create `app/admin/etiquetas/page.tsx`**

```tsx
import { Topbar } from "@/components/admin/topbar"
import { EtiquetaForm } from "@/components/admin/forms/EtiquetaForm"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export default async function EtiquetasPage() {
  const supabase = await createSupabaseServerClient()
  const { data: etiquetas } = await supabase
    .from("etiquetas")
    .select("id, nombre, slug, color")
    .order("nombre", { ascending: true })

  return (
    <div className="max-w-3xl">
      <Topbar
        title="Etiquetas"
        subtitle="Tags transversales para potenciar filtros y carruseles del home (ej. Regalo Perfecto, Bajo $30)"
      />
      <div className="space-y-3">
        {etiquetas?.map((e) => (
          <EtiquetaForm key={e.id} initial={e} />
        ))}
        <div>
          <h3 className="eyebrow mb-2">Crear nueva</h3>
          <EtiquetaForm />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3.4: Verify TSC + commit**

```bash
npx tsc --noEmit
git add app/admin/etiquetas/ components/admin/forms/EtiquetaForm.tsx
git commit -m "feat(admin): CRUD de etiquetas con form inline reutilizable"
```

---

## Task 4: Productos — lista con filtros y bulk actions

**Files:**
- Create: `app/admin/productos/page.tsx`
- Create: `app/admin/productos/actions.ts` (mutations: bulk publish, archive, delete)
- Create: `components/admin/tables/ProductosTable.tsx`
- Create: `components/admin/tables/ProductosFilters.tsx`
- Create: `components/admin/tables/BulkActionsBar.tsx`

- [ ] **Step 4.1: Create `app/admin/productos/actions.ts`** (mutations only for this task; create/edit comes in Task 5)

```ts
"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function bulkPublish(ids: string[]) {
  if (ids.length === 0) return { error: "Sin selección" }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from("productos")
    .update({ estado: "publicado", published_at: new Date().toISOString() })
    .in("id", ids)
  if (error) return { error: error.message }
  revalidatePath("/admin/productos")
  return { success: true, count: ids.length }
}

export async function bulkArchive(ids: string[]) {
  if (ids.length === 0) return { error: "Sin selección" }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("productos").update({ estado: "archivado" }).in("id", ids)
  if (error) return { error: error.message }
  revalidatePath("/admin/productos")
  return { success: true, count: ids.length }
}

export async function bulkDelete(ids: string[]) {
  if (ids.length === 0) return { error: "Sin selección" }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("productos").delete().in("id", ids)
  if (error) return { error: error.message }
  revalidatePath("/admin/productos")
  return { success: true, count: ids.length }
}

export async function bulkAssignSeccion(ids: string[], seccionId: string) {
  if (ids.length === 0) return { error: "Sin selección" }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from("productos")
    .update({ seccion_id: seccionId, subseccion_id: null })
    .in("id", ids)
  if (error) return { error: error.message }
  revalidatePath("/admin/productos")
  return { success: true, count: ids.length }
}

export async function bulkApplyMargen(ids: string[], margenPorcentaje: number) {
  if (ids.length === 0) return { error: "Sin selección" }
  const supabase = await createSupabaseServerClient()
  const { data: productos } = await supabase
    .from("productos")
    .select("id, costo_temu, costo_envio_unitario")
    .in("id", ids)
  if (!productos) return { error: "No se pudo leer productos" }
  await Promise.all(
    productos.map((p) => {
      const total = (p.costo_temu || 0) + (p.costo_envio_unitario || 0)
      const precio = Math.round(total * (1 + margenPorcentaje / 100) * 100) / 100
      return supabase.from("productos").update({ precio_venta: precio, margen_override_porcentaje: margenPorcentaje }).eq("id", p.id)
    })
  )
  revalidatePath("/admin/productos")
  return { success: true, count: ids.length }
}
```

- [ ] **Step 4.2: Create `components/admin/tables/ProductosFilters.tsx`**

```tsx
"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Input } from "@/components/ui/input"
import { useTransition } from "react"
import { Search } from "lucide-react"

interface Props {
  secciones: { id: string; nombre: string }[]
}

const ESTADOS = [
  { value: "", label: "Todos" },
  { value: "publicado", label: "Publicados" },
  { value: "borrador", label: "Borradores" },
  { value: "archivado", label: "Archivados" },
]

const MODOS = [
  { value: "", label: "Todos modos" },
  { value: "stock", label: "En stock" },
  { value: "preorden", label: "Pre-orden" },
]

export function ProductosFilters({ secciones }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [, startTransition] = useTransition()

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`)
    })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      <div className="flex-1 min-w-[260px] relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gold-primary" />
        <Input
          defaultValue={params.get("q") || ""}
          onChange={(e) => setParam("q", e.target.value)}
          placeholder="Buscar por nombre, modelo o ID..."
          className="pl-9"
        />
      </div>
      <select
        defaultValue={params.get("estado") || ""}
        onChange={(e) => setParam("estado", e.target.value)}
        className="bg-black border border-border rounded-md px-3 py-2 text-white text-sm"
      >
        {ESTADOS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <select
        defaultValue={params.get("modo") || ""}
        onChange={(e) => setParam("modo", e.target.value)}
        className="bg-black border border-border rounded-md px-3 py-2 text-white text-sm"
      >
        {MODOS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <select
        defaultValue={params.get("seccion") || ""}
        onChange={(e) => setParam("seccion", e.target.value)}
        className="bg-black border border-border rounded-md px-3 py-2 text-white text-sm"
      >
        <option value="">Toda sección</option>
        {secciones.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
      </select>
    </div>
  )
}
```

- [ ] **Step 4.3: Create `components/admin/tables/BulkActionsBar.tsx`**

```tsx
"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { bulkPublish, bulkArchive, bulkDelete, bulkApplyMargen } from "@/app/admin/productos/actions"
import { ConfirmDialog } from "@/components/admin/ConfirmDialog"
import { toast } from "sonner"
import { Check, Archive, Trash2, Percent } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface Props {
  selected: string[]
  onClear: () => void
}

export function BulkActionsBar({ selected, onClear }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [margen, setMargen] = useState<string>("")

  if (selected.length === 0) return null

  function handle(fn: () => Promise<{ success?: boolean; count?: number; error?: string }>, label: string) {
    startTransition(async () => {
      const r = await fn()
      if (r.error) return toast.error(r.error)
      toast.success(`${label}: ${r.count} producto(s)`)
      onClear()
      router.refresh()
    })
  }

  return (
    <div className="sticky top-0 z-10 bg-black-surface border border-gold-primary/40 rounded-lg p-3 flex items-center gap-3 flex-wrap mb-4">
      <span className="text-gold-primary font-semibold text-sm">
        {selected.length} seleccionado(s)
      </span>
      <div className="flex-1" />
      <Button size="sm" variant="ghost" onClick={() => handle(() => bulkPublish(selected), "Publicados")} disabled={isPending}>
        <Check size={14} />
        Publicar
      </Button>
      <Button size="sm" variant="ghost" onClick={() => handle(() => bulkArchive(selected), "Archivados")} disabled={isPending}>
        <Archive size={14} />
        Archivar
      </Button>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          min={0}
          max={500}
          value={margen}
          onChange={(e) => setMargen(e.target.value)}
          placeholder="%"
          className="w-20"
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            const n = parseInt(margen)
            if (isNaN(n) || n < 0) return toast.error("Margen inválido")
            handle(() => bulkApplyMargen(selected, n), "Margen aplicado")
          }}
          disabled={isPending || !margen}
        >
          <Percent size={14} />
          Aplicar margen
        </Button>
      </div>
      <ConfirmDialog
        trigger={
          <Button size="sm" variant="danger">
            <Trash2 size={14} />
            Borrar
          </Button>
        }
        title={`¿Borrar ${selected.length} producto(s)?`}
        description="Esta acción no se puede deshacer. Las imágenes en Storage NO se borran automáticamente."
        onConfirm={async () => handle(() => bulkDelete(selected), "Borrados")}
      />
      <Button size="sm" variant="ghost" onClick={onClear} disabled={isPending}>
        Cancelar selección
      </Button>
    </div>
  )
}
```

- [ ] **Step 4.4: Create `components/admin/tables/ProductosTable.tsx`**

```tsx
"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { BulkActionsBar } from "./BulkActionsBar"
import { formatUSD } from "@/lib/utils"
import { ChevronRight } from "lucide-react"

interface Producto {
  id: string
  nombre: string
  modelo: string | null
  estado: string
  modo: string
  stock_unidades: number | null
  precio_venta: number
  precio_anterior: number | null
  destacado: boolean
  secciones: { nombre: string } | null
  producto_imagenes: { url: string }[]
}

export function ProductosTable({ productos }: { productos: Producto[] }) {
  const [selected, setSelected] = useState<string[]>([])

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function toggleAll() {
    if (selected.length === productos.length) setSelected([])
    else setSelected(productos.map((p) => p.id))
  }

  if (productos.length === 0) {
    return (
      <Card>
        <div className="p-12 text-center text-muted">
          <p className="font-serif text-xl text-white mb-2">No hay productos</p>
          <p className="text-sm">Crea uno nuevo o ajusta los filtros.</p>
        </div>
      </Card>
    )
  }

  return (
    <>
      <BulkActionsBar selected={selected} onClear={() => setSelected([])} />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-black/40 text-muted text-xs uppercase tracking-wider">
              <tr>
                <th className="p-3 text-left w-8">
                  <input type="checkbox" onChange={toggleAll} checked={selected.length === productos.length && productos.length > 0} className="accent-gold-primary" />
                </th>
                <th className="p-3 text-left w-16"></th>
                <th className="p-3 text-left">Producto</th>
                <th className="p-3 text-left">Sección</th>
                <th className="p-3 text-left">Modo</th>
                <th className="p-3 text-left">Estado</th>
                <th className="p-3 text-right">Precio</th>
                <th className="p-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => {
                const img = p.producto_imagenes?.[0]?.url
                const isStock = p.modo === "stock"
                const agotado = isStock && (p.stock_unidades ?? 0) === 0
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-white/2">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selected.includes(p.id)}
                        onChange={() => toggle(p.id)}
                        className="accent-gold-primary"
                      />
                    </td>
                    <td className="p-3">
                      <div className="relative w-12 h-12 rounded-md overflow-hidden bg-black">
                        {img ? (
                          <Image src={img} alt={p.nombre} fill className="object-cover" sizes="48px" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gold-deep/30 to-black" />
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <Link href={`/admin/productos/${p.id}`} className="font-serif text-white hover:text-gold-primary">
                        {p.nombre}
                      </Link>
                      {p.modelo && <div className="text-xs text-muted">{p.modelo}</div>}
                      {p.destacado && <Badge tone="gold" className="mt-1">Destacado</Badge>}
                    </td>
                    <td className="p-3 text-muted">{p.secciones?.nombre ?? "—"}</td>
                    <td className="p-3">
                      <Badge tone={isStock ? "success" : "info"}>
                        {isStock ? `Stock · ${p.stock_unidades ?? 0}` : "Pre-orden"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge tone={p.estado === "publicado" ? "success" : p.estado === "borrador" ? "warning" : "neutral"}>
                        {p.estado}
                      </Badge>
                      {agotado && <Badge tone="danger" className="ml-1">Agotado</Badge>}
                    </td>
                    <td className="p-3 text-right">
                      <div className="font-serif text-gold-primary">{formatUSD(p.precio_venta)}</div>
                      {p.precio_anterior && (
                        <div className="text-xs text-muted line-through">{formatUSD(p.precio_anterior)}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <Link href={`/admin/productos/${p.id}`} className="text-muted hover:text-gold-primary">
                        <ChevronRight size={16} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
```

- [ ] **Step 4.5: Create `app/admin/productos/page.tsx`**

```tsx
import { Topbar } from "@/components/admin/topbar"
import { Button } from "@/components/ui/button"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Plus } from "lucide-react"
import { ProductosFilters } from "@/components/admin/tables/ProductosFilters"
import { ProductosTable } from "@/components/admin/tables/ProductosTable"

interface SearchParams {
  q?: string
  estado?: string
  modo?: string
  seccion?: string
}

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createSupabaseServerClient()

  let query = supabase
    .from("productos")
    .select("id, nombre, modelo, estado, modo, stock_unidades, precio_venta, precio_anterior, destacado, secciones(nombre), producto_imagenes(url)")
    .order("updated_at", { ascending: false })
    .limit(100)

  if (params.q) query = query.or(`nombre.ilike.%${params.q}%,modelo.ilike.%${params.q}%`)
  if (params.estado) query = query.eq("estado", params.estado)
  if (params.modo) query = query.eq("modo", params.modo)
  if (params.seccion) query = query.eq("seccion_id", params.seccion)

  const [{ data: productos }, { data: secciones }] = await Promise.all([
    query,
    supabase.from("secciones").select("id, nombre").order("orden"),
  ])

  return (
    <div>
      <Topbar
        title="Productos"
        subtitle={`${productos?.length ?? 0} productos`}
        actions={
          <Link href="/admin/productos/nuevo">
            <Button size="md">
              <Plus size={16} />
              Nuevo producto
            </Button>
          </Link>
        }
      />
      <ProductosFilters secciones={secciones || []} />
      <ProductosTable productos={(productos as never) ?? []} />
    </div>
  )
}
```

- [ ] **Step 4.6: Verify TSC + commit**

```bash
npx tsc --noEmit
git add app/admin/productos/ components/admin/tables/
git commit -m "feat(admin): productos list view with filters and bulk actions (publish/archive/delete/margen)"
```

---

## Task 5: Productos — formulario completo (create + edit)

This is the biggest task. Decomposed into sub-components.

**Files:**
- Create: `components/admin/forms/ProductoForm.tsx` (main form orchestrator)
- Create: `components/admin/forms/ProductoImagenesGaleria.tsx`
- Create: `components/admin/forms/ProductoVariantes.tsx`
- Modify: `app/admin/productos/actions.ts` (add createProducto, updateProducto, etc.)
- Create: `app/admin/productos/nuevo/page.tsx`
- Create: `app/admin/productos/[id]/page.tsx`

- [ ] **Step 5.1: Extend `app/admin/productos/actions.ts` with create/update actions**

Append these functions to the file:

```ts
import { productoSchema, varianteSchema, type ProductoInput, type VarianteInput } from "@/lib/validations/producto"
import { redirect } from "next/navigation"
import { toSlug } from "@/lib/helpers/slug"

export async function createProducto(input: ProductoInput) {
  const parsed = productoSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Datos inválidos" }
  const supabase = await createSupabaseServerClient()
  const payload = {
    ...parsed.data,
    published_at: parsed.data.estado === "publicado" ? new Date().toISOString() : null,
  }
  const { data, error } = await supabase.from("productos").insert(payload).select("id").single()
  if (error) return { error: error.message }
  revalidatePath("/admin/productos")
  redirect(`/admin/productos/${data.id}`)
}

export async function updateProducto(id: string, input: ProductoInput) {
  const parsed = productoSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Datos inválidos" }
  const supabase = await createSupabaseServerClient()
  const wasPublished = (await supabase.from("productos").select("published_at, estado").eq("id", id).single()).data
  const payload = {
    ...parsed.data,
    published_at:
      parsed.data.estado === "publicado" && !wasPublished?.published_at
        ? new Date().toISOString()
        : wasPublished?.published_at,
  }
  const { error } = await supabase.from("productos").update(payload).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/productos")
  revalidatePath(`/admin/productos/${id}`)
  return { success: true }
}

export async function deleteProducto(id: string) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("productos").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/productos")
  redirect("/admin/productos")
}

// === Imágenes ===

export async function addProductoImagen(
  producto_id: string,
  url: string,
  tipo: "imagen" | "video" = "imagen",
  watermark_limpio = false
) {
  const supabase = await createSupabaseServerClient()
  const { count } = await supabase
    .from("producto_imagenes")
    .select("*", { count: "exact", head: true })
    .eq("producto_id", producto_id)
  const { error } = await supabase.from("producto_imagenes").insert({
    producto_id,
    url,
    tipo,
    watermark_limpio,
    orden: count ?? 0,
  })
  if (error) return { error: error.message }
  revalidatePath(`/admin/productos/${producto_id}`)
  return { success: true }
}

export async function removeProductoImagen(id: string, producto_id: string) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("producto_imagenes").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath(`/admin/productos/${producto_id}`)
  return { success: true }
}

export async function reorderProductoImagenes(producto_id: string, ids: string[]) {
  const supabase = await createSupabaseServerClient()
  await Promise.all(ids.map((id, idx) => supabase.from("producto_imagenes").update({ orden: idx }).eq("id", id)))
  revalidatePath(`/admin/productos/${producto_id}`)
  return { success: true }
}

export async function markImagenWatermarkLimpio(id: string, producto_id: string, limpio: boolean) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("producto_imagenes").update({ watermark_limpio: limpio }).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath(`/admin/productos/${producto_id}`)
  return { success: true }
}

// === Variantes ===

export async function addVariante(producto_id: string, input: VarianteInput) {
  const parsed = varianteSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Datos inválidos" }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("producto_variantes").insert({ producto_id, ...parsed.data })
  if (error) return { error: error.message }
  revalidatePath(`/admin/productos/${producto_id}`)
  return { success: true }
}

export async function updateVariante(id: string, producto_id: string, input: VarianteInput) {
  const parsed = varianteSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Datos inválidos" }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("producto_variantes").update(parsed.data).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath(`/admin/productos/${producto_id}`)
  return { success: true }
}

export async function removeVariante(id: string, producto_id: string) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("producto_variantes").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath(`/admin/productos/${producto_id}`)
  return { success: true }
}
```

- [ ] **Step 5.2: Create `components/admin/forms/ProductoImagenesGaleria.tsx`**

```tsx
"use client"

import { useState, useRef, useTransition } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { uploadFile, deleteFile, pathFromUrl } from "@/lib/storage/upload"
import { addProductoImagen, removeProductoImagen, markImagenWatermarkLimpio } from "@/app/admin/productos/actions"
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
  const [items] = useState(initial)

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
      if (result.error) toast.error(result.error)
      else toast.success("Eliminada")
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
      <label className="eyebrow block">Galería · {items.length} archivos</label>
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
        {items.map((img, idx) => (
          <div key={img.id} className="relative aspect-square rounded-md overflow-hidden border border-border bg-black group">
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
```

- [ ] **Step 5.3: Create `components/admin/forms/ProductoVariantes.tsx`**

```tsx
"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { addVariante, removeVariante } from "@/app/admin/productos/actions"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"

interface Variante {
  id: string
  tipo: string
  valor: string
  precio_extra: number
  stock_unidades: number | null
  orden: number
}

interface Props {
  productoId: string
  initial: Variante[]
}

export function ProductoVariantes({ productoId, initial }: Props) {
  const [isPending, startTransition] = useTransition()
  const [draft, setDraft] = useState({ tipo: "Color", valor: "", precio_extra: 0, stock_unidades: "" as string | "" })

  function handleAdd() {
    if (!draft.tipo || !draft.valor) return toast.error("Tipo y valor son requeridos")
    startTransition(async () => {
      const result = await addVariante(productoId, {
        tipo: draft.tipo,
        valor: draft.valor,
        precio_extra: Number(draft.precio_extra) || 0,
        stock_unidades: draft.stock_unidades === "" ? null : Number(draft.stock_unidades),
        orden: initial.length,
      })
      if (result.error) return toast.error(result.error)
      toast.success("Variante agregada")
      setDraft({ tipo: "Color", valor: "", precio_extra: 0, stock_unidades: "" })
    })
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      const result = await removeVariante(id, productoId)
      if (result.error) toast.error(result.error)
    })
  }

  return (
    <div className="space-y-2">
      <label className="eyebrow block">Variantes</label>
      {initial.length === 0 && <p className="text-muted text-xs">Sin variantes. El producto se vende sin opciones.</p>}
      {initial.map((v) => (
        <div key={v.id} className="grid grid-cols-12 gap-2 items-center p-2 bg-black rounded-md border border-border">
          <div className="col-span-3 text-sm">
            <span className="text-muted text-xs">Tipo:</span> {v.tipo}
          </div>
          <div className="col-span-4 text-sm">
            <span className="text-muted text-xs">Valor:</span> {v.valor}
          </div>
          <div className="col-span-2 text-sm text-gold-primary">
            +${v.precio_extra.toFixed(2)}
          </div>
          <div className="col-span-2 text-sm">
            {v.stock_unidades !== null ? `${v.stock_unidades} unid.` : "—"}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => handleRemove(v.id)} disabled={isPending}>
            <Trash2 size={14} />
          </Button>
        </div>
      ))}
      <div className="grid grid-cols-12 gap-2 items-end pt-2 border-t border-border">
        <div className="col-span-3">
          <label className="text-xs text-muted">Tipo</label>
          <select
            value={draft.tipo}
            onChange={(e) => setDraft({ ...draft, tipo: e.target.value })}
            className="w-full bg-black border border-border rounded-md px-2 py-2 text-white text-sm"
          >
            <option value="Color">Color</option>
            <option value="Talla">Talla</option>
            <option value="Modelo">Modelo</option>
            <option value="Material">Material</option>
          </select>
        </div>
        <div className="col-span-4">
          <label className="text-xs text-muted">Valor</label>
          <Input value={draft.valor} onChange={(e) => setDraft({ ...draft, valor: e.target.value })} placeholder="Burdeos / M / Acero" />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-muted">Precio extra</label>
          <Input type="number" step="0.01" min={0} value={draft.precio_extra} onChange={(e) => setDraft({ ...draft, precio_extra: Number(e.target.value) })} />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-muted">Stock</label>
          <Input type="number" min={0} value={draft.stock_unidades} onChange={(e) => setDraft({ ...draft, stock_unidades: e.target.value })} placeholder="—" />
        </div>
        <Button type="button" size="sm" onClick={handleAdd} disabled={isPending}>
          <Plus size={14} />
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5.4: Create `components/admin/forms/ProductoForm.tsx`** (the main orchestrator)

This is the largest component. Includes all fields except images/variants/related (those are separate components mounted in the edit page).

```tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toSlug } from "@/lib/helpers/slug"
import { calcularPrecioVenta, calcularMargenReal, calcularGananciaNeta } from "@/lib/helpers/margen"
import { createProducto, updateProducto } from "@/app/admin/productos/actions"
import type { ProductoInput } from "@/lib/validations/producto"
import { toast } from "sonner"
import { formatUSD } from "@/lib/utils"

interface Seccion {
  id: string
  nombre: string
  subsecciones: { id: string; nombre: string }[]
}

interface Etiqueta {
  id: string
  nombre: string
  slug: string
  color: string
}

interface Props {
  initial?: Partial<ProductoInput> & { id?: string }
  secciones: Seccion[]
  etiquetas: Etiqueta[]
  margenGlobal: number
}

export function ProductoForm({ initial, secciones, etiquetas, margenGlobal }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState<ProductoInput>({
    nombre: initial?.nombre || "",
    nombre_temu: initial?.nombre_temu || null,
    descripcion: initial?.descripcion || null,
    slug: initial?.slug || "",
    modelo: initial?.modelo || null,
    seccion_id: initial?.seccion_id || null,
    subseccion_id: initial?.subseccion_id || null,
    modo: initial?.modo || "preorden",
    stock_unidades: initial?.stock_unidades ?? null,
    costo_temu: initial?.costo_temu ?? 0,
    costo_envio_unitario: initial?.costo_envio_unitario ?? 0,
    precio_venta: initial?.precio_venta ?? 0,
    precio_anterior: initial?.precio_anterior ?? null,
    margen_override_porcentaje: initial?.margen_override_porcentaje ?? null,
    temu_url: initial?.temu_url || null,
    temu_goods_id: initial?.temu_goods_id || null,
    notas_internas: initial?.notas_internas || null,
    estado: initial?.estado || "borrador",
    destacado: initial?.destacado ?? false,
    etiquetas: initial?.etiquetas || [],
    fecha_llegada_inicio: initial?.fecha_llegada_inicio || null,
    fecha_llegada_fin: initial?.fecha_llegada_fin || null,
    solo_para_ella: initial?.solo_para_ella ?? false,
    solo_para_el: initial?.solo_para_el ?? false,
  })

  function set<K extends keyof ProductoInput>(k: K, v: ProductoInput[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  const margenEfectivo = form.margen_override_porcentaje ?? margenGlobal
  const precioCalculado = calcularPrecioVenta(form.costo_temu, form.costo_envio_unitario, margenEfectivo)
  const margenReal = calcularMargenReal(form.precio_venta, form.costo_temu, form.costo_envio_unitario)
  const gananciaNeta = calcularGananciaNeta(form.precio_venta, form.costo_temu, form.costo_envio_unitario)

  const seccionSeleccionada = secciones.find((s) => s.id === form.seccion_id)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = initial?.id ? await updateProducto(initial.id, form) : await createProducto(form)
      if (result?.error) return toast.error(result.error)
      toast.success(initial?.id ? "Producto actualizado" : "Producto creado")
    })
  }

  function toggleEtiqueta(slug: string) {
    set("etiquetas", form.etiquetas.includes(slug) ? form.etiquetas.filter((e) => e !== slug) : [...form.etiquetas, slug])
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="font-serif text-lg text-white">Información básica</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="eyebrow block mb-1.5">Nombre evocativo</label>
              <Input
                value={form.nombre}
                onChange={(e) => set("nombre", e.target.value)}
                onBlur={() => !form.slug && set("slug", toSlug(form.nombre))}
                placeholder="Ej. Royal Blue, Pink Diamond"
                required
              />
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Slug (URL)</label>
              <Input value={form.slug} onChange={(e) => set("slug", toSlug(e.target.value))} required />
            </div>
          </div>
          <div>
            <label className="eyebrow block mb-1.5">Descripción</label>
            <textarea
              value={form.descripcion ?? ""}
              onChange={(e) => set("descripcion", e.target.value || null)}
              rows={4}
              className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm"
              placeholder="Pasión en cada detalle. Reloj de mujer con esfera burdeos profunda y acabado en oro rosado — la pieza que convierte cualquier ocasión en memorable."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="eyebrow block mb-1.5">Modelo (interno)</label>
              <Input value={form.modelo ?? ""} onChange={(e) => set("modelo", e.target.value || null)} placeholder="RB-001" />
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Nombre original (interno)</label>
              <Input value={form.nombre_temu ?? ""} onChange={(e) => set("nombre_temu", e.target.value || null)} placeholder="Solo referencia tuya" />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-serif text-lg text-white">Categorización</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="eyebrow block mb-1.5">Sección</label>
              <select
                value={form.seccion_id ?? ""}
                onChange={(e) => {
                  set("seccion_id", e.target.value || null)
                  set("subseccion_id", null)
                }}
                className="w-full bg-black border border-border rounded-md px-3 py-2.5 text-white text-sm"
              >
                <option value="">Sin sección</option>
                {secciones.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Subsección</label>
              <select
                value={form.subseccion_id ?? ""}
                onChange={(e) => set("subseccion_id", e.target.value || null)}
                className="w-full bg-black border border-border rounded-md px-3 py-2.5 text-white text-sm"
                disabled={!seccionSeleccionada}
              >
                <option value="">Sin subsección</option>
                {seccionSeleccionada?.subsecciones.map((sub) => (
                  <option key={sub.id} value={sub.id}>{sub.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="eyebrow block mb-1.5">Etiquetas</label>
            <div className="flex flex-wrap gap-2">
              {etiquetas.length === 0 && <p className="text-muted text-xs">Sin etiquetas todavía. Crea algunas en /admin/etiquetas.</p>}
              {etiquetas.map((et) => (
                <button
                  key={et.id}
                  type="button"
                  onClick={() => toggleEtiqueta(et.slug)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    form.etiquetas.includes(et.slug)
                      ? "bg-gold-primary/20 border-gold-primary text-gold-primary"
                      : "bg-black border-border text-muted hover:border-gold-primary"
                  }`}
                >
                  {et.nombre}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-white">
              <input type="checkbox" checked={form.solo_para_ella} onChange={(e) => set("solo_para_ella", e.target.checked)} className="accent-gold-primary" />
              Solo Para Ella
            </label>
            <label className="flex items-center gap-2 text-sm text-white">
              <input type="checkbox" checked={form.solo_para_el} onChange={(e) => set("solo_para_el", e.target.checked)} className="accent-gold-primary" />
              Solo Para Él
            </label>
            <label className="flex items-center gap-2 text-sm text-white">
              <input type="checkbox" checked={form.destacado} onChange={(e) => set("destacado", e.target.checked)} className="accent-gold-primary" />
              Destacado en home
            </label>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-serif text-lg text-white">Modo de venta</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => set("modo", "stock")}
              className={`flex-1 p-3 rounded-md border-2 transition-colors ${form.modo === "stock" ? "border-gold-primary bg-gold-primary/10" : "border-border bg-black hover:border-border-strong"}`}
            >
              <div className="text-white font-semibold">En stock</div>
              <div className="text-muted text-xs">Entrega inmediata. Inventario se decrementa al vender.</div>
            </button>
            <button
              type="button"
              onClick={() => set("modo", "preorden")}
              className={`flex-1 p-3 rounded-md border-2 transition-colors ${form.modo === "preorden" ? "border-gold-primary bg-gold-primary/10" : "border-border bg-black hover:border-border-strong"}`}
            >
              <div className="text-white font-semibold">Pre-orden</div>
              <div className="text-muted text-xs">El cliente lo reserva y se entrega cuando llegue al país.</div>
            </button>
          </div>
          {form.modo === "stock" ? (
            <div>
              <label className="eyebrow block mb-1.5">Unidades disponibles</label>
              <Input type="number" min={0} value={form.stock_unidades ?? 0} onChange={(e) => set("stock_unidades", parseInt(e.target.value) || 0)} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="eyebrow block mb-1.5">Llegada desde</label>
                <Input type="date" value={form.fecha_llegada_inicio ?? ""} onChange={(e) => set("fecha_llegada_inicio", e.target.value || null)} />
              </div>
              <div>
                <label className="eyebrow block mb-1.5">Llegada hasta</label>
                <Input type="date" value={form.fecha_llegada_fin ?? ""} onChange={(e) => set("fecha_llegada_fin", e.target.value || null)} />
              </div>
              <p className="col-span-2 text-muted text-xs">
                Si dejas estos campos vacíos, se usa la fecha global configurada en Configuración → Tienda. Copy al cliente: &ldquo;Tu producto va a estar llegando entre [inicio] y [fin]&rdquo;.
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-serif text-lg text-white">Precios y costos</h3>
          <p className="text-muted text-xs mt-1">Solo tú ves los costos. El cliente solo ve precio de venta.</p>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="eyebrow block mb-1.5">Costo origen (USD)</label>
              <Input type="number" step="0.01" min={0} value={form.costo_temu} onChange={(e) => set("costo_temu", Number(e.target.value))} />
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Costo envío unitario</label>
              <Input type="number" step="0.01" min={0} value={form.costo_envio_unitario} onChange={(e) => set("costo_envio_unitario", Number(e.target.value))} />
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Margen override %</label>
              <Input
                type="number"
                min={0}
                max={500}
                value={form.margen_override_porcentaje ?? ""}
                onChange={(e) => set("margen_override_porcentaje", e.target.value === "" ? null : parseInt(e.target.value))}
                placeholder={`Global: ${margenGlobal}%`}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="eyebrow block mb-1.5">Precio de venta (cliente ve esto)</label>
              <div className="flex gap-2">
                <Input type="number" step="0.01" min={0} value={form.precio_venta} onChange={(e) => set("precio_venta", Number(e.target.value))} required />
                <Button type="button" variant="ghost" size="sm" onClick={() => set("precio_venta", precioCalculado)}>
                  Usar {formatUSD(precioCalculado)}
                </Button>
              </div>
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Precio anterior (oferta tachada)</label>
              <Input type="number" step="0.01" min={0} value={form.precio_anterior ?? ""} onChange={(e) => set("precio_anterior", e.target.value === "" ? null : Number(e.target.value))} placeholder="Sin oferta" />
            </div>
          </div>
          <div className="bg-black rounded-md p-3 grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-muted text-xs">Margen real</div>
              <div className="font-serif text-lg text-gold-primary">{margenReal}%</div>
            </div>
            <div>
              <div className="text-muted text-xs">Ganancia neta</div>
              <div className="font-serif text-lg text-success">{formatUSD(gananciaNeta)}</div>
            </div>
            <div>
              <div className="text-muted text-xs">Precio sugerido (margen {margenEfectivo}%)</div>
              <div className="font-serif text-lg text-white">{formatUSD(precioCalculado)}</div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-serif text-lg text-white">Notas internas</h3>
          <p className="text-muted text-xs mt-1">Solo visibles para el admin. Nunca se muestran al cliente.</p>
        </CardHeader>
        <CardBody>
          <textarea
            value={form.notas_internas ?? ""}
            onChange={(e) => set("notas_internas", e.target.value || null)}
            rows={3}
            className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm"
            placeholder="Ej. Ana de IG preguntó por esto. Ya pedí 3 al supplier 14/may. Cuidado con la humedad."
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-serif text-lg text-white">Referencia origen (interna)</h3>
          <p className="text-muted text-xs mt-1">Para que tú recuerdes de dónde vino. Nunca se muestra al cliente.</p>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="eyebrow block mb-1.5">URL origen</label>
              <Input value={form.temu_url ?? ""} onChange={(e) => set("temu_url", e.target.value || null)} placeholder="Link del producto en supplier" />
            </div>
            <div>
              <label className="eyebrow block mb-1.5">ID origen</label>
              <Input value={form.temu_goods_id ?? ""} onChange={(e) => set("temu_goods_id", e.target.value || null)} placeholder="goods_id" />
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center justify-between sticky bottom-0 bg-black-surface border border-border rounded-lg p-4 mt-6">
        <div className="flex items-center gap-2">
          <span className="eyebrow">Estado:</span>
          <Badge tone={form.estado === "publicado" ? "success" : form.estado === "borrador" ? "warning" : "neutral"}>
            {form.estado}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => set("estado", "borrador")} disabled={isPending}>
            Guardar borrador
          </Button>
          <Button type="submit" onClick={() => set("estado", "publicado")} disabled={isPending}>
            {isPending ? "Guardando..." : initial?.id ? "Guardar y publicar" : "Crear y publicar"}
          </Button>
        </div>
      </div>
    </form>
  )
}
```

- [ ] **Step 5.5: Create `app/admin/productos/nuevo/page.tsx`**

```tsx
import { Topbar } from "@/components/admin/topbar"
import { ProductoForm } from "@/components/admin/forms/ProductoForm"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export default async function NuevoProductoPage() {
  const supabase = await createSupabaseServerClient()
  const [{ data: secciones }, { data: etiquetas }, { data: config }] = await Promise.all([
    supabase.from("secciones").select("id, nombre, subsecciones(id, nombre)").order("orden"),
    supabase.from("etiquetas").select("id, nombre, slug, color").order("nombre"),
    supabase.from("configuracion").select("margen_global_porcentaje").eq("id", 1).single(),
  ])

  return (
    <div className="max-w-4xl">
      <Topbar title="Nuevo producto" subtitle="Crea un producto y publícalo al catálogo" />
      <ProductoForm
        secciones={(secciones as never) || []}
        etiquetas={etiquetas || []}
        margenGlobal={config?.margen_global_porcentaje ?? 60}
      />
    </div>
  )
}
```

- [ ] **Step 5.6: Create `app/admin/productos/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation"
import { Topbar } from "@/components/admin/topbar"
import { ProductoForm } from "@/components/admin/forms/ProductoForm"
import { ProductoImagenesGaleria } from "@/components/admin/forms/ProductoImagenesGaleria"
import { ProductoVariantes } from "@/components/admin/forms/ProductoVariantes"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const [{ data: producto }, { data: secciones }, { data: etiquetas }, { data: config }, { data: imagenes }, { data: variantes }] = await Promise.all([
    supabase.from("productos").select("*").eq("id", id).single(),
    supabase.from("secciones").select("id, nombre, subsecciones(id, nombre)").order("orden"),
    supabase.from("etiquetas").select("id, nombre, slug, color").order("nombre"),
    supabase.from("configuracion").select("margen_global_porcentaje").eq("id", 1).single(),
    supabase.from("producto_imagenes").select("id, url, tipo, watermark_limpio, orden").eq("producto_id", id).order("orden"),
    supabase.from("producto_variantes").select("id, tipo, valor, precio_extra, stock_unidades, orden").eq("producto_id", id).order("orden"),
  ])

  if (!producto) notFound()

  return (
    <div className="max-w-4xl space-y-6">
      <Topbar title={`Editar: ${producto.nombre}`} subtitle="Imágenes, variantes y datos del producto" />
      <ProductoImagenesGaleria productoId={id} initial={imagenes || []} />
      <ProductoVariantes productoId={id} initial={variantes || []} />
      <ProductoForm
        initial={producto}
        secciones={(secciones as never) || []}
        etiquetas={etiquetas || []}
        margenGlobal={config?.margen_global_porcentaje ?? 60}
      />
    </div>
  )
}
```

- [ ] **Step 5.7: TSC + commit**

```bash
npx tsc --noEmit
git add app/admin/productos/ components/admin/forms/
git commit -m "feat(admin): productos form completo con gallery, variantes, costos y estado"
```

---

## Task 6: Combos — CRUD

**Files:**
- Create: `app/admin/combos/page.tsx`
- Create: `app/admin/combos/nuevo/page.tsx`
- Create: `app/admin/combos/[id]/page.tsx`
- Create: `app/admin/combos/actions.ts`
- Create: `components/admin/forms/ComboForm.tsx`

- [ ] **Step 6.1: Create `app/admin/combos/actions.ts`**

```ts
"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { comboSchema, type ComboInput } from "@/lib/validations/combo"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createCombo(input: ComboInput) {
  const parsed = comboSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Datos inválidos" }
  const supabase = await createSupabaseServerClient()
  const { productos, ...rest } = parsed.data
  const { data, error } = await supabase.from("combos").insert(rest).select("id").single()
  if (error) return { error: error.message }
  if (productos.length > 0) {
    await supabase.from("combo_productos").insert(productos.map((p) => ({ ...p, combo_id: data.id })))
  }
  revalidatePath("/admin/combos")
  redirect(`/admin/combos/${data.id}`)
}

export async function updateCombo(id: string, input: ComboInput) {
  const parsed = comboSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Datos inválidos" }
  const supabase = await createSupabaseServerClient()
  const { productos, ...rest } = parsed.data
  const { error } = await supabase.from("combos").update(rest).eq("id", id)
  if (error) return { error: error.message }
  await supabase.from("combo_productos").delete().eq("combo_id", id)
  if (productos.length > 0) {
    await supabase.from("combo_productos").insert(productos.map((p) => ({ ...p, combo_id: id })))
  }
  revalidatePath("/admin/combos")
  revalidatePath(`/admin/combos/${id}`)
  return { success: true }
}

export async function deleteCombo(id: string) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("combos").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/combos")
  redirect("/admin/combos")
}
```

- [ ] **Step 6.2: Create `components/admin/forms/ComboForm.tsx`**

```tsx
"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { ImageUploader } from "@/components/admin/ImageUploader"
import { createCombo, updateCombo, deleteCombo } from "@/app/admin/combos/actions"
import { ConfirmDialog } from "@/components/admin/ConfirmDialog"
import type { ComboInput } from "@/lib/validations/combo"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"
import { formatUSD } from "@/lib/utils"

interface Producto {
  id: string
  nombre: string
  precio_venta: number
}

interface Props {
  initial?: ComboInput & { id: string }
  productosDisponibles: Producto[]
}

export function ComboForm({ initial, productosDisponibles }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState<ComboInput>({
    nombre: initial?.nombre || "",
    descripcion: initial?.descripcion || null,
    precio_combo: initial?.precio_combo ?? 0,
    imagen_url: initial?.imagen_url || null,
    activo: initial?.activo ?? true,
    productos: initial?.productos || [],
  })

  function set<K extends keyof ComboInput>(k: K, v: ComboInput[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function addProducto(productoId: string) {
    if (form.productos.find((p) => p.producto_id === productoId)) return
    set("productos", [...form.productos, { producto_id: productoId, cantidad: 1 }])
  }

  function removeProducto(productoId: string) {
    set("productos", form.productos.filter((p) => p.producto_id !== productoId))
  }

  function updateCantidad(productoId: string, cantidad: number) {
    set("productos", form.productos.map((p) => (p.producto_id === productoId ? { ...p, cantidad } : p)))
  }

  const totalSinDescuento = form.productos.reduce((acc, p) => {
    const prod = productosDisponibles.find((d) => d.id === p.producto_id)
    return acc + (prod?.precio_venta || 0) * p.cantidad
  }, 0)
  const ahorro = totalSinDescuento - form.precio_combo

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = initial?.id ? await updateCombo(initial.id, form) : await createCombo(form)
      if (result?.error) return toast.error(result.error)
      toast.success(initial?.id ? "Combo actualizado" : "Combo creado")
    })
  }

  function handleDelete() {
    if (!initial?.id) return
    startTransition(async () => {
      await deleteCombo(initial.id)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader><h3 className="font-serif text-lg text-white">Información</h3></CardHeader>
        <CardBody className="space-y-4">
          <div>
            <label className="eyebrow block mb-1.5">Nombre del combo</label>
            <Input value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Set Para Pareja: Royal Blue + Pink Diamond" required />
          </div>
          <div>
            <label className="eyebrow block mb-1.5">Descripción</label>
            <textarea
              value={form.descripcion ?? ""}
              onChange={(e) => set("descripcion", e.target.value || null)}
              rows={2}
              className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm"
              placeholder="Para él y para ella. La pareja perfecta para tu próxima ocasión."
            />
          </div>
          <ImageUploader
            bucket="productos"
            pathPrefix="combos"
            value={form.imagen_url ?? null}
            onChange={(url) => set("imagen_url", url)}
            label="Imagen del combo"
          />
          <label className="flex items-center gap-2 text-sm text-white">
            <input type="checkbox" checked={form.activo} onChange={(e) => set("activo", e.target.checked)} className="accent-gold-primary" />
            Activo en catálogo
          </label>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h3 className="font-serif text-lg text-white">Productos incluidos</h3></CardHeader>
        <CardBody className="space-y-3">
          {form.productos.length === 0 && <p className="text-muted text-sm">Agrega al menos 2 productos.</p>}
          {form.productos.map((p) => {
            const prod = productosDisponibles.find((d) => d.id === p.producto_id)
            return (
              <div key={p.producto_id} className="flex items-center gap-2 p-2 bg-black rounded-md border border-border">
                <span className="flex-1 text-white text-sm">{prod?.nombre ?? "(producto no encontrado)"}</span>
                <span className="text-muted text-xs">{formatUSD(prod?.precio_venta ?? 0)}</span>
                <Input type="number" min={1} value={p.cantidad} onChange={(e) => updateCantidad(p.producto_id, parseInt(e.target.value) || 1)} className="w-20" />
                <Button type="button" variant="ghost" size="sm" onClick={() => removeProducto(p.producto_id)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            )
          })}
          <select
            value=""
            onChange={(e) => { if (e.target.value) addProducto(e.target.value); e.target.value = "" }}
            className="w-full bg-black border border-border rounded-md px-3 py-2.5 text-white text-sm"
          >
            <option value="">+ Agregar producto al combo</option>
            {productosDisponibles
              .filter((p) => !form.productos.find((fp) => fp.producto_id === p.id))
              .map((p) => (
                <option key={p.id} value={p.id}>{p.nombre} — {formatUSD(p.precio_venta)}</option>
              ))}
          </select>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h3 className="font-serif text-lg text-white">Precio</h3></CardHeader>
        <CardBody className="space-y-3">
          <div>
            <label className="eyebrow block mb-1.5">Precio del combo</label>
            <Input type="number" step="0.01" min={0} value={form.precio_combo} onChange={(e) => set("precio_combo", Number(e.target.value))} required />
          </div>
          <div className="bg-black rounded-md p-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-muted text-xs">Suma individual</div>
              <div className="font-serif text-lg text-white">{formatUSD(totalSinDescuento)}</div>
            </div>
            <div>
              <div className="text-muted text-xs">Ahorro para el cliente</div>
              <div className={`font-serif text-lg ${ahorro > 0 ? "text-success" : "text-danger"}`}>{formatUSD(ahorro)}</div>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="flex justify-between items-center sticky bottom-0 bg-black-surface border border-border rounded-lg p-4">
        {initial?.id ? (
          <ConfirmDialog
            trigger={<Button type="button" variant="danger" size="sm"><Trash2 size={14} /> Borrar combo</Button>}
            title="¿Borrar combo?"
            description={`"${initial.nombre}" será borrado.`}
            onConfirm={handleDelete}
          />
        ) : <div />}
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : initial?.id ? "Guardar combo" : "Crear combo"}
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 6.3: Create `app/admin/combos/page.tsx`**

```tsx
import { Topbar } from "@/components/admin/topbar"
import { Button } from "@/components/ui/button"
import { Card, CardBody } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Plus } from "lucide-react"
import { formatUSD } from "@/lib/utils"

export default async function CombosPage() {
  const supabase = await createSupabaseServerClient()
  const { data: combos } = await supabase
    .from("combos")
    .select("id, nombre, precio_combo, activo, imagen_url, combo_productos(producto_id)")
    .order("created_at", { ascending: false })

  return (
    <div>
      <Topbar
        title="Combos"
        subtitle="Bundles de productos con precio especial"
        actions={
          <Link href="/admin/combos/nuevo">
            <Button><Plus size={16} /> Nuevo combo</Button>
          </Link>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {combos?.map((c) => (
          <Link key={c.id} href={`/admin/combos/${c.id}`}>
            <Card className="hover:border-gold-primary transition-colors cursor-pointer">
              <CardBody>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-serif text-lg text-white">{c.nombre}</h3>
                  <Badge tone={c.activo ? "success" : "neutral"}>
                    {c.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
                <p className="text-muted text-sm">{c.combo_productos?.length || 0} productos</p>
                <p className="text-gold-primary font-serif text-xl mt-2">{formatUSD(c.precio_combo)}</p>
              </CardBody>
            </Card>
          </Link>
        ))}
        {!combos?.length && (
          <Card>
            <CardBody className="text-center py-16 text-muted">
              <p className="font-serif text-xl text-white mb-2">Sin combos</p>
              <p className="text-sm mb-4">Crea un combo para vender productos juntos con descuento.</p>
              <Link href="/admin/combos/nuevo"><Button><Plus size={16} /> Crear combo</Button></Link>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 6.4: Create `app/admin/combos/nuevo/page.tsx`**

```tsx
import { Topbar } from "@/components/admin/topbar"
import { ComboForm } from "@/components/admin/forms/ComboForm"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export default async function NuevoComboPage() {
  const supabase = await createSupabaseServerClient()
  const { data: productos } = await supabase
    .from("productos")
    .select("id, nombre, precio_venta")
    .eq("estado", "publicado")
    .order("nombre")
  return (
    <div className="max-w-3xl">
      <Topbar title="Nuevo combo" />
      <ComboForm productosDisponibles={productos || []} />
    </div>
  )
}
```

- [ ] **Step 6.5: Create `app/admin/combos/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation"
import { Topbar } from "@/components/admin/topbar"
import { ComboForm } from "@/components/admin/forms/ComboForm"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export default async function EditarComboPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const [{ data: combo }, { data: items }, { data: productos }] = await Promise.all([
    supabase.from("combos").select("*").eq("id", id).single(),
    supabase.from("combo_productos").select("producto_id, cantidad").eq("combo_id", id),
    supabase.from("productos").select("id, nombre, precio_venta").eq("estado", "publicado").order("nombre"),
  ])
  if (!combo) notFound()

  return (
    <div className="max-w-3xl">
      <Topbar title={`Editar: ${combo.nombre}`} />
      <ComboForm
        initial={{ id: combo.id, ...combo, productos: items || [] }}
        productosDisponibles={productos || []}
      />
    </div>
  )
}
```

- [ ] **Step 6.6: TSC + commit**

```bash
npx tsc --noEmit
git add app/admin/combos/ components/admin/forms/ComboForm.tsx
git commit -m "feat(admin): CRUD de combos con cálculo de ahorro"
```

---

## Task 7: Destacados — vista visual de toggle

**Files:**
- Create: `app/admin/destacados/page.tsx`
- Create: `app/admin/destacados/actions.ts`

- [ ] **Step 7.1: Create `app/admin/destacados/actions.ts`**

```ts
"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function toggleDestacado(id: string, destacado: boolean) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("productos").update({ destacado }).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/destacados")
  revalidatePath("/admin/productos")
  return { success: true }
}
```

- [ ] **Step 7.2: Create `app/admin/destacados/page.tsx`**

```tsx
import { Topbar } from "@/components/admin/topbar"
import { Card, CardBody } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { DestacadosToggle } from "./toggle"

export default async function DestacadosPage() {
  const supabase = await createSupabaseServerClient()
  const { data: productos } = await supabase
    .from("productos")
    .select("id, nombre, modelo, destacado, precio_venta, producto_imagenes(url)")
    .eq("estado", "publicado")
    .order("destacado", { ascending: false })
    .order("updated_at", { ascending: false })

  const destacadosCount = productos?.filter((p) => p.destacado).length ?? 0

  return (
    <div>
      <Topbar
        title="Destacados"
        subtitle={`${destacadosCount} destacados · aparecen en el home del catálogo`}
      />
      <Card>
        <CardBody>
          <p className="text-muted text-sm mb-4">
            Marca los productos que quieres que aparezcan en el carrusel &ldquo;Destacados&rdquo; de la home. Recomendado: 6-12 productos.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {productos?.map((p) => (
              <DestacadosToggle
                key={p.id}
                id={p.id}
                nombre={p.nombre}
                imagenUrl={p.producto_imagenes?.[0]?.url || null}
                destacado={p.destacado}
              />
            ))}
          </div>
          {!productos?.length && <p className="text-muted text-center py-8">Sin productos publicados aún.</p>}
        </CardBody>
      </Card>
    </div>
  )
}
```

- [ ] **Step 7.3: Create `app/admin/destacados/toggle.tsx`** (client wrapper)

```tsx
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
      if (result.error) toast.error(result.error)
      else toast.success(destacado ? "Removido de destacados" : "Agregado a destacados")
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
```

- [ ] **Step 7.4: TSC + commit**

```bash
npx tsc --noEmit
git add app/admin/destacados/
git commit -m "feat(admin): destacados visual toggle grid"
```

---

## Task 8: Configuración tienda

**Files:**
- Create: `app/admin/configuracion/page.tsx`
- Create: `app/admin/configuracion/actions.ts`
- Create: `components/admin/forms/ConfiguracionForm.tsx`

- [ ] **Step 8.1: Create `app/admin/configuracion/actions.ts`**

```ts
"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { configuracionSchema, bannerSchema, type ConfiguracionInput, type BannerInput } from "@/lib/validations/configuracion"
import { revalidatePath } from "next/cache"

export async function updateConfiguracion(input: ConfiguracionInput) {
  const parsed = configuracionSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Datos inválidos" }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("configuracion").update(parsed.data).eq("id", 1)
  if (error) return { error: error.message }
  revalidatePath("/admin/configuracion")
  revalidatePath("/", "layout")
  return { success: true }
}

export async function updateBanner(input: BannerInput) {
  const parsed = bannerSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Datos inválidos" }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from("configuracion").update(parsed.data).eq("id", 1)
  if (error) return { error: error.message }
  revalidatePath("/admin/configuracion/banner")
  revalidatePath("/", "layout")
  return { success: true }
}
```

- [ ] **Step 8.2: Create `components/admin/forms/ConfiguracionForm.tsx`**

```tsx
"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { ImageUploader } from "@/components/admin/ImageUploader"
import { updateConfiguracion } from "@/app/admin/configuracion/actions"
import type { ConfiguracionInput } from "@/lib/validations/configuracion"
import { toast } from "sonner"

interface Props {
  initial: ConfiguracionInput
}

export function ConfiguracionForm({ initial }: Props) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState<ConfiguracionInput>(initial)

  function set<K extends keyof ConfiguracionInput>(k: K, v: ConfiguracionInput[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await updateConfiguracion(form)
      if (result.error) return toast.error(result.error)
      toast.success("Configuración guardada")
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader><h3 className="font-serif text-lg text-white">Tienda</h3></CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="eyebrow block mb-1.5">Nombre de la tienda</label>
              <Input value={form.nombre_tienda} onChange={(e) => set("nombre_tienda", e.target.value)} required />
            </div>
            <div>
              <label className="eyebrow block mb-1.5">WhatsApp (con cod. país, solo números)</label>
              <Input value={form.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value || null)} placeholder="50760000000" />
            </div>
          </div>
          <ImageUploader bucket="configuracion" pathPrefix="tienda" value={form.logo_url ?? null} onChange={(u) => set("logo_url", u)} label="Logo (cuadrado)" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="eyebrow block mb-1.5">Instagram handle</label>
              <Input value={form.instagram_handle ?? ""} onChange={(e) => set("instagram_handle", e.target.value || null)} placeholder="@klassikstore.pa" />
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Instagram URL</label>
              <Input value={form.instagram_url ?? ""} onChange={(e) => set("instagram_url", e.target.value || null)} placeholder="https://instagram.com/klassikstore.pa" />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h3 className="font-serif text-lg text-white">Pagos</h3></CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="eyebrow block mb-1.5">Número Yappy</label>
              <Input value={form.yappy_numero ?? ""} onChange={(e) => set("yappy_numero", e.target.value || null)} />
            </div>
            <ImageUploader bucket="configuracion" pathPrefix="yappy" value={form.yappy_qr_url ?? null} onChange={(u) => set("yappy_qr_url", u)} label="QR de Yappy" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="eyebrow block mb-1.5">Banco</label>
              <Input value={form.banco_nombre ?? ""} onChange={(e) => set("banco_nombre", e.target.value || null)} />
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Tipo cuenta</label>
              <select
                value={form.banco_tipo ?? ""}
                onChange={(e) => set("banco_tipo", (e.target.value || null) as ConfiguracionInput["banco_tipo"])}
                className="w-full bg-black border border-border rounded-md px-3 py-2.5 text-white text-sm"
              >
                <option value="">—</option>
                <option value="Ahorro">Ahorro</option>
                <option value="Corriente">Corriente</option>
              </select>
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Número de cuenta</label>
              <Input value={form.banco_cuenta ?? ""} onChange={(e) => set("banco_cuenta", e.target.value || null)} />
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Titular</label>
              <Input value={form.banco_titular ?? ""} onChange={(e) => set("banco_titular", e.target.value || null)} />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-serif text-lg text-white">Operación</h3>
          <p className="text-muted text-xs mt-1">Margen y fechas de llegada predeterminadas.</p>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="eyebrow block mb-1.5">Margen global (%)</label>
              <Input type="number" min={0} max={500} value={form.margen_global_porcentaje} onChange={(e) => set("margen_global_porcentaje", parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Próxima llegada (desde)</label>
              <Input type="date" value={form.proxima_fecha_llegada_inicio ?? ""} onChange={(e) => set("proxima_fecha_llegada_inicio", e.target.value || null)} />
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Próxima llegada (hasta)</label>
              <Input type="date" value={form.proxima_fecha_llegada_fin ?? ""} onChange={(e) => set("proxima_fecha_llegada_fin", e.target.value || null)} />
            </div>
          </div>
          <div>
            <label className="eyebrow block mb-1.5">Mensaje pre-orden (mostrado al cliente)</label>
            <textarea
              value={form.mensaje_preorden ?? ""}
              onChange={(e) => set("mensaje_preorden", e.target.value || null)}
              rows={2}
              className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm"
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h3 className="font-serif text-lg text-white">Políticas legales</h3></CardHeader>
        <CardBody className="space-y-4">
          <div>
            <label className="eyebrow block mb-1.5">Política de devoluciones</label>
            <textarea value={form.politica_devoluciones ?? ""} onChange={(e) => set("politica_devoluciones", e.target.value || null)} rows={4} className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm" />
          </div>
          <div>
            <label className="eyebrow block mb-1.5">Política de privacidad</label>
            <textarea value={form.politica_privacidad ?? ""} onChange={(e) => set("politica_privacidad", e.target.value || null)} rows={4} className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm" />
          </div>
          <div>
            <label className="eyebrow block mb-1.5">Términos y condiciones</label>
            <textarea value={form.terminos_condiciones ?? ""} onChange={(e) => set("terminos_condiciones", e.target.value || null)} rows={4} className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm" />
          </div>
        </CardBody>
      </Card>

      <div className="flex justify-end sticky bottom-0 bg-black-surface border border-border rounded-lg p-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar configuración"}
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 8.3: Create `app/admin/configuracion/page.tsx`**

```tsx
import { Topbar } from "@/components/admin/topbar"
import { ConfiguracionForm } from "@/components/admin/forms/ConfiguracionForm"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export default async function ConfiguracionPage() {
  const supabase = await createSupabaseServerClient()
  const { data: config } = await supabase.from("configuracion").select("*").eq("id", 1).single()
  if (!config) {
    return <div className="text-danger">No se encontró configuración (debe haber 1 fila con id=1).</div>
  }
  return (
    <div className="max-w-4xl">
      <Topbar title="Configuración de la tienda" subtitle="Datos generales, pagos, operación y políticas" />
      <ConfiguracionForm initial={config as never} />
    </div>
  )
}
```

- [ ] **Step 8.4: TSC + commit**

```bash
npx tsc --noEmit
git add app/admin/configuracion/page.tsx app/admin/configuracion/actions.ts components/admin/forms/ConfiguracionForm.tsx
git commit -m "feat(admin): página de configuración completa (tienda, pagos, operación, legales)"
```

---

## Task 9: Banner promocional admin

**Files:**
- Create: `app/admin/configuracion/banner/page.tsx`
- Create: `components/admin/forms/BannerForm.tsx`

- [ ] **Step 9.1: Create `components/admin/forms/BannerForm.tsx`**

```tsx
"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { updateBanner } from "@/app/admin/configuracion/actions"
import type { BannerInput } from "@/lib/validations/configuracion"
import { toast } from "sonner"

export function BannerForm({ initial }: { initial: BannerInput }) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState<BannerInput>(initial)

  function set<K extends keyof BannerInput>(k: K, v: BannerInput[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await updateBanner(form)
      if (result.error) return toast.error(result.error)
      toast.success("Banner actualizado")
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader><h3 className="font-serif text-lg text-white">Banner promocional</h3></CardHeader>
        <CardBody className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-white">
            <input type="checkbox" checked={form.banner_activo} onChange={(e) => set("banner_activo", e.target.checked)} className="accent-gold-primary" />
            Banner activo (visible en todo el sitio)
          </label>
          <div>
            <label className="eyebrow block mb-1.5">Texto</label>
            <Input value={form.banner_texto ?? ""} onChange={(e) => set("banner_texto", e.target.value || null)} placeholder="Pre-orden con 10% off esta semana" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="eyebrow block mb-1.5">CTA texto (opcional)</label>
              <Input value={form.banner_cta_texto ?? ""} onChange={(e) => set("banner_cta_texto", e.target.value || null)} placeholder="Ver más" />
            </div>
            <div>
              <label className="eyebrow block mb-1.5">CTA URL (opcional)</label>
              <Input value={form.banner_cta_url ?? ""} onChange={(e) => set("banner_cta_url", e.target.value || null)} placeholder="/etiqueta/oferta" />
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Color</label>
              <input type="color" value={form.banner_color} onChange={(e) => set("banner_color", e.target.value)} className="w-full h-10 rounded-md border border-border bg-black cursor-pointer" />
            </div>
          </div>
          <div className="rounded-md p-4 text-center font-semibold text-sm" style={{ backgroundColor: form.banner_color, color: "#0a0a0a" }}>
            {form.banner_texto || "(vista previa: vacío)"}
            {form.banner_cta_texto && <span className="ml-3 underline">{form.banner_cta_texto}</span>}
          </div>
        </CardBody>
      </Card>
      <div className="flex justify-end sticky bottom-0 bg-black-surface border border-border rounded-lg p-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar banner"}
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 9.2: Create `app/admin/configuracion/banner/page.tsx`**

```tsx
import { Topbar } from "@/components/admin/topbar"
import { BannerForm } from "@/components/admin/forms/BannerForm"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export default async function BannerPage() {
  const supabase = await createSupabaseServerClient()
  const { data: config } = await supabase
    .from("configuracion")
    .select("banner_activo, banner_texto, banner_cta_texto, banner_cta_url, banner_color")
    .eq("id", 1)
    .single()

  return (
    <div className="max-w-3xl">
      <Topbar title="Banner promocional" subtitle="Tira superior visible en todo el catálogo público" />
      <BannerForm
        initial={{
          banner_activo: config?.banner_activo ?? false,
          banner_texto: config?.banner_texto ?? null,
          banner_cta_texto: config?.banner_cta_texto ?? null,
          banner_cta_url: config?.banner_cta_url ?? null,
          banner_color: config?.banner_color ?? "#c9a86a",
        }}
      />
    </div>
  )
}
```

- [ ] **Step 9.3: TSC + commit**

```bash
npx tsc --noEmit
git add app/admin/configuracion/banner/ components/admin/forms/BannerForm.tsx
git commit -m "feat(admin): banner promocional administrable"
```

---

## Task 10: Smoke tests E2E del admin

**Files:**
- Create: `tests/e2e/admin-flows.spec.ts`
- Modify: `tests/e2e/login.spec.ts` (add helper to login programmatically)

- [ ] **Step 10.1: Add admin user credentials to Playwright env or fixture**

For E2E that needs an authenticated session, we need a way to log in.

Create `tests/e2e/fixtures.ts`:

```ts
import { test as base } from "@playwright/test"

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || ""
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || ""

export const test = base.extend({
  page: async ({ page }, use) => {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      test.skip(true, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin E2E tests")
    }
    await page.goto("/admin/login")
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL)
    await page.getByLabel(/contraseña/i).fill(ADMIN_PASSWORD)
    await page.getByRole("button", { name: /entrar/i }).click()
    await page.waitForURL(/\/admin(?:$|\/(?!login))/)
    await use(page)
  },
})

export { expect } from "@playwright/test"
```

- [ ] **Step 10.2: Create `tests/e2e/admin-flows.spec.ts`**

```ts
import { test, expect } from "./fixtures"

test.describe("admin catalog flows", () => {
  test("admin can create a section", async ({ page }) => {
    await page.goto("/admin/secciones/nueva")
    const seccionName = `Test ${Date.now()}`
    await page.getByLabel(/nombre/i).fill(seccionName)
    await page.getByRole("button", { name: /crear secci/i }).click()
    await expect(page).toHaveURL(/\/admin\/secciones\/[^/]+$/)
    await expect(page.getByRole("heading", { name: new RegExp(seccionName, "i") })).toBeVisible()
  })

  test("admin can create a tag", async ({ page }) => {
    await page.goto("/admin/etiquetas")
    const tagName = `Tag ${Date.now()}`
    // Find the "Crear nueva" form (last EtiquetaForm with empty initial)
    const lastForm = page.locator("form").last()
    await lastForm.getByPlaceholder(/regalo perfecto/i).fill(tagName)
    await lastForm.getByRole("button", { name: /crear/i }).click()
    await expect(page.getByText(tagName)).toBeVisible({ timeout: 5000 })
  })

  test("admin can navigate the sidebar", async ({ page }) => {
    await page.goto("/admin")
    await expect(page.getByText("Dashboard")).toBeVisible()
    await page.getByRole("link", { name: /productos/i }).first().click()
    await expect(page).toHaveURL(/\/admin\/productos/)
    await page.getByRole("link", { name: /secciones/i }).first().click()
    await expect(page).toHaveURL(/\/admin\/secciones/)
  })
})
```

- [ ] **Step 10.3: Run E2E tests locally**

Set environment variables and run:

```bash
E2E_ADMIN_EMAIL=tuemail@example.com E2E_ADMIN_PASSWORD=tupassword npm run test:e2e
```

If env vars aren't set, the admin tests are skipped (still useful for CI).

Expected: existing login tests + 3 new admin tests all pass.

- [ ] **Step 10.4: TSC + commit**

```bash
npx tsc --noEmit
git add tests/e2e/
git commit -m "test(admin): E2E smoke tests for catalog flows (sections, tags, navigation)"
```

---

## Verificación final del Plan 02

Después de todas las tareas, manualmente verifica:

- [ ] `npx tsc --noEmit` → 0 errores
- [ ] `npm test` → todos los unit tests pasan
- [ ] `npm run test:e2e` → todos los E2E pasan (con env vars de admin set)
- [ ] Loguearte al admin local funciona
- [ ] Crear una sección y verla en la lista
- [ ] Crear una etiqueta
- [ ] Crear un producto borrador (con nombre, descripción, precio)
- [ ] Subir 2-3 imágenes al producto, marcar como limpia
- [ ] Agregar variantes (Color: Rojo, Color: Azul)
- [ ] Cambiar a publicado
- [ ] Volver a la lista — verificar que aparece con badge "publicado"
- [ ] Marcar como destacado desde /admin/destacados
- [ ] Crear un combo con 2+ productos
- [ ] Cambiar margen global desde Configuración
- [ ] Activar banner promocional y verificar preview
- [ ] Push a main + verificar deploy en Vercel

Si todo OK, Plan 02 completo y podemos pasar a Plan 03 (Catálogo público).

---

## Notas para el implementador

1. **Tailwind v4 + alpha:** algunas clases nuevas como `bg-success/15` requieren que el `--color-success` esté en `@theme`. Ya está, pero verificar si una opacidad no aparece — agregar el utility manualmente en `@layer utilities` si es necesario.

2. **`revalidatePath` en server actions:** importante para que los cambios se reflejen sin reload. Si en Fase 3 agregamos más layouts cacheados, considerar `revalidateTag`.

3. **Costo de imágenes en Storage:** subir muchas imágenes (varios MB cada una) llega al límite gratuito (1 GB). Considerar agregar compresión client-side antes de upload en Plan 03 si es necesario.

4. **Validación cliente vs server:** las validaciones de Zod están en `lib/validations/` y se usan tanto en server actions (autoritativas) como en forms para feedback inmediato.

5. **Server Actions con `redirect()`:** después de un redirect dentro de un server action, NO retorna nada al cliente. Por eso uso patrón `if (initial?.id) updateProducto(...) else createProducto(...) which redirects`. El client no espera respuesta cuando crea.

6. **Type assertions con `as never`:** uso esto en algunos `select()` complejos para que TypeScript no se queje de relaciones anidadas. No es ideal pero acelera. Plan 03+ podemos refinar con tipos exactos.
