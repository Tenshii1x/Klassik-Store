import { Diamond, ShieldCheck, DollarSign, Truck } from "lucide-react"

const ITEMS = [
  { icon: Diamond, title: "Diseños que impresionan", sub: "Acabados premium" },
  { icon: ShieldCheck, title: "Calidad que acompaña", sub: "Garantizada" },
  { icon: DollarSign, title: "Precios que sorprenden", sub: "Mejor en Panamá" },
  { icon: Truck, title: "Entrega confiable", sub: "Rápida y segura" },
]

export function TrustStrip() {
  return (
    <section className="bg-[#050505] border-y border-border">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
        {ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.title} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-gold-primary flex items-center justify-center text-gold-primary flex-shrink-0">
                <Icon size={16} />
              </div>
              <div>
                <div className="text-white text-sm font-semibold">{item.title}</div>
                <div className="text-muted text-xs">{item.sub}</div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
