import type { ScrapedProduct } from "../lib/types"

/**
 * Temu DOM scraper — conservative strategy.
 *
 * Temu uses heavily obfuscated class names that change frequently AND mixes
 * the product gallery with sidebar/cart/recommended images. To avoid pulling
 * cart thumbnails or banners by accident, we use a strict approach:
 *
 *  1. Extract main image from URL query param `top_gallery_url` (always reliable)
 *  2. Find other images that share the SAME hash prefix as the main image
 *     (Temu's product images live in /product/open/<hash>-goods.<ext>)
 *  3. Get title from h1 / og:title
 *  4. Skip price + variants — too unreliable; the user enters them in admin anyway
 *     (they apply their own margin and curate which variants to offer)
 */

function getGoodsId(): string | null {
  const url = new URL(location.href)
  const fromQuery = url.searchParams.get("goods_id")
  if (fromQuery) return fromQuery
  // URL pattern: /pa/reloj-...g-601100282439109.html
  const pathMatch = location.pathname.match(/g-(\d{10,})\.html/)
  if (pathMatch) return pathMatch[1]
  // Fallback: any 10+ digit number in the path
  const anyDigits = location.pathname.match(/(\d{10,})/)
  if (anyDigits) return anyDigits[1]
  return null
}

function cleanTitle(t: string): string {
  return t
    .replace(/[\s\-—|·]+temu[\s\w]*$/i, "")
    .replace(/[\s\-—|·]+(panama|usa|mexico|colombia)\s*$/i, "")
    .trim()
}

function getTitle(): string {
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
    if (text && text.trim().length > 3) return cleanTitle(text.trim())
  }
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content")
  if (ogTitle && ogTitle.length > 5) return cleanTitle(ogTitle.trim())
  return cleanTitle(document.title.split("|")[0].trim()) || "Producto sin nombre"
}

function normalizeImageUrl(src: string): string {
  return src
    .replace(/_\d+x\d+(?=\.[a-z]+(\?|!|$))/i, "")
    .replace(/!\w+=\d+/g, "")
}

/**
 * Extract the unique hash from a Temu product image URL.
 * Example: https://img.kwcdn.com/product/open/5908a7f466e944af94042d53f8b1a3c6-goods.jpeg
 *          → "5908a7f466e944af94042d53f8b1a3c6"
 *
 * Also handles /product/fancy/ paths.
 */
function extractImageHash(url: string): string | null {
  const m = url.match(/\/product\/(?:open|fancy)\/([a-f0-9]{16,})/i)
  if (m) return m[1]
  // Some Temu images have format: /product/open/<uuid>/<index>.<ext>
  const uuidMatch = url.match(/\/product\/(?:open|fancy)\/([a-f0-9-]{20,})/i)
  if (uuidMatch) return uuidMatch[1].replace(/-goods.*$/, "")
  return null
}

function getImages(): { url: string; tipo: "imagen" | "video" }[] {
  const seen = new Set<string>()
  const result: { url: string; tipo: "imagen" | "video" }[] = []

  // 1. PRIMARY: top_gallery_url from URL params (always reliable for main image)
  const urlParam = new URL(location.href).searchParams.get("top_gallery_url")
  let mainHash: string | null = null
  if (urlParam) {
    const url = normalizeImageUrl(urlParam)
    seen.add(url)
    result.push({ url, tipo: "imagen" })
    mainHash = extractImageHash(url)
  }

  // 2. SECONDARY: find other images with the SAME hash prefix as the main image
  // These are guaranteed to be from the same product
  if (mainHash) {
    document.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
      const src = img.src || img.dataset.src || ""
      if (!src) return
      const hash = extractImageHash(src)
      if (hash !== mainHash) return
      const url = normalizeImageUrl(src)
      if (seen.has(url)) return
      seen.add(url)
      result.push({ url, tipo: "imagen" })
    })
  }

  // 3. If no main hash found, fall back to og:image as last resort
  if (result.length === 0) {
    const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute("content")
    if (ogImage) {
      const url = normalizeImageUrl(ogImage)
      seen.add(url)
      result.push({ url, tipo: "imagen" })
    }
  }

  // 4. Videos: only if inside a strict gallery container
  // (avoid grabbing ads / cart videos)
  const gallerySelectors = [
    '[class*="MainPicture"]',
    '[class*="ProductMedia"]',
    '[class*="MainImage"]',
    '[class*="GoodsImage"]',
  ]
  for (const sel of gallerySelectors) {
    document.querySelectorAll(sel).forEach((scope) => {
      scope.querySelectorAll<HTMLVideoElement>("video").forEach((video) => {
        let src = video.getAttribute("src") || ""
        if (!src) {
          const source = video.querySelector("source")
          src = source?.getAttribute("src") || ""
        }
        if (!src || seen.has(src)) return
        seen.add(src)
        result.push({ url: src, tipo: "video" })
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

export function scrape(): ScrapedProduct | null {
  const goods_id = getGoodsId()
  if (!goods_id) return null
  const cleanUrl = `${location.origin}${location.pathname}?goods_id=${goods_id}`
  return {
    temu_url: cleanUrl,
    temu_goods_id: goods_id,
    nombre_temu: getTitle(),
    descripcion: getDescription(),
    // Price and variants are intentionally null — user fills them in admin
    // because scraping Temu's price/variant DOM is too unreliable (cart sidebar,
    // recommendations, A/B tests, obfuscated classes). The user applies their own
    // margin anyway, so this is not a real loss.
    precio: null,
    precio_anterior: null,
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
