'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import SidebarLayout from '@/components/dashboard/SidebarLayout'
import { createClient } from '@/lib/supabase/client'
import { 
  BookOpen, 
  Lock, 
  Check, 
  Flame, 
  ChevronDown,
  Trophy,
  Play,
  ArrowRight,
  Crown
} from 'lucide-react'
import { type Lesson, type UserLesson, type Profile } from '@/types/database'
import { getRankAndLevel } from '@/lib/gamification'
import { UpgradeModal } from '@/components/ui/UpgradeModal'


const MODULES = [
  {
    id: 'module-1',
    title: 'Module 1 — Introduction and Mindset',
    description: 'Establish the core conceptual foundations and crucial mindset shifts needed for real estate wholesaling success.',
  },
  {
    id: 'module-2',
    title: 'Module 2 — Lead Generation',
    description: 'Learn the primary off-market marketing channels, government lists, Zillow FSBO, and Driving for Dollars.',
  },
  {
    id: 'module-3',
    title: 'Module 3 — Seller Conversations',
    description: 'Master seller psychology, rapport building, script flows, objection handling, and negotiations.',
  },
  {
    id: 'module-4',
    title: 'Module 4 — Deal Analysis',
    description: 'Analyze after-repair value (ARV), estimate repair costs, run comps, and calculate Maximum Allowable Offer (MAO).',
  },
  {
    id: 'module-5',
    title: 'Module 5 — Contracts and Closings',
    description: 'Understand purchase agreements, assignment contracts, earnest money deposits, double closings, and title escrow.',
  },
  {
    id: 'module-6',
    title: 'Module 6 — Buyers and Dispositions',
    description: 'Build and vet a cash buyers list, coordinate JV partnerships, and manage the complete contract disposition process.',
  },
  {
    id: 'module-7',
    title: 'Module 7 — Creative Finance',
    description: 'Explore advanced creative finance strategies: Subject-To (Sub2), Seller Financing, Wrap Mortgages, and Lease Options.',
  },
  {
    id: 'module-8',
    title: 'Module 8 — Professional Development',
    description: 'Stay legally compliant, avoid common beginner mistakes, scale operations with virtual assistants, and build long-term wealth.',
  }
]

