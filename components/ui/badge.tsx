import { cn } from "@/lib/utils"
import { HTMLAttributes } from "react"

type Tone = "success" | "info" | "warning" | "danger" | "gold" | "neutral"

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

const tones: Record<Tone, string> = {
  success: "bg-success/15 text-success",
  info: "bg-info/15 text-info",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
  gold: "bg-gold-primary/15 text-gold-primary border border-gold-primary/35",
  neutral: "bg-white/5 text-muted",
}

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide",
        tones[tone],
        className
      )}
      {...props}
    />
  )
}
