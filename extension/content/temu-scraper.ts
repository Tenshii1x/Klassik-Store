import type { ScrapedProduct } from "../lib/types"

/**
 * Temu DOM scraper — targets the thumbnail strip specifically to get
 * different product images (not duplicates of the main image).
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

  // Cut at first comma/period/parenthesis if there's content before
  const breakMatch = clean.match(/^([^,.()\[\]]+)/)
  if (breakMatch && breakMatch[1].trim().length >= 8) {
    clean = breakMatch[1].trim()
  }

  // Cap at 45 chars at a word boundary
  if (clean.length > 45) {
    const truncated = clean.slice(0, 45)
    const lastSpace = truncated.lastIndexOf(" ")
    clean = lastSpace > 15 ? truncated.slice(0, lastSpace) : truncated
  }

  // Remove trailing connector words ("de", "con", "para", etc.) repeatedly
  for (let i = 0; i < 3; i++) {
    const next = clean.replace(STOP_TAIL, "").trim()
    if (next === clean) break
    clean = next
  }

  // Remove consecutive duplicate words (e.g. "Casio Reloj Casio")
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

  // Title case
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
// IMAGES — target thumbnail strip
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

/**
 * Find the largest group of small product images that share a common ancestor.
 * Temu's thumbnail strip is typically 5-10 small images in a vertical column,
 * all wrapped in a common parent.
 */
function findThumbnailGroup(): HTMLImageElement[] {
  const allProductImgs = Array.from(document.querySelectorAll<HTMLImageElement>("img"))
    .filter((img) => {
      const src = img.src || img.dataset.src || ""
      return isProductCdnImage(src)
    })

  if (allProductImgs.length === 0) return []

  // Group by ancestor 3 levels up (skip wrapper divs)
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

function findVideoUrlInScripts(): string | null {
  // Strategy 1: Read __NEXT_DATA__ JSON if Temu uses Next.js
  const nextDataScript = document.getElementById("__NEXT_DATA__")
  if (nextDataScript?.textContent) {
    const url = searchVideoUrlInString(nextDataScript.textContent)
    if (url) return url
  }

  // Strategy 2: Search ALL inline scripts for video URL patterns
  const scripts = Array.from(document.querySelectorAll("script"))
  for (const s of scripts) {
    const text = s.textContent || ""
    if (text.length === 0) continue
    if (!text.includes("mp4") && !text.includes("video")) continue
    const url = searchVideoUrlInString(text)
    if (url) return url
  }
  return null
}

function searchVideoUrlInString(text: string): string | null {
  // Common Temu video CDN patterns + structured fields
  // Try fields first (more reliable)
  const fieldPatterns = [
    /"video[_-]?url"\s*:\s*"([^"]+\.mp4[^"]*)"/i,
    /"videoUrl"\s*:\s*"([^"]+\.mp4[^"]*)"/i,
    /"hd_video_url"\s*:\s*"([^"]+\.mp4[^"]*)"/i,
    /"hd_url"\s*:\s*"([^"]+\.mp4[^"]*)"/i,
  ]
  for (const re of fieldPatterns) {
    const m = text.match(re)
    if (m && m[1]) return decodeAndCleanUrl(m[1])
  }

  // Fallback: any mp4 URL on Temu's CDN
  const cdnMp4 = text.match(/https?:\\?\/\\?\/[^"'\s]*kwcdn\.com[^"'\s]+\.mp4[^"'\s]*/g)
  if (cdnMp4 && cdnMp4[0]) return decodeAndCleanUrl(cdnMp4[0])

  // Very generic fallback: any mp4 URL
  const anyMp4 = text.match(/https?:\\?\/\\?\/[^"'\s]+\.mp4[^"'\s]*/g)
  if (anyMp4 && anyMp4[0]) return decodeAndCleanUrl(anyMp4[0])

  return null
}

function decodeAndCleanUrl(s: string): string {
  return s
    .replace(/\\u002F/gi, "/")
    .replace(/\\\//g, "/")
    .replace(/\\"/g, "")
    .replace(/[",'\s]+$/, "")
    .replace(/\\u0026/gi, "&")
    .replace(/\\u003D/gi, "=")
}

function getImages(): { url: string; tipo: "imagen" | "video" }[] {
  const seenUrls = new Set<string>()
  const seenHashes = new Set<string>()
  const images: { url: string; tipo: "imagen" | "video" }[] = []
  const videos: { url: string; tipo: "imagen" | "video" }[] = []

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

  // 1. Main image from URL param
  const urlParam = new URL(location.href).searchParams.get("top_gallery_url")
  if (urlParam) tryAddImage(urlParam)

  // 2. Thumbnail strip
  const thumbs = findThumbnailGroup()
  for (const img of thumbs) {
    const src = img.src || img.dataset.src || ""
    tryAddImage(src)
  }

  // 3. Video — first try DOM <video>, then inline scripts (Temu lazy-loads)
  document.querySelectorAll<HTMLVideoElement>("video").forEach((video) => {
    let src = video.getAttribute("src") || ""
    if (!src) src = video.querySelector("source")?.getAttribute("src") || ""
    if (!src || seenUrls.has(src)) return
    seenUrls.add(src)
    videos.push({ url: src, tipo: "video" })
  })

  if (videos.length === 0) {
    const videoUrl = findVideoUrlInScripts()
    if (videoUrl && !seenUrls.has(videoUrl)) {
      seenUrls.add(videoUrl)
      videos.push({ url: videoUrl, tipo: "video" })
    }
  }

  // Limit images to 5 (user preference); video doesn't count toward image cap
  const finalImages = images.slice(0, 5)
  return [...videos, ...finalImages]
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
    // Remove Temu marketing prefix/suffix and limit length
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

;(window as WindowWithTemuData & { __klassikScrape?: () => ScrapedProduct | null }).__klassikScrape = scrape
