import { cn } from '../../lib/cn'

/** Section wrapper: anchor id + consistent vertical rhythm + centered container. */
export function Section({ id, className, containerClassName, children, ...props }) {
  return (
    <section
      id={id}
      className={cn('relative scroll-mt-24 py-20 sm:py-28', className)}
      {...props}
    >
      <div className={cn('mx-auto w-full max-w-6xl px-5 sm:px-8', containerClassName)}>
        {children}
      </div>
    </section>
  )
}
