import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    loading = false,
    fullWidth = false,
    disabled,
    children,
    ...props 
  }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-transparent font-medium tracking-[-0.01em] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/15 focus:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'
    
    const variants = {
      primary: 'bg-primary text-primary-foreground shadow-[0_16px_36px_rgba(41,83,138,0.24)] hover:bg-primary/92 hover:shadow-[0_20px_44px_rgba(41,83,138,0.3)] focus:ring-primary/20',
      secondary: 'bg-secondary text-secondary-foreground shadow-none hover:bg-muted focus:ring-muted/60',
      danger: 'bg-destructive text-destructive-foreground shadow-[0_12px_24px_rgba(239,68,68,0.16)] hover:bg-destructive/92 hover:shadow-[0_16px_30px_rgba(239,68,68,0.22)] focus:ring-destructive/20',
      ghost: 'bg-transparent text-muted-foreground shadow-none hover:bg-accent hover:text-accent-foreground focus:ring-accent/60',
      outline: 'border-border bg-card text-secondary-foreground shadow-[0_10px_26px_rgba(19,33,54,0.06)] hover:border-[rgba(198,168,106,0.32)] hover:bg-[rgba(198,168,106,0.08)] hover:text-foreground focus:ring-accent/60',
    }
    
    const sizes = {
      sm: 'h-10 px-4 text-sm',
      md: 'h-11 px-5 text-sm',
      lg: 'h-12 px-6 text-base',
    }
    
    const widthClass = fullWidth ? 'w-full' : ''
    
    return (
      <button
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          widthClass,
          className
        )}
        disabled={disabled || loading}
        ref={ref}
        {...props}
      >
        {loading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }
