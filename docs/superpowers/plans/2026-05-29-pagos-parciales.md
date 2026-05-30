# Pagos Parciales (Cuotas) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar seguimiento de pagos parciales a ventas offline y pedidos web, mostrando saldo pendiente, historial de cobros y ganancia real proporcional a lo cobrado.

**Architecture:** Nueva tabla `pagos_parciales` con FK nullable a `ventas_offline` o `pedidos`. Componentes compartidos `PagoParcialModal` y `PagosPanel` (puros UI). `VentasOfflineHistorial` (client component) maneja expansión de filas y llama directamente a sus server actions. El detalle de pedido importa su propio set de server actions.

**Tech Stack:** Next.js 14 App Router, Supabase, TypeScript, Tailwind CSS, Lucide React, Server Actions

---

## Mapa de archivos

| Acción | Ruta | Responsabilidad |
|---|---|---|
| Crear | `supabase/migrations/20260529010000_pagos_parciales.sql` | Tabla + índices + RLS |
| Crear | `app/admin/ventas-offline/pagos-actions.ts` | agregar/eliminar pago para ventas offline |
| Crear | `app/admin/pedidos/[id]/pagos-actions.ts` | agregar/eliminar pago para pedidos |
| Crear | `components/admin/PagoParcialModal.tsx` | Modal UI puro (sin conocer el contexto) |
| Crear | `components/admin/PagosPanel.tsx` | Panel historial + resumen + botón agregar |
| Crear | `components/admin/VentasOfflineHistorial.tsx` | Tabla expandible client component |
| Modificar | `app/admin/ventas-offline/page.tsx` | Incluir pagos en query, recalcular ganancia, usar VentasOfflineHistorial |
| Modificar | `app/admin/pedidos/[id]/page.tsx` | Incluir pagos en query, reemplazar sección Pago con PagosPanel |

---

## Task 1: Migración — tabla pagos_parciales

**Files:**
- Create: `supabase/migrations/20260529010000_pagos_parciales.sql`

- [ ] **Step 1: Crear el archivo de migración**

Crear `supabase/migrations/20260529010000_pagos_parciales.sql`:

```sql
CREATE TABLE pagos_parciales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_offline_id UUID REFERENCES ventas_offline(id) ON DELETE CASCADE,
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  monto NUMERIC NOT NULL CHECK (monto > 0),
  fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  nota TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT pagos_parciales_fuente CHECK (
    (venta_offline_id IS NOT NULL AND pedido_id IS NULL) OR
    (venta_offline_id IS NULL AND pedido_id IS NOT NULL)
  )
);

CREATE INDEX idx_pagos_parciales_venta ON pagos_parciales(venta_offline_id);
CREATE INDEX idx_pagos_parciales_pedido ON pagos_parciales(pedido_id);
CREATE INDEX idx_pagos_parciales_fecha ON pagos_parciales(fecha_pago DESC);

ALTER TABLE pagos_parciales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pagos_parciales_auth_only" ON pagos_parciales
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

- [ ] **Step 2: Aplicar la migración en Supabase**

**IMPORTANTE:** El MCP de Supabase en este proyecto está conectado al proyecto de terrenos, NO al de Klassik Store. El usuario debe ejecutar este SQL manualmente en el [SQL Editor de Supabase de Klassik](https://supabase.com/dashboard/project/ackefqrcejicepksrwiz/sql/new).

- [ ] **Step 3: Commit**

```powershell
git add supabase/migrations/20260529010000_pagos_parciales.sql
git commit -m "feat(db): tabla pagos_parciales para cuotas en ventas offline y pedidos"
```

---

## Task 2: Server actions — ventas offline

**Files:**
- Create: `app/admin/ventas-offline/pagos-actions.ts`

- [ ] **Step 1: Crear el archivo**

Crear `app/admin/ventas-offline/pagos-actions.ts`:

```typescript
"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function agregarPagoVentaOffline(data: {
  venta_offline_id: string
  monto: number
  fecha_pago: string
  fecha_vencimiento?: string | null
  nota?: string | null
}) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autorizado")

  const { error } = await (supabase as any).from("pagos_parciales").insert({
    venta_offline_id: data.venta_offline_id,
    monto: data.monto,
    fecha_pago: data.fecha_pago,
    fecha_vencimiento: data.fecha_vencimiento ?? null,
    nota: data.nota ?? null,
  })
  if (error) throw new Error(error.message)
  revalidatePath("/admin/ventas-offline")
}

