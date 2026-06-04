-- Vanta Calculator History Schema Upgrade

-- 1. Create arv_history table
CREATE TABLE IF NOT EXISTS public.arv_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    property_name TEXT NOT NULL,
    comp_1 INTEGER NOT NULL,
    comp_2 INTEGER NOT NULL,
    comp_3 INTEGER NOT NULL,
    estimated_repairs INTEGER NOT NULL,
    calculated_arv INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, property_name)
);

-- Enable RLS for arv_history
ALTER TABLE public.arv_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own arv history" 
    ON public.arv_history FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 2. Create mao_history table
CREATE TABLE IF NOT EXISTS public.mao_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    property_name TEXT NOT NULL,
    arv INTEGER NOT NULL,
    estimated_repairs INTEGER NOT NULL,
    assignment_fee INTEGER NOT NULL,
    calculated_mao INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for mao_history
ALTER TABLE public.mao_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own mao history" 
    ON public.mao_history FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. Create ai_analysis_history table
CREATE TABLE IF NOT EXISTS public.ai_analysis_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    property_name TEXT NOT NULL,
    analysis_score INTEGER NOT NULL,
    analysis_summary TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for ai_analysis_history
ALTER TABLE public.ai_analysis_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own ai analysis history" 
    ON public.ai_analysis_history FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_arv_history_user_date ON public.arv_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mao_history_user_date ON public.mao_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_history_user_date ON public.ai_analysis_history(user_id, created_at DESC);
