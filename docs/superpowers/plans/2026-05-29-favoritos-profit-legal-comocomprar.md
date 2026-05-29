# Favoritos, Ventas Offline, Legal y Cómo Comprar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar página de favoritos, dashboard de ventas offline con profit de inventario, contenido legal, y actualizar la guía de cómo comprar.

**Architecture:** Cuatro features independientes. Favoritos usa localStorage vía WishlistProvider + API route `/api/favoritos`. Ventas offline usa nueva tabla `ventas_offline` en Supabase con server action para inserts. Legal llena campos de `configuracion` en Supabase. Cómo comprar edita la página estática existente.

**Tech Stack:** Next.js 14 App Router, Supabase, TypeScript, Tailwind CSS, Lucide React, Server Actions

---

## Mapa de archivos

| Acción | Ruta |
|---|---|
| Crear | `app/api/favoritos/route.ts` |
| Crear | `app/(public)/favoritos/page.tsx` |
| Crear | `components/public/FavoritosGrid.tsx` |
| Modificar | `lib/catalog/queries.ts` |
| Modificar | `components/public/Header.tsx` |
| Crear | `supabase/migrations/20260529000000_ventas_offline.sql` |
| Crear | `app/admin/ventas-offline/page.tsx` |
| Crear | `app/admin/ventas-offline/actions.ts` |
| Crear | `components/admin/VentaOfflineModal.tsx` |
| Modificar | `components/admin/sidebar.tsx` |
| Modificar | `app/(public)/como-comprar/page.tsx` |
| Llenar en DB | `configuracion.politica_privacidad`, `configuracion.terminos_condiciones`, `configuracion.politica_devoluciones` |

---

## Task 1: API route de favoritos

**Files:**
- Create: `app/api/favoritos/route.ts`
- Modify: `lib/catalog/queries.ts`

- [ ] **Step 1: Agregar `getProductosByIds` en queries.ts**

Al final del archivo `lib/catalog/queries.ts`, agregar:

```typescript
export async function getProductosByIds(ids: string[]) {
  if (!ids.length) return []
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from("productos")
    .select(
      "id, nombre, slug, precio_venta, precio_anterior, modo, stock_unidades, fecha_llegada_inicio, fecha_llegada_fin, producto_imagenes(url, tipo, watermark_limpio)"
    )
    .eq("estado", "publicado")
    .in("id", ids)
    .order("orden", { referencedTable: "producto_imagenes", ascending: true })
  return data || []
}
```

- [ ] **Step 2: Crear el API route**

Crear `app/api/favoritos/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getProductosByIds } from "@/lib/catalog/queries"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const ids = Array.isArray(body.ids) ? body.ids : []
  const productos = await getProductosByIds(ids)
  return NextResponse.json(productos)
}
```

- [ ] **Step 3: Verificar que no hay errores de TypeScript**

```powershell
npx tsc --noEmit
```

No debe haber errores nuevos.

- [ ] **Step 4: Commit**

```powershell
git add lib/catalog/queries.ts app/api/favoritos/route.ts
git commit -m "feat(favoritos): agregar getProductosByIds y API route /api/favoritos"
```

---

## Task 2: Página de favoritos y corazón en el header

**Files:**
- Create: `components/public/FavoritosGrid.tsx`
- Create: `app/(public)/favoritos/page.tsx`
- Modify: `components/public/Header.tsx`

- [ ] **Step 1: Crear el componente cliente `FavoritosGrid`**

Crear `components/public/FavoritosGrid.tsx`:

