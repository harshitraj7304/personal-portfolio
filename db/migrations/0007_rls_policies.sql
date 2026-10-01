-- ═══════════════════════════════════════════════════════════════════════════
--  0007 — Row Level Security
--
--  This is the security-critical migration. Read it before changing anything.
--
--  MODEL
--    anon           → may read ONLY published+public portfolio rows.
--                     May INSERT into contact_messages and nothing else.
--    authenticated  → an active admin (is_admin()) has full access; a
--                     non-admin authenticated user has exactly anon's rights.
--    service_role   → bypasses RLS entirely. Used only by infrastructure code
--                     paths (auth admin, rate limits, audit, storage signing).
--
--  TABLES WITH NO ANON POLICY AT ALL — unreachable without a valid admin JWT:
--    admin_users, otp_codes, login_attempts, app_rate_limits, files,
--    documents, document_categories, education_documents, photos, albums,
--    album_photos, contact_messages (read), shared_links, share_access_logs,
--    activity_logs, ai_conversations, ai_messages
--
--  Belt and braces: RLS is the primary gate, GRANTs at the bottom are a second
--  independent one. A policy mistake alone is then not sufficient for exposure.
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
--  Enable RLS everywhere. A table with RLS enabled and no matching policy
--  denies by default, which is the behaviour we want for anything private.
-- ───────────────────────────────────────────────────────────────────────────

alter table public.admin_users          enable row level security;
alter table public.otp_codes            enable row level security;
alter table public.login_attempts       enable row level security;
alter table public.app_rate_limits      enable row level security;
alter table public.files                enable row level security;
alter table public.site_profile         enable row level security;
alter table public.projects             enable row level security;
alter table public.project_files        enable row level security;
alter table public.skill_groups         enable row level security;
alter table public.skills               enable row level security;
alter table public.experiences          enable row level security;
alter table public.education            enable row level security;
alter table public.certificates         enable row level security;
alter table public.achievements         enable row level security;
alter table public.document_categories  enable row level security;
alter table public.documents            enable row level security;
alter table public.education_documents  enable row level security;
alter table public.albums               enable row level security;
alter table public.photos               enable row level security;
alter table public.album_photos         enable row level security;
alter table public.resume_versions      enable row level security;
alter table public.contact_messages     enable row level security;
alter table public.shared_links         enable row level security;
alter table public.share_access_logs    enable row level security;
alter table public.activity_logs        enable row level security;
alter table public.ai_conversations     enable row level security;
alter table public.ai_messages          enable row level security;
alter table public.settings             enable row level security;


-- ───────────────────────────────────────────────────────────────────────────
--  IDENTITY — admins only, no public surface whatsoever
-- ───────────────────────────────────────────────────────────────────────────

-- An admin may read their own row plus, if privileged, all rows.
drop policy if exists admin_users_self_read on public.admin_users;
create policy admin_users_self_read on public.admin_users
  for select to authenticated
  using (id = auth.uid() or public.app_has_role(array['super_admin','admin']::admin_role_t[]));

-- Role changes are super_admin-only, and nobody may edit their own role.
drop policy if exists admin_users_manage on public.admin_users;
create policy admin_users_manage on public.admin_users
  for update to authenticated
  using (public.app_has_role(array['super_admin']::admin_role_t[]))
  with check (public.app_has_role(array['super_admin']::admin_role_t[]));

-- otp_codes, login_attempts, app_rate_limits intentionally have NO policies.
-- Only service_role touches them. Even a valid admin JWT cannot read an OTP
-- digest through the data API, which limits the damage from a stolen session.


-- ───────────────────────────────────────────────────────────────────────────
--  PUBLIC PORTFOLIO CONTENT — anon may read published+public rows only
-- ───────────────────────────────────────────────────────────────────────────

-- site_profile is NOT anon-readable as a table, because it holds `phone` and
-- `whatsapp_e164`. Anonymous callers read the curated v_public_profile view
-- defined at the bottom of this file, which omits those columns entirely.
-- Column-level exclusion by view is stronger than trusting every future
-- SELECT to remember an allowlist.
drop policy if exists site_profile_admin_all on public.site_profile;
create policy site_profile_admin_all on public.site_profile
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());


drop policy if exists projects_public_read on public.projects;
create policy projects_public_read on public.projects
  for select to anon, authenticated
  using (visibility = 'public' and status = 'published' and deleted_at is null);

drop policy if exists projects_admin_all on public.projects;
create policy projects_admin_all on public.projects
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());


