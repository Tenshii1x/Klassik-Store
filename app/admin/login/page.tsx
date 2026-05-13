"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardBody } from "@/components/ui/card"
import { Logo } from "@/components/brand/logo"
import { useState, useTransition } from "react"
import { login } from "./actions"

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await login(formData)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-black">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>
        <Card>
          <CardBody className="space-y-5">
            <div className="text-center">
              <h1 className="font-serif text-2xl">Iniciar sesión</h1>
              <p className="text-muted text-sm mt-1">Acceso al panel administrativo</p>
            </div>
            <form action={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="eyebrow block mb-1.5">Email</label>
                <Input id="email" name="email" type="email" required autoComplete="email" />
              </div>
              <div>
                <label htmlFor="password" className="eyebrow block mb-1.5">Contraseña</label>
                <Input id="password" name="password" type="password" required autoComplete="current-password" />
              </div>
              {error && (
                <p className="text-danger text-sm">{error}</p>
              )}
              <Button type="submit" size="lg" className="w-full" disabled={isPending}>
                {isPending ? "Verificando..." : "Entrar"}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </main>
  )
}
