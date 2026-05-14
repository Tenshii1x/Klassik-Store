/**
 * Main-world content script — runs in the page's actual window context, NOT
 * in the isolated content-script sandbox. This lets us read window globals
 * like __NEXT_DATA__, rawData, __INITIAL_STATE__, etc. that Temu uses to
 * store product data including video URLs (which lazy-load and don't show in
 * the DOM until clicked).
 *
 * We serialize all relevant globals into a DOM data attribute so the regular
 * content script (running in the isolated world) can read them.
 */

;(function () {
  function tryGet(getter: () => unknown): unknown {
    try {
      return getter()
    } catch {
      return undefined
    }
  }

  function safeStringify(val: unknown): string {
    if (val === undefined) return ""
    try {
      const seen = new WeakSet()
      return JSON.stringify(val, (_k, v) => {
        if (typeof v === "object" && v !== null) {
          if (seen.has(v as object)) return "[Circular]"
          seen.add(v as object)
        }
        // Skip functions and DOM nodes
        if (typeof v === "function") return undefined
        if (v && typeof v === "object" && (v as { nodeType?: unknown }).nodeType !== undefined) return undefined
        return v
      })
    } catch {
      return ""
    }
  }

  function snapshot() {
    const w = window as Record<string, unknown>
    const data: Record<string, string> = {}
    const keys = [
      "__NEXT_DATA__",
      "rawData",
      "__INITIAL_STATE__",
      "__INITIAL_PROPS__",
      "appData",
      "_INITIAL_PROPS_",
      "__PROPS__",
    ]
    for (const k of keys) {
      const val = tryGet(() => w[k])
      if (val !== undefined) {
        const s = safeStringify(val)
        if (s && s.length < 5_000_000) data[k] = s
      }
    }
    // Also dump any global variable whose value contains "video" or ".mp4"
    try {
      for (const k of Object.keys(w)) {
        if (data[k]) continue
        if (k.startsWith("_") || k.length > 40) continue
        const v = tryGet(() => w[k])
        if (!v || typeof v !== "object") continue
        const s = safeStringify(v)
        if (s && (s.includes(".mp4") || s.includes('"video') || s.includes("videoUrl"))) {
          if (s.length < 2_000_000) data[k] = s
        }
      }
    } catch {}
    try {
      document.documentElement.setAttribute(
        "data-klassik-globals",
        JSON.stringify(data)
      )
    } catch {}
  }

  // Run snapshot now AND on a delay in case data loads after document_idle
  snapshot()
  setTimeout(snapshot, 1500)
  setTimeout(snapshot, 4000)
})()
