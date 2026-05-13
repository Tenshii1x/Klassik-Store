# Klassik Store · Plan 01 — Cimientos · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establecer la base técnica del proyecto — Next.js app, Supabase con schema completo de Fase 1, autenticación admin, tokens de marca y layouts compartidos — para que los planes siguientes solo agreguen features encima.

**Architecture:** Una app Next.js 14 (App Router) con TypeScript. Una zona pública (`/`) y una zona admin (`/admin/*`) protegida por middleware que verifica sesión Supabase. Supabase Postgres es el único backend, con RLS controlando permisos. Brand tokens centralizados en Tailwind config para que toda la UI los herede.

**Tech Stack:** Next.js 14, TypeScript (strict), Tailwind CSS, Supabase JS SDK (`@supabase/ssr`), Vitest (unit), Playwright (E2E), npm como package manager. Google Fonts para tipografías. Lucide React para íconos.

**Result at end of Plan 01:** Dueña navega a `localhost:3000/admin/login`, ingresa email/password, ve un dashboard vacío con la marca aplicada (sidebar con navegación visible pero sin funcionalidad). Schema completo de Fase 1 está en Supabase con RLS activo. Deploy a Vercel funcionando con subdominio `*.vercel.app`.

**Spec reference:** `docs/superpowers/specs/2026-05-12-klassik-store-design.md` secciones 2, 3, 4, 5, 7.

---

## File Structure

```
WEB KS/
├── app/
│   ├── layout.tsx                 (root layout — fonts, providers)
│   ├── globals.css                (Tailwind directives + brand CSS vars)
│   ├── page.tsx                   (homepage stub — "Coming soon")
│   ├── admin/
│   │   ├── layout.tsx             (admin shell con sidebar + topbar)
│   │   ├── page.tsx               (dashboard — empty placeholder)
│   │   └── login/
│   │       └── page.tsx           (login form)
│   └── auth/
│       └── callback/
│           └── route.ts           (Supabase auth callback handler)
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   └── badge.tsx
│   ├── admin/
│   │   ├── sidebar.tsx
│   │   └── topbar.tsx
│   └── brand/
│       ├── logo.tsx               (KS circle logo component)
│       └── divider.tsx            (— gold divider —)
├── lib/
│   ├── supabase/
│   │   ├── server.ts              (server client factory)
│   │   ├── browser.ts             (browser client factory)
│   │   └── middleware.ts          (middleware client + session helper)
│   ├── types/
│   │   └── database.ts            (generated Supabase types)
│   └── utils.ts                   (cn() classname helper)
├── supabase/
│   ├── migrations/
│   │   ├── 20260512000000_schema.sql
│   │   └── 20260512000001_rls.sql
│   └── seed.sql                   (insert configuracion row con defaults)
├── tests/
│   ├── unit/
│   │   └── utils.test.ts          (sanity test)
│   └── e2e/
│       └── login.spec.ts          (login flow E2E)
├── public/
│   └── logo-ks.svg                (placeholder)
├── middleware.ts                  (auth middleware en root)
├── tailwind.config.ts
├── tsconfig.json
├── next.config.mjs
├── postcss.config.mjs
├── vitest.config.ts
├── playwright.config.ts
├── package.json
├── package-lock.json
├── .env.local.example
├── .env.local                     (gitignored)
├── .gitignore
└── README.md
```

---

## Pre-requisites (manual, fuera del repo)

Antes de empezar las tareas de código:

- [ ] **Manual A: Crear cuenta y proyecto Supabase**

1. Ir a [https://supabase.com](https://supabase.com) y crear cuenta (free tier).
2. Crear un nuevo proyecto: nombre `klassik-store`, password robusto, región `us-east-1` (más cerca a Panamá).
3. Esperar 2-3 minutos a que se aprovisione.
4. Anotar de la sección "Project Settings → API":
   - `Project URL` (https://xxxxx.supabase.co)
   - `anon public` key
   - `service_role` key (mantener secreta)

- [ ] **Manual B: Crear cuenta Vercel y conectar GitHub**

1. Ir a [https://vercel.com](https://vercel.com) y crear cuenta con GitHub.
2. Aún no importar el repo — lo haremos al final del plan.

- [ ] **Manual C: Verificar Node.js y npm instalados**

```bash
node --version    # debe ser >= 20
npm --version    # viene incluido con Node, debe responder con un número
```

---

## Task 1: Inicializar repo y Next.js

**Files:**
- Create: `package.json` (vía scaffold)
- Create: `tsconfig.json`
- Create: `next.config.mjs`
- Create: `.gitignore`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`

- [ ] **Step 1.1: Inicializar git en el directorio**

```bash
cd "C:/Users/HP EliteBook/OneDrive/Documentos/WEB KS"
git init
git branch -m main
```

- [ ] **Step 1.2: Crear `.gitignore` antes de cualquier instalación**

Escribir `.gitignore`:

```gitignore
# dependencies
node_modules
# (intencionalmente sin .pnpm-store ya que usamos npm)

# next.js
.next
out
dist

# production
build

# env
.env*.local
.env

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# testing
coverage
playwright-report
playwright/.cache
test-results

# editor
.vscode
.idea

# os
.DS_Store
Thumbs.db

# superpowers
.superpowers/

# supabase
.branches
.temp
```

- [ ] **Step 1.3: Scaffold Next.js**

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir=false --import-alias="@/*" --no-eslint --use-npm
```

Cuando pregunte si sobrescribir archivos existentes (`.gitignore`), responder **No**.

- [ ] **Step 1.4: Limpiar archivos default**

Borrar:
- `app/favicon.ico` (lo reemplazamos después)
- Cualquier `app/logo.svg` o asset default
- Vaciar `public/` excepto subcarpetas

Reemplazar `app/page.tsx` con un stub mínimo:

```tsx
export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-gold-primary">
      <p className="font-serif text-2xl">Klassik Store · Coming Soon</p>
    </main>
  )
}
```

Reemplazar `app/layout.tsx`:

```tsx
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Klassik Store",
  description: "Lujo que se siente. Precio que sorprende.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  )
}
```

- [ ] **Step 1.5: Verificar el setup**

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000). Debe verse "Klassik Store · Coming Soon" (puede salir sin estilos aún, los configuramos en Task 2).

Detener el servidor (Ctrl+C).

- [ ] **Step 1.6: Commit**

```bash
git add .
git commit -m "chore: scaffold Next.js app with TypeScript and Tailwind"
```

---

## Task 2: Configurar Tailwind con tokens de marca

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `app/globals.css`
- Modify: `app/layout.tsx` (cargar fuentes)
- Create: `lib/utils.ts`

- [ ] **Step 2.1: Instalar dependencias de UI**

```bash
npm install clsx tailwind-merge lucide-react
```

- [ ] **Step 2.2: Crear `lib/utils.ts`**

```ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}
```

- [ ] **Step 2.3: Reemplazar `tailwind.config.ts` con tokens de marca**

```ts
import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // brand
        black: {
          DEFAULT: "#0a0a0a",
          soft: "#141414",
          surface: "#1a1a1a",
        },
        gold: {
          primary: "#c9a86a",
          bright: "#e6c887",
          deep: "#8b7340",
        },
        cream: "#f5efe3",
        "rose-gold": "#d4a594",
        // ui semantic
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#ef4444",
        info: "#3b82f6",
        muted: "#888888",
        border: "rgba(201, 168, 106, 0.12)",
        "border-strong": "rgba(201, 168, 106, 0.3)",
      },
      fontFamily: {
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
        display: ["var(--font-cinzel)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        eyebrow: "0.22em",
        wider: "0.18em",
        widest: "0.4em",
      },
      boxShadow: {
        "gold-glow": "0 12px 30px rgba(201, 168, 106, 0.25)",
        "gold-glow-lg": "0 18px 40px rgba(201, 168, 106, 0.4)",
        "deep": "0 30px 80px rgba(0, 0, 0, 0.6)",
      },
      backgroundImage: {
        "gradient-gold": "linear-gradient(135deg, #e6c887 0%, #c9a86a 100%)",
        "radial-gold": "radial-gradient(circle at 50% 40%, rgba(201,168,106,0.4), transparent 60%)",
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 2.4: Reemplazar `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    @apply bg-black text-white;
  }
  body {
    @apply font-sans antialiased;
  }
}

