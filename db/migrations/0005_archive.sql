-- ═══════════════════════════════════════════════════════════════════════════
--  0005 — Personal archive: documents, photos, albums, resume versions
--
--  This is the private half of the system. Nothing here defaults to public.
--  Every table defaults to visibility = 'private', so a row created without an
--  explicit visibility is private by construction rather than by convention.
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
--  document_categories — self-referencing tree (DigiLocker-style folders)
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.document_categories (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid references public.document_categories (id) on delete cascade,
  key         citext not null unique,     -- 'education', 'education/btech', …
  label       text not null,
  icon        text,
  description text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,

  -- A category cannot be its own parent.
  constraint document_categories_no_self_parent check (parent_id is null or parent_id <> id)
);

create index if not exists document_categories_parent_idx
  on public.document_categories (parent_id, sort_order);

drop trigger if exists trg_document_categories_updated on public.document_categories;
create trigger trg_document_categories_updated
  before update on public.document_categories
  for each row execute function public.app_set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
--  documents — the vault
--
--  Scope by policy: education and professional records only. Government
--  identity documents (Aadhaar, PAN, passport) are deliberately out of scope —
--  see docs/ARCHITECTURE.md § E. The `id_proof` enum value exists but should
--  stay unused; real DigiLocker already does that job with legal standing this
--  system cannot offer.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid references public.document_categories (id) on delete set null,
  file_id       uuid references public.files (id) on delete set null,

  title         text not null,
  kind          document_kind_t not null default 'other',
  description   text,
  issuer        text,

  date_label    text,
  issue_date    date,
  expiry_date   date,

  reference_no  text,            -- roll number, letter reference, DOI, …
  tags          text[] not null default '{}',
  metadata      jsonb not null default '{}'::jsonb,

  -- Marks a document as containing personal data warranting extra care.
  -- Combined with the CHECK below, marking something sensitive makes it
  -- mechanically impossible to publish.
  is_sensitive  boolean not null default true,

  visibility    visibility_t not null default 'private',
  status        content_status_t not null default 'published',
  sort_order    integer not null default 0,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,

  -- ── STRUCTURAL SAFETY CONSTRAINT ──────────────────────────────────────
  -- The direct, mechanical answer to "sensitive documents must NEVER
  -- accidentally become publicly accessible". Postgres rejects the write; no
  -- amount of application-layer error can override it. To publish a document
  -- you must first consciously clear is_sensitive.
  constraint documents_sensitive_not_public
    check (not (is_sensitive and visibility = 'public'))
);

create index if not exists documents_category_idx
  on public.documents (category_id, sort_order) where deleted_at is null;
create index if not exists documents_kind_idx
  on public.documents (kind) where deleted_at is null;
create index if not exists documents_search_idx
  on public.documents using gin (
    to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(issuer,''))
  );

drop trigger if exists trg_documents_updated on public.documents;
create trigger trg_documents_updated
  before update on public.documents
  for each row execute function public.app_set_updated_at();

comment on constraint documents_sensitive_not_public on public.documents is
  'Structural guarantee: a sensitive document can never be marked public.';


-- ───────────────────────────────────────────────────────────────────────────
--  education_documents — join between an education row and its scans
--
--  Semester marksheets attach here. The public education row stays public;
--  the scans stay private. Two records, two visibilities, no leakage.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.education_documents (
  id            uuid primary key default gen_random_uuid(),
  education_id  uuid not null references public.education (id) on delete cascade,
  document_id   uuid not null references public.documents (id) on delete cascade,
  term_label    text,              -- 'Semester 5', 'Final Year', …
  term_index    integer,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  unique (education_id, document_id)
);

create index if not exists education_documents_education_idx
  on public.education_documents (education_id, term_index, sort_order);


-- ───────────────────────────────────────────────────────────────────────────
--  albums + photos + album_photos
--
--  Many-to-many so one photo can appear in several albums without duplicating
--  the underlying file.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.albums (
  id             uuid primary key default gen_random_uuid(),
  slug           citext not null unique,
  title          text not null,
  description    text,
  cover_photo_id uuid,             -- FK added after photos exists
  event_date     date,
  location       text,
  tags           text[] not null default '{}',

  visibility     visibility_t not null default 'private',
  status         content_status_t not null default 'published',
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);

create table if not exists public.photos (
  id           uuid primary key default gen_random_uuid(),
  file_id      uuid references public.files (id) on delete set null,
  title        text,
  caption      text,
  alt_text     text,
  taken_at     timestamptz,
  location     text,
  -- Flags a personal milestone (graduation, first job, …) for the timeline view.
  is_milestone boolean not null default false,
  tags         text[] not null default '{}',
  metadata     jsonb not null default '{}'::jsonb,

  visibility   visibility_t not null default 'private',
  status       content_status_t not null default 'published',
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create table if not exists public.album_photos (
  album_id   uuid not null references public.albums (id) on delete cascade,
  photo_id   uuid not null references public.photos (id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (album_id, photo_id)
);

do $$ begin
  alter table public.albums
    add constraint albums_cover_photo_fk
    foreign key (cover_photo_id) references public.photos (id) on delete set null;
exception when duplicate_object then null; end $$;

create index if not exists photos_milestone_idx
  on public.photos (is_milestone, taken_at desc) where deleted_at is null;
create index if not exists album_photos_album_idx
  on public.album_photos (album_id, sort_order);

drop trigger if exists trg_albums_updated on public.albums;
create trigger trg_albums_updated
  before update on public.albums
  for each row execute function public.app_set_updated_at();

drop trigger if exists trg_photos_updated on public.photos;
create trigger trg_photos_updated
  before update on public.photos
  for each row execute function public.app_set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
--  resume_versions
--
--  The public download link resolves through the row where is_current = true.
--  The partial unique index makes "exactly one current version" a database
--  invariant instead of something application code must remember.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.resume_versions (
  id            uuid primary key default gen_random_uuid(),
  version_label text not null,        -- 'v3 — Aug 2026'
  file_id       uuid references public.files (id) on delete set null,
  -- Direct path for the resume already committed at
  -- public/resume/Harshit_Raj_Resume.pdf, so the current link keeps working.
  url           text,
  notes         text,
  is_current    boolean not null default false,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create unique index if not exists resume_versions_one_current
  on public.resume_versions (is_current) where is_current;

drop trigger if exists trg_resume_versions_updated on public.resume_versions;
create trigger trg_resume_versions_updated
  before update on public.resume_versions
  for each row execute function public.app_set_updated_at();

comment on index public.resume_versions_one_current is
  'Partial unique index: at most one resume row may have is_current = true.';
