import { cn } from "@/lib/utils"
import { ButtonHTMLAttributes, forwardRef } from "react"

type Variant = "primary" | "ghost" | "danger"
type Size = "sm" | "md" | "lg"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-gold text-black hover:shadow-gold-glow-lg hover:-translate-y-0.5",
  ghost:
    "bg-transparent text-white border border-white/20 hover:border-gold-primary hover:text-gold-primary",
  danger:
    "bg-danger text-white hover:opacity-90",
}

const sizes: Record<Size, string> = {
  sm: "px-3 py-2 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-9 py-4 text-xs tracking-eyebrow uppercase font-bold",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "rounded font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
)
Button.displayName = "Button"