export default function LearnHubPage() {
  const supabase = createClient()
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [userLessons, setUserLessons] = useState<UserLesson[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  
  // Track which modules are expanded (Module 1 open by default)
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    'module-1': true
  })

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }))
  }

  useEffect(() => {
    let active = true
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // 1. Fetch Profile
        const { data: p } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        if (active) setProfile(p)

        // 2. Fetch all Lessons sorted by order_index
        const { data: les } = await supabase
          .from('lessons')
          .select('*')
          .order('order_index', { ascending: true })
        if (active) setLessons(les || [])

        // 3. Fetch Completed User Lessons
        const { data: uLes } = await supabase
          .from('user_lessons')
          .select('*')
          .eq('user_id', user.id)
        if (active) setUserLessons(uLes || [])

        // 4. Fetch subscription status
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()

        if (active) {
          setIsSubscribed(!!sub || p?.subscription_status === 'active' || p?.role === 'super_admin')
          setLoading(false)
        }
      } catch (err) {
        console.error('Error loading learn hub data:', err)
        if (active) setLoading(false)
      }
    }
    init()
    return () => {
      active = false
    }
  }, [supabase])


  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex flex-col items-center justify-center p-12 min-h-[60vh]">
          <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-4" />
          <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">Syncing path progress...</p>
        </div>
      </SidebarLayout>
    )
  }

  // Linear progression checks: a lesson is unlocked if it's the first lesson or the previous lesson is completed.
  const isLessonUnlocked = (lessonId: string) => {
    const idx = lessons.findIndex(l => l.id === lessonId)
    if (idx === 0) return true
    if (idx === -1) return false
    const prevLesson = lessons[idx - 1]
    return userLessons.some(ul => ul.lesson_id === prevLesson.id)
  }

  // Calculate overall stats
  const totalCompleted = userLessons.length
  const totalLessons = lessons.length
  const overallCompletionPct = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0
  
  // Gamification stats
  const totalXp = profile?.xp || 0
  const rankInfo = getRankAndLevel(totalXp)
  const freeModules = MODULES.slice(0, 4)
  const premiumModules = MODULES.slice(4)

  const renderModuleCard = (mod: typeof MODULES[0]) => {
    const modIdx = MODULES.findIndex(m => m.id === mod.id)
    const moduleLessons = lessons.filter(l => l.category === mod.id)
    const completedInModule = moduleLessons.filter(l => userLessons.some(ul => ul.lesson_id === l.id))
    const completionPct = moduleLessons.length > 0 
      ? Math.round((completedInModule.length / moduleLessons.length) * 100) 
      : 0
    
    const totalXpAvailable = moduleLessons.length * 50
    const xpEarnedInModule = completedInModule.length * 50
    const isExpanded = !!expandedModules[mod.id]
    const isPremiumModule = ['module-5', 'module-6', 'module-7', 'module-8'].includes(mod.id)
    const isLockedForFree = !isSubscribed && isPremiumModule

    return (
      <div 
        key={mod.id}
        className={`glass-panel border rounded-2xl transition-all duration-300 relative overflow-hidden ${
          isLockedForFree
            ? 'border-gray-900/50 opacity-60 blur-[0.5px] hover:opacity-75'
            : isExpanded 
              ? 'border-violet-500/20 shadow-lg shadow-violet-950/10' 
              : 'border-gray-800 hover:border-gray-700'
        }`}
      >
        <div className="shimmer-overlay" />
        {/* Module Card Header */}
        <button
          type="button"
          onClick={() => {
            if (isLockedForFree) {
              setShowUpgradeModal(true)
            } else {
              toggleModule(mod.id)
            }
          }}
          className="w-full text-left p-5 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer focus:outline-none"
        >
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-violet-400 tracking-wider">
                Module {modIdx + 1}
              </span>
              {completionPct === 100 && (
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <Check className="w-2.5 h-2.5 stroke-[3]" /> Completed
                </span>
              )}
            </div>
            <h2 className="text-base md:text-lg font-black text-white tracking-tight flex items-center gap-2">
              <span>{mod.title.split('—')[1]?.trim() || mod.title}</span>
              {isLockedForFree && (
                <span title="Premium Feature" className="shrink-0 flex items-center">
                  <Crown className="w-4 h-4 text-amber-500 fill-amber-500/10" />
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-400 font-medium leading-relaxed">
              {mod.description}
            </p>
          </div>

          {/* Module Stats & Accordion Toggle */}
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t border-gray-900 md:border-0 pt-3 md:pt-0">
            <div className="text-right space-y-1.5">
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider">
                Progress: <span className="text-white">{completedInModule.length}/{moduleLessons.length}</span> Units
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-1.5 bg-slate-900 rounded-full overflow-hidden hidden sm:block">
                  <div 
                    className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-300" 
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-emerald-400 shrink-0">
                  {completionPct}%
                </span>
              </div>
              <div className="text-[9px] font-bold text-violet-400">
                {xpEarnedInModule} / {totalXpAvailable} XP Available
              </div>
            </div>

            {isLockedForFree ? (
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
                <Crown className="w-4 h-4 fill-amber-500/10" />
              </div>
            ) : (
              <div className={`p-2 rounded-xl bg-slate-900/60 border border-gray-800 text-gray-400 transition-transform ${
                isExpanded ? 'rotate-180 text-violet-400' : ''
              }`}>
                <ChevronDown className="w-4 h-4" />
              </div>
            )}
          </div>
        </button>

        {/* Module Card Body (Expanded Units List) */}
        {!isLockedForFree && isExpanded && (
          <div className="border-t border-gray-900 p-5 md:p-6 bg-slate-950/20 rounded-b-2xl space-y-3">
            {moduleLessons.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-500 font-bold uppercase tracking-wider">
                Synchronizing curriculum units...
              </div>
            ) : (
              moduleLessons.map((lesson) => {
                const completed = userLessons.some(ul => ul.lesson_id === lesson.id)
                const unlocked = isLessonUnlocked(lesson.id)

                return (
                  <div 
                    key={lesson.id}
                    className={`flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border transition-all ${
                      completed
                        ? 'bg-emerald-950/5 border-emerald-500/10 text-emerald-400/90'
                        : unlocked
                          ? 'bg-slate-900/40 border-gray-800 text-gray-300 hover:border-gray-700 hover:bg-slate-900/60'
                          : 'bg-slate-950/40 border-gray-900/50 text-gray-600 opacity-60'
                    }`}
                  >
                    {/* Lesson Info */}
                    <div className="flex items-start gap-3.5 max-w-xl">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${
                        completed
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : unlocked
                            ? 'bg-violet-600/10 border-violet-500/20 text-violet-400'
                            : 'bg-slate-900 border-gray-950 text-gray-700'
                      }`}>
                        {completed ? (
                          <Check className="w-4 h-4 stroke-[3]" />
                        ) : unlocked ? (
                          <Play className="w-3.5 h-3.5 fill-violet-400/20" />
                        ) : (
                          <Lock className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black uppercase tracking-wider text-gray-500">
                            Unit {lesson.order_index}
                          </span>
                          {unlocked && !completed && (
                            <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                          )}
                        </div>
                        <h3 className={`text-sm font-bold flex items-center gap-1.5 ${
                          completed ? 'text-white' : unlocked ? 'text-white' : 'text-gray-600'
                        }`}>
                          <span>{lesson.title}</span>
                        </h3>
                      </div>
                    </div>

                    {/* Action & Reward Details */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-3 sm:mt-0 border-t border-gray-900/45 sm:border-0 pt-2.5 sm:pt-0">
                      <div className="text-[10px] font-extrabold text-violet-400/80">
                        +50 XP
                      </div>

                      {completed ? (
                        <Link
                          href={`/learn/${mod.id}/${lesson.id}`}
                          className="text-xs font-bold text-emerald-400 hover:text-emerald-300 py-1.5 px-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/25 transition-all text-center"
                        >
                          Review
                        </Link>
                      ) : unlocked ? (
                        <Link
                          href={`/learn/${mod.id}/${lesson.id}`}
                          className="text-xs font-black text-white py-1.5 px-4 rounded-lg bg-violet-600 hover:bg-violet-500 shadow-md shadow-violet-950/20 hover:scale-[1.02] transition-all text-center flex items-center gap-1"
                        >
                          <span>Start</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="text-xs font-bold text-gray-600 py-1.5 px-4 rounded-lg bg-slate-900 border border-gray-950 cursor-not-allowed text-center"
                        >
                          Locked
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <SidebarLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Hub Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-900 pb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white mb-1 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-violet-400" />
              <span>Vanta Learn Hub</span>
            </h1>
            <p className="text-xs text-gray-405">
              Interactive 8-Module curriculum. Each unit completed awards <span className="text-violet-400 font-bold">+50 XP 🎓</span> and builds your Wholesaling Operating System skills.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-gray-800 text-xs font-bold text-gray-300">
              <Flame className="w-4 h-4 text-orange-400 fill-orange-400 animate-pulse" />
              <span>Streak: <span className="text-orange-400 font-black">{profile?.current_streak || 0}</span> Days</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-gray-800 text-xs font-bold text-gray-300">
              <Trophy className="w-4 h-4 text-yellow-400 fill-yellow-400/20" />
              <span>Rank: <span className="text-violet-400 font-black">{rankInfo.currentRank}</span></span>
            </div>
          </div>
        </div>

        {/* Global Progress Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Progress Card */}
          <div className="md:col-span-2 glass-panel border border-gray-800 p-5 rounded-2xl flex flex-col justify-between space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-black tracking-wider text-gray-500">Curriculum Progress</span>
                <h3 className="text-lg font-black text-white mt-0.5">
                  {totalCompleted} / {totalLessons} Units Completed
                </h3>
              </div>
              <span className="px-3 py-1 bg-violet-600/10 border border-violet-500/20 rounded-full text-xs font-bold text-violet-400">
                {overallCompletionPct}% Done
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-violet-600 to-emerald-500 transition-all duration-500" 
                  style={{ width: `${overallCompletionPct}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-550 font-semibold leading-relaxed">
                Complete lessons in sequence to unlock successive modules and build your wholesaling toolkit.
              </p>
            </div>
          </div>

          {/* Level Progress Card */}
          <div className="glass-panel border border-gray-800 p-5 rounded-2xl flex flex-col justify-between space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-black tracking-wider text-gray-500">XP Progress</span>
                <h3 className="text-lg font-black text-white mt-0.5">
                  {totalXp} XP Earned
                </h3>
              </div>
              <span className="px-2.5 py-1 bg-slate-900 border border-gray-800 rounded-lg text-[10px] font-black text-violet-400">
                Lvl {rankInfo.currentLevel}
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                <span>{rankInfo.minXp} XP</span>
                <span>Next: {rankInfo.nextRank} ({rankInfo.nextRankXp} XP)</span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-violet-500 transition-all duration-500" 
                  style={{ width: `${rankInfo.progress}%` }}
                />
              </div>
            </div>
          </div>

        </div>

        {/* Premium Upgrade Banner for Free Users */}
        {!isSubscribed && (
          <div className="glass-panel border border-amber-500/25 bg-amber-500/5 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-lg shadow-amber-955/10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex p-1.5 rounded-lg bg-amber-500/15 text-amber-500 border border-amber-500/20">
                  <Crown className="w-4 h-4 fill-amber-500/10" />
                </span>
                <span className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Premium Learning Path</span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">
                4 / 8 Modules Available Free
              </h2>
              <p className="text-xs text-gray-400 font-medium max-w-xl leading-relaxed">
                Unlock Remaining 4 Modules With Premium to master advanced execution strategies: Contracts, Closings, Cash Buyers, and Creative Finance.
              </p>
            </div>
            <Link
              href="/pricing"
              className="w-full md:w-auto shrink-0 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-white text-xs font-black py-3 px-6 rounded-xl transition-all shadow-md shadow-amber-950/20 text-center flex items-center justify-center gap-1.5 hover:scale-[1.02]"
            >
              <span>Unlock Remaining 4 Modules</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Modules Section */}
        <div className="space-y-8">
          {!isSubscribed ? (
            <>
              {/* Free Access */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-900/50 pb-2.5">
                  <span className="text-emerald-400 font-black">✅</span>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Free Access</h3>
                </div>
                <div className="space-y-5">
                  {freeModules.map((mod) => renderModuleCard(mod))}
                </div>
              </div>

              {/* Premium Access */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 border-b border-gray-900/50 pb-2.5">
                  <span className="text-amber-500 font-black">🔒</span>
                  <h3 className="text-xs font-black text-amber-500/90 uppercase tracking-wider">Premium Access</h3>
                </div>
                <div className="space-y-5">
                  {premiumModules.map((mod) => renderModuleCard(mod))}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-5">
              {MODULES.map((mod) => renderModuleCard(mod))}
            </div>
          )}
        </div>

      </div>
      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
        title="You've Reached Premium Content"
        message="You've completed the free learning path."
        bullets={[
          "Contracts & Closings",
          "Cash Buyers",
          "Dispositions",
          "Creative Finance",
          "Scaling Systems",
          "Advanced Strategies"
        ]}
        subMessage="Continue your wholesaling journey with Premium."
      />
    </SidebarLayout>
  )
}

