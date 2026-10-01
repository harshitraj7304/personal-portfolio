import { useEffect, useState } from 'react'

/**
 * Scroll-spy: observes the given section ids and returns the id currently
 * considered "active" (closest to the top of the viewport).
 */
export function useActiveSection(ids, options) {
  const [active, setActive] = useState(ids[0] ?? '')

  useEffect(() => {
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean)
    if (!sections.length) return

    const visible = new Map()

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.intersectionRatio)
          } else {
            visible.delete(entry.target.id)
          }
        }
        if (visible.size > 0) {
          // pick the most-visible section
          const [topId] = [...visible.entries()].sort((a, b) => b[1] - a[1])[0]
          setActive(topId)
        }
      },
      {
        rootMargin: options?.rootMargin ?? '-45% 0px -45% 0px',
        threshold: options?.threshold ?? [0, 0.25, 0.5, 0.75, 1],
      },
    )

    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [ids, options?.rootMargin, options?.threshold])

  return active
}
