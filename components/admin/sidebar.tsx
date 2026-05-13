"use client"

import { cn } from "@/lib/utils"
import { Logo } from "@/components/brand/logo"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Package,
  Tags,
  Star,
  ShoppingBag,
  TrendingUp,
  Truck,
  Settings,
  Download,
} from "lucide-react"

interface NavItem {
  label: string
  href: string
  icon: typeof LayoutDashboard
  badge?: string | number
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const groups: NavGroup[] = [
  {
    title: "General",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    title: "Catálogo",
    items: [
      { label: "Productos", href: "/admin/productos", icon: Package },
      { label: "Secciones", href: "/admin/secciones", icon: Tags },
      { label: "Destacados", href: "/admin/destacados", icon: Star },
      { label: "Etiquetas", href: "/admin/etiquetas", icon: Tags },
      { label: "Combos", href: "/admin/combos", icon: Package },
    ],
  },
  {
    title: "Ventas",
    items: [
      { label: "Pedidos", href: "/admin/pedidos", icon: ShoppingBag },
      { label: "Próximo pedido", href: "/admin/proximo-pedido", icon: Truck },
      { label: "Reportes", href: "/admin/reportes", icon: TrendingUp },
    ],
  },
  {
    title: "Configuración",
    items: [
      { label: "Tienda", href: "/admin/configuracion", icon: Settings },
      { label: "Importador Temu", href: "/admin/importador", icon: Download },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 bg-black border-r border-border min-h-screen flex flex-col">
      <div className="px-5 py-6 border-b border-border">
        <Logo size="sm" />
        <div className="text-[0.6rem] tracking-widest text-gold-primary mt-2">— ADMIN —</div>
      </div>
      <nav className="flex-1 py-4 space-y-6">
        {groups.map((group) => (
          <div key={group.title}>
            <div className="px-5 mb-2 text-[0.62rem] tracking-widest uppercase text-muted font-semibold">
              {group.title}
            </div>
            <ul>
              {group.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-5 py-2.5 text-sm transition-colors border-l-2 border-transparent",
                        isActive
                          ? "text-gold-primary bg-gold-primary/5 border-gold-primary"
                          : "text-white/75 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                      {item.badge != null && (
                        <span className="ml-auto bg-gold-primary text-black text-[0.65rem] px-1.5 py-0.5 rounded-full font-bold">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
