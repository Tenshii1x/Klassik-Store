import slugify from "slugify"

export function toSlug(input: string): string {
  return slugify(input, {
    lower: true,
    strict: true,
    locale: "es",
    trim: true,
  })
}

export function uniqueSlug(base: string, taken: string[]): string {
  const candidate = toSlug(base)
  if (!taken.includes(candidate)) return candidate
  let i = 2
  while (taken.includes(`${candidate}-${i}`)) i++
  return `${candidate}-${i}`
}
