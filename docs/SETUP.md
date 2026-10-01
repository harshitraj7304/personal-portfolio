# Setup — external services

Everything in Phase 1 is inert until these are configured. That is deliberate:
the public portfolio renders from `src/data/*.js` and does not call the API, so a
half-configured backend cannot break the live site.

Work through the sections in order. Total time is about 45 minutes, most of it
waiting for DNS.

> **Before you start.** Have a password manager open. You will be handling three
> secrets that must never enter a Git commit, a chat window, or a screenshot:
> the Supabase **service-role key**, `AUTH_SECRET`, and the Anthropic API key.
> Anything with `SERVICE_ROLE`, `SECRET`, or `API_KEY` in its name goes in
> Vercel's encrypted environment variables and your local `.env.local` — nowhere
> else.

---

## 1. Local environment file

```bash
cp .env.example .env.local
```

`.env.local` is already covered by `.gitignore` (`.env.*` with an exception only
for `.env.example`). Verify that before you paste anything into it:

```bash
git check-ignore -v .env.local
```

That must print a matching rule. If it prints nothing, stop — the file is
tracked and your keys would be committed.

Generate `AUTH_SECRET` now:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

This value is the HMAC key for OTP digests and share tokens. **Changing it later
invalidates every outstanding OTP and every share link** — the digests stored in
the database were computed with the old key and will no longer match. Generate
once, store in your password manager, reuse across environments _or_ accept that
staging and production have separate share links.

---

## 2. Supabase — database, auth and storage

### 2.1 Create the project

1. <https://supabase.com/dashboard> → **New project**.
2. Name: `portfolio-db`. Region: **Mumbai (ap-south-1)** — you and most of your
   visitors are in India; every millisecond of database latency is paid on every
   request.
3. Set a strong database password and save it. You will not need it for the app
   (the app authenticates with keys, not the Postgres password) but you need it
   for direct `psql` access and for restores.
4. Wait for provisioning (~2 minutes).

### 2.2 Copy the keys

**Project Settings → API**:

| Dashboard label         | Environment variable        | Sensitivity                                      |
| ----------------------- | --------------------------- | ------------------------------------------------ |
| Project URL             | `SUPABASE_URL`              | Public — appears in requests anyway              |
| `anon` `public`         | `SUPABASE_ANON_KEY`         | Publishable. Safe _only because_ RLS is on.      |
| `service_role` `secret` | `SUPABASE_SERVICE_ROLE_KEY` | **Full database access. Bypasses RLS entirely.** |

The service-role key is the single most dangerous value in this project. It is a
Postgres superuser in a URL. It is used in exactly five places
(`api/_lib/supabase.js` → `supabaseAdmin()`, called from auth endpoints, rate
limiting, audit writes, and storage signing) and must never be prefixed `VITE_`.

> `api/_lib/env.js` enforces this: it throws at module load if any secret name is
> found under a `VITE_` prefix, so a mistake here fails the API loudly at boot
> instead of silently shipping the key to every browser.

### 2.3 Run the migrations

**SQL Editor → New query.** Paste and run each file from `db/migrations/` in
order, `0001` through `0008`. See [`db/README.md`](../db/README.md) for the
per-file breakdown and the post-run verification queries.

Run those verification queries. The important one is the third — it lists every
table the anonymous role can read. If a private table appears there, fix it
before going further.

### 2.4 Confirm the storage buckets

`0003_storage.sql` creates both buckets by inserting into `storage.buckets`.
Check **Storage** in the dashboard:

| Bucket          | Public    | Size limit | Contents                                                                               |
| --------------- | --------- | ---------- | -------------------------------------------------------------------------------------- |
| `public-assets` | ✅ yes    | 25 MB      | Certificate scans, project screenshots, OG images — things already visible on the site |
| `private-vault` | ❌ **no** | 100 MB     | Marksheets, LORs, offer letters, personal photos                                       |

If `private-vault` shows as public, stop and fix it. Everything downstream
assumes objects in that bucket are unreachable without a signed URL.

### 2.5 Auth settings

