-- ═══════════════════════════════════════════════════════════════════════════
--  0003 — Storage: the single `files` registry + two buckets
--
--  Every binary in the system — certificate scan, project screenshot, source
--  ZIP, marksheet PDF, photo, resume — is ONE row in `files`. Content tables
--  reference file_id.
--
--  Why one registry instead of per-feature columns: mime/size/checksum logic,
--  visibility enforcement, and signed-URL generation each exist in exactly one
--  place. Eight tables with their own storage_path columns would mean eight
--  places to get authorization wrong.
-- ═══════════════════════════════════════════════════════════════════════════


create table if not exists public.files (
  id             uuid primary key default gen_random_uuid(),

  -- 'static'  → already committed under public/, served by the CDN, never signed
  -- 'public'  → uploaded to the public-assets bucket
  -- 'private' → uploaded to private-vault, reachable only via a signed URL
  storage_scope  storage_scope_t not null default 'private',

  -- NULL for 'static' files (they have no bucket — see public_path)
  bucket         text,
  storage_path   text,

  -- Set ONLY for storage_scope = 'static'. The existing repo path, e.g.
  -- '/certificates/oci-genai-professional.png'. This is what lets the 29
  -- certificate images already in public/ be registered without being moved,
  -- so no currently-working image URL changes.
  public_path    text,

  original_name  text not null,
  mime_type      text,
  size_bytes     bigint,
  checksum_sha256 text,

  -- Image/video dimensions, page count, EXIF-stripped flag, etc.
  metadata       jsonb not null default '{}'::jsonb,

  visibility     visibility_t not null default 'private',
  uploaded_by    uuid references public.admin_users (id) on delete set null,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,

  -- ── STRUCTURAL SAFETY CONSTRAINT ──────────────────────────────────────
  -- An object living in the private bucket can never be labelled public.
  -- Enforced by Postgres, so no handler bug, admin misclick, or future
  -- refactor can produce a publicly-readable private file.
  constraint files_private_bucket_not_public
    check (storage_scope <> 'private' or visibility <> 'public'),

  -- Each scope must carry the location fields it actually needs.
  constraint files_location_present
    check (
      (storage_scope = 'static' and public_path is not null)
      or (storage_scope <> 'static' and bucket is not null and storage_path is not null)
    )
);

create index if not exists files_scope_idx      on public.files (storage_scope);
create index if not exists files_visibility_idx on public.files (visibility);
create index if not exists files_created_idx    on public.files (created_at desc);
create unique index if not exists files_bucket_path_key
  on public.files (bucket, storage_path) where storage_path is not null;

drop trigger if exists trg_files_updated on public.files;
create trigger trg_files_updated
  before update on public.files
  for each row execute function public.app_set_updated_at();

comment on table public.files is
  'Single registry for every stored binary. One place to enforce visibility and sign URLs.';
comment on column public.files.public_path is
  'Existing repo path for storage_scope=static. Lets committed assets be registered, not moved.';


-- ───────────────────────────────────────────────────────────────────────────
--  Storage buckets
--
--  public-assets : public read, used for site imagery
--  private-vault : NO public read policy whatsoever. Even a leaked anon key
--                  cannot list or fetch from it. Access is exclusively via
--                  service-role-signed URLs with a 60-second TTL, issued by
--                  /api/files/:id after authorization.
-- ───────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit)
values ('public-assets', 'public-assets', true, 26214400)      -- 25 MB
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public, file_size_limit)
values ('private-vault', 'private-vault', false, 104857600)    -- 100 MB
on conflict (id) do update set public = false;


-- ───────────────────────────────────────────────────────────────────────────
--  Bucket access policies
-- ───────────────────────────────────────────────────────────────────────────

-- Anyone may read public-assets (it is a public bucket by definition).
drop policy if exists "public_assets_read" on storage.objects;
create policy "public_assets_read" on storage.objects
  for select using (bucket_id = 'public-assets');

-- Only active admins may write to public-assets.
drop policy if exists "public_assets_admin_write" on storage.objects;
create policy "public_assets_admin_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'public-assets' and public.is_admin());

drop policy if exists "public_assets_admin_update" on storage.objects;
create policy "public_assets_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'public-assets' and public.is_admin());

drop policy if exists "public_assets_admin_delete" on storage.objects;
create policy "public_assets_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'public-assets' and public.is_admin());

-- private-vault: admins only, for every operation. There is deliberately NO
-- policy granting anon or public any access at all.
drop policy if exists "private_vault_admin_read" on storage.objects;
create policy "private_vault_admin_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'private-vault' and public.is_admin());

drop policy if exists "private_vault_admin_write" on storage.objects;
create policy "private_vault_admin_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'private-vault' and public.is_admin());

drop policy if exists "private_vault_admin_update" on storage.objects;
create policy "private_vault_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'private-vault' and public.is_admin());

drop policy if exists "private_vault_admin_delete" on storage.objects;
create policy "private_vault_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'private-vault' and public.is_admin());
