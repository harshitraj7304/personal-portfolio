# harshitraj.dev — System Architecture

> Portfolio + Digital Life Archive + Admin CMS + Document Vault + AI Assistant
>
> This document covers deliverables **E–P** of the analysis. Sections A–D (current
> architecture, existing features, gaps, risks) were delivered in conversation; the
> headline finding is restated below because every decision here follows from it.

**Baseline finding (A–D, restated):** the current site is a 100% static, client-only
Vite + React SPA. No backend, no database, no auth, no environment variables, no API.
All content lives in `src/data/*.js`; all binaries live in `public/`, which is
world-readable and crawlable forever. Roughly 95% of the requested system must be
built from zero — but **none of the existing portfolio needs to be rewritten to do it.**

---

## Decisions taken

These were presented as open questions; you did not select, so the **recommended**
option was taken as the working default. Each is reversible at the noted cost.

| # | Decision | Chosen | Cost to reverse |
|---|---|---|---|
| 1 | Backend approach | **Vite SPA + Vercel Serverless Functions** | Low — handlers are plain `(req,res)`; portable to Express/Next |
| 2 | Data platform | **Supabase** (Postgres + Auth + Storage + RLS) | Medium — schema is standard Postgres; storage is behind an adapter |
| 3 | OTP delivery | **Email OTP only** (no paid SMS) | Low — `otp_codes.channel` already models `sms` |
| 4 | Identity documents | **Excluded** (no Aadhaar / PAN / passport) | N/A — this is a policy limit, not a technical one |

**On (4):** storing government identity documents on a personal website creates
liability under India's DPDP Act 2023 and buys you nothing that real DigiLocker
doesn't already provide. The vault is scoped to *education and professional*
documents — marksheets, degrees, certificates, offer letters, LORs, research papers.
The schema does not forbid other uses; the policy does.

---

## E. Recommended architecture

### E.1 The core principle: additive, never substitutive

The single most important architectural constraint is *"do not break the existing
portfolio."* That is enforced structurally, not by care:

```
Public section component
        │
        ├─ 1. try  GET /api/public/portfolio   (CDN-cached, admin-managed content)
        │
        └─ 2. on error / empty / not-yet-built
              └─ render  src/data/*.js         ← today's hardcoded content, untouched
```

`src/data/*.js` is **never deleted**. It is demoted from "the only source" to
"the guaranteed fallback". Consequences:

- If the database is down, the portfolio renders exactly as it does today.
- If a phase is half-finished, the portfolio renders exactly as it does today.
- If you never populate a table, that section renders exactly as it does today.

No existing component, route, animation, token, or asset path has to change for the
backend to exist. Phase 1 (this phase) touches **zero** public components.

### E.2 Layers

```
┌───────────────────────────────────────────────────────────────────────┐
│  BROWSER                                                              │
│                                                                       │
│  Public SPA  (unchanged)          /admin  (lazy chunk, auth-gated)    │
│    - existing sections              - dashboard, CRUD, vault, inbox   │
│    - static-data fallback           - AI assistant (admin scope)      │
│    - public AI widget               - shares off /s/:token            │
│                                                                       │
│  Holds NO database credential. Holds NO API key. Session = httpOnly    │
│  cookie only.                                                         │
└──────────────────────────────┬────────────────────────────────────────┘
                               │  fetch, same-origin
┌──────────────────────────────▼────────────────────────────────────────┐
│  VERCEL SERVERLESS FUNCTIONS   /api/*        (Node runtime)            │
│                                                                       │
│  /api/public/*   anon-safe reads, column-allowlisted, CDN-cached       │
│  /api/auth/*     login, session, logout, OTP, password reset          │
│  /api/admin/*    CRUD — requires admin session + CSRF                 │
│  /api/files/:id  authorize → 302 to a 60-second signed URL            │
│  /api/share/*    tokenized public access to selected private objects   │
│  /api/contact    validate → rate-limit → persist → notify by email     │
│  /api/ai/*       Claude calls; server holds the key                    │
│                                                                       │
│  This is the ONLY tier that holds secrets.                            │
└───────────┬───────────────────────────────────┬───────────────────────┘
            │                                   │
┌───────────▼───────────────┐   ┌───────────────▼───────────────────────┐
│ SUPABASE POSTGRES         │   │ SUPABASE STORAGE                      │
│  - metadata for everything│   │  public-assets  (public read)         │
│  - RLS on every table     │   │  private-vault  (no public read)      │
│  - Auth (users, sessions) │   │  signed URLs only, 60 s TTL           │
└───────────────────────────┘   └───────────────────────────────────────┘
            │
┌───────────▼───────────────┐   ┌───────────────────────────────────────┐
│ RESEND (transactional     │   │ ANTHROPIC API (claude-opus-5)          │
│ email: OTP, contact)      │   │ server-side only                      │
└───────────────────────────┘   └───────────────────────────────────────┘
```

