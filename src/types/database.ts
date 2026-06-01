export interface Profile {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  xp: number
  streak_count: number
  last_active_date: string | null
  current_rank: string
  created_at: string
  level?: number
  rank?: string
  current_streak?: number
  longest_streak?: number
  subscription_status?: string
  ai_uses_remaining?: number
  arv_credits?: number
  mao_credits?: number
}

export interface Deal {
  id: string
  owner_id: string
  address: string
  city: string
  state: string
  zip: string
  asking_price: number
  estimated_arv: number | null
  estimated_rehab: number | null
  property_notes: string | null
  photo_urls: string[]
  status: 'active' | 'under_contract' | 'closed' | 'dead'
  created_at: string
  profiles?: Profile // joined profile
  property_name?: string
  deal_value?: number
  estimated_mao?: number | null
  is_archived?: boolean
}

export interface CreditLedger {
  id: string
  user_id: string
  transaction_type: 'allotment' | 'deduction'
  credits_changed: number
  description: string | null
  created_at: string
  profiles?: Profile // joined profile
}

export interface Slide {
  title: string
  text: string
}

export interface Quiz {
  question: string
  options: string[]
  answer: number
}

export interface LessonContent {
  slides: Slide[]
  quiz: Quiz
}

export interface Lesson {
  id: string
  title: string
  category: string
  xp_reward: number
  content: LessonContent
  order_index: number
}

export interface UserLesson {
  id: string
  user_id: string
  lesson_id: string
  completed_at: string
  score: number
}

export interface Badge {
  id: string
  name: string
  icon: string
  description: string
  xp_required: number
}

export interface UserBadge {
  user_id: string
  badge_id: string
  earned_at: string
  badges?: Badge // joined badge
}

export interface Subscription {
  id: string
  user_id: string
  status: 'active' | 'trialing' | 'canceled' | 'incomplete' | 'past_due'
  plan_type: 'monthly' | 'six_month' | 'yearly'
  current_period_end: string
  created_at: string
}

export interface Message {
  id: string
  sender_id: string
  recipient_id: string
  deal_id: string | null
  content: string
  is_read: boolean
  created_at: string
  profiles?: Profile // joined profile
}
