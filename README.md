# Harshit Raj — Developer Portfolio

A premium, production-quality personal portfolio for **Harshit Raj** — Full Stack Developer (React · MERN · Java · AI). Dark-first design with a polished light mode, smooth scrollspy navigation, animated case-study project pages, and an accessible, responsive layout.

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

The portfolio is being extended with a private admin panel, document vault and
contact inbox. The backend is **additive**: with no environment configured the
public site behaves exactly as it always has.

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

## Things to update before going live

- **Domain:** canonical URLs point at `https://harshitraj.dev`. Attach the domain in Vercel and add a redirect from `harshit-raj.vercel.app` → the apex so existing links keep working.
- **OG image:** add a real `public/og-image.png` (1200×630) and confirm the path in `index.html`.
- **Contact form:** it currently opens the visitor's email client (`mailto`). A real backend endpoint arrives in Phase 4; the `mailto` path stays as the fallback.
- **Certificate links:** add `credentialUrl`s in `src/data/certifications.js` if/when available.
- **LinkedIn:** confirm the slug in `src/data/profile.js`.

## Deployment

Works out of the box on **Vercel** — `vercel.json` handles SPA deep-link rewrites,
routes `/api/*` to the serverless functions, and sets security headers. Build
command `npm run build`, output directory `dist`.

`public/_redirects` is kept for Netlify compatibility; it is inert on Vercel.
Note that Netlify would serve the SPA but **not** the `/api` functions, which are
Vercel-specific.

## Accessibility & performance

Semantic HTML, single `<h1>` per page, focus-visible rings, skip-link, keyboard-navigable menus and lightbox, `prefers-reduced-motion` support, lazy-loaded images and routes, and per-route document titles/descriptions.
