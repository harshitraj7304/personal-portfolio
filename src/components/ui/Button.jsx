import { cva } from 'class-variance-authority'
import { cn } from '../../lib/cn'

/** Shared button styling — also usable on <a>/<Link> via buttonVariants(). */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap transition-all duration-200 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]',
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5',
        secondary:
          'bg-surface-2 text-foreground border border-border hover:border-border-strong hover:-translate-y-0.5',
        outline:
          'border border-border-strong text-foreground hover:bg-surface-2 hover:-translate-y-0.5',
        ghost: 'text-muted-foreground hover:text-foreground hover:bg-surface-2',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-12 px-7 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export function Button({ className, variant, size, ...props }) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
}
