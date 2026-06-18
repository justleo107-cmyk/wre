-- Migration to grant all access bypasses to the testing user: bharath2552v@gmail.com (id: fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5)

-- 1. Ensure testing user profile is active and has unlimited credits
UPDATE public.profiles
SET 
  subscription_status = 'active',
  arv_credits = 999999,
  mao_credits = 999999,
  ai_uses_remaining = 999999
WHERE id = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5';

-- 2. Ensure testing user has an active subscription record
INSERT INTO public.subscriptions (id, user_id, status, plan_type, current_period_end)
VALUES ('sub_testing_bharath', 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5', 'active', 'yearly', '2030-01-01 00:00:00+00')
ON CONFLICT (user_id) DO UPDATE SET
  status = 'active',
  current_period_end = '2030-01-01 00:00:00+00';

-- 3. Update the handle_new_user trigger function to automatically grant testing users premium access and unlimited credits upon sign up / recreation
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
    ai_uses_remaining,
    subscription_status
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
    CASE WHEN new.email = 'bharath2552v@gmail.com' THEN 999999 ELSE 50 END,
    CASE WHEN new.email = 'bharath2552v@gmail.com' THEN 999999 ELSE 50 END,
    CASE WHEN new.email = 'bharath2552v@gmail.com' THEN 999999 ELSE 10 END,
    CASE WHEN new.email = 'bharath2552v@gmail.com' THEN 'active' ELSE 'free' END
  );
  
  -- Log onboarding sign-up bonus in credit_transactions
  INSERT INTO public.credit_transactions (user_id, feature, credits_used, credits_added, balance)
  VALUES (
    new.id, 
    'Onboarding Sign-up Bonus', 
    0, 
    CASE WHEN new.email = 'bharath2552v@gmail.com' THEN 2999997 ELSE 110 END,
    CASE WHEN new.email = 'bharath2552v@gmail.com' THEN 2999997 ELSE 110 END
  );
  
  -- Automatically insert an active subscription for the testing user
  IF new.email = 'bharath2552v@gmail.com' THEN
    INSERT INTO public.subscriptions (id, user_id, status, plan_type, current_period_end)
    VALUES ('sub_testing_bharath', new.id, 'active', 'yearly', '2030-01-01 00:00:00+00')
    ON CONFLICT (user_id) DO UPDATE SET status = 'active';
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create RLS bypass policies for the testing user on all tables
-- This ensures the testing user can manage all deals, lessons, reviews, and other records without restriction in the admin console.

