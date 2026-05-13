# Klassik Store · Plan 03 — Catálogo público · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Construir el catálogo público que ven los clientes — home, secciones, producto individual, búsqueda, filtros — más el carrito persistente, wishlist, footer legal, captura de email, banner promocional y botón flotante de WhatsApp. El checkout sigue saliendo por WhatsApp (Plan 05 introducirá pedidos en sitio).

**Architecture:** Server Components para todo lo cacheable (home, listas, producto). Client Components solo para interactividad (carrito, wishlist, búsqueda en vivo, filtros, popup email). `revalidatePath` desde el admin asegura que cambios se reflejen sin recargar. Imágenes vía `next/image` con AVIF/WebP. Mobile-first responsive con Tailwind.

**Tech Stack:** Next.js 16 App Router, Tailwind v4, Supabase JS SDK (sin auth para público — usa `anon` key via browser/server clients ya creados), Lucide icons.

**Result at end of Plan 03:** Clientes pueden navegar el catálogo en `https://klassik-store-one.vercel.app/`, ver home con secciones y destacados, entrar a una sección, ver un producto con galería y variantes, agregar al carrito, pulsar "Pedir por WhatsApp" y se abre WhatsApp con resumen del pedido. La marca KS está aplicada con consistencia.

**Spec reference:** `docs/superpowers/specs/2026-05-12-klassik-store-design.md` sección 6.

---

## File Structure

```
app/
├── (public)/                       ← layout grupo (no afecta URL)
│   ├── layout.tsx                  (PublicLayout con header/footer/banner)
│   ├── page.tsx                    (home /)
│   ├── seccion/[slug]/page.tsx
│   ├── seccion/[slug]/[subseccion]/page.tsx
│   ├── producto/[slug]/page.tsx
│   ├── para-ella/page.tsx
│   ├── para-el/page.tsx
│   ├── etiqueta/[slug]/page.tsx
│   ├── buscar/page.tsx
│   ├── contacto/page.tsx
│   ├── como-comprar/page.tsx
│   └── politicas/page.tsx
├── page.tsx                        (DELETE — la home pasa a /(public)/page.tsx)
└── ...

components/public/
├── Header.tsx                       (logo + nav + iconos)
├── Footer.tsx
├── Banner.tsx                       (server, lee config)
├── BannerWrapper.tsx                (client toggle)
├── HeroHome.tsx
├── TrustStrip.tsx
├── SeccionesGrid.tsx
├── ProductoCard.tsx
├── ProductosGrid.tsx
├── SeccionHero.tsx
├── ProductoGaleria.tsx              (carrusel cliente con thumbnails)
├── ProductoInfo.tsx                 (info + variant selector + add to cart)
├── ProductosRelacionados.tsx
├── BloqueFemenino.tsx
├── FiltrosSection.tsx               (sort + price range + modo)
├── SearchBar.tsx
├── FloatingWhatsApp.tsx
├── EmailCapture.tsx                 (popup con cookie)
└── PoliticaContent.tsx              (markdown viewer)

components/cart/
├── CartProvider.tsx                 (context + localStorage)
├── CartIcon.tsx                     (header icon con contador)
├── CartDrawer.tsx
├── CartItem.tsx
└── whatsapp-message.ts              (helper: formatea mensaje WhatsApp)

components/wishlist/
├── WishlistProvider.tsx             (context + localStorage)
└── WishlistButton.tsx               (corazón en card y producto)

lib/
├── catalog/
│   ├── queries.ts                   (server helpers: getSecciones, getProducto, etc.)
│   ├── filters.ts                   (parse searchParams → query)
│   └── meta.ts                      (generateMetadata helpers)
└── markdown.ts                      (sanitize + render)
```

---

## Pre-requisitos manuales

- [ ] **Manual A:** Aplicar SQL del Storage (de Plan 02 Task 1) si aún no lo hiciste. Sin esto, las imágenes de productos no cargarán.
- [ ] **Manual B:** Crear al menos 1 sección + 1 producto publicado con imagen para probar el catálogo durante desarrollo.

---

## Task 1: Setup — public layout, queries helpers, markdown

**Files:**
- Create: `app/(public)/layout.tsx`
- Delete (move content to public): `app/page.tsx`
- Create: `components/public/Header.tsx`
- Create: `components/public/Footer.tsx`
- Create: `components/public/Banner.tsx`
- Create: `lib/catalog/queries.ts`
- Create: `lib/markdown.ts`
- Modify: `app/layout.tsx` (cleanup head metadata)
- Install: `react-markdown`, `rehype-sanitize`

- [ ] **Step 1.1: Install markdown dependencies**

```bash
npm install react-markdown rehype-sanitize remark-gfm
```

- [ ] **Step 1.2: Create `lib/markdown.ts`**

```ts
import ReactMarkdown from "react-markdown"
import rehypeSanitize from "rehype-sanitize"
import remarkGfm from "remark-gfm"
import type { ReactNode } from "react"

interface Props {
  content: string | null | undefined
  className?: string
}

export function Markdown({ content, className }: Props): ReactNode {
  if (!content) return null
  return (
    <div className={className}>
      <ReactMarkdown rehypePlugins={[rehypeSanitize]} remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
```

- [ ] **Step 1.3: Create `lib/catalog/queries.ts`**

```ts
import { createSupabaseServerClient } from "@/lib/supabase/server"

export async function getConfiguracion() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.from("configuracion").select("*").eq("id", 1).single()
  return data
}

export async function getSeccionesPublicas() {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("secciones")
    .select("id, nombre, slug, imagen_portada, descripcion_corta, tono, orden")
    .eq("activa", true)
    .order("orden", { ascending: true })
  return data || []
}

export async function getSeccionBySlug(slug: string) {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("secciones")
    .select("id, nombre, slug, imagen_portada, descripcion_corta, tono, subsecciones(id, nombre, slug)")
    .eq("activa", true)
    .eq("slug", slug)
    .single()
  return data
}

export async function getProductosBySeccion(
  seccionId: string,
  filters: {
    subseccion?: string
    modo?: string
    sort?: string
    precio_min?: number
    precio_max?: number
  } = {}
) {
  const supabase = await createSupabaseServerClient()
  let query = supabase
    .from("productos")
    .select(
      "id, nombre, slug, precio_venta, precio_anterior, modo, stock_unidades, destacado, fecha_llegada_inicio, fecha_llegada_fin, producto_imagenes(url, watermark_limpio)"
    )
    .eq("estado", "publicado")
    .eq("seccion_id", seccionId)

  if (filters.subseccion) query = query.eq("subseccion_id", filters.subseccion)
  if (filters.modo) query = query.eq("modo", filters.modo)
  if (filters.precio_min) query = query.gte("precio_venta", filters.precio_min)
  if (filters.precio_max) query = query.lte("precio_venta", filters.precio_max)

  if (filters.sort === "precio_asc") query = query.order("precio_venta", { ascending: true })
  else if (filters.sort === "precio_desc") query = query.order("precio_venta", { ascending: false })
  else if (filters.sort === "nuevos") query = query.order("published_at", { ascending: false, nullsFirst: false })
  else query = query.order("destacado", { ascending: false }).order("published_at", { ascending: false })

  const { data } = await query.limit(100)
  return data || []
}

export async function getProductoBySlug(slug: string) {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("productos")
    .select(`
      id, nombre, slug, descripcion, modelo, modo, stock_unidades, precio_venta, precio_anterior,
      fecha_llegada_inicio, fecha_llegada_fin, solo_para_ella, solo_para_el, etiquetas,
      seccion_id, secciones(id, nombre, slug, tono),
      producto_imagenes(id, url, tipo, orden, watermark_limpio),
      producto_variantes(id, tipo, valor, precio_extra, stock_unidades, imagen_url, orden)
    `)
    .eq("estado", "publicado")
    .eq("slug", slug)
    .single()
  return data
}

export async function getProductosRelacionados(productoId: string, seccionId: string | null) {
  if (!seccionId) return []
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("productos")
    .select("id, nombre, slug, precio_venta, precio_anterior, modo, producto_imagenes(url, watermark_limpio)")
    .eq("estado", "publicado")
    .eq("seccion_id", seccionId)
    .neq("id", productoId)
    .limit(4)
  return data || []
}

export async function getProductosDestacados(limit = 8) {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("productos")
    .select(
      "id, nombre, slug, precio_venta, precio_anterior, modo, stock_unidades, fecha_llegada_inicio, fecha_llegada_fin, producto_imagenes(url, watermark_limpio)"
    )
    .eq("estado", "publicado")
    .eq("destacado", true)
    .order("published_at", { ascending: false })
    .limit(limit)
  return data || []
}

export async function getProductosRecientes(limit = 8) {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("productos")
    .select(
      "id, nombre, slug, precio_venta, precio_anterior, modo, producto_imagenes(url, watermark_limpio)"
    )
    .eq("estado", "publicado")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit)
  return data || []
}

export async function buscarProductos(q: string) {
  if (!q.trim()) return []
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("productos")
    .select(
      "id, nombre, slug, precio_venta, precio_anterior, modo, producto_imagenes(url, watermark_limpio)"
    )
    .eq("estado", "publicado")
    .or(`nombre.ilike.%${q}%,descripcion.ilike.%${q}%,modelo.ilike.%${q}%`)
    .limit(40)
  return data || []
}

export async function getProductosPorEtiqueta(slug: string) {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("productos")
    .select(
      "id, nombre, slug, precio_venta, precio_anterior, modo, etiquetas, producto_imagenes(url, watermark_limpio)"
    )
    .eq("estado", "publicado")
    .contains("etiquetas", [slug])
  return data || []
}

export async function getEtiqueta(slug: string) {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.from("etiquetas").select("nombre, slug, color").eq("slug", slug).single()
  return data
}
```

