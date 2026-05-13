"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X } from "lucide-react"
import { toast } from "sonner"

const COOKIE_KEY = "klassik_email_popup_dismissed_v1"

export function EmailCapture() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const dismissed = document.cookie.includes(`${COOKIE_KEY}=1`)
    if (dismissed) return
    const t = setTimeout(() => setOpen(true), 8000)
    return () => clearTimeout(t)
  }, [])

  function dismiss() {
    setOpen(false)
    document.cookie = `${COOKIE_KEY}=1; max-age=${60 * 60 * 24 * 30}; path=/`
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        body: JSON.stringify({ email }),
        headers: { "Content-Type": "application/json" },
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || "Error")
      }
      toast.success("¡Bienvenida! Te enviaremos novedades pronto.")
      dismiss()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error")
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed bottom-6 left-6 right-6 sm:left-auto sm:right-6 sm:max-w-sm z-40 bg-black-surface border border-gold-primary/30 rounded-md p-6 shadow-deep">
      <button onClick={dismiss} className="absolute top-3 right-3 text-muted hover:text-white">
        <X size={16} />
      </button>
      <h3 className="font-serif text-2xl text-white mb-2">¿Quieres <em className="italic text-gold-primary">10% off</em>?</h3>
      <p className="text-muted text-sm mb-4">Únete a nuestro club y recibe descuento en tu primera compra.</p>
      <form onSubmit={handleSubmit} className="space-y-2">
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tucorreo@ejemplo.com"
        />
        <Button type="submit" size="md" className="w-full" disabled={submitting}>
          {submitting ? "Enviando..." : "Quiero mi descuento"}
        </Button>
      </form>
    </div>
  )
}
