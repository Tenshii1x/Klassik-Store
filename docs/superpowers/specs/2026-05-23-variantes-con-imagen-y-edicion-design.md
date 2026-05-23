# Variantes con imagen y edición — Diseño

**Fecha:** 2026-05-23
**Estado:** Aprobado (pendiente plan de implementación)

## Contexto

Las variantes de producto (`producto_variantes`) en Klassik Store hoy solo se pueden **agregar** y **borrar** desde el admin. No hay forma de editarlas — si un dato sale mal, hay que borrar y volver a crear. Tampoco hay manera de asignar una imagen específica a cada variante, así que cuando un cliente selecciona "color burdeos" en la ficha pública, la galería sigue mostrando la portada genérica del producto.

Este diseño cubre dos funcionalidades enlazadas:

1. **Edición de variantes existentes** desde el admin (los 4 campos: tipo, valor, precio_extra, stock_unidades, más imagen).
2. **Imagen por variante** que reemplaza la portada de la galería pública cuando esa variante se selecciona.

## Estado actual relevante

- **DB:** `producto_variantes.imagen_url text` **ya existe** en `supabase/migrations/20260512000000_schema.sql:97`. Solo hay que usarla.
- **Tipo público:** la interfaz `Variante` en `components/public/ProductoInfo.tsx:13-20` ya declara `imagen_url: string | null`. El tipo está; la lógica no.
- **Admin:** `components/admin/forms/ProductoVariantes.tsx` solo expone `addVariante` y `removeVariante`. Sin edición, sin uploader.
- **Público:** `ProductoInfo` y `ProductoGaleria` son hermanos sin estado compartido — la galería tiene `useState(active)` propio que nadie de afuera puede mover.

## Decisiones de producto

| Decisión | Valor |
|---|---|
| Comportamiento al seleccionar variante | Salta a la imagen de la variante como portada |
| Imágenes por variante | Una sola (reusa `imagen_url`) |
| Variante sin imagen | Galería no cambia |
| Campos editables | Tipo, Valor, Precio extra, Stock unidades, Imagen |
| UI de edición admin | Inline en la fila (no modal) |

## Arquitectura

### Base de datos
Sin cambios. La columna `producto_variantes.imagen_url` ya existe y es nullable.

### Storage
Imágenes de variante se suben al bucket existente `productos` bajo el prefijo:

```
productos/{productoId}/variantes/{varianteId}-{timestamp}.{ext}
```

Al reemplazar una imagen de variante, se borra la anterior con `deleteFile()` usando `pathFromUrl()` para evitar archivos huérfanos.

Reutiliza `uploadFile()` de `lib/storage/upload.ts`. No se duplica lógica de subida.

### Server actions (en `app/admin/productos/actions.ts`)

- **`addVariante(productoId, data)`** — agregar parámetro opcional `imagen_url: string | null` al payload.
- **`updateVariante(varianteId, productoId, data)`** — **nuevo**. Recibe `{ tipo, valor, precio_extra, stock_unidades, imagen_url }`. Valida con `varianteUpdateSchema`. Antes de hacer `update`, lee la variante actual: si `imagen_url` cambió (incluyendo a null) y la anterior no era null, llama `deleteFile()` con el path derivado de la URL anterior. Luego hace `update` en Supabase y revalida `app/admin/productos/[id]` y `app/(public)/producto/[slug]`.
- **`removeVariante`** — sin cambios.

### Validación

Extender `lib/validations/producto.ts`:

```ts
export const varianteUpdateSchema = z.object({
  tipo: z.string().min(1).max(40),
  valor: z.string().min(1).max(60),
  precio_extra: z.number().min(0),
  stock_unidades: z.number().int().min(0).nullable(),
  imagen_url: z.string().url().nullable(),
})
```

### Admin UI: edición inline

Refactor de `components/admin/forms/ProductoVariantes.tsx`.

**Estado por fila:**
- `editingId: string | null` — solo una variante en edición a la vez.
- `editDraft` — copia editable del draft separada del array `items` real.

**Modo `view` (default):**
- Thumbnail 48×48 a la izquierda. Si `imagen_url` está vacío, placeholder dorado tenue con icono de imagen.
- Tipo, valor, precio extra, stock — igual que hoy.
- Botones de acción: lápiz (editar), basura (borrar).

**Modo `edit`:**
- Thumbnail se vuelve mini uploader: click → file picker. Spinner mientras sube. Hover muestra X para quitar imagen actual.
- Inputs editables para tipo (select), valor (text), precio_extra (NumberInput), stock_unidades (NumberInput nullable).
- Botones: check verde (guardar → llama `updateVariante`), X (cancelar → descarta `editDraft`).

