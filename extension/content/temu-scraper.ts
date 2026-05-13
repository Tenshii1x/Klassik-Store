import type { ScrapedProduct } from "../lib/types"

/**
 * Temu DOM scraper — pragmatic strategy.
 *
 * Strategies in order of reliability:
 *  1. Inline JSON (Next.js __NEXT_DATA__ or similar) — most reliable when available
 *  2. URL query param `top_gallery_url` — guaranteed main product image
 *  3. JSON-LD structured data — for price
 *  4. DOM image scan filtered to /product/open/ and /product/fancy/ paths,
 *     deduplicated by hash, excluding the cart/sidebar by container heuristics
 *  5. Title from h1, shortened automatically
 */

interface WindowWithTemuData extends Window {
  __NEXT_DATA__?: unknown
  __INITIAL_PROPS__?: unknown
  rawData?: unknown
}

function getGoodsId(): string | null {
  const url = new URL(location.href)
  const fromQuery = url.searchParams.get("goods_id")
  if (fromQuery) return fromQuery
  const pathMatch = location.pathname.match(/g-(\d{10,})\.html/)
  if (pathMatch) return pathMatch[1]
  const anyDigits = location.pathname.match(/(\d{10,})/)
  if (anyDigits) return anyDigits[1]
  return null
}

/**
 * Shorten a long Temu SEO title to something more usable.
 * Removes duplicate words, caps at 5 words / 50 chars, title-cases.
 * Example: "Casio Reloj Casio Retro Pequeño Cuadrado Plateado Reloj de Agua para..."
 *       → "Reloj Casio Retro"
 */
function shortenTitle(t: string): string {
  if (!t) return ""
  // Lower-case + split into words, filter empties
  let clean = t
    .replace(/[\s\-—|·]+temu[\s\w]*$/i, "")
    .replace(/[\s\-—|·]+(panama|usa|mexico|colombia)\s*$/i, "")
    .trim()

  const words = clean.split(/\s+/).filter((w) => w.length > 0)
  const seen = new Set<string>()
  const unique: string[] = []
  for (const w of words) {
    const key = w.toLowerCase().replace(/[^\wáéíóúñü]/gi, "")
    if (!key) continue
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(w)
    if (unique.length >= 5) break
  }
  let result = unique.join(" ")
  if (result.length > 50) result = result.slice(0, 50).trim()

  // Title case (each word capitalized)
  result = result
    .split(" ")
    .map((w) => {
      // Don't capitalize tiny stopwords unless they're the first word
      const lower = w.toLowerCase()
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(" ")

  return result || t.slice(0, 50)
}

function getFullTitle(): string {
  const selectors = [
    'h1[data-id]',
    '[data-pl="goods-title"]',
    "h1.title",
    "h1",
    '[class*="GoodsTitle"]',
    '[class*="ProductTitle"]',
  ]
  for (const sel of selectors) {
    const el = document.querySelector(sel)
    if (!el) continue
    const text = el.textContent
    if (text && text.trim().length > 3) return text.trim()
  }
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content")
  if (ogTitle && ogTitle.length > 5) return ogTitle.trim()
  return document.title.split("|")[0].trim() || "Producto sin nombre"
}

function normalizeImageUrl(src: string): string {
  return src
    .replace(/_\d+x\d+(?=\.[a-z]+(\?|!|$))/i, "")
    .replace(/!\w+=\d+/g, "")
    .split("?")[0] // strip query strings to dedupe ?cf=fa-default variants
}

/**
 * Extract Temu product image hash. Each unique product image has a unique hash.
 * Example: "/product/open/5908a7f466e944af94042d53f8b1a3c6-goods.jpeg"
 *       → "5908a7f466e944af94042d53f8b1a3c6"
 */
function extractImageHash(url: string): string | null {
  const m = url.match(/\/product\/(?:open|fancy)\/([a-f0-9]{16,})/i)
  if (m) return m[1]
  return null
}

function getImages(): { url: string; tipo: "imagen" | "video" }[] {
  const seenUrls = new Set<string>()
  const seenHashes = new Set<string>()
  const result: { url: string; tipo: "imagen" | "video" }[] = []

  function tryAdd(rawUrl: string, tipo: "imagen" | "video" = "imagen"): boolean {
    if (!rawUrl) return false
    const url = normalizeImageUrl(rawUrl)
    if (seenUrls.has(url)) return false
    if (tipo === "imagen") {
      const hash = extractImageHash(url)
      if (hash && seenHashes.has(hash)) return false
      if (hash) seenHashes.add(hash)
    }
    seenUrls.add(url)
    result.push({ url, tipo })
    return true
  }

  // 1. Main image from URL param (guaranteed product image)
  const urlParam = new URL(location.href).searchParams.get("top_gallery_url")
  if (urlParam) tryAdd(urlParam, "imagen")

  // 2. Scan page for all Temu product images, dedupe by hash
  // (skip ones that have NO hash — those are usually UI chrome)
  document.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
    const src = img.src || img.dataset.src || ""
    if (!src) return
    const hash = extractImageHash(src)
    if (!hash) return
    tryAdd(src, "imagen")
  })

  // 3. Videos: only those inside likely product containers
  const videoScope = ["[class*=MainPicture]", "[class*=ProductMedia]", "[class*=Gallery]"]
  for (const sel of videoScope) {
    document.querySelectorAll(sel).forEach((scope) => {
      scope.querySelectorAll<HTMLVideoElement>("video").forEach((video) => {
        let src = video.getAttribute("src") || ""
        if (!src) src = video.querySelector("source")?.getAttribute("src") || ""
        if (src) tryAdd(src, "video")
      })
    })
  }

  return result.slice(0, 20)
}

