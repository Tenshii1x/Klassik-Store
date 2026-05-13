import { z } from "zod"

export const importPayloadSchema = z.object({
  temu_url: z.string().url(),
  temu_goods_id: z.string().min(1).max(100),
  nombre_temu: z.string().min(1).max(500),
  descripcion: z.string().max(10000).optional().nullable(),
  precio: z.number().positive().optional().nullable(),
  precio_anterior: z.number().positive().optional().nullable(),
  imagenes: z.array(z.object({
    url: z.string().url(),
    tipo: z.enum(["imagen", "video"]).default("imagen"),
  })).min(1).max(20),
  variantes: z.array(z.object({
    tipo: z.string().min(1).max(30),
    valor: z.string().min(1).max(80),
    imagen_url: z.string().url().optional().nullable(),
  })).optional().default([]),
})

export type ImportPayload = z.infer<typeof importPayloadSchema>
