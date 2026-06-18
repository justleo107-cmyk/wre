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
  Brain,
  ChevronDown,
  ChevronUp,
  CreditCard,
  TrendingUp,
  Wrench,
  User,
  Settings,
  Columns,
  Home,
  Mic
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { HoverScale } from '@/components/ui/Interactive'
import { type Profile } from '@/types/database'
import { getRankAndLevel, updateStreak } from '@/lib/gamification'
import { UpgradeModal } from '@/components/ui/UpgradeModal'
import { Crown } from 'lucide-react'
import { ProductTour } from '@/components/ui/ProductTour'
import { LoadingScreen, type LoadingType } from '@/components/ui/LoadingScreen'


export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [credits, setCredits] = useState<number>(0)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [animationFinished, setAnimationFinished] = useState(false)
  const [isFirstLoad, setIsFirstLoad] = useState(true)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showProductTour, setShowProductTour] = useState(false)

  // Collapsible Accordion states
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    deals: false,
    tools: false,
    progression: false,
    account: false
  })

  const isPublicRoute =
    pathname === '/' ||
    pathname === '/home' ||
    pathname === '/pricing' ||
    pathname === '/privacy' ||
    pathname === '/terms' ||
    pathname === '/signin' ||
    pathname === '/signup' ||
    pathname === '/refund' ||
    pathname === '/contact'

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const initialized = sessionStorage.getItem('vanta_workspace_initialized')
      if (initialized === 'true') {
        setIsFirstLoad(false)
      }
    }
  }, [])

  useEffect(() => {
    if (dataLoaded && animationFinished) {
      setLoading(false)
      if (typeof window !== 'undefined' && !isPublicRoute) {
        sessionStorage.setItem('vanta_workspace_initialized', 'true')
      }
    }
  }, [dataLoaded, animationFinished, isPublicRoute])


  useEffect(() => {
    async function fetchUserData() {
      const { data: { user } } = await supabase.auth.getUser()
      
      const isPublic =
        pathname === '/' ||
        pathname === '/home' ||
        pathname === '/pricing' ||
        pathname === '/privacy' ||
        pathname === '/terms' ||
        pathname === '/signin' ||
        pathname === '/signup' ||
        pathname === '/refund' ||
        pathname === '/contact'

      if (!user) {
        if (!isPublic) {
          router.push('/login')
          return
        }
        setDataLoaded(true)
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

        // Fetch subscription
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()

        setIsSubscribed(!!sub || profileData.subscription_status === 'active')

        // Check product tour eligibility
        const { data: userBadges } = await supabase
          .from('user_badges')
          .select('badge_id')
          .eq('user_id', user.id)

        const hasCompletedTour = userBadges?.some(b => b.badge_id === 'platform-explorer')
        const hasSkippedTour = localStorage.getItem(`vanta_tour_skipped_${user.id}`) === 'true'

        if (!hasCompletedTour && !hasSkippedTour) {
          setShowProductTour(true)
        }
      } else {
        if (!isPublic) {
          // Redirect to onboarding if no profile found
          router.push('/onboarding')
          return
        }
      }

      setDataLoaded(true)
    }

    fetchUserData()
  }, [pathname, router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  // Accordion groups structure
  const accordionGroups: Record<string, { name: string; href: string; icon: any }[]> = {
    deals: [
      { name: 'Marketplace', href: '/deals', icon: Percent },
      { name: 'Deal Intelligence', href: '/deal-intelligence', icon: Brain },
      { name: 'Voice Notes', href: '/voice-notes', icon: Mic },
      { name: 'Chat', href: '/chat', icon: MessageSquare },
    ],
    tools: [
      { name: 'Calculators', href: '/calculators', icon: Calculator },
      { name: 'Learn Hub', href: '/learn', icon: BookOpen },
    ],
    progression: [
      { name: 'XP Activity', href: '/xp', icon: Zap },
      { name: 'Streaks', href: '/streaks', icon: Flame },
      { name: 'Badges', href: '/badges', icon: Award },
      { name: 'Progression', href: '/progression', icon: Trophy },
    ],
    account: [
      { name: 'Credits', href: '/credits', icon: Coins },
      { name: 'Billing', href: '/pricing', icon: CreditCard },
      { name: 'Settings', href: '/settings', icon: Settings },
    ]
  }

  // Load session storage state and auto-expand active group
  useEffect(() => {
    const saved = sessionStorage.getItem('sidebar_expanded')
    if (saved) {
      try {
        setExpandedGroups(JSON.parse(saved))
      } catch (e) {
        console.error(e)
      }
    } else {
      // Find which group is active and expand it
      const activeGroup = Object.keys(accordionGroups).find(groupKey =>
        accordionGroups[groupKey].some(item => {
          if (item.href === '/dashboard') {
            return pathname === '/dashboard'
          }
          return pathname === item.href || pathname.startsWith(item.href + '/')
        })
      )
      if (activeGroup) {
        const initial = { deals: false, tools: false, progression: false, account: false, [activeGroup]: true }
        setExpandedGroups(initial)
        sessionStorage.setItem('sidebar_expanded', JSON.stringify(initial))
      }
    }
  }, [pathname])

  const handleExpandSidebarGroup = (groupKey: string, state: boolean) => {
    setExpandedGroups(prev => {
      const next = { ...prev, [groupKey]: state }
      sessionStorage.setItem('sidebar_expanded', JSON.stringify(next))
      return next
    })
  }

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = { ...prev, [groupKey]: !prev[groupKey] }
      sessionStorage.setItem('sidebar_expanded', JSON.stringify(next))
      return next
    })
  }


  const renderAccordionGroup = (
    groupKey: string,
    label: string,
    ParentIcon: any,
    isMobile = false
  ) => {
    const isExpanded = expandedGroups[groupKey]
    const items = accordionGroups[groupKey]

    // Check if any sub-item is active
    const isAnyChildActive = items.some(item => {
      if (item.href === '/dashboard') {
        return pathname === '/dashboard'
      }
      return pathname === item.href || pathname.startsWith(item.href + '/')
    })

    return (
      <div key={groupKey} className="space-y-1">
        {/* Accordion Header */}
        <button
          onClick={() => toggleGroup(groupKey)}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer group ${isAnyChildActive
              ? 'text-violet-400 bg-violet-600/5 border-l-2 border-violet-500 font-bold'
              : 'text-gray-400 hover:bg-slate-900/60 hover:text-white border-l-2 border-transparent hover:border-l-violet-500/40'
            }`}
        >
          <div className="flex items-center gap-3">
            <ParentIcon className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${isAnyChildActive ? 'text-violet-400' : 'text-gray-400 group-hover:text-violet-400'}`} />
            <span>{label}</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-gray-500 transition-transform duration-200" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-gray-500 transition-transform duration-200" />
          )}
        </button>

        {/* Collapsible Children Container */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial="collapsed"
              animate="open"
              exit="collapsed"
              variants={{
                open: { opacity: 1, height: "auto" },
                collapsed: { opacity: 0, height: 0 }
              }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="overflow-hidden ml-4 pl-3 border-l border-gray-900 space-y-1 mt-1"
            >
              {items.map((item) => {
                const ChildIcon = item.icon
                const active = item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname === item.href || pathname.startsWith(item.href + '/')
                const isPremiumFeature = item.href === '/deal-intelligence' || item.href === '/voice-notes' || item.href === '/chat'
                const showLockCrown = !isSubscribed && isPremiumFeature

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    id={
                      item.href === '/deals' ? 'tour-marketplace' :
                      item.href === '/learn' ? 'tour-learn' :
                      item.href === '/calculators' ? 'tour-calculators' :
                      item.href === '/deal-intelligence' ? 'tour-deal-intelligence' :
                      item.href === '/voice-notes' ? 'tour-voice-notes' :
                      item.href === '/chat' ? 'tour-chat' : undefined
                    }
                    onClick={(e) => {
                      if (showLockCrown) {
                        e.preventDefault()
                        setShowUpgradeModal(true)
                      } else if (isMobile) {
                        setMobileOpen(false)
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 group ${active
                        ? 'bg-violet-600/10 text-violet-400 font-bold shadow-md shadow-violet-955/10'
                        : 'text-gray-550 hover:bg-slate-900/40 hover:text-white'
                      }`}
                  >
                    <ChildIcon className={`w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-110 ${active ? 'text-violet-400' : 'text-gray-500 group-hover:text-violet-400/80'}`} />
                    <span>{item.name}</span>
                     {showLockCrown && (
                       <span title="Premium Feature" className="ml-auto shrink-0 flex items-center">
                         <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500/10" />
                       </span>
                     )}
                  </Link>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  const rankInfo = getRankAndLevel(profile?.xp || 0)
  const lvl = {
    level: rankInfo.currentLevel,
    label: rankInfo.currentRank,
    xp: profile?.xp || 0
  }
  const xpPercentage = rankInfo.progress

  let loadingSteps = ['Loading workspace']
  if (pathname === '/') {
    loadingSteps = ['Loading Home']
  } else if (pathname.startsWith('/dashboard')) {
    loadingSteps = [
      'Preparing dashboard',
      'Loading achievements',
      'Syncing deal intelligence',
      'Initializing workspace'
    ]
  } else if (pathname.startsWith('/deals')) {
    loadingSteps = ['Loading Marketplace']
  } else if (pathname.startsWith('/deal-intelligence')) {
    loadingSteps = ['Loading Deal Intelligence']
  } else if (pathname.startsWith('/voice-notes')) {
    loadingSteps = ['Loading Voice Notes']
  } else if (pathname.startsWith('/chat')) {
    loadingSteps = ['Loading Chat']
  } else if (pathname.startsWith('/calculators')) {
    loadingSteps = ['Loading Calculators']
  } else if (pathname.startsWith('/learn')) {
    loadingSteps = ['Loading Learn Hub']
  } else if (pathname.startsWith('/xp')) {
    loadingSteps = ['Loading XP Activity']
  } else if (pathname.startsWith('/streaks')) {
    loadingSteps = ['Loading Streaks']
  } else if (pathname.startsWith('/badges')) {
    loadingSteps = ['Loading Badges']
  } else if (pathname.startsWith('/progression')) {
    loadingSteps = ['Loading Progression']
  } else if (pathname.startsWith('/credits')) {
    loadingSteps = ['Loading Credits']
  } else if (pathname.startsWith('/pricing')) {
    loadingSteps = ['Loading Billing']
  } else if (pathname.startsWith('/settings')) {
    loadingSteps = ['Loading Settings']
  }

  const durationPerStep = isPublicRoute ? 100 : isFirstLoad ? 650 : 120

  if (loading) {
    return (
      <LoadingScreen
        customSteps={loadingSteps}
        durationPerStep={durationPerStep}
        onComplete={() => setAnimationFinished(true)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-gray-900 bg-slate-950/80 backdrop-blur-md p-6 shrink-0 justify-between min-h-screen">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src="/vanta_logo_full.jpg" alt="Vanta" className="h-11 w-auto object-contain" />
          </div>

          {/* Navigation Accordion links */}
          <nav className="space-y-2 pr-1">
            {/* Home Link (Direct link, no sub-items) */}
            <Link
              href="/"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 group ${
                pathname === '/' 
                  ? 'bg-violet-600/10 text-violet-400 border-l-2 border-violet-500 font-bold shadow-md shadow-violet-950/10' 
                  : 'text-gray-400 hover:bg-slate-900/60 hover:text-white border-l-2 border-transparent hover:border-l-violet-500/40'
              }`}
            >
              <Home className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${pathname === '/' ? 'text-violet-400' : 'text-gray-400 group-hover:text-violet-400'}`} />
              <span>Home</span>
            </Link>

            {/* Dashboard Link (Direct link, no sub-items) */}
            <Link
              href="/dashboard"
              id="tour-dashboard"
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 group ${
                pathname === '/dashboard' 
                  ? 'bg-violet-600/10 text-violet-400 border-l-2 border-violet-500 font-bold shadow-md shadow-violet-950/10' 
                  : 'text-gray-400 hover:bg-slate-900/60 hover:text-white border-l-2 border-transparent hover:border-l-violet-500/40'
              }`}
            >

              <LayoutDashboard className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${pathname === '/dashboard' ? 'text-violet-400' : 'text-gray-400 group-hover:text-violet-400'}`} />
              <span>Dashboard</span>
            </Link>

            {/* Collapsible Accordion Groups */}
            {renderAccordionGroup('deals', 'Deals', TrendingUp)}
            {renderAccordionGroup('tools', 'Tools', Wrench)}
            {renderAccordionGroup('progression', 'Progression', Trophy)}
            {renderAccordionGroup('account', 'Account', User)}
          </nav>
        </div>

        {/* User Card & Logout / Sign In */}
        <div className="space-y-4 pt-4 border-t border-gray-900">
          {profile ? (
            <>
              <div className="flex items-center gap-3 p-1.5 rounded-xl border border-transparent hover:border-gray-900 hover:bg-slate-900/40 transition-all duration-250 cursor-pointer group">
                {profile.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt={profile.full_name || 'User'} 
                    className="w-9 h-9 rounded-full object-cover border border-violet-500/35 transition-transform duration-200 group-hover:scale-108 shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center font-bold text-violet-300 text-sm transition-transform duration-200 group-hover:scale-108 shrink-0">
                    {profile.full_name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="truncate">
                  <div className="text-xs font-bold text-white truncate group-hover:text-violet-400 transition-colors duration-200">{profile.full_name}</div>
                  <div className="text-[10px] text-gray-500 font-medium truncate">@{profile.username}</div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-red-400 hover:bg-red-500/5 transition-all cursor-pointer group"
              >
                <LogOut className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold py-2.5 px-4 rounded-lg shadow-lg shadow-violet-950/20 transition-all cursor-pointer"
            >
              <span>Sign In</span>
            </Link>
          )}
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
          <div className="flex items-center gap-3 text-xs">
            {/* Streak */}
            <HoverScale>
              <Link
                href="/streaks"
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-bold shadow-sm shadow-orange-950/10 hover:bg-orange-500/20 transition-all cursor-pointer"
              >
                <Flame className="w-4 h-4 fill-orange-400" />
                <span>{profile?.current_streak || 0} Days</span>
              </Link>
            </HoverScale>

            {/* Credits */}
            <HoverScale>
              <Link
                href="/credits"
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold shadow-sm shadow-emerald-950/10 hover:bg-emerald-500/20 transition-all cursor-pointer"
              >
                <Coins className="w-4 h-4 text-emerald-400 fill-emerald-500/20" />
                <span>{credits} 🪙</span>
              </Link>
            </HoverScale>

            {/* Level Icon */}
            <HoverScale>
              <Link
                href="/progression"
                className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-purple-600 border border-violet-500 flex items-center justify-center font-black text-xs text-white shadow shadow-violet-900/30 hover:scale-105 transition-all cursor-pointer"
              >
                {lvl.level}
              </Link>
            </HoverScale>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-6 md:p-8 relative">
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
                  <img src="/vanta_logo_full.jpg" alt="Vanta" className="h-11 w-auto object-contain" />
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1 rounded hover:bg-slate-900 text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation links for Mobile */}
              <nav className="space-y-2 pr-1 no-scrollbar overflow-y-auto max-h-[70vh]">
                {/* Home Link (Direct link) */}
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    pathname === '/' 
                      ? 'bg-violet-600/10 text-violet-400 border-l-2 border-violet-500 font-bold shadow-md shadow-violet-950/10' 
                      : 'text-gray-400 hover:bg-slate-900/60 hover:text-white border-l-2 border-transparent'
                  }`}
                >
                  <Home className={`w-4 h-4 ${pathname === '/' ? 'text-violet-400' : 'text-gray-400'}`} />
                  <span>Home</span>
                </Link>

                {/* Dashboard Link (Direct link) */}
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    pathname === '/dashboard' 
                      ? 'bg-violet-600/10 text-violet-400 border-l-2 border-violet-500 font-bold shadow-md shadow-violet-950/10' 
                      : 'text-gray-400 hover:bg-slate-900/60 hover:text-white border-l-2 border-transparent'
                  }`}
                >
                  <LayoutDashboard className={`w-4 h-4 ${pathname === '/dashboard' ? 'text-violet-400' : 'text-gray-400'}`} />
                  <span>Dashboard</span>
                </Link>

                {/* Collapsible Accordion Groups */}
                {renderAccordionGroup('deals', 'Deals', TrendingUp, true)}
                {renderAccordionGroup('tools', 'Tools', Wrench, true)}
                {renderAccordionGroup('progression', 'Progression', Trophy, true)}
                {renderAccordionGroup('account', 'Account', User, true)}
              </nav>
            </div>

            {/* Mobile Footer */}
            <div className="space-y-4 pt-4 border-t border-gray-900">
              {profile ? (
                <>
                  <div className="flex items-center gap-3">
                    {profile.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt={profile.full_name || 'User'} 
                        className="w-9 h-9 rounded-full object-cover border border-violet-500/35 shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center font-bold text-violet-300 text-sm shrink-0">
                        {profile.full_name?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-white">{profile.full_name}</div>
                      <div className="text-[10px] text-gray-500 font-medium">@{profile.username}</div>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-red-400 hover:bg-red-500/5 transition-all cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold py-2.5 px-4 rounded-lg shadow-lg shadow-violet-950/20 transition-all cursor-pointer"
                >
                  <span>Sign In</span>
                </Link>
              )}
            </div>
          </aside>
        </div>
      )}
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
      {profile && (
        <ProductTour
          userId={profile.id}
          isOpen={showProductTour}
          onClose={() => {
            setShowProductTour(false)
            router.refresh()
          }}
          onSkip={() => setShowProductTour(false)}
          onExpandSidebar={handleExpandSidebarGroup}
        />
      )}
    </div>
  )
}

