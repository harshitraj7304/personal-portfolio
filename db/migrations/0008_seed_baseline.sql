-- ═══════════════════════════════════════════════════════════════════════════
--  0008 — Baseline seed: settings, document categories, site profile
--
--  Idempotent. Safe to re-run.
--
--  This seeds CONFIGURATION only. Portfolio content (projects, certificates,
--  experience, skills) is seeded in Phase 2 by a script that reads
--  src/data/*.js, so the database and the static fallback cannot drift apart
--  through hand-typed SQL.
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
--  Feature flags
--
--  Every content-serving flag starts FALSE. The public site therefore keeps
--  using src/data/*.js until each source is explicitly switched on, which is
--  what makes deploying this phase a no-op for visitors.
-- ───────────────────────────────────────────────────────────────────────────

insert into public.settings (key, value, description, is_public) values
  ('site.canonical_url',
  '"https://personal-portfolio-git-main-harshitraj7304s-projects.vercel.app"'::jsonb,
   'Canonical origin for SEO, emails and share links.', true),

  ('features.public_api_content',
   'false'::jsonb,
   'When false the public site renders src/data/*.js. Flip to true only after Phase 2 seeding is verified.', true),

  ('features.contact_api',
   'false'::jsonb,
   'When false Contact.jsx keeps its existing mailto: behaviour.', true),

  ('features.whatsapp_button',
   'false'::jsonb,
   'OFF until the wa.me phone-number exposure question is decided (ARCHITECTURE § J).', true),

  ('features.public_ai',
   'false'::jsonb,
   'Public AI widget. Phase 9.', true),

  ('features.admin_ai',
   'false'::jsonb,
   'Admin AI assistant. Phase 9.', false),

  ('security.otp_ttl_seconds',
   '600'::jsonb,
   'OTP lifetime in seconds (10 minutes).', false),

  ('security.otp_max_attempts',
   '5'::jsonb,
   'Verification attempts allowed per OTP code.', false),

  ('security.login_window_seconds',
   '900'::jsonb,
   'Login rate-limit window (15 minutes).', false),

  ('security.login_max_attempts',
   '5'::jsonb,
   'Failed logins allowed per identifier and IP per window.', false)
on conflict (key) do nothing;


-- ───────────────────────────────────────────────────────────────────────────
--  Document category tree
--
--  Scoped to education and professional records. There is deliberately NO
--  "Identity" or "Government ID" category — see docs/ARCHITECTURE.md § E.
-- ───────────────────────────────────────────────────────────────────────────

insert into public.document_categories (key, label, icon, description, sort_order) values
  ('education',    'Education',    'GraduationCap', 'Marksheets, certificates and degrees',        10),
  ('professional', 'Professional', 'Briefcase',     'Offer letters, experience letters, appraisals', 20),
  ('recognition',  'Recognition',  'Award',         'Appreciation letters and recommendations',    30),
  ('research',     'Research',     'FileText',      'Papers and publications',                     40),
  ('training',     'Training',     'BookOpen',      'Course and training records',                 50),
  ('other',        'Other',        'Folder',        'Uncategorised documents',                     90)
on conflict (key) do nothing;

-- Education sub-categories, matching the levels named in the brief.
insert into public.document_categories (parent_id, key, label, icon, sort_order)
select c.id, v.key, v.label, v.icon, v.sort_order
from public.document_categories c
cross join (values
  ('education/class-10', 'Class 10',  'School',        10),
  ('education/class-12', 'Class 12',  'School',        20),
  ('education/diploma',  'Diploma',   'ScrollText',    30),
  ('education/btech',    'B.Tech',    'GraduationCap', 40)
) as v(key, label, icon, sort_order)
where c.key = 'education'
on conflict (key) do nothing;


-- ───────────────────────────────────────────────────────────────────────────
--  site_profile — seeded from the CURRENT src/data/profile.js values so the
--  row is truthful from the first insert. Phone is intentionally left NULL:
--  it stays out of the database until you decide it belongs there.
-- ───────────────────────────────────────────────────────────────────────────

insert into public.site_profile (
  id, name, role, availability, email, photo_url, resume_url,
  stack_line, canonical_url, whatsapp_enabled
) values (
  true,
  'Harshit Raj',
  'Full Stack Developer',
  'Open to Full Stack / MERN / Java roles — 2026',
  'harshitraj7304845705@gmail.com',
  '/harshit.png',
  '/resume/Harshit_Raj_Resume.pdf',
  array['React', 'MERN', 'Java', 'AI'],
  'https://personal-portfolio-git-main-harshitraj7304s-projects.vercel.app',
  false
)
on conflict (id) do nothing;


-- ───────────────────────────────────────────────────────────────────────────
--  Register the current resume so /api/public/resume resolves before any
--  upload happens. url points at the file already committed under public/.
-- ───────────────────────────────────────────────────────────────────────────

insert into public.resume_versions (version_label, url, notes, is_current, published_at)
select 'Current — committed in repo',
       '/resume/Harshit_Raj_Resume.pdf',
       'Baseline row for the resume already present in public/. Superseded by the first admin upload.',
       true,
       now()
where not exists (select 1 from public.resume_versions);
