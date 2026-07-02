-- SQL Migration: Supabase Security Advisor Fixes
-- This migration hardens the database by fixing open RLS policies, mutable search paths, and storage list exploits.

-- 1. Fix RLS policy for public.reviews
DROP POLICY IF EXISTS "Allow authenticated users to manage reviews" ON public.reviews;

CREATE POLICY "Allow authenticated users to manage own reviews" ON public.reviews 
    FOR ALL TO authenticated 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- 2. Revoke execute permission from public for trigger/helper functions that do not require API RPC execution
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.track_founding_member() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_pricing_stage() FROM PUBLIC;

-- 3. Set explicit search_path on all SECURITY DEFINER functions to mitigate search path hijacking
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.get_active_pricing() SET search_path = public;
ALTER FUNCTION public.update_pricing_stage() SET search_path = public;
ALTER FUNCTION public.handle_stripe_subscription_update(p_user_id uuid, p_subscription_id text, p_status text, p_plan_type text, p_current_period_end timestamp with time zone, p_stripe_customer_id text) SET search_path = public;
ALTER FUNCTION public.handle_stripe_invoice_paid(p_stripe_customer_id text, p_subscription_id text) SET search_path = public;
ALTER FUNCTION public.handle_whop_credit_purchase(p_user_id uuid, p_arv_credits integer, p_mao_credits integer, p_ai_uses integer, p_feature_desc text) SET search_path = public;
ALTER FUNCTION public.get_user_id_by_email(p_email text) SET search_path = public;
ALTER FUNCTION public.track_founding_member() SET search_path = public;
ALTER FUNCTION public.create_or_get_user_for_whop(p_email text, p_username text, p_full_name text, p_whop_user_id text, p_password text) SET search_path = public;

-- 4. Review storage bucket policies for avatars and deal-files to prevent object listing
-- Drop public select access since they are public buckets and direct URL downloads bypass RLS anyway
DROP POLICY IF EXISTS "Public Access to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to deal-files" ON storage.objects;

-- Restrict ALL access policies to only allow users to manage their own folders
DROP POLICY IF EXISTS "Authenticated Modify avatars" ON storage.objects;
CREATE POLICY "Authenticated Manage own avatars" ON storage.objects 
    FOR ALL TO authenticated 
    USING (bucket_id = 'avatars'::text AND (storage.foldername(name))[1] = auth.uid()::text)
    WITH CHECK (bucket_id = 'avatars'::text AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Authenticated Modify deal-files" ON storage.objects;
CREATE POLICY "Authenticated Manage own deal-files" ON storage.objects 
    FOR ALL TO authenticated 
    USING (bucket_id = 'deal-files'::text AND (storage.foldername(name))[1] = auth.uid()::text)
    WITH CHECK (bucket_id = 'deal-files'::text AND (storage.foldername(name))[1] = auth.uid()::text);
