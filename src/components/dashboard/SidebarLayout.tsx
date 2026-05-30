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
  Flame
} from 'lucide-react'
import { type Profile } from '@/types/database'

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
      } else {
        // Redirect to onboarding if no profile found
        router.push('/onboarding')
        return
      }

      // Fetch Credit Balance (Sum from Ledger)
      const { data: ledgerData } = await supabase
        .from('credit_ledger')
        .select('credits_changed')
        .eq('user_id', user.id)

      if (ledgerData) {
        const total = ledgerData.reduce((acc, curr) => acc + curr.credits_changed, 0)
        setCredits(total)
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
    { name: 'Learn Hub', href: '/learn', icon: BookOpen },
    { name: 'JV Match Chat', href: '/chat', icon: MessageSquare },
  ]

  // Calculate XP Level thresholds (Level 1: 0-499, Level 2: 500-1499, Level 3: 1500-3999, etc.)
  const getLevelInfo = (xp: number) => {
    if (xp < 500) return { level: 1, current: xp, next: 500, label: 'Rookie Wholesaler' }
    if (xp < 1500) return { level: 2, current: xp - 500, next: 1000, label: 'Deal Hunter' }
    if (xp < 4000) return { level: 3, current: xp - 1500, next: 2500, label: 'Acquisition Agent' }
    if (xp < 10000) return { level: 4, current: xp - 4000, next: 6000, label: 'Closer' }
    return { level: 5, current: 1, next: 1, label: 'Market Operator' }
  }

  const lvl = getLevelInfo(profile?.xp || 0)
  const xpPercentage = lvl.level === 5 ? 100 : Math.min(100, Math.max(0, (lvl.current / lvl.next) * 100))

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
          <nav className="space-y-1.5">
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
            <div className="hidden sm:flex flex-col w-48">
              <div className="flex justify-between items-center text-[10px] mb-1">
                <span className="text-gray-400 font-bold">{lvl.label}</span>
                <span className="text-violet-400 font-semibold">{profile?.xp || 0} XP</span>
              </div>
              <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-500" 
                  style={{ width: `${xpPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Gamified Stat Badges */}
          <div className="flex items-center gap-3">
            {/* Streak */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-bold shadow-sm shadow-orange-950/10">
              <Flame className="w-4 h-4 fill-orange-400" />
              <span>{profile?.streak_count || 0} Days</span>
            </div>

            {/* Credits */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold shadow-sm shadow-emerald-950/10">
              <Coins className="w-4 h-4 text-emerald-400 fill-emerald-500/20" />
              <span>{credits} 🪙</span>
            </div>

            {/* Level Icon */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 border border-violet-500 flex items-center justify-center font-black text-xs text-white shadow shadow-violet-900/30">
              {lvl.level}
            </div>
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
