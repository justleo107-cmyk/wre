import { SupabaseClient } from '@supabase/supabase-js'

export const RANKS = [
  { name: 'Rookie Wholesaler', minXp: 0, maxXp: 499, level: 1, reward: 'Starter Kit & Base Calculators' },
  { name: 'Deal Hunter', minXp: 500, maxXp: 1999, level: 2, reward: '+50 Credits Top Up' },
  { name: 'Acquisition Specialist', minXp: 2000, maxXp: 5999, level: 3, reward: '+100 Credits Top Up' },
  { name: 'JV Connector', minXp: 6000, maxXp: 19999, level: 4, reward: 'Premium Chat Badges & VIP Listings' },
  { name: 'Closer', minXp: 20000, maxXp: 39999, level: 5, reward: '+200 Credits Top Up' },
  { name: 'Market Operator', minXp: 40000, maxXp: 199999, level: 6, reward: 'Unlimited Math Runs (30 Days)' },
  { name: 'Deal Architect', minXp: 200000, maxXp: 399999, level: 7, reward: '+200 AI Credits' },
  { name: 'Wholesaling Elite', minXp: 400000, maxXp: Infinity, level: 8, reward: 'Wholesaling Elite Badge' }
]

const LEVEL_REWARDS: Record<number, { 
  arv?: number
  mao?: number
  ai?: number
  badgeId?: string
  unlimitedMathDays?: number
  label: string
}> = {
  2: { arv: 25, mao: 25, label: 'Tier 2 Reward: +50 Credits Top Up (+25 ARV, +25 MAO)' },
  3: { arv: 50, mao: 50, label: 'Tier 3 Reward: +100 Credits Top Up (+50 ARV, +50 MAO)' },
  4: { badgeId: 'jv-connector-elite', label: 'Tier 4 Reward: JV Connector Elite Badge' },
  5: { arv: 100, mao: 100, label: 'Tier 5 Reward: +200 Credits Top Up (+100 ARV, +100 MAO)' },
  6: { unlimitedMathDays: 30, label: 'Tier 6 Reward: Unlimited Math Runs (30 Days)' },
  7: { ai: 200, label: 'Tier 7 Reward: +200 AI Credits Top Up' },
  8: { badgeId: 'wholesaling-elite', label: 'Tier 8 Reward: Wholesaling Elite Badge' }
}

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
    .select('xp, rank_rewards_claimed, arv_credits, mao_credits, ai_uses_remaining')
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

  // Prepare profile fields to update
  let updatedFields: any = {
    xp: newXp,
    level: rankInfo.currentLevel,
    rank: rankInfo.currentRank
  }

  // Claim and activate rewards if user ranked up
  const claimedRewards = profile.rank_rewards_claimed || {}
  let rewardsUpdated = false
  const newClaimed = { ...claimedRewards }

  // Check every level up to the current level
  for (let lvl = 2; lvl <= rankInfo.currentLevel; lvl++) {
    if (!newClaimed[lvl]) {
      newClaimed[lvl] = true
      rewardsUpdated = true

      const reward = LEVEL_REWARDS[lvl]
      if (reward) {
        if (reward.arv || reward.mao) {
          const curArv = (updatedFields.arv_credits !== undefined ? updatedFields.arv_credits : (profile.arv_credits || 0))
          const curMao = (updatedFields.mao_credits !== undefined ? updatedFields.mao_credits : (profile.mao_credits || 0))
          const addedArv = reward.arv || 0
          const addedMao = reward.mao || 0
          updatedFields.arv_credits = curArv + addedArv
          updatedFields.mao_credits = curMao + addedMao
          
          await supabase.from('credit_transactions').insert({
            user_id: userId,
            feature: reward.label,
            credits_used: 0,
            credits_added: addedArv + addedMao,
            balance: updatedFields.arv_credits + updatedFields.mao_credits + (profile.ai_uses_remaining || 0)
          })
        } else if (reward.ai) {
          const curAi = (updatedFields.ai_uses_remaining !== undefined ? updatedFields.ai_uses_remaining : (profile.ai_uses_remaining || 0))
          updatedFields.ai_uses_remaining = curAi + reward.ai
          
          await supabase.from('credit_transactions').insert({
            user_id: userId,
            feature: reward.label,
            credits_used: 0,
            credits_added: reward.ai,
            balance: (profile.arv_credits || 0) + (profile.mao_credits || 0) + updatedFields.ai_uses_remaining
          })
        } else if (reward.badgeId) {
          await awardBadge(supabase, userId, reward.badgeId)
        } else if (reward.unlimitedMathDays) {
          const unlimitedUntil = new Date()
          unlimitedUntil.setDate(unlimitedUntil.getDate() + reward.unlimitedMathDays)
          updatedFields.unlimited_math_until = unlimitedUntil.toISOString()
        }
      }
    }
  }

  if (rewardsUpdated) {
    updatedFields.rank_rewards_claimed = newClaimed
  }

  // Update profile
  const { data: updatedProfile } = await supabase
    .from('profiles')
    .update(updatedFields)
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
  if (badge.xp_required > 0) {
    await awardXp(supabase, userId, badge.xp_required, `Unlocked Badge: ${badge.name}`)
  }

  return badge
}