```typescript
"use client"

import { useEffect, useState } from "react"
import { useWishlist } from "@/components/wishlist/WishlistProvider"
import { ProductoCard } from "@/components/public/ProductoCard"
import Link from "next/link"
import { Heart } from "lucide-react"

type Producto = {
  id: string
  nombre: string
  slug: string
  precio_venta: number
  precio_anterior: number | null
  modo: string
  stock_unidades?: number | null
  fecha_llegada_inicio?: string | null
  fecha_llegada_fin?: string | null
  producto_imagenes: { url: string; tipo?: string | null; watermark_limpio: boolean }[]
}

export function FavoritosGrid() {
  const { ids } = useWishlist()
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (ids.length === 0) {
      setProductos([])
      setLoading(false)
      return
    }
    setLoading(true)
    fetch("/api/favoritos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })
      .then((r) => r.json())
      .then((data) => {
        setProductos(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [ids])

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="aspect-[3/4] bg-black-surface animate-pulse rounded-md" />
        ))}
      </div>
    )
  }

  if (productos.length === 0) {
    return (
      <div className="text-center py-24 space-y-6">
        <Heart size={48} className="text-gold-primary/30 mx-auto" />
        <p className="font-serif text-2xl text-white">Aún no tienes favoritos</p>
        <p className="text-muted text-sm">Guarda las piezas que te gustan tocando el corazón en cualquier producto.</p>
        <Link
          href="/buscar"
          className="inline-block px-6 py-3 border border-gold-primary text-gold-primary text-sm uppercase tracking-widest hover:bg-gold-primary hover:text-black transition-colors"
        >
          Explorar catálogo
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
      {productos.map((p) => (
        <ProductoCard key={p.id} p={p as never} />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Crear la página `/favoritos`**

Crear `app/(public)/favoritos/page.tsx`:

```typescript
import { FavoritosGrid } from "@/components/public/FavoritosGrid"

export default function FavoritosPage() {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-16">
      <div className="text-center mb-12">
        <div className="eyebrow mb-3">— Tu selección —</div>
        <h1 className="font-serif text-5xl text-white">
          Mis <em className="italic text-gold-primary">Favoritos</em>
        </h1>
      </div>
      <FavoritosGrid />
    </section>
  )
}
```

- [ ] **Step 3: Agregar ícono de corazón con contador en el Header**

En `components/public/Header.tsx`, agregar import de `Heart` y `useWishlist`:

```typescript
// Agregar a los imports existentes:
import { Search, ShoppingBag, Menu, X, Heart } from "lucide-react"
import { useWishlist } from "@/components/wishlist/WishlistProvider"
```

Dentro de la función `Header()`, agregar después de `const cartCount`:

```typescript
const { ids: wishlistIds } = useWishlist()
const wishlistCount = wishlistIds.length
```

En el bloque `<div className="flex items-center gap-2 md:gap-3">`, agregar el botón de corazón **antes** del botón de carrito (entre el link de búsqueda y el botón del carrito):

```typescript
<Link
  href="/favoritos"
  className="relative w-10 h-10 rounded-full border border-border-strong flex items-center justify-center text-gold-primary hover:bg-gold-primary hover:text-black transition-colors"
>
  <Heart size={16} />
  {wishlistCount > 0 && (
    <span className="absolute -top-1 -right-1 bg-gold-primary text-black text-[0.6rem] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
      {wishlistCount}
    </span>
  )}
</Link>
```

- [ ] **Step 4: Verificar en el navegador**

Correr el servidor:
```powershell
npm run dev
```

Verificar:
1. El header muestra el ícono de corazón entre la lupa y el carrito
2. Ir a cualquier producto, hacer click en el corazón → se pone dorado y el contador aparece en el header
3. Ir a `/favoritos` → se muestran los productos guardados
4. Quitar todos los favoritos → aparece el estado vacío con link al catálogo
5. Cerrar el navegador y volver → los favoritos siguen ahí

- [ ] **Step 5: Commit**

```powershell
git add components/public/FavoritosGrid.tsx app/(public)/favoritos/page.tsx components/public/Header.tsx
git commit -m "feat(favoritos): pagina /favoritos e icono con contador en header"
```

---

## Task 3: Migración — tabla ventas_offline

**Files:**
- Create: `supabase/migrations/20260529000000_ventas_offline.sql`

- [ ] **Step 1: Crear el archivo de migración**

Crear `supabase/migrations/20260529000000_ventas_offline.sql`:

```sql
CREATE TABLE ventas_offline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID REFERENCES productos(id) ON DELETE SET NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_vendido NUMERIC NOT NULL CHECK (precio_vendido >= 0),
  costo_snapshot NUMERIC NOT NULL DEFAULT 0,
  canal TEXT NOT NULL CHECK (canal IN ('whatsapp', 'presencial')),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ventas_offline_fecha ON ventas_offline(fecha DESC);
