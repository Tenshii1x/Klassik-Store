"use client"

import { useEffect, useState, forwardRef } from "react"
import { Input } from "@/components/ui/input"

interface NumberInputProps {
  value: number | null
  onChange: (value: number | null) => void
  integer?: boolean
  min?: number
  max?: number
  placeholder?: string
  required?: boolean
  className?: string
  disabled?: boolean
  id?: string
  name?: string
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  function NumberInput(
    { value, onChange, integer = false, min, max, placeholder, required, className, disabled, id, name },
    ref
  ) {
    const [text, setText] = useState(value === null || value === undefined ? "" : String(value))

    useEffect(() => {
      const current = text === "" || text === "-" || text.endsWith(".") ? null : Number(text)
      if (value !== current && !(text.endsWith(".") && value !== null && value === Math.trunc(value))) {
        setText(value === null || value === undefined ? "" : String(value))
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value])

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const v = e.target.value
      if (v === "" || v === "-") {
        setText(v)
        onChange(null)
        return
      }
      const pattern = integer ? /^-?\d+$/ : /^-?\d*\.?\d*$/
      if (!pattern.test(v)) return
      setText(v)
      if (v === "." || v === "-.") return
      const num = Number(v)
      if (!isNaN(num)) {
        if (min !== undefined && num < min) return
        if (max !== undefined && num > max) return
        onChange(num)
      }
    }

    function handleBlur() {
      if (text === "" || text === "-") {
        onChange(null)
        return
      }
      if (text.endsWith(".")) {
        const cleaned = text.slice(0, -1)
        setText(cleaned)
        onChange(cleaned === "" || cleaned === "-" ? null : Number(cleaned))
      }
    }

    return (
      <Input
        ref={ref}
        type="text"
        inputMode={integer ? "numeric" : "decimal"}
        pattern={integer ? "[0-9]*" : undefined}
        value={text}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        className={className}
        disabled={disabled}
        id={id}
        name={name}
      />
    )
  }
)
