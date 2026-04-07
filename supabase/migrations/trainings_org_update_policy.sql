-- Allow org members to update training content (e.g. inline flashcard edits from Training Modules).
-- Aligns company_id on trainings with organization_id on profiles (same convention as inserts from the pipeline).
-- Apply only if public.trainings exists and RLS is enabled there.

DROP POLICY IF EXISTS "Org members can update own company trainings" ON public.trainings;

CREATE POLICY "Org members can update own company trainings"
ON public.trainings
FOR UPDATE
TO authenticated
USING (
  company_id = (SELECT p.organization_id FROM public.profiles AS p WHERE p.id = auth.uid() LIMIT 1)
)
WITH CHECK (
  company_id = (SELECT p.organization_id FROM public.profiles AS p WHERE p.id = auth.uid() LIMIT 1)
);