@layer components {
  .eyebrow {
    @apply text-xs tracking-eyebrow uppercase font-medium text-gold-primary;
  }
  .heading-display {
    @apply font-serif font-medium;
  }
}
```

- [ ] **Step 2.5: Configurar fuentes Google en `app/layout.tsx`**

```tsx
import type { Metadata } from "next"
import { Cormorant_Garamond, Cinzel, Inter } from "next/font/google"
import "./globals.css"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
})

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cinzel",
  display: "swap",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Klassik Store",
  description: "Lujo que se siente. Precio que sorprende.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${cormorant.variable} ${cinzel.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 2.6: Verificar visualmente**

```bash
npm run dev
```

Recargar `localhost:3000`. Texto debería verse en dorado sobre negro, con fuente serif Cormorant. Detener.

- [ ] **Step 2.7: Commit**

```bash
git add .
git commit -m "feat: configure Tailwind with brand tokens and Google Fonts"
```

---

## Task 3: Componentes UI primitivos

**Files:**
- Create: `components/ui/button.tsx`
- Create: `components/ui/input.tsx`
- Create: `components/ui/card.tsx`
- Create: `components/ui/badge.tsx`
- Create: `components/brand/logo.tsx`
- Create: `components/brand/divider.tsx`

- [ ] **Step 3.1: Crear `components/ui/button.tsx`**

```tsx
import { cn } from "@/lib/utils"
import { ButtonHTMLAttributes, forwardRef } from "react"

type Variant = "primary" | "ghost" | "danger"
type Size = "sm" | "md" | "lg"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-gold text-black hover:shadow-gold-glow-lg hover:-translate-y-0.5",
  ghost:
    "bg-transparent text-white border border-white/20 hover:border-gold-primary hover:text-gold-primary",
  danger:
    "bg-danger text-white hover:opacity-90",
}

const sizes: Record<Size, string> = {
  sm: "px-3 py-2 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-9 py-4 text-xs tracking-eyebrow uppercase font-bold",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "rounded font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
)
Button.displayName = "Button"
```

- [ ] **Step 3.2: Crear `components/ui/input.tsx`**

```tsx
import { cn } from "@/lib/utils"
import { InputHTMLAttributes, forwardRef } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full bg-black border border-border rounded-md px-3.5 py-2.5",
        "text-white text-sm placeholder:text-muted",
        "focus:outline-none focus:border-gold-primary transition-colors",
        className
      )}
      {...props}
    />
  )
)
Input.displayName = "Input"
```

- [ ] **Step 3.3: Crear `components/ui/card.tsx`**

```tsx
import { cn } from "@/lib/utils"
import { HTMLAttributes, forwardRef } from "react"

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-black-surface border border-border rounded-xl",
        className
      )}
      {...props}
    />
  )
)
Card.displayName = "Card"

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-5 border-b border-border", className)} {...props} />
  )
)
CardHeader.displayName = "CardHeader"

export const CardBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-5", className)} {...props} />
  )
)
CardBody.displayName = "CardBody"
```

- [ ] **Step 3.4: Crear `components/ui/badge.tsx`**

```tsx
import { cn } from "@/lib/utils"
import { HTMLAttributes } from "react"

type Tone = "success" | "info" | "warning" | "danger" | "gold" | "neutral"

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

const tones: Record<Tone, string> = {
  success: "bg-success/15 text-success",
  info: "bg-info/15 text-info",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
  gold: "bg-gold-primary/15 text-gold-primary border border-gold-primary/35",
  neutral: "bg-white/5 text-muted",
}

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide",
        tones[tone],
        className
      )}
      {...props}
    />
  )
}
```