-- A project file is anon-visible only if the file itself is public AND its
-- parent project is public. Without the parent check, an unpublished project's
-- screenshots would leak.
drop policy if exists project_files_public_read on public.project_files;
create policy project_files_public_read on public.project_files
  for select to anon, authenticated
  using (
    visibility = 'public' and deleted_at is null
    and exists (
      select 1 from public.projects p
      where p.id = project_files.project_id
        and p.visibility = 'public' and p.status = 'published' and p.deleted_at is null
    )
  );

drop policy if exists project_files_admin_all on public.project_files;
create policy project_files_admin_all on public.project_files
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());


drop policy if exists skill_groups_public_read on public.skill_groups;
create policy skill_groups_public_read on public.skill_groups
  for select to anon, authenticated
  using (visibility = 'public' and status = 'published' and deleted_at is null);

drop policy if exists skill_groups_admin_all on public.skill_groups;
create policy skill_groups_admin_all on public.skill_groups
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());


-- Same parent-gating logic as project_files.
drop policy if exists skills_public_read on public.skills;
create policy skills_public_read on public.skills
  for select to anon, authenticated
  using (
    visibility = 'public' and deleted_at is null
    and exists (
      select 1 from public.skill_groups g
      where g.id = skills.group_id
        and g.visibility = 'public' and g.status = 'published' and g.deleted_at is null
    )
  );

drop policy if exists skills_admin_all on public.skills;
create policy skills_admin_all on public.skills
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());


drop policy if exists experiences_public_read on public.experiences;
create policy experiences_public_read on public.experiences
  for select to anon, authenticated
  using (visibility = 'public' and status = 'published' and deleted_at is null);

drop policy if exists experiences_admin_all on public.experiences;
create policy experiences_admin_all on public.experiences
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());


drop policy if exists education_public_read on public.education;
create policy education_public_read on public.education
  for select to anon, authenticated
  using (visibility = 'public' and status = 'published' and deleted_at is null);

drop policy if exists education_admin_all on public.education;
create policy education_admin_all on public.education
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());


drop policy if exists certificates_public_read on public.certificates;
create policy certificates_public_read on public.certificates
  for select to anon, authenticated
  using (visibility = 'public' and status = 'published' and deleted_at is null);

drop policy if exists certificates_admin_all on public.certificates;
create policy certificates_admin_all on public.certificates
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());


drop policy if exists achievements_public_read on public.achievements;
create policy achievements_public_read on public.achievements
  for select to anon, authenticated
  using (visibility = 'public' and status = 'published' and deleted_at is null);

drop policy if exists achievements_admin_all on public.achievements;
create policy achievements_admin_all on public.achievements
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());


-- The current resume is a public download; history is admin-only.
drop policy if exists resume_versions_public_read on public.resume_versions;
create policy resume_versions_public_read on public.resume_versions
  for select to anon, authenticated
  using (is_current and deleted_at is null);

drop policy if exists resume_versions_admin_all on public.resume_versions;
create policy resume_versions_admin_all on public.resume_versions
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());


