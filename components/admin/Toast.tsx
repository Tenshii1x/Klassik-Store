"use client"

import { Toaster as SonnerToaster } from "sonner"

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        className: "!bg-black-surface !border-border !text-white !font-sans",
      }}
    />
  )
}
