-- ═══════════════════════════════════════════════════════════════════════════
--  0002 — Identity: admin allowlist, OTP codes, login attempts, rate limits
--
--  Passwords are NOT stored here. They live in Supabase Auth (auth.users),
--  bcrypt-hashed by Supabase. This application never sees, hashes, or stores
--  a plaintext password.
--
--  admin_users is an ALLOWLIST keyed to auth.users. Existing as an auth user
--  is not sufficient to reach the admin panel — you must also be an active
--  row here. A stray or accidental signup therefore cannot gain admin access.
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
--  admin_users
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.admin_users (
  id              uuid primary key references auth.users (id) on delete cascade,
  email           citext not null unique,
  -- Phone is an optional login alias (phone+password). Resolved to the email
  -- server-side. It is NEVER exposed by any public endpoint.
  phone           text unique,
  full_name       text,
  role            admin_role_t not null default 'admin',
  is_active       boolean not null default true,
  last_login_at   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists trg_admin_users_updated on public.admin_users;
create trigger trg_admin_users_updated
  before update on public.admin_users
  for each row execute function public.app_set_updated_at();

comment on table public.admin_users is
  'Allowlist of accounts permitted to use /admin. Being in auth.users is not enough.';


-- ───────────────────────────────────────────────────────────────────────────
--  is_admin() / app_has_role()
--
--  SECURITY DEFINER is required here. An RLS policy on admin_users that reads
--  admin_users would recurse; a definer function reads it outside RLS and
--  breaks the cycle. `set search_path = public` prevents search-path hijacking,
--  which is the standard hardening for any SECURITY DEFINER function.
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where id = auth.uid() and is_active
  );
$$;

create or replace function public.app_has_role(p_roles admin_role_t[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where id = auth.uid() and is_active and role = any(p_roles)
  );
$$;

comment on function public.is_admin is
  'True when the current JWT belongs to an active admin. Used by every RLS policy.';


-- ───────────────────────────────────────────────────────────────────────────
--  otp_codes
--
--  Codes are stored as HMAC-SHA256 digests, never in plaintext. A database
--  dump therefore does not yield a usable login code. Verification is done
--  with a constant-time comparison in api/_lib/crypto.js.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.otp_codes (
  id            uuid primary key default gen_random_uuid(),
  -- email address or phone; NOT a foreign key, so requesting a code for a
  -- non-existent account looks identical to requesting one for a real account
  -- (this is what makes the uniform anti-enumeration response possible).
  identifier    citext not null,
  purpose       otp_purpose_t not null,
  channel       otp_channel_t not null default 'email',
  code_hash     text not null,
  attempts      integer not null default 0,
  max_attempts  integer not null default 5,
  expires_at    timestamptz not null,
  consumed_at   timestamptz,
  ip            inet,
  user_agent    text,
  created_at    timestamptz not null default now()
);

create index if not exists otp_codes_lookup_idx
  on public.otp_codes (identifier, purpose, consumed_at, expires_at desc);

create index if not exists otp_codes_expiry_idx
  on public.otp_codes (expires_at);

comment on table public.otp_codes is
  'One-time codes, stored as HMAC digests. Single-use, expiring, attempt-capped.';


-- ───────────────────────────────────────────────────────────────────────────
--  login_attempts  — forensic record, separate from rate limiting
--
--  Rate limiting decides "may this request proceed"; this table answers
--  "what happened, and from where". Keeping them apart means throttle counters
--  can be pruned aggressively without losing the security audit trail.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.login_attempts (
  id           bigserial primary key,
  identifier   citext not null,
  ip           inet,
  user_agent   text,
  successful   boolean not null default false,
  reason       text,
  created_at   timestamptz not null default now()
);

create index if not exists login_attempts_identifier_idx
  on public.login_attempts (identifier, created_at desc);
create index if not exists login_attempts_ip_idx
  on public.login_attempts (ip, created_at desc);


-- ───────────────────────────────────────────────────────────────────────────
--  app_rate_limits + app_rate_limit_hit()
--
--  Fixed-window counters. The counter MUST be incremented atomically — a
--  read-then-write from a serverless function races against itself under
--  concurrent requests, which is precisely the condition an attacker creates.
--  INSERT ... ON CONFLICT DO UPDATE ... RETURNING performs the whole
--  check-and-increment in one statement, so the limit holds under any
--  concurrency.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.app_rate_limits (
  bucket        text primary key,      -- e.g. 'login:harshit@x.com', 'contact:ip:1.2.3.4'
  hits          integer not null default 0,
  window_start  timestamptz not null default now(),
  expires_at    timestamptz not null
);

create index if not exists app_rate_limits_expiry_idx
  on public.app_rate_limits (expires_at);

create or replace function public.app_rate_limit_hit(
  p_bucket         text,
  p_limit          integer,
  p_window_seconds integer
)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now   timestamptz := now();
  v_hits  integer;
  v_reset timestamptz;
begin
  -- Opportunistic cleanup; avoids needing a scheduled job on the free tier.
  delete from public.app_rate_limits where expires_at < v_now - interval '1 hour';

  insert into public.app_rate_limits as rl (bucket, hits, window_start, expires_at)
  values (p_bucket, 1, v_now, v_now + make_interval(secs => p_window_seconds))
  on conflict (bucket) do update
    set hits = case when rl.expires_at < v_now then 1 else rl.hits + 1 end,
        window_start = case when rl.expires_at < v_now then v_now else rl.window_start end,
        expires_at = case
          when rl.expires_at < v_now
          then v_now + make_interval(secs => p_window_seconds)
          else rl.expires_at
        end
  returning rl.hits, rl.expires_at into v_hits, v_reset;

  return query select (v_hits <= p_limit), greatest(p_limit - v_hits, 0), v_reset;
end;
$$;

comment on function public.app_rate_limit_hit is
  'Atomic fixed-window rate limiter. Single statement, so it is race-free.';
