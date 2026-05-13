import { z } from "zod"

export const configuracionSchema = z.object({
  nombre_tienda: z.string().min(1).max(80),
  logo_url: z.string().url().optional().nullable(),
  whatsapp: z.string().regex(/^[0-9]+$/, "Solo números, con código de país").max(15).optional().nullable(),
  instagram_handle: z.string().max(50).optional().nullable(),
  instagram_url: z.string().url().optional().nullable(),
  yappy_numero: z.string().max(20).optional().nullable(),
  yappy_qr_url: z.string().url().optional().nullable(),
  banco_nombre: z.string().max(80).optional().nullable(),
  banco_cuenta: z.string().max(30).optional().nullable(),
  banco_titular: z.string().max(100).optional().nullable(),
  banco_tipo: z.enum(["Ahorro", "Corriente"]).optional().nullable(),
  margen_global_porcentaje: z.number().int().min(0).max(500).default(60),
  proxima_fecha_llegada_inicio: z.string().optional().nullable(),
  proxima_fecha_llegada_fin: z.string().optional().nullable(),
  mensaje_preorden: z.string().max(500).optional().nullable(),
  politica_devoluciones: z.string().max(10000).optional().nullable(),
  politica_privacidad: z.string().max(10000).optional().nullable(),
  terminos_condiciones: z.string().max(10000).optional().nullable(),
})

export type ConfiguracionInput = z.infer<typeof configuracionSchema>

export const bannerSchema = z.object({
  banner_activo: z.boolean(),
  banner_texto: z.string().max(150).optional().nullable(),
  banner_cta_texto: z.string().max(30).optional().nullable(),
  banner_cta_url: z.string().url().optional().nullable().or(z.literal("")),
  banner_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#c9a86a"),
})

export type BannerInput = z.infer<typeof bannerSchema>