DO $$
BEGIN
  -- profiles
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'admin_all_profiles') THEN
    CREATE POLICY "admin_all_profiles" ON public.profiles FOR ALL TO public USING (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5') WITH CHECK (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5');
  END IF;

  -- deals
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deals' AND policyname = 'admin_all_deals') THEN
    CREATE POLICY "admin_all_deals" ON public.deals FOR ALL TO public USING (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5') WITH CHECK (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5');
  END IF;

  -- lessons
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lessons' AND policyname = 'admin_all_lessons') THEN
    CREATE POLICY "admin_all_lessons" ON public.lessons FOR ALL TO public USING (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5') WITH CHECK (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5');
  END IF;

  -- user_lessons
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_lessons' AND policyname = 'admin_all_user_lessons') THEN
    CREATE POLICY "admin_all_user_lessons" ON public.user_lessons FOR ALL TO public USING (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5') WITH CHECK (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5');
  END IF;

  -- badges
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'badges' AND policyname = 'admin_all_badges') THEN
    CREATE POLICY "admin_all_badges" ON public.badges FOR ALL TO public USING (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5') WITH CHECK (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5');
  END IF;

  -- user_badges
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_badges' AND policyname = 'admin_all_user_badges') THEN
    CREATE POLICY "admin_all_user_badges" ON public.user_badges FOR ALL TO public USING (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5') WITH CHECK (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5');
  END IF;

  -- subscriptions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'subscriptions' AND policyname = 'admin_all_subscriptions') THEN
    CREATE POLICY "admin_all_subscriptions" ON public.subscriptions FOR ALL TO public USING (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5') WITH CHECK (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5');
  END IF;

  -- messages
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'admin_all_messages') THEN
    CREATE POLICY "admin_all_messages" ON public.messages FOR ALL TO public USING (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5') WITH CHECK (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5');
  END IF;

  -- credit_transactions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'credit_transactions' AND policyname = 'admin_all_credit_transactions') THEN
    CREATE POLICY "admin_all_credit_transactions" ON public.credit_transactions FOR ALL TO public USING (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5') WITH CHECK (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5');
  END IF;

  -- streak_logs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'streak_logs' AND policyname = 'admin_all_streak_logs') THEN
    CREATE POLICY "admin_all_streak_logs" ON public.streak_logs FOR ALL TO public USING (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5') WITH CHECK (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5');
  END IF;

  -- xp_logs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'xp_logs' AND policyname = 'admin_all_xp_logs') THEN
    CREATE POLICY "admin_all_xp_logs" ON public.xp_logs FOR ALL TO public USING (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5') WITH CHECK (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5');
  END IF;

  -- arv_history
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'arv_history' AND policyname = 'admin_all_arv_history') THEN
    CREATE POLICY "admin_all_arv_history" ON public.arv_history FOR ALL TO public USING (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5') WITH CHECK (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5');
  END IF;

  -- mao_history
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'mao_history' AND policyname = 'admin_all_mao_history') THEN
    CREATE POLICY "admin_all_mao_history" ON public.mao_history FOR ALL TO public USING (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5') WITH CHECK (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5');
  END IF;

  -- ai_analysis_history
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ai_analysis_history' AND policyname = 'admin_all_ai_analysis_history') THEN
    CREATE POLICY "admin_all_ai_analysis_history" ON public.ai_analysis_history FOR ALL TO public USING (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5') WITH CHECK (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5');
  END IF;

  -- deal_intelligence_files
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deal_intelligence_files' AND policyname = 'admin_all_deal_intelligence_files') THEN
    CREATE POLICY "admin_all_deal_intelligence_files" ON public.deal_intelligence_files FOR ALL TO public USING (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5') WITH CHECK (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5');
  END IF;

  -- deal_notes
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deal_notes' AND policyname = 'admin_all_deal_notes') THEN
    CREATE POLICY "admin_all_deal_notes" ON public.deal_notes FOR ALL TO public USING (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5') WITH CHECK (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5');
  END IF;

  -- deal_call_logs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deal_call_logs' AND policyname = 'admin_all_deal_call_logs') THEN
    CREATE POLICY "admin_all_deal_call_logs" ON public.deal_call_logs FOR ALL TO public USING (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5') WITH CHECK (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5');
  END IF;

  -- deal_files
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deal_files' AND policyname = 'admin_all_deal_files') THEN
    CREATE POLICY "admin_all_deal_files" ON public.deal_files FOR ALL TO public USING (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5') WITH CHECK (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5');
  END IF;

  -- deal_intelligence_analyses
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deal_intelligence_analyses' AND policyname = 'admin_all_deal_intelligence_analyses') THEN
    CREATE POLICY "admin_all_deal_intelligence_analyses" ON public.deal_intelligence_analyses FOR ALL TO public USING (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5') WITH CHECK (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5');
  END IF;

  -- deal_activity_timeline
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'deal_activity_timeline' AND policyname = 'admin_all_deal_activity_timeline') THEN
    CREATE POLICY "admin_all_deal_activity_timeline" ON public.deal_activity_timeline FOR ALL TO public USING (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5') WITH CHECK (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5');
  END IF;

  -- reviews
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'admin_all_reviews') THEN
    CREATE POLICY "admin_all_reviews" ON public.reviews FOR ALL TO public USING (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5') WITH CHECK (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5');
  END IF;

  -- voice_notes
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'voice_notes' AND policyname = 'admin_all_voice_notes') THEN
    CREATE POLICY "admin_all_voice_notes" ON public.voice_notes FOR ALL TO public USING (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5') WITH CHECK (auth.uid() = 'fd4a5839-3ab9-41bb-b7ea-2d3ffd1fd8d5');
  END IF;
END $$;
