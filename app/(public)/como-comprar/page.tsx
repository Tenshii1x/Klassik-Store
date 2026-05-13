import { getConfiguracion } from "@/lib/catalog/queries"

export default async function ComoComprarPage() {
  const config = await getConfiguracion()
  return (
    <section className="max-w-3xl mx-auto px-4 md:px-8 py-16">
      <div className="text-center mb-12">
        <div className="eyebrow mb-3">— Guía —</div>
        <h1 className="font-serif text-5xl text-white">Cómo comprar</h1>
      </div>

      <div className="space-y-12">
        <div>
          <h2 className="font-serif text-2xl text-gold-primary mb-3">1. Elige tu producto</h2>
          <p className="text-white/80 leading-relaxed">
            Explora nuestras colecciones. Cada producto indica si está disponible para <strong>entrega inmediata</strong> o si es una <strong>pre-orden</strong> con fecha estimada de llegada.
          </p>
        </div>
        <div>
          <h2 className="font-serif text-2xl text-gold-primary mb-3">2. Agrega al carrito</h2>
          <p className="text-white/80 leading-relaxed">
            Selecciona variantes (color, talla, modelo) si aplica y agrega al carrito. Puedes revisar tu pedido en cualquier momento desde el ícono del carrito.
          </p>
        </div>
        <div>
          <h2 className="font-serif text-2xl text-gold-primary mb-3">3. Coordina por WhatsApp</h2>
          <p className="text-white/80 leading-relaxed">
            Al pulsar &ldquo;Pedir por WhatsApp&rdquo; se abre la conversación con nosotros con el resumen de tu pedido. Acordamos pago y entrega de forma personal.
          </p>
        </div>
        <div>
          <h2 className="font-serif text-2xl text-gold-primary mb-3">4. Métodos de pago</h2>
          <ul className="text-white/80 list-disc list-inside space-y-1">
            <li>Yappy{config?.yappy_numero && `: ${config.yappy_numero}`}</li>
            <li>Transferencia bancaria</li>
            <li>50% Yappy/transferencia + 50% efectivo en la entrega</li>
          </ul>
        </div>
        {config?.mensaje_preorden && (
          <div className="bg-black-surface border border-border rounded-md p-6">
            <h2 className="font-serif text-xl text-gold-primary mb-2">Sobre pre-órdenes</h2>
            <p className="text-white/80">{config.mensaje_preorden}</p>
          </div>
        )}
      </div>
    </section>
  )
}
