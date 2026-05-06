# Supabase Directory

Database migrations, configurations, and seed data.

## Structure

- `migrations/` - SQL migration files
- `config/` - Supabase configuration files
- `seed/` - Seed data for development

## Current schema notes

- `trainings.id` is int8 (BIGINT).
- Training feedback is stored on `trainings.positive_score`.
- `training_evidence.training_id` should use BIGINT to match `trainings.id`.

### Folders (training categories)

Defined in `migrations/folders.sql`.

- `public.folders` — UUID PK, **org-scoped** via `organization_id` (TEXT, matches `profiles.organization_id`). Columns: `name` (unique per org, case-insensitive), optional `color`, `created_by` (audit), timestamps.
- `public.trainings.folder_id` — nullable UUID, `REFERENCES public.folders(id) ON DELETE SET NULL`. Decks land in "Uncategorized" when their folder is deleted.
- RLS on `folders`: SELECT/INSERT/UPDATE/DELETE allowed for any authenticated user whose `profiles.organization_id` matches `folders.organization_id` — same pattern as `trainings_org_update_policy.sql`. Admin-only access is enforced at the UI via `RoleGuard requireAdmin` on `/training-modules`.
- One folder per deck (single FK; no junction table).

## Applying schema changes

You can apply SQL either by:

- Versioned migration files in migrations/
- Supabase SQL Editor (manual execution)

If using SQL Editor, keep migration files in sync later so teammates and deploy environments match.
