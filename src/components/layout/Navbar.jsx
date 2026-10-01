import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Download, Menu } from 'lucide-react'
import { navItems } from '../../lib/navItems'
import { profile } from '../../data/profile'
import { useActiveSection } from '../../hooks/useActiveSection'
import { buttonVariants } from '../ui/Button'
import { ThemeToggle } from './ThemeToggle'
import { MobileMenu } from './MobileMenu'
import { cn } from '../../lib/cn'

const sectionIds = navItems.map((i) => i.id)

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'
  const active = useActiveSection(sectionIds)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const goTo = (id) => {
    setMenuOpen(false)
    if (isHome) {
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
        history.replaceState(null, '', id === 'home' ? '/' : `#${id}`)
      }
    } else {
      navigate(id === 'home' ? '/' : `/#${id}`)
    }
  }

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-300',
          scrolled
            ? 'border-b border-border glass shadow-sm'
            : 'border-b border-transparent',
        )}
      >
        <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          {/* Brand */}
          <button
            onClick={() => goTo('home')}
            className="group flex items-center gap-2.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label="Go to top"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent font-mono text-sm font-bold text-primary-foreground shadow-md shadow-primary/30 transition-transform group-hover:scale-105">
              HR
            </span>
            <span className="hidden text-sm font-semibold tracking-tight text-foreground sm:block">
              Harshit Raj
            </span>
          </button>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => {
              const isActive = isHome && active === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => goTo(item.id)}
                  className={cn(
                    'relative rounded-full px-3.5 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-surface-2 ring-1 ring-border"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  {item.label}
                </button>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <a
              href={profile.resumeUrl}
              download
              className={cn(
                buttonVariants({ variant: 'secondary', size: 'sm' }),
                'hidden sm:inline-flex',
              )}
            >
              <Download className="h-4 w-4" />
              Resume
            </a>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface-2 text-foreground transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </nav>
      </header>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        active={isHome ? active : null}
        onNavigate={goTo}
      />
    </>
  )
}
