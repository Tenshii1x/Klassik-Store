import { test, expect } from "@playwright/test"

test.describe("catálogo público", () => {
  test("homepage renders without auth", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByText(/lujo que/i).first()).toBeVisible()
  })

  test("header has cart icon and navigation", async ({ page }) => {
    await page.goto("/")
    // Catálogo link in nav (md+ screens, fallback to mobile menu)
    const viewport = page.viewportSize()
    if (viewport && viewport.width >= 768) {
      await expect(page.getByRole("link", { name: /catálogo/i }).first()).toBeVisible()
    } else {
      await page.getByRole("button").first().click()
      await expect(page.getByRole("link", { name: /catálogo/i }).first()).toBeVisible()
    }
  })

  test("search page accepts input and updates URL", async ({ page }) => {
    await page.goto("/buscar")
    await page.getByPlaceholder(/buscar/i).fill("test")
    await page.waitForURL(/q=test/, { timeout: 5000 })
    await expect(page).toHaveURL(/q=test/)
  })

  test("contacto page shows contact options", async ({ page }) => {
    await page.goto("/contacto")
    await expect(page.getByRole("heading", { name: /escríbenos/i })).toBeVisible()
  })

  test("como-comprar page renders steps", async ({ page }) => {
    await page.goto("/como-comprar")
    await expect(page.getByRole("heading", { name: /cómo comprar/i })).toBeVisible()
    await expect(page.getByText(/elige tu producto/i)).toBeVisible()
  })

  test("politicas page renders three sections", async ({ page }) => {
    await page.goto("/politicas")
    await expect(page.getByRole("heading", { name: /devoluciones/i })).toBeVisible()
    await expect(page.getByRole("heading", { name: /privacidad/i })).toBeVisible()
    await expect(page.getByRole("heading", { name: /términos/i })).toBeVisible()
  })

  test("cart drawer opens when cart icon clicked", async ({ page }) => {
    await page.goto("/")
    // Cart icon is the button with the bag/cart icon in the header's right side icons
    // It's the second button in the header's right-side icon group (search link first, cart second)
    const headerButtons = page.locator("header button[aria-label]").or(page.locator("header button"))
    // Try clicking the cart icon button (second button-like element in header right side)
    const cartButton = page.locator("header button").filter({ hasNot: page.locator("text=/menu/i") }).first()
    await cartButton.click()
    await expect(page.getByRole("heading", { name: /tu carrito/i })).toBeVisible({ timeout: 3000 })
  })
})
