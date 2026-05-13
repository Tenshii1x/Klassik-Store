# Klassik Store · Plan 04 — Extensión Chrome + Watermarks · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Construir una extensión Chrome que, cuando la dueña esté navegando un producto de Temu logueada con su sesión, le permita importar el producto a su admin en un click. El producto llega como borrador con imágenes descargadas a Supabase Storage (marcadas `watermark_limpio=false`), y la dueña las revisa/marca limpias antes de publicar.

**Architecture:** Tres piezas:

1. **Edge Function en Supabase** (`import_temu_product`) — recibe JSON con datos del producto, crea row en `productos`, descarga imágenes desde URLs de Temu a Storage, crea variantes.
2. **Extensión Chrome (Manifest V3)** — content script detecta página de Temu, extrae datos del DOM, popup muestra preview, background envía a Edge Function.
3. **Admin UI** para gestionar API key de la extensión y ver historial de importaciones recientes.

**Tech Stack:** Supabase Edge Functions (Deno), Chrome Manifest V3, vanilla JS + esbuild para el bundle de la extensión, fetch nativo para HTTP.

**Result at end of Plan 04:** Dueña instala el `.crx` en Chrome una vez. Navega Temu logueada. En página de producto, click ícono KS en la barra → popup muestra preview → click "Importar" → producto llega a `/admin/productos` como borrador. Marca imágenes limpias, ajusta datos, publica.

**Spec reference:** `docs/superpowers/specs/2026-05-12-klassik-store-design.md` sección 8.

---

## File Structure

```
extension/                            ← codebase separado para la extensión
├── manifest.json
├── icons/
│   ├── 16.png
│   ├── 48.png
│   └── 128.png
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.ts                      (entry)
├── content/
│   └── temu-scraper.ts               (content script)
├── background/
│   └── service-worker.ts             (background worker)
├── lib/
│   ├── api.ts                        (cliente HTTP a Edge Function)
│   ├── storage.ts                    (chrome.storage para config + API key)
│   └── types.ts
├── build/                            (output - gitignored)
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
└── README.md

supabase/functions/
├── import-temu-product/
│   ├── index.ts                      (Edge Function)
│   ├── lib/
│   │   ├── images.ts                 (download & store)
│   │   ├── validation.ts             (zod schemas)
│   │   └── temu-parse.ts             (parse DOM data into our schema)
│   └── deno.json

app/admin/
├── configuracion/extension/
│   ├── page.tsx                      (API key management + install instructions)
│   └── actions.ts
├── importador/
│   └── page.tsx                      (import history)

lib/
├── extension-api-keys.ts             (gen/revoke admin functions)
```

---

## Pre-requisitos manuales

- [ ] **Manual A:** Supabase CLI instalada localmente, o el usuario debe estar dispuesto a pegar SQL/funciones via dashboard.
  - Verificar: `npx supabase --version`
- [ ] **Manual B:** Una nueva tabla `extension_api_keys` para autenticar la extensión sin usar la `service_role`.
- [ ] **Manual C:** Una variable de entorno extra en Vercel: `SUPABASE_FUNCTION_URL` apuntando a la URL pública de las edge functions.

---

## Task 1: Schema — extension_api_keys + importaciones log

**Files:**
- Create: `supabase/migrations/20260513000000_extension_api_keys.sql`

- [ ] **Step 1.1: Crear migración SQL**

```sql
-- API keys para la extensión Chrome (auth sin service_role)
create table if not exists extension_api_keys (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  key_hash text not null unique,
  key_prefix text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

create index idx_extension_api_keys_hash on extension_api_keys(key_hash) where revoked_at is null;

alter table extension_api_keys enable row level security;

create policy "admin all extension_api_keys" on extension_api_keys
  for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and rol in ('owner', 'staff'))
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and rol in ('owner', 'staff'))
  );

-- Log de importaciones para historial
create table if not exists importaciones_log (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid references productos(id) on delete set null,
  temu_url text,
  temu_goods_id text,
  api_key_id uuid references extension_api_keys(id) on delete set null,
  status text not null check (status in ('success', 'partial', 'failed')),
  error_message text,
  imagenes_count int not null default 0,
  imagenes_failed int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_importaciones_log_created on importaciones_log(created_at desc);

alter table importaciones_log enable row level security;

create policy "admin all importaciones_log" on importaciones_log
  for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and rol in ('owner', 'staff'))
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and rol in ('owner', 'staff'))
  );
```

