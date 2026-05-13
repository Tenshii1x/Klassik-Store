# Klassik Store

Tienda online de Klassik Store ([@klassikstore.pa](https://instagram.com/klassikstore.pa)).

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4 con tokens de marca (CSS-based theming via `@theme`)
- Supabase (Postgres + Auth + Storage)
- Deploy: Vercel

## Setup local

1. Copiar variables de entorno:
   ```bash
   cp .env.local.example .env.local
   ```
   Rellenar con los valores del proyecto Supabase.

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Dev server:
   ```bash
   npm run dev
   ```

   Abrir [http://localhost:3000](http://localhost:3000).

## Tests

```bash
npm test            # unit tests (Vitest)
npm run test:e2e    # end-to-end (Playwright)
```

## Estructura

- `app/` — rutas Next.js (App Router)
  - `app/admin/` — panel admin (protegido por `proxy.ts`)
  - resto — catálogo público
- `components/ui/` — primitivos (Button, Input, Card, Badge)
- `components/admin/` — específicos de admin (Sidebar, Topbar)
- `components/brand/` — Logo, Divider
- `lib/supabase/` — clients (server, browser, middleware) tipados con Database
- `lib/types/database.ts` — tipos generados de Supabase
- `supabase/migrations/` — schema SQL

## Documentación

- Spec del sistema: `docs/superpowers/specs/2026-05-12-klassik-store-design.md`
- Planes de implementación: `docs/superpowers/plans/`

## Regla de oro

Los clientes finales JAMÁS deben enterarse de que los productos vienen de Temu. Esta regla aplica a UI, copy, estados, empaque. El admin sí ve todo (interno).