- [ ] **Step 1.4: Create `components/public/Banner.tsx`**

```tsx
import { getConfiguracion } from "@/lib/catalog/queries"
import Link from "next/link"

export async function Banner() {
  const config = await getConfiguracion()
  if (!config?.banner_activo || !config.banner_texto) return null
  return (
    <div
      className="w-full text-center py-2.5 px-4 text-sm font-semibold"
      style={{ backgroundColor: config.banner_color ?? "#c9a86a", color: "#0a0a0a" }}
    >
      {config.banner_texto}
      {config.banner_cta_texto && config.banner_cta_url && (
        <Link href={config.banner_cta_url} className="ml-3 underline">
          {config.banner_cta_texto}
        </Link>
      )}
    </div>
  )
}
```

- [ ] **Step 1.5: Create `components/public/Header.tsx`**

```tsx
"use client"

import Link from "next/link"
import { Logo } from "@/components/brand/logo"
import { Search, Heart, ShoppingBag, Menu, X } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { useCart } from "@/components/cart/CartProvider"

const NAV = [
  { label: "Inicio", href: "/" },
  { label: "Catálogo", href: "/buscar" },
  { label: "Para Él", href: "/para-el" },
  { label: "Para Ella", href: "/para-ella" },
  { label: "Contacto", href: "/contacto" },
]

export function Header() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { items, setOpen: setCartOpen } = useCart()
  const cartCount = items.reduce((acc, i) => acc + i.cantidad, 0)

  return (
    <header className="sticky top-0 z-40 bg-black border-b border-border backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between gap-6 h-20">
        <Link href="/" className="flex-shrink-0">
          <Logo size="sm" />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-xs tracking-eyebrow uppercase font-medium transition-colors",
                pathname === item.href ? "text-gold-primary" : "text-white/80 hover:text-gold-primary"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          <Link href="/buscar" className="w-10 h-10 rounded-full border border-border-strong flex items-center justify-center text-gold-primary hover:bg-gold-primary hover:text-black transition-colors">
            <Search size={16} />
          </Link>
          <button onClick={() => setCartOpen(true)} className="relative w-10 h-10 rounded-full border border-border-strong flex items-center justify-center text-gold-primary hover:bg-gold-primary hover:text-black transition-colors">
            <ShoppingBag size={16} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-gold-primary text-black text-[0.6rem] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {cartCount}
              </span>
            )}
          </button>
          <button className="md:hidden w-10 h-10 rounded-full border border-border-strong flex items-center justify-center text-white" onClick={() => setOpen(!open)}>
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="md:hidden border-t border-border bg-black p-4 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "block px-3 py-3 text-sm uppercase tracking-wider rounded-md",
                pathname === item.href ? "bg-gold-primary/10 text-gold-primary" : "text-white hover:bg-white/5"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
```

- [ ] **Step 1.6: Create `components/public/Footer.tsx`**

```tsx
import Link from "next/link"
import { Logo } from "@/components/brand/logo"
import { getConfiguracion } from "@/lib/catalog/queries"
import { Instagram, MessageCircle } from "lucide-react"

export async function Footer() {
  const config = await getConfiguracion()

  return (
    <footer className="bg-black border-t border-border mt-20">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="space-y-4">
          <Logo size="md" />
          <p className="text-muted text-sm">Lujo que se siente. Precio que sorprende.</p>
          <div className="flex gap-3">
            {config?.instagram_url && (
              <a href={config.instagram_url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-gold-primary/40 flex items-center justify-center text-gold-primary hover:bg-gold-primary hover:text-black transition-colors">
                <Instagram size={16} />
              </a>
            )}
            {config?.whatsapp && (
              <a href={`https://wa.me/${config.whatsapp}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-gold-primary/40 flex items-center justify-center text-gold-primary hover:bg-gold-primary hover:text-black transition-colors">
                <MessageCircle size={16} />
              </a>
            )}
          </div>
        </div>

        <div>
          <h4 className="eyebrow mb-4">Explorar</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/" className="text-white/80 hover:text-gold-primary">Inicio</Link></li>
            <li><Link href="/buscar" className="text-white/80 hover:text-gold-primary">Catálogo</Link></li>
            <li><Link href="/para-ella" className="text-white/80 hover:text-gold-primary">Para Ella</Link></li>
            <li><Link href="/para-el" className="text-white/80 hover:text-gold-primary">Para Él</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="eyebrow mb-4">Ayuda</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/como-comprar" className="text-white/80 hover:text-gold-primary">Cómo comprar</Link></li>
            <li><Link href="/contacto" className="text-white/80 hover:text-gold-primary">Contacto</Link></li>
            <li><Link href="/politicas#devoluciones" className="text-white/80 hover:text-gold-primary">Devoluciones</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="eyebrow mb-4">Legales</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/politicas#privacidad" className="text-white/80 hover:text-gold-primary">Privacidad</Link></li>
            <li><Link href="/politicas#terminos" className="text-white/80 hover:text-gold-primary">Términos</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border py-6 text-center text-xs text-muted tracking-wider">
        Métodos de pago: Yappy · Transferencia · 50% Yappy + 50% Efectivo en entrega
        <br />
        © {new Date().getFullYear()} Klassik Store. Todos los derechos reservados.
      </div>
    </footer>
  )
}
```

- [ ] **Step 1.7: Create `app/(public)/layout.tsx`**

```tsx
import { Header } from "@/components/public/Header"
import { Footer } from "@/components/public/Footer"
import { Banner } from "@/components/public/Banner"
import { CartProvider } from "@/components/cart/CartProvider"
import { CartDrawer } from "@/components/cart/CartDrawer"
import { WishlistProvider } from "@/components/wishlist/WishlistProvider"
import { FloatingWhatsApp } from "@/components/public/FloatingWhatsApp"
import { EmailCapture } from "@/components/public/EmailCapture"

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <WishlistProvider>
        <Banner />
        <Header />
        <main className="min-h-[calc(100vh-80px)]">{children}</main>
        <Footer />
        <FloatingWhatsApp />
        <CartDrawer />
        <EmailCapture />
      </WishlistProvider>
    </CartProvider>
  )
}
```

- [ ] **Step 1.8: Move and rewrite homepage stub**

Delete `app/page.tsx` (the current "Coming Soon" placeholder with the demo card).

Create `app/(public)/page.tsx` with a temporary placeholder until Task 3:

```tsx
import { Topbar } from "@/components/admin/topbar"

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-20 text-center">
      <h1 className="heading-display text-5xl mb-4">Klassik Store</h1>
      <p className="text-muted">Próximamente: catálogo público completo en Task 3.</p>
    </div>
  )
}
```

Don't import `Topbar` (it's admin-only); replace with simple placeholder.

- [ ] **Step 1.9: TSC + commit**

NOTE: This task creates dependencies on `CartProvider`, `WishlistProvider`, `FloatingWhatsApp`, `EmailCapture`, `CartDrawer` that don't exist yet. To prevent build failure, create empty stub versions of each:

Create `components/cart/CartProvider.tsx`:

```tsx
"use client"

import { createContext, useContext, useState, ReactNode } from "react"

interface CartItem {
  productoId: string
  varianteId?: string | null
  nombre: string
  precio: number
  imagen: string | null
  cantidad: number
  modo: string
}

interface CartContextValue {
  items: CartItem[]
  open: boolean
  setOpen: (v: boolean) => void
  add: (item: CartItem) => void
  remove: (productoId: string, varianteId?: string | null) => void
  setCantidad: (productoId: string, cantidad: number, varianteId?: string | null) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items] = useState<CartItem[]>([])
  const [open, setOpen] = useState(false)
  // Full implementation in Task 6
  return (
    <CartContext.Provider
      value={{ items, open, setOpen, add: () => {}, remove: () => {}, setCantidad: () => {}, clear: () => {} }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be inside CartProvider")
  return ctx
}
```

Create `components/cart/CartDrawer.tsx`:

```tsx
"use client"
export function CartDrawer() {
  return null
}
```

Create `components/wishlist/WishlistProvider.tsx`:

```tsx
"use client"
import { ReactNode } from "react"
export function WishlistProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}
```

Create `components/public/FloatingWhatsApp.tsx`:

```tsx
export function FloatingWhatsApp() {
  return null
}
```

Create `components/public/EmailCapture.tsx`:

```tsx
"use client"
export function EmailCapture() {
  return null
}
```

These stubs are replaced with real implementations in Tasks 6, 7, 8, 9.

```bash
npx tsc --noEmit
git add app/ components/public/ components/cart/ components/wishlist/ lib/catalog/ lib/markdown.ts package.json package-lock.json
git commit -m "feat(public): setup public layout with header, footer, banner, providers stubs"
```

---

## Task 2: ProductoCard reusable component

**Files:**
- Create: `components/public/ProductoCard.tsx`

This card is reused everywhere: home destacados, recientes, sección grid, related, search results.

- [ ] **Step 2.1: Create `components/public/ProductoCard.tsx`**

```tsx
import Link from "next/link"
import Image from "next/image"
import { formatUSD } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ArrowRight } from "lucide-react"

interface ProductoCardData {
  id: string
  nombre: string
  slug: string
  precio_venta: number
  precio_anterior: number | null
  modo: string
  stock_unidades?: number | null
  fecha_llegada_inicio?: string | null
  fecha_llegada_fin?: string | null
  producto_imagenes: { url: string; watermark_limpio: boolean }[]
}

