'use client'

import React, { useState, useEffect, useCallback } from 'react'
import SidebarLayout from '@/components/dashboard/SidebarLayout'
import { createClient } from '@/lib/supabase/client'
import { 
  Award, 
  CheckCircle2, 
  Lock, 
  Sparkles,
  Info,
  Calendar
} from 'lucide-react'
import confetti from 'canvas-confetti'

interface Badge {
  id: string
  name: string
  icon: string
  description: string
  xp_required: number
}

interface UserBadge {
  badge_id: string
  earned_at: string
}

export default function BadgesPage() {
  const supabase = createClient()
  
  const [allBadges, setAllBadges] = useState<Badge[]>([])
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const [loading, setLoading] = useState(true)
  
  // Progress indicators
  const [stats, setStats] = useState({
    lessonsCompleted: 0,
    dealsPosted: 0,
    calculationsRun: 0,
    dealsClosed: 0,
    messagesSent: 0,
    aiAnalysesRun: 0,
    currentStreak: 0
  })

  const fetchBadgeData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Fetch Badges & Earned list
    const { data: badges } = await supabase.from('badges').select('*')
    const { data: uBadges } = await supabase.from('user_badges').select('*').eq('user_id', user.id)

    setAllBadges(badges || [])
    setUserBadges(uBadges || [])

    // 2. Query dynamic stats to populate locked badges progress
    const { count: lessonsCount } = await supabase
      .from('user_lessons')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const { count: dealsCount } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)

    const { count: closedDealsCount } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .eq('status', 'closed')

    const { count: messagesCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', user.id)

    const { count: aiCount } = await supabase
      .from('credit_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .ilike('feature', '%AI%')

    const { data: calcLogs } = await supabase
      .from('xp_logs')
      .select('*')
      .eq('user_id', user.id)
      .or('action.eq.ARV Calculation,action.eq.MAO Calculation')

    const { data: profile } = await supabase
      .from('profiles')
      .select('current_streak')
      .eq('id', user.id)
      .single()

    setStats({
      lessonsCompleted: lessonsCount || 0,
      dealsPosted: dealsCount || 0,
      calculationsRun: calcLogs?.length || 0,
      dealsClosed: closedDealsCount || 0,
      messagesSent: messagesCount || 0,
      aiAnalysesRun: aiCount || 0,
      currentStreak: profile?.current_streak || 0
    })

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBadgeData()
    }, 0)
    return () => clearTimeout(timer)
  }, [fetchBadgeData])

  // Get dynamic progress parameters for a specific badge
  const getBadgeProgress = (badgeId: string) => {
    switch (badgeId) {
      case 'first-step':
        return { current: stats.lessonsCompleted, target: 1 }
      case 'deal-finder':
        return { current: stats.dealsPosted, target: 1 }
      case 'math-whiz':
        return { current: stats.calculationsRun, target: 1 }
      case 'closer-club':
        return { current: stats.dealsClosed, target: 1 }
      case 'jv-connector':
        return { current: stats.messagesSent, target: 1 }
      case 'ai-analyst':
        return { current: stats.aiAnalysesRun, target: 1 }
      case 'consistency-king':
      case 'hot-streak':
        return { current: stats.currentStreak, target: 7 }
      case 'deal-machine':
        return { current: stats.dealsPosted, target: 10 }
      default:
        return { current: 0, target: 1 }
    }
  }

  // Separate earned vs locked
  const earnedList = allBadges.filter(b => userBadges.some(ub => ub.badge_id === b.id))
  const lockedList = allBadges.filter(b => !userBadges.some(ub => ub.badge_id === b.id))

  // Badge Click Confetti
  const triggerConfetti = () => {
    confetti({ particleCount: 100, spread: 60, origin: { y: 0.8 } })
  }

  return (
    <SidebarLayout>
      <div className="max-w-5xl mx-auto space-y-10 pb-12">
        
        {/* Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-900 pb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white mb-1 flex items-center gap-2">
              <Award className="w-6 h-6 text-violet-400" />
              <span>Milestone Achievements</span>
            </h1>
            <p className="text-xs text-gray-400">
              Unlock unique profile rewards and experience allocations by accomplishing wholesaling milestones.
            </p>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-gray-800 text-xs font-bold">
            <Sparkles className="w-4 h-4 text-violet-400 animate-spin" />
            <span>Badges Earned: <span className="text-violet-400 font-black">{earnedList.length} / {allBadges.length}</span></span>
          </div>
        </div>

        {/* Earned Badges Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Earned Achievements ({earnedList.length})</span>
          </h2>

          {loading ? (
            <div className="text-center py-6 text-gray-500 text-xs">Syncing achievements...</div>
          ) : earnedList.length === 0 ? (
            <div className="glass-panel border-gray-900 rounded-xl p-10 text-center text-xs text-gray-500 max-w-sm mx-auto">
              No badges earned yet. Complete lessons or calculate offers to unlock achievements!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {earnedList.map((badge) => {
                const userEarned = userBadges.find(ub => ub.badge_id === badge.id)
                const dateStr = userEarned 
                  ? new Date(userEarned.earned_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: '2-digit'
                    })
                  : ''

                return (
                  <div 
                    key={badge.id}
                    onClick={triggerConfetti}
                    className="glass-card rounded-2xl border border-violet-500/35 bg-violet-950/5 p-5 flex flex-col justify-between items-center text-center relative overflow-hidden group hover:scale-[1.03] transition-all duration-200 cursor-pointer shadow-[0_0_20px_rgba(139,92,246,0.1)]"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-violet-500/10 rounded-full blur-xl pointer-events-none" />
                    
                    <div className="w-14 h-14 rounded-full bg-violet-600/15 border border-violet-500/30 flex items-center justify-center text-3xl mb-4 group-hover:animate-bounce shadow-md">
                      {badge.icon}
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-white">{badge.name}</h4>
                      <p className="text-[10px] text-gray-450 leading-relaxed max-w-[150px] mx-auto">
                        {badge.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-900/60 w-full flex justify-between items-center text-[9px] text-gray-500">
                      <span className="flex items-center gap-0.5">
                        <Calendar className="w-3 h-3 text-gray-650" />
                        <span>{dateStr}</span>
                      </span>
                      <span className="text-violet-400 font-bold bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/15">
                        +{badge.xp_required} XP
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Locked Badges Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-500" />
            <span>Locked Milestones ({lockedList.length})</span>
          </h2>

          {loading ? (
            <div className="text-center py-6 text-gray-500 text-xs">Syncing milestones...</div>
          ) : lockedList.length === 0 ? (
            <div className="glass-panel border-gray-900 rounded-xl p-10 text-center text-xs text-gray-500 max-w-sm mx-auto">
              Incredible! You have unlocked all Wholesaling Achievements! 🏆
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {lockedList.map((badge) => {
                const prog = getBadgeProgress(badge.id)
                const percentage = Math.min(100, Math.max(0, (prog.current / (prog.target || 1)) * 100))

                return (
                  <div 
                    key={badge.id}
                    className="glass-card rounded-2xl border border-gray-900 p-5 flex flex-col justify-between items-center text-center opacity-70 group hover:opacity-100 transition-opacity"
                  >
                    <div className="w-14 h-14 rounded-full bg-slate-950 border border-gray-900 flex items-center justify-center text-3xl mb-4 relative shrink-0">
                      <span className="filter grayscale contrast-50 opacity-40">{badge.icon}</span>
                      <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-gray-500">
                        <Lock className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="space-y-1 w-full">
                      <h4 className="text-xs font-bold text-gray-300">{badge.name}</h4>
                      <p className="text-[10px] text-gray-500 leading-relaxed max-w-[150px] mx-auto min-h-[30px]">
                        {badge.description}
                      </p>
                      
                      {/* Progress bar */}
                      <div className="space-y-1.5 pt-3 w-full">
                        <div className="flex justify-between items-center text-[8px] font-black text-gray-500 uppercase">
                          <span>Progress</span>
                          <span>{prog.current} / {prog.target}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-gray-900/60 p-0.5">
                          <div 
                            className="h-full bg-violet-600 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-900/60 w-full flex justify-between items-center text-[9px]">
                      <span className="text-gray-600 font-semibold uppercase">Reward</span>
                      <span className="text-gray-500 font-bold bg-slate-900 px-1.5 py-0.5 rounded border border-gray-950">
                        +{badge.xp_required} XP
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Informative Footer */}
        <div className="glass-panel border-gray-900 rounded-xl p-5 max-w-xl mx-auto space-y-3">
          <div className="flex items-center gap-2 border-b border-gray-900 pb-3">
            <Info className="w-4 h-4 text-violet-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">How to earn badges</h3>
          </div>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            Achievements are unlocked dynamically as you perform wholesaling activities. Once an action meets a milestone (e.g. closing a deal, posting listings, completing quizzes, or running comps), the system automatically awards the badge, prints a dashboard announcement, launches confetti, and deposits the corresponding XP into your profile balance.
          </p>
        </div>

      </div>
    </SidebarLayout>
  )
}
