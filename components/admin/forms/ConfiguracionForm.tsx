"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/ui/number-input"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { ImageUploader } from "@/components/admin/ImageUploader"
import { updateConfiguracion } from "@/app/admin/configuracion/actions"
import type { ConfiguracionInput } from "@/lib/validations/configuracion"
import { toast } from "sonner"

interface Props {
  initial: ConfiguracionInput
}

export function ConfiguracionForm({ initial }: Props) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState<ConfiguracionInput>(initial)

  function set<K extends keyof ConfiguracionInput>(k: K, v: ConfiguracionInput[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await updateConfiguracion(form)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("Configuración guardada")
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="font-serif text-lg text-white">Tienda</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="eyebrow block mb-1.5">Nombre de la tienda</label>
              <Input
                value={form.nombre_tienda}
                onChange={(e) => set("nombre_tienda", e.target.value)}
                required
              />
            </div>
            <div>
              <label className="eyebrow block mb-1.5">WhatsApp (con cod. país, solo números)</label>
              <Input
                value={form.whatsapp ?? ""}
                onChange={(e) => set("whatsapp", e.target.value || null)}
                placeholder="50760000000"
              />
            </div>
          </div>
          <ImageUploader
            bucket="configuracion"
            pathPrefix="tienda"
            value={form.logo_url ?? null}
            onChange={(u) => set("logo_url", u)}
            label="Logo (cuadrado)"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="eyebrow block mb-1.5">Instagram handle</label>
              <Input
                value={form.instagram_handle ?? ""}
                onChange={(e) => set("instagram_handle", e.target.value || null)}
                placeholder="@klassikstore.pa"
              />
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Instagram URL</label>
              <Input
                value={form.instagram_url ?? ""}
                onChange={(e) => set("instagram_url", e.target.value || null)}
                placeholder="https://instagram.com/klassikstore.pa"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-serif text-lg text-white">Pagos</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="eyebrow block mb-1.5">Número Yappy</label>
              <Input
                value={form.yappy_numero ?? ""}
                onChange={(e) => set("yappy_numero", e.target.value || null)}
              />
            </div>
            <ImageUploader
              bucket="configuracion"
              pathPrefix="yappy"
              value={form.yappy_qr_url ?? null}
              onChange={(u) => set("yappy_qr_url", u)}
              label="QR de Yappy"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="eyebrow block mb-1.5">Banco</label>
              <Input
                value={form.banco_nombre ?? ""}
                onChange={(e) => set("banco_nombre", e.target.value || null)}
              />
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Tipo cuenta</label>
              <select
                value={form.banco_tipo ?? ""}
                onChange={(e) =>
                  set("banco_tipo", (e.target.value || null) as ConfiguracionInput["banco_tipo"])
                }
                className="w-full bg-black border border-border rounded-md px-3 py-2.5 text-white text-sm"
              >
                <option value="">—</option>
                <option value="Ahorro">Ahorro</option>
                <option value="Corriente">Corriente</option>
              </select>
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Número de cuenta</label>
              <Input
                value={form.banco_cuenta ?? ""}
                onChange={(e) => set("banco_cuenta", e.target.value || null)}
              />
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Titular</label>
              <Input
                value={form.banco_titular ?? ""}
                onChange={(e) => set("banco_titular", e.target.value || null)}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-serif text-lg text-white">Operación</h3>
          <p className="text-muted text-xs mt-1">Margen y fechas de llegada predeterminadas.</p>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="eyebrow block mb-1.5">Margen global (%)</label>
              <NumberInput
                integer
                min={0}
                max={500}
                value={form.margen_global_porcentaje}
                onChange={(v) => set("margen_global_porcentaje", v ?? 0)}
              />
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Próxima llegada (desde)</label>
              <Input
                type="date"
                value={form.proxima_fecha_llegada_inicio ?? ""}
                onChange={(e) =>
                  set("proxima_fecha_llegada_inicio", e.target.value || null)
                }
              />
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Próxima llegada (hasta)</label>
              <Input
                type="date"
                value={form.proxima_fecha_llegada_fin ?? ""}
                onChange={(e) =>
                  set("proxima_fecha_llegada_fin", e.target.value || null)
                }
              />
            </div>
          </div>
          <div>
            <label className="eyebrow block mb-1.5">Mensaje pre-orden (mostrado al cliente)</label>
            <textarea
              value={form.mensaje_preorden ?? ""}
              onChange={(e) => set("mensaje_preorden", e.target.value || null)}
              rows={2}
              className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm"
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-serif text-lg text-white">Políticas legales</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <label className="eyebrow block mb-1.5">Política de devoluciones</label>
            <textarea
              value={form.politica_devoluciones ?? ""}
              onChange={(e) => set("politica_devoluciones", e.target.value || null)}
              rows={4}
              className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="eyebrow block mb-1.5">Política de privacidad</label>
            <textarea
              value={form.politica_privacidad ?? ""}
              onChange={(e) => set("politica_privacidad", e.target.value || null)}
              rows={4}
              className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="eyebrow block mb-1.5">Términos y condiciones</label>
            <textarea
              value={form.terminos_condiciones ?? ""}
              onChange={(e) => set("terminos_condiciones", e.target.value || null)}
              rows={4}
              className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm"
            />
          </div>
        </CardBody>
      </Card>

      <div className="flex justify-end sticky bottom-0 bg-black-surface border border-border rounded-lg p-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar configuración"}
        </Button>
      </div>
    </form>
  )
}
