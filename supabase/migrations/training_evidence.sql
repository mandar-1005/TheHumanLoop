CREATE TABLE IF NOT EXISTS public.training_evidence (
                                                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Who completed it
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    organization_id TEXT NOT NULL,

    -- What they completed
    training_id UUID REFERENCES public.trainings ON DELETE SET NULL,
    company_role TEXT NOT NULL,

    -- Results
    score INTEGER CHECK (score >= 0 AND score <= 100),
    passed BOOLEAN GENERATED ALWAYS AS (score >= 70) STORED,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),

    -- Audit metadata
    assessment_type TEXT, -- 'multiple_choice', 'case_study', 'short_response', 'flashcards'
    grader_feedback TEXT,
    evidence_notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
    );

-- Enable RLS
ALTER TABLE public.training_evidence ENABLE ROW LEVEL SECURITY;

-- Users can only see evidence within their org
CREATE POLICY "Org members can view training evidence"
ON public.training_evidence FOR SELECT
                                           USING (
                                           organization_id = (
                                           SELECT organization_id FROM public.profiles WHERE id = auth.uid()
                                           )
                                           );

-- Users can only insert their own evidence
CREATE POLICY "Users can insert own evidence"
ON public.training_evidence FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Index for fast audit queries
CREATE INDEX training_evidence_org_idx ON public.training_evidence (organization_id);
CREATE INDEX training_evidence_user_idx ON public.training_evidence (user_id);
CREATE INDEX training_evidence_training_idx ON public.training_evidence (training_id);