### E.3 Why serverless functions rather than Next.js or a separate Express API

- **Next.js migration** would mean rewriting routing, the lazy `/projects/:slug`
  page, and the `MotionConfig`/theme bootstrap. High risk, no gain — this app has
  no SSR requirement (it is a single-person portfolio, and SEO is already handled
  by static meta + JSON-LD).
- **Separate Express server** means a second deploy target, a second domain or a
  CORS surface, and cookie-domain complications. Serverless functions are
  same-origin by construction, which makes httpOnly cookies trivially secure.
- **Vercel functions** keep the existing build (`vite build` → `dist`) completely
  intact. `api/` is a sibling directory Vite never sees.

### E.4 Two database identities, deliberately

| Client | Key | Used for | Why |
|---|---|---|---|
| `supabaseForToken(jwt)` | anon key + user JWT | all admin data reads/writes | Runs as role `authenticated` → **RLS applies**. A bug in a handler cannot read another tenant's rows or bypass a policy. |
| `supabaseAdmin()` | service-role key | auth admin, rate limits, audit log, storage signing | Bypasses RLS. Restricted to infrastructure operations that legitimately need it. |

Most projects use the service-role key for everything and rely on handler code for
authorization. That makes every handler a potential total-compromise. Routing admin
*data* access through the user's JWT means RLS is a second, independent gate.

---

## F. Database changes

Postgres, 24 tables + 2 functions + 1 curated view. Full DDL in
[`db/migrations/`](../db/migrations). Highlights and rationale below.

### F.1 Conventions applied to every content table

| Column | Purpose |
|---|---|
| `id uuid` | `gen_random_uuid()` |
| `visibility visibility_t` | `public` \| `unlisted` \| `private` |
| `status content_status_t` | `draft` \| `published` \| `archived` |
| `sort_order integer` | manual ordering in the admin UI |
| `created_at` / `updated_at` | `updated_at` maintained by trigger |
| `deleted_at` | **soft delete** — nothing is ever destroyed by a UI click |

**`visibility` and `status` are separate on purpose.** The spec treats
PUBLIC/PRIVATE/DRAFT/UNLISTED as one field, but they are two orthogonal axes: a
project can be *published yet unlisted* (live at its URL, absent from the index),
or *public yet draft* (visible to you, not yet released). One enum cannot express
that. Public read requires `visibility='public' AND status='published'`.

### F.2 Table map

| Group | Tables |
|---|---|
| Identity | `admin_users`, `otp_codes`, `login_attempts`, `app_rate_limits` |
| Storage | `files` |
| Portfolio | `site_profile`, `projects`, `project_files`, `skill_groups`, `skills`, `experiences`, `education`, `certificates`, `achievements` |
| Archive | `document_categories`, `documents`, `education_documents`, `albums`, `photos`, `album_photos`, `resume_versions` |
| Operations | `contact_messages`, `shared_links`, `share_access_logs`, `activity_logs`, `ai_conversations`, `ai_messages`, `settings` |

### F.3 Four structural safety constraints

These make classes of accident *impossible*, rather than merely unlikely:

