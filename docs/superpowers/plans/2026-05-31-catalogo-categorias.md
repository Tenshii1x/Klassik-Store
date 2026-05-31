# Catálogo organizado por categorías — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganizar Para Ella, Para Él y Catálogo para mostrar categorías primero en lugar de listas planas de productos mezclados.

**Architecture:** `SeccionesGrid` (ya existe) se reutiliza en Para Ella y Para Él como hub de entrada. Se crean páginas `/para-ella/[slug]` y `/para-el/[slug]` (y sus subsecciones) que son clones de `/seccion/[slug]` con filtro de género adicional. `getProductosBySeccion` recibe parámetros opcionales `solo_para_ella` y `solo_para_el`. El catálogo (`/buscar`) muestra `SeccionesGrid` cuando no hay búsqueda.

**Tech Stack:** Next.js 14 App Router, Supabase, TypeScript, Tailwind CSS

---

## Mapa de archivos

| Acción | Ruta |
|---|---|
| Modificar | `lib/catalog/queries.ts` — agregar filtros de género a `getProductosBySeccion` |
| Modificar | `app/(public)/para-ella/page.tsx` — reemplazar grid con SeccionesGrid |
| Modificar | `app/(public)/para-el/page.tsx` — reemplazar grid con SeccionesGrid |
| Crear | `app/(public)/para-ella/[slug]/page.tsx` — sección filtrada por `solo_para_ella=true` |
| Crear | `app/(public)/para-ella/[slug]/[subseccion]/page.tsx` — subsección filtrada |
| Crear | `app/(public)/para-el/[slug]/page.tsx` — sección filtrada por `solo_para_el=true` |
| Crear | `app/(public)/para-el/[slug]/[subseccion]/page.tsx` — subsección filtrada |
| Modificar | `app/(public)/buscar/page.tsx` — SeccionesGrid cuando no hay query |

---

## Task 1: Agregar filtros de género a `getProductosBySeccion`

**Files:**
- Modify: `lib/catalog/queries.ts`

- [ ] **Step 1: Agregar `solo_para_ella` y `solo_para_el` al objeto `filters`**

En `lib/catalog/queries.ts`, localizar la función `getProductosBySeccion` (línea ~30). El parámetro `filters` actualmente es:

```typescript
filters: {
  subseccion?: string
  marca?: string
  modo?: string
  sort?: string
  precio_min?: number
  precio_max?: number
} = {}
```

Reemplazar con:

```typescript
filters: {
  subseccion?: string
  marca?: string
  modo?: string
  sort?: string
  precio_min?: number
  precio_max?: number
  solo_para_ella?: boolean
  solo_para_el?: boolean
} = {}
```

- [ ] **Step 2: Agregar los `.eq()` para los filtros de género**

Después de la línea `if (filters.precio_max) query = query.lte("precio_venta", filters.precio_max)`, agregar:

```typescript
  if (filters.solo_para_ella) query = query.eq("solo_para_ella", true)
  if (filters.solo_para_el) query = query.eq("solo_para_el", true)
```

- [ ] **Step 3: Verificar TypeScript**

```powershell
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```powershell
git add lib/catalog/queries.ts
git commit -m "feat(queries): agregar filtros solo_para_ella y solo_para_el a getProductosBySeccion"
```

---

## Task 2: Actualizar páginas hub de Para Ella y Para Él

**Files:**
- Modify: `app/(public)/para-ella/page.tsx`
- Modify: `app/(public)/para-el/page.tsx`

- [ ] **Step 1: Reemplazar `app/(public)/para-ella/page.tsx` completamente**

`SeccionesGrid` genera links hardcodeados a `/seccion/{slug}`, por eso se replica su estructura con links a `/para-ella/{slug}` en lugar de modificar el componente compartido.

Reemplazar con:

```typescript
import { BloqueFemenino } from "@/components/public/BloqueFemenino"
import { getSeccionesPublicas } from "@/lib/catalog/queries"
import Link from "next/link"
import Image from "next/image"

const TONO_BG: Record<string, string> = {
  "dark-gold": "from-[#1a1410] to-black",
  "rose-gold": "from-[#2a1a1f] to-[#1a0a14]",
  "blue-cool": "from-[#0f1620] to-black",
}

