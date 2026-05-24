import { z } from "zod"

export const pedidoInputSchema = z.object({
  nombre_cliente: z.string().min(2, "Nombre requerido").max(100),
  whatsapp_cliente: z.string().regex(/^[0-9]+$/, "Solo números, con código país").min(8).max(15),
  email_cliente: z.string().email().optional().nullable().or(z.literal("")),
  zona_entrega: z.string().min(1, "Selecciona una zona"),
  direccion_entrega: z.string().max(500).optional().nullable(),
  metodo_pago: z.enum([
    "yappy_full",
    "transferencia_full",
    "yappy_50_50",
    "transferencia_50_50",
    "efectivo_full",
  ]),
  comprobante_inicial_url: z.string().url().optional().nullable(),
  notas_cliente: z.string().max(500).optional().nullable(),
  items: z
    .array(
      z.object({
        producto_id: z.string().uuid(),
        variante_id: z.string().uuid().optional().nullable(),
        cantidad: z.number().int().min(1).max(100),
        modo: z.enum(["stock", "preorden"]).default("stock"),
      })
    )
    .min(1, "Carrito vacío"),
})

export type PedidoInput = z.infer<typeof pedidoInputSchema>
