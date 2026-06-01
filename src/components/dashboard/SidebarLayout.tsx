'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { 
  LayoutDashboard, 
  Percent, 
  MessageSquare, 
  BookOpen, 
  Calculator, 
  LogOut, 
  Menu, 
  X, 
  Coins, 
  Flame,
  Award,
  Trophy,
  Zap,
  Brain
} from 'lucide-react'
import { type Profile } from '@/types/database'
import { getRankAndLevel, updateStreak } from '@/lib/gamification'

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  
  const [profile, setProfile] = useState<Profile | null>(null)
  const [credits, setCredits] = useState<number>(0)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUserData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
        // Maintain daily login streak on load
        await updateStreak(supabase, user.id, 'login')
        
        // Sum total credits
        const total = (profileData.arv_credits || 0) + (profileData.mao_credits || 0) + (profileData.ai_uses_remaining || 0)
        setCredits(total)
      } else {
        // Redirect to onboarding if no profile found
        router.push('/onboarding')
        return
      }

      setLoading(false)
    }

    fetchUserData()
  }, [pathname, router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'JV Deal Feed', href: '/deals', icon: Percent },
    { name: 'Calculators', href: '/calculators', icon: Calculator },
    { name: 'Deal Intelligence', href: '/deal-intelligence', icon: Brain },
    { name: 'Learn Hub', href: '/learn', icon: BookOpen },
    { name: 'JV Match Chat', href: '/chat', icon: MessageSquare },
    { name: 'Credits', href: '/credits', icon: Coins },
    { name: 'XP Activity', href: '/xp', icon: Trophy },
    { name: 'Streaks', href: '/streaks', icon: Flame },
    { name: 'Badges', href: '/badges', icon: Award },
    { name: 'Progression', href: '/progression', icon: Zap },
  ]

  const rankInfo = getRankAndLevel(profile?.xp || 0)
  const lvl = {
    level: rankInfo.currentLevel,
    label: rankInfo.currentRank,
    xp: profile?.xp || 0
  }
  const xpPercentage = rankInfo.progress

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-4" />
        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Loading dashboard workspace...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-gray-900 bg-slate-950/80 backdrop-blur-md p-6 shrink-0 justify-between">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black bg-gradient-to-r from-violet-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent tracking-tight">
              WRE
            </span>
            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold tracking-wider">
              SaaS
            </span>
          </div>

          {/* Navigation links */}
          <nav className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    active 
                      ? 'bg-violet-600/10 text-violet-400 border-l-2 border-violet-500 font-bold shadow-md shadow-violet-950/10' 
                      : 'text-gray-400 hover:bg-slate-900/60 hover:text-white border-l-2 border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-violet-400' : 'text-gray-400'}`} />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="space-y-4 pt-4 border-t border-gray-900">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center font-bold text-violet-300 text-sm">
              {profile?.full_name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-white truncate">{profile?.full_name}</div>
              <div className="text-[10px] text-gray-500 font-medium truncate">@{profile?.username}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-red-400 hover:bg-red-500/5 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-gray-900 bg-slate-950/40 backdrop-blur-md px-6 flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-1 rounded hover:bg-slate-900 text-gray-400 hover:text-white cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* XP Tracker */}
            <Link href="/progression" className="hidden sm:flex flex-col w-48 hover:opacity-85 transition-opacity cursor-pointer">
              <div className="flex justify-between items-center text-[10px] mb-1">
                <span className="text-gray-400 font-bold">{lvl.label}</span>
                <span className="text-violet-400 font-semibold">{lvl.xp} XP</span>
              </div>
              <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-500" 
                  style={{ width: `${xpPercentage}%` }}
                />
              </div>
            </Link>
          </div>

          {/* Gamified Stat Badges */}
          <div className="flex items-center gap-3">
            {/* Streak */}
            <Link 
              href="/streaks" 
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-bold shadow-sm shadow-orange-950/10 hover:bg-orange-500/20 transition-all cursor-pointer"
            >
              <Flame className="w-4 h-4 fill-orange-400" />
              <span>{profile?.current_streak || 0} Days</span>
            </Link>

            {/* Credits */}
            <Link 
              href="/credits" 
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold shadow-sm shadow-emerald-950/10 hover:bg-emerald-500/20 transition-all cursor-pointer"
            >
              <Coins className="w-4 h-4 text-emerald-400 fill-emerald-500/20" />
              <span>{credits} 🪙</span>
            </Link>

            {/* Level Icon */}
            <Link 
              href="/progression" 
              className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 border border-violet-500 flex items-center justify-center font-black text-xs text-white shadow shadow-violet-900/30 hover:scale-105 transition-all cursor-pointer"
            >
              {lvl.level}
            </Link>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 relative">
          {children}
        </main>
      </div>

      {/* Mobile Drawer Navigation Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div 
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <aside className="relative flex flex-col w-64 bg-slate-950 border-r border-gray-900 p-6 z-10 justify-between">
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black bg-gradient-to-r from-violet-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent tracking-tight">
                    WRE
                  </span>
                  <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold tracking-wider">
                    SaaS
                  </span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1 rounded hover:bg-slate-900 text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation links */}
              <nav className="space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const active = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                        active 
                          ? 'bg-violet-600/10 text-violet-400 border-l-2 border-violet-500 font-bold shadow-md shadow-violet-950/10' 
                          : 'text-gray-400 hover:bg-slate-900/60 hover:text-white border-l-2 border-transparent'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? 'text-violet-400' : 'text-gray-400'}`} />
                      <span>{item.name}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>

            {/* Mobile Footer */}
            <div className="space-y-4 pt-4 border-t border-gray-900">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center font-bold text-violet-300 text-sm">
                  {profile?.full_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{profile?.full_name}</div>
                  <div className="text-[10px] text-gray-500 font-medium">@{profile?.username}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-red-400 hover:bg-red-500/5 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