export default async function ParaEllaPage() {
  const secciones = await getSeccionesPublicas()

  return (
    <>
      <BloqueFemenino />
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-20">
        <div className="text-center mb-12">
          <div className="eyebrow mb-3">— Colecciones para ella —</div>
          <h2 className="font-serif text-4xl md:text-5xl text-white">
            Explora por <em className="italic text-gold-primary">categoría</em>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {secciones.map((s, i) => {
            const tonoClass = TONO_BG[s.tono] || TONO_BG["dark-gold"]
            return (
              <Link
                key={s.id}
                href={`/para-ella/${s.slug}`}
                className="group relative aspect-[3/4] rounded-md overflow-hidden border border-border hover:border-gold-primary/40 transition-all"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${tonoClass}`} />
                {s.imagen_portada && (
                  <Image
                    src={s.imagen_portada}
                    alt={s.nombre}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover opacity-40 group-hover:opacity-60 transition-opacity"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-7 z-10">
                  <div className="text-gold-primary text-xs tracking-widest mb-2">— {String(i + 1).padStart(2, "0")} —</div>
                  <h3 className="font-serif text-3xl text-white mb-2">{s.nombre}</h3>
                  {s.descripcion_corta && (
                    <p className="text-white/80 text-sm leading-snug">{s.descripcion_corta}</p>
                  )}
                  <div className="mt-4 pt-3 border-t border-gold-primary/30 text-gold-primary text-xs tracking-wider">
                    Ver colección →
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </>
  )
}
```

- [ ] **Step 2: Reemplazar `app/(public)/para-el/page.tsx` completamente**

```typescript
import { getSeccionesPublicas } from "@/lib/catalog/queries"
import Link from "next/link"
import Image from "next/image"

const TONO_BG: Record<string, string> = {
  "dark-gold": "from-[#1a1410] to-black",
  "rose-gold": "from-[#2a1a1f] to-[#1a0a14]",
  "blue-cool": "from-[#0f1620] to-black",
}

export default async function ParaElPage() {
  const secciones = await getSeccionesPublicas()

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-16">
      <div className="text-center mb-12">
        <div className="eyebrow mb-3">— Colección Masculina —</div>
        <h1 className="font-serif text-5xl text-white">
          Para <em className="italic text-gold-primary">Él</em>
        </h1>
        <p className="text-muted text-sm mt-3">Piezas que cuentan más que el tiempo.</p>
        <div className="mt-8 eyebrow">— Explora por categoría —</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {secciones.map((s, i) => {
          const tonoClass = TONO_BG[s.tono] || TONO_BG["dark-gold"]
          return (
            <Link
              key={s.id}
              href={`/para-el/${s.slug}`}
              className="group relative aspect-[3/4] rounded-md overflow-hidden border border-border hover:border-gold-primary/40 transition-all"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${tonoClass}`} />
              {s.imagen_portada && (
                <Image
                  src={s.imagen_portada}
                  alt={s.nombre}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover opacity-40 group-hover:opacity-60 transition-opacity"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-7 z-10">
                <div className="text-gold-primary text-xs tracking-widest mb-2">— {String(i + 1).padStart(2, "0")} —</div>
                <h3 className="font-serif text-3xl text-white mb-2">{s.nombre}</h3>
                {s.descripcion_corta && (
                  <p className="text-white/80 text-sm leading-snug">{s.descripcion_corta}</p>
                )}
                <div className="mt-4 pt-3 border-t border-gold-primary/30 text-gold-primary text-xs tracking-wider">
                  Ver colección →
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Verificar TypeScript**

```powershell
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```powershell
git add "app/(public)/para-ella/page.tsx" "app/(public)/para-el/page.tsx"
git commit -m "feat(nav): para-ella y para-el muestran grid de categorias en lugar de lista plana"
```

---

## Task 3: Páginas de sección con filtro femenino

**Files:**
- Create: `app/(public)/para-ella/[slug]/page.tsx`
- Create: `app/(public)/para-ella/[slug]/[subseccion]/page.tsx`

- [ ] **Step 1: Crear `app/(public)/para-ella/[slug]/page.tsx`**

```typescript
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getSeccionBySlug, getProductosBySeccion, getMarcasBySeccion } from "@/lib/catalog/queries"
import { SeccionHero } from "@/components/public/SeccionHero"
import { FiltrosSection } from "@/components/public/FiltrosSection"
import { ProductoCard } from "@/components/public/ProductoCard"

export default async function ParaEllaSeccionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ sort?: string; modo?: string; marca?: string }>
}) {
  const { slug } = await params
  const filters = await searchParams
  const seccion = await getSeccionBySlug(slug)
  if (!seccion) notFound()

  const [productos, marcas] = await Promise.all([
    getProductosBySeccion(seccion.id, { ...filters, solo_para_ella: true }),
    getMarcasBySeccion(seccion.id),
  ])

  return (
    <>
      <SeccionHero seccion={seccion} />
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-4">
        <Link
          href="/para-ella"
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-gold-primary transition-colors"
        >
          <ArrowLeft size={12} /> Para Ella
        </Link>
      </div>
      <FiltrosSection
        subsecciones={seccion.subsecciones || []}
        marcas={marcas}
        baseHref={`/para-ella/${slug}`}
      />
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        {productos.length === 0 ? (
          <div className="text-center py-20 text-muted">
            <p className="font-serif text-2xl text-white mb-2">Sin piezas disponibles aún</p>
            <p>No hay productos de esta categoría disponibles para ella por ahora.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {productos.map((p) => <ProductoCard key={p.id} p={p as never} />)}
          </div>
        )}
      </section>
    </>
  )
}
```

- [ ] **Step 2: Crear `app/(public)/para-ella/[slug]/[subseccion]/page.tsx`**

```typescript
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getSeccionBySlug, getProductosBySeccion, getMarcasBySeccion } from "@/lib/catalog/queries"
import { SeccionHero } from "@/components/public/SeccionHero"
import { FiltrosSection } from "@/components/public/FiltrosSection"
import { ProductoCard } from "@/components/public/ProductoCard"

export default async function ParaEllaSubseccionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; subseccion: string }>
  searchParams: Promise<{ sort?: string; modo?: string; marca?: string }>
}) {
  const { slug, subseccion } = await params
  const filters = await searchParams
  const seccion = await getSeccionBySlug(slug)
  if (!seccion) notFound()

  const sub = seccion.subsecciones?.find((s) => s.slug === subseccion)
  if (!sub) notFound()

  const [productos, marcas] = await Promise.all([
    getProductosBySeccion(seccion.id, { ...filters, subseccion: sub.id, solo_para_ella: true }),
    getMarcasBySeccion(seccion.id),
  ])

  return (
    <>
      <SeccionHero seccion={{ ...seccion, nombre: `${seccion.nombre} · ${sub.nombre}` }} />
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-4">
        <Link
          href="/para-ella"
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-gold-primary transition-colors"
        >
          <ArrowLeft size={12} /> Para Ella
        </Link>
      </div>
      <FiltrosSection
        subsecciones={seccion.subsecciones || []}
        marcas={marcas}
        baseHref={`/para-ella/${slug}`}
      />
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        {productos.length === 0 ? (
          <div className="text-center py-20 text-muted">
            <p className="font-serif text-2xl text-white">Sin piezas en {sub.nombre}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {productos.map((p) => <ProductoCard key={p.id} p={p as never} />)}
          </div>
        )}
      </section>
    </>
  )
}
```

- [ ] **Step 3: Verificar TypeScript**

```powershell
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```powershell
git add "app/(public)/para-ella/[slug]/"
git commit -m "feat(para-ella): paginas de seccion y subseccion con filtro solo_para_ella"
```

