-- ═══════════════════════════════════════════════════════════════════════════
--  0006 — Operations: contact inbox, tokenized sharing, audit log, AI, settings
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
--  contact_messages — the admin inbox
--
--  Rows are written by the anon-facing /api/contact endpoint but are readable
--  ONLY by admins. RLS grants anon INSERT and nothing else (migration 0007),
--  so a submitter cannot read anyone's messages — not even their own.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.contact_messages (
  id            uuid primary key default gen_random_uuid(),

  name          text not null,
  email         citext not null,
  subject       text,
  message       text not null,

  status        message_status_t not null default 'unread',
  is_important  boolean not null default false,

  -- private notes only the admin sees
  admin_notes   text,

  replied_at    timestamptz,
  reply_body    text,

  -- Kept for abuse investigation. Minimal by design: no fingerprinting,
  -- no third-party analytics identifiers.
  ip            inet,
  user_agent    text,
  source        text not null default 'website',

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index if not exists contact_messages_status_idx
  on public.contact_messages (status, created_at desc) where deleted_at is null;
-- Drives the dashboard unread badge with an index-only scan.
create index if not exists contact_messages_unread_idx
  on public.contact_messages (created_at desc)
  where status = 'unread' and deleted_at is null;
create index if not exists contact_messages_search_idx
  on public.contact_messages using gin (
    to_tsvector('english',
      coalesce(name,'') || ' ' || coalesce(email::text,'') || ' ' ||
      coalesce(subject,'') || ' ' || coalesce(message,''))
  );

drop trigger if exists trg_contact_messages_updated on public.contact_messages;
create trigger trg_contact_messages_updated
  before update on public.contact_messages
  for each row execute function public.app_set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
--  shared_links — tokenized access to selected private objects
--
--  The raw token is shown to the admin exactly once, at creation. Only its
--  HMAC digest is stored, so a database dump does not yield working share URLs
--  (the same reasoning as otp_codes).
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.shared_links (
  id              uuid primary key default gen_random_uuid(),

  target_type     share_target_t not null,
  target_id       uuid not null,

  token_hash      text not null unique,
  -- First ~8 chars of the token, stored to let the admin UI identify a link in
  -- a list without holding anything that could reconstruct it.
  token_preview   text,

  label           text,
  -- 'unlisted' = anyone with the link; 'private' = link plus password.
  visibility      visibility_t not null default 'unlisted',

  -- bcrypt/scrypt digest when the share is password-protected. Never plaintext.
  password_hash   text,

  allow_download  boolean not null default false,
  allow_view      boolean not null default true,

  expires_at      timestamptz,
  max_views       integer,
  view_count      integer not null default 0,

  revoked_at      timestamptz,
  created_by      uuid references public.admin_users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- A share that permits neither viewing nor downloading is meaningless and
  -- almost certainly a UI bug; reject it at the database.
  constraint shared_links_some_permission check (allow_view or allow_download)
);

create index if not exists shared_links_target_idx
  on public.shared_links (target_type, target_id);
create index if not exists shared_links_active_idx
  on public.shared_links (revoked_at, expires_at);

drop trigger if exists trg_shared_links_updated on public.shared_links;
create trigger trg_shared_links_updated
  before update on public.shared_links
  for each row execute function public.app_set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
--  share_access_logs — every hit on a share link
--
--  Answers "who opened this, and when" after the fact, which is the whole
--  point of tokenized sharing over a raw storage URL.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.share_access_logs (
  id          bigserial primary key,
  link_id     uuid not null references public.shared_links (id) on delete cascade,
  action      text not null,          -- 'view' | 'download' | 'denied'
  ip          inet,
  user_agent  text,
  referer     text,
  created_at  timestamptz not null default now()
);

create index if not exists share_access_logs_link_idx
  on public.share_access_logs (link_id, created_at desc);


-- ───────────────────────────────────────────────────────────────────────────
--  activity_logs — audit trail
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.activity_logs (
  id           bigserial primary key,
  actor_id     uuid references public.admin_users (id) on delete set null,
  actor_label  text,                  -- preserved even if the account is deleted
  action       text not null,         -- 'auth.login', 'project.update', …
  entity_type  text,
  entity_id    uuid,
  summary      text,
  diff         jsonb,
  ip           inet,
  user_agent   text,
  created_at   timestamptz not null default now()
);

create index if not exists activity_logs_created_idx on public.activity_logs (created_at desc);
create index if not exists activity_logs_actor_idx   on public.activity_logs (actor_id, created_at desc);
create index if not exists activity_logs_entity_idx  on public.activity_logs (entity_type, entity_id);


-- ───────────────────────────────────────────────────────────────────────────
--  ai_conversations + ai_messages
--
--  `scope` separates public-widget threads from admin-assistant threads.
--  This is bookkeeping only — the isolation guarantee comes from the two
--  endpoints having entirely separate context builders, with the public one
--  holding no table access at all (docs/ARCHITECTURE.md § K).
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.ai_conversations (
  id           uuid primary key default gen_random_uuid(),
  scope        ai_scope_t not null,
  user_id      uuid references public.admin_users (id) on delete set null,
  -- Opaque per-browser id for anonymous public threads. Not a fingerprint.
  session_key  text,
  title        text,
  model        text,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create table if not exists public.ai_messages (
  id                uuid primary key default gen_random_uuid(),
  conversation_id   uuid not null references public.ai_conversations (id) on delete cascade,
  role              ai_role_t not null,
  content           text not null,
  -- Proposed mutations from the admin assistant land here as
  -- { action, entity, id, patch, rationale } and are applied only when the
  -- admin clicks Apply, which calls the ordinary REST endpoint. The model is
  -- never on the write path.
  proposed_action   jsonb,
  applied_at        timestamptz,
  input_tokens      integer,
  output_tokens     integer,
  created_at        timestamptz not null default now()
);

create index if not exists ai_conversations_scope_idx
  on public.ai_conversations (scope, updated_at desc) where deleted_at is null;
create index if not exists ai_messages_conversation_idx
  on public.ai_messages (conversation_id, created_at);

drop trigger if exists trg_ai_conversations_updated on public.ai_conversations;
create trigger trg_ai_conversations_updated
  before update on public.ai_conversations
  for each row execute function public.app_set_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
--  settings — key/value feature flags and site configuration
--
--  is_public gates whether a key may be served to anonymous callers, so a new
--  public flag never requires a code change to expose safely.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.settings (
  key         citext primary key,
  value       jsonb not null default '{}'::jsonb,
  description text,
  is_public   boolean not null default false,
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_settings_updated on public.settings;
create trigger trg_settings_updated
  before update on public.settings
  for each row execute function public.app_set_updated_at();
