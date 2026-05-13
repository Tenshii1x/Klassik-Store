import type { ScrapedProduct } from "../lib/types"

/**
 * Extract Temu goods_id from URL search params or pathname patterns.
 * Examples:
 *   https://www.temu.com/pa/goods.html?goods_id=601105690528477
 *   https://share.temu.com/eEZSrP2W8AA (short URL → already redirected)
 */
function getGoodsId(): string | null {
  const url = new URL(location.href)
  const fromQuery = url.searchParams.get("goods_id")
  if (fromQuery) return fromQuery
  // Sometimes embedded in path like /goods/601105690528477.html
  const pathMatch = url.pathname.match(/(\d{10,})/)
  if (pathMatch) return pathMatch[1]
  return null
}

function getTitle(): string {
  const selectors = [
    'h1[data-id]',
    '[data-pl="goods-title"]',
    "h1.title",
    "h1",
    '[class*="GoodsTitle"]',
    '[class*="ProductTitle"]',
    'meta[property="og:title"]',
  ]
  for (const sel of selectors) {
    const el = document.querySelector(sel)
    if (!el) continue
    const text = el.tagName === "META" ? el.getAttribute("content") : el.textContent
    if (text && text.trim().length > 3) return text.trim()
  }
  return document.title.split("|")[0].trim() || "Producto sin nombre"
}

function getImages(): { url: string; tipo: "imagen" | "video" }[] {
  const seen = new Set<string>()
  const result: { url: string; tipo: "imagen" | "video" }[] = []

  // Images from Temu CDN
  document.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
    const src = img.src || img.dataset.src || ""
    if (!src) return
    if (!src.includes("kwcdn.com") && !src.includes("temu.com")) return
    // Avoid tiny thumbnails (icons, etc) - filter by URL hints
    if (src.includes("/icon/") || src.includes("/avatar/")) return
    // Get the highest resolution version (strip _100x100 suffixes if any)
    const cleanSrc = src.replace(/_\d+x\d+(?=\.[a-z]+(\?|$))/i, "")
    if (seen.has(cleanSrc)) return
    seen.add(cleanSrc)
    result.push({ url: cleanSrc, tipo: "imagen" })
  })

  // Videos
  document.querySelectorAll<HTMLSourceElement | HTMLVideoElement>("video, video source").forEach((el) => {
    const src = el.getAttribute("src") || ""
    if (!src) return
    if (seen.has(src)) return
    seen.add(src)
    result.push({ url: src, tipo: "video" })
  })

  // og:image meta
  const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute("content")
  if (ogImage && !seen.has(ogImage)) {
    seen.add(ogImage)
    result.unshift({ url: ogImage, tipo: "imagen" })
  }

  return result.slice(0, 20)
}

function parseMoney(text: string | null | undefined): number | null {
  if (!text) return null
  // Strip non-numeric except . and ,
  const m = text.match(/[\d.,]+/)
  if (!m) return null
  const n = parseFloat(m[0].replace(/,/g, ""))
  return isNaN(n) ? null : n
}

function getPrice(): { actual: number | null; anterior: number | null } {
  // Try common price selectors used across Temu variants
  const priceSelectors = [
    '[class*="ItemPrice"]',
    '[class*="Price"]',
    '[data-pl*="price"]',
    "[data-price]",
  ]
  const allTexts: string[] = []
  for (const sel of priceSelectors) {
    document.querySelectorAll(sel).forEach((el) => {
      const t = el.textContent?.trim()
      if (t && t.includes("$")) allTexts.push(t)
    })
  }
  const nums: number[] = []
  for (const t of allTexts) {
    const matches = t.match(/\$\s*[\d,.]+/g) || []
    for (const m of matches) {
      const n = parseMoney(m)
      if (n !== null && n > 0 && n < 10000) nums.push(n)
    }
  }
  // og:price:amount fallback
  const ogPrice = document.querySelector('meta[property="og:price:amount"]')?.getAttribute("content")
  const ogN = parseMoney(ogPrice)
  if (ogN) nums.push(ogN)

  if (nums.length === 0) return { actual: null, anterior: null }
  if (nums.length === 1) return { actual: nums[0], anterior: null }
  const sorted = [...new Set(nums)].sort((a, b) => a - b)
  return { actual: sorted[0], anterior: sorted[sorted.length - 1] }
}

function getDescription(): string | null {
  // Try various Temu description sections
  const selectors = [
    '[class*="ProductDesc"]',
    '[class*="GoodsDesc"]',
    '[class*="Description"]',
    '[class*="DetailContent"]',
    '[data-pl*="description"]',
    'meta[name="description"]',
  ]
  for (const sel of selectors) {
    const el = document.querySelector(sel)
    if (!el) continue
    const text = el.tagName === "META" ? el.getAttribute("content") : el.textContent
    if (text && text.trim().length > 10) return text.trim().slice(0, 5000)
  }
  return null
}

function getVariants(): { tipo: string; valor: string; imagen_url: string | null }[] {
  const result: { tipo: string; valor: string; imagen_url: string | null }[] = []
  const seen = new Set<string>()

  // Look for grouped variant pickers
  const groups = document.querySelectorAll('[class*="SkuGroup"], [class*="VariantGroup"], [class*="SpecGroup"]')
  groups.forEach((group) => {
    const labelEl =
      group.querySelector('[class*="GroupTitle"], [class*="VariantTitle"], [class*="SpecTitle"]') ||
      group.querySelector("label, h3, h4")
    const tipo = labelEl?.textContent?.trim().replace(/[:：]+$/, "") || "Variante"
    const options = group.querySelectorAll('[class*="SkuItem"], [class*="VariantOption"], [class*="SpecItem"], button, [role="button"]')
    options.forEach((opt) => {
      const valor = opt.getAttribute("data-value") || opt.getAttribute("aria-label") || opt.textContent?.trim() || ""
      if (!valor || valor.length < 1 || valor.length > 100) return
      const key = `${tipo}::${valor}`
      if (seen.has(key)) return
      seen.add(key)
      const img = opt.querySelector("img")
      const imgUrl = img?.getAttribute("src") || null
      result.push({ tipo: tipo.slice(0, 30), valor: valor.slice(0, 80), imagen_url: imgUrl })
    })
  })

  return result.slice(0, 50)
}

export function scrape(): ScrapedProduct | null {
  const goods_id = getGoodsId()
  if (!goods_id) return null
  const { actual, anterior } = getPrice()
  const cleanUrl = `${location.origin}${location.pathname}?goods_id=${goods_id}`
  return {
    temu_url: cleanUrl,
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
  if (msg && msg.type === "SCRAPE") {
    try {
      const data = scrape()
      sendResponse({ ok: !!data, data })
    } catch (e) {
      sendResponse({ ok: false, error: e instanceof Error ? e.message : "unknown error" })
    }
  }
  return true // keep channel open for async
})

// Also expose to window for debugging
;(window as unknown as { __klassikScrape?: () => ScrapedProduct | null }).__klassikScrape = scrape
