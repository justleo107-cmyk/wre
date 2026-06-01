-- WRE SaaS Deal Intelligence Schema Upgrade

-- 1. Create deal_intelligence_files table
CREATE TABLE IF NOT EXISTS public.deal_intelligence_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    property_name TEXT NOT NULL,
    property_address TEXT NOT NULL,
    seller_name TEXT,
    seller_phone TEXT,
    seller_email TEXT,
    status TEXT NOT NULL DEFAULT 'Lead',
    arv_history_id UUID REFERENCES public.arv_history(id) ON DELETE SET NULL,
    mao_history_id UUID REFERENCES public.mao_history(id) ON DELETE SET NULL,
    bedrooms INTEGER,
    bathrooms NUMERIC,
    sqft INTEGER,
    year_built INTEGER,
    lot_size TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for deal_intelligence_files
ALTER TABLE public.deal_intelligence_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own deal intelligence files"
    ON public.deal_intelligence_files FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 2. Create deal_notes table
CREATE TABLE IF NOT EXISTS public.deal_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID REFERENCES public.deal_intelligence_files(id) ON DELETE CASCADE NOT NULL,
    note_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for deal_notes
ALTER TABLE public.deal_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage notes for their own deals"
    ON public.deal_notes FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.deal_intelligence_files 
        WHERE id = deal_notes.deal_id AND user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.deal_intelligence_files 
        WHERE id = deal_notes.deal_id AND user_id = auth.uid()
    ));

-- 3. Create deal_call_logs table
CREATE TABLE IF NOT EXISTS public.deal_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID REFERENCES public.deal_intelligence_files(id) ON DELETE CASCADE NOT NULL,
    call_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    duration TEXT,
    summary TEXT,
    outcome TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for deal_call_logs
ALTER TABLE public.deal_call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage call logs for their own deals"
    ON public.deal_call_logs FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.deal_intelligence_files 
        WHERE id = deal_call_logs.deal_id AND user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.deal_intelligence_files 
        WHERE id = deal_call_logs.deal_id AND user_id = auth.uid()
    ));

-- 4. Create deal_files table
CREATE TABLE IF NOT EXISTS public.deal_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID REFERENCES public.deal_intelligence_files(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for deal_files
ALTER TABLE public.deal_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage files for their own deals"
    ON public.deal_files FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.deal_intelligence_files 
        WHERE id = deal_files.deal_id AND user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.deal_intelligence_files 
        WHERE id = deal_files.deal_id AND user_id = auth.uid()
    ));

-- 5. Create deal_intelligence_analyses table
CREATE TABLE IF NOT EXISTS public.deal_intelligence_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID REFERENCES public.deal_intelligence_files(id) ON DELETE CASCADE NOT NULL,
    deal_score INTEGER NOT NULL,
    motivation_score INTEGER NOT NULL,
    risk_score INTEGER NOT NULL,
    recommended_offer_range TEXT,
    negotiation_suggestions JSONB,
    potential_red_flags JSONB,
    recommended_next_action TEXT,
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for deal_intelligence_analyses
ALTER TABLE public.deal_intelligence_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage analyses for their own deals"
    ON public.deal_intelligence_analyses FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.deal_intelligence_files 
        WHERE id = deal_intelligence_analyses.deal_id AND user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.deal_intelligence_files 
        WHERE id = deal_intelligence_analyses.deal_id AND user_id = auth.uid()
    ));

-- 6. Create deal_activity_timeline table
CREATE TABLE IF NOT EXISTS public.deal_activity_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID REFERENCES public.deal_intelligence_files(id) ON DELETE CASCADE NOT NULL,
    event_type TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for deal_activity_timeline
ALTER TABLE public.deal_activity_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage timeline for their own deals"
    ON public.deal_activity_timeline FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.deal_intelligence_files 
        WHERE id = deal_activity_timeline.deal_id AND user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.deal_intelligence_files 
        WHERE id = deal_activity_timeline.deal_id AND user_id = auth.uid()
    ));

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_deal_files_user ON public.deal_intelligence_files(user_id, status);
CREATE INDEX IF NOT EXISTS idx_deal_notes_deal ON public.deal_notes(deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deal_calls_deal ON public.deal_call_logs(deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deal_analyses_deal ON public.deal_intelligence_analyses(deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deal_timeline_deal ON public.deal_activity_timeline(deal_id, created_at DESC);