- [ ] **Step 3.5: Crear `components/brand/logo.tsx`**

```tsx
import { cn } from "@/lib/utils"

interface LogoProps {
  size?: "sm" | "md" | "lg"
  withWordmark?: boolean
  className?: string
}

const sizes = {
  sm: { circle: "w-9 h-9", text: "text-xs" },
  md: { circle: "w-12 h-12", text: "text-base" },
  lg: { circle: "w-16 h-16", text: "text-lg" },
}

export function Logo({ size = "md", withWordmark = true, className }: LogoProps) {
  const s = sizes[size]
  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <div
        className={cn(
          "rounded-full bg-black border border-gold-primary flex items-center justify-center font-display font-semibold text-gold-primary",
          s.circle
        )}
      >
        KS
      </div>
      {withWordmark && (
        <div>
          <div className={cn("font-display tracking-widest text-white", s.text)}>
            KLASSIK
          </div>
          <div className="text-[0.55rem] tracking-widest text-gold-primary mt-0.5">
            — STORE —
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3.6: Crear `components/brand/divider.tsx`**

```tsx
import { cn } from "@/lib/utils"

interface DividerProps {
  text?: string
  className?: string
}

export function Divider({ text, className }: DividerProps) {
  if (!text) {
    return (
      <div className={cn("h-px bg-border my-6", className)} />
    )
  }
  return (
    <div className={cn("flex items-center gap-3 my-6", className)}>
      <div className="flex-1 h-px bg-border" />
      <span className="eyebrow">— {text} —</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}
```

- [ ] **Step 3.7: Smoke test — agregar render de prueba a homepage**

Reemplazar `app/page.tsx`:

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Logo } from "@/components/brand/logo"
import { Divider } from "@/components/brand/divider"

export default function HomePage() {
  return (
    <main className="min-h-screen p-12 max-w-2xl mx-auto space-y-6">
      <Logo size="lg" />
      <h1 className="heading-display text-5xl">Lujo que <em className="text-gold-primary">se siente</em></h1>
      <Divider text="Coming Soon" />
      <Card>
        <CardHeader>
          <h2 className="font-serif text-2xl">Card Test</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          <Input placeholder="Test input" />
          <div className="flex gap-2 flex-wrap">
            <Badge tone="success">Stock</Badge>
            <Badge tone="info">Pre-orden</Badge>
            <Badge tone="warning">Borrador</Badge>
            <Badge tone="gold">Destacado</Badge>
          </div>
          <div className="flex gap-2">
            <Button>Primary</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
        </CardBody>
      </Card>
    </main>
  )
}
```

- [ ] **Step 3.8: Verificar visualmente**

```bash
npm run dev
```

Abrir `localhost:3000`. Verificar:
- Logo KS dorado en círculo
- Tagline en serif con "se siente" itálico dorado
- Card con input estilado
- Badges en colores correctos
- Botones con hover funcionando

Detener.

- [ ] **Step 3.9: Commit**

```bash
git add .
git commit -m "feat: add UI primitives (button, input, card, badge) and brand components (logo, divider)"
```

---

## Task 4: Variables de entorno y Supabase clients

**Files:**
- Create: `.env.local.example`
- Create: `.env.local` (NO commit)
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/browser.ts`
- Create: `lib/supabase/middleware.ts`

- [ ] **Step 4.1: Instalar Supabase SDK**

```bash
npm install @supabase/ssr @supabase/supabase-js
```

- [ ] **Step 4.2: Crear `.env.local.example`**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key

# Server-only (NEVER expose to client)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 4.3: Crear `.env.local` con valores reales**

Copiar `.env.local.example` a `.env.local` y rellenar con los valores que anotaste en Manual A (pre-requisites).

```bash
cp .env.local.example .env.local
```

Editar `.env.local` con valores reales del proyecto Supabase. **Verificar que `.env.local` está en `.gitignore`.**

- [ ] **Step 4.4: Crear `lib/supabase/browser.ts`**

```ts
import { createBrowserClient } from "@supabase/ssr"

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 4.5: Crear `lib/supabase/server.ts`**

```ts
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll en server components fuera de route handler no es soportado
          }
        },
      },
    }
  )
}
```

- [ ] **Step 4.6: Crear `lib/supabase/middleware.ts`**

```ts
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Protect /admin/* except /admin/login
  if (pathname.startsWith("/admin") && pathname !== "/admin/login" && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/admin/login"
    return NextResponse.redirect(url)
  }

  // Redirect logged-in users away from login
  if (pathname === "/admin/login" && user) {
    const url = request.nextUrl.clone()
    url.pathname = "/admin"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

- [ ] **Step 4.7: Crear `middleware.ts` en la raíz**

```ts
import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase/middleware"

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
```

- [ ] **Step 4.8: Smoke test — el dev server arranca sin errores**

```bash
npm run dev
```

Si no hay errores en consola y `localhost:3000` carga, está OK. Detener.

- [ ] **Step 4.9: Commit**

```bash
git add .
git commit -m "feat: add Supabase SSR client setup (browser, server, middleware)"
```

---

## Task 5: Migración SQL — schema completo Fase 1

**Files:**
- Create: `supabase/migrations/20260512000000_schema.sql`
- Create: `supabase/seed.sql`

- [ ] **Step 5.1: Crear directorio supabase**

```bash
mkdir -p supabase/migrations
```

- [ ] **Step 5.2: Escribir `supabase/migrations/20260512000000_schema.sql`**

Crear el archivo con TODO el schema de Fase 1. (Comando completo abajo — copiar tal cual.)

```sql
-- Klassik Store · Schema inicial Fase 1
-- 2026-05-12

-- Extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists secciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null unique,
  imagen_portada text,
  descripcion_corta text,
  orden int not null default 0,
  tono text not null default 'dark-gold' check (tono in ('dark-gold', 'rose-gold', 'blue-cool')),
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists subsecciones (
  id uuid primary key default gen_random_uuid(),
  seccion_id uuid not null references secciones(id) on delete cascade,
  nombre text not null,
  slug text not null,
  orden int not null default 0,
  created_at timestamptz not null default now(),
  unique (seccion_id, slug)
);

create table if not exists etiquetas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null unique,
  color text not null default '#c9a86a',
  created_at timestamptz not null default now()
);

