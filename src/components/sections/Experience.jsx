import { motion } from 'framer-motion'
import { Briefcase, Building2, CalendarDays, Check, MapPin } from 'lucide-react'
import { experience } from '../../data/experience'
import { Section } from '../ui/Section'
import { SectionHeading } from '../ui/SectionHeading'

export function Experience() {
  return (
    <Section id="experience">
      <SectionHeading
        eyebrow="Experience"
        title="Where I've worked"
        description="Hands-on experience building real software across internships and professional training."
      />

      <div className="mx-auto mt-14 max-w-3xl">
        {experience.map((job, i) => (
          <motion.article
            key={`${job.company}-${i}`}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              ease: [0.22, 1, 0.36, 1],
              delay: i * 0.08,
            }}
            className="relative pb-10 pl-8 last:pb-0 sm:pl-12"
          >
            {/* timeline rail */}
            <span
              className="absolute left-[7px] top-2 h-full w-px bg-gradient-to-b from-primary/60 via-border to-transparent sm:left-[11px]"
              aria-hidden="true"
            />
            {/* node */}
            <span
              className="absolute left-0 top-1.5 grid h-4 w-4 place-items-center rounded-full border-2 border-primary bg-background sm:h-6 sm:w-6"
              aria-hidden="true"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary sm:h-2 sm:w-2" />
            </span>

            <div className="overflow-hidden rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-border-strong sm:p-8">
              {/* header */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 text-primary">
                    <Building2 className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{job.company}</h3>
                    <p className="flex items-center gap-1.5 text-sm text-primary">
                      <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
                      {job.role}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full border border-border bg-surface-2 px-3 py-1 text-xs font-medium text-muted-foreground">
                  {job.type}
                </span>
              </div>

              {/* meta */}
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  {job.start} – {job.end}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                  {job.location}
                </span>
              </div>

              <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
                {job.summary}
              </p>

              {/* bullets */}
              <ul className="mt-5 space-y-3">
                {job.points.map((point, pi) => (
                  <li key={pi} className="flex gap-3 text-sm leading-relaxed text-foreground/90">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                      <Check className="h-3 w-3" aria-hidden="true" />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>

              {/* stack */}
              <div className="mt-6 flex flex-wrap gap-2">
                {job.stack.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-full border border-border bg-surface-2 px-2.5 py-1 font-mono text-xs text-muted-foreground"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </Section>
  )
}
