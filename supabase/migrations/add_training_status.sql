-- Add status column to trainings for review queue workflow.
-- Existing rows default to 'draft' so admins must explicitly publish them.
ALTER TABLE public.trainings
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft', 'in_review', 'published', 'rejected'));

ALTER TABLE public.trainings
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS trainings_status_idx ON public.trainings (status);
