-- Vanta Gamification & Credits Schema Upgrades

-- 1. Alter profiles table to add gamification, streaks, and credits columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rank TEXT DEFAULT 'Rookie Wholesaler' NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free' NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_uses_remaining INTEGER DEFAULT 10 NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS arv_credits INTEGER DEFAULT 50 NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mao_credits INTEGER DEFAULT 50 NOT NULL;

-- Sync existing user columns if they have values
UPDATE public.profiles SET 
    current_streak = streak_count, 
    longest_streak = streak_count, 
    rank = current_rank;

-- 2. Alter deals table to add details for cards and archiving
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS property_name TEXT;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS deal_value NUMERIC;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS estimated_mao NUMERIC;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE NOT NULL;

-- Initialize existing deals
UPDATE public.deals SET 
    property_name = COALESCE(property_name, address), 
    deal_value = COALESCE(deal_value, asking_price);

UPDATE public.deals SET 
    estimated_mao = COALESCE(estimated_mao, ROUND((estimated_arv * 0.70) - estimated_rehab - 10000)) 
WHERE estimated_arv IS NOT NULL AND estimated_rehab IS NOT NULL;

-- 3. Create credit_transactions table
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    feature TEXT NOT NULL,
    credits_used INTEGER DEFAULT 0 NOT NULL,
    credits_added INTEGER DEFAULT 0 NOT NULL,
    balance INTEGER NOT NULL
);

-- Enable RLS for credit_transactions
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for credit_transactions
CREATE POLICY "Users can view their own credit transactions" 
    ON public.credit_transactions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit transactions" 
    ON public.credit_transactions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 4. Create xp_logs table
CREATE TABLE IF NOT EXISTS public.xp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    action TEXT NOT NULL,
    xp_earned INTEGER NOT NULL
);

-- Enable RLS for xp_logs
ALTER TABLE public.xp_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for xp_logs
CREATE POLICY "Users can view their own xp logs" 
    ON public.xp_logs FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own xp logs" 
    ON public.xp_logs FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 5. Create streak_logs table
CREATE TABLE IF NOT EXISTS public.streak_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    activity_date DATE NOT NULL,
    activity_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, activity_date)
);

-- Enable RLS for streak_logs
ALTER TABLE public.streak_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for streak_logs
CREATE POLICY "Users can view their own streak logs" 
    ON public.streak_logs FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streak logs" 
    ON public.streak_logs FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- 6. Seed and Update Badges
INSERT INTO public.badges (id, name, icon, description, xp_required) VALUES
('first-step', 'First Step', '🎓', 'Completed your first wholesaling lesson', 100),
('deal-finder', 'Deal Finder', '🔍', 'Posted your first property deal listing', 250),
('math-whiz', 'Math Whiz', '🔢', 'Calculated your first ARV or MAO valuation', 150),
('closer-club', 'Closer Club', '🤝', 'Marked a deal as closed in CRM pipeline', 1000),
('hot-streak', 'Hot Streak', '🔥', 'Maintained a 7-day login streak', 500),
('jv-connector', 'JV Connector', '💬', 'Started a JV Match Chat thread', 300),
('ai-analyst', 'AI Analyst', '🔮', 'Performed your first AI Deal Analysis', 500),
('consistency-king', 'Consistency King', '👑', 'Maintained a 7-day streak', 1000),
('deal-machine', 'Deal Machine', '⚙️', 'Sourced and posted 10 wholesale deals', 2000)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name, 
    icon = EXCLUDED.icon, 
    description = EXCLUDED.description, 
    xp_required = EXCLUDED.xp_required;

-- 7. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_date ON public.credit_transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_xp_logs_user_date ON public.xp_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_streak_logs_user_date ON public.streak_logs(user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_deals_owner_archived ON public.deals(owner_id, is_archived);
