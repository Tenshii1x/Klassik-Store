export const ZONAS = [
  { value: "penonome", label: "Penonomé", presencial: true },
  { value: "metro_iglesia_carmen", label: "Ciudad de Panamá · Iglesia del Carmen (metro)", presencial: true },
  { value: "metro_san_miguelito", label: "Ciudad de Panamá · San Miguelito (metro)", presencial: true },
  { value: "panama_ciudad", label: "Ciudad de Panamá · otra zona", presencial: false },
  { value: "interior", label: "Interior del país", presencial: false },
] as const

export type ZonaValue = (typeof ZONAS)[number]["value"]

export function isPresencial(zona: ZonaValue | string | null): boolean {
  return ZONAS.some((z) => z.value === zona && z.presencial)
}

export interface CartContext {
  tieneStock: boolean
  tienePreorden: boolean
  total: number
}

export interface MetodoPagoOption {
  value: string
  label: string
  description: string
  requiereComprobante: boolean
  porcentajeInicial: number
}

export function metodosPagoDisponibles(
  zona: ZonaValue | string,
  ctx: CartContext
): MetodoPagoOption[] {
  const presencial = isPresencial(zona)
  const result: MetodoPagoOption[] = []

  result.push({
    value: "yappy_full",
    label: "100% por Yappy",
    description: "Pagas todo ahora con Yappy. Subes el comprobante.",
    requiereComprobante: true,
    porcentajeInicial: 100,
  })
  result.push({
    value: "transferencia_full",
    label: "100% por transferencia bancaria",
    description: "Pagas todo ahora con transferencia. Subes el comprobante.",
    requiereComprobante: true,
    porcentajeInicial: 100,
  })

  if (ctx.tienePreorden && presencial) {
    result.push({
      value: "yappy_50_50",
      label: "50% Yappy ahora + 50% al recibir",
      description: "Pagas 50% por Yappy. El otro 50% lo pagas al recibir (efectivo, Yappy o transferencia).",
      requiereComprobante: true,
      porcentajeInicial: 50,
    })
    result.push({
      value: "transferencia_50_50",
      label: "50% transferencia ahora + 50% al recibir",
      description: "Pagas 50% por transferencia. El otro 50% lo pagas al recibir.",
      requiereComprobante: true,
      porcentajeInicial: 50,
    })
  }

  if (presencial && !ctx.tienePreorden) {
    result.push({
      value: "efectivo_full",
      label: "100% efectivo al recibir",
      description: "Pagas todo en efectivo cuando te entregamos (zona presencial únicamente).",
      requiereComprobante: false,
      porcentajeInicial: 0,
    })
  }

  return result
}