- [ ] **Step 1.2: Apply manually**

User opens [SQL Editor of Klassik project](https://supabase.com/dashboard/project/ackefqrcejicepksrwiz/sql/new), pastes content, clicks Run. Verify 2 new tables in Table Editor.

- [ ] **Step 1.3: Update `lib/types/database.ts`** with the new tables. Append to the `Tables` block:

```ts
extension_api_keys: {
  Row: {
    id: string
    nombre: string
    key_hash: string
    key_prefix: string
    created_by: string | null
    created_at: string
    last_used_at: string | null
    revoked_at: string | null
  }
  Insert: { /* mirror Row with optional defaults */ }
  Update: { /* all optional */ }
  Relationships: []
}
importaciones_log: {
  Row: {
    id: string
    producto_id: string | null
    temu_url: string | null
    temu_goods_id: string | null
    api_key_id: string | null
    status: string
    error_message: string | null
    imagenes_count: number
    imagenes_failed: number
    created_at: string
  }
  Insert: { /* mirror */ }
  Update: { /* mirror */ }
  Relationships: []
}
```

- [ ] **Step 1.4: TSC + commit**

```bash
npx tsc --noEmit
git add supabase/migrations/20260513000000_extension_api_keys.sql lib/types/database.ts
git commit -m "feat(db): add extension_api_keys and importaciones_log tables for Chrome extension"
```

---

## Task 2: API key management UI in admin

**Files:**
- Create: `app/admin/configuracion/extension/page.tsx`
- Create: `app/admin/configuracion/extension/actions.ts`
- Create: `components/admin/forms/ApiKeyManager.tsx`
- Modify: `components/admin/sidebar.tsx` (add link)

- [ ] **Step 2.1: Create `app/admin/configuracion/extension/actions.ts`**

```ts
"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import crypto from "node:crypto"

function generateKey() {
  const raw = `ks_${crypto.randomBytes(24).toString("hex")}`
  const hash = crypto.createHash("sha256").update(raw).digest("hex")
  const prefix = raw.slice(0, 12)
  return { raw, hash, prefix }
}

export async function createApiKey(nombre: string) {
  if (!nombre || nombre.length < 2) return { error: "Nombre requerido" }
  const supabase = await createSupabaseServerClient()
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) return { error: "No autenticado" }

  const { raw, hash, prefix } = generateKey()
  const { error } = await supabase.from("extension_api_keys").insert({
    nombre,
    key_hash: hash,
    key_prefix: prefix,
    created_by: user.user.id,
  })
  if (error) return { error: error.message }
  revalidatePath("/admin/configuracion/extension")
  return { success: true, key: raw }
}

export async function revokeApiKey(id: string) {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from("extension_api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/admin/configuracion/extension")
  return { success: true }
}
```

- [ ] **Step 2.2: Create `components/admin/forms/ApiKeyManager.tsx`** (client component, full implementation)

Full implementation handles: form to create new key, display of generated key once (with copy button), list of existing keys (showing only prefix + last_used), revoke buttons.

[Full TSX code in plan execution — paste from spec at execution time. Key behaviors: show generated raw key ONLY ONCE after creation in a copy-able box with warning; never store raw key anywhere.]

- [ ] **Step 2.3: Create `app/admin/configuracion/extension/page.tsx`**

Server component that fetches API keys list + renders `ApiKeyManager` + renders install instructions section (placeholder for now; .crx download link added in Task 9).

- [ ] **Step 2.4: Add sidebar link**

In `components/admin/sidebar.tsx`, the Configuración group already has "Importador Temu" pointing to `/admin/importador`. Add a new item:

```ts
{ label: "Extensión Chrome", href: "/admin/configuracion/extension", icon: Chrome },
```

Import `Chrome` from lucide-react.

- [ ] **Step 2.5: TSC + commit**

```bash
npx tsc --noEmit
git add app/admin/configuracion/extension/ components/admin/forms/ApiKeyManager.tsx components/admin/sidebar.tsx
git commit -m "feat(admin): API key management for Chrome extension"
```

---

## Task 3: Edge Function — import_temu_product

**Files:**
- Create: `supabase/functions/import-temu-product/index.ts`
- Create: `supabase/functions/import-temu-product/lib/validation.ts`
- Create: `supabase/functions/import-temu-product/lib/images.ts`
- Create: `supabase/functions/import-temu-product/deno.json`

- [ ] **Step 3.1: Crear estructura de Edge Function**

`deno.json`:
```json
{
  "imports": {
    "supabase": "https://esm.sh/@supabase/supabase-js@2",
    "zod": "https://esm.sh/zod@3"
  }
}
```

- [ ] **Step 3.2: Validation schema**

`lib/validation.ts`:
```ts
import { z } from "zod"

export const importPayloadSchema = z.object({
  temu_url: z.string().url(),
  temu_goods_id: z.string().min(1),
  nombre_temu: z.string().min(1).max(500),
  descripcion: z.string().max(10000).optional().nullable(),
  precio: z.number().positive().optional().nullable(),
  precio_anterior: z.number().positive().optional().nullable(),
  imagenes: z.array(z.object({
    url: z.string().url(),
    tipo: z.enum(["imagen", "video"]).default("imagen"),
  })).min(1).max(20),
  variantes: z.array(z.object({
    tipo: z.string().min(1).max(30),
    valor: z.string().min(1).max(80),
    imagen_url: z.string().url().optional().nullable(),
  })).optional().default([]),
})

export type ImportPayload = z.infer<typeof importPayloadSchema>
```

- [ ] **Step 3.3: Image downloader**

`lib/images.ts`:
```ts
import { createClient } from "supabase"

export async function downloadAndStore(
  supabase: ReturnType<typeof createClient>,
  url: string,
  productoId: string,
  index: number
): Promise<{ url: string | null; error: string | null }> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } })
    if (!res.ok) return { url: null, error: `HTTP ${res.status}` }
    const blob = await res.blob()
    const contentType = blob.type || "image/jpeg"
    const ext = contentType.split("/")[1]?.split(";")[0] || "jpg"
    const path = `productos/${productoId}/imported-${Date.now()}-${index}.${ext}`
    const { error } = await supabase.storage.from("productos").upload(path, blob, {
      cacheControl: "3600",
      upsert: false,
      contentType,
    })
    if (error) return { url: null, error: error.message }
    const { data } = supabase.storage.from("productos").getPublicUrl(path)
    return { url: data.publicUrl, error: null }
  } catch (e) {
    return { url: null, error: e instanceof Error ? e.message : "unknown" }
  }
}
```

- [ ] **Step 3.4: Main function**

`index.ts`:
```ts
import { createClient } from "supabase"
import { importPayloadSchema } from "./lib/validation.ts"
import { downloadAndStore } from "./lib/images.ts"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 })

  const auth = req.headers.get("authorization") || ""
  const bearer = auth.replace(/^Bearer\s+/, "")
  if (!bearer) return new Response("Unauthorized", { status: 401 })

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  // Validate API key
  const keyHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(bearer))
    .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join(""))

  const { data: keyRow } = await supabase
    .from("extension_api_keys")
    .select("id, revoked_at")
    .eq("key_hash", keyHash)
    .single()

  if (!keyRow || keyRow.revoked_at) return new Response("Invalid API key", { status: 401 })

  // Touch last_used_at
  await supabase.from("extension_api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id)

  // Parse + validate body
  let body
  try { body = await req.json() } catch { return new Response("Invalid JSON", { status: 400 }) }
  const parsed = importPayloadSchema.safeParse(body)
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.issues[0]?.message }), { status: 400 })
  }
  const data = parsed.data

  // Check duplicate
  const { data: existing } = await supabase
    .from("productos")
    .select("id, nombre, estado")
    .eq("temu_goods_id", data.temu_goods_id)
    .maybeSingle()

  if (existing) {
    return new Response(JSON.stringify({
      error: "duplicate",
      existing_id: existing.id,
      existing_nombre: existing.nombre,
      existing_estado: existing.estado,
    }), { status: 409 })
  }

  // Create draft product
  const slug = `temu-${data.temu_goods_id}-${Date.now().toString(36)}`
  const { data: producto, error: prodError } = await supabase
    .from("productos")
    .insert({
      nombre: data.nombre_temu.slice(0, 150),
      nombre_temu: data.nombre_temu,
      descripcion: data.descripcion,
      slug,
      modo: "preorden",
      costo_temu: data.precio || 0,
      precio_venta: 0,
      precio_anterior: data.precio_anterior,
      temu_url: data.temu_url,
      temu_goods_id: data.temu_goods_id,
      estado: "borrador",
    })
    .select("id")
    .single()

  if (prodError || !producto) {
    return new Response(JSON.stringify({ error: prodError?.message || "insert failed" }), { status: 500 })
  }

  // Download images
  let imagenesOk = 0
  let imagenesFailed = 0
  for (let i = 0; i < data.imagenes.length; i++) {
    const img = data.imagenes[i]
    const { url, error } = await downloadAndStore(supabase, img.url, producto.id, i)
    if (error || !url) {
      imagenesFailed++
      continue
    }
    await supabase.from("producto_imagenes").insert({
      producto_id: producto.id,
      url,
      tipo: img.tipo,
      orden: i,
      watermark_limpio: false,
    })
    imagenesOk++
  }

  // Insert variantes
  for (let i = 0; i < (data.variantes || []).length; i++) {
    const v = data.variantes![i]
    await supabase.from("producto_variantes").insert({
      producto_id: producto.id,
      tipo: v.tipo,
      valor: v.valor,
      precio_extra: 0,
      orden: i,
    })
  }

  // Log
  await supabase.from("importaciones_log").insert({
    producto_id: producto.id,
    temu_url: data.temu_url,
    temu_goods_id: data.temu_goods_id,
    api_key_id: keyRow.id,
    status: imagenesFailed === 0 ? "success" : "partial",
    imagenes_count: imagenesOk,
    imagenes_failed: imagenesFailed,
  })

  return new Response(JSON.stringify({
    success: true,
    producto_id: producto.id,
    imagenes_ok: imagenesOk,
    imagenes_failed: imagenesFailed,
    redirect_url: `/admin/productos/${producto.id}`,
  }), { headers: { "Content-Type": "application/json" }})
})
```

- [ ] **Step 3.5: Deploy edge function**

Two options:
- **Option A (CLI):** `npx supabase functions deploy import-temu-product --project-ref ackefqrcejicepksrwiz`
- **Option B (Dashboard):** Supabase Dashboard → Edge Functions → New Function → paste code

Verify in Dashboard → Edge Functions that `import-temu-product` is deployed and accessible.

- [ ] **Step 3.6: Commit**

```bash
git add supabase/functions/
git commit -m "feat(api): Edge Function for Temu product import with image download"
```

---

## Task 4: Extension scaffold + manifest

**Files:**
- Create: `extension/manifest.json`
- Create: `extension/package.json`
- Create: `extension/tsconfig.json`
- Create: `extension/esbuild.config.mjs`
- Create: `extension/.gitignore`
- Create: `extension/icons/16.png`, `48.png`, `128.png` (placeholders or KS logo)

- [ ] **Step 4.1: Initialize extension directory**

```bash
mkdir -p extension/icons extension/popup extension/content extension/background extension/lib
cd extension
npm init -y
npm install -D typescript esbuild @types/chrome
```

- [ ] **Step 4.2: manifest.json**

```json
{
  "manifest_version": 3,
  "name": "Klassik Store · Importador Temu",
  "version": "1.0.0",
  "description": "Importa productos de Temu directamente a tu admin de Klassik Store.",
  "permissions": ["activeTab", "scripting", "storage"],
  "host_permissions": ["https://*.temu.com/*"],
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/16.png",
      "48": "icons/48.png",
      "128": "icons/128.png"
    }
  },
  "icons": {
    "16": "icons/16.png",
    "48": "icons/48.png",
    "128": "icons/128.png"
  },
  "background": {
    "service_worker": "build/background.js"
  },
  "content_scripts": [
    {
      "matches": ["https://*.temu.com/*"],
      "js": ["build/content.js"],
      "run_at": "document_idle"
    }
  ]
}
```

- [ ] **Step 4.3: tsconfig + esbuild**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "types": ["chrome"]
  },
  "include": ["**/*.ts"]
}
```

`esbuild.config.mjs`:
```js
import { build } from "esbuild"