**Authentication → Providers**: leave **Email** enabled, disable everything else
(no Google, no GitHub — there is no public signup in this system).

**Authentication → Sign In / Providers → Email**:

- **Confirm email**: off. Accounts are created by `scripts/bootstrap-admin.mjs`
  with `email_confirm: true`; there is no self-registration to confirm.
- **Secure email change**: on.

**Authentication → URL Configuration**:

- Site URL: your active Vercel deployment URL
- Redirect URLs: your active Vercel deployment URL with `/**`, plus `http://localhost:5173/**` for local development

Supabase's own email templates are **not used**. OTPs are generated, hashed and
verified by our code (`api/_lib/auth.js`) and delivered through Resend. The
magic-link machinery is only used server-side, inside `verify-otp.js`, to convert
an already-verified identity into a Supabase session — that link is never
emailed.

### 2.6 Free-tier caveats

Two behaviours will surprise you if you do not know about them:

- **Idle projects pause.** A free project with no activity for several days is
  suspended and must be manually resumed from the dashboard. Your admin panel
  will simply fail to sign in. Either log in occasionally, or upgrade before you
  depend on it.
- **Storage and database quotas are small.** A few hundred document scans will
  reach the free storage allowance. Check the current limits on the Supabase
  pricing page and watch **Settings → Usage** rather than assuming.

---

## 3. Resend — transactional email

Used for OTP codes and contact-form notifications. Chosen over SMTP because
there are no credentials to rotate on a schedule and the free tier is adequate
for a personal site.

1. <https://resend.com> → sign up.
2. **API Keys → Create**. Permission: **Sending access** only — it does not need
   full access. Copy to `RESEND_API_KEY`.
3. **Domains → Add domain** → a domain you own and want to send mail from.
4. Add the DNS records Resend shows you at your registrar. There are three
   kinds and all three matter:
   - **SPF** (`TXT`) — states which servers may send as your domain.
   - **DKIM** (`TXT`) — cryptographically signs each message.
   - **DMARC** (`TXT`) — tells receivers what to do when the first two fail.
     Start with `v=DMARC1; p=none; rua=mailto:you@example.com` to collect
     reports, then tighten to `p=quarantine` once they look clean.

   Without DKIM and SPF, Gmail routes your OTP emails to spam — which makes login
   look broken.

5. Wait for verification (minutes to a few hours).
6. Set:
   - `RESEND_FROM_EMAIL="Harshit Raj <noreply@your-verified-domain.example>"`
   - `CONTACT_NOTIFY_EMAIL=harshitraj7304845705@gmail.com`

**Before your domain verifies**, Resend only allows sending to the address you
signed up with. Leave `RESEND_API_KEY` unset locally instead — `api/_lib/mailer.js`
detects that and prints the OTP to the server console, so you can test the whole
login flow with no email service at all. In production an unset key returns
`{ok: false, reason: 'not_configured'}` rather than pretending to send.

> The OTP endpoints return an identical `200` whether or not delivery succeeded,
> and whether or not the account exists. That is intentional — a `503` on
> delivery failure would confirm to an attacker that the account is real.

---

## 4. Anthropic — AI assistant (optional, Phase 9)

Not needed until Phase 9. Set it up now if you want `/api/health` to report green
across the board.

1. <https://console.anthropic.com> → **API Keys** → create one.
2. `ANTHROPIC_API_KEY=sk-ant-...`
3. `ANTHROPIC_MODEL=claude-opus-5`
4. Set a **spend limit** in the console. The public assistant is rate-limited
   (20 requests/hour/IP) but a billing cap is the only hard stop.

---

## 5. Create your admin account

With `.env.local` filled in and the migrations run:

```bash
npm run bootstrap:admin
```

It prompts for email, password (minimum 12 characters, mixed case and digits) and
name, then:

- creates the `auth.users` record with the password bcrypt-hashed by Supabase,
- inserts the `admin_users` row with `role = 'super_admin'`,
- writes an `activity_logs` entry.

Safe to re-run — it updates an existing account rather than failing.

