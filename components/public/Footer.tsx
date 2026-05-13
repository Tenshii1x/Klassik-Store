import Link from "next/link"
import { Logo } from "@/components/brand/logo"
import { getConfiguracion } from "@/lib/catalog/queries"
// NOTE: `Instagram` icon was removed from lucide-react in v1.x (trademark reasons).
// Using `Camera` as a substitute glyph for the Instagram link. Replace with custom SVG if exact brand mark is needed.
import { Camera as Instagram, MessageCircle } from "lucide-react"

export async function Footer() {
  const config = await getConfiguracion()

  return (
    <footer className="bg-black border-t border-border mt-20">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="space-y-4">
          <Logo size="md" />
          <p className="text-muted text-sm">Lujo que se siente. Precio que sorprende.</p>
          <div className="flex gap-3">
            {config?.instagram_url && (
              <a href={config.instagram_url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-gold-primary/40 flex items-center justify-center text-gold-primary hover:bg-gold-primary hover:text-black transition-colors">
                <Instagram size={16} />
              </a>
            )}
            {config?.whatsapp && (
              <a href={`https://wa.me/${config.whatsapp}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full border border-gold-primary/40 flex items-center justify-center text-gold-primary hover:bg-gold-primary hover:text-black transition-colors">
                <MessageCircle size={16} />
              </a>
            )}
          </div>
        </div>

        <div>
          <h4 className="eyebrow mb-4">Explorar</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/" className="text-white/80 hover:text-gold-primary">Inicio</Link></li>
            <li><Link href="/buscar" className="text-white/80 hover:text-gold-primary">Catálogo</Link></li>
            <li><Link href="/para-ella" className="text-white/80 hover:text-gold-primary">Para Ella</Link></li>
            <li><Link href="/para-el" className="text-white/80 hover:text-gold-primary">Para Él</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="eyebrow mb-4">Ayuda</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/como-comprar" className="text-white/80 hover:text-gold-primary">Cómo comprar</Link></li>
            <li><Link href="/contacto" className="text-white/80 hover:text-gold-primary">Contacto</Link></li>
            <li><Link href="/politicas#devoluciones" className="text-white/80 hover:text-gold-primary">Devoluciones</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="eyebrow mb-4">Legales</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/politicas#privacidad" className="text-white/80 hover:text-gold-primary">Privacidad</Link></li>
            <li><Link href="/politicas#terminos" className="text-white/80 hover:text-gold-primary">Términos</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border py-6 text-center text-xs text-muted tracking-wider">
        Métodos de pago: Yappy · Transferencia · 50% Yappy + 50% Efectivo en entrega
        <br />
        © {new Date().getFullYear()} Klassik Store. Todos los derechos reservados.
      </div>
    </footer>
  )
}
