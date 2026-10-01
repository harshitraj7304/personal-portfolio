-- ═══════════════════════════════════════════════════════════════════════════
--  0001 — Extensions, enumerated types, shared helper functions
--
--  Run this first. It creates no tables; it establishes the vocabulary that
--  every later migration depends on.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;   -- gen_random_uuid(), digest()
create extension if not exists citext;     -- case-insensitive email/slug columns


-- ───────────────────────────────────────────────────────────────────────────
--  Enumerated types
-- ───────────────────────────────────────────────────────────────────────────

-- Visibility and status are DELIBERATELY SEPARATE axes.
--
-- The brief models PUBLIC / PRIVATE / DRAFT / UNLISTED as one field, but those
-- are two independent questions:
--     visibility → WHO may see it
--     status     → WHERE it is in its lifecycle
-- Keeping them apart lets a project be "published but unlisted" (live at its
-- own URL, absent from the index) or "public but still draft" (visible to you,
-- not yet released). A single enum cannot express either.
--
-- Public read always requires: visibility = 'public' AND status = 'published'.

do $$ begin
  create type visibility_t as enum ('public', 'unlisted', 'private');
exception when duplicate_object then null; end $$;

do $$ begin
  create type content_status_t as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

-- Roles exist from day one even though only super_admin is used now. Adding a
-- role later is then a row update, not a schema migration.
do $$ begin
  create type admin_role_t as enum ('super_admin', 'admin', 'editor', 'viewer');
exception when duplicate_object then null; end $$;

-- 'static' means "already committed under public/ and served by the CDN".
-- This is what makes the migration non-destructive: the 29 existing
-- certificate images and every project screenshot get REGISTERED in the files
-- table without being moved, so no live URL changes.
do $$ begin
  create type storage_scope_t as enum ('public', 'private', 'static');
exception when duplicate_object then null; end $$;

do $$ begin
  create type otp_purpose_t as enum ('login', 'password_reset', 'email_verify');
exception when duplicate_object then null; end $$;

do $$ begin
  create type otp_channel_t as enum ('email', 'sms');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_status_t as enum ('unread', 'read', 'archived', 'spam');
exception when duplicate_object then null; end $$;

do $$ begin
  create type document_kind_t as enum (
    'marksheet',        -- semester / term result
    'certificate',      -- passing / degree certificate
    'degree',
    'transcript',
    'offer_letter',
    'experience_letter',
    'appreciation',
    'recommendation',   -- LOR
    'research_paper',
    'publication',
    'id_proof',         -- modelled, but excluded by policy — see ARCHITECTURE.md § E
    'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type education_level_t as enum (
    'class_10', 'class_12', 'diploma', 'undergraduate', 'postgraduate', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type project_file_kind_t as enum (
    'source_zip', 'documentation', 'screenshot', 'video', 'diagram', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type share_target_t as enum ('file', 'document', 'project', 'album', 'resume');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_scope_t as enum ('public', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ai_role_t as enum ('user', 'assistant', 'system');
exception when duplicate_object then null; end $$;


-- ───────────────────────────────────────────────────────────────────────────
--  Helper: updated_at trigger
--  Attached to every mutable table so the column can never drift from reality
--  (an application that forgets to set it cannot cause a stale timestamp).
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.app_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ───────────────────────────────────────────────────────────────────────────
--  Helper: slugify
--  Used when seeding slugs for the compact projects in src/data/projects.js,
--  which currently have no slug of their own.
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.app_slugify(p_text text)
returns text
language sql
immutable
as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(lower(coalesce(p_text, '')), '[^a-z0-9]+', '-', 'g'),
      '-{2,}', '-', 'g'
    )
  );
$$;


comment on function public.app_set_updated_at is
  'Trigger function maintaining updated_at on mutable tables.';
comment on function public.app_slugify is
  'Lowercase, hyphenated URL slug from arbitrary text.';
