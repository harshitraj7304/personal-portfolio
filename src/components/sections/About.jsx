import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  Award,
  CalendarDays,
  GraduationCap,
  MapPin,
  School,
} from 'lucide-react'
import { profile } from '../../data/profile'
import { Section } from '../ui/Section'
import { buttonVariants } from '../ui/Button'
import { fadeUp, stagger, viewport } from '../../lib/motion'
import { cn } from '../../lib/cn'

const facts = [
  { icon: GraduationCap, label: 'Degree', value: 'B.Tech — CSE' },
  { icon: School, label: 'University', value: 'AKTU, Lucknow' },
  { icon: Award, label: 'CGPA', value: profile.education.cgpa + ' / 10' },
  { icon: CalendarDays, label: 'Batch', value: profile.education.batch },
]

export function About() {
  return (
    <Section id="about">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        {/* Photo */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewport}
          className="mx-auto w-full max-w-sm lg:sticky lg:top-28 lg:mx-0"
        >
          <Portrait />
        </motion.div>

        {/* Narrative */}
        <motion.div
          variants={stagger(0.1)}
          initial="hidden"
          whileInView="show"
          viewport={viewport}
        >
          <motion.div
            variants={fadeUp}
            className="flex items-center gap-2.5 text-xs font-medium uppercase tracking-[0.2em] text-primary"
          >
            <span className="h-px w-6 bg-primary/60" aria-hidden="true" />
            About Me
          </motion.div>

          <motion.h2
            variants={fadeUp}
            className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            Turning ideas into real,{' '}
            <span className="text-gradient">working products</span>.
          </motion.h2>

          <motion.p
            variants={fadeUp}
            className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            {profile.intro}
          </motion.p>

          <motion.p
            variants={fadeUp}
            className="mt-4 text-base leading-relaxed text-muted-foreground"
          >
            During my internship at{' '}
            <span className="font-medium text-foreground">HCLTech</span>, I built
            production-level Java web applications end to end. Alongside that I&apos;ve
            shipped full-stack MERN projects and earned certifications in{' '}
            <span className="font-medium text-foreground">
              Generative AI, React and the MERN stack
            </span>
            . I&apos;m currently open to full-time Full Stack, MERN and Java roles for 2026.
          </motion.p>

          {/* Quick facts */}
          <motion.dl
            variants={fadeUp}
            className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            {facts.map((f) => (
              <div
                key={f.label}
                className="rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-border-strong"
              >
                <f.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                <dt className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
                  {f.label}
                </dt>
                <dd className="mt-0.5 text-sm font-semibold text-foreground">
                  {f.value}
                </dd>
              </div>
            ))}
          </motion.dl>

          <motion.p
            variants={fadeUp}
            className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"
          >
            <MapPin className="h-4 w-4 text-primary" aria-hidden="true" />
            Based in {profile.location} · {profile.education.college}
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
            <a href="#contact" className={buttonVariants({ variant: 'primary', size: 'md' })}>
              Get in touch
              <ArrowUpRight className="h-4 w-4" />
            </a>
            <a href="#experience" className={buttonVariants({ variant: 'outline', size: 'md' })}>
              View experience
            </a>
          </motion.div>
        </motion.div>
      </div>
    </Section>
  )
}

function Portrait() {
  const [errored, setErrored] = useState(false)

  return (
    <div className="group relative">
      {/* gradient ring / glow */}
      <div
        className="absolute -inset-3 -z-10 rounded-[2rem] opacity-60 blur-2xl transition-opacity duration-500 group-hover:opacity-90"
        style={{ background: 'linear-gradient(140deg, var(--glow-1), var(--glow-2))' }}
        aria-hidden="true"
      />
      <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-surface-2 shadow-2xl">
        <div className="aspect-[4/5] w-full">
          {!errored ? (
            <img
              src={profile.photo}
              alt="Harshit Raj"
              width="480"
              height="600"
              loading="lazy"
              onError={() => setErrored(true)}
              className="h-full w-full object-cover object-top [filter:saturate(1.02)]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
              <span className="font-mono text-6xl font-bold text-gradient">HR</span>
            </div>
          )}
        </div>
        {/* subtle bottom gradient for legibility of the chip */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent"
          aria-hidden="true"
        />
        {/* floating status chip */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Available for 2026
        </div>
      </div>

      {/* mono caption */}
      <p className="mt-4 text-center font-mono text-xs text-muted-foreground lg:text-left">
        <span className="text-primary">const</span> role ={' '}
        <span className="text-foreground">&quot;Full Stack Developer&quot;</span>
      </p>
    </div>
  )
}
