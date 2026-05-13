import type { ScrapedProduct } from "../lib/types"

/**
 * Temu DOM scraper.
 *
 * Temu uses heavily obfuscated class names that change frequently, so we use
 * multiple fallback strategies:
 *  1. Try to read window globals like __INITIAL_PROPS__ or rawData (most reliable)
 *  2. Look for meta tags (og:image, og:price, etc.)
 *  3. Heuristic DOM selectors as last resort
 */

interface WindowWithTemuData extends Window {
  __INITIAL_PROPS__?: unknown
  __NEXT_DATA__?: unknown
  rawData?: unknown
}

function getGoodsId(): string | null {
  const url = new URL(location.href)
  const fromQuery = url.searchParams.get("goods_id")
  if (fromQuery) return fromQuery
  const pathMatch = url.pathname.match(/(\d{10,})/)
  if (pathMatch) return pathMatch[1]
  return null
}

function cleanTitle(t: string): string {
  // Strip common Temu suffixes like "- Temu Panama", "| Temu", "- Temu USA"
  return t
    .replace(/[\s\-—|·]+temu[\s\w]*$/i, "")
    .replace(/[\s\-—|·]+(panama|usa|mexico|colombia)\s*$/i, "")
    .trim()
}

function getTitle(): string {
  // Try DOM first since og:title often has the SEO-bloated version with " - Temu Panama"
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

  // Fall back to og:title (clean the Temu suffix)
  const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content")
  if (ogTitle && ogTitle.length > 5) return cleanTitle(ogTitle.trim())

  return cleanTitle(document.title.split("|")[0].trim()) || "Producto sin nombre"
}

/**
 * Strip Temu's image size suffix to get the highest-res version.
 * Examples:
 *   _600x600.jpeg → .jpeg
 *   _100x100.jpg → .jpg
 *   .jpg!cf=80 → .jpg
 */
function normalizeImageUrl(src: string): string {
  return src
    .replace(/_\d+x\d+(?=\.[a-z]+(\?|!|$))/i, "")
    .replace(/!\w+=\d+/g, "")
}

function looksLikeProductImage(src: string, el: HTMLImageElement | null): boolean {
  if (!src) return false
  // Must be from Temu's CDN
  if (!src.includes("kwcdn.com") && !src.includes("temu.com")) return false
  // Avoid known UI image paths
  const blacklist = [
    "/icon/", "/icons/", "/avatar/", "/banner/", "/banners/",
    "/promo/", "/promotion/", "/sprite/", "/loading", "/placeholder",
    "/default/", "/ad/", "/ads/", "/category/",
    "background", "hero", "logo",
  ]
  for (const b of blacklist) if (src.toLowerCase().includes(b)) return false
  // Avoid tiny images by inspecting natural size if the element is around
  if (el) {
    const natW = el.naturalWidth || 0
    const natH = el.naturalHeight || 0
    if (natW > 0 && natH > 0 && (natW < 200 || natH < 200)) return false
  }
  return true
}

function getImages(): { url: string; tipo: "imagen" | "video" }[] {
  const seen = new Set<string>()
  const galleryImages: string[] = []
  const otherImages: string[] = []

  // 1. Try to find the main product gallery container FIRST (don't trust og:image)
  const gallerySelectors = [
    '[class*="Gallery"]',
    '[class*="MainPicture"]',
    '[class*="ProductMedia"]',
    '[class*="Swiper"]',
    '[class*="Carousel"]',
    '[class*="ImageList"]',
    '[class*="Thumbnail"]',
    '[role="region"][aria-label*="galer" i]',
  ]
  const galleryRoots: Element[] = []
  for (const sel of gallerySelectors) {
    document.querySelectorAll(sel).forEach((el) => galleryRoots.push(el))
  }

  // 2. Collect gallery images
  for (const scope of galleryRoots) {
    scope.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
      const src = img.src || img.dataset.src || ""
      if (!looksLikeProductImage(src, img)) return
      const url = normalizeImageUrl(src)
      if (seen.has(url)) return
      seen.add(url)
      galleryImages.push(url)
    })
  }

  // 3. Fallback: if no gallery found, collect ANY product-looking images
  if (galleryImages.length === 0) {
    document.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
      const src = img.src || img.dataset.src || ""
      if (!looksLikeProductImage(src, img)) return
      const url = normalizeImageUrl(src)
      if (seen.has(url)) return
      seen.add(url)
      otherImages.push(url)
    })
  }

  // 4. og:image as LAST resort, not first (it's often the social-share generic image)
  const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute("content")
  if (ogImage && galleryImages.length === 0 && otherImages.length === 0) {
    const url = normalizeImageUrl(ogImage)
    seen.add(url)
    otherImages.push(url)
  }

  const result: { url: string; tipo: "imagen" | "video" }[] = [
    ...galleryImages.map((url) => ({ url, tipo: "imagen" as const })),
    ...otherImages.map((url) => ({ url, tipo: "imagen" as const })),
  ]

  // 5. Videos (anywhere in page)
  document.querySelectorAll<HTMLVideoElement>("video").forEach((video) => {
    let src = video.getAttribute("src") || ""
    if (!src) {
      const source = video.querySelector("source")
      src = source?.getAttribute("src") || ""
    }
    if (!src || seen.has(src)) return
    seen.add(src)
    result.push({ url: src, tipo: "video" })
  })

  return result.slice(0, 20)
}

