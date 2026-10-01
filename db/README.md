# Database migrations

Plain SQL files, run **in numeric order**. There is no migration framework —
Supabase's SQL editor is the runner. Every file is written to be **idempotent**
(`create ... if not exists`, `do $$ ... exception when duplicate_object $$`), so
re-running one is safe if you are unsure whether it applied.

## Running them

1. Open your Supabase project → **SQL Editor** → **New query**.
2. Paste the contents of `0001_extensions_enums_helpers.sql`, click **Run**.
3. Repeat for each file, in order, up to `0008_seed_baseline.sql`.

Do not skip ahead — later files reference enums, tables and functions created by
earlier ones, so out-of-order runs fail with confusing "type does not exist"
errors.

## The files

| File | What it creates | Why it exists |
|---|---|---|
| `0001_extensions_enums_helpers.sql` | `pgcrypto`, `citext`; 13 enum types; `app_set_updated_at()`, `app_slugify()` | Every later file depends on these types. `citext` makes email uniqueness case-insensitive at the database level rather than in application code. |
| `0002_identity.sql` | `admin_users`, `otp_codes`, `login_attempts`, `app_rate_limits`; `is_admin()`, `app_has_role()`, `app_rate_limit_hit()` | `admin_users` is the allowlist — existing in `auth.users` is **not** enough to reach `/admin`. `is_admin()` is `SECURITY DEFINER` so RLS policies can call it without recursing into the table they protect. |
| `0003_storage.sql` | `files` registry; `public-assets` + `private-vault` buckets; 8 `storage.objects` policies | One registry row per blob, whatever its home. `private-vault` has **no anon policy at all** — not a restrictive one, none — so there is no path for an unauthenticated request to reach a private object. |
| `0004_portfolio_content.sql` | `site_profile`, `projects`, `project_files`, `skill_groups`, `skills`, `experiences`, `education`, `certificates`, `achievements` | Mirrors the current `src/data/*.js` shape exactly, including `date_label`-style columns that store the rendered string verbatim. |
| `0005_archive.sql` | `document_categories`, `documents`, `education_documents`, `albums`, `photos`, `album_photos`, `resume_versions` | The private side. Everything defaults to `visibility = 'private'`. |
| `0006_operations.sql` | `contact_messages`, `shared_links`, `share_access_logs`, `activity_logs`, `ai_conversations`, `ai_messages`, `settings` | Inbox, tokenised sharing, audit trail, AI history. |
| `0007_rls_policies.sql` | RLS on all 28 tables, ~40 policies, `v_public_profile`, then explicit `GRANT`/`REVOKE` | **The security-critical file.** Read the header comment before changing anything. |
| `0008_seed_baseline.sql` | `settings` rows (all feature flags `false`), document categories, `site_profile`, one `resume_versions` row | Makes a fresh deploy a visible no-op: the public site keeps rendering from `src/data/*.js` until you flip a flag. |

## Verifying a run

After `0008`, run this in the SQL editor:

```sql
-- Should return 28
select count(*) from pg_tables
where schemaname = 'public' and rowsecurity = true;

-- Should return 0. Any row here is a table with RLS on but no policy,
-- which silently denies everything — usually a mistake.
select t.tablename
from pg_tables t
left join pg_policies p on p.schemaname = t.schemaname and p.tablename = t.tablename
where t.schemaname = 'public' and t.rowsecurity and p.policyname is null;

-- Should return only the intentionally public tables.
select table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'anon' and table_schema = 'public'
order by table_name;
```

The third query is the one to actually read. If a table you consider private
appears in that list, stop and fix it before deploying — an anon `GRANT` is
checked *before* RLS, but a table with both a grant and a permissive policy is
publicly readable.

## Two things that are easy to get wrong

**`is_admin()` must stay `SECURITY DEFINER`.** It reads `admin_users`, and
`admin_users` has an RLS policy that calls `is_admin()`. Without `SECURITY
DEFINER` (which runs the function as its owner, bypassing RLS) that is infinite
recursion and Postgres aborts the query.

**`site_profile` has no anon grant, deliberately.** It holds `phone` and
`whatsapp_e164`. Anonymous reads go through `v_public_profile`, which omits those
columns. If you ever add a column to `site_profile`, decide explicitly whether it
belongs in that view — the default (not in the view) is the safe one.

## Rolling back

There are no down-migrations. This is a greenfield schema in a fresh project, so
the rollback is "drop the schema and re-run", not "reverse the last file":

```sql
-- DESTRUCTIVE. Only on a project with no data you care about.
drop schema public cascade;
create schema public;
grant usage on schema public to anon, authenticated, service_role;
```

Once real content is in the database, take a Supabase backup before running any
new migration instead.
