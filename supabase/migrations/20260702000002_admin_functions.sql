-- SQL Migration: Admin Control API Functions
-- Exposes highly secure database functions for Super Admin operations, bypassing RLS internally under strict RBAC validation.

-- 1. Helper function to check if caller has super admin privileges
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = p_user_id AND role = 'super_admin' AND is_suspended = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Lists and searches users (super admin only)
CREATE OR REPLACE FUNCTION public.admin_list_users(p_admin_id UUID, p_search TEXT DEFAULT '')
RETURNS TABLE (
    id UUID,
    username TEXT,
    full_name TEXT,
    role TEXT,
    subscription_status TEXT,
    is_suspended BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    IF NOT public.is_super_admin(p_admin_id) THEN
        RAISE EXCEPTION 'Access Denied: Admin privileges required';
    END IF;

    RETURN QUERY
    SELECT 
        p.id,
        p.username,
        p.full_name,
        p.role,
        p.subscription_status,
        p.is_suspended,
        p.created_at
    FROM public.profiles p
    WHERE p_search = '' 
       OR p.username ILIKE '%' || p_search || '%'
       OR p.full_name ILIKE '%' || p_search || '%'
       OR p.id::text = p_search
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Suspends or reactivates users (super admin only)
CREATE OR REPLACE FUNCTION public.admin_toggle_user_suspension(
    p_admin_id UUID,
    p_target_user_id UUID,
    p_is_suspended BOOLEAN
)
RETURNS VOID AS $$
BEGIN
    IF NOT public.is_super_admin(p_admin_id) THEN
        RAISE EXCEPTION 'Access Denied: Admin privileges required';
    END IF;

    -- Do not allow super admin to suspend themselves
    IF p_admin_id = p_target_user_id THEN
        RAISE EXCEPTION 'Access Denied: You cannot suspend your own account';
    END IF;

    UPDATE public.profiles
    SET is_suspended = p_is_suspended
    WHERE id = p_target_user_id;

    -- Log the action
    INSERT INTO public.admin_audit_logs (admin_id, action, target_id, target_type, details)
    VALUES (
        p_admin_id, 
        CASE WHEN p_is_suspended THEN 'SUSPEND_USER' ELSE 'REACTIVATE_USER' END, 
        p_target_user_id::text, 
        'USER', 
        jsonb_build_object('target_user_id', p_target_user_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Changes user role (super admin only)
CREATE OR REPLACE FUNCTION public.admin_change_user_role(
    p_admin_id UUID,
    p_target_user_id UUID,
    p_role TEXT
)
RETURNS VOID AS $$
BEGIN
    IF NOT public.is_super_admin(p_admin_id) THEN
        RAISE EXCEPTION 'Access Denied: Admin privileges required';
    END IF;

    -- Validate role type
    IF p_role NOT IN ('user', 'super_admin') THEN
        RAISE EXCEPTION 'Invalid role type';
    END IF;

    -- Do not allow super admin to demote themselves
    IF p_admin_id = p_target_user_id AND p_role != 'super_admin' THEN
        RAISE EXCEPTION 'Access Denied: You cannot demote your own account';
    END IF;

    UPDATE public.profiles
    SET role = p_role
    WHERE id = p_target_user_id;

    -- Log the action
    INSERT INTO public.admin_audit_logs (admin_id, action, target_id, target_type, details)
    VALUES (
        p_admin_id, 
        'CHANGE_USER_ROLE', 
        p_target_user_id::text, 
        'USER', 
        jsonb_build_object('new_role', p_role)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Queries active sessions (super admin only)
CREATE OR REPLACE FUNCTION public.admin_get_sessions(p_admin_id UUID)
RETURNS TABLE (
    session_id UUID,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE,
    email TEXT,
    username TEXT,
    full_name TEXT
) AS $$
BEGIN
    IF NOT public.is_super_admin(p_admin_id) THEN
        RAISE EXCEPTION 'Access Denied: Admin privileges required';
    END IF;

    RETURN QUERY
    SELECT 
        s.id as session_id,
        s.user_id,
        s.created_at,
        u.email::text,
        p.username,
        p.full_name
    FROM auth.sessions s
    JOIN auth.users u ON s.user_id = u.id
    LEFT JOIN public.profiles p ON s.user_id = p.id
    ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- 6. Collects platform usage and DAU analytics (super admin only)
CREATE OR REPLACE FUNCTION public.admin_get_analytics(p_admin_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_dau INT;
    v_total_users INT;
    v_ai_usage_30d INT;
    v_lesson_completions_30d INT;
    v_feature_usage_30d JSONB;
    v_subscription_overview JSONB;
BEGIN
    IF NOT public.is_super_admin(p_admin_id) THEN
        RAISE EXCEPTION 'Access Denied: Admin privileges required';
    END IF;

    -- DAU (active today)
    SELECT COUNT(*) INTO v_dau FROM public.profiles WHERE last_active_date >= CURRENT_DATE;
    SELECT COUNT(*) INTO v_total_users FROM public.profiles;

    -- AI Usage 30d
    SELECT COUNT(*) INTO v_ai_usage_30d FROM public.ai_analysis_history WHERE created_at >= NOW() - INTERVAL '30 days';

    -- Learn Hub completions 30d
    SELECT COUNT(*) INTO v_lesson_completions_30d FROM public.user_lessons WHERE completed_at >= NOW() - INTERVAL '30 days';

    -- Feature usage aggregation 30d
    SELECT jsonb_object_agg(feature, count) INTO v_feature_usage_30d
    FROM (
        SELECT feature, COUNT(*) as count 
        FROM public.credit_transactions 
        WHERE date >= NOW() - INTERVAL '30 days'
        GROUP BY feature
    ) t;

    -- Subscription status overview
    SELECT jsonb_object_agg(status, count) INTO v_subscription_overview
    FROM (
        SELECT COALESCE(subscription_status, 'free') as status, COUNT(*) as count
        FROM public.profiles
        GROUP BY COALESCE(subscription_status, 'free')
    ) s;

    RETURN jsonb_build_object(
        'dau', v_dau,
        'total_users', v_total_users,
        'ai_usage_30d', v_ai_usage_30d,
        'lesson_completions_30d', v_lesson_completions_30d,
        'feature_usage_30d', COALESCE(v_feature_usage_30d, '{}'::jsonb),
        'subscription_overview', COALESCE(v_subscription_overview, '{}'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Fetches administrative audit logs (super admin only)
CREATE OR REPLACE FUNCTION public.admin_get_audit_logs(p_admin_id UUID)
RETURNS TABLE (
    id UUID,
    admin_email TEXT,
    action TEXT,
    target_id TEXT,
    target_type TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    IF NOT public.is_super_admin(p_admin_id) THEN
        RAISE EXCEPTION 'Access Denied: Admin privileges required';
    END IF;

    RETURN QUERY
    SELECT 
        l.id,
        u.email::text as admin_email,
        l.action,
        l.target_id,
        l.target_type,
        l.details,
        l.created_at
    FROM public.admin_audit_logs l
    LEFT JOIN auth.users u ON l.admin_id = u.id
    ORDER BY l.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;
