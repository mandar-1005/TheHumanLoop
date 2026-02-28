-- Create a Profiles table to store User Roles and Org IDs
CREATE TABLE IF NOT EXISTS public.profiles (
                                               id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
                                               first_name TEXT,
                                               last_name TEXT,
                                               organization_id TEXT NOT NULL, -- This maps to the folder name in Storage
                                               role TEXT DEFAULT 'employee',  -- e.g., 'admin', 'security_lead', 'developer'
                                               updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
    );

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create a policy so users can only see their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
                                  USING (auth.uid() = id);
-- Strict RLS: Users can only access files in a folder named after their organization_id
CREATE POLICY "Org-based Storage Access"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'ssp-uploads'
  AND (storage.foldername(name))[1] = (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'ssp-uploads'
  AND (storage.foldername(name))[1] = (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);