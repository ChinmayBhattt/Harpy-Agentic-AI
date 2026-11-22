-- ============================================================
-- HARPY AI: Contact Inquiries Table & Security Policies
-- Run this in your Supabase Dashboard -> SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.contact_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    inquiry TEXT NOT NULL,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for swift ordering by creation time
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_created_at ON public.contact_inquiries(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.contact_inquiries ENABLE ROW LEVEL SECURITY;

-- 1. Allow public / anonymous users to insert contact inquiries
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.contact_inquiries;
CREATE POLICY "Enable insert for everyone" ON public.contact_inquiries
    FOR INSERT
    TO public
    WITH CHECK (true);

-- 2. Allow authenticated users / admins to view all submissions
DROP POLICY IF EXISTS "Enable select for authenticated users" ON public.contact_inquiries;
CREATE POLICY "Enable select for authenticated users" ON public.contact_inquiries
    FOR SELECT
    TO authenticated
    USING (true);
