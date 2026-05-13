import { getConfiguracion } from "@/lib/catalog/queries"
import { Markdown } from "@/lib/markdown"

export default async function PoliticasPage() {
  const config = await getConfiguracion()
  return (
    <section className="max-w-3xl mx-auto px-4 md:px-8 py-16 space-y-16">
      <div className="text-center">
        <div className="eyebrow mb-3">— Información Legal —</div>
        <h1 className="font-serif text-5xl text-white">Políticas</h1>
      </div>

      <div id="devoluciones">
        <h2 className="font-serif text-3xl text-gold-primary mb-4">Devoluciones</h2>
        {config?.politica_devoluciones ? (
          <Markdown content={config.politica_devoluciones} className="text-white/80" />
        ) : (
          <p className="text-muted">Por definir.</p>
        )}
      </div>

      <div id="privacidad">
        <h2 className="font-serif text-3xl text-gold-primary mb-4">Privacidad</h2>
        {config?.politica_privacidad ? (
          <Markdown content={config.politica_privacidad} className="text-white/80" />
        ) : (
          <p className="text-muted">Por definir.</p>
        )}
      </div>

      <div id="terminos">
        <h2 className="font-serif text-3xl text-gold-primary mb-4">Términos y condiciones</h2>
        {config?.terminos_condiciones ? (
          <Markdown content={config.terminos_condiciones} className="text-white/80" />
        ) : (
          <p className="text-muted">Por definir.</p>
        )}
      </div>
    </section>
  )
}
