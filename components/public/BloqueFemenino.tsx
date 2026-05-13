import Link from "next/link"

export function BloqueFemenino() {
  return (
    <section className="py-24 bg-[radial-gradient(circle_at_30%_50%,rgba(212,165,148,0.12),transparent_60%)] border-t border-border">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <h2 className="font-serif text-5xl md:text-6xl text-white leading-tight mb-5">
          Elegancia <em className="italic text-rose-gold">que enamora</em>.
        </h2>
        <p className="text-muted text-base tracking-wide mb-8">— Una colección pensada para ella —</p>
        <Link
          href="/para-ella"
          className="inline-block text-rose-gold text-xs tracking-eyebrow uppercase font-semibold border-b border-rose-gold/50 pb-1 hover:border-rose-gold transition-colors"
        >
          Ver colección para ella →
        </Link>
      </div>
    </section>
  )
}
