import { z } from "zod"

export const etiquetaSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido").max(50),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color hex inválido").default("#c9a86a"),
})

export type EtiquetaInput = z.infer<typeof etiquetaSchema>
