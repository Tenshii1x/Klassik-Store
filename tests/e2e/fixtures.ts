import { test as base } from "@playwright/test"

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || ""
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || ""

export const test = base.extend({
  page: async ({ page }, use) => {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      test.skip(true, "Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD to run admin E2E tests")
    }
    await page.goto("/admin/login")
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL)
    await page.getByLabel(/contraseña/i).fill(ADMIN_PASSWORD)
    await page.getByRole("button", { name: /entrar/i }).click()
    await page.waitForURL(/\/admin(?:$|\/(?!login))/)
    await use(page)
  },
})

export { expect } from "@playwright/test"
