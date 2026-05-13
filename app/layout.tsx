import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Klassik Store",
  description: "Lujo que se siente. Precio que sorprende.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  )
}
