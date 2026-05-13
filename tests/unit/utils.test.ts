import { describe, it, expect } from "vitest"
import { cn, formatUSD } from "@/lib/utils"

describe("cn", () => {
  it("merges tailwind classes correctly", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4")
  })

  it("handles conditionals", () => {
    expect(cn("base", false && "hidden", "shown")).toBe("base shown")
  })
})

describe("formatUSD", () => {
  it("formats whole numbers", () => {
    expect(formatUSD(28)).toBe("$28.00")
  })

  it("formats decimals", () => {
    expect(formatUSD(28.5)).toBe("$28.50")
  })

  it("formats large numbers with separator", () => {
    expect(formatUSD(1234.56)).toBe("$1,234.56")
  })
})
