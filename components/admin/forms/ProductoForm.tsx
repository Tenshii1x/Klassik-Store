"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NumberInput } from "@/components/ui/number-input"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toSlug } from "@/lib/helpers/slug"
import { calcularPrecioVenta, calcularMargenReal, calcularGananciaNeta } from "@/lib/helpers/margen"
import { createProducto, updateProducto } from "@/app/admin/productos/actions"
import type { ProductoInput } from "@/lib/validations/producto"
import { toast } from "sonner"
import { formatUSD } from "@/lib/utils"

interface Seccion {
  id: string
  nombre: string
  subsecciones: { id: string; nombre: string }[]
}

interface Etiqueta {
  id: string
  nombre: string
  slug: string
  color: string
}

interface Props {
  initial?: Partial<ProductoInput> & { id?: string }
  secciones: Seccion[]
  etiquetas: Etiqueta[]
  margenGlobal: number
}

export function ProductoForm({ initial, secciones, etiquetas, margenGlobal }: Props) {
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState<ProductoInput>({
    nombre: initial?.nombre || "",
    nombre_temu: initial?.nombre_temu || null,
    descripcion: initial?.descripcion || null,
    slug: initial?.slug || "",
    modelo: initial?.modelo || null,
    seccion_id: initial?.seccion_id || null,
    subseccion_id: initial?.subseccion_id || null,
    modo: initial?.modo || "preorden",
    stock_unidades: initial?.stock_unidades ?? null,
    costo_temu: initial?.costo_temu ?? 0,
    costo_envio_unitario: initial?.costo_envio_unitario ?? 0,
    precio_venta: initial?.precio_venta ?? 0,
    precio_anterior: initial?.precio_anterior ?? null,
    margen_override_porcentaje: initial?.margen_override_porcentaje ?? null,
    temu_url: initial?.temu_url || null,
    temu_goods_id: initial?.temu_goods_id || null,
    notas_internas: initial?.notas_internas || null,
    estado: initial?.estado || "borrador",
    destacado: initial?.destacado ?? false,
    etiquetas: initial?.etiquetas || [],
    fecha_llegada_inicio: initial?.fecha_llegada_inicio || null,
    fecha_llegada_fin: initial?.fecha_llegada_fin || null,
    solo_para_ella: initial?.solo_para_ella ?? false,
    solo_para_el: initial?.solo_para_el ?? false,
  })

  function set<K extends keyof ProductoInput>(k: K, v: ProductoInput[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  const margenEfectivo = form.margen_override_porcentaje ?? margenGlobal
  const precioCalculado = calcularPrecioVenta(form.costo_temu, form.costo_envio_unitario, margenEfectivo)
  const margenReal = calcularMargenReal(form.precio_venta, form.costo_temu, form.costo_envio_unitario)
  const gananciaNeta = calcularGananciaNeta(form.precio_venta, form.costo_temu, form.costo_envio_unitario)

  const seccionSeleccionada = secciones.find((s) => s.id === form.seccion_id)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = initial?.id ? await updateProducto(initial.id, form) : await createProducto(form)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success(initial?.id ? "Producto actualizado" : "Producto creado")
    })
  }

  function toggleEtiqueta(slug: string) {
    set(
      "etiquetas",
      form.etiquetas.includes(slug) ? form.etiquetas.filter((e) => e !== slug) : [...form.etiquetas, slug]
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="font-serif text-lg text-white">Información básica</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="eyebrow block mb-1.5">Nombre evocativo</label>
              <Input
                value={form.nombre}
                onChange={(e) => set("nombre", e.target.value)}
                onBlur={() => !form.slug && set("slug", toSlug(form.nombre))}
                placeholder="Ej. Royal Blue, Pink Diamond"
                required
              />
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Slug (URL)</label>
              <Input value={form.slug} onChange={(e) => set("slug", toSlug(e.target.value))} required />
            </div>
          </div>
          <div>
            <label className="eyebrow block mb-1.5">Descripción</label>
            <textarea
              value={form.descripcion ?? ""}
              onChange={(e) => set("descripcion", e.target.value || null)}
              rows={4}
              className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm"
              placeholder="Pasión en cada detalle. Reloj de mujer con esfera burdeos profunda y acabado en oro rosado — la pieza que convierte cualquier ocasión en memorable."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="eyebrow block mb-1.5">Modelo (interno)</label>
              <Input
                value={form.modelo ?? ""}
                onChange={(e) => set("modelo", e.target.value || null)}
                placeholder="RB-001"
              />
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Nombre original (interno)</label>
              <Input
                value={form.nombre_temu ?? ""}
                onChange={(e) => set("nombre_temu", e.target.value || null)}
                placeholder="Solo referencia tuya"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-serif text-lg text-white">Categorización</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="eyebrow block mb-1.5">Sección</label>
              <select
                value={form.seccion_id ?? ""}
                onChange={(e) => {
                  set("seccion_id", e.target.value || null)
                  set("subseccion_id", null)
                }}
                className="w-full bg-black border border-border rounded-md px-3 py-2.5 text-white text-sm"
              >
                <option value="">Sin sección</option>
                {secciones.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Subsección</label>
              <select
                value={form.subseccion_id ?? ""}
                onChange={(e) => set("subseccion_id", e.target.value || null)}
                className="w-full bg-black border border-border rounded-md px-3 py-2.5 text-white text-sm"
                disabled={!seccionSeleccionada}
              >
                <option value="">Sin subsección</option>
                {seccionSeleccionada?.subsecciones.map((sub) => (
                  <option key={sub.id} value={sub.id}>{sub.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="eyebrow block mb-1.5">Etiquetas</label>
            <div className="flex flex-wrap gap-2">
              {etiquetas.length === 0 && (
                <p className="text-muted text-xs">Sin etiquetas todavía. Crea algunas en /admin/etiquetas.</p>
              )}
              {etiquetas.map((et) => (
                <button
                  key={et.id}
                  type="button"
                  onClick={() => toggleEtiqueta(et.slug)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    form.etiquetas.includes(et.slug)
                      ? "bg-gold-primary/20 border-gold-primary text-gold-primary"
                      : "bg-black border-border text-muted hover:border-gold-primary"
                  }`}
                >
                  {et.nombre}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                checked={form.solo_para_ella}
                onChange={(e) => set("solo_para_ella", e.target.checked)}
                className="accent-gold-primary"
              />
              Solo Para Ella
            </label>
            <label className="flex items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                checked={form.solo_para_el}
                onChange={(e) => set("solo_para_el", e.target.checked)}
                className="accent-gold-primary"
              />
              Solo Para Él
            </label>
            <label className="flex items-center gap-2 text-sm text-white">
              <input
                type="checkbox"
                checked={form.destacado}
                onChange={(e) => set("destacado", e.target.checked)}
                className="accent-gold-primary"
              />
              Destacado en home
            </label>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-serif text-lg text-white">Modo de venta</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => set("modo", "stock")}
              className={`flex-1 p-3 rounded-md border-2 transition-colors ${
                form.modo === "stock" ? "border-gold-primary bg-gold-primary/10" : "border-border bg-black hover:border-border-strong"
              }`}
            >
              <div className="text-white font-semibold">En stock</div>
              <div className="text-muted text-xs">Entrega inmediata. Inventario se decrementa al vender.</div>
            </button>
            <button
              type="button"
              onClick={() => set("modo", "preorden")}
              className={`flex-1 p-3 rounded-md border-2 transition-colors ${
                form.modo === "preorden" ? "border-gold-primary bg-gold-primary/10" : "border-border bg-black hover:border-border-strong"
              }`}
            >
              <div className="text-white font-semibold">Pre-orden</div>
              <div className="text-muted text-xs">El cliente lo reserva y se entrega cuando llegue al país.</div>
            </button>
          </div>
          {form.modo === "stock" ? (
            <div>
              <label className="eyebrow block mb-1.5">Unidades disponibles</label>
              <NumberInput
                integer
                min={0}
                value={form.stock_unidades ?? null}
                onChange={(v) => set("stock_unidades", v)}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="eyebrow block mb-1.5">Llegada desde</label>
                <Input
                  type="date"
                  value={form.fecha_llegada_inicio ?? ""}
                  onChange={(e) => set("fecha_llegada_inicio", e.target.value || null)}
                />
              </div>
              <div>
                <label className="eyebrow block mb-1.5">Llegada hasta</label>
                <Input
                  type="date"
                  value={form.fecha_llegada_fin ?? ""}
                  onChange={(e) => set("fecha_llegada_fin", e.target.value || null)}
                />
              </div>
              <p className="col-span-2 text-muted text-xs">
                Si dejas estos campos vacíos, se usa la fecha global configurada en Configuración → Tienda. Copy al cliente: &ldquo;Tu producto va a estar llegando entre [inicio] y [fin]&rdquo;.
              </p>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-serif text-lg text-white">Precios y costos</h3>
          <p className="text-muted text-xs mt-1">Solo tú ves los costos. El cliente solo ve precio de venta.</p>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="eyebrow block mb-1.5">Costo origen (USD)</label>
              <NumberInput
                min={0}
                value={form.costo_temu}
                onChange={(v) => set("costo_temu", v ?? 0)}
              />
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Costo envío unitario</label>
              <NumberInput
                min={0}
                value={form.costo_envio_unitario}
                onChange={(v) => set("costo_envio_unitario", v ?? 0)}
              />
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Margen override %</label>
              <NumberInput
                integer
                min={0}
                max={500}
                value={form.margen_override_porcentaje ?? null}
                onChange={(v) => set("margen_override_porcentaje", v)}
                placeholder={`Global: ${margenGlobal}%`}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="eyebrow block mb-1.5">Precio de venta (cliente ve esto)</label>
              <div className="flex gap-2">
                <NumberInput
                  min={0}
                  value={form.precio_venta}
                  onChange={(v) => set("precio_venta", v ?? 0)}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => set("precio_venta", precioCalculado)}
                >
                  Usar {formatUSD(precioCalculado)}
                </Button>
              </div>
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Precio anterior (oferta tachada)</label>
              <NumberInput
                min={0}
                value={form.precio_anterior ?? null}
                onChange={(v) => set("precio_anterior", v)}
                placeholder="Sin oferta"
              />
            </div>
          </div>
          <div className="bg-black rounded-md p-3 grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-muted text-xs">Margen real</div>
              <div className="font-serif text-lg text-gold-primary">{margenReal}%</div>
            </div>
            <div>
              <div className="text-muted text-xs">Ganancia neta</div>
              <div className="font-serif text-lg text-success">{formatUSD(gananciaNeta)}</div>
            </div>
            <div>
              <div className="text-muted text-xs">Precio sugerido (margen {margenEfectivo}%)</div>
              <div className="font-serif text-lg text-white">{formatUSD(precioCalculado)}</div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-serif text-lg text-white">Notas internas</h3>
          <p className="text-muted text-xs mt-1">Solo visibles para el admin. Nunca se muestran al cliente.</p>
        </CardHeader>
        <CardBody>
          <textarea
            value={form.notas_internas ?? ""}
            onChange={(e) => set("notas_internas", e.target.value || null)}
            rows={3}
            className="w-full bg-black border border-border rounded-md px-3 py-2 text-white text-sm"
            placeholder="Ej. Ana de IG preguntó por esto. Ya pedí 3 al supplier 14/may. Cuidado con la humedad."
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-serif text-lg text-white">Referencia origen (interna)</h3>
          <p className="text-muted text-xs mt-1">Para que tú recuerdes de dónde vino. Nunca se muestra al cliente.</p>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="eyebrow block mb-1.5">URL origen</label>
              <Input
                value={form.temu_url ?? ""}
                onChange={(e) => set("temu_url", e.target.value || null)}
                placeholder="Link del producto en supplier"
              />
            </div>
            <div>
              <label className="eyebrow block mb-1.5">ID origen</label>
              <Input
                value={form.temu_goods_id ?? ""}
                onChange={(e) => set("temu_goods_id", e.target.value || null)}
                placeholder="goods_id"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center justify-between sticky bottom-0 bg-black-surface border border-border rounded-lg p-4 mt-6">
        <div className="flex items-center gap-2">
          <span className="eyebrow">Estado:</span>
          <Badge
            tone={form.estado === "publicado" ? "success" : form.estado === "borrador" ? "warning" : "neutral"}
          >
            {form.estado}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => set("estado", "borrador")}
            disabled={isPending}
          >
            Guardar borrador
          </Button>
          <Button
            type="submit"
            onClick={() => set("estado", "publicado")}
            disabled={isPending}
          >
            {isPending ? "Guardando..." : initial?.id ? "Guardar y publicar" : "Crear y publicar"}
          </Button>
        </div>
      </div>
    </form>
  )
}
