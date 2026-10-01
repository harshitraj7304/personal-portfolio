import { motion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { fadeUp, stagger, viewport } from '../../lib/motion'

/**
 * Consistent section heading: mono eyebrow + large title + optional lead.
 * Center-aligned by default; pass align="left" for left-aligned sections.
 */
export function SectionHeading({ eyebrow, title, description, align = 'center', className }) {
  const aligned = align === 'center'
  return (
    <motion.div
      variants={stagger(0.12)}
      initial="hidden"
      whileInView="show"
      viewport={viewport}
      className={cn(
        'flex flex-col gap-4',
        aligned ? 'items-center text-center' : 'items-start text-left',
        className,
      )}
    >
      {eyebrow && (
        <motion.div
          variants={fadeUp}
          className="flex items-center gap-2.5 text-xs font-medium uppercase tracking-[0.2em] text-primary"
        >
          <span className="h-px w-6 bg-primary/60" aria-hidden="true" />
          {eyebrow}
        </motion.div>
      )}
      <motion.h2
        variants={fadeUp}
        className="max-w-3xl text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-[2.75rem] md:leading-[1.1]"
      >
        {title}
      </motion.h2>
      {description && (
        <motion.p
          variants={fadeUp}
          className={cn(
            'max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg',
          )}
        >
          {description}
        </motion.p>
      )}
    </motion.div>
  )
}