const entries = {
  "build/popup": "popup/popup.ts",
  "build/content": "content/temu-scraper.ts",
  "build/background": "background/service-worker.ts",
}

for (const [out, entry] of Object.entries(entries)) {
  await build({
    entryPoints: [entry],
    bundle: true,
    minify: true,
    target: "chrome120",
    format: "iife",
    outfile: `${out}.js`,
  })
}
console.log("Build complete")
```

`package.json` scripts:
```json
"scripts": {
  "build": "node esbuild.config.mjs",
  "watch": "node esbuild.config.mjs --watch"
}
```

`.gitignore`:
```
build/
node_modules/
```

- [ ] **Step 4.4: Icons placeholder**

For now use plain 16x16/48x48/128x128 PNGs with the KS logo. Can be hand-drawn or generated with any tool. Commit them.

- [ ] **Step 4.5: Commit**

```bash
git add extension/
git commit -m "feat(extension): scaffold Chrome extension with Manifest V3 + esbuild"
```

---

## Task 5: Content script — Temu DOM scraper

**Files:**
- Create: `extension/content/temu-scraper.ts`
- Create: `extension/lib/types.ts`

- [ ] **Step 5.1: Types**

`extension/lib/types.ts`:
```ts
export interface ScrapedProduct {
  temu_url: string
  temu_goods_id: string
  nombre_temu: string
  descripcion: string | null
  precio: number | null
  precio_anterior: number | null
  imagenes: { url: string; tipo: "imagen" | "video" }[]
  variantes: { tipo: string; valor: string; imagen_url: string | null }[]
}
```

- [ ] **Step 5.2: Scraper**

`extension/content/temu-scraper.ts`:
```ts
import type { ScrapedProduct } from "../lib/types"

