-- Migration to consolidate duplicate credit tables and profile columns

-- 1. Sync legacy credit_ledger transactions to credit_transactions
INSERT INTO public.credit_transactions (user_id, date, feature, credits_used, credits_added, balance)
SELECT 
  cl.user_id,
  cl.created_at,
  COALESCE(cl.description, 'Legacy Credit Transaction') AS feature,
  CASE WHEN cl.transaction_type = 'deduction' THEN ABS(cl.credits_changed) ELSE 0 END AS credits_used,
  CASE WHEN cl.transaction_type = 'allotment' THEN cl.credits_changed ELSE 0 END AS credits_added,
  COALESCE((SELECT COALESCE(arv_credits, 0) + COALESCE(mao_credits, 0) + COALESCE(ai_uses_remaining, 0) FROM public.profiles WHERE id = cl.user_id), 0) AS balance
FROM public.credit_ledger cl
LEFT JOIN public.credit_transactions ct ON ct.user_id = cl.user_id AND ct.date = cl.created_at
WHERE ct.id IS NULL;

-- 2. Drop legacy table and helper function
DROP TABLE IF EXISTS public.credit_ledger CASCADE;
DROP FUNCTION IF EXISTS public.deduct_credits(integer, text);

-- 3. Drop redundant columns in profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS streak_count CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS current_rank CASCADE;

-- 4. Update the new user creation handler function to match clean columns
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
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
    ai_uses_remaining
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', SPLIT_PART(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'full_name', SPLIT_PART(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    0,
    1,
    'Rookie Wholesaler',
    0,
    0,
    50,
    50,
    10
  );
  
  -- Log onboarding sign-up bonus in credit_transactions
  INSERT INTO public.credit_transactions (user_id, feature, credits_used, credits_added, balance)
  VALUES (new.id, 'Onboarding Sign-up Bonus (+50 ARV, +50 MAO, +10 AI)', 0, 110, 110);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