function formatRange(inicio: string | null | undefined, fin: string | null | undefined) {
  if (!inicio || !fin) return null
  const a = new Date(inicio).toLocaleDateString("es-PA", { day: "numeric", month: "short" })
  const b = new Date(fin).toLocaleDateString("es-PA", { day: "numeric", month: "short" })
  return `${a} — ${b}`
}

export function ProductoCard({ p }: { p: ProductoCardData }) {
  const imagen = p.producto_imagenes.filter((i) => i.watermark_limpio)[0]?.url
  const isStock = p.modo === "stock"
  const agotado = isStock && (p.stock_unidades ?? 0) === 0
  const fechaRango = formatRange(p.fecha_llegada_inicio, p.fecha_llegada_fin)

  return (
    <Link
      href={`/producto/${p.slug}`}
      className="group block bg-black-surface border border-border rounded-md overflow-hidden hover:border-gold-primary/50 hover:shadow-deep transition-all"
    >
      <div className="aspect-square relative bg-gradient-to-br from-gold-deep/30 to-black overflow-hidden">
        {imagen && (
          <Image
            src={imagen}
            alt={p.nombre}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 300px"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        )}
        <div className="absolute top-3 left-3">
          {agotado ? (
            <Badge tone="danger">Agotado</Badge>
          ) : isStock ? (
            <Badge tone="gold">Entrega inmediata</Badge>
          ) : (
            <Badge tone="info">Pre-orden</Badge>
          )}
        </div>
      </div>
      <div className="p-5 space-y-2">
        <h3 className="font-serif text-xl text-white leading-tight">{p.nombre}</h3>
        {fechaRango && !isStock && (
          <p className="text-muted text-[0.7rem]">Llega entre {fechaRango}</p>
        )}
        <div className="flex items-end justify-between pt-2 border-t border-border">
          <div>
            {p.precio_anterior && (
              <div className="text-muted line-through text-xs">{formatUSD(p.precio_anterior)}</div>
            )}
            <div className="text-gold-primary font-serif text-xl">{formatUSD(p.precio_venta)}</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-gradient-gold text-black flex items-center justify-center group-hover:rotate-45 transition-transform">
            <ArrowRight size={14} />
          </div>
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2.2: TSC + commit**

```bash
npx tsc --noEmit
git add components/public/ProductoCard.tsx
git commit -m "feat(public): ProductoCard reusable component"
```

---

## Task 3: Homepage completa

**Files:**
- Modify: `app/(public)/page.tsx` (full implementation)
- Create: `components/public/HeroHome.tsx`
- Create: `components/public/TrustStrip.tsx`
- Create: `components/public/SeccionesGrid.tsx`
- Create: `components/public/BloqueFemenino.tsx`

- [ ] **Step 3.1: Create `components/public/HeroHome.tsx`**

```tsx
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function HeroHome() {
  return (
    <section className="relative overflow-hidden bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(201,168,106,0.18),transparent_50%)]" />
      <div className="absolute top-1/2 right-[-10%] -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(201,168,106,0.06),transparent_70%)]" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-24 md:py-32 relative z-10 grid grid-cols-1 lg:grid-cols-[1.2fr,1fr] gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-3 px-4 py-1.5 border border-gold-primary/30 rounded-full mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-primary"></span>
            <span className="eyebrow">Entrega inmediata · Pre-orden disponible</span>
          </div>
          <h1 className="font-serif text-5xl md:text-7xl leading-[0.95] tracking-tight text-white mb-7">
            Lujo que <em className="not-italic bg-gradient-gold bg-clip-text text-transparent italic font-semibold">se siente</em>.
            <br />
            Precio que <em className="not-italic bg-gradient-gold bg-clip-text text-transparent italic font-semibold">sorprende</em>.
          </h1>
          <p className="text-muted text-base leading-relaxed max-w-lg mb-9">
            Diseños que impresionan. Precios que enamoran. Descubre piezas seleccionadas para acompañar cada momento — desde el detalle perfecto hasta el regalo para toda la vida.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/buscar"><Button size="lg">Explorar catálogo</Button></Link>
            <Link href="/para-ella"><Button variant="ghost" size="lg">Para Ella ♡</Button></Link>
          </div>
        </div>

        <div className="aspect-[1/1.1] rounded-md relative bg-gradient-to-br from-[#2a1d10] to-black overflow-hidden hidden lg:block">
          <div className="absolute inset-[20%] rounded-full bg-gradient-to-br from-gold-bright via-gold-primary to-gold-deep shadow-gold-glow-lg" />
          <div className="absolute inset-[35%] rounded-full bg-gradient-to-b from-black-soft to-black border-2 border-gold-primary/30" />
          <div className="absolute bottom-6 left-6 eyebrow font-serif">— Estilo Premium —</div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3.2: Create `components/public/TrustStrip.tsx`**

```tsx
import { Diamond, ShieldCheck, DollarSign, Truck } from "lucide-react"

const ITEMS = [
  { icon: Diamond, title: "Diseños que impresionan", sub: "Acabados premium" },
  { icon: ShieldCheck, title: "Calidad que acompaña", sub: "Garantizada" },
  { icon: DollarSign, title: "Precios que sorprenden", sub: "Mejor en Panamá" },
  { icon: Truck, title: "Entrega confiable", sub: "Rápida y segura" },
]

export function TrustStrip() {
  return (
    <section className="bg-[#050505] border-y border-border">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
        {ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.title} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-gold-primary flex items-center justify-center text-gold-primary flex-shrink-0">
                <Icon size={16} />
              </div>
              <div>
                <div className="text-white text-sm font-semibold">{item.title}</div>
                <div className="text-muted text-xs">{item.sub}</div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
```

- [ ] **Step 3.3: Create `components/public/SeccionesGrid.tsx`**

```tsx
import Link from "next/link"
import Image from "next/image"

interface Seccion {
  id: string
  nombre: string
  slug: string
  imagen_portada: string | null
  descripcion_corta: string | null
  tono: string
}

const TONO_BG = {
  "dark-gold": "from-[#1a1410] to-black",
  "rose-gold": "from-[#2a1a1f] to-[#1a0a14]",
  "blue-cool": "from-[#0f1620] to-black",
}

export function SeccionesGrid({ secciones }: { secciones: Seccion[] }) {
  if (secciones.length === 0) return null
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-20">
      <div className="text-center mb-12">
        <div className="eyebrow mb-3">— Nuestras Colecciones —</div>
        <h2 className="font-serif text-4xl md:text-5xl text-white">
          Explora por <em className="italic text-gold-primary">categoría</em>
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {secciones.slice(0, 6).map((s, i) => {
          const tonoClass = TONO_BG[s.tono as keyof typeof TONO_BG] || TONO_BG["dark-gold"]
          return (
            <Link
              key={s.id}
              href={`/seccion/${s.slug}`}
              className={`group relative aspect-[3/4] rounded-md overflow-hidden border border-border hover:border-gold-primary/40 transition-all`}
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
                {s.descripcion_corta && <p className="text-white/80 text-sm leading-snug">{s.descripcion_corta}</p>}
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

- [ ] **Step 3.4: Create `components/public/BloqueFemenino.tsx`**

```tsx
import Link from "next/link"

export function BloqueFemenino() {
  return (
    <section className="py-24 bg-[radial-gradient(circle_at_30%_50%,rgba(212,165,148,0.12),transparent_60%)] border-t border-border">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h2 className="font-serif text-5xl md:text-6xl text-white leading-tight mb-5">
          Elegancia <em className="italic text-rose-gold">que enamora</em>.
        </h2>
        <p className="text-muted text-base tracking-wide mb-8">— Una colección pensada para ella —</p>
        <Link
          href="/para-ella"
          className="inline-block text-rose-gold text-xs tracking-eyebrow uppercase font-semibold border-b border-rose-gold/50 pb-1 hover:border-rose-gold transition-colors"
        >
          Ver colección para ella →
        </Link>
      </div>
    </section>
  )
}
```

- [ ] **Step 3.5: Replace `app/(public)/page.tsx` with full home**

```tsx
import { HeroHome } from "@/components/public/HeroHome"
import { TrustStrip } from "@/components/public/TrustStrip"
import { SeccionesGrid } from "@/components/public/SeccionesGrid"
import { ProductoCard } from "@/components/public/ProductoCard"
import { BloqueFemenino } from "@/components/public/BloqueFemenino"
import { getSeccionesPublicas, getProductosDestacados, getProductosRecientes } from "@/lib/catalog/queries"

export default async function HomePage() {
  const [secciones, destacados, recientes] = await Promise.all([
    getSeccionesPublicas(),
    getProductosDestacados(8),
    getProductosRecientes(8),
  ])

  return (
    <>
      <HeroHome />
      <TrustStrip />
      <SeccionesGrid secciones={secciones} />

      {destacados.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 border-t border-border">
          <div className="text-center mb-12">
            <div className="eyebrow mb-3">— Destacados de la Semana —</div>
            <h2 className="font-serif text-4xl text-white">
              Lo que está <em className="italic text-gold-primary">enamorando</em>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {destacados.map((p) => <ProductoCard key={p.id} p={p as never} />)}
          </div>
        </section>
      )}

      <BloqueFemenino />

      {recientes.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-8 py-16">
          <div className="text-center mb-12">
            <div className="eyebrow mb-3">— Recién Llegados —</div>
            <h2 className="font-serif text-4xl text-white">Lo último en piezas</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {recientes.map((p) => <ProductoCard key={p.id} p={p as never} />)}
          </div>
        </section>
      )}
    </>
  )
}
```

- [ ] **Step 3.6: TSC + commit**

```bash
npx tsc --noEmit
git add app/(public)/page.tsx components/public/
git commit -m "feat(public): homepage with hero, trust strip, sections grid, destacados, recientes"
```

---

## Task 4: Sección page con filtros

**Files:**
- Create: `app/(public)/seccion/[slug]/page.tsx`
- Create: `app/(public)/seccion/[slug]/[subseccion]/page.tsx`
- Create: `components/public/SeccionHero.tsx`
- Create: `components/public/FiltrosSection.tsx`

- [ ] **Step 4.1: Create `components/public/SeccionHero.tsx`**

```tsx
import Image from "next/image"

interface Seccion {
  nombre: string
  descripcion_corta: string | null
  imagen_portada: string | null
  tono: string
}

const TONO_BG = {
  "dark-gold": "from-[#1a1410] to-black",
  "rose-gold": "from-[#2a1a1f] to-[#1a0a14]",
  "blue-cool": "from-[#0f1620] to-black",
}

export function SeccionHero({ seccion }: { seccion: Seccion }) {
  const tonoClass = TONO_BG[seccion.tono as keyof typeof TONO_BG] || TONO_BG["dark-gold"]
  return (
    <section className={`relative bg-gradient-to-br ${tonoClass} overflow-hidden border-b border-border`}>
      {seccion.imagen_portada && (
        <Image
          src={seccion.imagen_portada}
          alt={seccion.nombre}
          fill
          sizes="100vw"
          className="object-cover opacity-30"
          priority
        />
      )}
      <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-20 md:py-28 text-center z-10">
        <div className="eyebrow mb-4">— Colección —</div>
        <h1 className="font-serif text-5xl md:text-6xl text-white mb-5">{seccion.nombre}</h1>
        {seccion.descripcion_corta && (
          <p className="text-white/80 text-lg max-w-2xl mx-auto">{seccion.descripcion_corta}</p>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 4.2: Create `components/public/FiltrosSection.tsx`**

```tsx
"use client"

import Link from "next/link"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useTransition } from "react"

interface Props {
  subsecciones: { id: string; nombre: string; slug: string }[]
  baseHref: string
}

const SORTS = [
  { value: "destacados", label: "Destacados" },
  { value: "nuevos", label: "Más nuevos" },
  { value: "precio_asc", label: "Precio: menor a mayor" },
  { value: "precio_desc", label: "Precio: mayor a menor" },
]

const MODOS = [
  { value: "", label: "Todos" },
  { value: "stock", label: "En stock" },
  { value: "preorden", label: "Pre-orden" },
]

export function FiltrosSection({ subsecciones, baseHref }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [, startTransition] = useTransition()

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    startTransition(() => router.push(`${pathname}?${next.toString()}`))
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 border-b border-border space-y-4">
      {subsecciones.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Link
            href={baseHref}
            className={`px-4 py-2 rounded-full text-xs uppercase tracking-wider whitespace-nowrap border transition-colors ${
              pathname === baseHref ? "bg-gold-primary text-black border-gold-primary" : "text-white border-border hover:border-gold-primary"
            }`}
          >
            Todo
          </Link>
          {subsecciones.map((sub) => {
            const isActive = pathname === `${baseHref}/${sub.slug}`
            return (
              <Link
                key={sub.id}
                href={`${baseHref}/${sub.slug}`}
                className={`px-4 py-2 rounded-full text-xs uppercase tracking-wider whitespace-nowrap border transition-colors ${
                  isActive ? "bg-gold-primary text-black border-gold-primary" : "text-white border-border hover:border-gold-primary"
                }`}
              >
                {sub.nombre}
              </Link>
            )
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center justify-end">
        <select
          value={params.get("modo") || ""}
          onChange={(e) => setParam("modo", e.target.value)}
          className="bg-black border border-border rounded-md px-3 py-2 text-white text-sm"
        >
          {MODOS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={params.get("sort") || "destacados"}
          onChange={(e) => setParam("sort", e.target.value)}
          className="bg-black border border-border rounded-md px-3 py-2 text-white text-sm"
        >
          {SORTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    </div>
  )
}
```

- [ ] **Step 4.3: Create `app/(public)/seccion/[slug]/page.tsx`**

```tsx
import { notFound } from "next/navigation"
import { getSeccionBySlug, getProductosBySeccion } from "@/lib/catalog/queries"
import { SeccionHero } from "@/components/public/SeccionHero"
import { FiltrosSection } from "@/components/public/FiltrosSection"
import { ProductoCard } from "@/components/public/ProductoCard"

export default async function SeccionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ sort?: string; modo?: string }>
}) {
  const { slug } = await params
  const filters = await searchParams
  const seccion = await getSeccionBySlug(slug)
  if (!seccion) notFound()

  const productos = await getProductosBySeccion(seccion.id, filters)

  return (
    <>
      <SeccionHero seccion={seccion} />
      <FiltrosSection subsecciones={seccion.subsecciones || []} baseHref={`/seccion/${slug}`} />
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        {productos.length === 0 ? (
          <div className="text-center py-20 text-muted">
            <p className="font-serif text-2xl text-white mb-2">Sin productos por ahora</p>
            <p>Pronto agregaremos novedades en esta sección.</p>
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

- [ ] **Step 4.4: Create `app/(public)/seccion/[slug]/[subseccion]/page.tsx`**

```tsx
import { notFound } from "next/navigation"
import { getSeccionBySlug, getProductosBySeccion } from "@/lib/catalog/queries"
import { SeccionHero } from "@/components/public/SeccionHero"
import { FiltrosSection } from "@/components/public/FiltrosSection"
import { ProductoCard } from "@/components/public/ProductoCard"

export default async function SubseccionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; subseccion: string }>
  searchParams: Promise<{ sort?: string; modo?: string }>
}) {
  const { slug, subseccion } = await params
  const filters = await searchParams
  const seccion = await getSeccionBySlug(slug)
  if (!seccion) notFound()

  const sub = seccion.subsecciones?.find((s) => s.slug === subseccion)
  if (!sub) notFound()

  const productos = await getProductosBySeccion(seccion.id, { ...filters, subseccion: sub.id })

  return (
    <>
      <SeccionHero seccion={{ ...seccion, nombre: `${seccion.nombre} · ${sub.nombre}` }} />
      <FiltrosSection subsecciones={seccion.subsecciones || []} baseHref={`/seccion/${slug}`} />
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        {productos.length === 0 ? (
          <div className="text-center py-20 text-muted">
            <p className="font-serif text-2xl text-white">Sin productos en {sub.nombre}</p>
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

- [ ] **Step 4.5: TSC + commit**

```bash
npx tsc --noEmit
git add app/(public)/seccion/ components/public/SeccionHero.tsx components/public/FiltrosSection.tsx
git commit -m "feat(public): section + subsection pages with filters"
```

---

## Task 5: Producto page con galería, variantes, related

**Files:**
- Create: `app/(public)/producto/[slug]/page.tsx`
- Create: `components/public/ProductoGaleria.tsx`
- Create: `components/public/ProductoInfo.tsx`
- Create: `components/public/ProductosRelacionados.tsx`

- [ ] **Step 5.1: Create `components/public/ProductoGaleria.tsx`**

```tsx
"use client"

import Image from "next/image"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface Imagen {
  id: string
  url: string
  tipo: string
  watermark_limpio: boolean
}

export function ProductoGaleria({ imagenes, nombre }: { imagenes: Imagen[]; nombre: string }) {
  const clean = imagenes.filter((i) => i.watermark_limpio)
  const [active, setActive] = useState(0)

  if (clean.length === 0) {
    return (
      <div className="aspect-square bg-gradient-to-br from-gold-deep/30 to-black rounded-md flex items-center justify-center text-muted">
        Sin imágenes
      </div>
    )
  }

  const current = clean[active]

  return (
    <div className="space-y-3">
      <div className="aspect-square relative bg-black rounded-md overflow-hidden">
        {current.tipo === "video" ? (
          <video src={current.url} controls className="w-full h-full object-contain" />
        ) : (
          <Image src={current.url} alt={nombre} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" priority />
        )}
      </div>
      {clean.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {clean.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(idx)}
              className={cn(
                "aspect-square relative rounded-md overflow-hidden border-2 transition-colors",
                idx === active ? "border-gold-primary" : "border-border hover:border-border-strong"
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

- [ ] **Step 5.2: Create `components/public/ProductoInfo.tsx`**

```tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { formatUSD } from "@/lib/utils"
import { useCart } from "@/components/cart/CartProvider"
import { Markdown } from "@/lib/markdown"
import { Plus, Minus } from "lucide-react"
import { toast } from "sonner"

interface Variante {
  id: string
  tipo: string
  valor: string
  precio_extra: number
  stock_unidades: number | null
  imagen_url: string | null
}

interface Producto {
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
  producto_variantes: Variante[]
  producto_imagenes: { url: string }[]
}

function formatRange(inicio: string | null, fin: string | null) {
  if (!inicio || !fin) return null
  const a = new Date(inicio).toLocaleDateString("es-PA", { day: "numeric", month: "long" })
  const b = new Date(fin).toLocaleDateString("es-PA", { day: "numeric", month: "long" })
  return `${a} y ${b}`
}

export function ProductoInfo({ p }: { p: Producto }) {
  // group variants by tipo
  const variantsByTipo = p.producto_variantes.reduce<Record<string, Variante[]>>((acc, v) => {
    if (!acc[v.tipo]) acc[v.tipo] = []
    acc[v.tipo].push(v)
    return acc
  }, {})

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    p.producto_variantes[0]?.id ?? null
  )
  const [cantidad, setCantidad] = useState(1)
  const { add, setOpen } = useCart()

  const selectedVariant = p.producto_variantes.find((v) => v.id === selectedVariantId)
  const precioFinal = p.precio_venta + (selectedVariant?.precio_extra ?? 0)
  const isStock = p.modo === "stock"
  const agotado =
    (isStock && (p.stock_unidades ?? 0) === 0) ||
    (selectedVariant && selectedVariant.stock_unidades !== null && selectedVariant.stock_unidades === 0)
  const fechaRango = formatRange(p.fecha_llegada_inicio, p.fecha_llegada_fin)

  function handleAdd() {
    add({
      productoId: p.id,
      varianteId: selectedVariant?.id ?? null,
      nombre: selectedVariant ? `${p.nombre} (${selectedVariant.valor})` : p.nombre,
      precio: precioFinal,
      imagen: p.producto_imagenes[0]?.url ?? null,
      cantidad,
      modo: p.modo,
    })
    toast.success("Agregado al carrito")
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          {agotado ? (
            <Badge tone="danger">Agotado</Badge>
          ) : isStock ? (
            <Badge tone="gold">Entrega inmediata · 2-3 días</Badge>
          ) : (
            <Badge tone="info">Pre-orden{fechaRango ? ` · llega entre ${fechaRango}` : ""}</Badge>
          )}
        </div>
        <h1 className="font-serif text-4xl md:text-5xl text-white">{p.nombre}</h1>
        {p.modelo && <p className="text-muted text-xs tracking-wider mt-2">Modelo {p.modelo}</p>}
      </div>

      <div className="flex items-baseline gap-3">
        {p.precio_anterior && (
          <span className="text-muted line-through text-lg">{formatUSD(p.precio_anterior)}</span>
        )}
        <span className="font-serif text-4xl text-gold-primary">{formatUSD(precioFinal)}</span>
      </div>

      {Object.entries(variantsByTipo).length > 0 && (
        <div className="space-y-3">
          {Object.entries(variantsByTipo).map(([tipo, variantes]) => (
            <div key={tipo}>
              <label className="eyebrow block mb-2">{tipo}</label>
              <div className="flex flex-wrap gap-2">
                {variantes.map((v) => {
                  const isSel = v.id === selectedVariantId
                  const variantAgotado = v.stock_unidades !== null && v.stock_unidades === 0
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariantId(v.id)}
                      disabled={variantAgotado}
                      className={`px-4 py-2 rounded-md border text-sm transition-colors ${
                        isSel
                          ? "border-gold-primary bg-gold-primary/10 text-gold-primary"
                          : "border-border text-white hover:border-gold-primary/60"
                      } ${variantAgotado ? "opacity-40 line-through cursor-not-allowed" : ""}`}
                    >
                      {v.valor}
                      {v.precio_extra > 0 && <span className="text-muted text-xs ml-1">+{formatUSD(v.precio_extra)}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex items-center border border-border rounded-md">
          <button type="button" onClick={() => setCantidad(Math.max(1, cantidad - 1))} className="px-3 py-2 text-white hover:text-gold-primary">
            <Minus size={14} />
          </button>
          <span className="px-4 font-semibold">{cantidad}</span>
          <button type="button" onClick={() => setCantidad(cantidad + 1)} className="px-3 py-2 text-white hover:text-gold-primary">
            <Plus size={14} />
          </button>
        </div>
        <Button type="button" size="lg" className="flex-1" onClick={handleAdd} disabled={agotado}>
          {agotado ? "Agotado" : "Agregar al carrito"}
        </Button>
      </div>

      {p.descripcion && (
        <div className="pt-6 border-t border-border">
          <Markdown content={p.descripcion} className="prose prose-invert prose-sm text-white/80 max-w-none" />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5.3: Create `components/public/ProductosRelacionados.tsx`**

```tsx
import { ProductoCard } from "@/components/public/ProductoCard"

interface Producto {
  id: string
  nombre: string
  slug: string
  precio_venta: number
  precio_anterior: number | null
  modo: string
  producto_imagenes: { url: string; watermark_limpio: boolean }[]
}

export function ProductosRelacionados({ productos }: { productos: Producto[] }) {
  if (productos.length === 0) return null
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-16 border-t border-border">
      <div className="text-center mb-10">
        <div className="eyebrow mb-3">— También te puede gustar —</div>
        <h2 className="font-serif text-3xl text-white">Más piezas de esta colección</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {productos.map((p) => <ProductoCard key={p.id} p={p as never} />)}
      </div>
    </section>
  )
}
```

- [ ] **Step 5.4: Create `app/(public)/producto/[slug]/page.tsx`**

```tsx
import { notFound } from "next/navigation"
import Link from "next/link"
import { getProductoBySlug, getProductosRelacionados } from "@/lib/catalog/queries"
import { ProductoGaleria } from "@/components/public/ProductoGaleria"
import { ProductoInfo } from "@/components/public/ProductoInfo"
import { ProductosRelacionados } from "@/components/public/ProductosRelacionados"
import { ChevronRight } from "lucide-react"
import type { Metadata } from "next"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const p = await getProductoBySlug(slug)
  if (!p) return { title: "Producto no encontrado" }
  const imagen = p.producto_imagenes?.find((i) => i.watermark_limpio)?.url
  return {
    title: `${p.nombre} · Klassik Store`,
    description: p.descripcion?.slice(0, 160) || `${p.nombre} en Klassik Store. Lujo que se siente. Precio que sorprende.`,
    openGraph: {
      title: p.nombre,
      description: p.descripcion?.slice(0, 160) || undefined,
      images: imagen ? [imagen] : undefined,
    },
  }
}

export default async function ProductoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const producto = await getProductoBySlug(slug)
  if (!producto) notFound()

  const relacionados = await getProductosRelacionados(producto.id, producto.seccion_id)

  // Sort images by orden, only show watermark_limpio
  const imagenesOrdenadas = (producto.producto_imagenes || []).slice().sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
  const variantesOrdenadas = (producto.producto_variantes || []).slice().sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))

  const seccion = Array.isArray(producto.secciones) ? producto.secciones[0] : producto.secciones

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 text-xs text-muted">
        <Link href="/" className="hover:text-gold-primary">Inicio</Link>
        <ChevronRight size={12} className="inline mx-1" />
        {seccion && (
          <>
            <Link href={`/seccion/${seccion.slug}`} className="hover:text-gold-primary">{seccion.nombre}</Link>
            <ChevronRight size={12} className="inline mx-1" />
          </>
        )}
        <span className="text-white">{producto.nombre}</span>
      </div>

      <section className="max-w-7xl mx-auto px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
        <ProductoGaleria imagenes={imagenesOrdenadas as never} nombre={producto.nombre} />
        <ProductoInfo p={{ ...producto, producto_variantes: variantesOrdenadas } as never} />
      </section>

      <ProductosRelacionados productos={relacionados as never} />
    </>
  )
}
```

- [ ] **Step 5.5: TSC + commit**

```bash
npx tsc --noEmit
git add app/(public)/producto/ components/public/
git commit -m "feat(public): producto detail page with gallery, variant selector, related"
```

---

## Task 6: Carrito persistente (full implementation)

**Files:**
- Modify: `components/cart/CartProvider.tsx` (replace stub with full impl)
- Create: `components/cart/CartDrawer.tsx` (replace stub)
- Create: `components/cart/CartItem.tsx`
- Create: `components/cart/whatsapp-message.ts`

- [ ] **Step 6.1: Replace `components/cart/CartProvider.tsx`** (full implementation)

```tsx
"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"

const STORAGE_KEY = "klassik_cart_v1"

interface CartItem {
  productoId: string
  varianteId?: string | null
  nombre: string
  precio: number
  imagen: string | null
  cantidad: number
  modo: string
}

interface CartContextValue {
  items: CartItem[]
  open: boolean
  setOpen: (v: boolean) => void
  add: (item: CartItem) => void
  remove: (productoId: string, varianteId?: string | null) => void
  setCantidad: (productoId: string, cantidad: number, varianteId?: string | null) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

function sameItem(a: CartItem, b: { productoId: string; varianteId?: string | null }) {
  return a.productoId === b.productoId && (a.varianteId ?? null) === (b.varianteId ?? null)
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [open, setOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setItems(JSON.parse(raw))
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items, hydrated])

  function add(item: CartItem) {
    setItems((prev) => {
      const existing = prev.find((p) => sameItem(p, item))
      if (existing) {
        return prev.map((p) => (sameItem(p, item) ? { ...p, cantidad: p.cantidad + item.cantidad } : p))
      }
      return [...prev, item]
    })
  }

  function remove(productoId: string, varianteId?: string | null) {
    setItems((prev) => prev.filter((p) => !sameItem(p, { productoId, varianteId })))
  }

  function setCantidad(productoId: string, cantidad: number, varianteId?: string | null) {
    if (cantidad <= 0) {
      remove(productoId, varianteId)
      return
    }
    setItems((prev) => prev.map((p) => (sameItem(p, { productoId, varianteId }) ? { ...p, cantidad } : p)))
  }

  function clear() {
    setItems([])
  }

  return (
    <CartContext.Provider value={{ items, open, setOpen, add, remove, setCantidad, clear }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be inside CartProvider")
  return ctx
}
```

- [ ] **Step 6.2: Create `components/cart/whatsapp-message.ts`**

```ts
import { formatUSD } from "@/lib/utils"

interface CartItem {
  productoId: string
  varianteId?: string | null
  nombre: string
  precio: number
  cantidad: number
  modo: string
}

export function buildWhatsappMessage(items: CartItem[], storeName = "Klassik Store"): string {
  const lines: string[] = []
  lines.push(`*Pedido desde ${storeName}*`)
  lines.push("")
  let total = 0
  for (const it of items) {
    const subtotal = it.precio * it.cantidad
    total += subtotal
    const modoLabel = it.modo === "stock" ? " (entrega inmediata)" : " (pre-orden)"
    lines.push(`• ${it.nombre} x${it.cantidad}${modoLabel} — ${formatUSD(subtotal)}`)
  }
  lines.push("")
  lines.push(`*Total: ${formatUSD(total)}*`)
  lines.push("")
  lines.push("Quisiera coordinar pago y entrega. Gracias.")
  return lines.join("\n")
}

export function buildWhatsappUrl(phone: string, message: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`
}
```

- [ ] **Step 6.3: Create `components/cart/CartItem.tsx`**

```tsx
"use client"

import Image from "next/image"
import { Plus, Minus, X } from "lucide-react"
import { formatUSD } from "@/lib/utils"
import { useCart } from "./CartProvider"

interface Props {
  productoId: string
  varianteId?: string | null
  nombre: string
  precio: number
  imagen: string | null
  cantidad: number
}

export function CartItem({ productoId, varianteId, nombre, precio, imagen, cantidad }: Props) {
  const { setCantidad, remove } = useCart()
  return (
    <div className="flex gap-3 py-3 border-b border-border">
      <div className="relative w-16 h-16 rounded-md overflow-hidden bg-black flex-shrink-0">
        {imagen && <Image src={imagen} alt={nombre} fill sizes="64px" className="object-cover" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-medium truncate">{nombre}</div>
        <div className="text-gold-primary text-sm font-serif mt-0.5">{formatUSD(precio)}</div>
        <div className="flex items-center gap-2 mt-2">
          <button type="button" onClick={() => setCantidad(productoId, cantidad - 1, varianteId)} className="w-7 h-7 rounded border border-border text-white hover:text-gold-primary flex items-center justify-center">
            <Minus size={12} />
          </button>
          <span className="text-white text-sm w-6 text-center">{cantidad}</span>
          <button type="button" onClick={() => setCantidad(productoId, cantidad + 1, varianteId)} className="w-7 h-7 rounded border border-border text-white hover:text-gold-primary flex items-center justify-center">
            <Plus size={12} />
          </button>
        </div>
      </div>
      <button type="button" onClick={() => remove(productoId, varianteId)} className="text-muted hover:text-danger self-start" aria-label="Eliminar">
        <X size={16} />
      </button>
    </div>
  )
}
```

- [ ] **Step 6.4: Create `components/cart/CartDrawer.tsx`** (replace stub)

We need the store's WhatsApp number from configuracion. Pass via prop or fetch in a wrapper. Use a client-side approach: read from a global window var set in layout. Simpler: pass as data attribute via a server component wrapper.

Actually easier: query in a server component that wraps the drawer. Let me restructure.

Create `components/cart/CartDrawer.tsx`:

```tsx
"use client"

import { useCart } from "./CartProvider"
import { CartItem } from "./CartItem"
import { Button } from "@/components/ui/button"
import { formatUSD } from "@/lib/utils"
import { buildWhatsappMessage, buildWhatsappUrl } from "./whatsapp-message"
import { X } from "lucide-react"
import { createPortal } from "react-dom"
import { useEffect, useState } from "react"

interface Props {
  whatsappNumber: string | null
  storeName: string
}

export function CartDrawerClient({ whatsappNumber, storeName }: Props) {
  const { items, open, setOpen, clear } = useCart()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  if (!mounted) return null

  const total = items.reduce((acc, i) => acc + i.precio * i.cantidad, 0)

  function handleWhatsApp() {
    if (!whatsappNumber || items.length === 0) return
    const msg = buildWhatsappMessage(items, storeName)
    window.open(buildWhatsappUrl(whatsappNumber, msg), "_blank")
  }

  return createPortal(
    <>
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setOpen(false)}
      />
      <aside
        className={`fixed top-0 right-0 bottom-0 w-full sm:max-w-md bg-black-surface border-l border-border z-50 flex flex-col transition-transform ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <header className="p-5 border-b border-border flex items-center justify-between">
          <h2 className="font-serif text-2xl text-white">Tu carrito</h2>
          <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-white">
            <X size={20} />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5">
          {items.length === 0 ? (
            <div className="text-center py-20 text-muted">
              <p className="font-serif text-xl text-white mb-2">Carrito vacío</p>
              <p className="text-sm">Agrega productos para empezar.</p>
            </div>
          ) : (
            items.map((i) => (
              <CartItem
                key={`${i.productoId}-${i.varianteId ?? ""}`}
                productoId={i.productoId}
                varianteId={i.varianteId}
                nombre={i.nombre}
                precio={i.precio}
                imagen={i.imagen}
                cantidad={i.cantidad}
              />
            ))
          )}
        </div>
        {items.length > 0 && (
          <footer className="p-5 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Total</span>
              <span className="font-serif text-2xl text-gold-primary">{formatUSD(total)}</span>
            </div>
            <Button type="button" size="lg" className="w-full" onClick={handleWhatsApp} disabled={!whatsappNumber}>
              Pedir por WhatsApp
            </Button>
            <button type="button" onClick={clear} className="w-full text-xs text-muted hover:text-danger py-2">
              Vaciar carrito
            </button>
          </footer>
        )}
      </aside>
    </>,
    document.body
  )
}
```

Replace the existing `components/cart/CartDrawer.tsx` server wrapper:

```tsx
import { CartDrawerClient } from "./CartDrawer.client"
import { getConfiguracion } from "@/lib/catalog/queries"

export async function CartDrawer() {
  const config = await getConfiguracion()
  return <CartDrawerClient whatsappNumber={config?.whatsapp ?? null} storeName={config?.nombre_tienda ?? "Klassik Store"} />
}
```

Actually rename: keep `CartDrawer.tsx` as the server wrapper, move the client portal to a separate file `CartDrawer.client.tsx`.

```bash
# Restructure: CartDrawer.tsx becomes server, new CartDrawer.client.tsx holds client component
```

Create files in this order:
- `components/cart/CartDrawer.client.tsx` (contains `CartDrawerClient` from Step 6.4 above)
- Overwrite `components/cart/CartDrawer.tsx` (becomes server wrapper)

The async layout already supports this — server components can be rendered as children.

- [ ] **Step 6.5: TSC + commit**

```bash
npx tsc --noEmit
git add components/cart/
git commit -m "feat(public): full cart implementation with localStorage and WhatsApp checkout"
```

---

## Task 7: Wishlist (heart icon, localStorage)

**Files:**
- Modify: `components/wishlist/WishlistProvider.tsx`
- Create: `components/wishlist/WishlistButton.tsx`

- [ ] **Step 7.1: Replace `components/wishlist/WishlistProvider.tsx`**

```tsx
"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"

const STORAGE_KEY = "klassik_wishlist_v1"

interface WishlistContextValue {
  ids: string[]
  has: (id: string) => boolean
  toggle: (id: string) => void
}

const Ctx = createContext<WishlistContextValue | null>(null)

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setIds(JSON.parse(raw))
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  }, [ids, hydrated])

  function has(id: string) {
    return ids.includes(id)
  }
  function toggle(id: string) {
    setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return <Ctx.Provider value={{ ids, has, toggle }}>{children}</Ctx.Provider>
}

export function useWishlist() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error("useWishlist must be inside WishlistProvider")
  return ctx
}
```

- [ ] **Step 7.2: Create `components/wishlist/WishlistButton.tsx`**

```tsx
"use client"

import { Heart } from "lucide-react"
import { useWishlist } from "./WishlistProvider"
import { cn } from "@/lib/utils"

export function WishlistButton({ productoId, className }: { productoId: string; className?: string }) {
  const { has, toggle } = useWishlist()
  const active = has(productoId)
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggle(productoId)
      }}
      className={cn(
        "w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center transition-colors",
        active ? "text-gold-primary" : "text-white hover:text-gold-primary",
        className
      )}
      aria-label="Agregar a wishlist"
    >
      <Heart size={14} fill={active ? "currentColor" : "none"} />
    </button>
  )
}
```

- [ ] **Step 7.3: Add WishlistButton to ProductoCard and ProductoInfo**

In `components/public/ProductoCard.tsx`, add:
- Import `WishlistButton`
- Inside the image wrapper, add `<WishlistButton productoId={p.id} className="absolute top-3 right-3 z-10" />`

In `components/public/ProductoInfo.tsx`, add the heart inline next to the title (right side) — same `WishlistButton` import.

- [ ] **Step 7.4: TSC + commit**

```bash
npx tsc --noEmit
git add components/wishlist/ components/public/ProductoCard.tsx components/public/ProductoInfo.tsx
git commit -m "feat(public): wishlist with localStorage + heart button on cards and product page"
```

---

## Task 8: Búsqueda + Para Ella/Él + Etiquetas

**Files:**
- Create: `app/(public)/buscar/page.tsx`
- Create: `components/public/SearchBar.tsx`
- Create: `app/(public)/para-ella/page.tsx`
- Create: `app/(public)/para-el/page.tsx`
- Create: `app/(public)/etiqueta/[slug]/page.tsx`

- [ ] **Step 8.1: Create `components/public/SearchBar.tsx`**

```tsx
"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

export function SearchBar() {
  const router = useRouter()
  const params = useSearchParams()
  const [q, setQ] = useState(params.get("q") || "")

  useEffect(() => {
    const t = setTimeout(() => {
      const cur = params.get("q") || ""
      if (q !== cur) {
        const next = new URLSearchParams(params)
        if (q) next.set("q", q)
        else next.delete("q")
        router.push(`/buscar?${next.toString()}`)
      }
    }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  return (
    <div className="relative max-w-xl mx-auto">
      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gold-primary" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar productos..."
        className="pl-12 py-4 text-base"
        autoFocus
      />
    </div>
  )
}
```

- [ ] **Step 8.2: Create `app/(public)/buscar/page.tsx`**

```tsx
import { buscarProductos } from "@/lib/catalog/queries"
import { SearchBar } from "@/components/public/SearchBar"
import { ProductoCard } from "@/components/public/ProductoCard"

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q = "" } = await searchParams
  const productos = q ? await buscarProductos(q) : []

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-16">
      <h1 className="font-serif text-4xl text-center text-white mb-2">
        {q ? "Resultados" : "Catálogo"}
      </h1>
      <p className="text-muted text-center mb-10">
        {q ? `${productos.length} resultado(s) para "${q}"` : "Explora el catálogo completo"}
      </p>
      <div className="mb-10">
        <SearchBar />
      </div>
      {productos.length === 0 ? (
        q && (
          <div className="text-center py-20 text-muted">
            <p className="font-serif text-2xl text-white">Sin resultados</p>
            <p className="mt-2">Intenta con otro término de búsqueda.</p>
          </div>
        )
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {productos.map((p) => <ProductoCard key={p.id} p={p as never} />)}
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 8.3: Create `app/(public)/para-ella/page.tsx`**

```tsx
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ProductoCard } from "@/components/public/ProductoCard"
import { BloqueFemenino } from "@/components/public/BloqueFemenino"

export default async function ParaEllaPage() {
  const supabase = await createSupabaseServerClient()
  const { data: productos } = await supabase
    .from("productos")
    .select(
      "id, nombre, slug, precio_venta, precio_anterior, modo, stock_unidades, fecha_llegada_inicio, fecha_llegada_fin, producto_imagenes(url, watermark_limpio)"
    )
    .eq("estado", "publicado")
    .eq("solo_para_ella", true)
    .order("destacado", { ascending: false })
    .order("published_at", { ascending: false })

  return (
    <>
      <BloqueFemenino />
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        {(!productos || productos.length === 0) ? (
          <div className="text-center py-12 text-muted">
            <p className="font-serif text-2xl text-white">Pronto piezas para ella</p>
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

- [ ] **Step 8.4: Create `app/(public)/para-el/page.tsx`** (same pattern, swap `solo_para_el`)

```tsx
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { ProductoCard } from "@/components/public/ProductoCard"

export default async function ParaElPage() {
  const supabase = await createSupabaseServerClient()
  const { data: productos } = await supabase
    .from("productos")
    .select(
      "id, nombre, slug, precio_venta, precio_anterior, modo, stock_unidades, fecha_llegada_inicio, fecha_llegada_fin, producto_imagenes(url, watermark_limpio)"
    )
    .eq("estado", "publicado")
    .eq("solo_para_el", true)
    .order("destacado", { ascending: false })
    .order("published_at", { ascending: false })

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-16">
      <div className="text-center mb-12">
        <div className="eyebrow mb-3">— Colección Masculina —</div>
        <h1 className="font-serif text-5xl text-white">Para <em className="italic text-gold-primary">Él</em></h1>
        <p className="text-muted text-sm mt-3">Piezas que cuentan más que el tiempo.</p>
      </div>
      {(!productos || productos.length === 0) ? (
        <div className="text-center py-12 text-muted">
          <p className="font-serif text-2xl text-white">Pronto piezas para él</p>
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

- [ ] **Step 8.5: Create `app/(public)/etiqueta/[slug]/page.tsx`**

```tsx
import { notFound } from "next/navigation"
import { getEtiqueta, getProductosPorEtiqueta } from "@/lib/catalog/queries"
import { ProductoCard } from "@/components/public/ProductoCard"

export default async function EtiquetaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [etiqueta, productos] = await Promise.all([
    getEtiqueta(slug),
    getProductosPorEtiqueta(slug),
  ])
  if (!etiqueta) notFound()

  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-16">
      <div className="text-center mb-12">
        <div className="eyebrow mb-3">— Etiqueta —</div>
        <h1 className="font-serif text-5xl text-white" style={{ color: etiqueta.color }}>{etiqueta.nombre}</h1>
      </div>
      {productos.length === 0 ? (
        <div className="text-center py-12 text-muted">
          <p className="font-serif text-2xl text-white">Sin productos con esta etiqueta</p>
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

- [ ] **Step 8.6: TSC + commit**

```bash
npx tsc --noEmit
git add app/(public)/buscar/ app/(public)/para-ella/ app/(public)/para-el/ app/(public)/etiqueta/ components/public/SearchBar.tsx
git commit -m "feat(public): search, para-ella, para-el, etiqueta pages"
```

---

## Task 9: Floating WhatsApp + Email capture popup + Static pages

**Files:**
- Modify: `components/public/FloatingWhatsApp.tsx` (replace stub)
- Modify: `components/public/EmailCapture.tsx` (replace stub)
- Create: `app/api/newsletter/route.ts`
- Create: `app/(public)/contacto/page.tsx`
- Create: `app/(public)/como-comprar/page.tsx`
- Create: `app/(public)/politicas/page.tsx`

- [ ] **Step 9.1: Replace `components/public/FloatingWhatsApp.tsx`**

```tsx
import { getConfiguracion } from "@/lib/catalog/queries"
import { MessageCircle } from "lucide-react"

export async function FloatingWhatsApp() {
  const config = await getConfiguracion()
  if (!config?.whatsapp) return null
  return (
    <a
      href={`https://wa.me/${config.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Hola Klassik Store, tengo una consulta.")}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] shadow-deep flex items-center justify-center text-white hover:scale-110 transition-transform"
      aria-label="Escríbenos por WhatsApp"
    >
      <MessageCircle size={24} />
    </a>
  )
}
```

- [ ] **Step 9.2: Create `app/api/newsletter/route.ts`**

```ts
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { email } = await request.json()
  if (!email || typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 })
  }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from("suscriptores_newsletter")
    .insert({ email: email.toLowerCase().trim() })
  if (error && !error.message.includes("duplicate")) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 9.3: Replace `components/public/EmailCapture.tsx`**

```tsx
"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X } from "lucide-react"
import { toast } from "sonner"

const COOKIE_KEY = "klassik_email_popup_dismissed_v1"

export function EmailCapture() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const dismissed = document.cookie.includes(`${COOKIE_KEY}=1`)
    if (dismissed) return
    const t = setTimeout(() => setOpen(true), 8000)
    return () => clearTimeout(t)
  }, [])

  function dismiss() {
    setOpen(false)
    document.cookie = `${COOKIE_KEY}=1; max-age=${60 * 60 * 24 * 30}; path=/`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        body: JSON.stringify({ email }),
        headers: { "Content-Type": "application/json" },
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || "Error")
      }
      toast.success("¡Bienvenida! Te enviaremos novedades pronto.")
      dismiss()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error")
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed bottom-6 left-6 right-6 sm:left-auto sm:right-6 sm:max-w-sm z-40 bg-black-surface border border-gold-primary/30 rounded-md p-6 shadow-deep">
      <button onClick={dismiss} className="absolute top-3 right-3 text-muted hover:text-white">
        <X size={16} />
      </button>
      <h3 className="font-serif text-2xl text-white mb-2">¿Quieres <em className="italic text-gold-primary">10% off</em>?</h3>
      <p className="text-muted text-sm mb-4">Únete a nuestro club y recibe descuento en tu primera compra.</p>
      <form onSubmit={handleSubmit} className="space-y-2">
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tucorreo@ejemplo.com"
        />
        <Button type="submit" size="md" className="w-full" disabled={submitting}>
          {submitting ? "Enviando..." : "Quiero mi descuento"}
        </Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 9.4: Create `app/(public)/contacto/page.tsx`**

```tsx
import { getConfiguracion } from "@/lib/catalog/queries"
import { MessageCircle, Instagram, Mail } from "lucide-react"
import Link from "next/link"

export default async function ContactoPage() {
  const config = await getConfiguracion()
  return (
    <section className="max-w-3xl mx-auto px-4 md:px-8 py-20 text-center">
      <div className="eyebrow mb-4">— Contacto —</div>
      <h1 className="font-serif text-5xl text-white mb-6">Escríbenos</h1>
      <p className="text-muted text-lg mb-10">
        Respondemos rápido. La forma más cómoda es WhatsApp o Instagram.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {config?.whatsapp && (
          <a
            href={`https://wa.me/${config.whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-6 bg-black-surface border border-border rounded-md hover:border-gold-primary transition-colors group"
          >
            <MessageCircle size={32} className="mx-auto mb-3 text-gold-primary group-hover:scale-110 transition-transform" />
            <div className="text-white font-semibold">WhatsApp</div>
            <div className="text-muted text-xs mt-1">{config.whatsapp}</div>
          </a>
        )}
        {config?.instagram_url && (
          <a
            href={config.instagram_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-6 bg-black-surface border border-border rounded-md hover:border-gold-primary transition-colors group"
          >
            <Instagram size={32} className="mx-auto mb-3 text-gold-primary group-hover:scale-110 transition-transform" />
            <div className="text-white font-semibold">Instagram</div>
            <div className="text-muted text-xs mt-1">{config.instagram_handle ?? "@klassikstore.pa"}</div>
          </a>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 9.5: Create `app/(public)/como-comprar/page.tsx`**

```tsx
import { getConfiguracion } from "@/lib/catalog/queries"

export default async function ComoComprarPage() {
  const config = await getConfiguracion()
  return (
    <section className="max-w-3xl mx-auto px-4 md:px-8 py-16">
      <div className="text-center mb-12">
        <div className="eyebrow mb-3">— Guía —</div>
        <h1 className="font-serif text-5xl text-white">Cómo comprar</h1>
      </div>

      <div className="space-y-12">
        <div>
          <h2 className="font-serif text-2xl text-gold-primary mb-3">1. Elige tu producto</h2>
          <p className="text-white/80 leading-relaxed">
            Explora nuestras colecciones. Cada producto indica si está disponible para <strong>entrega inmediata</strong> o si es una <strong>pre-orden</strong> con fecha estimada de llegada.
          </p>
        </div>
        <div>
          <h2 className="font-serif text-2xl text-gold-primary mb-3">2. Agrega al carrito</h2>
          <p className="text-white/80 leading-relaxed">
            Selecciona variantes (color, talla, modelo) si aplica y agrega al carrito. Puedes revisar tu pedido en cualquier momento desde el ícono del carrito.
          </p>
        </div>
        <div>
          <h2 className="font-serif text-2xl text-gold-primary mb-3">3. Coordina por WhatsApp</h2>
          <p className="text-white/80 leading-relaxed">
            Al pulsar &ldquo;Pedir por WhatsApp&rdquo; se abre la conversación con nosotros con el resumen de tu pedido. Acordamos pago y entrega de forma personal.
          </p>
        </div>
        <div>
          <h2 className="font-serif text-2xl text-gold-primary mb-3">4. Métodos de pago</h2>
          <ul className="text-white/80 list-disc list-inside space-y-1">
            <li>Yappy{config?.yappy_numero && `: ${config.yappy_numero}`}</li>
            <li>Transferencia bancaria</li>
            <li>50% Yappy/transferencia + 50% efectivo en la entrega</li>
          </ul>
        </div>
        {config?.mensaje_preorden && (
          <div className="bg-black-surface border border-border rounded-md p-6">
            <h2 className="font-serif text-xl text-gold-primary mb-2">Sobre pre-órdenes</h2>
            <p className="text-white/80">{config.mensaje_preorden}</p>
          </div>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 9.6: Create `app/(public)/politicas/page.tsx`**

```tsx
import { getConfiguracion } from "@/lib/catalog/queries"
import { Markdown } from "@/lib/markdown"

export default async function PoliticasPage() {
  const config = await getConfiguracion()
  return (
    <section className="max-w-3xl mx-auto px-4 md:px-8 py-16 space-y-16">
      <div className="text-center">
        <div className="eyebrow mb-3">— Información Legal —</div>
        <h1 className="font-serif text-5xl text-white">Políticas</h1>
      </div>

      <div id="devoluciones">
        <h2 className="font-serif text-3xl text-gold-primary mb-4">Devoluciones</h2>
        {config?.politica_devoluciones ? (
          <Markdown content={config.politica_devoluciones} className="prose prose-invert prose-sm text-white/80 max-w-none" />
        ) : (
          <p className="text-muted">Por definir.</p>
        )}
      </div>

      <div id="privacidad">
        <h2 className="font-serif text-3xl text-gold-primary mb-4">Privacidad</h2>
        {config?.politica_privacidad ? (
          <Markdown content={config.politica_privacidad} className="prose prose-invert prose-sm text-white/80 max-w-none" />
        ) : (
          <p className="text-muted">Por definir.</p>
        )}
      </div>

      <div id="terminos">
        <h2 className="font-serif text-3xl text-gold-primary mb-4">Términos y condiciones</h2>
        {config?.terminos_condiciones ? (
          <Markdown content={config.terminos_condiciones} className="prose prose-invert prose-sm text-white/80 max-w-none" />
        ) : (
          <p className="text-muted">Por definir.</p>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 9.7: TSC + commit**

```bash
npx tsc --noEmit
git add components/public/ app/api/newsletter/ app/(public)/contacto/ app/(public)/como-comprar/ app/(public)/politicas/
git commit -m "feat(public): floating WhatsApp, email capture popup with newsletter API, static pages (contacto, como-comprar, politicas)"
```

---

## Task 10: E2E tests del catálogo público

**Files:**
- Create: `tests/e2e/catalogo-publico.spec.ts`

- [ ] **Step 10.1: Create `tests/e2e/catalogo-publico.spec.ts`**

```ts
import { test, expect } from "@playwright/test"

test.describe("catálogo público", () => {
  test("homepage renders without auth", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByText(/lujo que/i).first()).toBeVisible()
    await expect(page.getByText(/coming soon/i)).not.toBeVisible()
  })

  test("header has cart icon and navigation", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("link", { name: /catálogo/i }).first()).toBeVisible()
    await expect(page.getByRole("button").filter({ has: page.locator("svg") }).first()).toBeVisible()
  })

  test("search page accepts input", async ({ page }) => {
    await page.goto("/buscar")
    await page.getByPlaceholder(/buscar/i).fill("test")
    await expect(page).toHaveURL(/q=test/)
  })

  test("contacto page shows contact options", async ({ page }) => {
    await page.goto("/contacto")
    await expect(page.getByRole("heading", { name: /escríbenos/i })).toBeVisible()
  })

  test("politicas page renders three sections", async ({ page }) => {
    await page.goto("/politicas")
    await expect(page.getByRole("heading", { name: /devoluciones/i })).toBeVisible()
    await expect(page.getByRole("heading", { name: /privacidad/i })).toBeVisible()
    await expect(page.getByRole("heading", { name: /términos/i })).toBeVisible()
  })

  test("cart drawer opens when cart icon clicked", async ({ page }) => {
    await page.goto("/")
    const cartBtn = page.locator("header button").filter({ has: page.locator("svg") }).nth(1)
    await cartBtn.click()
    await expect(page.getByRole("heading", { name: /tu carrito/i })).toBeVisible()
  })
})
```

- [ ] **Step 10.2: Run tests**

```bash
npm run test:e2e
```

Expected: all public catalog tests pass. Admin tests may skip (env vars not set).

- [ ] **Step 10.3: TSC + commit**

```bash
npx tsc --noEmit
git add tests/e2e/catalogo-publico.spec.ts
git commit -m "test(public): E2E smoke tests for public catalog flows"
```

---

## Verificación final del Plan 03

- [ ] `npx tsc --noEmit` → 0 errores
- [ ] `npm test` → unit tests OK
- [ ] `npm run test:e2e` → public + login tests pasan (admin tests skipped sin env vars)
- [ ] Push y verificar deploy en Vercel
- [ ] Crear ≥1 sección, ≥1 producto publicado con imagen marcada como limpia
- [ ] Navegar al home en producción — ve hero, secciones, destacados, recientes (si hay)
- [ ] Click en sección → ve productos → click producto → ve galería, descripción, agregar al carrito
- [ ] Carrito drawer abre/cierra, persiste tras recarga, "Pedir por WhatsApp" abre WhatsApp con mensaje formateado
- [ ] Wishlist (heart) persiste tras recarga
- [ ] Banner promocional aparece si está activo
- [ ] Email capture popup aparece tras 8 segundos en primera visita, no aparece de nuevo si se cierra
- [ ] Footer tiene links a contacto, políticas, redes sociales
- [ ] Floating WhatsApp en esquina inferior derecha
- [ ] Mobile responsive (probar en DevTools)

Si todo OK, Plan 03 completo. Plan 04 (extensión Chrome) o seguir directo con Plan 05 (pedidos).

---

## Notas para el implementador

1. **Imágenes con `watermark_limpio = false`** se filtran automáticamente vía RLS en la BD (Plan 01). Aunque las queries no filtren explícitamente, no aparecen al cliente. La doble verificación con `.filter((i) => i.watermark_limpio)` en frontend es defensa en profundidad.

2. **`(public)` route group:** los paréntesis hacen que el folder no afecte la URL pero comparta layout. `/(public)/page.tsx` = home `/`.

3. **Server Components default:** todo el rendering es server por default. Si TS se queja porque un componente client usa `async`, refactorízalo: el componente cliente toma datos via props desde un padre server.

4. **`as never`** en `<ProductoCard p={p as never}>` es para silenciar diferencias de tipos entre Supabase row y el shape esperado del card. Los campos requeridos coinciden. Plan 06 puede limpiar esos casts con tipos mejor mapeados.

5. **Banner reactivo:** cuando admin activa/desactiva banner, el `revalidatePath("/", "layout")` en `updateBanner` action invalida el cache y el banner se actualiza automáticamente.

6. **WhatsApp number format:** debe estar guardado en config como solo dígitos con código país (ej. `50760000000`). El helper `buildWhatsappUrl` ya remueve no-dígitos defensivamente.

7. **Cart persistence:** localStorage key `klassik_cart_v1`. Si en el futuro cambia la estructura, bump a `_v2`.

8. **prose-invert** clases requieren `@tailwindcss/typography` plugin. Si Tailwind v4 no lo trae out-of-the-box, instalar y agregar a globals.css. Si Markdown se ve sin estilo, agregar manualmente: `npm install -D @tailwindcss/typography` y `@plugin "@tailwindcss/typography";` en globals.css.

9. **Mobile:** todas las views deben verse bien en 360px wide mínimo. Verificar con DevTools antes de cerrar cada tarea.