function getGoodsId(): string | null {
  const url = new URL(location.href)
  return url.searchParams.get("goods_id") || null
}

function getTitle(): string {
  // Multiple selectors as fallback
  const selectors = ['h1[data-id]', '[data-pl="goods-title"]', "h1", '[class*="GoodsTitle"]']
  for (const sel of selectors) {
    const el = document.querySelector(sel)
    if (el?.textContent?.trim()) return el.textContent.trim()
  }
  return document.title.split("|")[0].trim()
}

function getImages(): { url: string; tipo: "imagen" | "video" }[] {
  const imgs: { url: string; tipo: "imagen" | "video" }[] = []
  // Find all CDN images
  document.querySelectorAll("img[src*='img.kwcdn.com']").forEach((el) => {
    const src = (el as HTMLImageElement).src
    if (src && !imgs.find(i => i.url === src)) imgs.push({ url: src, tipo: "imagen" })
  })
  // Find videos
  document.querySelectorAll("video source, video[src]").forEach((el) => {
    const src = el.getAttribute("src")
    if (src && !imgs.find(i => i.url === src)) imgs.push({ url: src, tipo: "video" })
  })
  return imgs.slice(0, 20)
}

function getPrice(): { actual: number | null; anterior: number | null } {
  // Try common price selectors
  const priceText = document.querySelector('[class*="Price"]')?.textContent || ""
  const matches = priceText.match(/\$\s*([\d.,]+)/g)
  const nums = matches?.map(m => parseFloat(m.replace(/[^\d.]/g, ""))).filter(n => !isNaN(n)) || []
  if (nums.length === 0) return { actual: null, anterior: null }
  if (nums.length === 1) return { actual: nums[0], anterior: null }
  // Lower = actual, higher = anterior
  nums.sort((a, b) => a - b)
  return { actual: nums[0], anterior: nums[nums.length - 1] }
}

