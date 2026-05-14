import type { ScrapedProduct } from "../lib/types"

/**
 * Temu DOM scraper — images only (video extraction removed by user request).
 *
 * Strategy:
 *  1. Title from h1 / og:title, smart-shortened to ~45 chars
 *  2. Main image from URL param `top_gallery_url`
 *  3. Additional images from the thumbnail strip (biggest sibling group)
 *  4. Price from JSON-LD if confidently detected
 *  5. Description from og:description, cleaned and limited
 */

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

// ============================================================
// TITLE
// ============================================================

const STOP_TAIL = /[\s,.;:|—\-]+(de|del|con|para|y|en|a|al|por|sin|o)\s*$/i

function smartShortenTitle(t: string): string {
  if (!t) return ""
  let clean = t
    .replace(/[\s\-—|·]+temu[\s\w]*$/i, "")
    .replace(/[\s\-—|·]+(panama|usa|mexico|colombia)\s*$/i, "")
    .trim()

  const breakMatch = clean.match(/^([^,.()\[\]]+)/)
  if (breakMatch && breakMatch[1].trim().length >= 8) {
    clean = breakMatch[1].trim()
  }

  if (clean.length > 45) {
    const truncated = clean.slice(0, 45)
    const lastSpace = truncated.lastIndexOf(" ")
    clean = lastSpace > 15 ? truncated.slice(0, lastSpace) : truncated
  }

  for (let i = 0; i < 3; i++) {
    const next = clean.replace(STOP_TAIL, "").trim()
    if (next === clean) break
    clean = next
  }

  const words = clean.split(/\s+/)
  const dedup: string[] = []
  const seen = new Set<string>()
  for (const w of words) {
    const key = w.toLowerCase().replace(/[^\wáéíóúñü]/gi, "")
    if (!key) continue
    if (seen.has(key)) continue
    seen.add(key)
    dedup.push(w)
  }
  clean = dedup.join(" ")

  clean = clean
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")

  return clean || t.slice(0, 45)
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

// ============================================================
// IMAGES — thumbnail strip strategy
// ============================================================

function normalizeImageUrl(src: string): string {
  return src
    .replace(/_\d+x\d+(?=\.[a-z]+(\?|!|$))/i, "")
    .replace(/!\w+=\d+/g, "")
    .split("?")[0]
}

function extractImageHash(url: string): string | null {
  const m = url.match(/\/product\/(?:open|fancy)\/([a-f0-9]{16,})/i)
  return m ? m[1] : null
}

function isProductCdnImage(src: string): boolean {
  return /\/product\/(open|fancy)\//i.test(src)
}

function findThumbnailGroup(): HTMLImageElement[] {
  const allProductImgs = Array.from(document.querySelectorAll<HTMLImageElement>("img"))
    .filter((img) => {
      const src = img.src || img.dataset.src || ""
      return isProductCdnImage(src)
    })

  if (allProductImgs.length === 0) return []

  const groups = new Map<Element, HTMLImageElement[]>()
  for (const img of allProductImgs) {
    let anc: Element | null = img
    for (let i = 0; i < 4 && anc?.parentElement; i++) {
      anc = anc.parentElement
    }
    if (!anc) continue
    if (!groups.has(anc)) groups.set(anc, [])
    groups.get(anc)!.push(img)
  }

  let best: HTMLImageElement[] = []
  for (const group of groups.values()) {
    if (group.length > best.length) best = group
  }
  return best
}

function getImages(): { url: string; tipo: "imagen" | "video" }[] {
  const seenUrls = new Set<string>()
  const seenHashes = new Set<string>()
  const images: { url: string; tipo: "imagen" | "video" }[] = []

  function tryAddImage(rawUrl: string): boolean {
    if (!rawUrl) return false
    const url = normalizeImageUrl(rawUrl)
    if (seenUrls.has(url)) return false
    const hash = extractImageHash(url)
    if (hash && seenHashes.has(hash)) return false
    if (hash) seenHashes.add(hash)
    seenUrls.add(url)
    images.push({ url, tipo: "imagen" })
    return true
  }

  // Main image from URL param (highest confidence)
  const urlParam = new URL(location.href).searchParams.get("top_gallery_url")
  if (urlParam) tryAddImage(urlParam)

  // Thumbnail strip
  const thumbs = findThumbnailGroup()
  for (const img of thumbs) {
    const src = img.src || img.dataset.src || ""
    tryAddImage(src)
  }

  return images.slice(0, 5)
}

// ============================================================
// PRICE — JSON-LD only
// ============================================================

function getPrice(): { actual: number | null; anterior: number | null } {
  const nums: number[] = []

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

// ============================================================
// DESCRIPTION
// ============================================================

function getDescription(): string | null {
  const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute("content")
  if (ogDesc && ogDesc.length > 10) {
    let d = ogDesc.trim()
    d = d.replace(/[Tt]emu[\s\S]*$/, "").trim()
    if (d.length > 800) {
      const cutoff = d.slice(0, 800)
      const lastPeriod = cutoff.lastIndexOf(".")
      d = lastPeriod > 200 ? cutoff.slice(0, lastPeriod + 1) : cutoff + "..."
    }
    return d
  }
  return null
}

// ============================================================
// SCRAPE
// ============================================================

export function scrape(): ScrapedProduct | null {
  const goods_id = getGoodsId()
  if (!goods_id) return null
  const cleanUrl = `${location.origin}${location.pathname}?goods_id=${goods_id}`
  const fullTitle = getFullTitle()
  const { actual, anterior } = getPrice()
  return {
    temu_url: cleanUrl,
    temu_goods_id: goods_id,
    nombre_temu: smartShortenTitle(fullTitle),
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

;(window as Window & { __klassikScrape?: () => ScrapedProduct | null }).__klassikScrape = scrape
