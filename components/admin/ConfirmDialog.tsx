"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardBody } from "@/components/ui/card"

interface ConfirmDialogProps {
  trigger: React.ReactNode
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "danger" | "primary"
  onConfirm: () => void | Promise<void>
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleConfirm() {
    setPending(true)
    try {
      await onConfirm()
      setOpen(false)
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm">
            <CardBody className="space-y-4">
              <h2 className="font-serif text-xl text-white">{title}</h2>
              {description && <p className="text-muted text-sm">{description}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>
                  {cancelLabel}
                </Button>
                <Button
                  type="button"
                  variant={variant === "danger" ? "danger" : "primary"}
                  size="sm"
                  onClick={handleConfirm}
                  disabled={pending}
                >
                  {pending ? "..." : confirmLabel}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </>
  )
}