function getDescription(): string | null {
  const sel = document.querySelector('[class*="Description"]') || document.querySelector('[class*="Detail"]')
  return sel?.textContent?.trim().slice(0, 5000) || null
}

function getVariants(): { tipo: string; valor: string; imagen_url: string | null }[] {
  const variants: { tipo: string; valor: string; imagen_url: string | null }[] = []
  // Find variant groups (Color, Size, etc.)
  document.querySelectorAll('[class*="SkuItem"], [class*="VariantOption"]').forEach((el) => {
    const groupLabel = el.closest('[class*="SkuGroup"]')?.querySelector('[class*="GroupTitle"]')?.textContent?.trim() || "Variante"
    const valor = el.getAttribute("data-value") || el.textContent?.trim()
    const img = el.querySelector("img")?.getAttribute("src") || null
    if (valor) variants.push({ tipo: groupLabel, valor, imagen_url: img })
  })
  return variants
}

export function scrape(): ScrapedProduct | null {
  const goods_id = getGoodsId()
  if (!goods_id) return null
  const { actual, anterior } = getPrice()
  return {
    temu_url: location.href.split("?")[0] + `?goods_id=${goods_id}`,
    temu_goods_id: goods_id,
    nombre_temu: getTitle(),
    descripcion: getDescription(),
    precio: actual,
    precio_anterior: anterior,
    imagenes: getImages(),
    variantes: getVariants(),
  }
}

