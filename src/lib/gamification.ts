import { SupabaseClient } from '@supabase/supabase-js'

export const RANKS = [
  { name: 'Rookie Wholesaler', minXp: 0, maxXp: 499, level: 1, reward: 'Starter Kit & Base Calculators' },
  { name: 'Deal Hunter', minXp: 500, maxXp: 1499, level: 2, reward: '+50 Credits Top Up' },
  { name: 'Acquisition Specialist', minXp: 1500, maxXp: 3999, level: 3, reward: '+100 Credits Top Up' },
  { name: 'JV Connector', minXp: 4000, maxXp: 9999, level: 4, reward: 'Premium Chat Badges & VIP Listings' },
  { name: 'Closer', minXp: 10000, maxXp: 24999, level: 5, reward: '+200 Credits & Custom Agreement Templates' },
  { name: 'Market Operator', minXp: 25000, maxXp: 49999, level: 6, reward: 'Unlimited Math Runs' },
  { name: 'Deal Architect', minXp: 50000, maxXp: 99999, level: 7, reward: 'Custom AI Analysis Prompts' },
  { name: 'Wholesaling Elite', minXp: 100000, maxXp: Infinity, level: 8, reward: 'Wholesaling Elite Badge' }
]

export interface RankInfo {
  currentRank: string
  currentLevel: number
  minXp: number
  maxXp: number
  nextRank: string
  nextRankXp: number
  progress: number
  reward: string
}

export const getRankAndLevel = (xp: number): RankInfo => {
  for (let i = 0; i < RANKS.length; i++) {
    const rank = RANKS[i]
    if (xp >= rank.minXp && xp <= rank.maxXp) {
      const nextRank = RANKS[i + 1] || null
      const progress = nextRank 
        ? ((xp - rank.minXp) / (nextRank.minXp - rank.minXp)) * 100
        : 100
      return {
        currentRank: rank.name,
        currentLevel: rank.level,
        minXp: rank.minXp,
        maxXp: rank.maxXp,
        nextRank: nextRank ? nextRank.name : 'Max Rank',
        nextRankXp: nextRank ? nextRank.minXp : rank.minXp,
        progress: Math.min(100, Math.max(0, progress)),
        reward: rank.reward
      }
    }
  }
  return {
    currentRank: RANKS[0].name,
    currentLevel: 1,
    minXp: 0,
    maxXp: 499,
    nextRank: RANKS[1].name,
    nextRankXp: 500,
    progress: 0,
    reward: RANKS[0].reward
  }
}

// 1. Award XP Helper
export async function awardXp(supabase: SupabaseClient, userId: string, xpAmount: number, actionName: string) {
  // Get current profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('xp')
    .eq('id', userId)
    .single()
  
  if (!profile) return null

  const newXp = (profile.xp || 0) + xpAmount
  const rankInfo = getRankAndLevel(newXp)

  // Log in xp_logs
  await supabase.from('xp_logs').insert({
    user_id: userId,
    action: actionName,
    xp_earned: xpAmount
  })

  // Update profile
  const { data: updatedProfile } = await supabase
    .from('profiles')
    .update({
      xp: newXp,
      level: rankInfo.currentLevel,
      rank: rankInfo.currentRank,
      current_rank: rankInfo.currentRank // Keep in sync
    })
    .eq('id', userId)
    .select()
    .single()

  return {
    newXp,
    rankInfo,
    updatedProfile
  }
}

// 2. Award Badge Helper
export async function awardBadge(supabase: SupabaseClient, userId: string, badgeId: string) {
  // Check if already earned
  const { data: existing } = await supabase
    .from('user_badges')
    .select('*')
    .eq('user_id', userId)
    .eq('badge_id', badgeId)
    .single()

  if (existing) return null

  // Earn badge
  await supabase.from('user_badges').insert({
    user_id: userId,
    badge_id: badgeId,
    earned_at: new Date().toISOString()
  })

  // Fetch badge info for details
  const { data: badge } = await supabase
    .from('badges')
    .select('*')
    .eq('id', badgeId)
    .single()

  if (!badge) return null

  // Award XP based on badge
  await awardXp(supabase, userId, badge.xp_required || 100, `Unlocked Badge: ${badge.name}`)

  return badge
}

