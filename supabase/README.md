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

## Applying schema changes

You can apply SQL either by:

- Versioned migration files in migrations/
- Supabase SQL Editor (manual execution)

If using SQL Editor, keep migration files in sync later so teammates and deploy environments match.
