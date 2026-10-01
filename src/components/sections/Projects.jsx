import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, ExternalLink, Github } from "lucide-react";
import { featuredProjects, otherProjects } from "../../data/projects";
import { getIcon } from "../../lib/icons";
import { Section } from "../ui/Section";
import { SectionHeading } from "../ui/SectionHeading";
import { buttonVariants } from "../ui/Button";
import { fadeUp, stagger, viewport } from "../../lib/motion";
import { cn } from "../../lib/cn";

export function Projects() {
  return (
    <Section id="projects">
      <SectionHeading
        eyebrow="Projects"
        title="Things I've designed & built"
        description="A selection of full-stack and front-end projects — each one shipped end to end. Open any case study for the full story."
      />

      {/* Featured case studies */}
      <div className="mt-16 flex flex-col gap-16 sm:gap-20">
        {featuredProjects.map((project, i) => (
          <FeaturedCard
            key={project.slug}
            project={project}
            reversed={i % 2 === 1}
          />
        ))}
      </div>

      {/* Other projects */}
      <div className="mt-24">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewport}
          className="flex flex-col items-center text-center"
        >
          <h3 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            More projects
          </h3>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Additional apps and experiments — from CRMs and school platforms to
            Django web apps and UI builds.
          </p>
        </motion.div>

        <motion.div
          variants={stagger(0.06)}
          initial="hidden"
          whileInView="show"
          viewport={viewport}
          className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {otherProjects.map((project) => {
            const Icon = getIcon(project.icon);
            return (
              <motion.a
                key={project.name}
                href={project.repo}
                target="_blank"
                rel="noreferrer noopener"
                variants={fadeUp}
                className="group flex h-full min-h-[280px] flex-col rounded-2xl border border-border bg-surface p-5 transition-all duration-200 hover:-translate-y-1 hover:border-border-strong hover:shadow-lg hover:shadow-black/5"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary/12 to-accent/12 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <Github
                    className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground"
                    aria-hidden="true"
                  />
                </div>
                <h4 className="mt-4 flex min-h-12 items-start gap-1 font-semibold text-foreground">
                  {project.name}
                  <ArrowUpRight
                    className="h-4 w-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </h4>
                <p className="mt-1.5 min-h-[4.5rem] flex-1 text-sm leading-relaxed text-muted-foreground">
                  {project.description}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {project.tech.map((t) => (
                    <span
                      key={t}
                      className="rounded-md border border-border bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </motion.a>
            );
          })}
        </motion.div>

        {/* GitHub CTA */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewport}
          className="mt-10 flex justify-center"
        >
          <a
            href="https://github.com/harshitraj7304"
            target="_blank"
            rel="noreferrer noopener"
            className={buttonVariants({ variant: "outline", size: "md" })}
          >
            <Github className="h-4 w-4" />
            See all on GitHub
          </a>
        </motion.div>
      </div>
    </Section>
  );
}

function FeaturedCard({ project, reversed }) {
  return (
    <motion.article
      variants={stagger(0.1)}
      initial="hidden"
      whileInView="show"
      viewport={viewport}
      className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-14"
    >
      {/* Visual */}
      <motion.div
        variants={fadeUp}
        className={cn("relative", reversed && "lg:order-2")}
      >
        <ProjectCover project={project} />
      </motion.div>

      {/* Content */}
      <motion.div variants={fadeUp} className={cn(reversed && "lg:order-1")}>
        <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em]">
          <span style={{ color: project.accent }}>{project.category}</span>
          <span className="text-border-strong">·</span>
          <span className="text-muted-foreground">{project.year}</span>
        </div>

        <h3 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {project.name}
        </h3>
        <p className="mt-1 text-lg text-muted-foreground">{project.tagline}</p>

        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          {project.description}
        </p>

        {/* key features */}
        <ul className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {project.features.slice(0, 6).map((feat) => (
            <li
              key={feat}
              className="flex items-center gap-2 text-sm text-foreground/90"
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: project.accent }}
                aria-hidden="true"
              />
              {feat}
            </li>
          ))}
        </ul>

        {/* stack */}
        <div className="mt-6 flex flex-wrap gap-1.5">
          {project.stack.map((tech) => (
            <span
              key={tech}
              className="rounded-full border border-border bg-surface-2 px-2.5 py-1 font-mono text-xs text-muted-foreground"
            >
              {tech}
            </span>
          ))}
        </div>

        {/* actions */}
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            to={`/projects/${project.slug}`}
            className={buttonVariants({ variant: "primary", size: "md" })}
          >
            View case study
            <ArrowRight className="h-4 w-4" />
          </Link>
          {project.live && (
            <a
              href={project.live}
              target="_blank"
              rel="noreferrer noopener"
              className={buttonVariants({ variant: "outline", size: "md" })}
            >
              <ExternalLink className="h-4 w-4" />
              Live Demo
            </a>
          )}
          <a
            href={project.repo}
            target="_blank"
            rel="noreferrer noopener"
            className={buttonVariants({ variant: "ghost", size: "md" })}
          >
            <Github className="h-4 w-4" />
            Code
          </a>
        </div>
      </motion.div>
    </motion.article>
  );
}

function ProjectCover({ project }) {
  const [errored, setErrored] = useState(false);

  return (
    <Link
      to={`/projects/${project.slug}`}
      className="group relative block overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
      aria-label={`View ${project.name} case study`}
    >
      {/* accent glow */}
      <div
        className="pointer-events-none absolute -inset-px -z-10 rounded-2xl opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-40"
        style={{ backgroundColor: project.accent }}
        aria-hidden="true"
      />
      {/* browser chrome */}
      <div className="flex items-center gap-1.5 border-b border-border bg-surface px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
      </div>
      <div className="aspect-[16/10] w-full overflow-hidden">
        {!errored ? (
          <img
            src={project.cover}
            alt={`${project.name} preview`}
            loading="lazy"
            onError={() => setErrored(true)}
            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{
              background: `linear-gradient(140deg, color-mix(in srgb, ${project.accent} 22%, var(--surface)), var(--surface))`,
            }}
          >
            <span className="font-mono text-2xl font-bold text-foreground/70">
              {project.name}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
