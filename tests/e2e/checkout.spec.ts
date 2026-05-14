import { test, expect } from "@playwright/test"

test.describe("checkout flow", () => {
  test("checkout shows empty cart message when no items", async ({ page }) => {
    await page.goto("/checkout")
    await expect(page.getByText(/carrito está vacío/i)).toBeVisible()
  })

  test("checkout page heading renders", async ({ page }) => {
    await page.goto("/checkout")
    await expect(page.getByRole("heading", { name: /checkout/i })).toBeVisible()
    await expect(page.getByText(/finalizar pedido/i)).toBeVisible()
  })

  test("invalid order code returns 404", async ({ page }) => {
    const res = await page.goto("/pedido/KS-2099-INVALID")
    expect(res?.status()).toBe(404)
  })

  test("cart drawer shows checkout button when items added (requires real product)", async ({ page }) => {
    // This test would need to seed localStorage with cart items.
    // Skipping unless we have a way to programmatically add to cart.
    test.skip(true, "requires cart seeding utility")
  })
})
