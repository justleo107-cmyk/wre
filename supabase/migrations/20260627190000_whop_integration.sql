-- SQL Migration: Whop Integration
-- Custom security definer function to sync Whop authenticated users with Supabase Auth users

CREATE OR REPLACE FUNCTION public.create_or_get_user_for_whop(
    p_email TEXT,
    p_username TEXT,
    p_full_name TEXT,
    p_whop_user_id TEXT,
    p_password TEXT
)
RETURNS UUID
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_hashed_password TEXT;
BEGIN
    -- Hash the password using bcrypt via pgcrypto
    v_hashed_password := crypt(p_password, gen_salt('bf', 10));

    -- Check if user already exists by email
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        -- Update password and raw user metadata
        UPDATE auth.users
        SET 
            encrypted_password = v_hashed_password,
            raw_user_meta_data = jsonb_build_object(
                'sub', v_user_id,
                'email', p_email,
                'username', p_username,
                'full_name', p_full_name,
                'email_verified', true,
                'phone_verified', false,
                'whop_user_id', p_whop_user_id
            ),
            updated_at = now()
        WHERE id = v_user_id;
    ELSE
        -- Create a new UUID for the user
        v_user_id := gen_random_uuid();
        
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            is_sso_user,
            is_anonymous
        )
        VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_user_id,
            'authenticated',
            'authenticated',
            p_email,
            v_hashed_password,
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object(
                'sub', v_user_id,
                'email', p_email,
                'username', p_username,
                'full_name', p_full_name,
                'email_verified', true,
                'phone_verified', false,
                'whop_user_id', p_whop_user_id
            ),
            now(),
            now(),
            false,
            false
        );
    END IF;

    -- Ensure matching record in auth.identities exists
    IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_user_id) THEN
        INSERT INTO auth.identities (
            id,
            provider_id,
            user_id,
            identity_data,
            provider,
            email,
            created_at,
            updated_at
        )
        VALUES (
            gen_random_uuid(),
            v_user_id::text,
            v_user_id,
            jsonb_build_object(
                'sub', v_user_id,
                'email', p_email,
                'email_verified', true
            ),
            'email',
            p_email,
            now(),
            now()
        );
    END IF;

    -- Upsert the profile record just in case, or update it
    INSERT INTO public.profiles (
        id,
        username,
        full_name,
        avatar_url,
        xp,
        level,
        rank,
        current_streak,
        longest_streak,
        arv_credits,
        mao_credits,
        ai_uses_remaining,
        subscription_status
    )
    VALUES (
        v_user_id,
        p_username,
        p_full_name,
        NULL,
        0,
        1,
        'Rookie Wholesaler',
        0,
        0,
        50,
        50,
        10,
        'free'
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        username = p_username,
        full_name = p_full_name;

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;
