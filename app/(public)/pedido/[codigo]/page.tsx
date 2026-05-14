import { notFound } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatUSD } from "@/lib/utils"
import { Check } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function PedidoConfirmacionPage({
  params,
}: {
  params: Promise<{ codigo: string }>
}) {
  const { codigo } = await params
  const supabase = await createSupabaseServerClient()
  const { data: pedido } = await supabase
    .from("pedidos")
    .select(`
      id, codigo_publico, nombre_cliente, total, metodo_pago, comprobante_inicial_url,
      monto_pagado_inicial, estado_interno, created_at,
      pedido_items(id, nombre_snapshot, precio_snapshot, cantidad, modo)
    `)
    .eq("codigo_publico", codigo)
    .single()

  if (!pedido) notFound()

  return (
    <section className="max-w-2xl mx-auto px-4 md:px-8 py-16">
      <div className="text-center mb-10">
        <div className="w-16 h-16 mx-auto rounded-full bg-success/20 border border-success flex items-center justify-center mb-4">
          <Check size={28} className="text-success" />
        </div>
        <div className="eyebrow mb-2">— Pedido confirmado —</div>
        <h1 className="font-serif text-4xl text-white">¡Gracias, {pedido.nombre_cliente.split(" ")[0]}!</h1>
        <p className="text-muted text-sm mt-3">Tu código de pedido: <strong className="text-gold-primary font-mono">{pedido.codigo_publico}</strong></p>
        <p className="text-muted text-xs mt-1">Guarda este código por si necesitas referenciarlo.</p>
      </div>

      <Card>
        <CardHeader>
          <h3 className="font-serif text-lg text-white">Tu pedido</h3>
        </CardHeader>
        <CardBody className="space-y-3">
          {pedido.pedido_items?.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-white">
                {item.nombre_snapshot} <span className="text-muted">× {item.cantidad}</span>
                <Badge tone={item.modo === "stock" ? "success" : "info"} className="ml-2 text-[0.6rem]">
                  {item.modo === "stock" ? "Stock" : "Pre-orden"}
                </Badge>
              </span>
              <span className="text-gold-primary font-serif">{formatUSD(item.precio_snapshot * item.cantidad)}</span>
            </div>
          ))}
          <div className="flex justify-between pt-3 border-t border-border">
            <span className="eyebrow">Total</span>
            <span className="font-serif text-xl text-gold-primary">{formatUSD(pedido.total)}</span>
          </div>
          {pedido.monto_pagado_inicial && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Pagado:</span>
              <span className="text-success">{formatUSD(pedido.monto_pagado_inicial)}</span>
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardBody>
          <h4 className="font-serif text-lg text-white mb-3">¿Qué sigue?</h4>
          <ul className="space-y-2 text-sm text-white/80 list-disc list-inside">
            <li>Vamos a verificar tu comprobante (si lo subiste).</li>
            <li>Nos comunicamos contigo por WhatsApp para coordinar la entrega.</li>
            <li>Si hay pre-orden, te avisamos cuando esté lista.</li>
            <li>Conserva tu código de pedido por si necesitas escribirnos.</li>
          </ul>
        </CardBody>
      </Card>

      <div className="mt-10 text-center">
        <Link href="/"><Button variant="ghost">Volver al inicio</Button></Link>
      </div>
    </section>
  )
}
