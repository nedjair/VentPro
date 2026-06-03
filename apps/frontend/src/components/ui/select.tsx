import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

export interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  disabled?: boolean
}

export interface SelectTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
}

export interface SelectContentProps {
  children: React.ReactNode
}

export interface SelectItemProps {
  value: string
  children: React.ReactNode
}

export interface SelectValueProps {
  placeholder?: string
  children?: React.ReactNode
}

const SelectContext = React.createContext<{
  value?: string
  onValueChange?: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
  disabled: boolean
}>({
  open: false,
  setOpen: () => {},
  disabled: false,
})

const Select = ({ value, onValueChange, children, disabled = false }: SelectProps) => {
  const [open, setOpen] = React.useState(false)

  return (
    <SelectContext.Provider value={{ value, onValueChange, open: disabled ? false : open, setOpen, disabled }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  )
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen, disabled } = React.useContext(SelectContext)

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-xl border border-input bg-card px-4 py-2.5 text-sm text-card-foreground shadow-[0_4px_14px_rgba(15,23,42,0.04)] ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/15 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        disabled={disabled || props.disabled}
        onClick={() => {
          if (!disabled && !props.disabled) {
            setOpen(!open)
          }
        }}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
    )
  }
)
SelectTrigger.displayName = "SelectTrigger"

const SelectContent = ({ children }: SelectContentProps) => {
  const { open, setOpen } = React.useContext(SelectContext)

  if (!open) return null

  return (
    <>
      <div 
        className="fixed inset-0 z-40" 
        onClick={() => setOpen(false)}
      />
      <div className="absolute left-0 top-full z-50 mt-2 w-full overflow-auto rounded-2xl border border-border bg-popover p-1 text-popover-foreground shadow-[0_18px_40px_rgba(15,23,42,0.08)] max-h-60">
        {children}
      </div>
    </>
  )
}

const SelectItem = ({ value, children }: SelectItemProps) => {
  const { onValueChange, setOpen } = React.useContext(SelectContext)

  const handleClick = () => {
    onValueChange?.(value)
    setOpen(false)
  }

  return (
    <div
      className="cursor-pointer rounded-xl px-3 py-2 text-sm text-card-foreground transition-colors hover:bg-secondary focus:bg-secondary"
      onClick={handleClick}
    >
      {children}
    </div>
  )
}

const SelectValue = ({ placeholder, children }: SelectValueProps) => {
  const { value } = React.useContext(SelectContext)

  // Si des children sont fournis, les utiliser en priorité
  if (children) {
    return <>{children}</>
  }

  return (
    <span className={cn(!value && "text-muted-foreground")}>
      {value || placeholder}
    </span>
  )
}

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue }
