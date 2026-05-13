export interface ScrapedProduct {
  temu_url: string
  temu_goods_id: string
  nombre_temu: string
  descripcion: string | null
  precio: number | null
  precio_anterior: number | null
  imagenes: { url: string; tipo: "imagen" | "video" }[]
  variantes: { tipo: string; valor: string; imagen_url: string | null }[]
}

export interface ImportResponse {
  success?: boolean
  producto_id?: string
  imagenes_ok?: number
  imagenes_failed?: number
  redirect_url?: string
  error?: string
  existing_id?: string
  existing_nombre?: string
  existing_estado?: string
}

export interface ExtensionConfig {
  apiUrl?: string
  apiKey?: string
  adminBaseUrl?: string
}
