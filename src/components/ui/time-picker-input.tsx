
"use client"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import * as React from "react"
import { useImperativeHandle } from "react"

interface TimePickerInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  picker: "hours" | "minutes"
  date: Date | undefined
  setDate: (date: Date | undefined) => void
  onRightFocus?: () => void
  onLeftFocus?: () => void
}

const TimePickerInput = React.forwardRef<
  HTMLInputElement,
  TimePickerInputProps
>(
  (
    {
      className,
      type = "text",
      value,
      id,
      name,
      date = new Date(new Date().setHours(0, 0, 0, 0)),
      setDate,
      onChange,
      onKeyDown,
      picker,
      onLeftFocus,
      onRightFocus,
      ...props
    },
    ref
  ) => {
    const [flag, setFlag] = React.useState<boolean>(false)
    const [prevValue, setPrevValue] = React.useState<string | number>("")

    const inputRef = React.useRef<HTMLInputElement>(null)
    useImperativeHandle(ref, () => inputRef.current!, [])

    const calculatedValue = React.useMemo(() => {
      const d = date || new Date()
      switch (picker) {
        case "hours":
          return d.getHours()
        case "minutes":
          return d.getMinutes()
        default:
          return 0
      }
    }, [date, picker])

    const calculateNewValue = (key: string, currentValue: number) => {
      const isNum = !Number.isNaN(parseInt(key, 10))

      if (!isNum) return currentValue

      const max = picker === "hours" ? 23 : 59
      const min = 0
      const num = parseInt(key, 10)

      if (flag) {
        setFlag(false)
        const temp = "" + currentValue + key
        if (parseInt(temp, 10) > max) return num
        return parseInt(temp, 10)
      }

      setFlag(true)
      setTimeout(() => setFlag(false), 1200)

      if (num > max) return num
      if (num < min) return min
      return num
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(e)
      const currentValue = calculatedValue
      const { key } = e

      if (key === "ArrowRight") onRightFocus?.()
      if (key === "ArrowLeft") onLeftFocus?.()
      
      const newValue = calculateNewValue(key, currentValue);
      if (newValue !== currentValue) {
        const newDate = date ? new Date(date) : new Date();
        if (picker === 'hours') newDate.setHours(newValue);
        if (picker === 'minutes') newDate.setMinutes(newValue);
        setDate(newDate);
      }
    }

    return (
      <Input
        ref={inputRef}
        id={id || picker}
        name={name || picker}
        className={cn(
          "w-12 h-9 text-center text-base",
          className
        )}
        value={value || String(calculatedValue).padStart(2, '0')}
        onChange={(e) => {
          e.preventDefault()
          onChange?.(e)
        }}
        type={type}
        onKeyDown={handleKeyDown}
        {...props}
      />
    )
  }
)

TimePickerInput.displayName = "TimePickerInput"

export { TimePickerInput }
