'use client'

import React, { useState, useEffect } from 'react'
import SidebarLayout from '@/components/dashboard/SidebarLayout'
import { createClient } from '@/lib/supabase/client'
import { 
  Flame, 
  Calendar as CalendarIcon, 
  Trophy, 
  CheckCircle2, 
  Circle,
  HelpCircle,
  Sparkles,
  Info,
  Gift
} from 'lucide-react'

interface StreakLog {
  id: string
  activity_date: string
  activity_type: string
}

export default function StreaksPage() {
  const supabase = createClient()
  
  // Profile Streak States
  const [currentStreak, setCurrentStreak] = useState<number>(0)
  const [longestStreak, setLongestStreak] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [streakLogs, setStreakLogs] = useState<StreakLog[]>([])
  
  // Daily checklist states
  const [dailyActions, setDailyActions] = useState({
    login: false,
    lesson: false,
    deal: false,
    calculation: false,
    ai: false
  })

  const fetchStreakData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Fetch Profile Streaks
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_streak, longest_streak')
      .eq('id', user.id)
      .single()

    if (profile) {
      setCurrentStreak(profile.current_streak || 0)
      setLongestStreak(profile.longest_streak || 0)
    }

    // 2. Fetch Streak Logs
    const { data: logs } = await supabase
      .from('streak_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('activity_date', { ascending: false })

    const loadedLogs = logs || []
    setStreakLogs(loadedLogs)

    // 3. Populate Daily Checklist for today (Local time YYYY-MM-DD)
    const todayStr = new Date().toISOString().split('T')[0]
    const logsToday = loadedLogs.filter(log => log.activity_date === todayStr)

    setDailyActions({
      login: logsToday.some(l => l.activity_type === 'login'),
      lesson: logsToday.some(l => l.activity_type === 'lesson'),
      deal: logsToday.some(l => l.activity_type === 'deal'),
      calculation: logsToday.some(l => l.activity_type === 'arv' || l.activity_type === 'mao'),
      ai: logsToday.some(l => l.activity_type === 'ai')
    })

    setLoading(false)
  }

  useEffect(() => {
    fetchStreakData()
  }, [supabase])

  // Get current multiplier
  const getMultiplier = (streak: number) => {
    if (streak >= 90) return '2.0x'
    if (streak >= 30) return '1.5x'
    if (streak >= 7) return '1.25x'
    return '1.0x'
  }

  // Get Calendar parameters
  const getCalendarDays = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth() // 0-indexed

    const startOfMonth = new Date(year, month, 1)
    const endOfMonth = new Date(year, month + 1, 0)
    
    const daysInMonth = endOfMonth.getDate()
    const startDayOfWeek = startOfMonth.getDay() // 0 (Sun) to 6 (Sat)

    const days = []
    
    // Blank days for start offsets
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null)
    }

    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      const hasActivity = streakLogs.some(log => log.activity_date === dateStr)
      days.push({
        dayNumber: i,
        dateString: dateStr,
        active: hasActivity
      })
    }

    return days
  }

  const calendarDays = getCalendarDays()
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const currentMonthName = monthNames[new Date().getMonth()]

  const multiplierVal = getMultiplier(currentStreak)

  // Milestones tracking
  const milestones = [
    { target: 1, reward: '1.0x XP Base Multiplier' },
    { target: 7, reward: '1.25x XP Multiplier & Hot Streak Badge' },
    { target: 30, reward: '1.50x XP Multiplier & +100 Credits Bonus' },
    { target: 90, reward: '2.00x XP Multiplier & Wholesaling Elite Badge' }
  ]

  return (
    <SidebarLayout>
      <div className="max-w-5xl mx-auto space-y-10 pb-12">
        
        {/* Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-900 pb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white mb-1 flex items-center gap-2">
              <Flame className="w-6 h-6 text-orange-500 fill-orange-500/20" />
              <span>Login Streaks & Multipliers</span>
            </h1>
            <p className="text-xs text-gray-400">
              Maintain your daily activity streak, multiply experience gains, and secure milestone badges.
            </p>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-gray-800 text-xs font-bold">
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
            <span>Streak: <span className="text-orange-500">{currentStreak}</span> Days</span>
          </div>
        </div>

        {/* Streaks stats summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Current Streak */}
          <div className="glass-card rounded-2xl border border-gray-900 p-5 space-y-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Current Streak</span>
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500/20" />
            </div>
            <h3 className="text-3xl font-black text-white mt-1">{currentStreak} <span className="text-xs text-gray-500 font-semibold uppercase">Days</span></h3>
            <p className="text-[9px] text-gray-500 font-medium">Complete any 3 daily actions to increase streak count.</p>
          </div>

          {/* Longest Streak */}
          <div className="glass-card rounded-2xl border border-gray-900 p-5 space-y-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Longest Streak Record</span>
              <Trophy className="w-4 h-4 text-emerald-400" />
            </div>
            <h3 className="text-3xl font-black text-white mt-1">{longestStreak} <span className="text-xs text-gray-500 font-semibold uppercase">Days</span></h3>
            <p className="text-[9px] text-gray-500 font-medium">Your absolute record since registration.</p>
          </div>

          {/* XP Multiplier */}
          <div className="glass-card rounded-2xl border border-gray-900 p-5 space-y-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">XP Multiplier Reward</span>
              <Sparkles className="w-4 h-4 text-violet-400" />
            </div>
            <h3 className="text-3xl font-black text-violet-400 mt-1">{multiplierVal}</h3>
            <p className="text-[9px] text-gray-500 font-medium">Applied automatically to all XP logged.</p>
          </div>

        </div>

        {/* Calendar and Milestones Grid */}
        <div className="grid md:grid-cols-3 gap-6 items-start">
          
          {/* Calendar (ColSpan 2) */}
          <div className="md:col-span-2 glass-panel border-gray-900 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-950 pb-3">
              <CalendarIcon className="w-4 h-4 text-orange-500" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">{currentMonthName} Activity Log</h3>
            </div>

            {loading ? (
              <div className="text-center py-6 text-gray-550">Loading calendar...</div>
            ) : (
              <div className="space-y-4">
                {/* Week Day headers */}
                <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-black text-gray-550 uppercase">
                  <span>Sun</span>
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((day, idx) => {
                    if (!day) {
                      return <div key={`empty-${idx}`} className="h-10 opacity-0" />
                    }

                    const isToday = new Date().getDate() === day.dayNumber
                    
                    return (
                      <div 
                        key={day.dateString}
                        title={day.active ? `Activity logged on ${day.dateString}` : 'No activity logged'}
                        className={`h-12 rounded-lg border flex flex-col justify-between p-1.5 transition-all ${
                          day.active 
                            ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 font-bold shadow-[0_0_12px_rgba(249,115,22,0.1)]' 
                            : isToday 
                              ? 'bg-slate-900 border-violet-500 text-violet-400 font-bold' 
                              : 'bg-slate-950/60 border-gray-950 text-gray-650'
                        }`}
                      >
                        <span className="text-[9px] font-bold">{day.dayNumber}</span>
                        {day.active && (
                          <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500 self-end shrink-0" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Daily Tracker & Milestones */}
          <div className="space-y-6">
            
            {/* Daily Checklist Tracker */}
            <div className="glass-panel border-gray-900 rounded-xl p-5 space-y-4">
              {(() => {
                const completedCount = [
                  dailyActions.login,
                  dailyActions.lesson,
                  dailyActions.deal,
                  dailyActions.calculation,
                  dailyActions.ai
                ].filter(Boolean).length
                return (
                  <>
                    <div className="flex items-center justify-between border-b border-gray-950 pb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Today's Streak Actions</h3>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        completedCount >= 3 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                      }`}>
                        {completedCount}/3 Actions
                      </span>
                    </div>

                    <div className="space-y-3">
                      {([
                        { label: 'Daily Session Login', checked: dailyActions.login },
                        { label: 'Complete Learn Lesson', checked: dailyActions.lesson },
                        { label: 'Post a New Marketplace Deal', checked: dailyActions.deal },
                        { label: 'Run ARV/MAO math check', checked: dailyActions.calculation },
                        { label: 'Conduct AI Property Audit', checked: dailyActions.ai }
                      ]).map((action, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 text-[10px] text-gray-300 font-semibold">
                          {action.checked ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-650 shrink-0" />
                          )}
                          <span className={action.checked ? 'line-through text-gray-500' : 'text-gray-300'}>
                            {action.label}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 p-3 rounded-lg bg-slate-950 border border-gray-900 text-[9px] text-gray-500 leading-relaxed">
                      <Info className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                      <span>Completing any 3 actions above maintains your streak before local midnight.</span>
                    </div>
                  </>
                )
              })()}
            </div>

            {/* Streak milestones */}
            <div className="glass-panel border-gray-900 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-950 pb-3">
                <Gift className="w-4 h-4 text-violet-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Streak Milestones</h3>
              </div>

              <div className="space-y-3.5">
                {milestones.map((m, idx) => {
                  const unlocked = currentStreak >= m.target
                  return (
                    <div key={idx} className="flex items-start gap-2.5 text-[10px]">
                      <div className={`p-1.5 rounded border shrink-0 ${
                        unlocked 
                          ? 'bg-violet-500/10 border-violet-500/20 text-violet-400' 
                          : 'bg-slate-950 border-gray-900 text-gray-650'
                      }`}>
                        <Flame className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <div className={`font-black uppercase tracking-wider ${unlocked ? 'text-violet-400' : 'text-gray-500'}`}>
                          {m.target} Day Milestone
                        </div>
                        <div className="text-[9px] text-gray-500 truncate mt-0.5">{m.reward}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>

        </div>

      </div>
    </SidebarLayout>
  )
}
