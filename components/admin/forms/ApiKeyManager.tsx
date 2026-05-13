"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardBody, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ConfirmDialog } from "@/components/admin/ConfirmDialog"
import { createApiKey, revokeApiKey } from "@/app/admin/configuracion/extension/actions"
import { toast } from "sonner"
import { Copy, Key, Trash2 } from "lucide-react"

interface KeyRow {
  id: string
  nombre: string
  key_prefix: string
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

export function ApiKeyManager({ keys }: { keys: KeyRow[] }) {
  const [isPending, startTransition] = useTransition()
  const [nombre, setNombre] = useState("")
  const [newKey, setNewKey] = useState<string | null>(null)

  function handleCreate() {
    if (!nombre.trim()) return
    startTransition(async () => {
      const result = await createApiKey(nombre.trim())
      if (result.error) {
        toast.error(result.error)
        return
      }
      setNewKey(result.key!)
      setNombre("")
    })
  }

  function handleRevoke(id: string) {
    startTransition(async () => {
      const result = await revokeApiKey(id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success("API key revocada")
    })
  }

  function handleCopy() {
    if (!newKey) return
    navigator.clipboard.writeText(newKey)
    toast.success("Copiado al portapapeles")
  }

  const activas = keys.filter((k) => !k.revoked_at)
  const revocadas = keys.filter((k) => k.revoked_at)

  return (
    <div className="space-y-6">
      {newKey && (
        <Card className="border-gold-primary">
          <CardHeader>
            <h3 className="font-serif text-lg text-gold-primary">⚠️ Tu nueva API key</h3>
            <p className="text-muted text-xs mt-1">
              Esta es la ÚNICA vez que verás la key completa. Cópiala ahora y guárdala. Si la pierdes, tendrás que crear otra.
            </p>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="bg-black rounded-md p-3 font-mono text-sm text-white break-all border border-border">
              {newKey}
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={handleCopy}>
                <Copy size={14} />
                Copiar
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setNewKey(null)}>
                Entendido, ya la guardé
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader>
          <h3 className="font-serif text-lg text-white">Crear nueva API key</h3>
          <p className="text-muted text-xs mt-1">
            Cada extensión necesita su propia key. Si la pierdes o la usan en otro lado, revócala y crea una nueva.
          </p>
        </CardHeader>
        <CardBody>
          <div className="flex gap-2">
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Mi laptop personal"
              className="flex-1"
            />
            <Button type="button" onClick={handleCreate} disabled={isPending || !nombre.trim()}>
              <Key size={14} />
              Crear
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-serif text-lg text-white">Activas ({activas.length})</h3>
        </CardHeader>
        <CardBody>
          {activas.length === 0 ? (
            <p className="text-muted text-sm">Sin API keys activas todavía.</p>
          ) : (
            <div className="space-y-2">
              {activas.map((k) => (
                <div key={k.id} className="flex items-center gap-3 p-3 bg-black rounded-md border border-border">
                  <div className="flex-1">
                    <div className="text-white text-sm font-medium">{k.nombre}</div>
                    <div className="text-muted text-xs font-mono">{k.key_prefix}...</div>
                  </div>
                  <div className="text-xs text-muted">
                    {k.last_used_at ? (
                      <>Usada {new Date(k.last_used_at).toLocaleDateString("es-PA")}</>
                    ) : (
                      "Sin usar aún"
                    )}
                  </div>
                  <ConfirmDialog
                    trigger={
                      <Button type="button" variant="danger" size="sm">
                        <Trash2 size={14} />
                      </Button>
                    }
                    title="¿Revocar API key?"
                    description={`"${k.nombre}" dejará de funcionar inmediatamente. Las extensiones que la usen tendrán que configurar una nueva.`}
                    onConfirm={() => handleRevoke(k.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {revocadas.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="font-serif text-lg text-muted">Revocadas ({revocadas.length})</h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-2">
              {revocadas.map((k) => (
                <div key={k.id} className="flex items-center gap-3 p-3 bg-black rounded-md border border-border opacity-60">
                  <div className="flex-1">
                    <div className="text-white text-sm font-medium line-through">{k.nombre}</div>
                    <div className="text-muted text-xs font-mono">{k.key_prefix}...</div>
                  </div>
                  <Badge tone="danger">Revocada</Badge>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