```sql
-- 1. A sensitive document can never be marked public.
alter table documents add constraint documents_sensitive_not_public
  check (not (is_sensitive and visibility = 'public'));

-- 2. An object in the private bucket can never be marked public.
alter table files add constraint files_private_bucket_not_public
  check (storage_scope <> 'private' or visibility <> 'public');

-- 3. Exactly one resume can be current.
create unique index resume_versions_one_current
  on resume_versions (is_current) where is_current;

-- 4. site_profile is a genuine singleton.
id boolean primary key default true, check (id)
```

Constraint 1 is the direct mechanical answer to *"sensitive documents must never
accidentally become publicly accessible."* It is enforced by Postgres, so no
handler bug, admin misclick, or future refactor can violate it.

### F.4 One `files` registry, not per-feature file columns

Every binary — certificate scan, project screenshot, ZIP, marksheet PDF, photo,
resume — is one row in `files`. Content tables reference `file_id`. This gives a
single place to store mime/size/checksum, a single place to enforce visibility, and
a single code path for signed-URL generation.

`files.storage_scope` has three values, and the third one is the reason the
migration is non-destructive:

| Scope | Bucket | Meaning |
|---|---|---|
| `static` | — | Already committed under `public/` (the 29 certificate images, project screenshots, current resume). Served by the CDN, never signed. |
| `public` | `public-assets` | Uploaded, intended for the public site. |
| `private` | `private-vault` | Uploaded, never publicly readable. |

So existing assets are *registered* rather than *moved*. Nothing under `public/`
has to be relocated for the vault to exist, and no live URL changes.

### F.5 Preserving exact rendered strings

Existing data carries human-written date strings — `'Jul – Sep 2025'`,
`'Jul 2026'`, `'CGPA 7.3'`. The spec wants structured dates for sorting and
expiry. Both are kept:

- `certificates.date_label` (text, rendered) **and** `issue_date` / `expiration_date` (date, queried)
- `experiences.start_label` / `end_label` (text, rendered) **and** `start_date` / `end_date` (date, sorted)

The public serializer prefers the label when present, so migrated content renders
**byte-identically** to today.

### F.6 `otherProjects` and `featuredProjects` unify into one table

`projects.is_featured` distinguishes full case-study projects from compact cards.
A second table would be the "duplicate system" the brief forbids. The compact
cards' `icon` field becomes `projects.icon`; their `tech` array maps onto `stack`.
Slugs are generated for the compact projects during seeding (Phase 2) so every
project is addressable if you later want a page for it.

---

## G. Storage architecture

```
Frontend  ──►  /api/files/:id  ──►  authorize  ──►  sign (60 s)  ──►  302
                                       │
                                       ├─ file.storage_scope = 'static'
                                       │    → 302 to the plain CDN path
                                       │
                                       ├─ visibility = 'public'
                                       │    → 302 to the public bucket URL
                                       │
                                       └─ visibility = 'private'
                                            → admin session OR valid share token
                                              required, else 404 (not 403)
```

Rules:

1. **Raw bucket URLs are never returned to the browser for private objects.** Only
   short-lived signed URLs, and only via redirect, so the URL never lands in
   application state or logs.
2. **404, not 403, for unauthorized private objects.** A 403 confirms the object
   exists; a 404 does not leak the existence of your documents.
3. **`private-vault` has no anon storage policy at all.** Even with a leaked anon
   key, the bucket is unreadable.
4. **Uploads go direct to storage via a signed upload URL** issued by
   `/api/admin/files/upload-url`. Large files never traverse a serverless function,
   which sidesteps the 4.5 MB request body limit.
5. **GCS is reachable later without a schema change.** `files.bucket` +
   `storage_path` + the `api/_lib/storage.js` adapter are the only GCS-aware
   surface; swapping the adapter's two functions moves the whole system.

---

## H. Authentication architecture

Single-operator system today, modelled for multi-role later.

### H.1 Credential storage

