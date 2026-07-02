-- SQL Migration: Update Role Validation Check
-- Modifies the admin_change_user_role function to accept 'premium' as a valid user role.

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
    IF p_role NOT IN ('user', 'premium', 'super_admin') THEN
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