function parseMoney(text: string | null | undefined): number | null {
  if (!text) return null
  // Strip everything except digits, dot, comma
  const cleaned = text.replace(/[^\d.,]/g, "").replace(/,/g, "")
  const n = parseFloat(cleaned)
  // Filter out: invalid, zero, tiny prices (likely shipping/tax/insurance), absurd
  if (isNaN(n) || n < 1 || n > 100000) return null
  return n
}

function getPrice(): { actual: number | null; anterior: number | null } {
  const nums: number[] = []

  // 1. og:price:amount
  const ogPrice = document.querySelector('meta[property="og:price:amount"]')?.getAttribute("content")
  const ogN = parseMoney(ogPrice)
  if (ogN) nums.push(ogN)

  // 2. JSON-LD structured data
  document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]').forEach((s) => {
    try {
      const data = JSON.parse(s.textContent || "{}")
      const offers = data.offers || data.Offer || (Array.isArray(data) ? data[0]?.offers : null)
      if (offers) {
        const price = offers.price || offers.Price
        const n = parseMoney(String(price))
        if (n) nums.push(n)
      }
    } catch {}
  })

  // 3. Look in DOM for $X.XX patterns within plausible price elements
  const priceSelectors = [
    '[class*="ItemPrice"]',
    '[class*="GoodsPrice"]',
    '[class*="Price"]',
    '[data-pl*="price"]',
    "[data-price]",
    '[class*="amount"]',
  ]
  for (const sel of priceSelectors) {
    document.querySelectorAll(sel).forEach((el) => {
      const text = el.textContent || ""
      const matches = text.match(/\$\s*[\d,.]+/g) || []
      for (const m of matches) {
        const n = parseMoney(m)
        if (n) nums.push(n)
      }
    })
  }

  // 4. Last resort: scan body text for "$X.XX" patterns
  if (nums.length === 0) {
    const bodyText = document.body.innerText.slice(0, 20000)
    const matches = bodyText.match(/\$\s*\d{1,4}[.,]\d{2}/g) || []
    for (const m of matches.slice(0, 20)) {
      const n = parseMoney(m)
      if (n) nums.push(n)
    }
  }

  if (nums.length === 0) return { actual: null, anterior: null }
  const unique = [...new Set(nums)].sort((a, b) => a - b)
  if (unique.length === 1) return { actual: unique[0], anterior: null }
  // The lowest reasonable price is usually the "actual"; the highest is "anterior"
  return { actual: unique[0], anterior: unique[unique.length - 1] }
}

function getDescription(): string | null {
  // og:description usually has the marketing description
  const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute("content")
  if (ogDesc && ogDesc.length > 10) return ogDesc.trim().slice(0, 5000)

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

  // Try multiple group patterns
  const groupSelectors = [
    '[class*="SkuGroup"]',
    '[class*="VariantGroup"]',
    '[class*="SpecGroup"]',
    '[class*="GroupContainer"]',
    '[data-pl*="sku"]',
  ]

  for (const sel of groupSelectors) {
    document.querySelectorAll(sel).forEach((group) => {
      const labelEl =
        group.querySelector('[class*="GroupTitle"], [class*="VariantTitle"], [class*="SpecTitle"], [class*="Label"]') ||
        group.querySelector("label, h3, h4")
      const tipo = (labelEl?.textContent?.trim() || "Variante").replace(/[:：]+\s*$/, "").slice(0, 30)
      const options = group.querySelectorAll('[class*="Item"], [class*="Option"], button, [role="button"]')
      options.forEach((opt) => {
        const valor =
          opt.getAttribute("data-value") ||
          opt.getAttribute("aria-label") ||
          opt.textContent?.trim() ||
          ""
        if (!valor || valor.length < 1 || valor.length > 100) return
        if (/^(siguiente|atrás|cerrar|next|back|close)$/i.test(valor)) return
        const key = `${tipo}::${valor}`
        if (seen.has(key)) return
        seen.add(key)
        const img = opt.querySelector("img")
        const imgUrl = img?.getAttribute("src") || null
        result.push({
          tipo,
          valor: valor.slice(0, 80),
          imagen_url: imgUrl ? normalizeImageUrl(imgUrl) : null,
        })
      })
    })
  }

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
