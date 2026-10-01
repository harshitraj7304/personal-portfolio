import { motion } from 'framer-motion'
import { ArrowDown, ArrowUpRight, Download, Github, Linkedin, Mail } from 'lucide-react'
import { profile } from '../../data/profile'
import { buttonVariants } from '../ui/Button'
import { GridBackground } from '../background/GridBackground'
import { fadeUp, stagger } from '../../lib/motion'

export function Hero() {
  return (
    <section
      id="home"
      className="relative flex min-h-[100svh] items-center overflow-hidden pt-24 pb-16"
    >
      <GridBackground />

      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left: intro */}
        <motion.div variants={stagger(0.12)} initial="hidden" animate="show">
          <motion.a
            href="#contact"
            variants={fadeUp}
            className="group inline-flex items-center gap-2 rounded-full border border-border bg-surface-2/70 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur transition-colors hover:border-border-strong hover:text-foreground"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            {profile.availability}
          </motion.a>

          <motion.h1
            variants={fadeUp}
            className="mt-6 text-5xl font-bold leading-[1.02] tracking-tight text-foreground sm:text-6xl md:text-7xl"
          >
            Harshit <span className="text-gradient">Raj</span>
          </motion.h1>

          <motion.div
            variants={fadeUp}
            className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-lg font-medium text-foreground sm:text-xl"
          >
            <span>Full Stack Developer</span>
            <span className="hidden text-border-strong sm:inline">/</span>
            <span className="flex flex-wrap items-center gap-x-2 font-mono text-base text-muted-foreground sm:text-lg">
              {profile.stackLine.map((t, i) => (
                <span key={t} className="flex items-center gap-2">
                  {i > 0 && <span className="text-primary/60">•</span>}
                  {t}
                </span>
              ))}
            </span>
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            {profile.tagline} I care about clean architecture, thoughtful UI/UX
            and shipping real, working products.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-3">
            <a href="#projects" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
              View Projects
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <a href="#contact" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
              Contact Me
            </a>
            <a
              href={profile.resumeUrl}
              download
              className={buttonVariants({ variant: 'ghost', size: 'lg' })}
            >
              <Download className="h-4 w-4" />
              Résumé
            </a>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-8 flex items-center gap-3">
            <HeroSocial href={profile.socials.github} label="GitHub">
              <Github className="h-[18px] w-[18px]" />
            </HeroSocial>
            <HeroSocial href={profile.socials.linkedin} label="LinkedIn">
              <Linkedin className="h-[18px] w-[18px]" />
            </HeroSocial>
            <HeroSocial href={profile.socials.email} label="Email">
              <Mail className="h-[18px] w-[18px]" />
            </HeroSocial>
            <span className="ml-1 font-mono text-xs text-muted-foreground">
              @{profile.socials.githubUser}
            </span>
          </motion.div>
        </motion.div>

        {/* Right: terminal card */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative hidden lg:block"
        >
          <TerminalCard />
        </motion.div>
      </div>

      {/* Scroll cue */}
      <a
        href="#about"
        aria-label="Scroll to About"
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-muted-foreground transition-colors hover:text-foreground sm:flex"
      >
        <span className="text-[11px] font-medium uppercase tracking-[0.2em]">Scroll</span>
        <motion.span
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ArrowDown className="h-4 w-4" />
        </motion.span>
      </a>
    </section>
  )
}

function HeroSocial({ href, label, children }) {
  const external = href.startsWith('http')
  return (
    <a
      href={href}
      aria-label={label}
      {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
      className="grid h-11 w-11 place-items-center rounded-full border border-border bg-surface-2/60 text-muted-foreground backdrop-blur transition-all hover:-translate-y-0.5 hover:border-border-strong hover:text-foreground"
    >
      {children}
    </a>
  )
}

function TerminalCard() {
  return (
    <div className="relative">
      {/* glow */}
      <div
        className="absolute -inset-4 -z-10 rounded-3xl opacity-40 blur-2xl"
        style={{ background: 'linear-gradient(120deg, var(--glow-1), var(--glow-2))' }}
        aria-hidden="true"
      />
      <div className="overflow-hidden rounded-2xl border border-border bg-surface/90 shadow-2xl backdrop-blur">
        {/* window chrome */}
        <div className="flex items-center gap-2 border-b border-border bg-surface-2/80 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="ml-2 font-mono text-xs text-muted-foreground">
            harshit@portfolio: ~
          </span>
        </div>
        {/* body */}
        <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed">
          <code className="text-muted-foreground">
            <span className="text-emerald-400">➜</span> <span className="text-accent-cyan">~</span> whoami
            {'\n'}
            <span className="text-foreground">harshit-raj</span>
            {'\n\n'}
            <span className="text-emerald-400">➜</span> <span className="text-accent-cyan">~</span> cat{' '}
            <span className="text-foreground">profile.json</span>
            {'\n'}
            {'{'}
            {'\n'}
            {'  '}
            <span className="text-primary">"role"</span>:{' '}
            <span className="text-amber-400">"Full Stack Developer"</span>,{'\n'}
            {'  '}
            <span className="text-primary">"stack"</span>: [
            <span className="text-amber-400">"React"</span>,{' '}
            <span className="text-amber-400">"MERN"</span>,{' '}
            <span className="text-amber-400">"Java"</span>,{' '}
            <span className="text-amber-400">"AI"</span>],{'\n'}
            {'  '}
            <span className="text-primary">"education"</span>:{' '}
            <span className="text-amber-400">"B.Tech CSE '26"</span>,{'\n'}
            {'  '}
            <span className="text-primary">"location"</span>:{' '}
            <span className="text-amber-400">"Lucknow, India"</span>
            {'\n'}
            {'}'}
            {'\n\n'}
            <span className="text-emerald-400">➜</span> <span className="text-accent-cyan">~</span>{' '}
            open-to-work
            {'\n'}
            <span className="text-emerald-400">▸ available for 2026</span>{' '}
            <span className="inline-block h-4 w-2 translate-y-0.5 animate-pulse bg-foreground" />
          </code>
        </pre>
      </div>
    </div>
  )
}