**There is no signup endpoint anywhere in this codebase.** This script, run by
someone holding the service-role key on their own machine, is the only way an
admin account comes into existence. That removes the entire "attacker registers
themselves as admin" class of problem.

If you prefer not to type the password interactively you can set
`ADMIN_BOOTSTRAP_EMAIL` / `_PASSWORD` / `_NAME` in `.env.local` — then **delete
those three lines** once the script succeeds, and never set them in Vercel.

---

## 6. Verify locally

```bash
npm install
npm run dev
```

The portfolio should load at <http://localhost:5173> exactly as before. Plain
`vite` does not serve `/api` — for that:

```bash
npm i -g vercel
vercel link
npm run dev:api
```

Then check the health endpoint:

```bash
curl http://localhost:3000/api/health
```

Expected:

```json
{
  "ok": true,
  "config": {
    "supabaseUrl": true,
    "supabaseAnonKey": true,
    "supabaseServiceRoleKey": true,
    "authSecret": true,
    "resendApiKey": true,
    "anthropicApiKey": false
  },
  "missing": ["ANTHROPIC_API_KEY"],
  "database": { "reachable": true }
}
```

It reports **presence only, never values.** `anthropicApiKey: false` is fine
until Phase 9.

Then test login:

```bash
curl -i -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"you@example.com","password":"your-password"}'
```

A `200` with three `Set-Cookie` headers (`hr_at`, `hr_rt`, `hr_csrf`) means the
whole chain — env → Supabase client → auth → cookies → audit log — works.

Deliberately try a wrong password. You should get one generic
`Incorrect email or password` regardless of whether the account exists, and after
five attempts a `429`. The precise reason is recorded in `login_attempts`, not
returned to the caller.

---

## 7. Vercel — deploy

### 7.1 Environment variables

**Project → Settings → Environment Variables.** Add every non-`VITE_` variable
from `.env.example` and mark them **Sensitive** where offered (write-only —
Vercel will not show them back to you, which is what you want).

| Variable                    | Production                   | Preview      | Notes                                                                    |
| --------------------------- | ---------------------------- | ------------ | ------------------------------------------------------------------------ |
| `SUPABASE_URL`              | ✅                           | ✅           |                                                                          |
| `SUPABASE_ANON_KEY`         | ✅                           | ✅           |                                                                          |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅                           | ✅           | Sensitive                                                                |
| `AUTH_SECRET`               | ✅                           | ✅           | Sensitive. Same value in both, or share links break across environments. |
| `PUBLIC_SITE_URL`           | Active Vercel deployment URL | leave unset  |                                                                          |
| `SESSION_COOKIE_DOMAIN`     | leave unset                  | leave unset  | Host-only cookies work across Vercel deployments.                        |
| `RESEND_API_KEY`            | ✅                           | optional     | Sensitive                                                                |
| `RESEND_FROM_EMAIL`         | ✅                           | optional     |                                                                          |
| `CONTACT_NOTIFY_EMAIL`      | ✅                           | optional     |                                                                          |
| `ANTHROPIC_API_KEY`         | Phase 9                      | Phase 9      | Sensitive                                                                |
| `ADMIN_BOOTSTRAP_*`         | ❌ **never**                 | ❌ **never** | Local-only, by design                                                    |

Do **not** add `VITE_API_BASE_URL` unless the API is on a different origin than
the frontend. Same-origin relative paths are the default and are simpler.

### 7.2 Domain

The site is available at its Vercel deployment URL. A custom domain is optional;
only add one you own, then update `PUBLIC_SITE_URL`, the canonical metadata in
`index.html`, and the sitemap together.

### 7.3 Deploy and confirm

```bash
git add -A
git commit -m "feat(phase-1): backend, database and auth foundation"
git push
```

After the deploy, check in this order:

1. Your active Vercel deployment URL — the portfolio renders. **This is the one
   that matters most.** Phase 1 must be invisible to visitors.
2. `<deployment-url>/api/health` — `ok: true` after server environment variables and database migrations are configured.
3. `<deployment-url>/projects/smart-quiz` — deep links still resolve
   (confirms the new `/api/*` rewrite did not disturb the SPA catch-all).
