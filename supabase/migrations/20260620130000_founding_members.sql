-- Create founding_members table
CREATE TABLE IF NOT EXISTS public.founding_members (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed with existing active premium subscriptions
INSERT INTO public.founding_members (user_id, claimed_at)
SELECT user_id, created_at
FROM public.subscriptions
WHERE status = 'active' AND plan_type IN ('monthly', 'six_month', 'yearly')
ON CONFLICT (user_id) DO NOTHING;

-- Trigger function to track new founding members on successful subscription
CREATE OR REPLACE FUNCTION public.track_founding_member()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'active' AND NEW.plan_type IN ('monthly', 'six_month', 'yearly') THEN
        INSERT INTO public.founding_members (user_id)
        VALUES (NEW.user_id)
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger on subscriptions table
DROP TRIGGER IF EXISTS on_subscription_active ON public.subscriptions;
CREATE TRIGGER on_subscription_active
    AFTER INSERT OR UPDATE OF status, plan_type ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.track_founding_member();

-- Enable RLS
ALTER TABLE public.founding_members ENABLE ROW LEVEL SECURITY;

-- Add RLS select policy
DROP POLICY IF EXISTS "Founding members are readable by everyone" ON public.founding_members;
CREATE POLICY "Founding members are readable by everyone" ON public.founding_members
    FOR SELECT USING (true);