create table if not exists productos (
  id uuid primary key default gen_random_uuid(),
  seccion_id uuid references secciones(id) on delete set null,
  subseccion_id uuid references subsecciones(id) on delete set null,
  nombre text not null,
  nombre_temu text,
  descripcion text,
  slug text not null unique,
  modelo text,
  modo text not null default 'preorden' check (modo in ('stock', 'preorden')),
  stock_unidades int,
  costo_temu numeric(10,2) not null default 0,
  costo_envio_unitario numeric(10,2) not null default 0,
  precio_venta numeric(10,2) not null default 0,
  precio_anterior numeric(10,2),
  margen_override_porcentaje int,
  temu_url text,
  temu_goods_id text,
  notas_internas text,
  estado text not null default 'borrador' check (estado in ('borrador', 'publicado', 'archivado')),
  destacado boolean not null default false,
  etiquetas text[] not null default '{}',
  fecha_llegada_inicio date,
  fecha_llegada_fin date,
  solo_para_ella boolean not null default false,
  solo_para_el boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index idx_productos_estado on productos(estado);
create index idx_productos_destacado on productos(destacado) where estado = 'publicado';
create index idx_productos_seccion on productos(seccion_id) where estado = 'publicado';
create index idx_productos_temu_goods on productos(temu_goods_id);

create table if not exists producto_imagenes (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos(id) on delete cascade,
  url text not null,
  orden int not null default 0,
  tipo text not null default 'imagen' check (tipo in ('imagen', 'video')),
  watermark_limpio boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_producto_imagenes_producto on producto_imagenes(producto_id);

create table if not exists producto_variantes (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos(id) on delete cascade,
  tipo text not null,
  valor text not null,
  precio_extra numeric(10,2) not null default 0,
  stock_unidades int,
  imagen_url text,
  orden int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_producto_variantes_producto on producto_variantes(producto_id);

create table if not exists productos_relacionados (
  producto_id uuid not null references productos(id) on delete cascade,
  relacionado_id uuid not null references productos(id) on delete cascade,
  orden int not null default 0,
  primary key (producto_id, relacionado_id),
  check (producto_id <> relacionado_id)
);

create table if not exists combos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  precio_combo numeric(10,2) not null,
  imagen_url text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists combo_productos (
  combo_id uuid not null references combos(id) on delete cascade,
  producto_id uuid not null references productos(id) on delete cascade,
  cantidad int not null default 1 check (cantidad > 0),
  primary key (combo_id, producto_id)
);

create table if not exists configuracion (
  id int primary key default 1,
  nombre_tienda text not null default 'Klassik Store',
  logo_url text,
  whatsapp text,
  instagram_handle text,
  instagram_url text,
  yappy_numero text,
  yappy_qr_url text,
  banco_nombre text,
  banco_cuenta text,
  banco_titular text,
  banco_tipo text,
  margen_global_porcentaje int not null default 60 check (margen_global_porcentaje >= 0),
  proxima_fecha_llegada_inicio date,
  proxima_fecha_llegada_fin date,
  banner_activo boolean not null default false,
  banner_texto text,
  banner_cta_texto text,
  banner_cta_url text,
  banner_color text default '#c9a86a',
  politica_devoluciones text,
  politica_privacidad text,
  terminos_condiciones text,
  mensaje_preorden text default 'Tu producto va a estar llegando entre las fechas indicadas. Te avisamos por WhatsApp cuando esté listo para entrega.',
  updated_at timestamptz not null default now(),
  constraint configuracion_singleton check (id = 1)
);

create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  codigo_publico text not null unique,
  nombre_cliente text not null,
  whatsapp_cliente text,
  metodo_pago text check (metodo_pago in ('yappy', 'transferencia', '50_50', 'efectivo')),
  comprobante_url text,
  total numeric(10,2) not null default 0,
  notas_internas text,
  estado_interno text not null default 'nuevo' check (estado_interno in (
    'nuevo',
    'deposito_recibido',
    'pendiente_pedir_supplier',
    'pedido_a_supplier',
    'llegado_pais',
    'listo_entrega',
    'entregado',
    'cancelado'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_pedidos_estado on pedidos(estado_interno);

create table if not exists pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  producto_id uuid references productos(id) on delete set null,
  variante_id uuid references producto_variantes(id) on delete set null,
  nombre_snapshot text not null,
  precio_snapshot numeric(10,2) not null,
  cantidad int not null default 1 check (cantidad > 0),
  modo text not null check (modo in ('stock', 'preorden')),
  created_at timestamptz not null default now()
);

create index idx_pedido_items_pedido on pedido_items(pedido_id);
create index idx_pedido_items_producto on pedido_items(producto_id);

create table if not exists waitlist (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos(id) on delete cascade,
  variante_id uuid references producto_variantes(id) on delete cascade,
  email text not null,
  creado_en timestamptz not null default now(),
  notificado_en timestamptz,
  unique (producto_id, variante_id, email)
);

create table if not exists suscriptores_newsletter (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  cupon_bienvenida_usado boolean not null default false,
  creado_en timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text,
  rol text not null default 'owner' check (rol in ('owner', 'staff')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- TRIGGERS for updated_at
-- ============================================================

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_secciones_updated_at before update on secciones
  for each row execute function update_updated_at_column();

create trigger trg_productos_updated_at before update on productos
  for each row execute function update_updated_at_column();

create trigger trg_combos_updated_at before update on combos
  for each row execute function update_updated_at_column();

create trigger trg_pedidos_updated_at before update on pedidos
  for each row execute function update_updated_at_column();

create trigger trg_configuracion_updated_at before update on configuracion
  for each row execute function update_updated_at_column();

-- ============================================================
-- Auto-create profile on user signup
-- ============================================================

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, rol)
  values (new.id, 'owner');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
```

- [ ] **Step 5.3: Escribir `supabase/migrations/20260512000001_rls.sql`**

```sql
-- RLS policies para Klassik Store

-- ============================================================
-- ENABLE RLS
-- ============================================================
alter table secciones enable row level security;
alter table subsecciones enable row level security;
alter table etiquetas enable row level security;
alter table productos enable row level security;
alter table producto_imagenes enable row level security;
alter table producto_variantes enable row level security;
alter table productos_relacionados enable row level security;
alter table combos enable row level security;
alter table combo_productos enable row level security;
alter table configuracion enable row level security;
alter table pedidos enable row level security;
alter table pedido_items enable row level security;
alter table waitlist enable row level security;
alter table suscriptores_newsletter enable row level security;
alter table profiles enable row level security;

-- ============================================================
-- HELPER: check if user is admin (owner or staff)
-- ============================================================
create or replace function is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from profiles
    where id = auth.uid()
    and rol in ('owner', 'staff')
  );
end;
$$ language plpgsql security definer;

-- ============================================================
-- PUBLIC READ policies (catálogo)
-- ============================================================

-- Secciones activas, públicas
create policy "secciones lectura pública" on secciones
  for select using (activa = true);

create policy "subsecciones lectura pública" on subsecciones
  for select using (
    exists (select 1 from secciones where secciones.id = subsecciones.seccion_id and secciones.activa = true)
  );

create policy "etiquetas lectura pública" on etiquetas
  for select using (true);

-- Productos publicados
create policy "productos lectura pública" on productos
  for select using (estado = 'publicado');

create policy "producto_imagenes lectura pública" on producto_imagenes
  for select using (
    exists (select 1 from productos where productos.id = producto_imagenes.producto_id and productos.estado = 'publicado')
    and watermark_limpio = true
  );

create policy "producto_variantes lectura pública" on producto_variantes
  for select using (
    exists (select 1 from productos where productos.id = producto_variantes.producto_id and productos.estado = 'publicado')
  );

create policy "productos_relacionados lectura pública" on productos_relacionados
  for select using (
    exists (select 1 from productos where productos.id = productos_relacionados.producto_id and productos.estado = 'publicado')
  );

create policy "combos lectura pública" on combos
  for select using (activo = true);

create policy "combo_productos lectura pública" on combo_productos
  for select using (
    exists (select 1 from combos where combos.id = combo_productos.combo_id and combos.activo = true)
  );

-- Configuración: solo campos públicos legibles (en práctica, leemos todo y filtramos en server)
-- Pero la fila es legible para que el frontend pueda mostrar banner, redes, etc.
create policy "configuracion lectura pública" on configuracion
  for select using (true);

-- ============================================================
-- PUBLIC INSERT policies (waitlist, newsletter)
-- ============================================================
create policy "waitlist insert público" on waitlist
  for insert with check (true);

create policy "newsletter insert público" on suscriptores_newsletter
  for insert with check (true);

-- ============================================================
-- ADMIN policies (full access para usuarios admin)
-- ============================================================
create policy "admin all secciones" on secciones for all using (is_admin()) with check (is_admin());
create policy "admin all subsecciones" on subsecciones for all using (is_admin()) with check (is_admin());
create policy "admin all etiquetas" on etiquetas for all using (is_admin()) with check (is_admin());
create policy "admin all productos" on productos for all using (is_admin()) with check (is_admin());
create policy "admin all producto_imagenes" on producto_imagenes for all using (is_admin()) with check (is_admin());
create policy "admin all producto_variantes" on producto_variantes for all using (is_admin()) with check (is_admin());
create policy "admin all productos_relacionados" on productos_relacionados for all using (is_admin()) with check (is_admin());
create policy "admin all combos" on combos for all using (is_admin()) with check (is_admin());
create policy "admin all combo_productos" on combo_productos for all using (is_admin()) with check (is_admin());
create policy "admin all configuracion" on configuracion for all using (is_admin()) with check (is_admin());
create policy "admin all pedidos" on pedidos for all using (is_admin()) with check (is_admin());
create policy "admin all pedido_items" on pedido_items for all using (is_admin()) with check (is_admin());
create policy "admin all waitlist" on waitlist for all using (is_admin()) with check (is_admin());
create policy "admin all newsletter" on suscriptores_newsletter for all using (is_admin()) with check (is_admin());

create policy "admin all profiles select" on profiles for select using (is_admin() or id = auth.uid());
create policy "admin all profiles update" on profiles for update using (is_admin());
```

- [ ] **Step 5.4: Escribir `supabase/seed.sql`**

```sql
-- Datos iniciales necesarios para arrancar
-- Se ejecuta una sola vez después de aplicar el schema.

insert into configuracion (id, nombre_tienda, margen_global_porcentaje, mensaje_preorden)
values (
  1,
  'Klassik Store',
  60,
  'Tu producto va a estar llegando entre las fechas indicadas. Te avisamos por WhatsApp cuando esté listo para entrega.'
)
on conflict (id) do nothing;
```

- [ ] **Step 5.5: Aplicar las migraciones en Supabase**

Hay dos formas — elige una:

**Opción A: SQL Editor en Supabase Dashboard (más simple)**
1. Ir a [https://supabase.com/dashboard](https://supabase.com/dashboard) → tu proyecto → SQL Editor
2. Pegar contenido de `supabase/migrations/20260512000000_schema.sql` → Run
3. Pegar contenido de `supabase/migrations/20260512000001_rls.sql` → Run
4. Pegar contenido de `supabase/seed.sql` → Run

**Opción B: Supabase CLI (si está instalada)**
```bash
npm install -g supabase
supabase link --project-ref <tu-project-ref>
supabase db push
```

- [ ] **Step 5.6: Verificar en Supabase Dashboard**

1. Dashboard → Table Editor: deben aparecer todas las tablas (`secciones`, `productos`, `pedidos`, etc.)
2. Dashboard → Authentication → Policies: cada tabla debe mostrar policies definidas
3. Table Editor → `configuracion`: debe haber una fila con `nombre_tienda = "Klassik Store"`

- [ ] **Step 5.7: Commit**

```bash
git add supabase/
git commit -m "feat: add initial Supabase schema with RLS and seed data"
```

---

## Task 6: Generar tipos TypeScript desde Supabase

**Files:**
- Create: `lib/types/database.ts`

- [ ] **Step 6.1: Generar tipos**

Usar uno de los métodos disponibles:

**Opción A: con npx**
```bash
npx supabase gen types typescript --project-id <tu-project-ref> --schema public > lib/types/database.ts
```

**Opción B: dashboard (manual)**
1. Supabase Dashboard → API Docs → Generate types → copy
2. Pegar en `lib/types/database.ts`

- [ ] **Step 6.2: Actualizar clients para usar tipos**

Modificar `lib/supabase/browser.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/lib/types/database"

export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Modificar `lib/supabase/server.ts` para incluir `<Database>` en `createServerClient<Database>(...)`.

Modificar `lib/supabase/middleware.ts` igualmente.

- [ ] **Step 6.3: Sanity check de tipos**

```bash
npx tsc --noEmit
```

Debe terminar sin errores.

- [ ] **Step 6.4: Commit**

```bash
git add .
git commit -m "feat: add typed Supabase clients with generated database types"
```

---

## Task 7: Auth — Login page

**Files:**
- Create: `app/admin/login/page.tsx`
- Create: `app/auth/callback/route.ts`
- Create: `app/admin/login/actions.ts`

- [ ] **Step 7.1: Crear primer usuario admin en Supabase**

Opción manual (más simple):
1. Supabase Dashboard → Authentication → Users → Add user → "Create new user"
2. Email: el email real de la dueña (`angelmorenoperez.18@gmail.com` u otro)
3. Password: uno seguro que la dueña recuerde
4. Marcar "Auto confirm email" para evitar verificación

Verificar que se creó una fila en `profiles` con `rol = 'owner'` (trigger debería hacerlo).

Si no se creó, insertar manual:
```sql
insert into profiles (id, rol) values ('<user-uuid>', 'owner');
```

- [ ] **Step 7.2: Crear `app/admin/login/actions.ts`** (server action de login)

```ts
"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function login(formData: FormData) {
  const email = String(formData.get("email") || "").trim()
  const password = String(formData.get("password") || "")

  if (!email || !password) {
    return { error: "Email y contraseña son requeridos" }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: "Credenciales incorrectas" }
  }

  redirect("/admin")
}

export async function logout() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect("/admin/login")
}
```

- [ ] **Step 7.3: Crear `app/admin/login/page.tsx`**

```tsx
"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardBody } from "@/components/ui/card"
import { Logo } from "@/components/brand/logo"
import { useState, useTransition } from "react"
import { login } from "./actions"

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await login(formData)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-black">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>
        <Card>
          <CardBody className="space-y-5">
            <div className="text-center">
              <h1 className="font-serif text-2xl">Iniciar sesión</h1>
              <p className="text-muted text-sm mt-1">Acceso al panel administrativo</p>
            </div>
            <form action={handleSubmit} className="space-y-4">
              <div>
                <label className="eyebrow block mb-1.5">Email</label>
                <Input name="email" type="email" required autoComplete="email" />
              </div>
              <div>
                <label className="eyebrow block mb-1.5">Contraseña</label>
                <Input name="password" type="password" required autoComplete="current-password" />
              </div>
              {error && (
                <p className="text-danger text-sm">{error}</p>
              )}
              <Button type="submit" size="lg" className="w-full" disabled={isPending}>
                {isPending ? "Verificando..." : "Entrar"}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </main>
  )
}
```

- [ ] **Step 7.4: Crear `app/auth/callback/route.ts`** (Supabase callback handler)

```ts
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/admin"

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/admin/login`)
}
```

- [ ] **Step 7.5: Smoke test — flujo de login**

```bash
npm run dev
```

1. Abrir `localhost:3000/admin` → debe redirigir a `/admin/login`
2. Login page debe verse: logo, card centrado, formulario con dos campos y botón
3. Probar credenciales malas → mensaje "Credenciales incorrectas"
4. Probar credenciales reales → debe redirigir a `/admin` (que aún no existe, dará 404 — OK)
5. Volver a abrir `/admin/login` estando logueado → debe redirigir a `/admin` automáticamente

Detener server.

- [ ] **Step 7.6: Commit**

```bash
git add .
git commit -m "feat: add admin login flow with Supabase auth"
```

---

## Task 8: Admin layout y dashboard vacío

**Files:**
- Create: `app/admin/layout.tsx`
- Create: `app/admin/page.tsx`
- Create: `components/admin/sidebar.tsx`
- Create: `components/admin/topbar.tsx`

- [ ] **Step 8.1: Crear `components/admin/sidebar.tsx`**

```tsx
"use client"

import { cn } from "@/lib/utils"
import { Logo } from "@/components/brand/logo"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Package,
  Tags,
  Star,
  ShoppingBag,
  TrendingUp,
  Truck,
  Settings,
  Download,
} from "lucide-react"

interface NavItem {
  label: string
  href: string
  icon: typeof LayoutDashboard
  badge?: string | number
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const groups: NavGroup[] = [
  {
    title: "General",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    title: "Catálogo",
    items: [
      { label: "Productos", href: "/admin/productos", icon: Package },
      { label: "Secciones", href: "/admin/secciones", icon: Tags },
      { label: "Destacados", href: "/admin/destacados", icon: Star },
      { label: "Etiquetas", href: "/admin/etiquetas", icon: Tags },
      { label: "Combos", href: "/admin/combos", icon: Package },
    ],
  },
  {
    title: "Ventas",
    items: [
      { label: "Pedidos", href: "/admin/pedidos", icon: ShoppingBag },
      { label: "Próximo pedido", href: "/admin/proximo-pedido", icon: Truck },
      { label: "Reportes", href: "/admin/reportes", icon: TrendingUp },
    ],
  },
  {
    title: "Configuración",
    items: [
      { label: "Tienda", href: "/admin/configuracion", icon: Settings },
      { label: "Importador Temu", href: "/admin/importador", icon: Download },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 bg-black border-r border-border min-h-screen flex flex-col">
      <div className="px-5 py-6 border-b border-border">
        <Logo size="sm" />
        <div className="text-[0.6rem] tracking-widest text-gold-primary mt-2">— ADMIN —</div>
      </div>
      <nav className="flex-1 py-4 space-y-6">
        {groups.map((group) => (
          <div key={group.title}>
            <div className="px-5 mb-2 text-[0.62rem] tracking-widest uppercase text-muted font-semibold">
              {group.title}
            </div>
            <ul>
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-5 py-2.5 text-sm transition-colors border-l-2 border-transparent",
                        isActive
                          ? "text-gold-primary bg-gold-primary/5 border-gold-primary"
                          : "text-white/75 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                      {item.badge != null && (
                        <span className="ml-auto bg-gold-primary text-black text-[0.65rem] px-1.5 py-0.5 rounded-full font-bold">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 8.2: Crear `components/admin/topbar.tsx`**

```tsx
import { logout } from "@/app/admin/login/actions"
import { LogOut } from "lucide-react"

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <header className="flex items-center justify-between mb-7">
      <div>
        <h1 className="font-serif text-3xl text-white">{title}</h1>
        {subtitle && (
          <p className="text-muted text-sm mt-1">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-2 px-3 py-2 text-sm text-white/75 hover:text-gold-primary transition-colors"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </form>
      </div>
    </header>
  )
}
```

- [ ] **Step 8.3: Crear `app/admin/layout.tsx`**

```tsx
import { Sidebar } from "@/components/admin/sidebar"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-black">
      <Sidebar />
      <main className="flex-1 p-8 overflow-x-hidden">{children}</main>
    </div>
  )
}
```

- [ ] **Step 8.4: Crear `app/admin/page.tsx`** (dashboard vacío)

```tsx
import { Topbar } from "@/components/admin/topbar"
import { Card, CardBody } from "@/components/ui/card"
import { createSupabaseServerClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()

  const [
    { count: productosPublicados },
    { count: productosBorrador },
    { count: pedidosActivos },
  ] = await Promise.all([
    supabase.from("productos").select("*", { count: "exact", head: true }).eq("estado", "publicado"),
    supabase.from("productos").select("*", { count: "exact", head: true }).eq("estado", "borrador"),
    supabase.from("pedidos").select("*", { count: "exact", head: true }).not("estado_interno", "in", "(entregado,cancelado)"),
  ])

  const stats = [
    { label: "Productos publicados", value: productosPublicados ?? 0 },
    { label: "Borradores pendientes", value: productosBorrador ?? 0 },
    { label: "Pedidos activos", value: pedidosActivos ?? 0 },
  ]

  return (
    <div>
      <Topbar
        title="Dashboard"
        subtitle="Bienvenida de vuelta a Klassik Admin"
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardBody>
              <div className="text-xs tracking-widest uppercase text-muted mb-2">
                {s.label}
              </div>
              <div className="font-serif text-4xl text-white">{s.value}</div>
            </CardBody>
          </Card>
        ))}
      </div>
      <Card>
        <CardBody className="text-center py-16 text-muted">
          <p className="font-serif text-2xl text-white mb-2">Tu admin está vacío</p>
          <p className="text-sm">
            Próximo paso (Plan 02): construir el CRUD de productos, secciones y configuración.
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
```

- [ ] **Step 8.5: Verificar visualmente**

```bash
npm run dev
```

1. Loguearte vía `/admin/login`
2. Llegar al dashboard
3. Ver: sidebar con grupos y links (no funcionales aún), topbar con título + botón cerrar sesión, 3 cards de stats en cero, mensaje "Tu admin está vacío"
4. Click "Cerrar sesión" → vuelve a `/admin/login`

Detener.

- [ ] **Step 8.6: Commit**

```bash
git add .
git commit -m "feat: add admin layout with sidebar, topbar, and empty dashboard"
```

---

## Task 9: Configurar Vitest y test sanity

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/unit/utils.test.ts`
- Modify: `package.json` (add scripts)

- [ ] **Step 9.1: Instalar Vitest**

```bash
npm install -D vitest @vitest/ui happy-dom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 9.2: Crear `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    include: ["tests/unit/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
})
```

- [ ] **Step 9.3: Crear `tests/unit/utils.test.ts`**

```ts
import { describe, it, expect } from "vitest"
import { cn, formatUSD } from "@/lib/utils"

describe("cn", () => {
  it("merges tailwind classes correctly", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4")
  })

  it("handles conditionals", () => {
    expect(cn("base", false && "hidden", "shown")).toBe("base shown")
  })
})

describe("formatUSD", () => {
  it("formats whole numbers", () => {
    expect(formatUSD(28)).toBe("$28.00")
  })

  it("formats decimals", () => {
    expect(formatUSD(28.5)).toBe("$28.50")
  })

  it("formats large numbers with separator", () => {
    expect(formatUSD(1234.56)).toBe("$1,234.56")
  })
})
```

- [ ] **Step 9.4: Agregar scripts a `package.json`**

Editar `package.json` y dentro de `"scripts"` agregar:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "vitest --ui"
```

- [ ] **Step 9.5: Correr tests**

```bash
npm test
```

Expected: `3 passed (3)`.

- [ ] **Step 9.6: Commit**

```bash
git add .
git commit -m "test: configure Vitest with unit tests for utils"
```

---

## Task 10: Configurar Playwright y E2E de login

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/login.spec.ts`
- Modify: `package.json` (add scripts)

- [ ] **Step 10.1: Instalar Playwright**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 10.2: Crear `playwright.config.ts`**

```ts
import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
```

- [ ] **Step 10.3: Crear `tests/e2e/login.spec.ts`**

```ts
import { test, expect } from "@playwright/test"

test.describe("admin login flow", () => {
  test("/admin redirects to /admin/login when not authenticated", async ({ page }) => {
    await page.goto("/admin")
    await expect(page).toHaveURL(/.*\/admin\/login/)
    await expect(page.getByRole("heading", { name: /iniciar sesi/i })).toBeVisible()
  })

  test("shows error on invalid credentials", async ({ page }) => {
    await page.goto("/admin/login")
    await page.getByLabel(/email/i).fill("noexiste@example.com")
    await page.getByLabel(/contraseña/i).fill("wrong-password")
    await page.getByRole("button", { name: /entrar/i }).click()
    await expect(page.getByText(/credenciales incorrectas/i)).toBeVisible()
  })
})
```

- [ ] **Step 10.4: Agregar scripts E2E a `package.json`**

```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

- [ ] **Step 10.5: Agregar a `.gitignore`**

```gitignore
test-results/
playwright-report/
playwright/.cache/
```

(Ya están en el `.gitignore` inicial — verificar.)

- [ ] **Step 10.6: Correr E2E**

```bash
npm run test:e2e
```

Expected: `2 passed`. Si falla, debug con `npm run test:e2e:ui`.

- [ ] **Step 10.7: Commit**

```bash
git add .
git commit -m "test: configure Playwright with E2E tests for login flow"
```

---

## Task 11: README y deploy a Vercel

**Files:**
- Create: `README.md`

- [ ] **Step 11.1: Crear `README.md`**

```markdown
# Klassik Store

Tienda online de Klassik Store ([@klassikstore.pa](https://instagram.com/klassikstore.pa)).

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS con tokens de marca
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
npm test          # unit tests (Vitest)
npm run test:e2e      # end-to-end (Playwright)
```

## Estructura

- `app/` — rutas Next.js (App Router)
  - `app/admin/` — panel admin (protegido)
  - resto — catálogo público
- `components/ui/` — primitivos (Button, Input, Card, Badge)
- `components/admin/` — específicos de admin
- `components/brand/` — Logo, divisores, etc.
- `lib/supabase/` — clients (server, browser, middleware)
- `lib/types/` — tipos generados de Supabase
- `supabase/migrations/` — schema SQL

## Documentación

- Spec del sistema: `docs/superpowers/specs/2026-05-12-klassik-store-design.md`
- Planes de implementación: `docs/superpowers/plans/`
```

- [ ] **Step 11.2: Crear repositorio en GitHub**

1. Ir a [https://github.com/new](https://github.com/new)
2. Nombre: `klassik-store` (privado recomendado)
3. NO inicializar con README/gitignore (ya los tenemos)
4. Crear

Conectar local con remoto:

```bash
git remote add origin https://github.com/<tu-usuario>/klassik-store.git
git push -u origin main
```

- [ ] **Step 11.3: Importar a Vercel**

1. Ir a [https://vercel.com/new](https://vercel.com/new)
2. Import Git Repository → seleccionar `klassik-store`
3. Framework Preset: Next.js (auto-detectado)
4. Root Directory: dejar en blanco
5. Build Command: `npm run build` (default)
6. **Environment Variables** — agregar las 4 de `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` → poner la URL que Vercel asignará después (`https://klassik-store-xxxx.vercel.app`); se puede actualizar después del primer deploy.
7. Deploy

- [ ] **Step 11.4: Verificar deploy**

1. Vercel asigna URL: copiarla.
2. Abrir `https://klassik-store-xxxx.vercel.app` → debe cargar homepage.
3. Abrir `/admin/login` → debe cargar login.
4. Probar credenciales reales → debe entrar al dashboard.
5. Actualizar `NEXT_PUBLIC_SITE_URL` en Vercel con la URL real y redeploy.

- [ ] **Step 11.5: (Opcional) Configurar subdominio `klassikstore.vercel.app`**

En Vercel → Project Settings → Domains → agregar `klassikstore.vercel.app` (si está disponible).

- [ ] **Step 11.6: Commit final**

```bash
git add README.md
git commit -m "docs: add README with stack and setup instructions"
git push
```

---

## Verificación final del Plan 01

Al terminar todas las tareas, verificar manualmente:

- [ ] `npm run dev` levanta sin errores
- [ ] `npm test` pasa todos los unit tests
- [ ] `npm run test:e2e` pasa los E2E
- [ ] `npx tsc --noEmit` no tiene errores de tipos
- [ ] Loguearse al admin local funciona
- [ ] Deploy en Vercel funciona y se puede loguear ahí también
- [ ] Supabase tiene todas las tablas creadas con RLS activo
- [ ] La tabla `configuracion` tiene su fila inicial
- [ ] Existe un usuario admin en `auth.users` con su `profile` en `rol='owner'`
- [ ] No hay claves o secretos en git (revisar con `git log -p | grep -i "service_role\|anon_key"` — no debe haber nada sensible expuesto)

Si todo OK, el Plan 01 está completo y podemos arrancar Plan 02.

---

## Notas para el implementador

1. **Cualquier vez que cambies el schema** de Supabase, regenera los tipos con el comando de Task 6.1 antes de seguir trabajando.

2. **No uses la `service_role` key en el frontend**. Solo va en server-side cuando se necesite saltar RLS (por ahora no se necesita en Plan 01).

3. **Si Tailwind no aplica un color**, revisa que el nombre esté en `tailwind.config.ts`. Algunos colores como `gold-primary` requieren la convención exacta.

4. **Si una redirección de middleware no funciona**, revisa el matcher en `middleware.ts`. Las rutas de archivos estáticos deben excluirse.

5. **Si Playwright falla** porque el dev server no arranca, asegurate de que `npm run dev` funciona manualmente. Verifica `.env.local` está completo.

6. **Antes de cada commit**, corre al menos `npx tsc --noEmit && npm test` para no romper la build de Vercel.
