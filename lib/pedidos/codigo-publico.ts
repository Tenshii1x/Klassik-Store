const ALPHABET = "ACDEFGHJKMNPQRSTUVWXYZ23456789" // unambiguous

export function generateCodigoPublico(): string {
  const year = new Date().getFullYear()
  let suffix = ""
  for (let i = 0; i < 6; i++) {
    suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return `KS-${year}-${suffix}`
}
