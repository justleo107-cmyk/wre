-- Create Tables

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    xp INTEGER DEFAULT 0 NOT NULL,
    streak_count INTEGER DEFAULT 0 NOT NULL,
    last_active_date DATE,
    current_rank TEXT DEFAULT 'Rookie Wholesaler' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Deals Table
CREATE TABLE IF NOT EXISTS public.deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip TEXT NOT NULL,
    asking_price NUMERIC NOT NULL,
    estimated_arv NUMERIC,
    estimated_rehab NUMERIC,
    property_notes TEXT,
    photo_urls TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'under_contract', 'closed', 'dead')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Credit Ledger Table
CREATE TABLE IF NOT EXISTS public.credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('allotment', 'deduction')),
    credits_changed INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Lessons Table
CREATE TABLE IF NOT EXISTS public.lessons (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    xp_reward INTEGER DEFAULT 100 NOT NULL,
    content JSONB NOT NULL,
    order_index INTEGER NOT NULL
);

-- 5. User Lessons (Completed) Table
CREATE TABLE IF NOT EXISTS public.user_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
    lesson_id TEXT REFERENCES public.lessons ON DELETE CASCADE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    score INTEGER DEFAULT 100 NOT NULL,
    UNIQUE (user_id, lesson_id)
);

-- 6. Badges Table
CREATE TABLE IF NOT EXISTS public.badges (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    description TEXT NOT NULL,
    xp_required INTEGER DEFAULT 0 NOT NULL
);

-- 7. User Badges Table
CREATE TABLE IF NOT EXISTS public.user_badges (
    user_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
    badge_id TEXT REFERENCES public.badges ON DELETE CASCADE NOT NULL,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, badge_id)
);

-- 8. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'canceled', 'incomplete', 'past_due')),
    plan_type TEXT NOT NULL CHECK (plan_type IN ('monthly', 'six_month', 'yearly')),
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
    recipient_id UUID REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
    deal_id UUID REFERENCES public.deals ON DELETE SET NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row-Level Security (RLS) policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 1. Profiles policies
CREATE POLICY "Profiles are readable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can edit their own profiles" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Deals policies
CREATE POLICY "Deals are readable by everyone" ON public.deals FOR SELECT USING (true);
CREATE POLICY "Users can create deals" ON public.deals FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own deals" ON public.deals FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own deals" ON public.deals FOR DELETE USING (auth.uid() = owner_id);

-- 3. Credit Ledger policies
CREATE POLICY "Users can read their own credit ledger" ON public.credit_ledger FOR SELECT USING (auth.uid() = user_id);

-- 4. Lessons policies
CREATE POLICY "Lessons are readable by everyone" ON public.lessons FOR SELECT USING (true);

-- 5. User Lessons policies
CREATE POLICY "Users can read their own completed lessons" ON public.user_lessons FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own completed lessons" ON public.user_lessons FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Badges policies
CREATE POLICY "Badges are readable by everyone" ON public.badges FOR SELECT USING (true);

-- 7. User Badges policies
CREATE POLICY "User badges are readable by everyone" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "Users can insert their own earned badges" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 8. Subscriptions policies
CREATE POLICY "Users can view their own subscription status" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- 9. Messages policies
CREATE POLICY "Users can view messages they sent or received" ON public.messages FOR SELECT 
USING (
  (auth.uid() = sender_id OR auth.uid() = recipient_id) AND
  (
    EXISTS (
      SELECT 1 FROM public.subscriptions 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  )
);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.subscriptions 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Triggers for auth.users -> public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url, xp, streak_count, current_rank)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', SPLIT_PART(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'full_name', SPLIT_PART(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    0,
    0,
    'Rookie Wholesaler'
  );
  
  -- Give initial onboarding credits (50 credits, enough for 25 calculations)
  INSERT INTO public.credit_ledger (user_id, transaction_type, credits_changed, description)
  VALUES (new.id, 'allotment', 50, 'Onboarding Sign-up Bonus');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- RPC to safely deduct credits inside database transaction to avoid race conditions
CREATE OR REPLACE FUNCTION public.deduct_credits(amount_to_deduct integer, transaction_desc text)
RETURNS boolean AS $$
DECLARE
  current_balance integer;
