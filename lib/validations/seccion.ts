import { z } from "zod"

export const seccionSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido").max(80),
  slug: z.string().min(1, "Slug requerido").max(80).regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  imagen_portada: z.string().url().optional().nullable(),
  descripcion_corta: z.string().max(200).optional().nullable(),
  orden: z.number().int().min(0).default(0),
  tono: z.enum(["dark-gold", "rose-gold", "blue-cool"]).default("dark-gold"),
  activa: z.boolean().default(true),
})

export type SeccionInput = z.infer<typeof seccionSchema>

export const subseccionSchema = z.object({
  seccion_id: z.string().uuid(),
  nombre: z.string().min(1).max(80),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  orden: z.number().int().min(0).default(0),
})

export type SubseccionInput = z.infer<typeof subseccionSchema>