**Bloque "agregar nueva" (parte inferior existente):**
- Incluir mini uploader de imagen, no solo en edición. Así se puede crear variante completa de una vez.

### Vista pública: coordinación galería ↔ variante

Crear nuevo componente cliente `components/public/ProductoView.tsx`:

- Recibe `producto`, `imagenes`, `variantes` como props.
- Mantiene estado: `activeImageUrl: string`, `selectedVariantId: string | null`.
- Renderiza `<ProductoGaleria>` + `<ProductoInfo>` con el mismo layout grid actual.

Cambios en `ProductoGaleria`:
- Vuelve **controlable**: acepta `activeImageUrl?` y `onSelectImage?(url)` opcionales.
- Si vienen → modo controlado. Si no → mantiene su `useState` interno (compatibilidad con otros lugares que lo usen).
- También recibe `extraImages?: Imagen[]` opcionales que se prepende a `clean` (para imágenes de variante que no estén ya en la galería).

Cambios en `ProductoInfo`:
- Recibe `onVariantChange?(variante)` callback.
- Cuando el cliente selecciona una variante con `imagen_url`, dispara el callback.

**Lógica del wrapper:**
- Mount: `activeImageUrl` = primera imagen limpia del producto.
- Al cambiar variante:
  - Si `variante.imagen_url` está en `producto_imagenes` → setear `activeImageUrl` a esa URL.
  - Si `variante.imagen_url` no está en `producto_imagenes` → inyectar la imagen como `extraImages` al inicio y setear `activeImageUrl` a ella.
  - Si variante NO tiene `imagen_url` → no cambiar nada.
- Click manual en thumbnail → solo cambia `activeImageUrl`, NO toca `selectedVariantId`.

Cambio en `app/(public)/producto/[slug]/page.tsx`:
- Reemplazar el render lado-a-lado de `<ProductoGaleria>` + `<ProductoInfo>` por un único `<ProductoView producto={p} imagenes={...} variantes={...} />`.
- El layout grid de 2 columnas se mueve adentro del wrapper.

### Transición visual

Al cambiar la imagen principal por selección de variante, fade ~150ms (CSS transition en opacity) para evitar cambio brusco.

## Flujo de datos

```
Admin edita variante con imagen
  → uploadFile(productos, variantes/{id}-{ts}.ext)
  → updateVariante(id, { ...campos, imagen_url })
  → revalidatePath del producto admin + público
  → próximo render: ProductoView recibe variante con imagen_url

Cliente público abre ficha
  → ProductoView mount: activeImage = imágenes[0]
  → cliente click variante "Burdeos" (con imagen)
  → onVariantChange dispara
  → wrapper actualiza activeImageUrl al url de la variante
  → ProductoGaleria (controlada) reacciona y muestra esa imagen
```

## Casos borde

- **Variante seleccionada inicialmente al cargar la ficha:** `ProductoInfo` ya inicializa `selectedVariantId = variantes[0]?.id`. El wrapper debe respetar esto y si esa primera variante tiene imagen, abrir con esa imagen como portada en lugar de la del producto.
- **Borrar variante con imagen:** server action debe también borrar el archivo de storage si `imagen_url` no es null (evita acumular basura).
- **Reemplazar imagen en edición:** borrar el archivo anterior antes de guardar la nueva URL.
- **Variante sin imagen tras selección con imagen:** si el cliente pasa de "Burdeos" (con imagen) a "Negro" (sin imagen), la galería se queda en "Burdeos". Está bien por la decisión Pregunta 3.

## Out of scope

- Múltiples imágenes por variante.
- Marcar imagen de variante con flag `watermark_limpio` (no se filtra como las del producto). Si se requiere, se agrega después.
- Sincronizar `productos_relacionados` o el carrito con la imagen de variante elegida (el carrito ya guarda la portada general del producto; cambiar eso sería refactor separado).
- Drag-and-drop para reordenar variantes.

## Archivos afectados

**Cambios:**
- `app/admin/productos/actions.ts` — `addVariante` (param opcional), `updateVariante` (nuevo), `removeVariante` (limpieza de imagen)
- `lib/validations/producto.ts` — `varianteUpdateSchema`
- `components/admin/forms/ProductoVariantes.tsx` — refactor a edición inline + uploader por fila
- `components/public/ProductoGaleria.tsx` — props `activeImageUrl`, `onSelectImage`, `extraImages`
- `components/public/ProductoInfo.tsx` — prop `onVariantChange`
- `app/(public)/producto/[slug]/page.tsx` — reemplazar dos componentes por `ProductoView`

**Nuevo:**
- `components/public/ProductoView.tsx` — wrapper cliente coordinador