function getDescription(): string | null {
  const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute("content")
  if (ogDesc && ogDesc.length > 10) return ogDesc.trim().slice(0, 5000)
  return null
}

/**
 * Try to extract product price from JSON-LD structured data.
 * Falls back to null if not confidently found.
 */
function getPrice(): { actual: number | null; anterior: number | null } {
  const nums: number[] = []

  // 1. JSON-LD Product/Offer schema
  document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]').forEach((s) => {
    try {
      const data = JSON.parse(s.textContent || "{}")
      const items = Array.isArray(data) ? data : [data]
      for (const item of items) {
        const offers = item.offers || item.Offers
        if (!offers) continue
        const offerList = Array.isArray(offers) ? offers : [offers]
        for (const offer of offerList) {
          const price = offer.price || offer.lowPrice || offer.Price
          if (price !== undefined) {
            const n = parseFloat(String(price))
            if (!isNaN(n) && n >= 1 && n < 10000) nums.push(n)
          }
          const high = offer.highPrice
          if (high !== undefined) {
            const n = parseFloat(String(high))
            if (!isNaN(n) && n >= 1 && n < 10000) nums.push(n)
          }
        }
      }
    } catch {}
  })

  // 2. og:price:amount
  const ogPrice = document.querySelector('meta[property="og:price:amount"]')?.getAttribute("content")
  if (ogPrice) {
    const n = parseFloat(ogPrice)
    if (!isNaN(n) && n >= 1 && n < 10000) nums.push(n)
  }

  if (nums.length === 0) return { actual: null, anterior: null }
  const unique = [...new Set(nums)].sort((a, b) => a - b)
  if (unique.length === 1) return { actual: unique[0], anterior: null }
  return { actual: unique[0], anterior: unique[unique.length - 1] }
}

export function scrape(): ScrapedProduct | null {
  const goods_id = getGoodsId()
  if (!goods_id) return null
  const cleanUrl = `${location.origin}${location.pathname}?goods_id=${goods_id}`
  const fullTitle = getFullTitle()
  const { actual, anterior } = getPrice()
  return {
    temu_url: cleanUrl,
    temu_goods_id: goods_id,
    nombre_temu: shortenTitle(fullTitle),
    descripcion: getDescription(),
    precio: actual,
    precio_anterior: anterior,
    imagenes: getImages(),
    variantes: [],
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "SCRAPE") {
    try {
      const data = scrape()
      sendResponse({ ok: !!data, data })
    } catch (e) {
      sendResponse({ ok: false, error: e instanceof Error ? e.message : "unknown error" })
    }
  }
  return true
})

;(window as WindowWithTemuData & { __klassikScrape?: () => ScrapedProduct | null }).__klassikScrape = scrape
