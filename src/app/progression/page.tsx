'use client'

import React, { useState, useEffect } from 'react'
import SidebarLayout from '@/components/dashboard/SidebarLayout'
import { createClient } from '@/lib/supabase/client'
import { 
  Zap, 
  Trophy, 
  Check, 
  Lock, 
  Sparkles,
  Info,
  ChevronRight,
  TrendingUp,
  Award
} from 'lucide-react'
import { getRankAndLevel, RANKS } from '@/lib/gamification'

interface XPLog {
  id: string
  date: string
  action: string
  xp_earned: number
}

export default function ProgressionPage() {
  const supabase = createClient()
  
  const [profile, setProfile] = useState<any>(null)
  const [xpLogs, setXpLogs] = useState<XPLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetchProgressionData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Fetch Profile
    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    setProfile(p)

    // 2. Fetch XP Logs
    const { data: logs } = await supabase
      .from('xp_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(6) // Only show recent milestones

    setXpLogs(logs || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchProgressionData()
  }, [supabase])

  const rankInfo = profile ? getRankAndLevel(profile.xp) : null

  return (
    <SidebarLayout>
      <div className="max-w-5xl mx-auto space-y-10 pb-12">
        
        {/* Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-900 pb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white mb-1 flex items-center gap-2">
              <Zap className="w-6 h-6 text-violet-400" />
              <span>Wholesaler Rank Progression Roadmap</span>
            </h1>
            <p className="text-xs text-gray-400">
              Climb the ranks from Rookie Scout to Wholesaling Elite. Unlock premium privileges and credit bonuses.
            </p>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-gray-800 text-xs font-bold">
            <Trophy className="w-4 h-4 text-violet-400" />
            <span>Current Rank: <span className="text-violet-400">{rankInfo?.currentRank || profile?.current_rank}</span></span>
          </div>
        </div>

        {/* Dynamic Rank Progress Indicator */}
        {profile && rankInfo && (
          <div className="glass-panel border-gray-900 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
            <div className="text-center md:text-left space-y-1 border-b md:border-b-0 md:border-r border-gray-950 pb-4 md:pb-0 md:pr-6 shrink-0">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Level {rankInfo.currentLevel}</span>
              <h2 className="text-xl font-black text-white leading-tight">{rankInfo.currentRank}</h2>
              <span className="text-[9px] text-gray-450 uppercase tracking-widest font-black block pt-1">
                Active Tier
              </span>
            </div>

            <div className="md:col-span-2 space-y-3">
              <div className="flex justify-between items-center text-[10px] font-bold text-gray-450">
                <span>XP BOUNDS</span>
                <span>{profile.xp} / {rankInfo.nextRankXp} XP</span>
              </div>

              <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-gray-900/60 p-0.5">
                <div 
                  className="h-full bg-gradient-to-r from-violet-600 via-purple-500 to-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: `${rankInfo.progress}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[9px] text-gray-500">
                <span>Current Tier Min ({rankInfo.minXp} XP)</span>
                <span>{Math.round(rankInfo.progress)}% Complete</span>
                <span>Next Tier Min ({rankInfo.nextRankXp} XP)</span>
              </div>
            </div>

            <div className="text-center md:text-right space-y-1 pl-0 md:pl-6 border-t md:border-t-0 md:border-l border-gray-950 pt-4 md:pt-0">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Target Milestone</span>
              <div className="text-sm font-extrabold text-violet-400 truncate">{rankInfo.nextRank}</div>
              <span className="text-[10px] text-gray-400 font-medium block">
                {rankInfo.nextRankXp - profile.xp} XP remaining
              </span>
            </div>
          </div>
        )}

        {/* Rank Roadmap (Linear Timeline Stepper) */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Linear Stepper Career Path</h2>
          
          <div className="glass-panel border-gray-900 rounded-xl p-5 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex flex-col gap-6 pl-4 border-l border-gray-950">
              {RANKS.map((r, i) => {
                if (!profile) return null
                
                const isCurrent = rankInfo?.currentLevel === r.level
                const isCompleted = profile.xp >= r.minXp && !isCurrent
                const isLocked = profile.xp < r.minXp

                return (
                  <div key={i} className="relative flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    {/* Stepper Dot */}
                    <div className={`absolute -left-[25px] w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                      isCompleted 
                        ? 'bg-emerald-500 border-emerald-400 text-white shadow shadow-emerald-950' 
                        : isCurrent
                          ? 'bg-violet-600 border-violet-500 text-white animate-pulse shadow shadow-violet-950'
                          : 'bg-slate-950 border-gray-900 text-gray-650'
                    }`}>
                      {isCompleted ? (
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      ) : isCurrent ? (
                        <Sparkles className="w-2.5 h-2.5 fill-white/10" />
                      ) : (
                        <Lock className="w-2 h-2" />
                      )}
                    </div>

                    {/* Rank details */}
                    <div className="space-y-0.5 truncate">
                      <div className="flex items-center gap-2">
                        <span className={`font-black uppercase text-[10px] ${
                          isCompleted ? 'text-emerald-400' : isCurrent ? 'text-violet-400 font-extrabold' : 'text-gray-500'
                        }`}>
                          Tier {r.level}: {r.name}
                        </span>
                        {isCurrent && (
                          <span className="text-[8px] bg-violet-500/10 text-violet-400 border border-violet-500/20 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] text-gray-500 font-medium">Required XP: {r.minXp}+ XP</div>
                    </div>

                    {/* Reward description */}
                    <div className="text-[10px] text-gray-400 bg-slate-950/60 border border-gray-900/60 p-2.5 rounded-lg md:max-w-xs w-full flex items-center justify-between gap-3 shrink-0">
                      <div className="text-left md:text-right flex-1 truncate">
                        <div className="text-[8px] text-gray-500 uppercase font-black">Unlocked Benefit</div>
                        <div className="font-bold text-gray-300 truncate mt-0.5">{r.reward}</div>
                      </div>
                      
                      {/* Claim Status Badge */}
                      <div className="shrink-0">
                        {r.level === 1 ? (
                          <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                            Active
                          </span>
                        ) : (profile.rank_rewards_claimed?.[r.level] || profile.rank_rewards_claimed?.[String(r.level)]) ? (
                          <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-black uppercase tracking-wider flex items-center gap-1">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                            <span>Claimed</span>
                          </span>
                        ) : profile.xp >= r.minXp ? (
                          <span className="text-[8px] bg-violet-500/10 text-violet-400 border border-violet-500/20 px-1.5 py-0.5 rounded font-black uppercase tracking-wider animate-pulse">
                            Processing
                          </span>
                        ) : (
                          <span className="text-[8px] bg-slate-900 text-gray-600 border border-gray-950 px-1.5 py-0.5 rounded font-black uppercase tracking-wider flex items-center gap-1">
                            <Lock className="w-2 h-2" />
                            <span>Locked</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Level Up Logs */}
        <div className="glass-panel border-gray-900 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-950 pb-3">
            <TrendingUp className="w-4 h-4 text-violet-400" />
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Recent Level Up Milestones</h3>
              <p className="text-[9px] text-gray-550 mt-0.5">Timeline of XP actions that pushed you along the career path.</p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-4 text-gray-550 text-xs">Syncing logs...</div>
          ) : xpLogs.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-650">No progression logs registered.</div>
          ) : (
            <div className="relative flex flex-col gap-4 pl-4 border-l border-gray-950 text-[10px]">
              {xpLogs.map((log) => {
                const logDate = new Date(log.date).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })

                return (
                  <div key={log.id} className="relative flex items-center justify-between gap-3 bg-slate-950/20 border border-gray-900/80 p-3 rounded-lg">
                    {/* Log bullet */}
                    <div className="absolute -left-[21px] w-2 h-2 rounded-full bg-violet-500 border border-violet-400 shadow shadow-violet-900" />
                    
                    <div>
                      <div className="font-bold text-white">{log.action}</div>
                      <div className="text-[9px] text-gray-550 font-medium mt-0.5">{logDate}</div>
                    </div>

                    <div className="font-black text-violet-400 shrink-0">
                      +{log.xp_earned} XP
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </SidebarLayout>
  )
}
