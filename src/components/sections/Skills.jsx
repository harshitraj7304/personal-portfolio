import { motion } from 'framer-motion'
import { skillGroups } from '../../data/skills'
import { getIcon } from '../../lib/icons'
import { Section } from '../ui/Section'
import { SectionHeading } from '../ui/SectionHeading'
import { fadeUp, stagger, viewport } from '../../lib/motion'

export function Skills() {
  return (
    <Section id="skills" className="scroll-mt-24">
      <SectionHeading
        eyebrow="Skills & Stack"
        title="The tools I build with"
        description="A practical, hands-on toolkit spanning the full stack — from Java and the MERN ecosystem to AI integration and modern tooling."
      />

      <motion.div
        variants={stagger(0.08)}
        initial="hidden"
        whileInView="show"
        viewport={viewport}
        className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
      >
        {skillGroups.map((group) => {
          const GroupIcon = getIcon(group.icon)
          return (
            <motion.div
              key={group.id}
              variants={fadeUp}
              className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-border-strong"
            >
              {/* faint accent wash on hover */}
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                style={{ background: group.accent }}
                aria-hidden="true"
              />

              <div className="flex items-center gap-3">
                <span
                  className="grid h-10 w-10 place-items-center rounded-xl border border-border"
                  style={{
                    color: group.accent,
                    backgroundColor: `color-mix(in srgb, ${group.accent} 12%, transparent)`,
                  }}
                >
                  <GroupIcon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="text-base font-semibold text-foreground">{group.label}</h3>
              </div>

              <ul className="mt-5 flex flex-wrap gap-2">
                {group.skills.map((skill) => {
                  const SkillIcon = getIcon(skill.icon)
                  return (
                    <li key={skill.name}>
                      <span
                        style={{ '--chip': skill.color }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-sm font-medium text-muted-foreground transition-all duration-200 hover:-translate-y-0.5 hover:text-foreground hover:[border-color:var(--chip)]"
                      >
                        <SkillIcon
                          className="h-3.5 w-3.5"
                          style={{ color: 'var(--chip)' }}
                          aria-hidden="true"
                        />
                        {skill.name}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </motion.div>
          )
        })}
      </motion.div>
    </Section>
  )
}
