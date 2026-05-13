import { getConfiguracion } from "@/lib/catalog/queries"
import { MessageCircle } from "lucide-react"

function InstagramIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

export default async function ContactoPage() {
  const config = await getConfiguracion()
  return (
    <section className="max-w-3xl mx-auto px-4 md:px-8 py-20 text-center">
      <div className="eyebrow mb-4">— Contacto —</div>
      <h1 className="font-serif text-5xl text-white mb-6">Escríbenos</h1>
      <p className="text-muted text-lg mb-10">
        Respondemos rápido. La forma más cómoda es WhatsApp o Instagram.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {config?.whatsapp && (
          <a
            href={`https://wa.me/${config.whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-6 bg-black-surface border border-border rounded-md hover:border-gold-primary transition-colors group"
          >
            <MessageCircle size={32} className="mx-auto mb-3 text-gold-primary group-hover:scale-110 transition-transform" />
            <div className="text-white font-semibold">WhatsApp</div>
            <div className="text-muted text-xs mt-1">{config.whatsapp}</div>
          </a>
        )}
        {config?.instagram_url && (
          <a
            href={config.instagram_url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-6 bg-black-surface border border-border rounded-md hover:border-gold-primary transition-colors group"
          >
            <div className="mx-auto mb-3 text-gold-primary group-hover:scale-110 transition-transform flex justify-center">
              <InstagramIcon size={32} />
            </div>
            <div className="text-white font-semibold">Instagram</div>
            <div className="text-muted text-xs mt-1">{config.instagram_handle ?? "@klassikstore.pa"}</div>
          </a>
        )}
      </div>
    </section>
  )
}
