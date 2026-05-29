import { FavoritosGrid } from "@/components/public/FavoritosGrid"

export default function FavoritosPage() {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-16">
      <div className="text-center mb-12">
        <div className="eyebrow mb-3">— Tu selección —</div>
        <h1 className="font-serif text-5xl text-white">
          Mis <em className="italic text-gold-primary">Favoritos</em>
        </h1>
      </div>
      <FavoritosGrid />
    </section>
  )
}