Passwords live in **Supabase Auth** (`auth.users`), bcrypt-hashed by Supabase. We
never see, store, or hash a password ourselves. `admin_users` is a separate
allowlist table keyed to `auth.users.id` — **being an auth user is not enough; you
must also be an active row in `admin_users`.** This means a stray signup cannot
become an admin.

### H.2 Session transport

```
POST /api/auth/login  { email, password }
        │
        ├─ rate-limit: 5 attempts / 15 min per (email, IP)
        ├─ supabase.auth.signInWithPassword           ← server-side
        ├─ admin_users lookup: exists AND is_active   ← else 403, session discarded
        └─ Set-Cookie:
             hr_at    HttpOnly Secure SameSite=Lax  (access token,  ~1 h)
             hr_rt    HttpOnly Secure SameSite=Lax  (refresh token, 30 d)
             hr_csrf  Secure SameSite=Lax           (readable — double-submit token)
```

**Why cookies rather than the Supabase JS client:** the browser-side Supabase
client keeps its session in `localStorage`, which any XSS can read. For a panel
that fronts private documents, an httpOnly cookie the page cannot read is a
materially better trade. The consequence is that the browser never talks to
Supabase directly — every admin request goes through `/api/*`. That is the
intended design, not a limitation.

### H.3 Flows

```
Password login      POST /api/auth/login          → cookies
OTP login           POST /api/auth/request-otp    → 6-digit code, emailed, 10 min TTL
                    POST /api/auth/verify-otp     → cookies
Forgot password     POST /api/auth/forgot-password → OTP emailed (purpose=password_reset)
Reset password      POST /api/auth/reset-password  → verify OTP, then Auth admin update
Session probe       GET  /api/auth/session        → { authenticated, admin } (+ silent refresh)
Logout              POST /api/auth/logout         → revoke refresh token, clear cookies
```

OTP hardening: codes are stored as **HMAC-SHA256, never plaintext**; verified with
`timingSafeEqual`; 10-minute expiry; max 5 attempts per code; single-use
(`consumed_at`); prior unconsumed codes for the same identifier+purpose are
invalidated on each new request; request and verify are both rate-limited.

Enumeration: `request-otp` and `forgot-password` return the **same 200 response**
whether or not the account exists.

### H.4 Phone login

`admin_users.phone` is a unique alias. Phone login resolves phone → email
server-side, then runs the normal password flow. No SMS provider is required for
this path. SMS OTP is deliberately deferred (India needs DLT registration plus a
paid gateway); `otp_codes.channel` already carries `'sms'` so enabling it later is
a provider integration, not a schema change.

### H.5 Roles

`admin_role_t` = `super_admin | admin | editor | viewer`, present from day one and
checked by `app_has_role()`. Phase 1 seeds a single `super_admin`. Adding a Viewer
later is a row insert plus policy tightening — not a redesign.

---

## I. Contact and inbox architecture

```
Contact form  ──►  POST /api/contact
                     │
                     ├─ zod validation (mirrors the existing client-side validate())
                     ├─ honeypot field + submit-timing check
                     ├─ rate limit: 3 / hour per IP, 10 / day per IP
                     ├─ INSERT contact_messages (status = 'unread')
                     ├─ Resend → notification email to CONTACT_NOTIFY_EMAIL
                     └─ 200 { ok: true }
                            │
                            └─ on non-2xx, the client falls back to the existing
                               mailto: behaviour — the form never dead-ends
```

The `mailto:` path in `Contact.jsx:90` is **kept as the fallback**, not deleted.
The file already carries a `BACKEND INTEGRATION POINT` comment marking exactly
where this goes.

Inbox (`/admin/inbox`): unread/read/archived/spam, important flag, full-text
search, date filters, private admin notes, reply-by-email with the reply body
persisted, soft delete, and an unread badge on the dashboard driven by
`count(*) where status='unread' and deleted_at is null`.

---

## J. WhatsApp integration architecture

**Phase A — deep link (no credentials, no cost).** A button producing
`https://wa.me/<E164>?text=<prefilled>`.

