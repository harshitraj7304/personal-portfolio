import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowUpRight,
  CheckCircle2,
  Github,
  Linkedin,
  Mail,
  MapPin,
  Send,
} from 'lucide-react'
import { profile } from '../../data/profile'
import { Section } from '../ui/Section'
import { SectionHeading } from '../ui/SectionHeading'
import { buttonVariants } from '../ui/Button'
import { fadeUp, stagger, viewport } from '../../lib/motion'
import { cn } from '../../lib/cn'

const initialForm = { name: '', email: '', subject: '', message: '' }

function validate(values) {
  const errors = {}
  if (!values.name.trim()) errors.name = 'Please enter your name.'
  if (!values.email.trim()) {
    errors.email = 'Please enter your email.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = 'Please enter a valid email address.'
  }
  if (!values.subject.trim()) errors.subject = 'Please add a subject.'
  if (!values.message.trim()) {
    errors.message = 'Please write a short message.'
  } else if (values.message.trim().length < 10) {
    errors.message = 'A little more detail, please (min 10 characters).'
  }
  return errors
}

const contactMethods = [
  {
    icon: Mail,
    label: 'Email',
    value: profile.email,
    href: profile.socials.email,
  },
  {
    icon: Linkedin,
    label: 'LinkedIn',
    value: 'Connect with me',
    href: profile.socials.linkedin,
  },
  {
    icon: Github,
    label: 'GitHub',
    value: `@${profile.socials.githubUser}`,
    href: profile.socials.github,
  },
]

export function Contact() {
  const [values, setValues] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [sent, setSent] = useState(false)

  const update = (field) => (e) => {
    setValues((v) => ({ ...v, [field]: e.target.value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const nextErrors = validate(values)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    // ─────────────────────────────────────────────────────────────────
    //  BACKEND INTEGRATION POINT
    //  No live backend is wired up. By default this opens the visitor's
    //  email client (mailto) with the message prefilled. To use a real
    //  service (Formspree, EmailJS, a serverless function, etc.), replace
    //  the mailto block below with your API call and keep the success UI.
    // ─────────────────────────────────────────────────────────────────
    const body = `Hi Harshit,%0D%0A%0D%0A${encodeURIComponent(
      values.message,
    )}%0D%0A%0D%0A— ${encodeURIComponent(values.name)} (${encodeURIComponent(
      values.email,
    )})`
    const mailto = `${profile.socials.email}?subject=${encodeURIComponent(
      values.subject,
    )}&body=${body}`
    window.location.href = mailto

    setSent(true)
    setValues(initialForm)
  }

  return (
    <Section id="contact">
      <SectionHeading
        eyebrow="Contact"
        title="Let's build something"
        description="Open to full-time Full Stack, MERN and Java roles for 2026 — and always happy to talk about interesting projects."
      />

      <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
        {/* Left: methods */}
        <motion.div
          variants={stagger(0.08)}
          initial="hidden"
          whileInView="show"
          viewport={viewport}
        >
          <motion.div variants={fadeUp} className="flex flex-col gap-3">
            {contactMethods.map((m) => (
              <a
                key={m.label}
                href={m.href}
                {...(m.href.startsWith('http')
                  ? { target: '_blank', rel: 'noreferrer noopener' }
                  : {})}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 text-primary">
                  <m.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs uppercase tracking-wide text-muted-foreground">
                    {m.label}
                  </span>
                  <span className="block truncate text-sm font-medium text-foreground">
                    {m.value}
                  </span>
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" aria-hidden="true" />
              </a>
            ))}
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mt-3 flex items-center gap-2.5 rounded-2xl border border-border bg-surface-2 p-4 text-sm text-muted-foreground"
          >
            <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            {profile.location} · Open to remote & relocation
          </motion.div>
        </motion.div>

        {/* Right: form */}
        <motion.form
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewport}
          noValidate
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-surface p-6 sm:p-8"
        >
          {sent ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
                <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                Your email client is opening…
              </h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                If it didn&apos;t, email me directly at{' '}
                <a href={profile.socials.email} className="text-primary hover:underline">
                  {profile.email}
                </a>
                .
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-6')}
              >
                Send another message
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field
                label="Name"
                name="name"
                value={values.name}
                onChange={update('name')}
                error={errors.name}
                placeholder="Your name"
                autoComplete="name"
              />
              <Field
                label="Email"
                name="email"
                type="email"
                value={values.email}
                onChange={update('email')}
                error={errors.email}
                placeholder="you@example.com"
                autoComplete="email"
              />
              <Field
                className="sm:col-span-2"
                label="Subject"
                name="subject"
                value={values.subject}
                onChange={update('subject')}
                error={errors.subject}
                placeholder="What's this about?"
              />
              <Field
                className="sm:col-span-2"
                label="Message"
                name="message"
                as="textarea"
                value={values.message}
                onChange={update('message')}
                error={errors.message}
                placeholder="Tell me a little about the role or project…"
              />
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className={cn(buttonVariants({ variant: 'primary', size: 'lg' }), 'w-full')}
                >
                  <Send className="h-4 w-4" />
                  Send message
                </button>
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  This opens your email app with the message prefilled — no data is stored.
                </p>
              </div>
            </div>
          )}
        </motion.form>
      </div>
    </Section>
  )
}

function Field({ label, name, as, error, className, ...props }) {
  const base = cn(
    'w-full rounded-xl border bg-surface-2 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors focus:outline-none focus:ring-2 focus:ring-ring',
    error ? 'border-red-500/60' : 'border-border focus:border-primary',
  )
  return (
    <div className={className}>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      {as === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          rows={5}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          className={cn(base, 'resize-none')}
          {...props}
        />
      ) : (
        <input
          id={name}
          name={name}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          className={base}
          {...props}
        />
      )}
      {error && (
        <p id={`${name}-error`} role="alert" className="mt-1.5 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  )
}
