"use client"

import Link from "next/link"
import { Logo } from "@/components/brand/logo"
import { Search, ShoppingBag, Menu, X } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { useCart } from "@/components/cart/CartProvider"

const NAV = [
  { label: "Inicio", href: "/" },
  { label: "Catálogo", href: "/buscar" },
  { label: "Para Él", href: "/para-el" },
  { label: "Para Ella", href: "/para-ella" },
  { label: "Contacto", href: "/contacto" },
]

export function Header() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { items, setOpen: setCartOpen } = useCart()
  const cartCount = items.reduce((acc, i) => acc + i.cantidad, 0)

  return (
    <header className="sticky top-0 z-40 bg-black border-b border-border backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between gap-6 h-20">
        <Link href="/" className="flex-shrink-0">
          <Logo size="sm" />
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-xs tracking-eyebrow uppercase font-medium transition-colors",
                pathname === item.href ? "text-gold-primary" : "text-white/80 hover:text-gold-primary"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 md:gap-3">
          <Link href="/buscar" className="w-10 h-10 rounded-full border border-border-strong flex items-center justify-center text-gold-primary hover:bg-gold-primary hover:text-black transition-colors">
            <Search size={16} />
          </Link>
          <button onClick={() => setCartOpen(true)} className="relative w-10 h-10 rounded-full border border-border-strong flex items-center justify-center text-gold-primary hover:bg-gold-primary hover:text-black transition-colors">
            <ShoppingBag size={16} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-gold-primary text-black text-[0.6rem] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                {cartCount}
              </span>
            )}
          </button>
          <button className="md:hidden w-10 h-10 rounded-full border border-border-strong flex items-center justify-center text-white" onClick={() => setOpen(!open)}>
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="md:hidden border-t border-border bg-black p-4 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "block px-3 py-3 text-sm uppercase tracking-wider rounded-md",
                pathname === item.href ? "bg-gold-primary/10 text-gold-primary" : "text-white hover:bg-white/5"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
