import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowUp, Github, Heart, Linkedin, Mail } from 'lucide-react'
import { profile } from '../../data/profile'
import { navItems } from '../../lib/navItems'
import { cn } from '../../lib/cn'

export function Footer() {
  const location = useLocation()
  const navigate = useNavigate()
  const year = new Date().getFullYear()

  const goTo = (id) => {
    if (location.pathname === '/') {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    } else {
      navigate(id === 'home' ? '/' : `/#${id}`)
    }
  }

  return (
    <footer className="relative border-t border-border bg-surface">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        {/* Brand */}
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent font-mono text-sm font-bold text-primary-foreground">
              HR
            </span>
            <span className="text-base font-semibold text-foreground">Harshit Raj</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Full Stack Developer building modern, scalable web applications with
            Java, React, Node.js, MongoDB and AI.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <FooterSocial href={profile.socials.github} label="GitHub">
              <Github className="h-[18px] w-[18px]" />
            </FooterSocial>
            <FooterSocial href={profile.socials.linkedin} label="LinkedIn">
              <Linkedin className="h-[18px] w-[18px]" />
            </FooterSocial>
            <FooterSocial href={profile.socials.email} label="Email">
              <Mail className="h-[18px] w-[18px]" />
            </FooterSocial>
          </div>
        </div>

        {/* Nav */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Navigate
          </h3>
          <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5">
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => goTo(item.id)}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Get in touch
          </h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <a
                href={profile.socials.email}
                className="break-all text-muted-foreground transition-colors hover:text-foreground"
              >
                {profile.email}
              </a>
            </li>
            <li className="text-muted-foreground">{profile.location}</li>
          </ul>
          <a
            href={profile.resumeUrl}
            download
            className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
          >
            Download Résumé →
          </a>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-5 py-6 text-sm text-muted-foreground sm:flex-row sm:px-8">
          <p className="flex items-center gap-1.5">
            © {year} Harshit Raj. Built with
            <Heart className="h-3.5 w-3.5 fill-current text-primary" aria-hidden="true" />
            React &amp; Tailwind.
          </p>
          <button
            onClick={() => goTo('home')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:border-border-strong hover:text-foreground',
            )}
          >
            Back to top <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </footer>
  )
}

function FooterSocial({ href, label, children }) {
  const external = href.startsWith('http')
  return (
    <a
      href={href}
      aria-label={label}
      {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
      className="grid h-10 w-10 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
    >
      {children}
    </a>
  )
}