export async function eliminarPagoVentaOffline(id: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autorizado")

  const { error } = await (supabase as any).from("pagos_parciales").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/admin/ventas-offline")
}
```

- [ ] **Step 2: Verificar TypeScript**

```powershell
npx tsc --noEmit
```

Sin errores nuevos.

- [ ] **Step 3: Commit**

```powershell
git add app/admin/ventas-offline/pagos-actions.ts
git commit -m "feat(ventas-offline): server actions para agregar/eliminar pagos parciales"
```

---

## Task 3: Server actions — pedidos

**Files:**
- Create: `app/admin/pedidos/[id]/pagos-actions.ts`

- [ ] **Step 1: Crear el archivo**

Crear `app/admin/pedidos/[id]/pagos-actions.ts`:

```typescript
"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function agregarPagoPedido(data: {
  pedido_id: string
  monto: number
  fecha_pago: string
  fecha_vencimiento?: string | null
  nota?: string | null
}) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autorizado")

  const { error } = await (supabase as any).from("pagos_parciales").insert({
    pedido_id: data.pedido_id,
    monto: data.monto,
    fecha_pago: data.fecha_pago,
    fecha_vencimiento: data.fecha_vencimiento ?? null,
    nota: data.nota ?? null,
  })
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/pedidos/${data.pedido_id}`)
}

export async function eliminarPagoPedido(id: string, pedido_id: string) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autorizado")

  const { error } = await (supabase as any).from("pagos_parciales").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath(`/admin/pedidos/${pedido_id}`)
}
```

- [ ] **Step 2: Verificar TypeScript**

```powershell
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```powershell
git add "app/admin/pedidos/[id]/pagos-actions.ts"
git commit -m "feat(pedidos): server actions para agregar/eliminar pagos parciales"
```

---

## Task 4: Componentes compartidos — PagoParcialModal y PagosPanel

**Files:**
- Create: `components/admin/PagoParcialModal.tsx`
- Create: `components/admin/PagosPanel.tsx`

- [ ] **Step 1: Crear PagoParcialModal**

Crear `components/admin/PagoParcialModal.tsx`:

```typescript
"use client"

import { useState } from "react"
import { X } from "lucide-react"

interface PagoFormData {
  monto: number
  fecha_pago: string
  fecha_vencimiento?: string
  nota?: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSubmit: (data: PagoFormData) => void
  isPending: boolean
  saldoPendiente: number
}

