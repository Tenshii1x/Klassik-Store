import { getConfiguracion } from "@/lib/catalog/queries"
import { CheckoutForm } from "@/components/public/CheckoutForm"

export const dynamic = "force-dynamic"

export default async function CheckoutPage() {
  const config = await getConfiguracion()
  return (
    <section className="max-w-3xl mx-auto px-4 md:px-8 py-12">
      <div className="text-center mb-10">
        <div className="eyebrow mb-3">— Finalizar pedido —</div>
        <h1 className="font-serif text-4xl text-white">Checkout</h1>
      </div>
      <CheckoutForm
        config={{
          yappy_numero: config?.yappy_numero ?? null,
          yappy_qr_url: config?.yappy_qr_url ?? null,
          banco_nombre: config?.banco_nombre ?? null,
          banco_cuenta: config?.banco_cuenta ?? null,
          banco_titular: config?.banco_titular ?? null,
          banco_tipo: config?.banco_tipo ?? null,
        }}
      />
    </section>
  )
}
