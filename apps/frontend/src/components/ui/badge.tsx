import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantClasses = {
    default: "border-transparent bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
    secondary: "border-[rgba(198,168,106,0.18)] bg-[rgba(198,168,106,0.12)] text-[rgb(var(--color-gold))] hover:bg-[rgba(198,168,106,0.16)]",
    destructive: "border-red-100 bg-red-50 text-red-600 hover:bg-red-100",
    outline: "border-border bg-card text-muted-foreground shadow-sm hover:bg-accent",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-medium tracking-[0.02em] transition-colors focus:outline-none focus:ring-2 focus:ring-primary/15 focus:ring-offset-2",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
