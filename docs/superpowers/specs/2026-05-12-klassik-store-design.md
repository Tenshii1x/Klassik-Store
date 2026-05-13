# Klassik Store — Diseño de la nueva plataforma

**Fecha:** 2026-05-12
**Estado:** Aprobado en brainstorming, pendiente de plan de implementación.
**Audiencia:** ingeniero/IA que implementará el sistema.

---

## 1. Contexto y problema

Klassik Store ([@klassikstore.pa](https://instagram.com/klassikstore.pa)) es una tienda online en Panamá operada por una sola persona. Modelo: revende productos de Temu como tienda boutique con marca propia.

**Catálogo actual:** un solo archivo `index.html` de ~1 MB con productos, imágenes en base64 y código JS embebidos. Es virtualmente inmantenible: subir un producto nuevo requiere editar el HTML a mano, convertir imágenes a base64 e incrustar todo. La dueña describe la experiencia como "muy complicado subir productos".

**Lo que vamos a construir:** una nueva plataforma con tres piezas — un panel admin, un catálogo público y una extensión de Chrome — sobre Supabase + Next.js + Vercel, en sus planes gratuitos. Se construye por fases para tener algo usable rápido.

### Regla de oro innegociable

**Los clientes finales jamás deben enterarse de que los productos vienen de Temu.** Esta regla aplica a UI, copy de marketing, estados de pedido, comunicaciones, empaque físico, e imágenes de producto. Cualquier propuesta que exponga el origen al cliente debe rediseñarse. El admin sí muestra todo (interno).

---

## 2. Stack técnico

| Capa | Tecnología | Plan | Razón |
|---|---|---|---|
| Base de datos | Supabase Postgres | Free tier | Suficiente para cientos de productos y decenas de pedidos/mes; escalable si crece. |
| Auth admin | Supabase Auth | Free tier | Login email/password. RLS para permisos. |
| Storage de imágenes/videos | Supabase Storage | Free tier (1 GB) | CDN incluido. Descargamos imágenes de Temu a este storage para tener control y evitar links rotos. |
| Frontend (admin + catálogo) | Next.js 14+ (App Router) | n/a | Una sola app, dos zonas: `/admin/*` (autenticada) y `/*` (pública). |
| Hosting | Vercel | Free tier (Hobby) | Deploy desde Git, CDN global, SSL. |
| Extensión Chrome | Manifest V3, vanilla JS + bundler ligero | n/a | Comunicación directa a Supabase con API key restringida. |
| Email transaccional (Fase 2+) | Resend | Free 100/día | Confirmaciones, waitlist, recibos. |
| Dominio | Subdominio Vercel temporal (`klassikstore.vercel.app`) | Gratis | Comprar dominio propio después. |

**Por qué Next.js y no algo más simple:** SSR mejora SEO y velocidad de primera carga (clave para conversión). Comparte componentes entre admin y catálogo público. Image optimization built-in. Deploy a Vercel en un click.

**Por qué un solo repo y una sola app:** menos infraestructura que mantener, mismo deploy, mismo dominio, componentes compartidos (botones, tipografía, layout). El admin se protege por middleware + RLS de Supabase.

---

## 3. Identidad visual (marca)

Validada con la dueña en brainstorming. Detalles completos están en la memoria del proyecto; resumen:

- **Paleta:** negro profundo (`#0a0a0a`, `#141414` superficies) + dorado (`#c9a86a` primario, `#e6c887` brillante, `#8b7340` profundo). Rose-gold (`#d4a594`) como acento para secciones femeninas (relojes mujer, belleza).
- **Tipografías:**
  - `Cormorant Garamond` — titulares, nombres de producto, precios.
  - `Cinzel` — logo y wordmark.
  - `Inter` — body, UI, navegación.
- **Estilo:** minimalismo luxury. Mucha respiración, gradientes radiales dorados sobre negro, bordes muy sutiles, sombras profundas en hover, letra espaciada (`letter-spacing` generoso) en eyebrows y CTAs.
- **Tono de voz:** poético, evocativo. Taglines como "Lujo que se siente. Precio que sorprende.", "Elegancia que enamora". Nombres de producto inventados ("Royal Blue", "Pink Diamond", "Ruby Queen") en vez de descripciones técnicas.
- **Logo:** círculo negro con borde dorado, monograma "KS" en Cinzel.

El admin hereda esta marca con menos densidad visual (más data-dense, menos respiración) pero conserva paleta y tipografías para sentir consistencia.

---

## 4. Arquitectura general

```
                    ┌─────────────────────────────┐
                    │   SUPABASE (backend)        │
                    │  ┌──────────┐ ┌──────────┐  │
                    │  │ Postgres │ │ Storage  │  │
                    │  └──────────┘ └──────────┘  │
                    │  ┌──────────┐                │
                    │  │   Auth   │                │
                    │  └──────────┘                │
                    └──────────┬──────────────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
   ┌────────▼────────┐  ┌──────▼────────┐  ┌──────▼──────────┐
   │ Extensión       │  │ Panel Admin   │  │ Catálogo público │
   │ Chrome          │  │ /admin/*      │  │ /                │
   │ (Manifest V3)   │  │ Auth required │  │ Acceso libre     │
   └─────────────────┘  └───────────────┘  └──────────────────┘
       en tu navegador     en Vercel           en Vercel
```

**Decisiones clave de arquitectura:**

1. **Una sola Next.js app** sirve admin y público bajo el mismo dominio. Las rutas `/admin/*` están protegidas por middleware Next.js que verifica sesión Supabase.
2. **No hay servidor propio** — Supabase es el único backend. Next.js renderiza y consume Supabase via su SDK.
3. **RLS (Row Level Security) en Supabase** controla permisos:
   - Tablas de productos publicados: lectura pública.
   - Tablas de configuración pública (banner, datos de tienda): lectura pública.
   - Todo lo demás: solo usuario autenticado con rol admin.
4. **Extensión Chrome se autentica con API key restringida** (no la `service_role`). Solo permite insertar productos en estado `borrador` — nunca publicar directamente.
5. **Imágenes/videos se descargan a Supabase Storage** al importar — NUNCA se enlazan al CDN de Temu. Razón doble: las URLs de Temu pueden caducar, y necesitamos limpiar watermarks antes de servirlas al cliente.

---

## 5. Modelo de datos

### Tablas

#### `secciones`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `nombre` | text | Ej. "Relojes" |
| `slug` | text unique | Ej. "relojes" |
| `imagen_portada` | text | URL en Storage |
| `descripcion_corta` | text | Ej. "Para él y para ella. Piezas que cuentan más que el tiempo." |
| `orden` | int | Para ordenar en menú |
| `tono` | text | `dark-gold` \| `rose-gold` \| `blue-cool` — afecta acentos visuales |
| `activa` | bool | |
| `created_at`, `updated_at` | timestamp | |

#### `subsecciones`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `seccion_id` | uuid FK | |
| `nombre` | text | Ej. "Para Él" |
| `slug` | text | |
| `orden` | int | |

#### `productos`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `seccion_id` | uuid FK | |
| `subseccion_id` | uuid FK nullable | |
| `nombre` | text | Nombre evocativo ("Royal Blue") |
| `nombre_temu` | text | Nombre original (interno, debugging) |
| `descripcion` | text | Markdown permitido |
| `slug` | text unique | URL amigable |
| `modelo` | text | Código interno ej. "RB-001" |
| `modo` | text | `stock` \| `preorden` |
| `stock_unidades` | int nullable | Solo si modo=stock |
| `costo_temu` | numeric | USD, lo que paga al supplier |
| `costo_envio_unitario` | numeric | USD, estimado importación |
| `precio_venta` | numeric | USD, al cliente |
| `precio_anterior` | numeric nullable | Para tachar en oferta |
| `margen_override_porcentaje` | int nullable | Si no, se usa margen global |
| `temu_url` | text | Solo interno |
| `temu_goods_id` | text | Solo interno |
| `notas_internas` | text | Solo admin ve |
| `estado` | text | `borrador` \| `publicado` \| `archivado` |
| `destacado` | bool | Aparece en home |
| `etiquetas` | text[] | Tags adicionales: ["regalo-perfecto", "bajo-30", "nuevo"] |
| `fecha_llegada_inicio` | date nullable | Para pre-orden: "llega entre X y Y" |
| `fecha_llegada_fin` | date nullable | |
| `solo_para_ella` | bool | Filtro femenino |
| `solo_para_el` | bool | Filtro masculino |
| `created_at`, `updated_at`, `published_at` | timestamp | |

#### `producto_imagenes`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `producto_id` | uuid FK | |
| `url` | text | URL en Supabase Storage |
| `orden` | int | 0 = portada |
| `tipo` | text | `imagen` \| `video` |
| `watermark_limpio` | bool | true si se procesó para eliminar marcas Temu |

#### `producto_variantes`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `producto_id` | uuid FK | |
| `tipo` | text | "Color", "Talla", "Modelo" |
| `valor` | text | "Burdeos / Oro", "M", "XL" |
| `precio_extra` | numeric | 0 por defecto |
| `stock_unidades` | int nullable | Stock por variante (override stock del producto) |
| `imagen_url` | text nullable | Imagen específica para esta variante |

#### `configuracion`
Tabla de una sola fila (singleton). Si crece, se podría refactor pero por ahora simple.

| Campo | Tipo | Notas |
|---|---|---|
| `nombre_tienda` | text | "Klassik Store" |
| `logo_url` | text | |
| `whatsapp` | text | Número con código país, ej. "50760000000" |
| `instagram_handle` | text | "@klassikstore.pa" |
| `instagram_url` | text | |
| `yappy_numero` | text | |
| `yappy_qr_url` | text | Imagen QR en Storage |
| `banco_nombre` | text | |
| `banco_cuenta` | text | |
| `banco_titular` | text | |
| `banco_tipo` | text | "Ahorro" / "Corriente" |
| `margen_global_porcentaje` | int | Ej. 60 |
| `proxima_fecha_llegada_inicio` | date | Para pre-ordenes sin fecha propia |
| `proxima_fecha_llegada_fin` | date | |
| `banner_activo` | bool | Si la tira promo está visible |
| `banner_texto` | text | "Envío gratis arriba de $40" |
| `banner_cta_texto` | text nullable | "Ver más" |
| `banner_cta_url` | text nullable | |
| `banner_color` | text | Hex |
| `politica_devoluciones` | text | Markdown |
| `politica_privacidad` | text | Markdown |
| `terminos_condiciones` | text | Markdown |
| `mensaje_preorden` | text | Copy al cliente sobre pre-orden, genérico |

#### `etiquetas`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `nombre` | text | "Regalo Perfecto" |
| `slug` | text | "regalo-perfecto" |
| `color` | text | Hex para badge |

#### `usuarios_admin`
Gestionado por Supabase Auth. Una tabla `profiles` ligera referenciando `auth.users` puede tener `rol` (`owner` \| `staff`) y `nombre`.

#### `productos_relacionados` (asociación manual)
| Campo | Tipo |
|---|---|
| `producto_id` | uuid FK |
| `relacionado_id` | uuid FK |
| `orden` | int |

#### `combos` (bundles)
| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `nombre` | text | "Set Para Pareja: Royal Blue + Pink Diamond" |
| `descripcion` | text | |
| `precio_combo` | numeric | Precio total con descuento |
| `imagen_url` | text | |
| `activo` | bool | |

#### `combo_productos`
| Campo | Tipo |
|---|---|
| `combo_id` | uuid FK |
| `producto_id` | uuid FK |
| `cantidad` | int |

#### `waitlist`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `producto_id` | uuid FK | |
| `variante_id` | uuid FK nullable | |
| `email` | text | |
| `creado_en` | timestamp | |
| `notificado_en` | timestamp nullable | |

#### `suscriptores_newsletter`
| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `email` | text unique | |
| `cupon_bienvenida_usado` | bool | |
| `creado_en` | timestamp | |

#### `pedidos` (Fase 1, versión simplificada)
La tabla existe desde Fase 1 porque la dueña necesita registrar manualmente los pedidos que recibe por WhatsApp para poder agrupar el "próximo pedido a Temu". El cliente no interactúa con ella en Fase 1.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `codigo_publico` | text unique | Generado, ej. "KS-2025-0142" |
| `nombre_cliente` | text | Ingresado manualmente por la dueña en Fase 1 |
| `whatsapp_cliente` | text | |
| `metodo_pago` | text | `yappy` \| `transferencia` \| `50_50` |
| `comprobante_url` | text nullable | Fase 2 cliente sube; Fase 1 dueña puede adjuntar manual |
| `total` | numeric | |
| `notas_internas` | text | Visible solo admin |
| `estado_interno` | text | `nuevo` \| `deposito_recibido` \| `pendiente_pedir_supplier` \| `pedido_a_supplier` \| `llegado_pais` \| `listo_entrega` \| `entregado` \| `cancelado` |
| `created_at`, `updated_at` | timestamp | |

Nota: no hay `estado_publico` ni vista de tracking para el cliente. El cliente recibe info por WhatsApp manualmente; el sistema solo organiza para la dueña.

#### `pedido_items` (Fase 1)
| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid PK | |
| `pedido_id` | uuid FK | |
| `producto_id` | uuid FK | |
| `variante_id` | uuid FK nullable | |
| `nombre_snapshot` | text | Nombre al momento de venta |
| `precio_snapshot` | numeric | Precio al momento de venta |
| `cantidad` | int | |
| `modo` | text | `stock` \| `preorden` (snapshot del modo al momento) |

### Tablas adicionales para Fase 2

Documentadas aquí para coherencia futura, NO se construyen en Fase 1:

- `reviews` (producto_id, cliente, rating, texto, foto, aprobado).
- `referidos` (codigo, dueño, usos, créditos).
- `cupones` (codigo, tipo, valor, uso máximo, fecha vencimiento).
- Extensión de `pedidos` con `estado_publico`, integración de checkout, automatización de transiciones.

---

## 6. Catálogo público (UX)

### Estructura de rutas
- `/` — Home
- `/seccion/[slug]` — Sección (con o sin subsecciones)
- `/seccion/[slug]/[subseccion]` — Subsección
- `/producto/[slug]` — Producto individual
- `/para-ella` y `/para-el` — vistas filtradas (atajo por género)
- `/etiqueta/[slug]` — productos con esa etiqueta
- `/buscar?q=...` — resultados de búsqueda
- `/carrito` — vista carrito completo (también disponible como drawer)
- `/contacto`, `/como-comprar`, `/politicas` — páginas estáticas
- `/404`

### Home (`/`)
- Header sticky: logo · nav (Inicio / Catálogo / Para Él / Para Ella / Contacto) · iconos (búsqueda, wishlist, carrito con contador)
- Banner promocional administrable (si está activo) en barra superior
- **Hero:** título serif grande con palabras en dorado itálico ("Lujo que **se siente**. Precio que **sorprende**."), eyebrow ("Entrega inmediata · Pre-orden disponible"), 2 CTAs (primary y ghost), visual radial dorado a la derecha. En mobile se apila vertical.
- **Trust strip:** 4 valores con iconos (Diseños que impresionan / Calidad que acompaña / Precios que sorprenden / Entrega confiable)
- **Bloque de secciones** — grid 3 columnas (1 en mobile), cada card con fondo radial según `tono` de la sección, overlay oscuro inferior con eyebrow "— 01 —", nombre, descripción corta, conteo y flecha →
- **Destacados de la semana** — productos con `destacado=true`, máximo 6
- **Recién llegados** — últimos 6 productos publicados
- **Bloque tono femenino** "Elegancia que enamora" — CTA a `/para-ella` con paleta rose-gold sobre negro
- **Footer:**
  - Columna 1: logo + tagline + redes sociales
  - Columna 2: links a secciones
  - Columna 3: ayuda (Cómo comprar, Contacto)
  - Columna 4: políticas (Devoluciones, Privacidad, Términos)
  - Barra inferior: métodos de pago (Yappy, transferencia, efectivo)

### Sección (`/seccion/[slug]`)
- Hero pequeño con nombre y descripción de sección, fondo radial según tono
- Si tiene subsecciones: chips/cards de subsecciones arriba
- **Filtros:** rango de precio, modo (stock / pre-orden), variantes disponibles, etiquetas
- **Ordenamiento:** Destacados / Precio asc / Precio desc / Más nuevos
- Grid de productos con paginación (no infinite scroll)

### Producto (`/producto/[slug]`)
Layout grid 2 columnas (1 en mobile):

**Columna izquierda (sticky en desktop):**
- Galería de imágenes con thumbnails verticales
- Zoom on hover
- Si hay video, se intercala como uno de los items
- Indicadores de Pre-orden / Stock visibles

**Columna derecha:**
- Migas de pan: Inicio / Sección / Producto
- Nombre grande serif
- Precio grande dorado con precio anterior tachado (si existe `precio_anterior`)
- Badge de modo: `En stock — entrega 2-3 días` o `Pre-orden — tu producto va a estar llegando entre [fecha_inicio] y [fecha_fin]`
- Descripción corta (1-2 líneas)
- Selector de variantes (chips para color, dropdown para talla — depende del tipo)
- Selector de cantidad
- Botón "Agregar al carrito" — deshabilitado si variante agotada
- Wishlist heart inline
- Trust microcopy: "Entrega confiable", "Calidad garantizada"

**Debajo (2 columnas se vuelven 1):**
- Descripción larga (markdown rendered)
- Productos relacionados (4 cards horizontales)

### Carrito (drawer + página completa)
Misma lógica que el actual:
- Items con thumbnail, variante, qty +/-, eliminar
- Subtotal
- En Fase 1: botón "Hacer pedido por WhatsApp" → abre WhatsApp con resumen formateado
- En Fase 2: botón "Continuar al checkout" → flujo nativo
- Vaciar carrito

### Búsqueda
- Full-text sobre `nombre`, `descripcion`, `nombre_temu`, `etiquetas`
- Filtros aplicables a resultados

### Páginas estáticas
- `/como-comprar` — explica modo stock, pre-orden ("tu producto va a estar llegando entre X y Y", sin mencionar nada de origen), métodos de pago
- `/contacto` — datos, IG, WhatsApp
- `/politicas` — tres tabs o secciones: Privacidad / Términos / Devoluciones

### Elementos persistentes
- **Botón flotante WhatsApp** (bottom-right en mobile, bottom-right o bottom-left en desktop) con tooltip "¿Tienes dudas? Escríbenos"
- **Wishlist persistente** en localStorage. Si en Fase 2 hay cuenta de cliente, se sincroniza.
- **Carrito persistente** en localStorage.
- **Banner promocional** condicional en barra superior.

### Captura de email con descuento
Popup discreto que aparece tras 8 segundos en la primera visita (controlado con cookie). Diseño respeta marca (negro + dorado + serif). "Únete y recibe 10% off en tu primera compra." Email + botón. Inscritos quedan en `suscriptores_newsletter`.

---

## 7. Panel admin (UX)

### Rutas
- `/admin/login` — formulario simple (email + password)
- `/admin` — dashboard con métricas y accesos rápidos
- `/admin/productos` — lista y editor
- `/admin/productos/nuevo` — crear manual
- `/admin/productos/[id]` — editar
- `/admin/proximo-pedido` — vista "productos pre-orden pendientes de comprar al supplier"
- `/admin/pedidos` — lista de pedidos (entrada manual en Fase 1, cliente-driven en Fase 2)
- `/admin/pedidos/nuevo` — formulario manual para registrar pedido recibido por WhatsApp (Fase 1)
- `/admin/pedidos/[id]` — detalle y avance de estado interno
- `/admin/secciones`
- `/admin/etiquetas`
- `/admin/combos`
- `/admin/destacados`
- `/admin/configuracion`
- `/admin/configuracion/banner`
- `/admin/configuracion/legales`
- `/admin/usuarios` (Fase 2+ si hay staff)

### Layout
- **Sidebar** colapsable en mobile, fija en desktop:
  - Grupo Catálogo: Productos / Secciones / Destacados / Etiquetas / Combos
  - Grupo Ventas: Pedidos (entrada manual en Fase 1) / Próximo pedido / (Fase 2) Reportes
  - Grupo Operación: Importador Temu
  - Grupo Config: Tienda / Banner / Legales / Usuarios
- **Main** con topbar (título contextual + acciones) + content
- Marca KS-Admin coherente: paleta dark+gold, tipografías iguales, pero densidad mayor que catálogo público

### Dashboard
- Stats cards: Publicados / Borradores / En stock / Pre-orden
- Accesos rápidos: Importar de Temu / Nuevo producto / Ver pendientes
- Lista de actividad reciente

### Productos
**Lista:**
- Búsqueda + filtros (sección, modo, estado, etiqueta)
- Tabla con: thumbnail · nombre+modelo · sección · modo (badge) · estado (badge) · precio · acciones
- **Bulk operations:** checkbox por fila + barra de acciones cuando hay selección — publicar, archivar, aplicar margen, asignar sección, exportar.
- Borradores resaltados en amarillo

**Editor:**
- Dividido en 2 columnas (1 en mobile):

*Columna izquierda — datos*
- Nombre (con sugerencia automática si el nombre actual viene de Temu — usa IA si está disponible, sino solo placeholder)
- Descripción (textarea con preview markdown; opcional "generar con IA" en Fase 2)
- Sección + subsección
- Modelo (código interno, autogenerado sugerido)
- Toggle Stock / Pre-orden
- Stock units (si stock) o fechas de llegada inicio/fin (si pre-orden — vacío usa la fecha global de configuración)
- Costo Temu / Costo envío / Precio venta — con cálculo de margen visible y override
- Variantes editables en filas
- Etiquetas (multi-select desde tabla `etiquetas`)
- Productos relacionados (multi-select con preview)
- Notas internas (textarea, no se muestra al cliente)

*Columna derecha — multimedia + meta*
- Galería de imágenes/videos (drag para reordenar, hover para eliminar, click para reemplazar)
- Botón "Agregar imagen / video"
- Para imágenes importadas con `watermark_limpio=false`, badge "Pendiente de limpiar"
- **Vista previa del card** como se ve en catálogo
- Opciones: Destacar / Para Él / Para Ella
- Estado: borrador / publicado / archivado
- Acciones: Guardar borrador / Publicar / Duplicar / Archivar

*Pie:*
- Auto-guardado (indica "guardado hace N segundos")
- Botón principal Publicar (o Guardar cambios si ya está publicado)

### Pedidos (Fase 1 — entrada manual)
- Lista de pedidos con búsqueda y filtros por estado interno
- Crear pedido manual: nombre cliente, WhatsApp, agregar items desde catálogo (autocompletar), método de pago, total
- Editor de pedido: avanzar estado interno, adjuntar comprobante manualmente, agregar notas
- Estado interno define en qué punto está; la dueña lo avanza con un click

### Próximo pedido a Temu
Vista crítica del flujo de pre-orden, derivada automáticamente de `pedidos`:
- Agrupa por producto todos los items pre-orden de pedidos con `estado_interno` en `[deposito_recibido, pendiente_pedir_supplier]`
- Por cada producto: cantidad total a pedir, clientes a los que va, costo total a invertir
- Acción "Marcar como pedido a Temu" → todos los items relacionados avanzan a `pedido_a_supplier`
- Botón "Exportar lista (CSV)" para tener a mano cuando vas a hacer la compra

### Secciones
- Lista con drag para reordenar
- Editor por sección: nombre, slug, descripción corta, imagen de portada (upload), tono (dropdown: dark-gold / rose-gold / blue-cool), activa
- Sub-tab: subsecciones de esa sección

### Etiquetas
- Lista simple: nombre, slug, color (color picker), conteo de productos
- Crear / editar / borrar

### Combos
- Lista de combos activos
- Editor: nombre, descripción, productos incluidos (con cantidades), precio del combo, imagen

### Destacados
- Vista visual: grid de productos publicados, con toggle de "destacado" por click
- Hasta N destacados visibles en home (configurable, default 6)

### Configuración
- Datos de tienda: nombre, logo, WhatsApp, Instagram
- Datos de pago: Yappy número y QR, Banco datos
- Margen global %, fecha global de próxima llegada
- Mensaje genérico pre-orden

### Banner promocional
- Toggle activo
- Texto + CTA opcional + URL
- Color de fondo (picker)
- Preview en vivo

### Legales
- 3 editores markdown: Privacidad / Términos / Devoluciones
- Botón "Restaurar plantilla de Panamá" para empezar con texto razonable y editarlo

### Importador Temu (vista de origen)
- Listado de las últimas importaciones recientes con estado (importado / publicado / archivado)
- Botón "Importar manualmente con URL" como fallback si la extensión falla
- Status de la extensión: "Última actividad detectada hace 3 min"

---

## 8. Extensión Chrome

### Tecnología
- Manifest V3
- Vanilla JS + bundler ligero (esbuild o Vite)
- No usa frameworks pesados para mantener bundle pequeño

### Permisos requeridos
- `activeTab` (acceso a la pestaña activa solo cuando el usuario clickea el botón)
- `scripting` (inyectar el content script al hacer click)
- `storage` (guardar URL del admin de Supabase + API key)
- Host permission: `https://*.temu.com/*`

### Componentes

**Popup (cuando click al ícono):**
- Si la pestaña actual NO es una página de producto de Temu: mensaje "Abre un producto de Temu para importar"
- Si lo es: botón grande "Importar a Klassik Store" + vista previa de los datos detectados (imagen, nombre, precio)
- Footer: configuración (URL admin + API key), última importación

**Content script (inyectado al click):**
- Extrae del DOM ya renderizado:
  - `goods_id` (desde URL o `__INITIAL_PROPS__` si está disponible)
  - Título
  - Precio actual + precio anterior si hay
  - Descripción
  - URLs de todas las imágenes (galería principal)
  - URL de video si existe
  - Variantes (colores, tallas con sus imágenes propias)
- Si Temu cambia su DOM y algún selector falla: el script intenta selectores alternativos antes de rendirse
- Si todo falla: muestra mensaje "No pude leer este producto. Pega la URL en el admin para hacerlo manualmente."

**Background service worker:**
- Recibe los datos del content script
- Hace upload a Supabase usando API key restringida
- Llama una función edge `import_temu_product` que:
  1. Crea el producto en `productos` con `estado='borrador'`
  2. Descarga cada imagen/video desde la URL de Temu a Supabase Storage
  3. Crea registros en `producto_imagenes` apuntando a las URLs nuevas
  4. Crea variantes en `producto_variantes`
  5. Procesa imágenes para detectar/limpiar watermarks (ver siguiente sección)
- Devuelve URL al admin para revisar

### Limpieza de watermarks (Fase 1)

Las imágenes de Temu suelen tener watermarks discretos (logo Temu, badges de descuento, marca de agua) que delatan el origen. Estrategia:

1. **Detección heurística:** al descargar, ejecutar pasada con visión por IA (Cloudflare Workers AI o OpenAI Vision si está disponible) para detectar regiones con logos/texto Temu.
2. **Acciones automáticas según severidad:**
   - Watermark pequeño en esquina → crop automático al área limpia.
   - Watermark grande / central → marcar `watermark_limpio=false`, badge "Pendiente de limpiar" en admin, no se puede publicar.
3. **Fallback manual en admin:** si la detección no es confiable, la dueña puede:
   - Subir una versión limpia (la edita aparte)
   - Aplicar un crop manual con preview en el editor
   - Reemplazar con foto propia (si tiene el producto físico)
4. **Bloqueo de publicación:** un producto no puede pasar de `borrador` a `publicado` si tiene imágenes con `watermark_limpio=false`. Sale aviso claro en admin.

### Plan B
Si Temu cambia su sitio y rompe la extensión:
- El admin tiene una opción "Importar manualmente con URL"
- Pegando la URL, llama a un endpoint serverless que intenta extraer con headless browser (Playwright) — éste puede fallar pero al menos saca la imagen del compartir
- Si todo falla, el admin permite crear el producto en blanco y pegar datos a mano

### Distribución de la extensión

La dueña no tiene experiencia técnica. La instalación NO puede ser "abre developer mode y carga descomprimida". Opciones:

1. **Chrome Web Store (recomendado).** Subir como aplicación privada (unlisted) con link directo. Costo único $5 de registro de cuenta de desarrollador. La dueña solo hace click en "Añadir a Chrome" y listo. Esto requiere review de Google (1-3 días). El sitio queda solo accesible con link directo, no en búsquedas públicas.

2. **Archivo `.crx` empaquetado.** Generamos un archivo descargable e instructions con captures. La dueña descarga el archivo y arrastra a `chrome://extensions/`. No requiere review pero Chrome muestra warnings de "extensión externa" — molesto.

3. **Si crece a múltiples usuarios (staff)**: pasarela al Web Store es la única forma escalable.

Decisión: empezar con opción 1 (Web Store privada). El registro de $5 lo asume el proyecto.

---

## 9. Flujos clave

### Flujo 1 — Importar producto de Temu
1. Dueña navega a Temu logueada como siempre.
2. Abre un producto que quiere revender.
3. Click en ícono de extensión KS en la barra de Chrome.
4. Popup muestra preview de lo detectado; click "Importar".
5. Datos viajan a Supabase, imágenes/video se descargan al Storage.
6. Producto queda en `borrador` en admin.
7. Notificación toast: "Producto importado. Click para revisar."
8. Dueña entra al editor, ajusta nombre (a estilo evocativo), descripción, sección, margen.
9. Click "Publicar" → producto visible en catálogo público.

### Flujo 2 — Cliente compra (Fase 1)
1. Cliente entra al catálogo, navega, agrega al carrito (un producto en stock + uno en pre-orden).
2. Abre carrito (drawer), ve resumen, click "Hacer pedido por WhatsApp".
3. Se abre WhatsApp con mensaje formateado: items, cantidades, precios, total, indicación de qué es pre-orden y la fecha estimada de llegada ("Tu producto va a estar llegando entre 20 mayo y 27 mayo").
4. Dueña recibe en WhatsApp, coordina pago y datos manualmente.

### Flujo 3 — Cliente compra (Fase 2 — pedido en sitio)
1-2. Igual.
3. Click "Continuar al checkout".
4. Formulario: nombre, WhatsApp, dirección/zona, método pago (Yappy / transferencia / 50% Yappy+50% efectivo).
5. Muestra datos de pago según método (QR Yappy o cuenta banco). Cliente paga aparte y vuelve.
6. Sube comprobante (imagen o PDF). Click "Confirmar pedido".
7. Pedido queda en `pedidos` con estado interno `nuevo_con_comprobante`. Estado público: `Pedido recibido`.
8. Dueña recibe email/notificación (o lo ve en admin). Verifica comprobante. Cambia estado.

### Flujo 4 — Operación pre-orden (Fase 1)
1. Llegan pedidos pre-orden durante la semana por WhatsApp. La dueña los registra manualmente en `/admin/pedidos/nuevo` con `estado_interno=deposito_recibido` (o `nuevo` si aún no se ha pagado).
2. Dueña entra a `/admin/proximo-pedido` y ve agrupado todos los productos pre-orden pendientes de comprar al supplier (agrupados desde items de pedidos con `estado_interno` en `[deposito_recibido, pendiente_pedir_supplier]`).
3. Hace la compra al supplier manualmente.
4. En `/admin/proximo-pedido` marca "Pedido confirmado al supplier" → los pedidos afectados avanzan a `estado_interno=pedido_a_supplier`.
5. Cuando llega físicamente al país, dueña abre cada pedido, marca progresivamente: `llegado_pais` → `listo_entrega`.
6. Coordina entrega vía WhatsApp manualmente.
7. Marca `entregado` cuando se entregó y se cobró el 100%.

Nota: en Fase 1 toda la comunicación con el cliente sigue siendo manual por WhatsApp; el sistema solo organiza información interna para la dueña.

### Flujo 5 — Crear sección
1. Admin > Secciones > Nueva sección.
2. Nombre, slug (auto-generado, editable), descripción corta, sube imagen de portada, elige tono visual.
3. Guarda → ya aparece en navegación y home.

### Flujo 6 — Activar promoción con banner
1. Admin > Configuración > Banner.
2. Toggle activo, escribe texto "Pre-orden con 10% off esta semana", color dorado profundo, CTA "Ver más" → `/etiqueta/pre-orden`.
3. Guarda → cliente ve banner en la barra superior inmediatamente (Supabase realtime, sin recarga).

### Flujo 7 — Cliente se une a waitlist (Fase 2)
1. Cliente entra a producto agotado.
2. En vez de botón comprar, ve "Avísame cuando llegue".
3. Pone email.
4. Cuando dueña actualiza stock > 0, sistema dispara email automático "Tu favorito acaba de llegar — Pink Diamond ya está disponible. Es por orden de llegada".

---

## 10. Manejo de errores y casos límite

### Importación de Temu
- **Temu cambia DOM** → la extensión muestra error claro, sugiere usar fallback de URL manual, registra el error para diagnóstico.
- **Imagen no descarga** → se reintenta 2 veces; si falla, el producto se crea con imagen vacía y badge "Imagen faltante" en admin.
- **Producto duplicado por `temu_goods_id`** → el admin avisa "este producto ya existe (RB-001)" antes de crear duplicado; permite forzar o cancelar.
- **API key revocada / expirada** → extensión muestra mensaje y link al admin para regenerar.

### Catálogo público
- **Producto eliminado pero en wishlist/carrito del cliente** → se muestra como "Producto no disponible" con opción de removerlo.
- **Variante agotada después de agregar al carrito** → al intentar checkout se muestra alerta y opción de cambiar variante.
- **Imagen no carga** → fallback a placeholder dorado con logo KS.
- **Sin conexión** → el carrito persiste en localStorage; al volver online sincroniza si hay sesión.

### Admin
- **Cambio de precio mientras el cliente está pagando** (Fase 2) → el pedido se crea con el precio que vio el cliente (snapshot en `pedido_items`), no con el actual.
- **Eliminar sección con productos** → bloquear; sugerir archivar productos o moverlos primero.
- **Eliminar producto con pedidos abiertos** → bloquear; sugerir archivar.
- **Sesión expirada en medio de edición** → guardar borrador local + redirigir a login + restaurar al volver.

### Pre-orden
- **Cliente pregunta por su pedido por WhatsApp** → la dueña tiene visibilidad completa en `/admin/proximo-pedido` y `/admin/pedidos`. Responde con copy genérico.
- **Llegó el envío pero falta producto** → admin permite marcar parcial; los faltantes vuelven a `Próximo pedido`.

---

## 11. Performance, accesibilidad, SEO

### Performance
- Imágenes servidas como `<Image>` de Next.js con AVIF/WebP automático y lazy loading.
- Server Components por default; Client Components solo para interactividad (carrito, filtros, búsqueda).
- Caché agresivo de catálogo público con revalidación bajo demanda cuando admin publica/edita (`revalidateTag` de Next).
- Objetivo: Lighthouse mobile ≥ 90 en performance/accessibility/SEO, LCP < 2.5 s.
- Bundle JS inicial < 200 KB.

### Accesibilidad
- Contraste mínimo 4.5:1 para texto sobre fondo oscuro (dorado sobre negro pasa).
- Navegación por teclado en todos los flows críticos.
- Alt text en todas las imágenes (autogenerado desde nombre + descripción si no se provee).
- Form labels asociados a inputs en admin y checkout (Fase 2).
- `prefers-reduced-motion` respetado en animaciones.

### SEO
- Meta título y descripción por producto (autogenerados desde campos).
- Open Graph (imagen, título, precio) — link compartido en WhatsApp se ve pro.
- Schema.org `Product` con precio, disponibilidad, marca (Klassik Store).
- Sitemap dinámico `/sitemap.xml`.
- `robots.txt` permitiendo crawl del catálogo público y bloqueando `/admin/*`.
- URLs amigables vía `slug`.

---

## 12. Testing

### Cobertura propuesta (Fase 1)
- **Unit tests** (Vitest): funciones puras — cálculo de margen, validaciones de form, generación de slug, generación de código de pedido.
- **Integration tests** (Vitest + Supabase local): operaciones CRUD principales con RLS aplicado, agrupación de "próximo pedido" desde `pedido_items`.
- **E2E críticos** (Playwright) — escenarios mínimos:
  1. Login admin, crear sección, crear producto manual, publicar, ver en catálogo.
  2. Importación desde extensión (mock de Temu) — verificar limpieza de watermark bloqueando publicación.
  3. Cliente navega home → sección → producto → agrega al carrito → click WhatsApp con mensaje formateado correcto.
  4. Búsqueda y filtros devuelven resultados correctos.
  5. Wishlist persiste tras recarga.
  6. Admin: bulk publish funciona.
  7. Admin: crear pedido manual con items pre-orden, aparece en `/admin/proximo-pedido`, marcar como pedido al supplier avanza estados.
  8. Banner promocional cambia y se refleja en home.

### No-test
- Componentes de presentación pura (visuales) — se verifican manualmente en preview de Vercel.
- Tests de la extensión Chrome contra Temu real: imposibles de mantener por cambios del sitio externo; solo tests del content script con HTML fixture.

---

## 13. Fases del proyecto

### Fase 1 — La base utilizable
**Objetivo:** dueña puede subir productos fácilmente y los clientes pueden comprar (vía WhatsApp temporal).

Incluye:
- Setup completo (Supabase, schema, RLS, Next.js, Vercel, dominio temporal)
- Admin: dashboard, productos (lista + editor + bulk + costo real + notas), secciones, etiquetas, combos, destacados, **pedidos manuales**, próximo-pedido, importador Temu vista, configuración (tienda, pagos, banner, legales)
- Extensión Chrome (publicada en Web Store privada) con fallback "URL manual"
- Limpieza automática de watermarks en imágenes importadas con fallback manual en admin
- Catálogo público: home, sección, producto, búsqueda, carrito + WhatsApp checkout
- Banner administrable
- Wishlist con localStorage
- Botón flotante WhatsApp en catálogo
- Footer con políticas
- Captura de email con descuento (`suscriptores_newsletter`)
- Backup/export (CSV de productos + ZIP de imágenes)
- Tests críticos
- Migración: **NO** se hace; se empieza de cero

### Fase 2 — Pedidos en sitio y crecimiento
- Schema y admin de pedidos (estados internos + estados públicos neutros)
- Checkout en sitio con subida de comprobante
- Reviews (con moderación admin)
- Programa de referidos
- Cupones simples
- Bundles (combos) en frontend
- Waitlist para agotados con email automático
- Productos relacionados en página de producto
- Newsletter / email marketing básico
- Cancelación / refund parcial (con regla del 50%)

### Fase 3 — Pulido y autoridad
- Push notifications web
- PWA (instalable)
- Galería UGC (fotos de clientes aprobadas)
- Pixel de Meta + Schema.org + analytics
- Multi-usuario admin con roles (owner / staff)
- Email transaccional completo
- Auditoría de cambios

---

## 14. Riesgos conocidos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Temu cambia su DOM y rompe la extensión | Alta (mensual) | Medio | Selectores múltiples + fallback URL manual + bot de monitoreo opcional |
| Imagen importada de Temu tiene watermark visible | Alta | Alto (rompe regla de oro) | Proceso de limpieza (crop / replace) antes de publicar; badge "pendiente de limpiar" en admin |
| Free tier Supabase insuficiente al crecer | Media | Bajo | Plan Pro $25/mes desbloquea más storage y compute. Costo asumible si hay ventas. |
| Cliente menciona Temu en WhatsApp / review | Media | Alto | Reviews tienen moderación admin antes de publicar. Templates de WhatsApp evitan menciones. |
| Subscripción de Resend (email) sobrepasa free tier | Baja | Bajo | 100 emails/día es suficiente para Fase 2. Si crece, plan pago barato. |
| Pago de Yappy no llega y cliente reclama | Baja | Medio | Comprobante es obligatorio antes de marcar pedido confirmado. Dueña verifica manualmente. |
| Producto agotado por descontrol de stock | Media | Medio | Notificación admin cuando un producto llega a stock 1. Stock se decrementa solo. |

---

## 15. Notas de implementación

- **Internacionalización:** no se hace. Todo en español de Panamá.
- **Moneda:** USD (Panamá usa Balboa/USD a paridad). Formato `$XX.XX`.
- **Timezone:** America/Panama (UTC-5). Mostrar fechas en formato local.
- **Imágenes:** procesar con Sharp en server side (Next.js Image lo hace automáticamente).
- **Slugs:** generar con librería como `slugify`, manteniendo unique check en BD.
- **Markdown en descripciones:** usar `react-markdown` con sanitización (sin scripts).
- **Secrets:** API keys de Supabase nunca en cliente expuesto; service_role solo en server side. Extensión usa anon key + RLS estricto.

---

## 16. Aprobaciones

- [x] Stack técnico
- [x] Modelo de negocio (stock + pre-orden, 50% + 100%, regla del no-revelar-Temu)
- [x] Identidad visual
- [x] Catálogo público UX
- [x] Admin UX
- [x] Modo por fases
- [x] Lista de extras incorporados (1-9 + A, B, C en Fase 1; 11, 12, 13, 15 + D, E, F en Fase 2; G en Fase 3)
- [x] Descartado: migración del catálogo actual; tracking público; WhatsApp automatizado
- [ ] **Revisión final del spec por el usuario**