BEGIN
  SELECT COALESCE(SUM(credits_changed), 0) INTO current_balance
  FROM public.credit_ledger
  WHERE user_id = auth.uid();
  
  IF current_balance >= amount_to_deduct THEN
    INSERT INTO public.credit_ledger (user_id, transaction_type, credits_changed, description)
    VALUES (auth.uid(), 'deduction', -amount_to_deduct, transaction_desc);
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Insert Seed Data for Badges
INSERT INTO public.badges (id, name, icon, description, xp_required) VALUES
('first-step', 'First Step', '🎓', 'Completed your first wholesaling lesson', 100),
('deal-finder', 'Deal Finder', '🔍', 'Posted your first property deal listing', 250),
('math-whiz', 'Math Whiz', '🔢', 'Calculated your first ARV or MAO valuation', 150),
('closer-club', 'Closer Club', '🤝', 'Marked a deal as closed in CRM pipeline', 1000),
('hot-streak', 'Hot Streak', '🔥', 'Maintained a 7-day login streak', 500)
ON CONFLICT (id) DO NOTHING;


-- Insert Seed Data for Lessons
INSERT INTO public.lessons (id, title, category, xp_reward, content, order_index) VALUES
('basics-1', 'What is Real Estate Wholesaling?', 'basics', 100, '{
  "slides": [
    {"title": "The Core Concept", "text": "Real Estate Wholesaling is the process of finding discounted properties, putting them under contract, and assigning that contract to a cash buyer for an assignment fee. You do not buy the home yourself!"},
    {"title": "The Players", "text": "Wholesaling involves three main parties: 1. The Motivated Seller (needs to sell fast), 2. The Wholesaler (you, finding and securing the deal), and 3. The Cash Buyer (investor who renovates or rents)."},
    {"title": "Assignment of Contract", "text": "Instead of buying, you sign an Purchase Agreement with the seller containing an Assignability Clause. You then sell this assignment right to the buyer using an Assignment Agreement."}
  ],
  "quiz": {
    "question": "What is the primary role of a real estate wholesaler?",
    "options": [
      "Buy properties, renovate them, and sell for retail price",
      "Find deeply discounted properties, put them under contract, and assign the contract to cash buyers",
      "Act as a licensed real estate agent representing buyers and sellers in standard listings"
    ],
    "answer": 1
  }
}', 1),
('basics-2', 'The Wholesaling Deal Flow', 'basics', 100, '{
  "slides": [
    {"title": "Phase 1: Lead Gen", "text": "Finding motivated sellers through driving for dollars, cold calling, direct mail, or digital ads."},
    {"title": "Phase 2: Valuation & Offer", "text": "Calculating the property value (ARV), estimating repair costs, and presenting a Maximum Allowable Offer (MAO)."},
    {"title": "Phase 3: Marketing & Closing", "text": "Finding a cash buyer through networking, Facebook groups, or this platform, and closing at a title company."}
  ],
  "quiz": {
    "question": "Which phase of the wholesaling workflow involves finding a cash buyer and coordinating with a title company?",
    "options": [
      "Lead Generation",
      "Valuation & Offer Analysis",
      "Marketing & Closing"
    ],
    "answer": 2
  }
}', 2),
('arv-1', 'Understanding ARV (After Repair Value)', 'arv', 100, '{
  "slides": [
    {"title": "What is ARV?", "text": "After Repair Value (ARV) is the estimated market value of a property after it has been fully renovated to modern standards. It represents the top-of-market retail price."},
    {"title": "Finding Comparables (Comps)", "text": "To find ARV, look for properties that are: 1. Sold within the last 6 months, 2. Within a 0.5-mile radius, 3. Similar square footage, bed/bath count, and build year."},
    {"title": "Calculating ARV", "text": "ARV is usually the average of the top 3-4 recently sold fully-renovated comps in the immediate neighborhood."}
  ],
  "quiz": {
    "question": "What does ARV stand for in real estate wholesaling?",
    "options": [
      "Actual Realized Value",
      "After Repair Value",
      "Annual Rental Valuation"
    ],
    "answer": 1
  }
}', 3),
('mao-1', 'Mastering the MAO Formula', 'mao', 100, '{
  "slides": [
    {"title": "The Formula", "text": "MAO = (ARV * 70%) - Rehab Cost - Wholesale Fee. This is the industry-standard formula to ensure your cash buyer makes a profit and you get paid."},
    {"title": "Why 70%?", "text": "The 30% margin covers the cash buyer''s profit (usually 15-20%), holding costs, financing costs, and transaction fees (buying/selling)."},
    {"title": "Example", "text": "If ARV is $300k, Rehab is $40k, and you want a $10k fee: MAO = ($300k * 0.70) - $40k - $10k = $210k - $40k - $10k = $160k."}
  ],
  "quiz": {
    "question": "If ARV is $200,000, Rehab is $30,000, and your fee is $10,000, what is the MAO under the 70% rule?",
    "options": [
      "$100,000",
      "$130,000",
      "$140,000"
    ],
    "answer": 0
  }
}', 4)
ON CONFLICT (id) DO NOTHING;
