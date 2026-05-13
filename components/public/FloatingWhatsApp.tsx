import { getConfiguracion } from "@/lib/catalog/queries"
import { MessageCircle } from "lucide-react"

export async function FloatingWhatsApp() {
  const config = await getConfiguracion()
  if (!config?.whatsapp) return null
  return (
    <a
      href={`https://wa.me/${config.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent("Hola Klassik Store, tengo una consulta.")}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] shadow-deep flex items-center justify-center text-white hover:scale-110 transition-transform"
      aria-label="Escríbenos por WhatsApp"
    >
      <MessageCircle size={24} />
    </a>
  )
}
