# ⚡ Harshit Raj · Developer Portfolio

<div align="center">

### Full Stack Developer · Java · MERN · AI

A responsive, dark-first portfolio with a polished light theme, animated project case studies, and accessible interactions.

<a href="https://personal-portfolio-5hey45qti-harshitraj7304s-projects.vercel.app"><img src="https://img.shields.io/badge/🌐_Live_Portfolio-Visit-7c3aed?style=for-the-badge" alt="Visit the live portfolio" /></a>
<a href="https://github.com/harshitraj7304/personal-portfolio"><img src="https://img.shields.io/badge/GitHub-Source-181717?style=for-the-badge&logo=github" alt="View source on GitHub" /></a>

<br />

<img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=111" alt="React 19" />
<img src="https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite 7" />
<img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4" />
<img src="https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?style=flat-square&logo=javascript&logoColor=111" alt="JavaScript" />
<img src="https://img.shields.io/badge/Deployed_on-Vercel-000?style=flat-square&logo=vercel&logoColor=white" alt="Deployed on Vercel" />

</div>

## ✨ Highlights

- 🌗 Dark and light themes with saved preference
- 🧭 Responsive navigation with active-section tracking
- 💼 Experience timeline, skills, certifications, and featured projects
- 🗂️ Animated, detailed project case-study pages
- 🖼️ Click-to-view certificate previews
- ♿ Keyboard-friendly controls and reduced-motion support

## 🧰 Tech stack

- **React 19** + **Vite** (JavaScript, no TypeScript)
- **Tailwind CSS v4** (via `@tailwindcss/vite`, no config file — tokens live in `src/index.css`)
- **Framer Motion** for animation (global `reduced-motion` support)
- **React Router v7** for routing + lazy-loaded case studies
- **lucide-react** icons · `clsx` + `tailwind-merge` + `class-variance-authority` for UI primitives
- Fonts: **Inter** + **JetBrains Mono** (Google Fonts)

## 🚀 Run locally

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # production build → dist/
npm run preview  # preview the production build
npm run lint     # run ESLint
```

The frontend runs standalone with no backend configured — all content comes from
`src/data/*.js`. To work on the API as well, see **Backend** below.

## 🔐 Backend setup

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

## 🗂️ Project structure

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

## ✍️ Update portfolio content

All content is data-driven — edit these files, no component changes needed:

- **`src/data/profile.js`** — name, role, socials, education, résumé path, photo.
- **`src/data/skills.js`** — skill categories & items (icons are lucide names).
- **`src/data/experience.js`** — work experience entries.
- **`src/data/projects.js`** — featured case studies (`featuredProjects`) + `otherProjects`.
- **`src/data/certifications.js`** — certifications. Add a real `credentialUrl` and a **Verify** link appears automatically.

Assets live in `public/`: replace `public/harshit.jpg` (portrait), `public/resume/Harshit_Raj_Resume.pdf`, and screenshots under `public/projects/<slug>/`.

## 📝 Production notes

- **Custom domain:** the live site currently uses its Vercel deployment URL. The canonical metadata in `index.html` points to `https://harshitraj.dev`; update it when that domain is ready to serve this version of the portfolio.
- **OG image:** add a real `public/og-image.png` (1200×630) and confirm the path in `index.html`.
- **Contact form:** currently opens the visitor's email client (`mailto`).
- **Certificate links:** add `credentialUrl`s in `src/data/certifications.js` if/when available.
- **LinkedIn:** confirm the slug in `src/data/profile.js`.

## ☁️ Deployment

Works out of the box on **Vercel** — `vercel.json` handles SPA deep-link rewrites,
routes `/api/*` to the serverless functions, and sets security headers. Build
command `npm run build`, output directory `dist`.

Vercel builds production deployments from `main`. The public frontend does not
depend on backend environment variables; configure them in Vercel before using
the API-backed features. See [`docs/SETUP.md`](docs/SETUP.md) for setup steps.

`public/_redirects` is kept for Netlify compatibility; it is inert on Vercel.
Note that Netlify would serve the SPA but **not** the `/api` functions, which are
Vercel-specific.

## ♿ Accessibility & performance

Semantic HTML, single `<h1>` per page, focus-visible rings, skip-link, keyboard-navigable menus and lightbox, `prefers-reduced-motion` support, lazy-loaded images and routes, and per-route document titles/descriptions.
