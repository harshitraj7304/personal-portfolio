import { useEffect, useState, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Cpu,
  ExternalLink,
  Github,
  GraduationCap,
  Lightbulb,
  ListChecks,
  Mountain,
  Target,
  X,
} from 'lucide-react'
import { featuredProjects, getProjectBySlug } from '../data/projects'
import { buttonVariants } from '../components/ui/Button'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { fadeUp, stagger, viewport } from '../lib/motion'
import { cn } from '../lib/cn'
import { NotFound } from './NotFound'

export function ProjectDetail() {
  const { slug } = useParams()
  const project = getProjectBySlug(slug)

  // Always call hooks before any early return.
  useDocumentMeta(
    project
      ? {
          title: `${project.name} — ${project.tagline} · Harshit Raj`,
          description: project.description,
        }
      : {},
  )

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [slug])

  if (!project) return <NotFound />

  const index = featuredProjects.findIndex((p) => p.slug === project.slug)
  const next = featuredProjects[(index + 1) % featuredProjects.length]

  return (
    <article className="pt-28">
      <div className="mx-auto w-full max-w-5xl px-5 sm:px-8">
        {/* back */}
        <Link
          to="/#projects"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All projects
        </Link>

        {/* header */}
        <motion.header
          variants={stagger(0.08)}
          initial="hidden"
          animate="show"
          className="mt-6"
        >
          <motion.div
            variants={fadeUp}
            className="flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-[0.18em]"
          >
            <span style={{ color: project.accent }}>{project.category}</span>
            <span className="text-border-strong">·</span>
            <span className="text-muted-foreground">{project.year}</span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="mt-3 text-4xl font-bold tracking-tight text-foreground sm:text-5xl"
          >
            {project.name}
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-2 text-lg text-muted-foreground sm:text-xl">
            {project.tagline}
          </motion.p>

          <motion.div variants={fadeUp} className="mt-6 flex flex-wrap items-center gap-3">
            {project.live && (
              <a
                href={project.live}
                target="_blank"
                rel="noreferrer noopener"
                className={buttonVariants({ variant: 'primary', size: 'md' })}
              >
                <ExternalLink className="h-4 w-4" />
                Live Demo
              </a>
            )}
            <a
              href={project.repo}
              target="_blank"
              rel="noreferrer noopener"
              className={buttonVariants({
                variant: project.live ? 'outline' : 'primary',
                size: 'md',
              })}
            >
              <Github className="h-4 w-4" />
              View Code
            </a>
          </motion.div>
        </motion.header>

        {/* cover */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="mt-10 overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-xl"
        >
          <div className="flex items-center gap-1.5 border-b border-border bg-surface px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </div>
          <CoverImage project={project} />
        </motion.div>

        {/* disclaimer (e.g. Myntra) */}
        {project.disclaimer && (
          <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
            {project.disclaimer}
          </p>
        )}

        {/* body */}
        <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-[1fr_280px] lg:gap-14">
          <div className="min-w-0">
            <Block icon={Target} title="Overview" text={project.overview} />
            <Block icon={Lightbulb} title="The problem" text={project.problem} />
            <Block icon={ListChecks} title="The solution" text={project.solution} />

            {/* features */}
            <section className="mt-12">
              <BlockHeading icon={ListChecks} title="Key features" />
              <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {project.featuresLong.map((f) => (
                  <li
                    key={f}
                    className="flex gap-3 rounded-xl border border-border bg-surface p-4 text-sm leading-relaxed text-foreground/90"
                  >
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: project.accent }}
                      aria-hidden="true"
                    />
                    {f}
                  </li>
                ))}
              </ul>
            </section>

            <Block icon={Cpu} title="Architecture" text={project.architecture} className="mt-12" />
            <Block icon={Mountain} title="Challenges" text={project.challenges} className="mt-12" />
            <Block
              icon={GraduationCap}
              title="What I learned"
              text={project.learnings}
              className="mt-12"
            />
          </div>

          {/* sidebar */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Tech stack
              </h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {project.stack.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-full border border-border bg-surface-2 px-2.5 py-1 font-mono text-xs text-muted-foreground"
                  >
                    {tech}
                  </span>
                ))}
              </div>

              <div className="mt-6 space-y-2 border-t border-border pt-6">
                {project.live && (
                  <a
                    href={project.live}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center justify-between text-sm text-foreground transition-colors hover:text-primary"
                  >
                    Live demo <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                <a
                  href={project.repo}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center justify-between text-sm text-foreground transition-colors hover:text-primary"
                >
                  Source code <Github className="h-4 w-4" />
                </a>
              </div>
            </div>
          </aside>
        </div>

        {/* gallery */}
        <Gallery project={project} />

        {/* next project */}
        <div className="my-16 border-t border-border pt-10">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Next project
              </p>
              <Link
                to={`/projects/${next.slug}`}
                className="mt-1 text-2xl font-bold tracking-tight text-foreground transition-colors hover:text-primary"
              >
                {next.name}
              </Link>
            </div>
            <Link
              to={`/projects/${next.slug}`}
              className={buttonVariants({ variant: 'outline', size: 'md' })}
            >
              View case study
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}

function BlockHeading({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 text-primary">
        <Icon className="h-4.5 w-4.5" aria-hidden="true" />
      </span>
      <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
    </div>
  )
}

function Block({ icon, title, text, className }) {
  return (
    <motion.section
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={viewport}
      className={className}
    >
      <BlockHeading icon={icon} title={title} />
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">{text}</p>
    </motion.section>
  )
}

function CoverImage({ project }) {
  const [errored, setErrored] = useState(false)
  if (errored) {
    return (
      <div
        className="flex aspect-[16/9] w-full items-center justify-center"
        style={{
          background: `linear-gradient(140deg, color-mix(in srgb, ${project.accent} 22%, var(--surface)), var(--surface))`,
        }}
      >
        <span className="font-mono text-3xl font-bold text-foreground/70">{project.name}</span>
      </div>
    )
  }
  return (
    <img
      src={project.cover}
      alt={`${project.name} preview`}
      onError={() => setErrored(true)}
      className="aspect-[16/9] w-full object-cover object-top"
    />
  )
}

function Gallery({ project }) {
  const shots = project.screenshots || []
  const [active, setActive] = useState(null)

  const close = useCallback(() => setActive(null), [])
  const step = useCallback(
    (dir) => setActive((a) => (a === null ? a : (a + dir + shots.length) % shots.length)),
    [shots.length],
  )

  useEffect(() => {
    if (active === null) return
    const onKey = (e) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [active, close, step])

  if (!shots.length) return null

  return (
    <section className="mt-16">
      <BlockHeading icon={ListChecks} title="Screenshots" />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {shots.map((shot, i) => (
          <button
            key={shot.src}
            onClick={() => setActive(i)}
            className="group relative overflow-hidden rounded-xl border border-border bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Open screenshot: ${shot.alt}`}
          >
            <img
              src={shot.src}
              alt={shot.alt}
              loading="lazy"
              className="aspect-[16/10] w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      <AnimatePresence>
        {active !== null && (
          <motion.div
            key="lightbox"
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            role="dialog"
            aria-modal="true"
            aria-label={shots[active].alt}
          >
            <button
              onClick={close}
              aria-label="Close"
              className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full border border-white/20 text-white transition-colors hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
            {shots.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    step(-1)
                  }}
                  aria-label="Previous"
                  className="absolute left-3 grid h-11 w-11 place-items-center rounded-full border border-white/20 text-white transition-colors hover:bg-white/10 sm:left-6"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    step(1)
                  }}
                  aria-label="Next"
                  className="absolute right-3 grid h-11 w-11 place-items-center rounded-full border border-white/20 text-white transition-colors hover:bg-white/10 sm:right-6"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
            <motion.figure
              key={active}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="max-h-[85vh] max-w-5xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={shots[active].src}
                alt={shots[active].alt}
                className="max-h-[80vh] w-auto rounded-lg border border-white/10 object-contain"
              />
              <figcaption className="mt-3 text-center text-sm text-white/70">
                {shots[active].alt} · {active + 1} / {shots.length}
              </figcaption>
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
