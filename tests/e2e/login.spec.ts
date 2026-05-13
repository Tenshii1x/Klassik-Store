import { test, expect } from "@playwright/test"

test.describe("admin login flow", () => {
  test("/admin redirects to /admin/login when not authenticated", async ({ page }) => {
    await page.goto("/admin")
    await expect(page).toHaveURL(/.*\/admin\/login/)
    await expect(page.getByRole("heading", { name: /iniciar sesi/i })).toBeVisible()
  })

  test("shows error on invalid credentials", async ({ page }) => {
    await page.goto("/admin/login")
    await page.getByLabel(/email/i).fill("noexiste@example.com")
    await page.getByLabel(/contraseña/i).fill("wrong-password")
    await page.getByRole("button", { name: /entrar/i }).click()
    await expect(page.getByText(/credenciales incorrectas/i)).toBeVisible()
  })
})
