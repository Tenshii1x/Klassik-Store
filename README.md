# Klassik Store

Tienda online de [Klassik Store](https://klassik-store-one.vercel.app) ([@klassikstore.pa](https://instagram.com/klassikstore.pa)).

## Tabla de contenido

- [Stack](#stack)
- [Setup local](#setup-local)
- [Tests](#tests)
- [Estructura](#estructura)
- [Operación día a día](#operación-día-a-día)
- [Backup](#backup)
- [Variables de entorno](#variables-de-entorno)
- [Despliegue](#despliegue)
- [Regla de oro](#regla-de-oro)

## Stack

- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions)
- **Hosting:** Vercel
- **Extensión Chrome:** Manifest V3 + esbuild (codebase separado en `extension/`)

## Setup local

```bash
git clone https://github.com/Tenshii1x/Klassik-Store
cd Klassik-Store
cp .env.local.example .env.local  # rellenar con valores de Supabase
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Tests

```bash
npm test           # Vitest unit tests
npm run test:e2e   # Playwright E2E
```

Para tests admin E2E, setear:

```bash
E2E_ADMIN_EMAIL=tu@email.com E2E_ADMIN_PASSWORD=tupass npm run test:e2e
```

## Estructura

```
app/
├── (public)/         Catálogo público con su layout (header, footer, banner, cart)
├── admin/            Panel admin protegido por proxy.ts
├── api/              Route handlers (newsletter, etc.)
├── auth/             Callback de Supabase auth
├── sitemap.ts        SEO: sitemap dinámico
├── robots.ts         SEO: robots.txt
└── not-found.tsx     404 personalizado con marca

components/
├── ui/               Primitivos (Button, Input, Card, Badge, NumberInput)
├── brand/            Logo, Divider
├── public/           Catálogo: Header, Footer, ProductoCard, CheckoutForm, etc.
├── admin/            Admin: Sidebar, Topbar, forms, PedidoEstadoMachine, etc.
├── cart/             Carrito persistente (localStorage)
└── wishlist/         Wishlist persistente (localStorage)

lib/
├── supabase/         Clients (server, browser, middleware)
├── catalog/          Queries del catálogo público
├── pedidos/          Reglas de pago, código público
├── validations/      Zod schemas
├── helpers/          slug, margen
├── storage/          Upload helpers
├── rate-limit.ts     Rate limiter in-memory
└── types/            Database types

extension/            Codebase de la extensión Chrome (Manifest V3 + esbuild)
supabase/             Migraciones SQL + Edge Functions (Deno)
docs/superpowers/     Specs y planes de implementación
public/extension/     ZIP descargable de la extensión Chrome
tests/                Vitest unit + Playwright E2E
```

## Operación día a día

### Subir un producto

**Opción A — Manual:**
1. `/admin/productos/nuevo`
2. Llena nombre, sección, costos, sube fotos, marca como limpias
3. Click "Publicar"

**Opción B — Importador de Temu (más rápido):**
1. Asegúrate de tener la extensión Chrome instalada y configurada
2. Navega al producto en temu.com (logueada como siempre)
3. Click el ícono KS → "Importar a Klassik Store"
4. El producto llega como borrador con sus imágenes
5. Marca cada imagen como "Limpia" (sin watermark visible del proveedor)
6. Ajusta nombre evocativo, precio, sección
7. Publica

### Gestionar un pedido

1. Cliente compra en `/checkout` → pedido aparece auto en `/admin/pedidos`
2. Verifica el comprobante en el detalle del pedido
3. Click "Marcar depósito recibido"
4. Si es pre-orden, después de hacer la compra al supplier, ve a `/admin/proximo-pedido`
5. Marca todo como "pedido al supplier" con un click
6. Cuando llegue el producto: avanza a "Llegó al país"
7. Cuando esté listo: "Listo para entregar"
8. Al entregar: marca "Entregado" (stock se decrementa solo)

### Cambiar el banner promocional

`/admin/configuracion/banner` → toggle activo + texto + color + CTA.

### Cambiar margen global

`/admin/configuracion` → campo "Margen global %". Aplica al precio sugerido al subir productos nuevos.

## Backup

`/admin/configuracion/backup` → descarga CSV o JSON con todos tus productos.

**Recomendación:** descarga un backup semanal y guárdalo en Google Drive o similar.

Las imágenes están en Supabase Storage; si Supabase falla, necesitas el backup para reconstruir el catálogo.

## Variables de entorno

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...                  # solo server
NEXT_PUBLIC_SITE_URL=https://klassik-store-one.vercel.app
```

## Despliegue

Cada `git push origin main` dispara deploy automático en Vercel.

### Conectar dominio propio

1. Compra dominio (Namecheap, Cloudflare, etc.)
2. Vercel → Project Settings → Domains → Add
3. Sigue las instrucciones de DNS (registros A + CNAME)
4. Espera propagación (~10 min a 24h)
5. Actualiza `NEXT_PUBLIC_SITE_URL` en Vercel con el dominio nuevo
6. Redeploy

## Regla de oro

Los clientes finales JAMÁS deben enterarse de que los productos vienen de Temu. Esta regla aplica a:

- **UI pública** (nada que mencione Temu)
- **Estados de pedido** (usar copy neutro: "preparación", "tránsito a Panamá")
- **Imágenes** (marcar como "Limpia" solo cuando no tienen watermark del proveedor)
- **Empaque físico** (sin logos del supplier)
- **Comunicación con cliente** (templates de WhatsApp sin menciones)

El admin sí ve todo (URLs originales, costos Temu, notas internas) — es solo para uso interno.

## Documentación adicional

- Specs detallados: `docs/superpowers/specs/2026-05-12-klassik-store-design.md`
- Planes de implementación: `docs/superpowers/plans/` (6 planes)
- Memoria del proyecto (para AI agents): `~/.claude/projects/.../memory/`

## Licencia

Privado. Todos los derechos reservados.
