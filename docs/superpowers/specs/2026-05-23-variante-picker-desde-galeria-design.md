# Picker de imagen de variante desde galería — Diseño

**Fecha:** 2026-05-23
**Estado:** Aprobado (pendiente plan de implementación)

## Contexto

La feature anterior (variantes con imagen + edición inline) permite asignar UNA imagen a cada variante, pero siempre vía upload — incluso cuando la foto ya existe en la galería del producto. Esto duplica archivos en storage, hace lento el flujo (re-subir 5MB cuando ya está disponible) y crea inconsistencias visuales si la "foto de variante burdeos" se sube de nuevo y no coincide píxel-a-píxel con la del carrusel.

Este diseño agrega un picker que permite elegir la imagen de variante desde las fotos ya cargadas del producto (galería principal), manteniendo "subir nueva" como opción alternativa.

## Estado actual relevante

- `ProductoVariantes.tsx` (~360 líneas) tiene dos uploaders inline (modo edit + bloque "agregar nueva"). Ambos llaman `uploadFile()` directo y manejan cleanup local.
- `app/admin/productos/[id]/page.tsx:27-31` ya carga `producto_imagenes` por separado y lo pasa a `<ProductoImagenesGaleria>`. Solo falta pasarlo también a `<ProductoVariantes>`.
- Server actions `updateVariante` y `removeVariante` borran archivos del bucket sin verificar si están referenciados por la galería. Si una variante usa una foto de galería y luego se borra, la galería pierde el archivo y muestra imagen rota.
- Radix UI **no está instalado** (`npm ls @radix-ui` → vacío). El popover se implementa manual con `useState` + listener `mousedown` global para click-outside.

## Decisiones de producto

| Decisión | Valor |
|---|---|
| UI del picker | Popover flotante al click del thumbnail |
| Contenido del popover | Grid de fotos del producto + botón "subir nueva" + opción "quitar" |
| Filtrado | Solo `tipo === "imagen"` (no videos) |
| Cleanup al borrar/cambiar imagen | NO borrar archivo si la URL está en `producto_imagenes` |
| Marca visual | Foto actualmente seleccionada lleva borde dorado en el grid del popover |

## Arquitectura

### Server actions (en `app/admin/productos/actions.ts`)

Antes de llamar `supabase.storage.from("productos").remove([path])` en `updateVariante` y `removeVariante`, hacer una query de chequeo:

```ts
const { data: galeriaRef } = await supabase
  .from("producto_imagenes")
  .select("id")
  .eq("producto_id", producto_id)
  .eq("url", urlABorrar)
  .maybeSingle()

if (!galeriaRef) {
  // No está en galería → borrar archivo del bucket
  await supabase.storage.from("productos").remove([path])
}
// Si está en galería, no tocar el archivo
```

Esto agrega 1 query por cleanup. Para mantener el código DRY se puede extraer un helper privado `tryCleanupVariantImage(supabase, productoId, url)` en el mismo archivo.

### Componente nuevo: `VariantImagenPicker`

Archivo: `components/admin/forms/VariantImagenPicker.tsx`

**Props:**
```ts
interface Props {
  imagenes: { id: string; url: string; tipo: string }[]
  productoId: string
  uploadTarget: "new" | string  // id de variante o "new"
  currentUrl: string | null
  onSelect: (url: string | null) => void
}
```

**Estructura visual:**

- **Trigger:** el thumbnail 48×48 actual (mismo estilo de borde dorado tenue + ImageIcon o foto). Click → abre popover.
- **Popover** (posicionado `absolute` debajo del trigger, panel oscuro con borde):
  - Header: `<span className="eyebrow">Elegir foto</span>`
  - Grid 4 columnas de fotos: `imagenes.filter(i => i.tipo === "imagen").map(...)`. Cada thumb 56×56 cuadrado. Click → `onSelect(url)` + cierra.
  - Si `currentUrl` coincide con alguna URL del grid, ese thumb lleva `border-gold-primary`.
  - Si grid vacío → mensaje "Sin fotos en la galería del producto" (deshabilita esa parte, pero deja "subir nueva").
  - Botón "Subir foto nueva" (icono Upload, ancho completo, estilo ghost): click → file picker. Mientras sube, spinner. Al terminar → `onSelect(newUrl)` + cierra.
  - Si `currentUrl !== null` → link discreto "Quitar imagen" al final → `onSelect(null)` + cierra.
- Click fuera o ESC cierra el popover.

**Estado interno:**
- `open: boolean`
- `uploading: boolean`

**Upload:**
- Path: `productos/{productoId}/variantes/{uploadTarget === "new" ? "nueva" : uploadTarget}-{Date.now()}.{ext}`
- Reusa `uploadFile()` de `lib/storage/upload.ts`.

**Cleanup local al cambiar:**
- Si `currentUrl` existía Y no está en `imagenes` (no es de galería) Y es distinto al nuevo → llamar `deleteFile()` antes de llamar `onSelect(newUrl)`.
- Si `currentUrl` está en `imagenes` → no borrar (es referencia, no exclusiva de variante).