// 3. Update Streak Helper
export async function updateStreak(supabase: SupabaseClient, userId: string, activityType: string) {
  const todayStr = new Date().toISOString().split('T')[0]

  // Insert into streak_logs
  const { error: insertErr } = await supabase.from('streak_logs').insert({
    user_id: userId,
    activity_date: todayStr,
    activity_type: activityType
  })

  // If insert failed due to unique constraint, they already logged activity today
  const isFirstActivityToday = !insertErr

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('current_streak, longest_streak, last_active_date, streak_count')
    .eq('id', userId)
    .single()

  if (!profile) return null

  let newCurrentStreak = profile.current_streak || 0
  const longestStreak = profile.longest_streak || 0

  if (isFirstActivityToday) {
    if (profile.last_active_date) {
      const lastActive = new Date(profile.last_active_date)
      const today = new Date(todayStr)
      
      // Calculate day difference
      const diffTime = Math.abs(today.getTime() - lastActive.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays === 1) {
        newCurrentStreak += 1
      } else if (diffDays > 1) {
        newCurrentStreak = 1
      }
    } else {
      newCurrentStreak = 1
    }

    const newLongestStreak = Math.max(longestStreak, newCurrentStreak)

    // Update profile
    await supabase
      .from('profiles')
      .update({
        current_streak: newCurrentStreak,
        longest_streak: newLongestStreak,
        streak_count: newCurrentStreak, // keep in sync
        last_active_date: todayStr
      })
      .eq('id', userId)

    // Award XP for Daily Login if activity is login
    if (activityType === 'login') {
      await awardXp(supabase, userId, 50, 'Daily Login')
    }

    // Check for streak badges
    if (newCurrentStreak >= 7) {
      await awardBadge(supabase, userId, 'hot-streak')
      await awardBadge(supabase, userId, 'consistency-king')
    }
  }

  return {
    isFirstActivityToday,
    currentStreak: newCurrentStreak
  }
}

// 4. Deduct Credits Helper
export async function deductCredits(
  supabase: SupabaseClient, 
  userId: string, 
  creditType: 'arv' | 'mao' | 'ai', 
  cost: number, 
  feature: string
) {
  // Fetch current profile credits
  const { data: profile } = await supabase
    .from('profiles')
    .select('arv_credits, mao_credits, ai_uses_remaining')
    .eq('id', userId)
    .single()

  if (!profile) return { success: false, error: 'Profile not found' }

  let updatedField = {}
  let newBalance = 0

  if (creditType === 'arv') {
    if ((profile.arv_credits || 0) < cost) {
      return { success: false, error: 'Insufficient ARV credits.' }
    }
    const nextArvCredits = (profile.arv_credits || 0) - cost
    updatedField = { arv_credits: nextArvCredits }
    newBalance = nextArvCredits + (profile.mao_credits || 0) + (profile.ai_uses_remaining || 0)
  } else if (creditType === 'mao') {
    if ((profile.mao_credits || 0) < cost) {
      return { success: false, error: 'Insufficient MAO credits.' }
    }
    const nextMaoCredits = (profile.mao_credits || 0) - cost
    updatedField = { mao_credits: nextMaoCredits }
    newBalance = (profile.arv_credits || 0) + nextMaoCredits + (profile.ai_uses_remaining || 0)
  } else if (creditType === 'ai') {
    if ((profile.ai_uses_remaining || 0) < cost) {
      return { success: false, error: 'Insufficient AI uses remaining.' }
    }
    const nextAiUses = (profile.ai_uses_remaining || 0) - cost
    updatedField = { ai_uses_remaining: nextAiUses }
    newBalance = (profile.arv_credits || 0) + (profile.mao_credits || 0) + nextAiUses
  }

  // Update profile
  await supabase
    .from('profiles')
    .update(updatedField)
    .eq('id', userId)

  // Insert credit transaction
  await supabase.from('credit_transactions').insert({
    user_id: userId,
    feature,
    credits_used: cost,
    credits_added: 0,
    balance: newBalance
  })

  // Deduct from the legacy ledger as well to maintain backward compatibility with any other components
  await supabase.rpc('deduct_credits', {
    amount_to_deduct: cost,
    transaction_desc: feature
  })

  // Award XP for calculator usage
  let xpReward = 50
  let xpAction = 'Calculation Run'
  if (creditType === 'arv') {
    xpAction = 'ARV Calculation'
  } else if (creditType === 'mao') {
    xpAction = 'MAO Calculation'
  } else if (creditType === 'ai') {
    xpAction = 'AI Analysis'
  }

  await awardXp(supabase, userId, xpReward, xpAction)

  // Check Math Whiz or AI Analyst badges
  if (creditType === 'arv' || creditType === 'mao') {
    await awardBadge(supabase, userId, 'math-whiz')
  } else if (creditType === 'ai') {
    await awardBadge(supabase, userId, 'ai-analyst')
  }

  // Update streak activity
  await updateStreak(supabase, userId, creditType)

  return { success: true }
}