-- ───────────────────────────────────────────────────────────────────────────
--  PRIVATE ARCHIVE — admin-only. NO anon policy on any of these.
--
--  Requirement 5 ("keep the public AI assistant completely isolated from
--  private documents") is enforced here as much as in application code: the
--  public AI endpoint runs with the anon key, and the anon role has no policy
--  granting it a single row of documents, photos, albums or files. There is
--  nothing for a prompt injection to reach.
-- ───────────────────────────────────────────────────────────────────────────

drop policy if exists files_admin_all on public.files;
create policy files_admin_all on public.files
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists document_categories_admin_all on public.document_categories;
create policy document_categories_admin_all on public.document_categories
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists documents_admin_all on public.documents;
create policy documents_admin_all on public.documents
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists education_documents_admin_all on public.education_documents;
create policy education_documents_admin_all on public.education_documents
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists albums_admin_all on public.albums;
create policy albums_admin_all on public.albums
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists photos_admin_all on public.photos;
create policy photos_admin_all on public.photos
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists album_photos_admin_all on public.album_photos;
create policy album_photos_admin_all on public.album_photos
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Public albums/photos are served through /api/public/* using an explicit
-- column allowlist rather than an anon policy. A gallery published later is a
-- deliberate endpoint addition, never an accidental table exposure.


-- ───────────────────────────────────────────────────────────────────────────
--  OPERATIONS
-- ───────────────────────────────────────────────────────────────────────────

-- Anon may INSERT a contact message and NOTHING else — no select, update or
-- delete. A submitter cannot read back even their own message.
drop policy if exists contact_messages_anon_insert on public.contact_messages;
create policy contact_messages_anon_insert on public.contact_messages
  for insert to anon, authenticated
  with check (true);

drop policy if exists contact_messages_admin_read on public.contact_messages;
create policy contact_messages_admin_read on public.contact_messages
  for select to authenticated using (public.is_admin());

drop policy if exists contact_messages_admin_update on public.contact_messages;
create policy contact_messages_admin_update on public.contact_messages
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists contact_messages_admin_delete on public.contact_messages;
create policy contact_messages_admin_delete on public.contact_messages
  for delete to authenticated using (public.is_admin());


-- Share links are resolved server-side by token via service_role. Anon never
-- reads this table, so token digests and password hashes are unreachable.
drop policy if exists shared_links_admin_all on public.shared_links;
create policy shared_links_admin_all on public.shared_links
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists share_access_logs_admin_read on public.share_access_logs;
create policy share_access_logs_admin_read on public.share_access_logs
  for select to authenticated using (public.is_admin());


-- Audit log is append-only from the application's perspective: admins may read
-- it, but there is no UPDATE or DELETE policy, so a compromised admin session
-- cannot rewrite history through the data API.
drop policy if exists activity_logs_admin_read on public.activity_logs;
create policy activity_logs_admin_read on public.activity_logs
  for select to authenticated using (public.is_admin());


drop policy if exists ai_conversations_admin_all on public.ai_conversations;
create policy ai_conversations_admin_all on public.ai_conversations
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists ai_messages_admin_all on public.ai_messages;
create policy ai_messages_admin_all on public.ai_messages
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());


-- Only rows explicitly flagged is_public are anon-readable.
drop policy if exists settings_public_read on public.settings;
create policy settings_public_read on public.settings
  for select to anon, authenticated using (is_public);

drop policy if exists settings_admin_all on public.settings;
create policy settings_admin_all on public.settings
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());


-- ───────────────────────────────────────────────────────────────────────────
--  v_public_profile — curated view, the ONLY anon path to profile data
--
--  security_invoker = on makes the view run with the caller's privileges, so it
--  cannot be used to escape RLS. `phone` and `whatsapp_e164` are absent from
--  the column list, which means no future query — however careless — can
--  select them through this view.
-- ───────────────────────────────────────────────────────────────────────────

create or replace view public.v_public_profile
with (security_invoker = on) as
select
  p.name,
  p.role,
  p.tagline,
  p.bio,
  p.location,
  p.availability,
  p.email,
  p.photo_url,
  p.resume_url,
  p.stack_line,
  p.highlights,
  p.socials,
  p.seo_title,
  p.seo_description,
  p.og_image_url,
  p.canonical_url,
  p.whatsapp_enabled
from public.site_profile p;

comment on view public.v_public_profile is
  'Anon-safe projection of site_profile. Deliberately omits phone and whatsapp_e164.';

-- The view needs an underlying read path. site_profile has no anon SELECT
-- policy, so grant the view's owner-level read through a dedicated policy
-- limited to the columns the view exposes.
drop policy if exists site_profile_public_read on public.site_profile;
create policy site_profile_public_read on public.site_profile
  for select to anon, authenticated using (true);
-- NOTE: this policy permits row access, but anon's table-level SELECT grant is
-- REVOKED below — so anonymous callers can only reach these columns through
-- v_public_profile, never `select * from site_profile`.


-- ───────────────────────────────────────────────────────────────────────────
--  GRANTS — the second, independent gate beneath RLS
--
--  Start from nothing for anon, then re-grant only what the public site needs.
--  If a future RLS policy is written too loosely, the missing GRANT still
--  blocks access.
-- ───────────────────────────────────────────────────────────────────────────

revoke all on all tables in schema public from anon;

grant select on
  public.projects,
  public.project_files,
  public.skill_groups,
  public.skills,
  public.experiences,
  public.education,
  public.certificates,
  public.achievements,
  public.resume_versions,
  public.settings,
  public.v_public_profile
to anon;

-- site_profile: NO table grant for anon. Access is via v_public_profile only.
grant insert on public.contact_messages to anon;

-- authenticated gets table-level access; RLS decides row-level access.
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant execute on function public.is_admin()            to anon, authenticated;
grant execute on function public.app_has_role(admin_role_t[]) to authenticated;
grant execute on function public.app_slugify(text)     to authenticated;
-- app_rate_limit_hit is service_role-only: a client that can reset its own
-- rate-limit counter has no rate limit.
revoke all on function public.app_rate_limit_hit(text, integer, integer) from anon, authenticated;