CREATE INDEX idx_ventas_offline_producto ON ventas_offline(producto_id);
```

- [ ] **Step 2: Aplicar la migración en Supabase**

Usar la herramienta MCP de Supabase (`mcp__supabase__apply_migration`) con el contenido del SQL anterior para el proyecto `ackefqrcejicepksrwiz`.

- [ ] **Step 3: Verificar que la tabla existe**

Usar `mcp__supabase__list_tables` para confirmar que `ventas_offline` aparece en el listado.

- [ ] **Step 4: Commit**

```powershell
git add supabase/migrations/20260529000000_ventas_offline.sql
git commit -m "feat(db): tabla ventas_offline para registrar ventas por whatsapp y presencial"
```

---

## Task 4: Página admin de ventas offline y modal

**Files:**
- Create: `app/admin/ventas-offline/actions.ts`
- Create: `components/admin/VentaOfflineModal.tsx`
- Create: `app/admin/ventas-offline/page.tsx`

- [ ] **Step 1: Crear el server action**

Crear `app/admin/ventas-offline/actions.ts`:

```typescript
"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function registrarVentaOffline(data: {
  producto_id: string
  cantidad: number
  precio_vendido: number
  costo_snapshot: number
  canal: "whatsapp" | "presencial"
  fecha: string
}) {
  const supabase = await createSupabaseServerClient()

  const { error: insertError } = await supabase.from("ventas_offline").insert({
    producto_id: data.producto_id,
    cantidad: data.cantidad,
    precio_vendido: data.precio_vendido,
    costo_snapshot: data.costo_snapshot,
    canal: data.canal,
    fecha: data.fecha,
  })

  if (insertError) throw new Error(insertError.message)

  // Descontar del stock del producto
  const { data: producto } = await supabase
    .from("productos")
    .select("stock_unidades")
    .eq("id", data.producto_id)
    .single()

  if (producto && producto.stock_unidades !== null) {
    await supabase
      .from("productos")
      .update({ stock_unidades: Math.max(0, producto.stock_unidades - data.cantidad) })
      .eq("id", data.producto_id)
  }

  revalidatePath("/admin/ventas-offline")
}
```

- [ ] **Step 2: Crear el modal de registro**

Crear `components/admin/VentaOfflineModal.tsx`:

```typescript
"use client"

import { useState, useTransition } from "react"
import { registrarVentaOffline } from "@/app/admin/ventas-offline/actions"
import { X, Plus } from "lucide-react"

interface Producto {
  id: string
  nombre: string
  precio_venta: number
  costo_temu: number
  costo_envio_unitario: number
  stock_unidades: number | null
}