// 3. Update Streak Helper
export async function updateStreak(supabase: SupabaseClient, userId: string, activityType: string) {
  const todayStr = new Date().toISOString().split('T')[0]

  // Upsert into streak_logs
  await supabase.from('streak_logs').upsert({
    user_id: userId,
    activity_date: todayStr,
    activity_type: activityType
  }, {
    onConflict: 'user_id, activity_date, activity_type'
  })

  // Fetch all logged activities for today
  const { data: todayLogs } = await supabase
    .from('streak_logs')
    .select('activity_type')
    .eq('user_id', userId)
    .eq('activity_date', todayStr)

  const uniqueCategories = new Set(
    (todayLogs || []).map(l => {
      if (l.activity_type === 'arv' || l.activity_type === 'mao') return 'calculation'
      return l.activity_type
    })
  )
  const completedCount = uniqueCategories.size

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('current_streak, longest_streak, last_active_date, last_login_reward_at')
    .eq('id', userId)
    .single()

  if (!profile) return null

  let newCurrentStreak = profile.current_streak || 0
  const longestStreak = profile.longest_streak || 0
  let streakUpdated = false

  // Streak is maintained/incremented only when user reaches at least 3 distinct activities today,
  // and hasn't already been marked active/incremented today.
  if (profile.last_active_date !== todayStr && completedCount >= 3) {
    if (profile.last_active_date) {
      const lastActive = new Date(profile.last_active_date)
      const today = new Date(todayStr)
      
      // Calculate day difference
      const diffTime = Math.abs(today.getTime() - lastActive.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays === 1) {
        newCurrentStreak += 1
      } else {
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
        last_active_date: todayStr
      })
      .eq('id', userId)

    streakUpdated = true

    // Check for streak badges
    if (newCurrentStreak >= 7) {
      await awardBadge(supabase, userId, 'hot-streak')
      await awardBadge(supabase, userId, 'consistency-king')
    }
  }

  // Award XP for Daily Login if activity is login, only once every 24 hours (atomic conditional check)
  if (activityType === 'login') {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: updatedRows } = await supabase
      .from('profiles')
      .update({ last_login_reward_at: new Date().toISOString() })
      .eq('id', userId)
      .or(`last_login_reward_at.is.null,last_login_reward_at.lte.${cutoff}`)
      .select('id')

    if (updatedRows && updatedRows.length > 0) {
      await awardXp(supabase, userId, 5, 'Daily Login')
    }
  }


  return {
    isFirstActivityToday: streakUpdated,
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
  // Fetch current profile credits and unlimited math privilege
  const { data: profile } = await supabase
    .from('profiles')
    .select('arv_credits, mao_credits, ai_uses_remaining, unlimited_math_until')
    .eq('id', userId)
    .single()

  if (!profile) return { success: false, error: 'Profile not found' }

  // Check if Unlimited Math perk is active
  const isUnlimitedMath = profile.unlimited_math_until && new Date(profile.unlimited_math_until) > new Date()

  if (isUnlimitedMath && (creditType === 'arv' || creditType === 'mao')) {
    // Log in credit_transactions as a free run with perk
    await supabase.from('credit_transactions').insert({
      user_id: userId,
      feature: `${feature} (Unlimited Math Perk)`,
      credits_used: 0,
      credits_added: 0,
      balance: (profile.arv_credits || 0) + (profile.mao_credits || 0) + (profile.ai_uses_remaining || 0)
    })

    // Award XP (still award XP for usage)
    await awardXp(supabase, userId, 1, `${creditType === 'arv' ? 'ARV' : 'MAO'} Calculation (Unlimited Math Perk)`)

    // Check Math Whiz badge
    await awardBadge(supabase, userId, 'math-whiz')

    // Update streak activity
    await updateStreak(supabase, userId, creditType)

    return { success: true }
  }

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

  // Award XP for calculator usage
  let xpReward = 1
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
