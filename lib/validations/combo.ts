import { z } from "zod"

export const comboSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido").max(100),
  descripcion: z.string().max(1000).optional().nullable(),
  precio_combo: z.number().min(0),
  imagen_url: z.string().url().optional().nullable(),
  activo: z.boolean().default(true),
  productos: z.array(z.object({
    producto_id: z.string().uuid(),
    cantidad: z.number().int().min(1).default(1),
  })).min(2, "Un combo debe tener al menos 2 productos"),
})

export type ComboInput = z.infer<typeof comboSchema>
