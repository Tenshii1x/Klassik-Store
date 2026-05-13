import { formatUSD } from "@/lib/utils"

interface CartItem {
  productoId: string
  varianteId?: string | null
  nombre: string
  precio: number
  cantidad: number
  modo: string
}

export function buildWhatsappMessage(items: CartItem[], storeName = "Klassik Store"): string {
  const lines: string[] = []
  lines.push(`*Pedido desde ${storeName}*`)
  lines.push("")
  let total = 0
  for (const it of items) {
    const subtotal = it.precio * it.cantidad
    total += subtotal
    const modoLabel = it.modo === "stock" ? " (entrega inmediata)" : " (pre-orden)"
    lines.push(`• ${it.nombre} x${it.cantidad}${modoLabel} — ${formatUSD(subtotal)}`)
  }
  lines.push("")
  lines.push(`*Total: ${formatUSD(total)}*`)
  lines.push("")
  lines.push("Quisiera coordinar pago y entrega. Gracias.")
  return lines.join("\n")
}

export function buildWhatsappUrl(phone: string, message: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`
}
