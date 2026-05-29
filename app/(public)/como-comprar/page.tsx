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
            Explora nuestras colecciones. Cada producto indica si está disponible para{" "}
            <strong>entrega inmediata</strong> o si es una <strong>pre-orden</strong> con fecha estimada de llegada.
          </p>
        </div>

        <div>
          <h2 className="font-serif text-2xl text-gold-primary mb-3">2. Agrega al carrito</h2>
          <p className="text-white/80 leading-relaxed">
            Selecciona variantes (color, talla, modelo) si aplica y agrega al carrito. Puedes revisar tu pedido en
            cualquier momento desde el ícono del carrito.
          </p>
        </div>

        <div>
          <h2 className="font-serif text-2xl text-gold-primary mb-3">3. Elige cómo pagar</h2>
          <p className="text-white/80 leading-relaxed mb-6">
            Tenemos varias opciones para que pagues como más te convenga:
          </p>
          <div className="space-y-4">
            <div className="bg-black-surface border border-border rounded-md p-5">
              <h3 className="text-white font-semibold mb-1">Pago completo online</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Paga el 100% por Yappy{config?.yappy_numero ? ` (${config.yappy_numero})` : ""} o transferencia bancaria
                y sube tu comprobante directamente en la web. Tu pedido queda confirmado de inmediato.
              </p>
            </div>
            <div className="bg-black-surface border border-border rounded-md p-5">
              <h3 className="text-white font-semibold mb-1">Mitad ahora, mitad en la entrega</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Paga el 50% por Yappy o transferencia y sube el comprobante. Cancelas el resto en efectivo cuando
                recibes tu pedido.
              </p>
            </div>
            <div className="bg-black-surface border border-border rounded-md p-5">
              <h3 className="text-white font-semibold mb-1">Pago presencial</h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Si estás en Penonomé, Iglesia del Carmen o San Miguelito, puedes coordinar y pagar en efectivo al momento de la entrega.
              </p>
            </div>
          </div>
          <p className="text-muted text-xs mt-4">
            También puedes escribirnos por WhatsApp si prefieres coordinar directamente.
          </p>
        </div>

        {config?.mensaje_preorden && (
          <div className="bg-black-surface border border-border rounded-md p-6">
            <h2 className="font-serif text-xl text-gold-primary mb-2">Pre-órdenes</h2>
            <p className="text-white/80 mb-3">{config.mensaje_preorden}</p>
            <p className="text-white/70 text-sm leading-relaxed">
              Para separar un producto en pre-orden se requiere el <strong>50% de anticipo</strong> por Yappy o
              transferencia bancaria. Sube el comprobante en la web para confirmar tu reserva.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