export function PagoParcialModal({ open, onClose, onSubmit, isPending, saldoPendiente }: Props) {
  const [monto, setMonto] = useState("")
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split("T")[0])
  const [fechaVencimiento, setFechaVencimiento] = useState("")
  const [nota, setNota] = useState("")
  const [error, setError] = useState("")

  function reset() {
    setMonto("")
    setFechaPago(new Date().toISOString().split("T")[0])
    setFechaVencimiento("")
    setNota("")
    setError("")
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    const montoNum = Number(monto)
    if (!monto || isNaN(montoNum) || montoNum <= 0) {
      setError("Ingresa un monto mayor a $0.")
      return
    }
    if (montoNum > saldoPendiente + 0.01) {
      setError(`El monto no puede superar el saldo pendiente (${saldoPendiente.toFixed(2)}).`)
      return
    }
    onSubmit({
      monto: montoNum,
      fecha_pago: fechaPago,
      fecha_vencimiento: fechaVencimiento || undefined,
      nota: nota || undefined,
    })
    reset()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-black-surface border border-border rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-xl text-white">Registrar pago</h2>
          <button onClick={handleClose} className="text-muted hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-black rounded-md p-3 text-xs flex justify-between">
            <span className="text-muted">Saldo pendiente</span>
            <span className="text-gold-primary font-serif">${saldoPendiente.toFixed(2)}</span>
          </div>

          <div>
            <label className="block text-xs text-muted uppercase tracking-wider mb-1">Monto pagado (USD)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0.00"
              className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-muted uppercase tracking-wider mb-1">Fecha de pago</label>
            <input
              type="date"
              value={fechaPago}
              onChange={(e) => setFechaPago(e.target.value)}
              className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-primary"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-muted uppercase tracking-wider mb-1">
              Fecha límite <span className="text-muted normal-case">(opcional)</span>
            </label>
            <input
              type="date"
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-primary"
            />
          </div>

          <div>
            <label className="block text-xs text-muted uppercase tracking-wider mb-1">
              Nota <span className="text-muted normal-case">(opcional)</span>
            </label>
            <input
              type="text"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Yappy, transferencia, efectivo..."
              className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-primary"
            />
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-border text-white text-sm rounded-md hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2 bg-gold-primary text-black text-sm font-semibold rounded-md hover:bg-gold-primary/90 transition-colors disabled:opacity-50"
            >
              {isPending ? "Guardando..." : "Guardar pago"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Crear PagosPanel**

Crear `components/admin/PagosPanel.tsx`:

```typescript
"use client"

import { useState, useTransition } from "react"
import { Plus, Trash2 } from "lucide-react"
import { PagoParcialModal } from "@/components/admin/PagoParcialModal"
import { formatUSD } from "@/lib/utils"

export interface PagoParcial {
  id: string
  monto: number
  fecha_pago: string
  fecha_vencimiento?: string | null
  nota?: string | null
}

interface PagoFormData {
  monto: number
  fecha_pago: string
  fecha_vencimiento?: string
  nota?: string
}

interface Props {
  total: number
  pagos: PagoParcial[]
  onAgregarPago: (data: PagoFormData) => Promise<void>
  onEliminarPago: (id: string) => Promise<void>
}

export function PagosPanel({ total, pagos, onAgregarPago, onEliminarPago }: Props) {
  const [modalOpen, setModalOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState("")

  const cobrado = pagos.reduce((acc, p) => acc + Number(p.monto), 0)
  const saldoPendiente = Math.max(0, total - cobrado)
  const pct = total > 0 ? Math.min((cobrado / total) * 100, 100) : 0
  const pagado = saldoPendiente <= 0.01

  function handleAgregar(data: PagoFormData) {
    setErrorMsg("")
    startTransition(async () => {
      try {
        await onAgregarPago(data)
        setModalOpen(false)
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Error al guardar el pago.")
      }
    })
  }

  function handleEliminar(id: string) {
    startTransition(async () => {
      try {
        await onEliminarPago(id)
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Error al eliminar el pago.")
      }
    })
  }

  return (
    <div className="space-y-4 pt-2">
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="bg-black rounded-md p-3 space-y-1">
          <div className="text-muted uppercase tracking-wider">Total</div>
          <div className="font-serif text-gold-primary">{formatUSD(total)}</div>
        </div>
        <div className="bg-black rounded-md p-3 space-y-1">
          <div className="text-muted uppercase tracking-wider">Cobrado</div>
          <div className={`font-serif ${pagado ? "text-success" : "text-white"}`}>{formatUSD(cobrado)}</div>
        </div>
        <div className="bg-black rounded-md p-3 space-y-1">
          <div className="text-muted uppercase tracking-wider">Pendiente</div>
          <div className={`font-serif ${pagado ? "text-success" : "text-danger"}`}>
            {pagado ? "Pagado ✓" : formatUSD(saldoPendiente)}
          </div>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="h-1.5 bg-black rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pagado ? "bg-success" : "bg-gold-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Historial de pagos */}
      {pagos.length > 0 && (
        <table className="w-full text-xs">
          <thead className="text-muted uppercase tracking-wider">
            <tr className="border-b border-border">
              <th className="text-left py-1.5">Fecha pago</th>
              <th className="text-right py-1.5">Monto</th>
              <th className="text-left py-1.5 pl-3">Vence</th>
              <th className="text-left py-1.5 pl-3">Nota</th>
              <th className="py-1.5" />
            </tr>
          </thead>
          <tbody>
            {pagos.map((p) => (
              <tr key={p.id} className="border-b border-border/50 last:border-0">
                <td className="py-1.5 text-white">{p.fecha_pago}</td>
                <td className="py-1.5 text-right font-serif text-gold-primary">{formatUSD(Number(p.monto))}</td>
                <td className="py-1.5 pl-3 text-muted">{p.fecha_vencimiento ?? "—"}</td>
                <td className="py-1.5 pl-3 text-muted max-w-[120px] truncate">{p.nota ?? "—"}</td>
                <td className="py-1.5 text-right">
                  <button
                    onClick={() => handleEliminar(p.id)}
                    disabled={isPending}
                    className="text-danger/50 hover:text-danger transition-colors disabled:opacity-30"
                  >
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {errorMsg && <p className="text-danger text-xs">{errorMsg}</p>}

      {/* Botón agregar */}
      {!pagado && (
        <button
          onClick={() => setModalOpen(true)}
          disabled={isPending}
          className="flex items-center gap-1.5 text-xs text-gold-primary hover:text-gold-primary/80 transition-colors disabled:opacity-50"
        >
          <Plus size={12} />
          Agregar pago
        </button>
      )}

      <PagoParcialModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAgregar}
        isPending={isPending}
        saldoPendiente={saldoPendiente}
      />
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
git add components/admin/PagoParcialModal.tsx components/admin/PagosPanel.tsx
git commit -m "feat(admin): componentes PagoParcialModal y PagosPanel reutilizables"
```

---

## Task 5: VentasOfflineHistorial + actualizar ventas page

**Files:**
- Create: `components/admin/VentasOfflineHistorial.tsx`
- Modify: `app/admin/ventas-offline/page.tsx`

- [ ] **Step 1: Crear VentasOfflineHistorial**

Crear `components/admin/VentasOfflineHistorial.tsx`:

```typescript
"use client"

import React, { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { PagosPanel, type PagoParcial } from "@/components/admin/PagosPanel"
import { agregarPagoVentaOffline, eliminarPagoVentaOffline } from "@/app/admin/ventas-offline/pagos-actions"
import { formatUSD } from "@/lib/utils"

interface VentaConPagos {
  id: string
  cantidad: number
  precio_vendido: number
  costo_snapshot: number
  canal: string
  fecha: string
  producto_id: string | null
  productos: { nombre: string } | null
  pagos_parciales: PagoParcial[]
}

interface Props {
  ventas: VentaConPagos[]
}

export function VentasOfflineHistorial({ ventas }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (ventas.length === 0) {
    return (
      <Card>
        <div className="text-center py-8 text-muted text-sm px-4">
          Aún no hay ventas offline registradas. Usa el botón &quot;Registrar venta&quot; para agregar una.
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted text-xs uppercase tracking-wider">
            <tr className="border-b border-border">
              <th className="text-left p-3 w-6" />
              <th className="text-left p-3">Producto</th>
              <th className="text-right p-3">Cant.</th>
              <th className="text-right p-3">Total venta</th>
              <th className="text-right p-3">Cobrado</th>
              <th className="text-left p-3">Canal</th>
              <th className="text-left p-3">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {ventas.map((v) => {
              const totalVenta = Number(v.precio_vendido) * v.cantidad
              const cobrado = v.pagos_parciales.reduce((acc, p) => acc + Number(p.monto), 0)
              const saldo = Math.max(0, totalVenta - cobrado)
              const pagado = saldo <= 0.01
              const isExpanded = expandedId === v.id

              return (
                <React.Fragment key={v.id}>
                  <tr
                    className="border-b border-border cursor-pointer hover:bg-white/5 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : v.id)}
                  >
                    <td className="p-3 text-muted">
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </td>
                    <td className="p-3 text-white">{v.productos?.nombre ?? "Producto eliminado"}</td>
                    <td className="p-3 text-right text-white">{v.cantidad}</td>
                    <td className="p-3 text-right text-white">{formatUSD(totalVenta)}</td>
                    <td className="p-3 text-right">
                      <span className={pagado ? "text-success font-semibold" : "text-gold-primary"}>
                        {formatUSD(cobrado)}
                        {pagado && " ✓"}
                      </span>
                      {!pagado && (
                        <div className="text-danger text-xs">−{formatUSD(saldo)}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="text-xs text-muted capitalize">{v.canal}</span>
                    </td>
                    <td className="p-3 text-muted text-xs">{v.fecha}</td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-b border-border bg-black/40">
                      <td colSpan={7} className="px-6 pb-4">
                        <PagosPanel
                          total={totalVenta}
                          pagos={v.pagos_parciales}
                          onAgregarPago={(data) =>
                            agregarPagoVentaOffline({ ...data, venta_offline_id: v.id })
                          }
                          onEliminarPago={(id) => eliminarPagoVentaOffline(id)}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
```

- [ ] **Step 2: Actualizar `app/admin/ventas-offline/page.tsx`**

Reemplazar el archivo completo con:

```typescript
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Topbar } from "@/components/admin/topbar"
import { Card, CardBody } from "@/components/ui/card"
import { VentaOfflineModal } from "@/components/admin/VentaOfflineModal"
import { VentasOfflineHistorial } from "@/components/admin/VentasOfflineHistorial"
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from("ventas_offline")
      .select("id, cantidad, precio_vendido, costo_snapshot, canal, fecha, producto_id, productos(nombre), pagos_parciales(id, monto, fecha_pago, fecha_vencimiento, nota)")
      .order("fecha", { ascending: false })
      .limit(50),
  ])

  const productos = productosRes.data ?? []
  const ventas = ((ventasRes.data ?? []) as unknown) as {
    id: string
    cantidad: number
    precio_vendido: number
    costo_snapshot: number
    canal: string
    fecha: string
    producto_id: string | null
    productos: { nombre: string } | null
    pagos_parciales: { id: string; monto: number; fecha_pago: string; fecha_vencimiento?: string | null; nota?: string | null }[]
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

  // Ganancia real = proporcional a lo cobrado (no a lo vendido)
  const gananciaRealOffline = ventas.reduce((acc, v) => {
    const precioUnitario = Number(v.precio_vendido)
    if (precioUnitario === 0) return acc
    const cobrado = (v.pagos_parciales ?? []).reduce((s, p) => s + Number(p.monto), 0)
    const margenPct = (precioUnitario - Number(v.costo_snapshot)) / precioUnitario
    return acc + cobrado * margenPct
  }, 0)

  const totalUnidades = productos.reduce((acc, p) => acc + (p.stock_unidades ?? 0), 0)

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
              Ganancia real cobrada
            </div>
            <div className="font-serif text-3xl text-gold-primary">{formatUSD(gananciaRealOffline)}</div>
            <p className="text-muted text-xs">Solo de lo efectivamente cobrado</p>
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

      {/* Historial de ventas offline con pagos */}
      <section className="space-y-3">
        <h2 className="eyebrow">Ventas offline <span className="text-muted text-xs normal-case font-normal">(últimas 50 · click para ver pagos)</span></h2>
        <VentasOfflineHistorial ventas={ventas} />
      </section>
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
git add components/admin/VentasOfflineHistorial.tsx app/admin/ventas-offline/page.tsx
git commit -m "feat(ventas-offline): historial expandible con pagos parciales por venta"
```

---

## Task 6: Actualizar página detalle de pedido

**Files:**
- Modify: `app/admin/pedidos/[id]/page.tsx`

- [ ] **Step 1: Agregar pagos_parciales al query del pedido**

En `app/admin/pedidos/[id]/page.tsx`, localizar la query del pedido (línea ~67):

```typescript
const [{ data: pedido }, { data: items }] = await Promise.all([
  supabase.from("pedidos").select("*").eq("id", id).single(),
  supabase
    .from("pedido_items")
    ...
])
```

Reemplazar con:

```typescript
const [pedidoRes, itemsRes, pagosRes] = await Promise.all([
  supabase.from("pedidos").select("*").eq("id", id).single(),
  supabase
    .from("pedido_items")
    .select("id, producto_id, variante_id, nombre_snapshot, precio_snapshot, cantidad, modo")
    .eq("pedido_id", id),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (supabase as any)
    .from("pagos_parciales")
    .select("id, monto, fecha_pago, fecha_vencimiento, nota")
    .eq("pedido_id", id)
    .order("fecha_pago", { ascending: true }),
])

const { data: pedido } = pedidoRes
const { data: items } = itemsRes
const pagosParciales = ((pagosRes.data ?? []) as unknown) as {
  id: string
  monto: number
  fecha_pago: string
  fecha_vencimiento?: string | null
  nota?: string | null
}[]
```

- [ ] **Step 2: Agregar imports necesarios**

Al inicio del archivo, añadir estos imports (después de los existentes):

```typescript
import { PagosPanel } from "@/components/admin/PagosPanel"
import { agregarPagoPedido, eliminarPagoPedido } from "./pagos-actions"
```

- [ ] **Step 3: Reemplazar la sección de Pago**

Localizar el `<Card>` que comienza con `<CardHeader><h2>Pago</h2>` (línea ~221) y reemplazarlo completamente:

```typescript
<Card>
  <CardHeader>
    <h2 className="font-serif text-lg text-white">Pago</h2>
  </CardHeader>
  <CardBody className="space-y-3 text-sm">
    <div className="flex justify-between gap-4">
      <span className="text-muted">Método</span>
      <span className="text-white text-right">
        {pedido.metodo_pago
          ? METODO_LABEL[pedido.metodo_pago] ?? pedido.metodo_pago
          : "—"}
      </span>
    </div>
    {(pedido.comprobante_inicial_url || pedido.comprobante_final_url) && (
      <div className="space-y-2 pb-3 border-b border-border">
        <span className="text-muted text-xs uppercase tracking-wider">Comprobantes</span>
        {pedido.comprobante_inicial_url && (
          <a
            href={pedido.comprobante_inicial_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-gold-primary hover:underline text-sm"
          >
            <ExternalLink size={14} /> Comprobante inicial
          </a>
        )}
        {pedido.comprobante_final_url && (
          <a
            href={pedido.comprobante_final_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-gold-primary hover:underline text-sm"
          >
            <ExternalLink size={14} /> Comprobante final
          </a>
        )}
      </div>
    )}
    <PagosPanel
      total={Number(pedido.total)}
      pagos={pagosParciales}
      onAgregarPago={(data) => agregarPagoPedido({ ...data, pedido_id: pedido.id })}
      onEliminarPago={(pagoId) => eliminarPagoPedido(pagoId, pedido.id)}
    />
  </CardBody>
</Card>
```

- [ ] **Step 4: Verificar TypeScript**

```powershell
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```powershell
git add "app/admin/pedidos/[id]/page.tsx"
git commit -m "feat(pedidos): agregar seguimiento de pagos parciales en detalle de pedido"
```

---

## Verificación final

- [ ] `/admin/ventas-offline` — hacer click en una fila, verificar que se expande el panel de pagos con el resumen y la barra de progreso
- [ ] Agregar un pago en una venta offline — verificar que aparece en el historial y la tarjeta "Ganancia real cobrada" se actualiza
- [ ] `/admin/pedidos/[id]` — verificar que la sección Pago muestra el PagosPanel con resumen y botón agregar
- [ ] Agregar un pago en un pedido — verificar que se guarda y el saldo se actualiza
- [ ] Push a main: `git push origin main`