> ⚠️ **Conflict you need to rule on.** A standing constraint from earlier work is
> *"the phone number stays off the public site — resume PDF only."* A `wa.me` link
> necessarily contains the number in the page HTML. These cannot both hold.
>
> Options: (a) accept the number becoming public; (b) route through
> `/api/wa` which 302-redirects to `wa.me`, keeping it out of the static HTML and
> out of scrapers, though a determined user still sees it on click; (c) skip
> WhatsApp. **The button ships disabled** (`site_profile.whatsapp_enabled = false`)
> until you choose. Option (b) is implemented and ready either way.

**Phase B — Cloud API (deferred).** `POST /api/whatsapp/webhook` verifying
`X-Hub-Signature-256`, with `WHATSAPP_*` credentials server-side only. Not built;
noted so the schema and env layout accommodate it.

---

## K. AI assistant architecture

Two assistants, **two separate endpoints, two separate context builders, zero
shared code path to private data.** Isolation is achieved by construction, not by
prompt instruction — a prompt can be talked around; a missing tool cannot.

| | Public assistant | Admin assistant |
|---|---|---|
| Endpoint | `/api/ai/public/chat` | `/api/ai/admin/chat` |
| Auth | none (IP rate-limited) | admin session + CSRF |
| Context | pre-compiled **public snapshot**: published projects, skills, experience, education, public certificates | live queries via the admin's own JWT (RLS-scoped) |
| Tools | **none** — plain completion over a fixed context | read tools + *proposal-only* write tools |
| Can reach documents / photos / inbox | **No table access whatsoever** | Yes, RLS-scoped |

**The public assistant issues no database queries.** It receives a single
serialized public-content blob assembled by the same column allowlist that feeds
`/api/public/portfolio`, cached with Anthropic prompt caching. There is no code
path from that endpoint to `documents`, `photos`, `contact_messages`, `files`, or
`admin_users`. Nothing to jailbreak past.

**Destructive actions are structurally gated.** The admin assistant's mutation
tools do not mutate. They return a *proposal* — `{ action, entity, id, patch,
rationale }` — which the UI renders as a diff with Apply / Discard. Applying calls
the ordinary `/api/admin/*` endpoint with the ordinary auth, validation, and audit
path. The model is never on the write path, so "confirm before destructive
actions" is a property of the architecture rather than a sentence in a prompt.

**Model:** `claude-opus-5` via the official `@anthropic-ai/sdk`, adaptive
thinking, streaming responses, prompt caching on the stable system + context
prefix. `ANTHROPIC_API_KEY` is server-side only.

**No vector store initially.** The entire public corpus — 4 case studies, 9
compact projects, 29 certificates, 3 experiences, skills — is a few thousand
tokens, so it fits in context and prompt caching makes repeat calls cheap.
`pgvector` + chunking is the documented upgrade path for when the document
archive grows past what fits comfortably; adding it prematurely would be cost and
complexity with no accuracy gain.

---

## L. Admin panel architecture

```
/admin                    lazy-loaded route group — one chunk, not in the public bundle
  /login                  password · OTP · forgot-password
  (protected shell)
  /admin                  dashboard — counts, unread badge, recent activity, storage used
  /admin/projects         list · editor · files · screenshots · publish state
  /admin/certificates     LinkedIn-shaped fields · image/PDF · verification link
  /admin/experience       timeline CRUD
  /admin/education        levels + per-semester marksheets
  /admin/skills           groups + skills, drag ordering
  /admin/documents        the vault — category tree, metadata, preview
  /admin/photos           albums, milestones, bulk upload
  /admin/resume           versions, set-current, history
  /admin/inbox            contact messages
  /admin/shares           active links, views, revoke
  /admin/ai               admin assistant
  /admin/activity         audit log
  /admin/settings         profile, SEO, feature flags, WhatsApp
```

**The design system is reused, not re-created.** The admin panel consumes the
existing tokens (`--surface`, `--border`, `--primary`, `--radius-4xl`), the
existing `cn()` helper, the existing `buttonVariants` cva, the existing
`getIcon()` registry, and the existing motion variants from `src/lib/motion.js`.
No second Tailwind config, no second component library, no second icon set.

