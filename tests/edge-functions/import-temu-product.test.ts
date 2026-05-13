/**
 * Smoke tests for the import-temu-product Edge Function.
 *
 * Requires the function to be deployed AND env vars set:
 *   EDGE_FUNCTION_URL — full URL to import-temu-product
 *   EDGE_API_KEY      — a valid API key generated from /admin/configuracion/extension
 *
 * Run with: npm run test -- tests/edge-functions/import-temu-product.test.ts
 *
 * The tests are SKIPPED when env vars are missing (CI-friendly, doesn't block
 * the rest of the unit test suite).
 */

import { describe, it, expect } from "vitest"

const URL_ENV = process.env.EDGE_FUNCTION_URL
const KEY_ENV = process.env.EDGE_API_KEY
const enabled = !!URL_ENV && !!KEY_ENV

const fakeGoodsId = () => `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

function basePayload(goodsId: string) {
  return {
    temu_url: `https://www.temu.com/pa/goods.html?goods_id=${goodsId}`,
    temu_goods_id: goodsId,
    nombre_temu: `Smoke test product ${goodsId}`,
    descripcion: "Test description from automated smoke test.",
    precio: 9.99,
    precio_anterior: 19.99,
    imagenes: [
      {
        url: "https://img.kwcdn.com/product/fancy/97bd0c76-08b0-49ed-b1d8-8c10bddbbcc5.jpg",
        tipo: "imagen" as const,
      },
    ],
    variantes: [
      { tipo: "Color", valor: "Rojo", imagen_url: null },
    ],
  }
}

describe.skipIf(!enabled)("Edge Function · import-temu-product", () => {
  it("rejects request without API key (401)", async () => {
    const res = await fetch(URL_ENV!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(basePayload(fakeGoodsId())),
    })
    expect(res.status).toBe(401)
  })

  it("rejects request with invalid API key (401)", async () => {
    const res = await fetch(URL_ENV!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer ks_invalid_key_123",
      },
      body: JSON.stringify(basePayload(fakeGoodsId())),
    })
    expect(res.status).toBe(401)
  })

  it("rejects request with invalid payload (400)", async () => {
    const res = await fetch(URL_ENV!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KEY_ENV}`,
      },
      body: JSON.stringify({ no_goods_id: true }),
    })
    expect(res.status).toBe(400)
  })

  it("accepts valid payload and creates draft product", async () => {
    const goodsId = fakeGoodsId()
    const res = await fetch(URL_ENV!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KEY_ENV}`,
      },
      body: JSON.stringify(basePayload(goodsId)),
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.producto_id).toMatch(/^[0-9a-f-]{36}$/)
    expect(json.redirect_url).toContain(json.producto_id)
  })

  it("detects duplicates and returns 409", async () => {
    const goodsId = fakeGoodsId()
    const payload = basePayload(goodsId)

    const first = await fetch(URL_ENV!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KEY_ENV}`,
      },
      body: JSON.stringify(payload),
    })
    expect(first.status).toBe(200)

    const second = await fetch(URL_ENV!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KEY_ENV}`,
      },
      body: JSON.stringify(payload),
    })
    expect(second.status).toBe(409)
    const json = await second.json()
    expect(json.error).toBe("duplicate")
    expect(json.existing_id).toBeTruthy()
  })
})

describe.skipIf(enabled)("Edge Function tests skipped", () => {
  it("set EDGE_FUNCTION_URL and EDGE_API_KEY to run", () => {
    expect(enabled).toBe(false)
  })
})
