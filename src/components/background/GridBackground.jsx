import { useEffect, useRef } from 'react'
import { cn } from '../../lib/cn'

/**
 * Blueprint grid + soft gradient mesh + optional cursor spotlight.
 * Purely decorative (aria-hidden), pointer-events-none, and skips the
 * spotlight on coarse-pointer / touch devices for performance.
 */
export function GridBackground({ className, spotlight = true }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!spotlight) return
    const el = ref.current
    if (!el || typeof window === 'undefined') return
    if (window.matchMedia('(pointer: coarse)').matches) return

    let raf = 0
    let x = 50
    let y = 30
    const apply = () => {
      raf = 0
      el.style.setProperty('--mx', `${x}%`)
      el.style.setProperty('--my', `${y}%`)
    }
    const onMove = (e) => {
      const rect = el.getBoundingClientRect()
      x = ((e.clientX - rect.left) / rect.width) * 100
      y = ((e.clientY - rect.top) / rect.height) * 100
      if (!raf) raf = requestAnimationFrame(apply)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [spotlight])

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{ '--mx': '50%', '--my': '30%' }}
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      {/* Blueprint grid, faded toward the edges */}
      <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_65%_60%_at_50%_30%,black,transparent)]" />

      {/* Soft gradient blobs */}
      <div
        className="animate-float absolute -top-40 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full opacity-70 blur-[110px]"
        style={{ background: 'radial-gradient(circle, var(--glow-1), transparent 70%)' }}
      />
      <div
        className="absolute top-32 right-[-6rem] h-96 w-96 rounded-full opacity-60 blur-[110px]"
        style={{ background: 'radial-gradient(circle, var(--glow-2), transparent 70%)' }}
      />

      {/* Cursor spotlight */}
      {spotlight && (
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(420px circle at var(--mx) var(--my), color-mix(in srgb, var(--primary) 13%, transparent), transparent 72%)',
          }}
        />
      )}
    </div>
  )
}