**Code splitting keeps the public bundle untouched.** `/admin` is a single
`React.lazy` boundary. A visitor who never opens `/admin` downloads none of it.

**One footgun to avoid, already hit once in this codebase:** a `whileInView`
stagger container with `viewport={{ once: true }}` orchestrates exactly once, so
children mounted later (a table growing, a "show more" toggle) stay at
`opacity: 0` forever. That is what broke the certifications toggle. Admin lists
are dynamic by nature, so they animate **per item on mount**, never via a parent
stagger container.

---

## M. Security architecture

| Layer | Control |
|---|---|
| Secrets | Only `VITE_`-prefixed vars reach the browser in Vite. **No secret is ever `VITE_`-prefixed.** `api/_lib/env.js` throws at boot if a service-role or API key is found under a `VITE_` name. |
| Transport | HTTPS only; HSTS header; `Secure` cookies in production |
| Session | httpOnly + SameSite=Lax cookies; no token in `localStorage`; silent refresh server-side; refresh revoked on logout |
| CSRF | SameSite=Lax blocks cross-site cookie-bearing POSTs; plus a double-submit `hr_csrf` token required on every mutating admin route |
| Authorization | Two gates: handler-level `requireAdmin()` **and** Postgres RLS via the user's JWT |
| Row security | RLS enabled on all 24 tables. Anon may read only `visibility='public' AND status='published' AND deleted_at IS NULL`, and only on portfolio tables. `documents`, `files`, `contact_messages`, `activity_logs`, `ai_*`, `admin_users`, `otp_codes` have **no anon policy at all** |
| Grants | `anon` privileges revoked, then `SELECT` re-granted only on public-readable tables — a second layer beneath RLS |
| Brute force | `login_attempts` audit + `app_rate_limits` fixed-window counters, enforced atomically in a single SQL function |
| OTP | HMAC-stored, `timingSafeEqual` compared, 10-min TTL, 5-attempt cap, single-use, prior codes invalidated |
| Passwords | Supabase-managed bcrypt; strength validated server-side (≥12 chars, mixed classes) |
| Input | zod on every request body; parameterized queries throughout (no string SQL) |
| Output | React escapes by default; no `dangerouslyInnerHTML` on user or AI content |
| Files | Private objects only via 60-second signed URLs behind `/api/files/:id`; 404 (not 403) on unauthorized |
| Sharing | Tokens stored as HMAC; optional password, expiry, view cap; revocable; every access logged |
| Enumeration | Uniform responses on OTP request and password reset |
| Errors | Generic client messages in production; details server-side only; no stack traces over the wire |
| Audit | `activity_logs` on every login, mutation, share creation, and revoke |
| Data minimisation | Phone and WhatsApp number live in `site_profile` but are excluded by the public column allowlist and by the `v_public_profile` view. Identity documents are out of scope by policy. |

**Deferred deliberately:** a strict Content-Security-Policy. `index.html` runs an
inline theme-bootstrap script and loads Google Fonts; a naive CSP would break both.
It belongs in a hardening phase with a nonce, tested against the live page — not
bolted on now where it would break the working site.

---

## N. Deployment requirements

| Service | Plan | What to do |
|---|---|---|
| **Vercel** | Hobby is enough to start | Existing project. Add env vars per environment. Attach `harshitraj.dev`. |
| **Supabase** | Free tier (500 MB DB, 1 GB storage) | New project. Run the 8 migrations. Create the two storage buckets (migration `0003` does this). |
| **Resend** | Free tier (3k emails/month) | Verify the sending domain — SPF + DKIM DNS records. Until verified, only your own address can receive. |
| **Anthropic** | Pay-as-you-go | API key. `claude-opus-5` = $5/M input, $25/M output; prompt caching cuts repeat input ~90%. |
| **Domain** | — | `harshitraj.dev` → Vercel. Redirect `harshit-raj.vercel.app` → apex to preserve existing SEO. |

