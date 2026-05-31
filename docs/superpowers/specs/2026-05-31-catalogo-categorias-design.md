# Diseño: Catálogo organizado por categorías

**Fecha:** 2026-05-31  
**Estado:** Aprobado por el usuario

---

## Resumen

Reorganizar la navegación del catálogo para que Para Ella, Para Él y Catálogo muestren categorías primero en lugar de listas planas de productos. Reutiliza `SeccionesGrid`, `SeccionHero` y `FiltrosSection` existentes.

---

## Sección 1: Para Ella y Para Él como hubs

### `/para-ella`
- Mantiene `BloqueFemenino` arriba (sin cambios)
- Reemplaza el grid plano de productos con `SeccionesGrid` (todas las secciones activas)
- Las tarjetas enlazan a `/para-ella/[slug]` en lugar de `/seccion/[slug]`

### `/para-el`
- Mantiene encabezado actual (sin cambios)
- Reemplaza el grid plano de productos con `SeccionesGrid` (todas las secciones activas)
- Las tarjetas enlazan a `/para-el/[slug]` en lugar de `/seccion/[slug]`

---

## Sección 2: Páginas de sección con filtro de género

### `/para-ella/[slug]`
- `SeccionHero` con imagen y nombre de la sección (igual que `/seccion/[slug]`)
- `FiltrosSection` con `baseHref="/para-ella/{slug}"` — los tabs de subsección generan links a `/para-ella/{slug}/{subseccion}` automáticamente
- Grid de productos filtrado por `seccion_id = X AND solo_para_ella = true`
- Botón "← Para Ella" para volver al hub

### `/para-ella/[slug]/[subseccion]`
- Igual que `/para-ella/[slug]` pero además filtra por `subseccion_id`
- `FiltrosSection` recibe `baseHref="/para-ella/{slug}"` — el tab activo resalta correctamente

### `/para-el/[slug]`
- Idéntico a `/para-ella/[slug]` pero filtra por `solo_para_el = true`
- `FiltrosSection` con `baseHref="/para-el/{slug}"`
- Botón "← Para Él" para volver al hub

### `/para-el/[slug]/[subseccion]`
- Igual que `/para-el/[slug]` pero además filtra por `subseccion_id`
- `FiltrosSection` recibe `baseHref="/para-el/{slug}"`

### Estado vacío
Si una sección no tiene productos con el filtro de género: mostrar mensaje *"No hay piezas de esta categoría disponibles aún."*

### Cambio en `getProductosBySeccion`
Agregar parámetros opcionales al objeto `filters` existente:
```typescript
solo_para_ella?: boolean
solo_para_el?: boolean
```

Cuando se reciben, agregar `.eq("solo_para_ella", true)` o `.eq("solo_para_el", true)` al query.

---

## Sección 3: Catálogo (`/buscar`)

### Sin búsqueda activa (`/buscar` sin `?q=`)
- Reemplaza el grid plano de todos los productos con `SeccionesGrid` completo
- Las tarjetas enlazan a `/seccion/[slug]` (sin filtro de género)

### Con búsqueda activa (`/buscar?q=término`)
- Comportamiento actual sin cambios — muestra resultados de búsqueda en grid de `ProductoCard`

---

## Archivos a crear / modificar

| Acción | Ruta | Cambio |
|---|---|---|
| Modificar | `app/(public)/para-ella/page.tsx` | Reemplazar grid con `SeccionesGrid` |
| Modificar | `app/(public)/para-el/page.tsx` | Reemplazar grid con `SeccionesGrid` |
| Crear | `app/(public)/para-ella/[slug]/page.tsx` | Sección filtrada por `solo_para_ella=true` |
| Crear | `app/(public)/para-ella/[slug]/[subseccion]/page.tsx` | Subsección filtrada por `solo_para_ella=true` |
| Crear | `app/(public)/para-el/[slug]/page.tsx` | Sección filtrada por `solo_para_el=true` |
| Crear | `app/(public)/para-el/[slug]/[subseccion]/page.tsx` | Subsección filtrada por `solo_para_el=true` |
| Modificar | `lib/catalog/queries.ts` — `getProductosBySeccion` | Agregar params `solo_para_ella` y `solo_para_el` |
| Modificar | `app/(public)/buscar/page.tsx` | Mostrar `SeccionesGrid` cuando no hay query |