export function VentaOfflineModal({ productos }: { productos: Producto[] }) {
  const [open, setOpen] = useState(false)
  const [productoId, setProductoId] = useState("")
  const [cantidad, setCantidad] = useState(1)
  const [precioVendido, setPrecioVendido] = useState("")
  const [canal, setCanal] = useState<"whatsapp" | "presencial">("whatsapp")
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0])
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  const productoSeleccionado = productos.find((p) => p.id === productoId)
  const stockDisponible = productoSeleccionado?.stock_unidades ?? null

  function reset() {
    setProductoId("")
    setCantidad(1)
    setPrecioVendido("")
    setCanal("whatsapp")
    setFecha(new Date().toISOString().split("T")[0])
    setError("")
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (!productoSeleccionado) { setError("Selecciona un producto."); return }
    if (cantidad < 1) { setError("La cantidad debe ser al menos 1."); return }
    if (stockDisponible !== null && cantidad > stockDisponible) {
      setError(`Stock insuficiente. Disponible: ${stockDisponible} unidades.`)
      return
    }
    if (!precioVendido || isNaN(Number(precioVendido))) { setError("Ingresa el precio de venta."); return }

    startTransition(async () => {
      try {
        await registrarVentaOffline({
          producto_id: productoId,
          cantidad,
          precio_vendido: Number(precioVendido),
          costo_snapshot: Number(productoSeleccionado.costo_temu) + Number(productoSeleccionado.costo_envio_unitario),
          canal,
          fecha,
        })
        setOpen(false)
        reset()
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error al registrar la venta.")
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gold-primary text-black text-sm font-semibold rounded-md hover:bg-gold-primary/90 transition-colors"
      >
        <Plus size={16} />
        Registrar venta
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-black-surface border border-border rounded-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif text-xl text-white">Registrar venta offline</h2>
              <button onClick={() => { setOpen(false); reset() }} className="text-muted hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-muted uppercase tracking-wider mb-1">Producto</label>
                <select
                  value={productoId}
                  onChange={(e) => { setProductoId(e.target.value); setPrecioVendido("") }}
                  className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-primary"
                  required
                >
                  <option value="">Selecciona un producto...</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} {p.stock_unidades !== null ? `(${p.stock_unidades} en stock)` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {productoSeleccionado && (
                <div className="bg-black rounded-md p-3 text-xs space-y-1">
                  <div className="flex justify-between text-muted">
                    <span>Precio web</span>
                    <span className="text-gold-primary">${productoSeleccionado.precio_venta.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Costo unitario</span>
                    <span>${(Number(productoSeleccionado.costo_temu) + Number(productoSeleccionado.costo_envio_unitario)).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs text-muted uppercase tracking-wider mb-1">Cantidad</label>
                <input
                  type="number"
                  min={1}
                  max={stockDisponible ?? undefined}
                  value={cantidad}
                  onChange={(e) => setCantidad(Number(e.target.value))}
                  className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-muted uppercase tracking-wider mb-1">Precio vendido (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={precioVendido}
                  onChange={(e) => setPrecioVendido(e.target.value)}
                  placeholder={productoSeleccionado ? `${productoSeleccionado.precio_venta}` : "0.00"}
                  className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-muted uppercase tracking-wider mb-1">Canal</label>
                <select
                  value={canal}
                  onChange={(e) => setCanal(e.target.value as "whatsapp" | "presencial")}
                  className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-primary"
                >
                  <option value="whatsapp">WhatsApp</option>
                  <option value="presencial">Presencial</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-muted uppercase tracking-wider mb-1">Fecha</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-primary"
                  required
                />
              </div>

              {error && <p className="text-danger text-sm">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setOpen(false); reset() }}
                  className="flex-1 px-4 py-2 border border-border text-white text-sm rounded-md hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-4 py-2 bg-gold-primary text-black text-sm font-semibold rounded-md hover:bg-gold-primary/90 transition-colors disabled:opacity-50"
                >
                  {isPending ? "Guardando..." : "Guardar venta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 3: Crear la página principal del dashboard**

Crear `app/admin/ventas-offline/page.tsx`:

```typescript
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Topbar } from "@/components/admin/topbar"
import { Card, CardBody } from "@/components/ui/card"
import { VentaOfflineModal } from "@/components/admin/VentaOfflineModal"
import { formatUSD } from "@/lib/utils"
import { Package, TrendingUp, DollarSign, BarChart2 } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function VentasOfflinePage() {
  const supabase = await createSupabaseServerClient()

  const [productosRes, ventasRes] = await Promise.all([
    supabase
      .from("productos")
      .select("id, nombre, precio_venta, costo_temu, costo_envio_unitario, stock_unidades, modo")
      .eq("estado", "publicado")
      .order("nombre"),
    supabase
      .from("ventas_offline")
      .select("id, cantidad, precio_vendido, costo_snapshot, canal, fecha, producto_id, productos(nombre)")
      .order("fecha", { ascending: false })
      .limit(50),
  ])

  const productos = productosRes.data ?? []
  const ventas = (ventasRes.data ?? []) as {
    id: string
    cantidad: number
    precio_vendido: number
    costo_snapshot: number
    canal: string
    fecha: string
    producto_id: string | null
    productos: { nombre: string } | null
  }[]

  // Métricas de inventario
  const inversionTotal = productos.reduce((acc, p) => {
    const costo = (Number(p.costo_temu) + Number(p.costo_envio_unitario)) * (p.stock_unidades ?? 0)
    return acc + costo
  }, 0)

  const gananciaPotencial = productos.reduce((acc, p) => {
    const costo = Number(p.costo_temu) + Number(p.costo_envio_unitario)
    const margen = Number(p.precio_venta) - costo
    return acc + margen * (p.stock_unidades ?? 0)
  }, 0)

  const gananciaRealOffline = ventas.reduce((acc, v) => {
    return acc + (Number(v.precio_vendido) - Number(v.costo_snapshot)) * v.cantidad
  }, 0)

  const totalUnidades = productos.reduce((acc, p) => acc + (p.stock_unidades ?? 0), 0)

  // Tabla de productos con margen
  const productosConMargen = productos
    .map((p) => {
      const costo = Number(p.costo_temu) + Number(p.costo_envio_unitario)
      const margen = Number(p.precio_venta) - costo
      const stock = p.stock_unidades ?? 0
      return { ...p, costo, margen, gananciaPotencial: margen * stock }
    })
    .sort((a, b) => b.gananciaPotencial - a.gananciaPotencial)

  return (
    <div className="space-y-8">
      <Topbar
        title="Ventas Offline & Profit"
        subtitle="Inventario, márgenes y ventas por WhatsApp o presencial"
        actions={<VentaOfflineModal productos={productos} />}
      />

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardBody className="space-y-2">
            <div className="flex items-center gap-2 text-muted text-xs uppercase tracking-wider">
              <DollarSign size={14} />
              Inversión en inventario
            </div>
            <div className="font-serif text-3xl text-gold-primary">{formatUSD(inversionTotal)}</div>
            <p className="text-muted text-xs">Lo que tienes invertido en stock actual</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-2">
            <div className="flex items-center gap-2 text-muted text-xs uppercase tracking-wider">
              <TrendingUp size={14} />
              Ganancia potencial
            </div>
            <div className="font-serif text-3xl text-gold-primary">{formatUSD(gananciaPotencial)}</div>
            <p className="text-muted text-xs">Si vendes todo el stock actual</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-2">
            <div className="flex items-center gap-2 text-muted text-xs uppercase tracking-wider">
              <BarChart2 size={14} />
              Ganancia real offline
            </div>
            <div className="font-serif text-3xl text-gold-primary">{formatUSD(gananciaRealOffline)}</div>
            <p className="text-muted text-xs">De ventas por WhatsApp y presencial</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-2">
            <div className="flex items-center gap-2 text-muted text-xs uppercase tracking-wider">
              <Package size={14} />
              Unidades en stock
            </div>
            <div className="font-serif text-3xl text-gold-primary">{totalUnidades}</div>
            <p className="text-muted text-xs">Total de unidades disponibles</p>
          </CardBody>
        </Card>
      </div>

      {/* Tabla de productos con márgenes */}
      <section className="space-y-3">
        <h2 className="eyebrow">Margen por producto</h2>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted text-xs uppercase tracking-wider">
                <tr className="border-b border-border">
                  <th className="text-left p-3">Producto</th>
                  <th className="text-right p-3">Costo</th>
                  <th className="text-right p-3">Precio venta</th>
                  <th className="text-right p-3">Margen/und</th>
                  <th className="text-right p-3">Stock</th>
                  <th className="text-right p-3">Ganancia potencial</th>
                </tr>
              </thead>
              <tbody>
                {productosConMargen.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="p-3 text-white">{p.nombre}</td>
                    <td className="p-3 text-right text-muted">{formatUSD(p.costo)}</td>
                    <td className="p-3 text-right text-white">{formatUSD(p.precio_venta)}</td>
                    <td className="p-3 text-right">
                      <span className={p.margen >= 0 ? "text-success" : "text-danger"}>
                        {formatUSD(p.margen)}
                      </span>
                    </td>
                    <td className="p-3 text-right text-white">{p.stock_unidades ?? "—"}</td>
                    <td className="p-3 text-right font-serif text-gold-primary">{formatUSD(p.gananciaPotencial)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* Historial de ventas offline */}
      <section className="space-y-3">
        <h2 className="eyebrow">Ventas offline recientes</h2>
        {ventas.length === 0 ? (
          <Card>
            <CardBody className="text-center py-8 text-muted">
              Aún no hay ventas offline registradas. Usa el botón "Registrar venta" para agregar una.
            </CardBody>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted text-xs uppercase tracking-wider">
                  <tr className="border-b border-border">
                    <th className="text-left p-3">Producto</th>
                    <th className="text-right p-3">Cant.</th>
                    <th className="text-right p-3">Precio vendido</th>
                    <th className="text-right p-3">Ganancia</th>
                    <th className="text-left p-3">Canal</th>
                    <th className="text-left p-3">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.map((v) => {
                    const ganancia = (Number(v.precio_vendido) - Number(v.costo_snapshot)) * v.cantidad
                    return (
                      <tr key={v.id} className="border-b border-border last:border-0">
                        <td className="p-3 text-white">{v.productos?.nombre ?? "Producto eliminado"}</td>
                        <td className="p-3 text-right text-white">{v.cantidad}</td>
                        <td className="p-3 text-right text-white">{formatUSD(Number(v.precio_vendido) * v.cantidad)}</td>
                        <td className="p-3 text-right font-serif text-gold-primary">{formatUSD(ganancia)}</td>
                        <td className="p-3">
                          <span className="text-xs text-muted capitalize">{v.canal}</span>
                        </td>
                        <td className="p-3 text-muted text-xs">{v.fecha}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Verificar TypeScript**

```powershell
npx tsc --noEmit
```

Si hay error en `Topbar` por el prop `actions`, revisar la interfaz de `Topbar` en `components/admin/topbar.tsx` y agregar `actions?: React.ReactNode` si no existe.

- [ ] **Step 5: Commit**

```powershell
git add app/admin/ventas-offline/ components/admin/VentaOfflineModal.tsx
git commit -m "feat(admin): pagina ventas offline con profit de inventario y modal de registro"
```

---

## Task 5: Agregar enlace en el sidebar del admin

**Files:**
- Modify: `components/admin/sidebar.tsx`

- [ ] **Step 1: Agregar import de ícono y nuevo item en el sidebar**

En `components/admin/sidebar.tsx`, agregar `ShoppingCart` a los imports de lucide-react:

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
} from "lucide-react"
```

En el array `groups`, dentro del grupo `"Ventas"`, agregar el item después de `"Reportes"`:

```typescript
{
  title: "Ventas",
  items: [
    { label: "Pedidos", href: "/admin/pedidos", icon: ShoppingBag },
    { label: "Próximo pedido", href: "/admin/proximo-pedido", icon: Truck },
    { label: "Reportes", href: "/admin/reportes", icon: TrendingUp },
    { label: "Ventas Offline", href: "/admin/ventas-offline", icon: ShoppingCart },
  ],
},
```

- [ ] **Step 2: Verificar en el navegador**

Abrir `/admin` y confirmar que aparece "Ventas Offline" en el sidebar bajo el grupo Ventas. Hacer click y verificar que carga la página con las tarjetas de métricas.

- [ ] **Step 3: Commit**

```powershell
git add components/admin/sidebar.tsx
git commit -m "feat(admin): agregar Ventas Offline al sidebar"
```

---

## Task 6: Contenido de páginas legales

**Acción:** Llenar los tres campos de texto en la tabla `configuracion` (fila `id = 1`) usando Supabase MCP.

- [ ] **Step 1: Llenar `politica_privacidad`**

Usar `mcp__supabase__execute_sql` con el proyecto `ackefqrcejicepksrwiz`:

```sql
UPDATE configuracion SET politica_privacidad = 'Klassik Store recopila únicamente la información necesaria para procesar tus pedidos: nombre, número de teléfono y comprobante de pago. Esta información se usa exclusivamente para coordinar la entrega de tu pedido y nunca es vendida, cedida ni compartida con terceros.

Tus datos son tratados con total confidencialidad. Si deseas que eliminemos tu información de nuestros registros, puedes solicitarlo en cualquier momento a través de nuestro WhatsApp.

Al realizar una compra en Klassik Store, aceptas esta política de privacidad.' WHERE id = 1;
```

- [ ] **Step 2: Llenar `terminos_condiciones`**

```sql
UPDATE configuracion SET terminos_condiciones = '## 1. Precios
Todos los precios están expresados en dólares americanos (USD) y pueden estar sujetos a cambios sin previo aviso. El precio válido es el que aparece al momento de confirmar tu pedido.

## 2. Formas de pago
Aceptamos Yappy, transferencia bancaria y pago en efectivo presencial (disponible en Penonomé y estaciones del metro en Ciudad de Panamá).

## 3. Pre-órdenes
Los productos en modalidad pre-orden requieren un anticipo del 50% para reservar el artículo. Este anticipo no es reembolsable si el cliente cancela el pedido una vez confirmada la reserva.

## 4. Tiempos de entrega
Los tiempos varían según disponibilidad y modalidad del pedido. Los productos en stock tienen tiempos de entrega menores a los de pre-orden. Klassik Store no se hace responsable por retrasos causados por factores externos.

## 5. Responsabilidad
Klassik Store es responsable únicamente por los productos vendidos directamente a través de sus canales oficiales. Nos comprometemos a ofrecer productos en buen estado y conforme a lo descrito en el catálogo.' WHERE id = 1;
```

- [ ] **Step 3: Llenar `politica_devoluciones`**

```sql
UPDATE configuracion SET politica_devoluciones = 'Aceptamos devoluciones dentro de las **48 horas** siguientes a la recepción del pedido, únicamente en los siguientes casos:

- El producto presenta un defecto visible o daño de fábrica
- El artículo recibido no corresponde al pedido confirmado

Para iniciar una devolución, el cliente debe documentar el problema con fotografías y contactarnos a través de nuestro WhatsApp dentro del plazo indicado.

No se aceptan devoluciones por cambio de opinión ni por tallas o características incorrectas seleccionadas por el cliente al momento de hacer el pedido.

El proceso de devolución o cambio se coordina directamente con nuestro equipo.' WHERE id = 1;
```

- [ ] **Step 4: Verificar en la web**

Abrir `/politicas` en el navegador y confirmar que las tres secciones (Privacidad, Términos, Devoluciones) muestran el texto correctamente renderizado.

---

## Task 7: Actualizar página "Cómo comprar"

**Files:**
- Modify: `app/(public)/como-comprar/page.tsx`

- [ ] **Step 1: Reemplazar el contenido de la página**

Reemplazar el archivo completo `app/(public)/como-comprar/page.tsx`:

```typescript
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
            Explora nuestras colecciones. Cada producto indica si está disponible para{" "}
            <strong>entrega inmediata</strong> o si es una <strong>pre-orden</strong> con fecha estimada de llegada.
          </p>
        </div>

        <div>
          <h2 className="font-serif text-2xl text-gold-primary mb-3">2. Agrega al carrito</h2>
          <p className="text-white/80 leading-relaxed">
            Selecciona variantes (color, talla, modelo) si aplica y agrega al carrito. Puedes revisar tu pedido en
            cualquier momento desde el ícono del carrito.
          </p>
        </div>

        <div>
          <h2 className="font-serif text-2xl text-gold-primary mb-3">3. Elige cómo pagar</h2>
          <p className="text-white/80 leading-relaxed mb-6">
            Tenemos varias opciones para que pagues como más te convenga:
          </p>
          <div className="space-y-4">
            <div className="bg-black-surface border border-border rounded-md p-5">
              <h3 className="text-white font-semibold mb-1">Pago completo online</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Paga el 100% por Yappy{config?.yappy_numero ? ` (${config.yappy_numero})` : ""} o transferencia bancaria
                y sube tu comprobante directamente en la web. Tu pedido queda confirmado de inmediato.
              </p>
            </div>
            <div className="bg-black-surface border border-border rounded-md p-5">
              <h3 className="text-white font-semibold mb-1">Mitad ahora, mitad en la entrega</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Paga el 50% por Yappy o transferencia y sube el comprobante. Cancelas el resto en efectivo cuando
                recibes tu pedido.
              </p>
            </div>
            <div className="bg-black-surface border border-border rounded-md p-5">
              <h3 className="text-white font-semibold mb-1">Pago presencial</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Si estás en Penonomé o en una estación del metro en Ciudad de Panamá, puedes coordinar y pagar en
                efectivo al momento de la entrega.
              </p>
            </div>
          </div>
          <p className="text-muted text-xs mt-4">
            También puedes escribirnos por WhatsApp si prefieres coordinar directamente.
          </p>
        </div>

        {config?.mensaje_preorden && (
          <div className="bg-black-surface border border-border rounded-md p-6">
            <h2 className="font-serif text-xl text-gold-primary mb-2">Pre-órdenes</h2>
            <p className="text-white/80 mb-3">{config.mensaje_preorden}</p>
            <p className="text-white/70 text-sm leading-relaxed">
              Para separar un producto en pre-orden se requiere el <strong>50% de anticipo</strong> por Yappy o
              transferencia bancaria. Sube el comprobante en la web para confirmar tu reserva.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verificar en el navegador**

Abrir `/como-comprar` y confirmar que el paso 3 muestra las tres opciones de pago en tarjetas separadas, y que el footer de WhatsApp aparece como alternativa.

- [ ] **Step 3: Commit y push**

```powershell
git add app/(public)/como-comprar/page.tsx
git commit -m "feat(como-comprar): actualizar flujo de pago con opciones online, mixto y presencial"
git push origin main
```

---

## Verificación final

Después de completar todos los tasks, verificar:

- [ ] `/favoritos` carga productos guardados y el header muestra contador
- [ ] `/admin/ventas-offline` muestra métricas de inventario y tabla de márgenes
- [ ] El modal de "Registrar venta" guarda la venta y descuenta el stock
- [ ] `/politicas` muestra los tres textos legales completos
- [ ] `/como-comprar` muestra el paso 3 con las tres opciones de pago
