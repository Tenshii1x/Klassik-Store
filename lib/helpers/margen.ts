export function calcularPrecioVenta(
  costoTemu: number,
  costoEnvio: number,
  margenPorcentaje: number
): number {
  const costoTotal = costoTemu + costoEnvio
  const precio = costoTotal * (1 + margenPorcentaje / 100)
  return Math.round(precio * 100) / 100
}

export function calcularMargenReal(
  precioVenta: number,
  costoTemu: number,
  costoEnvio: number
): number {
  const costoTotal = costoTemu + costoEnvio
  if (costoTotal === 0) return 0
  const margen = ((precioVenta - costoTotal) / costoTotal) * 100
  return Math.round(margen * 10) / 10
}

export function calcularGananciaNeta(
  precioVenta: number,
  costoTemu: number,
  costoEnvio: number
): number {
  return Math.round((precioVenta - costoTemu - costoEnvio) * 100) / 100
}
