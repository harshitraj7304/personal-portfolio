import { cn } from '../../lib/cn'

/** Small pill label. Optional colored dot via `dot` (a hex/color string). */
export function Badge({ className, dot, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1 text-xs font-medium text-muted-foreground',
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: dot }}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}
