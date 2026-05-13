import Image from "next/image"

interface Seccion {
  nombre: string
  descripcion_corta: string | null
  imagen_portada: string | null
  tono: string
}

const TONO_BG: Record<string, string> = {
  "dark-gold": "from-[#1a1410] to-black",
  "rose-gold": "from-[#2a1a1f] to-[#1a0a14]",
  "blue-cool": "from-[#0f1620] to-black",
}

export function SeccionHero({ seccion }: { seccion: Seccion }) {
  const tonoClass = TONO_BG[seccion.tono] || TONO_BG["dark-gold"]
  return (
    <section className={`relative bg-gradient-to-br ${tonoClass} overflow-hidden border-b border-border`}>
      {seccion.imagen_portada && (
        <Image
          src={seccion.imagen_portada}
          alt={seccion.nombre}
          fill
          sizes="100vw"
          className="object-cover opacity-30"
          priority
        />
      )}
      <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-20 md:py-28 text-center z-10">
        <div className="eyebrow mb-4">— Colección —</div>
        <h1 className="font-serif text-5xl md:text-6xl text-white mb-5">{seccion.nombre}</h1>
        {seccion.descripcion_corta && (
          <p className="text-white/80 text-lg max-w-2xl mx-auto">{seccion.descripcion_corta}</p>
        )}
      </div>
    </section>
  )
}
