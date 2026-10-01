-- ═══════════════════════════════════════════════════════════════════════════
--  0004 — Portfolio content
--
--  These tables mirror src/data/*.js field-for-field. src/data/*.js is NOT
--  deleted: it stays as the guaranteed static fallback, so the public site
--  renders identically whether or not these tables hold anything.
--
--  Where existing content carries a human-written string ('Jul – Sep 2025'),
--  the label is preserved alongside a structured date. The serializer prefers
--  the label, so migrated content renders byte-identically to today.
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
--  site_profile — singleton (mirrors src/data/profile.js)
--
--  `id boolean primary key default true check (id)` is the standard singleton
--  idiom: only the value `true` satisfies the CHECK, so a second row is
--  impossible. Better than a nullable table everyone must remember to LIMIT 1.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.site_profile (
  id              boolean primary key default true check (id),

  name            text not null,
  role            text,
  tagline         text,
  bio             text,
  location        text,
  availability    text,

  email           citext,
  -- Phone and WhatsApp are stored so the admin panel can use them, but they
  -- are EXCLUDED from the public column allowlist and from v_public_profile.
  -- The public site continues to omit the phone number entirely.
  phone           text,
  whatsapp_e164   text,
  whatsapp_enabled boolean not null default false,  -- off until the wa.me
                                                    -- number-exposure question
                                                    -- is settled (ARCHITECTURE § J)

  photo_url       text,        -- '/harshit.png' today
  resume_url      text,        -- '/resume/Harshit_Raj_Resume.pdf' today
  stack_line      text[] not null default '{}',
  highlights      jsonb not null default '[]'::jsonb,
  socials         jsonb not null default '{}'::jsonb,

  -- SEO
  seo_title       text,
  seo_description text,
  og_image_url    text,
  canonical_url   text,

  updated_at      timestamptz not null default now()
);

drop trigger if exists trg_site_profile_updated on public.site_profile;
create trigger trg_site_profile_updated
  before update on public.site_profile
  for each row execute function public.app_set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
--  projects — ONE table for both featuredProjects and otherProjects
--
--  src/data/projects.js exports two arrays; is_featured distinguishes them.
--  A second table would be exactly the "duplicate system" the brief forbids.
--  Compact entries currently have no slug; slugs are generated at seed time so
--  every project is addressable if a page is wanted later.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  slug          citext not null unique,
  name          text not null,
  tagline       text,
  category      text,
  year          text,            -- free text ('2025', '2024 – 2025')
  accent        text,            -- hex, drives the existing card accent
  icon          text,            -- lucide icon name, for compact cards

  is_featured   boolean not null default false,

  -- short-card content
  description   text,
  stack         text[] not null default '{}',
  features      text[] not null default '{}',

  -- case-study content (featuredProjects only)
  overview      text,
  problem       text,
  solution      text,
  features_long jsonb not null default '[]'::jsonb,   -- [{title, body}]
  architecture  text,
  challenges    jsonb not null default '[]'::jsonb,
  learnings     jsonb not null default '[]'::jsonb,

  repo_url      text,
  live_url      text,
  -- Preserves the existing honesty note rendered on cards without a live demo.
  disclaimer    text,

  cover_url     text,
  cover_file_id uuid references public.files (id) on delete set null,

  status        content_status_t not null default 'published',
  visibility    visibility_t not null default 'public',
  sort_order    integer not null default 0,
  tags          text[] not null default '{}',

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index if not exists projects_public_idx
  on public.projects (visibility, status, sort_order)
  where deleted_at is null;
create index if not exists projects_featured_idx
  on public.projects (is_featured, sort_order) where deleted_at is null;

drop trigger if exists trg_projects_updated on public.projects;
create trigger trg_projects_updated
  before update on public.projects
  for each row execute function public.app_set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
--  project_files — screenshots, source ZIPs, docs, videos, diagrams
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.project_files (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  file_id     uuid references public.files (id) on delete set null,

  kind        project_file_kind_t not null default 'other',
  -- Screenshot alt text — the existing screenshots[] entries are {src, alt}.
  label       text,
  alt_text    text,
  -- Direct path for screenshots already committed under public/.
  url         text,

  visibility  visibility_t not null default 'public',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index if not exists project_files_project_idx
  on public.project_files (project_id, kind, sort_order) where deleted_at is null;

drop trigger if exists trg_project_files_updated on public.project_files;
create trigger trg_project_files_updated
  before update on public.project_files
  for each row execute function public.app_set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
--  skill_groups + skills (mirrors src/data/skills.js)
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.skill_groups (
  id          uuid primary key default gen_random_uuid(),
  key         citext not null unique,   -- 'languages', 'frontend', 'ai', …
  label       text not null,            -- 'Languages', 'Frontend', …
  icon        text,
  accent      text,
  visibility  visibility_t not null default 'public',
  status      content_status_t not null default 'published',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create table if not exists public.skills (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.skill_groups (id) on delete cascade,
  name        text not null,
  icon        text,      -- simple-icons / lucide name
  color       text,      -- brand hex used by the existing chip
  level       integer check (level between 0 and 100),   -- optional, unused today
  visibility  visibility_t not null default 'public',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  unique (group_id, name)
);

create index if not exists skills_group_idx
  on public.skills (group_id, sort_order) where deleted_at is null;

drop trigger if exists trg_skill_groups_updated on public.skill_groups;
create trigger trg_skill_groups_updated
  before update on public.skill_groups
  for each row execute function public.app_set_updated_at();

drop trigger if exists trg_skills_updated on public.skills;
create trigger trg_skills_updated
  before update on public.skills
  for each row execute function public.app_set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
--  experiences (mirrors src/data/experience.js)
--
--  start_label/end_label hold today's exact strings ('Jul 2026', 'Aug 2026')
--  so the timeline renders identically; start_date/end_date add sortability.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.experiences (
  id           uuid primary key default gen_random_uuid(),
  company      text not null,
  role         text not null,
  type         text,                -- 'Internship', 'Paid Internship', …
  location     text,

  start_label  text,                -- rendered as-is
  end_label    text,                -- rendered as-is ('Present' allowed)
  start_date   date,                -- sortable
  end_date     date,                -- NULL = current
  is_current   boolean not null default false,

  summary      text,
  points       text[] not null default '{}',
  stack        text[] not null default '{}',

  company_logo_url text,
  company_url      text,

  visibility   visibility_t not null default 'public',
  status       content_status_t not null default 'published',
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create index if not exists experiences_order_idx
  on public.experiences (sort_order, start_date desc nulls last)
  where deleted_at is null;

drop trigger if exists trg_experiences_updated on public.experiences;
create trigger trg_experiences_updated
  before update on public.experiences
  for each row execute function public.app_set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
--  education
--
--  The public site shows the degree summary. Per-semester marksheets attach
--  through education_documents (migration 0005) and are PRIVATE by default —
--  the public row and the private scans are separate records on purpose.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.education (
  id            uuid primary key default gen_random_uuid(),
  level         education_level_t not null default 'other',
  institution   text not null,
  degree        text,
  field         text,
  board         text,               -- 'AKTU', 'CBSE', …

  start_label   text,
  end_label     text,
  start_date    date,
  end_date      date,

  score_label   text,               -- 'CGPA 7.3', '78.2%' — rendered as-is
  score_value   numeric(6,2),       -- sortable
  score_type    text,               -- 'cgpa' | 'percentage'

  location      text,
  summary       text,

  visibility    visibility_t not null default 'public',
  status        content_status_t not null default 'published',
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

drop trigger if exists trg_education_updated on public.education;
create trigger trg_education_updated
  before update on public.education
  for each row execute function public.app_set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
--  certificates (mirrors src/data/certifications.js + LinkedIn fields)
--
--  date_label holds today's exact string, including free-text ranges such as
--  'Jul – Sep 2025' which no date type can represent. issue_date is the
--  structured counterpart used for sorting and expiry checks.
--
--  credential_url stays NULL unless a real verify URL exists — 7 of the 29
--  current certificates have one. The Verify link renders only when non-null,
--  which is the existing behaviour and must not change.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.certificates (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  issuer          text not null,
  issuer_logo_url text,

  date_label      text,            -- 'Oct 2025', 'Jul – Sep 2025' — rendered as-is
  issue_date      date,
  expiration_date date,
  does_not_expire boolean not null default true,

  credential_id   text,
  credential_url  text,            -- NULL unless a genuine verify URL exists

  category        text,
  description     text,
  skills          text[] not null default '{}',
  tags            text[] not null default '{}',

  icon            text,            -- lucide name used by the existing card
  accent          text,            -- hex hairline colour
  is_featured     boolean not null default false,

  -- image_url covers the 29 files already in public/certificates/.
  -- file_id is for future uploads through the admin panel.
  image_url       text,
  file_id         uuid references public.files (id) on delete set null,

  visibility      visibility_t not null default 'public',
  status          content_status_t not null default 'published',
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,

  unique (name, issuer)
);

create index if not exists certificates_public_idx
  on public.certificates (visibility, status, is_featured, sort_order)
  where deleted_at is null;
create index if not exists certificates_expiry_idx
  on public.certificates (expiration_date) where expiration_date is not null;

drop trigger if exists trg_certificates_updated on public.certificates;
create trigger trg_certificates_updated
  before update on public.certificates
  for each row execute function public.app_set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
--  achievements — awards, recognitions, milestones
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.achievements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  issuer      text,
  date_label  text,
  event_date  date,
  description text,
  icon        text,
  accent      text,
  link_url    text,
  file_id     uuid references public.files (id) on delete set null,

  visibility  visibility_t not null default 'public',
  status      content_status_t not null default 'published',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

drop trigger if exists trg_achievements_updated on public.achievements;
create trigger trg_achievements_updated
  before update on public.achievements
  for each row execute function public.app_set_updated_at();