---

## Task 4: Páginas de sección con filtro masculino

**Files:**
- Create: `app/(public)/para-el/[slug]/page.tsx`
- Create: `app/(public)/para-el/[slug]/[subseccion]/page.tsx`

- [ ] **Step 1: Crear `app/(public)/para-el/[slug]/page.tsx`**

```typescript
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getSeccionBySlug, getProductosBySeccion, getMarcasBySeccion } from "@/lib/catalog/queries"
import { SeccionHero } from "@/components/public/SeccionHero"
import { FiltrosSection } from "@/components/public/FiltrosSection"
import { ProductoCard } from "@/components/public/ProductoCard"

export default async function ParaElSeccionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ sort?: string; modo?: string; marca?: string }>
}) {
  const { slug } = await params
  const filters = await searchParams
  const seccion = await getSeccionBySlug(slug)
  if (!seccion) notFound()

  const [productos, marcas] = await Promise.all([
    getProductosBySeccion(seccion.id, { ...filters, solo_para_el: true }),
    getMarcasBySeccion(seccion.id),
  ])

  return (
    <>
      <SeccionHero seccion={seccion} />
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-4">
        <Link
          href="/para-el"
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-gold-primary transition-colors"
        >
          <ArrowLeft size={12} /> Para Él
        </Link>
      </div>
      <FiltrosSection
        subsecciones={seccion.subsecciones || []}
        marcas={marcas}
        baseHref={`/para-el/${slug}`}
      />
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        {productos.length === 0 ? (
          <div className="text-center py-20 text-muted">
            <p className="font-serif text-2xl text-white mb-2">Sin piezas disponibles aún</p>
            <p>No hay productos de esta categoría disponibles para él por ahora.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {productos.map((p) => <ProductoCard key={p.id} p={p as never} />)}
          </div>
        )}
      </section>
    </>
  )
}
```

