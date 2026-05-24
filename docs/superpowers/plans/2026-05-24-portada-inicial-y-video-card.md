# Portada inicial respetada + cards sin autoplay de video — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la ficha de producto abra siempre con la portada (no con la imagen de la variante por defecto) y que las cards del catálogo dejen de autoreproducir videos (imagen estática + badge de play).

**Architecture:** Dos cambios pequeños y ortogonales en client components. (1) Eliminar `useEffect` de mount en `ProductoInfo.tsx` que disparaba `onVariantChange` con la variante inicial. (2) En `ProductoCard.tsx`, escoger la primera imagen no-video como portada y mostrar un badge circular con icono Play cuando el producto tiene al menos un video.

**Tech Stack:** Next.js 15 App Router, React Client Components, TypeScript, Tailwind, lucide-react.

**Spec:** `docs/superpowers/specs/2026-05-24-portada-inicial-y-video-card-design.md`

**Nota sobre tests:** Igual que features anteriores — no hay infraestructura para tests de UI. Verificación manual al final con `npm run dev`.

---

## Task 1: Quitar `useEffect` de mount en `ProductoInfo`

**Goal:** La ficha de producto abre con la portada del producto en la galería, no con la imagen de la variante por defecto. La galería solo cambia cuando el cliente click una variante con imagen.

**Files:**
- Modify: `components/public/ProductoInfo.tsx`

- [ ] **Step 1: Eliminar el `useEffect` de mount**

En `components/public/ProductoInfo.tsx`, busca y borra completo el siguiente bloque (alrededor de las líneas 68-72):

