import Link from "next/link"
import { Button } from "@/components/ui/button"

export function HeroHome() {
  return (
    <section className="relative overflow-hidden bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(201,168,106,0.15),transparent_60%)]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-[radial-gradient(circle,rgba(201,168,106,0.05),transparent_70%)] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-28 md:py-40 relative z-10 text-center">
        <div className="inline-flex items-center gap-3 px-4 py-1.5 border border-gold-primary/30 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-gold-primary"></span>
          <span className="eyebrow">Entrega inmediata · Pre-orden disponible</span>
        </div>
        <h1 className="font-serif text-5xl md:text-7xl leading-[0.95] tracking-tight text-white mb-8">
          Lujo que <em className="not-italic bg-gradient-gold bg-clip-text text-transparent italic font-semibold">se siente</em>.
          <br />
          Precio que <em className="not-italic bg-gradient-gold bg-clip-text text-transparent italic font-semibold">sorprende</em>.
        </h1>
        <p className="text-muted text-base md:text-lg leading-relaxed max-w-xl mx-auto mb-10">
          Diseños que impresionan. Precios que enamoran. Descubre piezas seleccionadas para acompañar cada momento — desde el detalle perfecto hasta el regalo para toda la vida.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/buscar"><Button size="lg">Explorar catálogo</Button></Link>
          <Link href="/para-el"><Button variant="ghost" size="lg">Para Él</Button></Link>
          <Link href="/para-ella"><Button variant="ghost" size="lg">Para Ella ♡</Button></Link>
        </div>
      </div>
    </section>
  )
}
