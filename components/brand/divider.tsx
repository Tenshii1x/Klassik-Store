import { cn } from "@/lib/utils"

interface DividerProps {
  text?: string
  className?: string
}

export function Divider({ text, className }: DividerProps) {
  if (!text) {
    return (
      <div className={cn("h-px bg-border my-6", className)} />
    )
  }
  return (
    <div className={cn("flex items-center gap-3 my-6", className)}>
      <div className="flex-1 h-px bg-border" />
      <span className="eyebrow">— {text} —</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}
