import { cn } from "@/lib/utils"

interface LogoProps {
  size?: "sm" | "md" | "lg"
  withWordmark?: boolean
  className?: string
}

const sizes = {
  sm: { circle: "w-9 h-9", text: "text-xs" },
  md: { circle: "w-12 h-12", text: "text-base" },
  lg: { circle: "w-16 h-16", text: "text-lg" },
}

export function Logo({ size = "md", withWordmark = true, className }: LogoProps) {
  const s = sizes[size]
  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <div
        className={cn(
          "rounded-full bg-black border border-gold-primary flex items-center justify-center font-display font-semibold text-gold-primary",
          s.circle
        )}
      >
        KS
      </div>
      {withWordmark && (
        <div>
          <div className={cn("font-display tracking-widest text-white", s.text)}>
            KLASSIK
          </div>
          <div className="text-[0.55rem] tracking-widest text-gold-primary mt-0.5">
            — STORE —
          </div>
        </div>
      )}
    </div>
  )
}
