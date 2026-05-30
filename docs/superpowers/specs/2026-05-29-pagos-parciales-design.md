# Diseño: Sistema de Pagos Parciales (Cuotas)

**Fecha:** 2026-05-29  
**Estado:** Aprobado por el usuario

---

## Resumen

Sistema de seguimiento de pagos parciales para ventas offline y pedidos web. Permite registrar múltiples cobros contra una misma venta u orden, con montos libres o fecha de vencimiento opcional. La ganancia real se calcula únicamente sobre lo ya cobrado.

---

## Sección 1: Base de datos

### Nueva tabla `pagos_parciales`

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

ALTER TABLE pagos_parciales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pagos_parciales_auth_only" ON pagos_parciales
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

### Cálculo de saldo
- **Total vendido:** `ventas_offline.precio_vendido` o `pedidos.total`
- **Total cobrado:** `SUM(pagos_parciales.monto)` donde `venta_offline_id = X` o `pedido_id = Y`
- **Saldo pendiente:** Total − Cobrado
- **Ganancia real cobrada:** `(cobrado / total) * (precio_vendido - costo_snapshot)` para ventas offline; para pedidos usa la ganancia neta proporcional al porcentaje cobrado

### Campos existentes que se deprecan (NO se eliminan)
Los campos `monto_pagado_inicial`, `monto_pagado_final`, `comprobante_inicial_url`, `comprobante_final_url` de `pedidos` se mantienen en la DB para historial de pedidos antiguos pero dejan de usarse en la UI para pedidos nuevos.

---

## Sección 2: Ventas offline — UI

### Página `/admin/ventas-offline`

**Tabla "Ventas offline recientes":**
- Cada fila agrega una columna "Cobrado" que muestra una barra de progreso visual (% cobrado / total) y el monto cobrado vs total
- Click en una fila expande un panel de detalle debajo de la fila (inline) con:
  - Resumen: Total · Cobrado · Saldo pendiente
  - Tabla de pagos: columnas Fecha pago, Monto, Vencimiento, Nota, Acción (eliminar)
  - Botón "Agregar pago" → abre modal

**Modal "Agregar pago":**
- Monto (número, requerido, > 0, no puede superar el saldo pendiente)
- Fecha de pago (date, default hoy)
- Fecha de vencimiento (date, opcional)
- Nota (texto, opcional)

**Tarjeta "Ganancia real offline" del dashboard:**
- Se recalcula: solo cuenta la porción del margen proporcional a lo cobrado
- Fórmula: `SUM((cobrado_venta / precio_vendido) * (precio_vendido - costo_snapshot))` para todas las ventas

**Server action:** `agregarPagoVentaOffline({ venta_offline_id, monto, fecha_pago, fecha_vencimiento?, nota? })`

---

## Sección 3: Pedidos web — UI

### Página `/admin/pedidos/[id]`

La sección "Pago" actual se reemplaza por:

**Resumen de cobro:**
- Total del pedido · Cobrado · Saldo pendiente
- Barra de progreso visual

**Tabla de pagos:**
- Columnas: Fecha pago, Monto, Vencimiento, Nota, Acción (eliminar)
- Estado "Pagado completo" cuando saldo = 0

**Botón "Agregar pago":**
- Mismo modal que en ventas offline
- Llama a `agregarPagoPedido({ pedido_id, monto, fecha_pago, fecha_vencimiento?, nota? })`

**Compatibilidad con pedidos existentes:**
- Si el pedido tiene `monto_pagado_inicial > 0`, se muestra como referencia histórica en una nota
- No se migran automáticamente a `pagos_parciales`

---

## Archivos a crear / modificar

| Acción | Ruta | Responsabilidad |
|---|---|---|
| Crear | `supabase/migrations/20260529010000_pagos_parciales.sql` | Tabla + RLS |
| Crear | `app/admin/ventas-offline/pagos-actions.ts` | Server actions para ventas offline (agregar/eliminar pago) |
| Crear | `app/admin/pedidos/[id]/pagos-actions.ts` | Server actions para pedidos (agregar/eliminar pago) |
| Crear | `components/admin/PagoParcialModal.tsx` | Modal reutilizable para agregar un pago (recibe onSubmit callback) |
| Crear | `components/admin/PagosPanel.tsx` | Panel de historial de pagos + resumen (reutilizable, recibe pagos + total + acción de agregar) |
| Modificar | `app/admin/ventas-offline/page.tsx` | Convertir tabla a client component, agregar expansión de fila con PagosPanel |
| Modificar | `app/admin/pedidos/[id]/page.tsx` | Reemplazar sección de pago actual con PagosPanel |

### Notas de arquitectura
- `PagoParcialModal` y `PagosPanel` son componentes compartidos y no conocen si su contexto es una venta offline o un pedido — solo reciben datos y callbacks.
- Las server actions están separadas por contexto (`ventas-offline` vs `pedidos/[id]`) para mantener `revalidatePath` correcto en cada caso.
- La ganancia real en `/admin/ventas-offline` se recalcula con la fórmula proporcional. La ganancia en `/admin/reportes` (pedidos web) no cambia — ya usa su propia lógica.
