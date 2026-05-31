import { BloqueFemenino } from "@/components/public/BloqueFemenino"
import { getSeccionesPublicas } from "@/lib/catalog/queries"
import Link from "next/link"
import Image from "next/image"

const TONO_BG: Record<string, string> = {
  "dark-gold": "from-[#1a1410] to-black",
  "rose-gold": "from-[#2a1a1f] to-[#1a0a14]",
  "blue-cool": "from-[#0f1620] to-black",
}

export default async function ParaEllaPage() {
  const secciones = await getSeccionesPublicas()

  return (
    <>
      <BloqueFemenino />
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-20">
        <div className="text-center mb-12">
          <div className="eyebrow mb-3">— Colecciones para ella —</div>
          <h2 className="font-serif text-4xl md:text-5xl text-white">
            Explora por <em className="italic text-gold-primary">categoría</em>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {secciones.map((s, i) => {
            const tonoClass = TONO_BG[s.tono] || TONO_BG["dark-gold"]
            return (
              <Link
                key={s.id}
                href={`/para-ella/${s.slug}`}
                className="group relative aspect-[3/4] rounded-md overflow-hidden border border-border hover:border-gold-primary/40 transition-all"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${tonoClass}`} />
                {s.imagen_portada && (
                  <Image
                    src={s.imagen_portada}
                    alt={s.nombre}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover opacity-40 group-hover:opacity-60 transition-opacity"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-7 z-10">
                  <div className="text-gold-primary text-xs tracking-widest mb-2">— {String(i + 1).padStart(2, "0")} —</div>
                  <h3 className="font-serif text-3xl text-white mb-2">{s.nombre}</h3>
                  {s.descripcion_corta && (
                    <p className="text-white/80 text-sm leading-snug">{s.descripcion_corta}</p>
                  )}
                  <div className="mt-4 pt-3 border-t border-gold-primary/30 text-gold-primary text-xs tracking-wider">
                    Ver colección →
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </>
  )
}