// Listen for popup request
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "SCRAPE") {
    const data = scrape()
    sendResponse({ ok: !!data, data })
  }
  return true
})
```

- [ ] **Step 5.3: Build and verify**

```bash
cd extension
npm run build
```

Should produce `build/content.js` without errors.

- [ ] **Step 5.4: Commit**

```bash
git add extension/content/ extension/lib/
git commit -m "feat(extension): content script for Temu DOM scraping"
```

---

## Task 6: Popup UI

**Files:**
- Create: `extension/popup/popup.html`
- Create: `extension/popup/popup.css`
- Create: `extension/popup/popup.ts`

- [ ] **Step 6.1: popup.html**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div id="root">
    <header>
      <strong>KLASSIK</strong> · Importar Temu
    </header>
    <main id="main">Cargando…</main>
  </div>
  <script src="../build/popup.js"></script>
</body>
</html>
```

- [ ] **Step 6.2: popup.css**

Brand-aligned styling: black bg, gold accents, ~340px wide.

- [ ] **Step 6.3: popup.ts**

```ts
import type { ScrapedProduct } from "../lib/types"

const main = document.getElementById("main")!

async function getConfig() {
  return new Promise<{ apiUrl?: string; apiKey?: string }>((res) => {
    chrome.storage.local.get(["apiUrl", "apiKey"], (data) => res(data))
  })
}

async function run() {
  const config = await getConfig()
  if (!config.apiUrl || !config.apiKey) {
    main.innerHTML = `
      <div class="setup">
        <p>Configura la extensión primero:</p>
        <label>URL Edge Function</label>
        <input id="cfg-url" placeholder="https://xxx.supabase.co/functions/v1/import-temu-product">
        <label>API Key</label>
        <input id="cfg-key" type="password" placeholder="ks_…">
        <button id="save-cfg">Guardar</button>
      </div>
    `
    document.getElementById("save-cfg")!.addEventListener("click", () => {
      const apiUrl = (document.getElementById("cfg-url") as HTMLInputElement).value.trim()
      const apiKey = (document.getElementById("cfg-key") as HTMLInputElement).value.trim()
      chrome.storage.local.set({ apiUrl, apiKey }, () => location.reload())
    })
    return
  }

  // Check active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.url?.includes("temu.com")) {
    main.innerHTML = `<p class="hint">Abre una página de producto en Temu para importar.</p>`
    return
  }

  // Ask content script to scrape
  let scrapeResult: { ok: boolean; data: ScrapedProduct | null }
  try {
    scrapeResult = await chrome.tabs.sendMessage(tab.id!, { type: "SCRAPE" })
  } catch {
    main.innerHTML = `<p class="hint">No se pudo leer la página. Recarga Temu e intenta de nuevo.</p>`
    return
  }
  if (!scrapeResult.ok || !scrapeResult.data) {
    main.innerHTML = `<p class="hint">No detecté un producto válido en esta página.</p>`
    return
  }
  const p = scrapeResult.data
  main.innerHTML = `
    <div class="preview">
      <img src="${p.imagenes[0]?.url || ""}" alt="">
      <h3>${p.nombre_temu.slice(0, 80)}</h3>
      <p class="meta">${p.imagenes.length} imágenes · ${p.variantes.length} variantes</p>
      <p class="price">${p.precio ? `$${p.precio}` : "Sin precio detectado"}</p>
      <button id="import">Importar a Klassik Store</button>
      <div id="status"></div>
    </div>
  `
  document.getElementById("import")!.addEventListener("click", async () => {
    const status = document.getElementById("status")!
    status.textContent = "Importando..."
    try {
      const res = await fetch(config.apiUrl!, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(p),
      })
      const json = await res.json()
      if (!res.ok) {
        if (json.error === "duplicate") {
          status.innerHTML = `<p class="error">Ya existe: <a href="${json.existing_id}" target="_blank">${json.existing_nombre}</a> (${json.existing_estado}).</p>`
        } else {
          status.innerHTML = `<p class="error">Error: ${json.error}</p>`
        }
        return
      }
      status.innerHTML = `<p class="success">✓ Importado. <a href="#" id="open-admin">Abrir en admin</a></p>`
      document.getElementById("open-admin")!.addEventListener("click", () => {
        chrome.tabs.create({ url: json.redirect_url })
      })
    } catch (e) {
      status.innerHTML = `<p class="error">Error de red: ${e instanceof Error ? e.message : ""}</p>`
    }
  })
}

run()
```

