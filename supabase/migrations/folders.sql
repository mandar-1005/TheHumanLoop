-- Folders for organizing trainings (decks) by class/category.
-- Org-scoped: all admins in an organization see the same folder tree.
-- One folder per training (single nullable folder_id FK on trainings).
--
-- NOTE: profiles.organization_id is TEXT in the live schema, so
-- folders.organization_id must also be TEXT for the RLS comparison to
-- typecheck (otherwise: "operator does not exist: uuid = text").

CREATE TABLE IF NOT EXISTS public.folders (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT        NOT NULL,
  name            TEXT        NOT NULL CHECK (length(trim(name)) > 0),
  color           TEXT,
  created_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- If a previous run of this migration created the table with
-- organization_id UUID, coerce it to TEXT so the RLS policies below work.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'folders'
      AND column_name = 'organization_id'
      AND data_type = 'uuid'
  ) THEN
    EXECUTE 'ALTER TABLE public.folders ALTER COLUMN organization_id TYPE TEXT USING organization_id::text';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS folders_org_name_unique
  ON public.folders (organization_id, lower(name));
CREATE INDEX IF NOT EXISTS folders_org_idx
  ON public.folders (organization_id);

ALTER TABLE public.trainings
  ADD COLUMN IF NOT EXISTS folder_id UUID
    REFERENCES public.folders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS trainings_folder_idx
  ON public.trainings (folder_id);

-- RLS: mirrors trainings_org_update_policy.sql pattern (org membership via profiles).
-- Admin-only access is enforced at the UI layer via RoleGuard requireAdmin.
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can read folders" ON public.folders;
CREATE POLICY "Org members can read folders"
ON public.folders
FOR SELECT
TO authenticated
USING (
  organization_id = (SELECT p.organization_id FROM public.profiles AS p WHERE p.id = auth.uid() LIMIT 1)
);

DROP POLICY IF EXISTS "Org members can insert folders" ON public.folders;
CREATE POLICY "Org members can insert folders"
ON public.folders
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = (SELECT p.organization_id FROM public.profiles AS p WHERE p.id = auth.uid() LIMIT 1)
);

DROP POLICY IF EXISTS "Org members can update folders" ON public.folders;
CREATE POLICY "Org members can update folders"
ON public.folders
FOR UPDATE
TO authenticated
USING (
  organization_id = (SELECT p.organization_id FROM public.profiles AS p WHERE p.id = auth.uid() LIMIT 1)
)
WITH CHECK (
  organization_id = (SELECT p.organization_id FROM public.profiles AS p WHERE p.id = auth.uid() LIMIT 1)
);

DROP POLICY IF EXISTS "Org members can delete folders" ON public.folders;
CREATE POLICY "Org members can delete folders"
ON public.folders
FOR DELETE
TO authenticated
USING (
  organization_id = (SELECT p.organization_id FROM public.profiles AS p WHERE p.id = auth.uid() LIMIT 1)
);
