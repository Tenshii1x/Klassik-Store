import { cn } from "@/lib/utils"
import { InputHTMLAttributes, forwardRef } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full bg-black border border-border rounded-md px-3.5 py-2.5",
        "text-white text-sm placeholder:text-muted",
        "focus:outline-none focus:border-gold-primary transition-colors",
        className
      )}
      {...props}
    />
  )
)
Input.displayName = "Input"
