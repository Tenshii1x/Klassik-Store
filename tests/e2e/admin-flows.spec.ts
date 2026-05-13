import { test, expect } from "./fixtures"

test.describe("admin catalog flows", () => {
  test("admin can create a section", async ({ page }) => {
    await page.goto("/admin/secciones/nueva")
    const seccionName = `Test ${Date.now()}`
    await page.getByLabel(/nombre/i).first().fill(seccionName)
    await page.getByRole("button", { name: /crear secci/i }).click()
    await expect(page).toHaveURL(/\/admin\/secciones\/[^/]+$/)
    await expect(page.getByRole("heading", { name: new RegExp(seccionName, "i") })).toBeVisible()
  })

  test("admin can create a tag", async ({ page }) => {
    await page.goto("/admin/etiquetas")
    const tagName = `Tag ${Date.now()}`
    const lastForm = page.locator("form").last()
    await lastForm.getByPlaceholder(/regalo perfecto/i).fill(tagName)
    await lastForm.getByRole("button", { name: /crear/i }).click()
    await expect(page.getByText(tagName)).toBeVisible({ timeout: 5000 })
  })

  test("admin can navigate the sidebar", async ({ page }) => {
    await page.goto("/admin")
    await expect(page.getByText("Dashboard").first()).toBeVisible()
    await page.getByRole("link", { name: /productos/i }).first().click()
    await expect(page).toHaveURL(/\/admin\/productos/)
    await page.getByRole("link", { name: /secciones/i }).first().click()
    await expect(page).toHaveURL(/\/admin\/secciones/)
  })
})