Free-tier ceilings worth knowing: Supabase free pauses a project after 7 days of
inactivity (a scheduled ping avoids it) and caps storage at 1 GB — enough for
certificates and documents, not for a large photo archive. Vercel Hobby caps
serverless execution at 10 s, which is fine for everything except long AI
streams; those stream, so they are not affected by the *response* timeout.

---

## O. Environment variables

Canonical list lives in [`.env.example`](../.env.example). Summary:

| Variable | Scope | Required for | Notes |
|---|---|---|---|
| `SUPABASE_URL` | server | everything | |
| `SUPABASE_ANON_KEY` | server | admin data access | used with the user's JWT so RLS applies |
| `SUPABASE_SERVICE_ROLE_KEY` | server | auth admin, storage signing | **bypasses RLS — never expose** |
| `AUTH_SECRET` | server | OTP + share-token HMAC, CSRF | 32+ random bytes; rotating it invalidates outstanding OTPs and share links |
| `PUBLIC_SITE_URL` | server | emails, share links, canonical | `https://harshitraj.dev` |
| `SESSION_COOKIE_DOMAIN` | server | cookies | leave unset for host-only cookies (recommended) |
| `RESEND_API_KEY` | server | OTP + contact email | absent → dev logs to console, prod returns 503 |
| `RESEND_FROM_EMAIL` | server | email | must be on the verified domain |
| `CONTACT_NOTIFY_EMAIL` | server | contact form | where inbox notifications land |
| `ANTHROPIC_API_KEY` | server | AI (Phase 6) | |
| `ANTHROPIC_MODEL` | server | AI | defaults to `claude-opus-5` |
| `ADMIN_BOOTSTRAP_EMAIL` / `_PASSWORD` | local only | first-admin script | delete after bootstrap; never set in Vercel |
| `WHATSAPP_*` | server | Phase B | not used yet |
| `VITE_API_BASE_URL` | **client** | optional | a URL, not a secret. The only `VITE_` var this system adds. |

**The rule that matters:** Vite inlines every `VITE_`-prefixed variable into the
JavaScript bundle as plaintext. A secret with a `VITE_` prefix is a published
secret. `api/_lib/env.js` asserts this at boot and refuses to start if violated.

---

## P. Implementation order

Each phase leaves the site fully working and independently deployable.

| Phase | Scope | Touches public UI? |
|---|---|---|
| **1** ✅ | **Foundation** — env, 8 migrations, RLS, buckets, API lib (http/cookies/crypto/supabase/rate-limit/auth/audit/storage/mailer), `/api/health`, full `/api/auth/*`, admin bootstrap script, canonical domain → `harshitraj.dev` | **No** |
| 2 | Content API + seeding — `/api/public/portfolio`, seed script importing `src/data/*.js`, `usePortfolioData()` hook with static fallback wired into existing sections | Additive only |
| 3 | Admin shell — `/admin` lazy route, login page, protected layout, sidebar, dashboard | New routes only |
| 4 | Contact + inbox — `/api/contact`, Resend, admin inbox, unread badge; `mailto:` retained as fallback | One additive branch in `Contact.jsx` |
| 5 | Files + vault — upload URLs, `/api/files/:id`, documents CRUD, categories, education marksheets | No |
| 6 | Projects / certificates / experience / education / skills CRUD from admin | No |
| 7 | Sharing — `shared_links`, `/s/:token`, expiry, password, revoke, access log | New route only |
| 8 | Photos, albums, milestones, resume versions | Additive |
| 9 | AI — admin assistant (tools + proposal gate), public assistant (isolated) | Additive widget |
| 10 | Hardening — CSP with nonce, WhatsApp decision, SEO/sitemap generation, perf pass, activity-log UI | Minimal |

**Rollback:** every phase is additive. Phases 1–2 can be reverted by deleting
`api/`, `db/`, and `.env.local` — the portfolio returns to its current state with
no other change, because `src/data/*.js` was never removed.
