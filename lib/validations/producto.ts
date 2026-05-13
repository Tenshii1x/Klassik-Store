import { z } from "zod"

export const productoSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido").max(150),
  nombre_temu: z.string().max(200).optional().nullable(),
  descripcion: z.string().max(5000).optional().nullable(),
  slug: z.string().min(1).max(150).regex(/^[a-z0-9-]+$/),
  modelo: z.string().max(50).optional().nullable(),
  seccion_id: z.string().uuid().optional().nullable(),
  subseccion_id: z.string().uuid().optional().nullable(),
  modo: z.enum(["stock", "preorden"]).default("preorden"),
  stock_unidades: z.number().int().min(0).optional().nullable(),
  costo_temu: z.number().min(0).default(0),
  costo_envio_unitario: z.number().min(0).default(0),
  precio_venta: z.number().min(0).default(0),
  precio_anterior: z.number().min(0).optional().nullable(),
  margen_override_porcentaje: z.number().int().min(0).optional().nullable(),
  temu_url: z.string().url().optional().nullable().or(z.literal("")),
  temu_goods_id: z.string().max(50).optional().nullable(),
  notas_internas: z.string().max(2000).optional().nullable(),
  estado: z.enum(["borrador", "publicado", "archivado"]).default("borrador"),
  destacado: z.boolean().default(false),
  etiquetas: z.array(z.string()).default([]),
  fecha_llegada_inicio: z.string().optional().nullable(),
  fecha_llegada_fin: z.string().optional().nullable(),
  solo_para_ella: z.boolean().default(false),
  solo_para_el: z.boolean().default(false),
})

export type ProductoInput = z.infer<typeof productoSchema>

export const varianteSchema = z.object({
  tipo: z.string().min(1).max(30),
  valor: z.string().min(1).max(80),
  precio_extra: z.number().min(0).default(0),
  stock_unidades: z.number().int().min(0).optional().nullable(),
  imagen_url: z.string().url().optional().nullable(),
  orden: z.number().int().min(0).default(0),
})

export type VarianteInput = z.infer<typeof varianteSchema>
