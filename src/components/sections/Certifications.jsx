import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CalendarDays,
  ChevronDown,
  ExternalLink,
  Maximize2,
  X,
} from 'lucide-react'
import { certifications } from '../../data/certifications'
import { getIcon } from '../../lib/icons'
import { Section } from '../ui/Section'
import { SectionHeading } from '../ui/SectionHeading'

const featured = certifications.filter((c) => c.featured)
const hiddenCount = certifications.length - featured.length

export function Certifications() {
  const [showAll, setShowAll] = useState(false)
  const [active, setActive] = useState(null) // cert currently open in the viewer

  const visible = showAll ? certifications : featured

  return (
    <Section id="certifications">
      <SectionHeading
        eyebrow="Certifications"
        title="Verified learning"
        description={`${certifications.length} industry certifications across Generative AI, cloud, full-stack, Java and Python — from Oracle, IBM, Infosys, HCLTech, Deloitte, Google Cloud and more. Click any card to view the certificate.`}
      />

      <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((cert, i) => {
          const Icon = getIcon(cert.icon)
          const clickable = Boolean(cert.image)
          return (
            <motion.div
              key={cert.name}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                ease: [0.22, 1, 0.36, 1],
                delay: (i % 3) * 0.06,
              }}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface p-6 transition-all duration-200 hover:-translate-y-1 hover:border-border-strong hover:shadow-lg hover:shadow-black/5"
            >
              {/* accent hairline */}
              <span
                className="absolute inset-x-0 top-0 h-0.5 opacity-70"
                style={{ backgroundColor: cert.accent }}
                aria-hidden="true"
              />

              <div className="flex items-start justify-between gap-3">
                <span
                  className="grid h-12 w-12 place-items-center rounded-xl border border-border"
                  style={{
                    color: cert.accent,
                    backgroundColor: `color-mix(in srgb, ${cert.accent} 12%, transparent)`,
                  }}
                >
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  {cert.category}
                </span>
              </div>

              <h3 className="mt-5 text-base font-semibold leading-snug text-foreground">
                {cert.name}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{cert.issuer}</p>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  {cert.date}
                </span>
                <div className="flex items-center gap-3">
                  {clickable && (
                    <span className="pointer-events-none inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary">
                      <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                      View
                    </span>
                  )}
                  {cert.credentialUrl && (
                    <a
                      href={cert.credentialUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      onClick={(e) => e.stopPropagation()}
                      className="relative z-20 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Verify
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* full-card click target → opens the certificate viewer */}
              {clickable && (
                <button
                  type="button"
                  onClick={() => setActive(cert)}
                  aria-label={`View ${cert.name} certificate`}
                  className="absolute inset-0 z-10 cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                />
              )}
            </motion.div>
          )
        })}
      </div>

      {hiddenCount > 0 && (
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-border-strong hover:bg-surface-2"
          >
            {showAll ? 'Show fewer' : `Show all ${certifications.length} certifications`}
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${showAll ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>
      )}

      <AnimatePresence>
        {active && (
          <CertificateViewer cert={active} onClose={() => setActive(null)} />
        )}
      </AnimatePresence>
    </Section>
  )
}

function CertificateViewer({ cert, onClose }) {
  const [errored, setErrored] = useState(false)

  // Lock body scroll + close on Escape while open (same pattern as MobileMenu).
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6"
      initial="closed"
      animate="open"
      exit="closed"
    >
      <motion.button
        aria-label="Close certificate viewer"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/80 backdrop-blur-sm"
        variants={{ open: { opacity: 1 }, closed: { opacity: 0 } }}
        transition={{ duration: 0.25 }}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`${cert.name} — ${cert.issuer}`}
        className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        variants={{
          open: { opacity: 1, scale: 1, y: 0 },
          closed: { opacity: 0, scale: 0.96, y: 8 },
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* header */}
        <div className="flex items-start justify-between gap-4 border-b border-border p-4 sm:p-5">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-foreground sm:text-base">
              {cert.name}
            </h3>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {cert.issuer} · {cert.date}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {cert.credentialUrl && (
              <a
                href={cert.credentialUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:border-border-strong"
              >
                Verify
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="grid h-9 w-9 place-items-center rounded-full border border-border text-foreground transition-colors hover:border-border-strong"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* certificate image */}
        <div className="flex min-h-0 flex-1 items-center justify-center bg-surface-2 p-3 sm:p-5">
          {!errored ? (
            <img
              src={cert.image}
              alt={`${cert.name} certificate issued by ${cert.issuer}`}
              onError={() => setErrored(true)}
              className="max-h-[72vh] w-auto max-w-full rounded-lg object-contain shadow-lg"
            />
          ) : (
            <div className="flex h-48 w-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
              Certificate preview is unavailable.
              {cert.credentialUrl && (
                <>
                  {' '}
                  <a
                    href={cert.credentialUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="ml-1 font-medium text-primary hover:underline"
                  >
                    Verify online
                  </a>
                </>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