- [ ] **Step 6.4: Build + test**

```bash
npm run build
```

Load extension in `chrome://extensions` (Developer mode → Load unpacked → select `extension/` folder). Open Temu product page. Click extension icon → popup shows.

- [ ] **Step 6.5: Commit**

```bash
git add extension/popup/
git commit -m "feat(extension): popup UI with scrape preview and import button"
```

---

## Task 7: Background service worker (minimal)

For Manifest V3, the background is mostly for persistent listeners. In this extension the popup does most work directly. But include a service worker for future expansion + to satisfy manifest.

- [ ] **Step 7.1: Create `extension/background/service-worker.ts`**

```ts
// Reserved for future: listen to tab updates to enable/disable icon, etc.
chrome.runtime.onInstalled.addListener(() => {
  console.log("Klassik Store · Importador Temu instalado")
})
```

- [ ] **Step 7.2: Rebuild + commit**

```bash
cd extension && npm run build
git add extension/background/
git commit -m "feat(extension): minimal background service worker"
```

---

## Task 8: Admin import history view

**Files:**
- Modify: `app/admin/importador/page.tsx`

- [ ] **Step 8.1: Replace stub with real implementation**

Server component that queries `importaciones_log` joined with `productos`, shows status badges, allows clicking through to the imported product.

- [ ] **Step 8.2: TSC + commit**

```bash
npx tsc --noEmit
git add app/admin/importador/
git commit -m "feat(admin): import history page showing recent Temu imports"
```

---

## Task 9: Package as .crx + installation instructions

The user chose direct `.crx` distribution (no Chrome Web Store).

- [ ] **Step 9.1: Generate signing key**

```bash
cd extension
openssl genrsa -out klassik-extension.pem 2048
```

This generates a private signing key. **Keep this file safe and DO NOT commit it.** Add to `.gitignore`.

