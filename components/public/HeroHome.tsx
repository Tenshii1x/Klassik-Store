import Link from "next/link"
import { Button } from "@/components/ui/button"

export function HeroHome() {
  return (
    <section className="relative overflow-hidden bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(201,168,106,0.18),transparent_50%)]" />
      <div className="absolute top-1/2 right-[-10%] -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(201,168,106,0.06),transparent_70%)]" />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-24 md:py-32 relative z-10 grid grid-cols-1 lg:grid-cols-[1.2fr,1fr] gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-3 px-4 py-1.5 border border-gold-primary/30 rounded-full mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-primary"></span>
            <span className="eyebrow">Entrega inmediata · Pre-orden disponible</span>
          </div>
          <h1 className="font-serif text-5xl md:text-7xl leading-[0.95] tracking-tight text-white mb-7">
            Lujo que <em className="not-italic bg-gradient-gold bg-clip-text text-transparent italic font-semibold">se siente</em>.
            <br />
            Precio que <em className="not-italic bg-gradient-gold bg-clip-text text-transparent italic font-semibold">sorprende</em>.
          </h1>
          <p className="text-muted text-base leading-relaxed max-w-lg mb-9">
            Diseños que impresionan. Precios que enamoran. Descubre piezas seleccionadas para acompañar cada momento — desde el detalle perfecto hasta el regalo para toda la vida.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/buscar"><Button size="lg">Explorar catálogo</Button></Link>
            <Link href="/para-ella"><Button variant="ghost" size="lg">Para Ella ♡</Button></Link>
          </div>
        </div>

        <div className="aspect-[1/1.1] rounded-md relative bg-gradient-to-br from-[#2a1d10] to-black overflow-hidden hidden lg:block">
          <div className="absolute inset-[20%] rounded-full bg-gradient-to-br from-gold-bright via-gold-primary to-gold-deep shadow-gold-glow-lg" />
          <div className="absolute inset-[35%] rounded-full bg-gradient-to-b from-black-soft to-black border-2 border-gold-primary/30" />
          <div className="absolute bottom-6 left-6 eyebrow font-serif">— Estilo Premium —</div>
        </div>
      </div>
    </section>
  )
}
