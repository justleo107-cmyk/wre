-- SQL Migration: Extend Admin User List Function
-- Drops public.admin_list_users and recreates it to return full user profile telemetry fields.

DROP FUNCTION IF EXISTS public.admin_list_users(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.admin_list_users(p_admin_id UUID, p_search TEXT DEFAULT '')
RETURNS TABLE (
    id UUID,
    username TEXT,
    full_name TEXT,
    role TEXT,
    subscription_status TEXT,
    is_suspended BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    xp INTEGER,
    ai_uses_remaining INTEGER,
    arv_credits INTEGER,
    mao_credits INTEGER,
    current_streak INTEGER,
    longest_streak INTEGER
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
        p.created_at,
        COALESCE(p.xp, 0) as xp,
        COALESCE(p.ai_uses_remaining, 0) as ai_uses_remaining,
        COALESCE(p.arv_credits, 0) as arv_credits,
        COALESCE(p.mao_credits, 0) as mao_credits,
        COALESCE(p.current_streak, 0) as current_streak,
        COALESCE(p.longest_streak, 0) as longest_streak
    FROM public.profiles p
    WHERE p_search = '' 
       OR p.username ILIKE '%' || p_search || '%'
       OR p.full_name ILIKE '%' || p_search || '%'
       OR p.id::text = p_search
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
