# Portada inicial respetada + cards sin autoplay de video — Diseño

**Fecha:** 2026-05-24
**Estado:** Aprobado (pendiente plan de implementación)

## Contexto

Dos fricciones detectadas en producción tras el lanzamiento del feature de variantes-con-imagen:

1. **La galería del producto abre con la imagen de la variante por defecto**, no con la portada del producto. La primera impresión visual del cliente queda determinada por una variante arbitraria, no por la curaduría del admin.

2. **Videos en cards del catálogo se autoreproducen.** Funciona fluido en hardware bueno, pero en móviles low-end y conexiones lentas (Panamá, planes de datos) genera lag, consume datos y distrae de la decisión de compra. Marcas top (Shein, Nike, ASOS, Lululemon) usan imagen estática + icono de video en grids y reservan el autoplay para el detalle del producto.

Este diseño corrige ambos en un solo branch porque comparten temática (cómo se presenta el contenido del producto al cliente).

## Decisiones de producto

| Decisión | Valor |
|---|---|
| Portada inicial al cargar ficha | Imagen de portada del producto (no la de variante seleccionada por defecto) |
| Variante seleccionada por click | Sigue cambiando la galería a la imagen de la variante (sin cambios) |
| Portada en catálogo cuando producto tiene video | Primera imagen no-video (estática) |
| Producto solo con videos en catálogo | Primer frame del video (`preload="metadata"`, sin autoplay) |
| Indicador "hay video" en catálogo | Badge circular con icono Play en esquina inferior izquierda |
| Hover-to-play en desktop | No (descartado por simplicidad y consistencia con móvil) |
| Autoplay en ficha de producto | Sin cambios — sigue funcionando como hoy |

## Arquitectura

### Fix 1 — Portada inicial respetada

`components/public/ProductoInfo.tsx` tiene este `useEffect` (líneas 68-72) agregado en la feature anterior:

```tsx
useEffect(() => {
  const initial = p.producto_variantes.find((v) => v.id === selectedVariantId) ?? null
  onVariantChange?.(initial)
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

**Cambio:** eliminar el bloque completo. La galería ya inicializa correctamente con `imagenesLimpias[0]?.url` (`ProductoView.tsx:43-45`). Sin la llamada en mount, `handleVariantChange` solo se dispara cuando el cliente click una variante (`onClick` de los botones de variante).

**Resultado:** ficha abre con portada del producto. Click en variante con imagen → galería salta a esa imagen (comportamiento ya existente, no cambia).

Eliminar también el import de `useEffect` si ya no se usa en el archivo.

### Fix 2 — Card de catálogo sin autoplay

`components/public/ProductoCard.tsx` cambia la lógica de portada (líneas 33-67).

**Estado actual** (a remover):
```tsx
const portada = limpias[0]
const portadaEsVideo = portada?.tipo === "video"
// ...
{portada && (
  portadaEsVideo ? (
    <video src={portada.url} autoPlay muted loop playsInline preload="metadata" ... />
  ) : (
    <Image src={portada.url} ... />
  )
)}
```

**Estado nuevo:**
```tsx
const limpias = p.producto_imagenes.filter((i) => i.watermark_limpio)
const primeraFoto = limpias.find((i) => i.tipo !== "video")
const tieneVideo = limpias.some((i) => i.tipo === "video")
const portadaVisible = primeraFoto ?? limpias[0] ?? null
const portadaEsSoloVideo = !primeraFoto && portadaVisible?.tipo === "video"
// ...
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
{tieneVideo && (
  <div
    aria-hidden="true"
    className="absolute bottom-3 left-3 z-10 w-8 h-8 rounded-full bg-black/70 backdrop-blur-sm ring-1 ring-white/20 flex items-center justify-center"
  >
    <Play size={14} className="text-white fill-white ml-0.5" />
  </div>
)}
```

**Cambios clave:**
- Buscar `primeraFoto` (primera imagen no-video) en lugar de tomar `limpias[0]` ciegamente.
- Fallback a `limpias[0]` solo si NO hay imágenes (caso raro: producto cargado únicamente con videos).
- Si el fallback es video → renderizar `<video>` SIN `autoPlay` y SIN `loop`. Solo `preload="metadata"` para que el navegador descargue el primer frame.
- Badge de play con `Play` icon de `lucide-react` (agregar al import).
- Badge condicional: solo si `tieneVideo`.
- Comportamiento idéntico en mobile y desktop. Sin hover-to-play.

**Import a agregar:** `import { ArrowRight, Play } from "lucide-react"` (reemplazar el import existente que solo trae `ArrowRight`).

### Ficha individual

`components/public/ProductoGaleria.tsx` sin cambios. Adentro de la ficha el video sigue mostrándose con `controls` y se reproduce al click del usuario.

## Flujo de datos

```
Cliente entra a /catalogo
  → ProductoCard renderiza imagen estática (no video)
  → Si producto tiene video, badge Play visible
  → Sin scripts pesados, sin autoplay
  → Click en card → /producto/{slug}

