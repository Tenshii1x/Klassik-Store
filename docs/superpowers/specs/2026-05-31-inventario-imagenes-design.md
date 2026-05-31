# Diseño: Ajuste de Inventario + Pegar Imágenes

**Fecha:** 2026-05-31  
**Estado:** Aprobado por el usuario

---

## Resumen

Dos mejoras independientes:
1. Vista de ajuste rápido de inventario — página dedicada para actualizar stock de múltiples productos a la vez
2. Pegar imágenes desde portapapeles — soporte Ctrl+V en la galería de imágenes del producto

---

## Feature 1: Vista de ajuste rápido de inventario

### Ruta
`/admin/inventario`

### Comportamiento
- Muestra una tabla con todos los productos publicados en modo `"stock"`
- Columnas: Nombre · Stock actual · Nuevo stock (input editable) · Precio venta · Costo unitario
- Los inputs de "Nuevo stock" comienzan vacíos — solo se actualizan los productos donde el admin escribió un nuevo valor
- Un contador `"X productos modificados"` se actualiza en tiempo real mientras se escribe
- Botón `"Guardar cambios"` en el topbar (usando el prop `actions` existente de `Topbar`) — habilitado solo cuando hay cambios pendientes
- Al guardar: hace `UPDATE` en paralelo solo para los productos modificados, llama `revalidatePath` y muestra toast
- Estado de éxito: inputs quedan vacíos, stock actual se actualiza con los nuevos valores

### Server action
`app/admin/inventario/actions.ts` — función `actualizarStocks(cambios: { id: string; stock: number }[])`

### Sidebar
Agregar `{ label: "Inventario", href: "/admin/inventario", icon: Layers }` al grupo "Catálogo" en `components/admin/sidebar.tsx`

### Archivos
| Acción | Ruta |
|---|---|
| Crear | `app/admin/inventario/page.tsx` |
| Crear | `app/admin/inventario/actions.ts` |
| Crear | `components/admin/AjusteInventarioTable.tsx` |
| Modificar | `components/admin/sidebar.tsx` |

---

## Feature 2: Pegar imágenes desde portapapeles

### Problema real
El usuario toma un screenshot o copia una imagen del navegador y quiere pegarla directamente en la zona de upload sin tener que guardar el archivo primero.

### Flujo de creación (contexto)
`createProducto` ya llama `redirect()` → el usuario aterriza en `/admin/productos/{id}` donde `ProductoImagenesGaleria` está en la parte superior. No hay nada roto en el flujo — solo falta un mensaje orientador.

### Cambios en `ProductoImagenesGaleria.tsx`

**A) Soporte de Ctrl+V:**
- Agregar un listener `onPaste` a la zona de drop (el `div` que ya existe)
- Cuando se detecta un paste con `e.clipboardData.items` que contiene imágenes:
  - Extraer el `File` con `item.getAsFile()`
  - Nombrar el archivo `paste-{timestamp}.{ext}` donde ext se mapea del MIME type: `image/png→png`, `image/jpeg→jpg`, `image/webp→webp`, resto→`png`
  - Procesar exactamente igual que `handleFiles` — mismo upload a Supabase Storage + insert en `producto_imagenes`
- Actualizar el hint de la zona de drop para incluir: `"También puedes pegar con Ctrl+V"`

**B) Mensaje de orientación post-creación:**
- La zona de drop siempre muestra el texto de ayuda (no solo cuando está vacía)
- Cuando `items.length === 0` (sin imágenes aún), mostrar un banner amarillo suave arriba de la galería:
  `"Producto guardado. Ahora agrega las imágenes aquí."`
  El banner desaparece automáticamente en cuanto `items.length > 0` (reactivo al estado local, no al prop `initial`).

### Archivos
| Acción | Ruta |
|---|---|
| Modificar | `components/admin/forms/ProductoImagenesGaleria.tsx` |