**Click-outside:**
```ts
useEffect(() => {
  if (!open) return
  function onClick(e: MouseEvent) {
    if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
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

### Integración en `ProductoVariantes`

**Nueva prop:** `imagenes: { id: string; url: string; tipo: string }[]`.

**Modo edit (línea ~149-194):** el `<label>` con file input se reemplaza por:
```tsx
<VariantImagenPicker
  imagenes={imagenes}
  productoId={productoId}
  uploadTarget={v.id}
  currentUrl={editDraft.imagen_url}
  onSelect={(url) => setEditDraft((prev) => ({ ...prev, imagen_url: url }))}
/>
```

**Bloque "agregar nueva" (~línea 267-296):** igual con `uploadTarget="new"`, `currentUrl={newDraftImagenUrl}`, `onSelect={setNewDraftImagenUrl}`.

**Eliminar de `ProductoVariantes`:**
- Función `uploadVarianteImagen` (migra al Picker)
- Estado `uploadingFor` (migra al Picker)
- Imports `uploadFile`, `deleteFile`, `pathFromUrl` (a menos que sigan usándose para otra cosa — verificar al implementar)

`VariantThumbReadonly` (modo view) se mantiene tal cual.

Tamaño esperado: `ProductoVariantes` baja de ~360 a ~250-280 líneas.

### Cambio en `app/admin/productos/[id]/page.tsx`

Línea 48:
```tsx
<ProductoVariantes
  productoId={id}
  initial={variantes || []}
  imagenes={imagenes || []}
/>
```

## Flujo de datos

```
Admin entra a editar producto
  → page.tsx carga imagenes + variantes en paralelo
  → ProductoVariantes recibe ambos arrays

Admin click thumbnail de variante (edit o nueva)
  → VariantImagenPicker abre popover
  → Grid muestra imagenes del producto
  → Click en foto → onSelect(url) → cierra popover → draft actualizado
  → O click "Subir nueva" → file picker → uploadFile → onSelect(url) → cierra

Admin click "Quitar imagen"
  → onSelect(null) → cierra popover → draft actualizado

Admin guarda variante
  → updateVariante (existente) lee imagen_url previa
  → Si previa cambió: query producto_imagenes; si no está → borrar archivo; si está → no tocar
  → Update DB
  → Revalidate
```

## Casos borde

- **Variante usa foto de galería, luego usuario borra esa foto de la galería:** el `imagen_url` de la variante queda apuntando a un archivo que ya no existe. Visible como imagen rota. Aceptado — esto YA pasaba antes con la galería y videos del producto (no se valida referential integrity en storage). Documentar como follow-up futuro.
- **Sin fotos en la galería al crear variante:** el grid muestra mensaje "Sin fotos del producto. Sube primero las fotos del producto o sube una imagen exclusiva para la variante." Popover sigue mostrando "Subir nueva" + "Quitar".
- **Foto compartida entre múltiples variantes:** dos variantes apuntan a la misma URL de galería. Borrar una no toca el archivo (sigue en galería). OK.
- **Foto subida exclusivamente para variante, luego reemplazada por foto de galería:** Picker detecta que `currentUrl` NO está en `imagenes` antes de cambiar → borra la exclusiva. Nuevo URL es de galería → server cleanup verifica que SÍ está en galería → no borra. OK.
- **Subir nueva → cancelar mid-upload:** El popover no maneja `AbortController`. Si el usuario cierra mientras sube, el upload sigue background y `onSelect` se ejecuta en el padre desmontado del popover (pero el padre vive en `ProductoVariantes`, no se desmonta). Comportamiento OK: la imagen se asigna aunque el popover esté cerrado.
- **`producto_imagenes` incluye videos:** filtrar por `tipo === "imagen"` en el grid. Variantes no muestran videos.

## Out of scope

- Multi-select (asignar varias variantes a la misma foto en una acción).
- Drag-and-drop entre galería y variantes.
- Indicador visual en la galería principal de "esta foto está en uso por X variantes".
- Limpieza referencial cuando se borra una foto de la galería que estaba en uso por variantes (queda imagen rota en variante — aceptado).
- Migración de variantes existentes (las que ya tienen `imagen_url` exclusiva siguen igual).
- Reemplazar Radix con esta implementación de popover en otros componentes del admin.

## Archivos afectados

**Cambios:**
- `app/admin/productos/actions.ts` — `updateVariante` + `removeVariante` (chequeo galería antes de borrar)
- `app/admin/productos/[id]/page.tsx` — pasar `imagenes` prop a `ProductoVariantes`
- `components/admin/forms/ProductoVariantes.tsx` — usar `VariantImagenPicker`, remover lógica de upload local

**Nuevo:**
- `components/admin/forms/VariantImagenPicker.tsx` — componente popover

## Riesgos

- **Popover manual sin Radix:** click-outside con `mousedown` puede colisionar con otros popovers/menús del admin (no hay otros activos ahora). Risk bajo. Si surge, considerar instalar `@radix-ui/react-popover` en una iteración futura.
- **Server-side query extra por cleanup:** +1 query por borrado/reemplazo de imagen. Para el volumen del admin (un par de variantes por producto) es despreciable.
- **Click-outside captura mousedown del Button hijo:** el `contains()` check con `rootRef` debería resolverlo, pero hay que validar en pruebas manuales que los clicks en thumbs y botones del popover NO se cancelen.
