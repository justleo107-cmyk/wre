-- Add last_login_reward_at column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_reward_at TIMESTAMP WITH TIME ZONE;

-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INT CHECK (rating >= 1 AND rating <= 5) NOT NULL,
    testimonial TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on reviews
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Policies for reviews
CREATE POLICY "Allow public read approved reviews" ON public.reviews 
    FOR SELECT USING (is_approved = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Allow authenticated users to insert reviews" ON public.reviews 
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to manage reviews" ON public.reviews 
    FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
