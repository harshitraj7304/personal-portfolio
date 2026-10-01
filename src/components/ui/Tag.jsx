import { cn } from '../../lib/cn'

/** Monospace tech chip used for stacks. */
export function Tag({ className, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-border bg-surface px-2.5 py-1 font-mono text-xs text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
