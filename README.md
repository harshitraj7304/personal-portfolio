# Harshit Raj — Developer Portfolio

A premium, production-quality personal portfolio for **Harshit Raj** — Full Stack Developer (React · MERN · Java · AI). Dark-first design with a polished light mode, smooth scrollspy navigation, animated case-study project pages, and an accessible, responsive layout.

## Live site

- **Portfolio:** [View the live website](https://personal-portfolio-5hey45qti-harshitraj7304s-projects.vercel.app)
- **Source code:** [GitHub repository](https://github.com/harshitraj7304/personal-portfolio)

The site is deployed on Vercel from the `main` branch. New commits pushed to `main` trigger a production deployment.

## Tech stack

- **React 19** + **Vite** (JavaScript, no TypeScript)
- **Tailwind CSS v4** (via `@tailwindcss/vite`, no config file — tokens live in `src/index.css`)
- **Framer Motion** for animation (global `reduced-motion` support)
- **React Router v7** for routing + lazy-loaded case studies
- **lucide-react** icons · `clsx` + `tailwind-merge` + `class-variance-authority` for UI primitives
- Fonts: **Inter** + **JetBrains Mono** (Google Fonts)

## Getting started

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # production build → dist/
npm run preview  # preview the production build
npm run lint     # run ESLint
```

The frontend runs standalone with no backend configured — all content comes from
`src/data/*.js`. To work on the API as well, see **Backend** below.

## Backend (Phase 1 — foundation)

Server-side foundations for private admin authentication, document storage and
contact handling are included. The public portfolio works without backend
configuration; the API features require the Supabase and other environment
variables described in [`docs/SETUP.md`](docs/SETUP.md).

```
api/              Vercel serverless functions
  _lib/           shared modules (env, http, cookies, crypto, supabase, auth, …)
  auth/           login, logout, session, OTP, password reset
  health.js       GET /api/health — configuration + DB reachability check
db/migrations/    0001 → 0008, run in order in the Supabase SQL editor
scripts/          bootstrap-admin.mjs — creates the first super-admin
docs/
  ARCHITECTURE.md the full system design (deliverables E–P)
  SETUP.md        step-by-step external-service configuration
.env.example      the environment contract — every variable, annotated
```

```bash
npm run dev:api          # vercel dev — runs the SPA + /api together
npm run bootstrap:admin  # create the first admin account (once, locally)
```

Start with [`docs/SETUP.md`](docs/SETUP.md).

## Project structure

```
public/            favicon, robots.txt, sitemap.xml, _redirects, resume PDF, project screenshots
src/
  data/            profile, skills, experience, projects (case studies), certifications
  lib/             cn(), motion variants, icon registry
  hooks/           useTheme, useActiveSection (scrollspy), useDocumentMeta
  context/         ThemeProvider
  components/
    ui/            Button, Section, SectionHeading, …
    layout/        Navbar, MobileMenu, ThemeToggle, ScrollProgress, Footer
    background/    GridBackground (cursor-reactive)
    sections/      Hero, About, Skills, Experience, Projects, Certifications, Contact
  pages/           Home, ProjectDetail (lazy), NotFound
  App.jsx          router + providers · main.jsx  entry
```

## Editing content

All content is data-driven — edit these files, no component changes needed:

- **`src/data/profile.js`** — name, role, socials, education, résumé path, photo.
- **`src/data/skills.js`** — skill categories & items (icons are lucide names).
- **`src/data/experience.js`** — work experience entries.
- **`src/data/projects.js`** — featured case studies (`featuredProjects`) + `otherProjects`.
- **`src/data/certifications.js`** — certifications. Add a real `credentialUrl` and a **Verify** link appears automatically.

Assets live in `public/`: replace `public/harshit.jpg` (portrait), `public/resume/Harshit_Raj_Resume.pdf`, and screenshots under `public/projects/<slug>/`.

## Production notes

- **Custom domain:** the live site currently uses its Vercel deployment URL. The canonical metadata in `index.html` points to `https://harshitraj.dev`; update it when that domain is ready to serve this version of the portfolio.
- **OG image:** add a real `public/og-image.png` (1200×630) and confirm the path in `index.html`.
- **Contact form:** currently opens the visitor's email client (`mailto`).
- **Certificate links:** add `credentialUrl`s in `src/data/certifications.js` if/when available.
- **LinkedIn:** confirm the slug in `src/data/profile.js`.

## Deployment

Works out of the box on **Vercel** — `vercel.json` handles SPA deep-link rewrites,
routes `/api/*` to the serverless functions, and sets security headers. Build
command `npm run build`, output directory `dist`.

Vercel builds production deployments from `main`. The public frontend does not
depend on backend environment variables; configure them in Vercel before using
the API-backed features. See [`docs/SETUP.md`](docs/SETUP.md) for setup steps.

`public/_redirects` is kept for Netlify compatibility; it is inert on Vercel.
Note that Netlify would serve the SPA but **not** the `/api` functions, which are
Vercel-specific.

## Accessibility & performance

Semantic HTML, single `<h1>` per page, focus-visible rings, skip-link, keyboard-navigable menus and lightbox, `prefers-reduced-motion` support, lazy-loaded images and routes, and per-route document titles/descriptions.
