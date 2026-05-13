"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { updateBanner } from "@/app/admin/configuracion/actions"
import type { BannerInput } from "@/lib/validations/configuracion"
import { toast } from "sonner"

export function BannerForm({ initial }: { initial: BannerInput }) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState<BannerInput>(initial)

  function set<K extends keyof BannerInput>(k: K, v: BannerInput[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await updateBanner(form)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Banner actualizado")
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="font-serif text-lg text-white">Banner promocional</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-white">
            <input
              type="checkbox"
              checked={form.banner_activo}
              onChange={(e) => set("banner_activo", e.target.checked)}
              className="accent-gold-primary"
            />
            Banner activo (visible en todo el sitio)
          </label>
          <div>
            <label className="eyebrow block mb-1.5">Texto</label>
            <Input
              value={form.banner_texto ?? ""}
              onChange={(e) => set("banner_texto", e.target.value || null)}
              placeholder="Pre-orden con 10% off esta semana"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="eyebrow block mb-1.5">CTA texto (opcional)</label>
              <Input
                value={form.banner_cta_texto ?? ""}
                onChange={(e) => set("banner_cta_texto", e.target.value || null)}
                placeholder="Ver más"
              />
            </div>
            <div>
              <label className="eyebrow block mb-1.5">CTA URL (opcional)</label>
              <Input
                value={form.banner_cta_url ?? ""}
                onChange={(e) => set("banner_cta_url", e.target.value || null)}
                placeholder="/etiqueta/oferta"
              />
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Color</label>
              <input
                type="color"
                value={form.banner_color}
                onChange={(e) => set("banner_color", e.target.value)}
                className="w-full h-10 rounded-md border border-border bg-black cursor-pointer"
              />
            </div>
          </div>
          <div
            className="rounded-md p-4 text-center font-semibold text-sm"
            style={{ backgroundColor: form.banner_color, color: "#0a0a0a" }}
          >
            {form.banner_texto || "(vista previa: vacío)"}
            {form.banner_cta_texto && <span className="ml-3 underline">{form.banner_cta_texto}</span>}
          </div>
        </CardBody>
      </Card>
      <div className="flex justify-end sticky bottom-0 bg-black-surface border border-border rounded-lg p-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar banner"}
        </Button>
      </div>
    </form>
  )
}