- [ ] **Step 9.2: Package**

Chrome can package via CLI:

```bash
# From extension directory
chrome --pack-extension=./extension --pack-extension-key=./klassik-extension.pem
```

Or use the Chrome UI:
- `chrome://extensions` → Developer mode ON → "Pack extension..." → Root: extension folder, Key: klassik-extension.pem → Pack

Output: `extension.crx`

- [ ] **Step 9.3: Host the .crx for download**

Put the `.crx` in the Next.js app's `public/` folder so it's downloadable from the deployed site:

```
public/extension/klassik-importador.crx
```

- [ ] **Step 9.4: Add install instructions to admin extension page**

Update `app/admin/configuracion/extension/page.tsx` with step-by-step:

1. Click "Descargar extensión" (.crx file)
2. Open `chrome://extensions`
3. Enable "Developer mode" (top right toggle)
4. Drag the `.crx` file onto the page
5. Confirm install
6. Click extension icon, configure with API key

- [ ] **Step 9.5: Commit**

```bash
git add public/extension/ app/admin/configuracion/extension/page.tsx
git commit -m "feat(extension): .crx packaging + admin install instructions"
```

---

## Task 10: Limited E2E (extension testing is hard)

Skip Playwright E2E for the actual extension (it would need a Chrome instance with the extension pre-loaded — too brittle). Instead:

- [ ] **Step 10.1: Add Edge Function smoke test**

Write a Deno test or a Node script in `tests/edge-functions/import-temu-product.test.ts` that:
- POST to local edge function with valid payload
- Verifies a product was created
- POST with same goods_id → expects 409
- POST without API key → expects 401

(Requires Supabase running locally OR test against staging.)

- [ ] **Step 10.2: Commit**

```bash
git add tests/
git commit -m "test(edge): smoke tests for import-temu-product"
```

---

## Verificación final del Plan 04

- [ ] Edge Function `import-temu-product` deployed y respondiendo
- [ ] Tabla `extension_api_keys` y `importaciones_log` creadas en DB
- [ ] Admin puede crear/revocar API keys en `/admin/configuracion/extension`
- [ ] Extensión carga sin errores en Chrome
- [ ] Al abrir un producto de Temu y hacer click en la extensión, popup detecta y muestra preview
- [ ] Click "Importar" envía a Edge Function, recibe respuesta éxito
- [ ] Producto aparece como borrador en `/admin/productos` con imágenes descargadas (marcadas `watermark_limpio=false`)
- [ ] Importar mismo producto 2 veces da error "duplicate"
- [ ] `/admin/importador` muestra historial de importaciones
- [ ] `.crx` se puede descargar desde el admin e instalar en Chrome

---

## Notas para el implementador

1. **Temu cambia su DOM frecuentemente.** El scraper en `temu-scraper.ts` tiene múltiples selectores como fallback. Si Temu rompe algo, ajustar los selectores. Un patrón robusto sería que el content script intente leer `__NEXT_DATA__` o `__INITIAL_PROPS__` si Temu los expone, antes de ir al DOM.

2. **Imágenes pueden requerir headers de referer.** Si las URLs de `img.kwcdn.com` se rechazan al hacer fetch desde la Edge Function (status 403), considerar enviar headers de `Referer: https://www.temu.com/` en el fetch.

3. **Videos son grandes.** Algunos videos de Temu pueden ser >50MB. Considerar limitar tamaño máximo de descarga o saltear videos si tarda demasiado. La Edge Function tiene timeout de 60s por defecto.

4. **API key seguridad.** La key se almacena en `chrome.storage.local` que es per-extension y aislado del DOM de Temu. No accesible para scripts de la página visitada.

5. **El admin nunca ve la API key raw después de crearla** — solo el prefix (primeros 12 chars). Si se pierde, hay que crear nueva y revocar la vieja.

6. **Si Chrome Web Store fuera deseado más adelante**, el `.crx` actual no es compatible — habría que regenerar con el sistema de signing del Web Store. Pero la code base sería la misma.
