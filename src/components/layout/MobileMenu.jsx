import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, Github, Linkedin, Mail, X } from 'lucide-react'
import { navItems } from '../../lib/navItems'
import { profile } from '../../data/profile'
import { buttonVariants } from '../ui/Button'
import { cn } from '../../lib/cn'

export function MobileMenu({ open, onClose, active, onNavigate }) {
  // Lock body scroll + close on Escape while open.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] lg:hidden"
          initial="closed"
          animate="open"
          exit="closed"
        >
          <motion.button
            aria-label="Close menu"
            onClick={onClose}
            className="absolute inset-0 h-full w-full cursor-default bg-black/50 backdrop-blur-sm"
            variants={{ open: { opacity: 1 }, closed: { opacity: 0 } }}
            transition={{ duration: 0.25 }}
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="absolute right-0 top-0 flex h-full w-[82%] max-w-sm flex-col border-l border-border bg-surface p-6"
            variants={{
              open: { x: 0 },
              closed: { x: '100%' },
            }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm text-muted-foreground">~/navigation</span>
              <button
                onClick={onClose}
                aria-label="Close menu"
                className="grid h-10 w-10 place-items-center rounded-full border border-border text-foreground transition-colors hover:border-border-strong"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="mt-8 flex flex-col gap-1">
              {navItems.map((item, i) => (
                <motion.button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 + i * 0.05 }}
                  className={cn(
                    'flex items-center justify-between rounded-xl px-4 py-3 text-left text-lg font-medium transition-colors',
                    active === item.id
                      ? 'bg-surface-2 text-foreground'
                      : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
                  )}
                >
                  <span>{item.label}</span>
                  <span className="font-mono text-xs text-primary/70">
                    0{i + 1}
                  </span>
                </motion.button>
              ))}
            </nav>

            <div className="mt-auto space-y-4 pt-6">
              <a
                href={profile.resumeUrl}
                download
                className={cn(buttonVariants({ variant: 'primary', size: 'md' }), 'w-full')}
              >
                <Download className="h-4 w-4" />
                Download Resume
              </a>
              <div className="flex items-center justify-center gap-3">
                <SocialIcon href={profile.socials.github} label="GitHub">
                  <Github className="h-5 w-5" />
                </SocialIcon>
                <SocialIcon href={profile.socials.linkedin} label="LinkedIn">
                  <Linkedin className="h-5 w-5" />
                </SocialIcon>
                <SocialIcon href={profile.socials.email} label="Email">
                  <Mail className="h-5 w-5" />
                </SocialIcon>
              </div>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function SocialIcon({ href, label, children }) {
  const external = href.startsWith('http')
  return (
    <a
      href={href}
      aria-label={label}
      {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
      className="grid h-11 w-11 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
    >
      {children}
    </a>
  )
}