```tsx
useEffect(() => {
  const initial = p.producto_variantes.find((v) => v.id === selectedVariantId) ?? null
  onVariantChange?.(initial)
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

- [ ] **Step 2: Quitar `useEffect` del import si ya no se usa**

Verifica con:

```bash
grep -n "useEffect" components/public/ProductoInfo.tsx
```

Si NO hay más usos, busca el import en la línea 3:

```tsx
import { useState, useEffect } from "react"
```

Reemplázalo por:

```tsx
import { useState } from "react"
```

Si todavía hay otros usos de `useEffect` (no debería, pero verifica), déjalo como está.

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: build pasa sin errores de TypeScript.

- [ ] **Step 4: Verify manual**

```bash
npm run dev
```

Test:
1. Abre un producto que tenga al menos una variante con `imagen_url` asignada que sea DISTINTA a la portada del producto.
2. Carga `/producto/{slug}`.
3. **Resultado esperado:** la galería abre con la portada del producto (primera imagen del array `producto_imagenes` con `watermark_limpio: true`), NO con la imagen de la variante.
4. Click en una variante con imagen → la galería sí salta a esa imagen (comportamiento ya existente).
5. Click en otra variante sin imagen → la galería no cambia.
6. Click manual en un thumbnail → galería cambia, variante seleccionada NO cambia.

- [ ] **Step 5: Commit**

```bash
git add components/public/ProductoInfo.tsx
git commit -m "fix(public): galeria abre con portada del producto, no con imagen de variante por defecto"
```

---

## Task 2: Card de catálogo — escoger primera imagen no-video como portada

**Goal:** En la grid del catálogo, la portada visible de cada card es siempre una imagen estática (no video). Si el producto solo tiene videos, mostrar el primer frame del primer video sin autoplay.

**Files:**
- Modify: `components/public/ProductoCard.tsx`

- [ ] **Step 1: Reemplazar el bloque de lógica de portada**

En `components/public/ProductoCard.tsx`, busca el bloque actual (alrededor de las líneas 32-38):

```tsx
export function ProductoCard({ p }: { p: ProductoCardData }) {
  const limpias = p.producto_imagenes.filter((i) => i.watermark_limpio)
  const portada = limpias[0]
  const portadaEsVideo = portada?.tipo === "video"
  const isStock = p.modo === "stock"
  const agotado = isStock && (p.stock_unidades ?? 0) === 0
  const fechaRango = formatRange(p.fecha_llegada_inicio, p.fecha_llegada_fin)
```

Reemplázalo por:

```tsx
export function ProductoCard({ p }: { p: ProductoCardData }) {
  const limpias = p.producto_imagenes.filter((i) => i.watermark_limpio)
  const primeraFoto = limpias.find((i) => i.tipo !== "video")
  const tieneVideo = limpias.some((i) => i.tipo === "video")
  const portadaVisible = primeraFoto ?? limpias[0] ?? null
  const portadaEsSoloVideo = !primeraFoto && portadaVisible?.tipo === "video"
  const isStock = p.modo === "stock"
  const agotado = isStock && (p.stock_unidades ?? 0) === 0
  const fechaRango = formatRange(p.fecha_llegada_inicio, p.fecha_llegada_fin)
```

Cambios:
- `primeraFoto` busca el primer item NO video.
- `tieneVideo` indica si hay al menos un video (para el badge en Task 3).
- `portadaVisible` prefiere imagen, cae a `limpias[0]` solo si no hay imagen alguna.
- `portadaEsSoloVideo` se activa SOLO cuando todo el producto son videos.

- [ ] **Step 2: Reemplazar el bloque de render de portada**

Busca el bloque actual (alrededor de las líneas 46-67):

```tsx
{portada && (
  portadaEsVideo ? (
    <video
      src={portada.url}
      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={p.nombre}
    />
  ) : (
    <Image
      src={portada.url}
      alt={p.nombre}
      fill
      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 300px"
      className="object-cover group-hover:scale-105 transition-transform duration-500"
    />
  )
)}
```

Reemplázalo por:

```tsx
{portadaVisible && (
  portadaEsSoloVideo ? (
    <video
      src={portadaVisible.url}
      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      muted
      playsInline
      preload="metadata"
      aria-label={p.nombre}
    />
  ) : (
    <Image
      src={portadaVisible.url}
      alt={p.nombre}
      fill
      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 300px"
      className="object-cover group-hover:scale-105 transition-transform duration-500"
    />
  )
)}
```

Diferencias respecto al anterior:
- `portada` → `portadaVisible`, `portadaEsVideo` → `portadaEsSoloVideo`.
- `<video>` ya NO tiene `autoPlay` ni `loop` (solo `muted`, `playsInline`, `preload="metadata"`).

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: build pasa. El warning de `autoPlay`/`loop` desaparece automáticamente. Si TypeScript se queja de `tieneVideo` sin usar, ignóralo — la Task 3 lo usa enseguida.

- [ ] **Step 4: Commit**

```bash
git add components/public/ProductoCard.tsx
git commit -m "fix(public): card de catalogo usa primera imagen no-video como portada sin autoplay"
```

---

## Task 3: Card de catálogo — badge de Play cuando hay video

**Goal:** Mostrar un badge circular con icono Play en la esquina inferior izquierda de cada card que tenga al menos un video, para comunicar "hay video adentro" sin reproducirlo.

**Files:**
- Modify: `components/public/ProductoCard.tsx`

- [ ] **Step 1: Agregar `Play` al import de lucide-react**

En `components/public/ProductoCard.tsx`, busca el import (línea 4):

```tsx
import { ArrowRight } from "lucide-react"
```

Reemplázalo por:

```tsx
import { ArrowRight, Play } from "lucide-react"
```

- [ ] **Step 2: Agregar el badge dentro del contenedor de la imagen**

Busca el bloque del contenedor de imagen (el `<div className="aspect-square relative bg-gradient-to-br from-gold-deep/30 to-black overflow-hidden">`). Está justo después de la línea con la const `fechaRango` y antes del cierre del componente.

Identifica el cierre `</div>` de ese contenedor (el que está antes de `<div className="p-5 space-y-2">`). JUSTO ANTES de ese `</div>` de cierre, agrega:

```tsx
{tieneVideo && (
  <div
    aria-hidden="true"
    className="absolute bottom-3 left-3 z-10 w-8 h-8 rounded-full bg-black/70 backdrop-blur-sm ring-1 ring-white/20 flex items-center justify-center"
  >
    <Play size={14} className="text-white fill-white ml-0.5" />
  </div>
)}
```

Ubicación final: dentro del contenedor `<div className="aspect-square ...">`, después del `<WishlistButton .../>` y antes de su `</div>` de cierre.

Notas del estilo:
- `bottom-3 left-3` esquina inferior izquierda; no conflicta con badge de estado (top-3 left-3) ni WishlistButton (top-3 right-3).
- `ml-0.5` en el icono compensa visualmente que el triángulo de Play se ve descentrado por su forma.
- `fill-white` rellena el triángulo (no solo el contorno).

- [ ] **Step 3: Build check**

```bash
npm run build
```

Expected: build pasa sin warnings sobre `tieneVideo` sin usar (ahora se usa).

- [ ] **Step 4: Verify manual**

```bash
npm run dev
```

Test del catálogo (`/`, `/seccion/{slug}`, etc.):

1. **Producto con solo imágenes:** card muestra primera imagen, sin badge de play.
2. **Producto con video como primera media + imágenes después:** card muestra la PRIMERA IMAGEN (no el video) + badge de play visible.
3. **Producto con imagen primero y video después:** card muestra la imagen, badge de play visible.
4. **Producto con SOLO videos (caso raro):** card muestra el primer frame del primer video (sin reproducirse), badge de play visible. Verifica que el navegador NO esté descargando el video completo (DevTools → Network → Filter "media" → debería pesar solo unos KB del header).
5. **Mobile (DevTools responsive):** mismo comportamiento, sin autoplay. Verifica que el badge sigue legible.
6. **Scroll rápido por el catálogo:** sin lag, sin parpadeos. CPU del navegador no escala.
7. **Click en card con video:** entra al producto. La ficha sigue mostrando el video con controles (comportamiento existente, sin cambios).

- [ ] **Step 5: Commit**

```bash
git add components/public/ProductoCard.tsx
git commit -m "feat(public): badge con icono Play en cards que tienen video"
```

---

## Self-Review

**Cobertura del spec:**

- Fix 1 (portada inicial): Task 1.
- Fix 2 (card sin autoplay + fallback solo-video): Task 2.
- Badge de Play cuando hay video: Task 3.
- Sin cambios en `ProductoGaleria` ni `ProductoView`: respetado (no hay tareas que los toquen).
- Casos borde (sin imágenes, solo videos, mezcla): verificación manual en Task 3 Step 4.

**Placeholders:** Ninguno. Todo el código real está pegable.

**Consistencia de tipos:**
- `portadaVisible` (Task 2) tiene tipo `{ url: string; tipo?: string | null; watermark_limpio: boolean } | null` — coincide con el shape de `producto_imagenes` declarado en `ProductoCardData` (línea 17).
- `tieneVideo` (Task 2) es `boolean`, usado en Task 3 sin transformación.
- `Play` import de `lucide-react` consistente con `ArrowRight` (mismo módulo, mismo patrón).

**Riesgos no cubiertos:**
- Si el orden de las imágenes en el admin cambia (drag-and-drop existente), el comportamiento varía: la primera imagen no-video del nuevo orden será la portada. Es el comportamiento deseado.
- Caso teórico: producto con 10 videos y 0 imágenes — el `<video preload="metadata">` descarga ~100KB-1MB por card. Si esto pasa con muchos productos, considerar fallback a `<Image>` con un asset placeholder. Por ahora aceptado (caso raro y manejable).
