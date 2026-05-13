import type { ScrapedProduct, ImportResponse, ExtensionConfig } from "../lib/types"

const main = document.getElementById("main")!
const settingsBtn = document.getElementById("settings-btn")!

async function getConfig(): Promise<ExtensionConfig> {
  return new Promise((res) => {
    chrome.storage.local.get(["apiUrl", "apiKey", "adminBaseUrl"], (data) => res(data as ExtensionConfig))
  })
}

async function setConfig(cfg: ExtensionConfig): Promise<void> {
  return new Promise((res) => chrome.storage.local.set(cfg, () => res()))
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] || c))
}

function renderSetup(currentCfg: ExtensionConfig, force = false) {
  main.innerHTML = `
    <div class="setup">
      ${force ? "" : '<p class="hint" style="text-align:left;padding:0;color:#aaa;font-size:12px;">Configura la extensión antes de importar:</p>'}
      <div>
        <label>URL Edge Function</label>
        <input id="cfg-url" placeholder="https://xxx.supabase.co/functions/v1/import-temu-product" value="${escapeHtml(currentCfg.apiUrl || "")}">
      </div>
      <div>
        <label>API Key</label>
        <input id="cfg-key" type="password" placeholder="ks_..." value="${escapeHtml(currentCfg.apiKey || "")}">
      </div>
      <div>
        <label>URL del admin (opcional)</label>
        <input id="cfg-admin" placeholder="https://klassik-store-one.vercel.app" value="${escapeHtml(currentCfg.adminBaseUrl || "")}">
      </div>
      <button class="primary" id="save-cfg">Guardar</button>
      <div class="config-help">
        Genera tu API key en <strong>tu admin → Configuración → Extensión Chrome</strong>. La URL del Edge Function la encuentras en tu dashboard de Supabase → Edge Functions.
      </div>
    </div>
  `
  document.getElementById("save-cfg")!.addEventListener("click", async () => {
    const apiUrl = (document.getElementById("cfg-url") as HTMLInputElement).value.trim()
    const apiKey = (document.getElementById("cfg-key") as HTMLInputElement).value.trim()
    const adminBaseUrl = (document.getElementById("cfg-admin") as HTMLInputElement).value.trim()
    if (!apiUrl || !apiKey) return
    await setConfig({ apiUrl, apiKey, adminBaseUrl: adminBaseUrl || undefined })
    await run()
  })
}

async function run() {
  const cfg = await getConfig()
  if (!cfg.apiUrl || !cfg.apiKey) {
    renderSetup(cfg)
    return
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.url?.includes("temu.com")) {
    main.innerHTML = `<p class="hint">Abre una página de producto en <strong>Temu</strong> para importar.</p>`
    return
  }

  let scrapeResult: { ok: boolean; data?: ScrapedProduct; error?: string }
  try {
    scrapeResult = await chrome.tabs.sendMessage(tab.id!, { type: "SCRAPE" })
  } catch {
    main.innerHTML = `<p class="hint">No se pudo leer la página. <strong>Recarga Temu</strong> e intenta de nuevo (el content script necesita estar inyectado).</p>`
    return
  }

  if (!scrapeResult.ok || !scrapeResult.data) {
    main.innerHTML = `<p class="hint">No detecté un producto válido en esta página. Asegúrate de estar en la página de un producto específico (con goods_id en la URL).</p>`
    return
  }

  const p = scrapeResult.data
  const firstImg = p.imagenes[0]?.url || ""
  main.innerHTML = `
    <div class="preview">
      ${firstImg ? `<img src="${escapeHtml(firstImg)}" alt="">` : ""}
      <h3>${escapeHtml(p.nombre_temu.slice(0, 120))}</h3>
      <div class="meta">
        ${p.imagenes.length} imagen(es) · ${p.variantes.length} variante(s)
      </div>
      <div class="price">${p.precio ? `$${p.precio.toFixed(2)}` : "Sin precio detectado"}</div>
      <button class="primary" id="import">Importar a Klassik Store</button>
      <div id="status"></div>
    </div>
  `

  document.getElementById("import")!.addEventListener("click", async () => {
    const status = document.getElementById("status")!
    const btn = document.getElementById("import") as HTMLButtonElement
    btn.disabled = true
    status.textContent = "Importando..."
    try {
      const res = await fetch(cfg.apiUrl!, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${cfg.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(p),
      })
      // Read body as text first so we can show it even if it's not JSON
      const rawBody = await res.text()
      let json: ImportResponse = {}
      try {
        json = JSON.parse(rawBody) as ImportResponse
      } catch {
        // Not JSON - probably HTML error page from Supabase gateway
      }

      if (!res.ok) {
        if (json.error === "duplicate") {
          const adminLink = cfg.adminBaseUrl
            ? `<a id="open-existing">Abrir en admin</a>`
            : "(configura URL admin para abrir directo)"
          status.innerHTML = `<span class="error">Ya existe: <strong>${escapeHtml(json.existing_nombre || "")}</strong> (${escapeHtml(json.existing_estado || "")}).</span> ${adminLink}`
          const link = document.getElementById("open-existing")
          if (link && cfg.adminBaseUrl) {
            link.addEventListener("click", () => {
              chrome.tabs.create({ url: `${cfg.adminBaseUrl}/admin/productos/${json.existing_id}` })
            })
          }
        } else {
          // Show the real HTTP status + body so we can diagnose
          const detail = json.error || rawBody.slice(0, 200) || "(respuesta vacía)"
          status.innerHTML = `<span class="error">HTTP ${res.status}: ${escapeHtml(detail)}</span>`
          console.error("Klassik import failed", { status: res.status, body: rawBody })
        }
        btn.disabled = false
        return
      }
      const adminUrl = cfg.adminBaseUrl ? `${cfg.adminBaseUrl}${json.redirect_url}` : null
      status.innerHTML = `
        <span class="success">✓ Importado (${json.imagenes_ok}/${(json.imagenes_ok ?? 0) + (json.imagenes_failed ?? 0)} imágenes).</span>
        ${adminUrl ? `<br><a id="open-admin">Abrir en admin →</a>` : ""}
      `
      if (adminUrl) {
        document.getElementById("open-admin")!.addEventListener("click", () => {
          chrome.tabs.create({ url: adminUrl })
        })
      }
    } catch (e) {
      status.innerHTML = `<span class="error">Error de red: ${escapeHtml(e instanceof Error ? e.message : "")}</span>`
      btn.disabled = false
    }
  })
}

settingsBtn.addEventListener("click", async () => {
  const cfg = await getConfig()
  renderSetup(cfg, true)
})

run()