- [ ] **Step 2: Crear `app/(public)/para-el/[slug]/[subseccion]/page.tsx`**

```typescript
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { getSeccionBySlug, getProductosBySeccion, getMarcasBySeccion } from "@/lib/catalog/queries"
import { SeccionHero } from "@/components/public/SeccionHero"
import { FiltrosSection } from "@/components/public/FiltrosSection"
import { ProductoCard } from "@/components/public/ProductoCard"

export default async function ParaElSubseccionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; subseccion: string }>
  searchParams: Promise<{ sort?: string; modo?: string; marca?: string }>
}) {
  const { slug, subseccion } = await params
  const filters = await searchParams
  const seccion = await getSeccionBySlug(slug)
  if (!seccion) notFound()

  const sub = seccion.subsecciones?.find((s) => s.slug === subseccion)
  if (!sub) notFound()

  const [productos, marcas] = await Promise.all([
    getProductosBySeccion(seccion.id, { ...filters, subseccion: sub.id, solo_para_el: true }),
    getMarcasBySeccion(seccion.id),
  ])

  return (
    <>
      <SeccionHero seccion={{ ...seccion, nombre: `${seccion.nombre} · ${sub.nombre}` }} />
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-4">
        <Link
          href="/para-el"
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-gold-primary transition-colors"
        >
          <ArrowLeft size={12} /> Para Él
        </Link>
      </div>
      <FiltrosSection
        subsecciones={seccion.subsecciones || []}
        marcas={marcas}
        baseHref={`/para-el/${slug}`}
      />
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        {productos.length === 0 ? (
          <div className="text-center py-20 text-muted">
            <p className="font-serif text-2xl text-white">Sin piezas en {sub.nombre}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {productos.map((p) => <ProductoCard key={p.id} p={p as never} />)}
          </div>
        )}
      </section>
    </>
  )
}
```

- [ ] **Step 3: Verificar TypeScript**

```powershell
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```powershell
git add "app/(public)/para-el/[slug]/"
git commit -m "feat(para-el): paginas de seccion y subseccion con filtro solo_para_el"
```

---

## Task 5: Catálogo con SeccionesGrid cuando no hay búsqueda

**Files:**
- Modify: `app/(public)/buscar/page.tsx`

- [ ] **Step 1: Reemplazar `app/(public)/buscar/page.tsx` completamente**

```typescript
import { buscarProductos, getSeccionesPublicas } from "@/lib/catalog/queries"
import { SearchBar } from "@/components/public/SearchBar"
import { ProductoCard } from "@/components/public/ProductoCard"
import { SeccionesGrid } from "@/components/public/SeccionesGrid"

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q = "" } = await searchParams

  if (!q) {
    const secciones = await getSeccionesPublicas()
    return (
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-16">
        <div className="text-center mb-10">
          <h1 className="font-serif text-4xl text-white mb-4">Catálogo</h1>
          <div className="max-w-xl mx-auto">
            <SearchBar />
          </div>
        </div>
        <SeccionesGrid secciones={secciones} />
      </section>
    )
  }

  const productos = await buscarProductos(q)

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-16">
      <h1 className="font-serif text-4xl text-center text-white mb-2">Resultados</h1>
      <p className="text-muted text-center mb-10">
        {productos.length} resultado(s) para &ldquo;{q}&rdquo;
      </p>
      <div className="mb-10">
        <SearchBar />
      </div>
      {productos.length === 0 ? (
        <div className="text-center py-20 text-muted">
          <p className="font-serif text-2xl text-white">Sin resultados</p>
          <p className="mt-2">Intenta con otro término de búsqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {productos.map((p) => <ProductoCard key={p.id} p={p as never} />)}
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Verificar TypeScript**

```powershell
npx tsc --noEmit
```

- [ ] **Step 3: Commit y push**

```powershell
git add "app/(public)/buscar/page.tsx"
git commit -m "feat(catalogo): mostrar categorias en lugar de lista plana cuando no hay busqueda"
git push origin main
```

---

## Verificación final

- [ ] `/para-ella` — muestra grid de categorías (no productos)
- [ ] `/para-ella/relojes` (o la sección que tengas) — muestra solo productos femeninos con filtros
- [ ] `/para-el` — muestra grid de categorías
- [ ] `/para-el/relojes` — muestra solo productos masculinos con filtros
- [ ] `/buscar` sin query — muestra catálogo de categorías con barra de búsqueda arriba
- [ ] `/buscar?q=reloj` — sigue mostrando resultados de búsqueda normales
