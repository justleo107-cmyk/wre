-- SQL Migration: Vanta Super Admin Role & Audit Logging
-- Adds RBAC support, suspension controls, and admin action audit logs.

-- 1. Add role and suspension status to profiles schema
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;

-- 2. Assign the super_admin role to the project owner
UPDATE public.profiles 
SET role = 'super_admin' 
WHERE id = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5';

-- 3. Create admin audit logging table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_id TEXT,
    target_type TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on audit logs
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for admin audit logs
CREATE POLICY "Super Admins can read audit logs" ON public.admin_audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

CREATE POLICY "Allow system to insert audit logs" ON public.admin_audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);
