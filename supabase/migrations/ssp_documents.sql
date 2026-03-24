CREATE TABLE IF NOT EXISTS public.ssp_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    extracted_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Enable RLS
ALTER TABLE public.ssp_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents"
    ON public.ssp_documents FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
    ON public.ssp_documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
    ON public.ssp_documents FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
    ON public.ssp_documents FOR DELETE
    USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX ssp_documents_user_idx ON public.ssp_documents (user_id);
CREATE INDEX ssp_documents_created_idx ON public.ssp_documents (created_at);

-- Storage bucket for SSP document PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('ssp-documents', 'ssp-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users upload into their own folder ({user_id}/*)
CREATE POLICY "Users can upload own SSP files"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'ssp-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view own SSP files"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'ssp-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own SSP files"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'ssp-documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
