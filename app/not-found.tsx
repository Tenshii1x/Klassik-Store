import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/brand/logo"

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-black p-6">
      <div className="text-center max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="eyebrow mb-3">— Error 404 —</div>
        <h1 className="font-serif text-5xl md:text-6xl text-white mb-4">
          Página <em className="italic text-gold-primary">no encontrada</em>
        </h1>
        <p className="text-muted text-base mb-8 leading-relaxed">
          La página que buscas no existe o fue movida. Quizás se vendió tan rápido que ya no está disponible.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/">
            <Button size="lg">Volver al inicio</Button>
          </Link>
          <Link href="/buscar">
            <Button variant="ghost" size="lg">Ver catálogo</Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
