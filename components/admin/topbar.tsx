import { logout } from "@/app/admin/login/actions"
import { LogOut } from "lucide-react"

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <header className="flex items-center justify-between mb-7">
      <div>
        <h1 className="font-serif text-3xl text-white">{title}</h1>
        {subtitle && (
          <p className="text-muted text-sm mt-1">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-2 px-3 py-2 text-sm text-white/75 hover:text-gold-primary transition-colors"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </form>
      </div>
    </header>
  )
}