4. Response headers include `strict-transport-security` and
   `x-content-type-options`.
5. `<deployment-url>/api/auth/session` returns
   `{"authenticated": false}` — not a 500, and not a session.

If step 3 fails, the rewrite order in `vercel.json` is wrong: `/api/(.*)` must
come **before** `/(.*)`.

---

## 8. Things that are intentionally not configured

Not oversights:

| Thing                               | Why not                                                                                                                                                                                                                        | When                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| **SMS OTP**                         | India requires DLT registration and a paid gateway. Email OTP covers the same need at zero cost.                                                                                                                               | Only if you ever need phone-only recovery            |
| **WhatsApp Business API**           | Needs a verified Meta Business account and a message-template approval cycle. Also — see the note below.                                                                                                                       | Phase 4+, if you decide you want it                  |
| **Content-Security-Policy**         | `index.html` has an inline pre-paint theme script and loads Google Fonts. A CSP written before the admin panel exists would either break the site or be so loose it achieves nothing.                                          | Phase 10, with hashes and a report-only period first |
| **pgvector / embeddings**           | The corpus is a few dozen records. Keyword search over it is faster than a vector round-trip and far simpler to reason about.                                                                                                  | If the archive grows past a few hundred documents    |
| **Government / identity documents** | Aadhaar, PAN and passport scans are "sensitive personal data" under the DPDP Act 2023. Storing them creates a breach-notification obligation for no benefit — DigiLocker already does this, backed by the issuing authorities. | Not planned                                          |

> ### ⚠️ WhatsApp button — a conflict you need to decide
>
> Your standing rule is that your phone number stays off the public site (résumé
> PDF only). A `wa.me/<number>` link **is** the number, in the page HTML, readable
> by any scraper.
>
> The button therefore ships **disabled** (`site_profile.whatsapp_enabled = false`,
> `features.whatsapp_button = false`) and nothing renders. Three ways forward:
>
> - **(a) Accept it.** Simplest, standard practice, and the number is already on
>   your résumé. But it will be scraped and it will attract spam calls.
> - **(b) Proxy it.** The button links to `/api/wa`, which returns a `302` to
>   `wa.me/...`. The number lives in an environment variable and never appears in
>   the HTML. Casual scrapers miss it; anyone who clicks once sees it. Costs one
>   endpoint.
> - **(c) Drop it.** The contact form and email already cover this.
>
> **(b)** is the recommendation — it honours the constraint without losing the
> feature. Tell me which you want and I will wire it up in Phase 4. Until then
> nothing is exposed.

---

## Troubleshooting

| Symptom                                                         | Cause                                                                | Fix                                                                                      |
| --------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `Refusing to start: VITE_SUPABASE_SERVICE_ROLE_KEY is a secret` | A secret was given a `VITE_` prefix                                  | Remove the prefix. This guard exists so the key never reaches the browser bundle.        |
| `/api/health` returns 404                                       | Rewrite order, or functions not deployed                             | `/api/(.*)` must precede `/(.*)` in `vercel.json`                                        |
| `database.reachable: false`                                     | Project paused, or wrong URL/key                                     | Resume the project in the Supabase dashboard                                             |
| Login returns 500                                               | Migrations not run — `admin_users` does not exist                    | Run `0001`–`0008`                                                                        |
| Login returns 401 with correct credentials                      | `auth.users` exists but no `admin_users` row, or `is_active = false` | Re-run `npm run bootstrap:admin`                                                         |
| OTP email never arrives                                         | Domain unverified, or in spam                                        | Check Resend → Logs. Unset `RESEND_API_KEY` locally to log codes to the console instead. |
| Cookies not set in the browser                                  | `SESSION_COOKIE_DOMAIN` does not match the host                      | Leave it unset for preview deploys and localhost                                         |
| `429` during testing                                            | Rate limits are working                                              | `delete from app_rate_limits;` in the SQL editor                                         |
| Deep links 404 after deploy                                     | SPA catch-all lost or reordered                                      | Confirm both rewrites are present, `/api/(.*)` first                                     |