Cliente entra a /producto/{slug}
  → ProductoView mount: activeUrl = imagenesLimpias[0]?.url
  → ProductoGaleria muestra portada del producto
  → ProductoInfo selecciona variante por defecto INTERNAMENTE
  → onVariantChange NO se dispara en mount (eliminado)
  → Cliente click variante "Burdeos" (con imagen) → handleVariantChange dispara → galería salta a esa imagen
```

## Casos borde

- **Producto sin imágenes ni videos:** `limpias` vacío → `portadaVisible` es null → bloque condicional no renderiza nada → se ve el `bg-gradient-to-br` del contenedor (placeholder existente). Sin badge de play.
- **Producto con solo 1 video, 0 imágenes:** `primeraFoto` es undefined → `portadaVisible` = ese video → `portadaEsSoloVideo` = true → `<video>` sin autoplay → primer frame visible. Badge de play presente.
- **Producto con imágenes y videos:** primera imagen no-video es la portada visible. Badge de play presente porque `tieneVideo` true. Click → ficha → puede ver el video.
- **Producto con solo imágenes:** comportamiento idéntico al actual. Sin badge.
- **Variante por defecto con imagen al abrir ficha:** la galería ya NO salta. Cliente ve portada. Si click en otra variante con imagen, sí salta. Si vuelve a click en la variante por defecto, ahí sí salta (porque ahora es click, no mount).

## Out of scope

- Hover-to-play en desktop (Opción B descartada).
- IntersectionObserver para autoplay condicional (Opción C descartada).
- Posters explícitos en `<video poster="...">` (requeriría columna nueva en DB).
- Mostrar duración del video en el badge.
- Mostrar cantidad de fotos/videos en el badge.
- Cambiar el orden de la galería del producto (las imágenes mantienen su `orden` del admin).

## Archivos afectados

**Cambios:**
- `components/public/ProductoInfo.tsx` — quitar `useEffect` de mount + import `useEffect`
- `components/public/ProductoCard.tsx` — nueva lógica de portada + badge de video + import `Play`

**Sin cambios:**
- `components/public/ProductoGaleria.tsx`
- `components/public/ProductoView.tsx`
- Server actions, DB, storage

## Riesgos

- **Performance:** ninguno nuevo. Eliminamos autoplay → reduce CPU/red.
- **SEO/Schema:** `ProductSchemaData` usa `imagenesLimpias[0]` para el meta tag. Si el primer item es video y antes no, ningún cambio (eso ya está manejado en otro componente).
- **Regresión visual:** el badge Play es nuevo pero no obstruye el badge de estado (top-left) ni el WishlistButton (top-right). Ubicación bottom-left libre actualmente.
- **Métricas de engagement:** podríamos perder algo de "wow" visual en catálogo. Mitigación: el video sigue accesible al entrar al producto, donde el cliente está más comprometido. Marcas top reportan que esto NO baja conversión.
