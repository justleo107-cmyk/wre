'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import SidebarLayout from '@/components/dashboard/SidebarLayout'
import { createClient } from '@/lib/supabase/client'
import { 
  Check, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Unlock,
  Sparkles,
  Zap,
  Crown,
  AlertCircle,
  Trophy,
  ShieldCheck,
  TrendingUp,
  Users,
  BookOpen
} from 'lucide-react'
import confetti from 'canvas-confetti'


import { User } from '@supabase/supabase-js'
import { getPlatformStats } from '@/lib/stats'

interface PricingConfig {
  stage: string
  prices: {
    monthly: number
    sixmonth: number
    yearly: number
  }
  standardPrices: {
    monthly: number
    sixmonth: number
    yearly: number
  }
  spots: {
    total: number | null
    used: number
    remaining: number | null
  }
  savings: {
    sixmonth: {
      vsMonthly: number
      vsStandard: number
    }
    yearly: {
      vsMonthly: number
      vsStandard: number
    }
  }
}

interface FAQItem {
  question: string
  answer: string
}


export default function PricingPage() {
  const [pricing, setPricing] = useState<PricingConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const supabase = createClient()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [activePlan, setActivePlan] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)

  const [subscribing, setSubscribing] = useState(false)
  const [stats, setStats] = useState({
    users: 14,
    lessons: 134,
    deals: 9,
    active: 9
  })


  // Fetch Pricing Live & User Subscriptions & Stats
  useEffect(() => {
    async function initPage() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          setUser(authUser)
          const { data: profileData } = await supabase
            .from('profiles')
            .select('subscription_status')
            .eq('id', authUser.id)
            .single()

          const { data: sub } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', authUser.id)
            .eq('status', 'active')
            .single()

          const subscribed = !!sub || profileData?.subscription_status === 'active'
          setIsSubscribed(subscribed)
          
          if (sub) {
            setActivePlan(sub.plan_type)
          } else if (profileData?.subscription_status === 'active') {
            setActivePlan('monthly')
          }
        }

        const res = await fetch('/api/pricing')
        const data = await res.json()
        if (res.ok && !data.error) {
          setPricing(data)
        } else {
          console.error(data.error || 'Failed to fetch pricing config')
        }

        // Fetch stats counts from unified central service
        const platformStats = await getPlatformStats(supabase)
        setStats({
          users: platformStats.totalUsers,
          lessons: platformStats.lessonsCompleted,
          deals: platformStats.dealsSourced,
          active: platformStats.activeMembers
        })

      } catch (err) {
        console.error('Connection error initializing page:', err)
      } finally {
        setLoading(false)
      }
    }
    initPage()
  }, [supabase])

  const handleSubscribe = async (planType: 'monthly' | 'six_month' | 'yearly') => {
    if (!user) {
      window.location.href = '/login'
      return
    }

    setSubscribing(true)
    setToastMessage('Redirecting to Whop Checkout...')
    confetti({ particleCount: 50, spread: 40, colors: ['#8B5CF6', '#A78BFA', '#6366F1', '#67E8F9', '#F59E0B'] })

    // Track selected plan before redirect
    console.log(`Tracking plan selection: ${planType}`)
    try {
      localStorage.setItem('vanta_selected_plan', planType)
    } catch (e) {
      console.error('Failed to save plan tracking locally:', e)
    }

    const whopPlanUrls = {
      monthly: 'https://whop.com/checkout/plan_CcGqtyBSKBsa5',
      six_month: 'https://whop.com/checkout/plan_GhZFj24fFxvxE',
      yearly: 'https://whop.com/checkout/plan_BXYFEubsKZSO3'
    }

    const baseUrl = whopPlanUrls[planType]
    const searchParams = new URLSearchParams(window.location.search)
    const referralQuery = searchParams.toString()
    const finalUrl = referralQuery ? `${baseUrl}?${referralQuery}` : baseUrl

    // Open checkout in same tab after a micro-delay to let the loading state be visible
    setTimeout(() => {
      window.location.href = finalUrl
    }, 800)
  }

  const scrollToPricing = () => {
    document.getElementById('pricing-plans')?.scrollIntoView({ behavior: 'smooth' })
  }

  const faqs: FAQItem[] = [
    {
      question: "What is founding member pricing?",
      answer: "You lock in 50% off the standard price forever as long as your subscription stays active."
    },
    {
      question: "What happens when 100 spots are filled?",
      answer: "Pricing moves to early adopter rate. Your locked rate never changes."
    },
    {
      question: "Can I cancel and rejoin at the founding rate?",
      answer: "No. Once you cancel your subscription the founding rate is released and replaced with the current active pricing."
    },
    {
      question: "Do all billing periods have founding pricing?",
      answer: "Yes. Monthly, 6-month, and yearly plans all have founding member rates with additional savings on longer plans."
    }
  ]

  const comparisonData = [
    { feature: "Learn Hub", free: "First 4 Modules", monthly: "Full Access", sixmonth: "Full Access", yearly: "Full Access" },
    { feature: "ARV Calculator", free: true, monthly: true, sixmonth: true, yearly: true },
    { feature: "MAO Calculator", free: true, monthly: true, sixmonth: true, yearly: true },
    { feature: "Deal Intelligence CRM", free: false, monthly: true, sixmonth: true, yearly: true },
    { feature: "AI Deal Analysis", free: false, monthly: true, sixmonth: true, yearly: true },
    { feature: "Marketplace Posting", free: false, monthly: true, sixmonth: true, yearly: true },
    { feature: "Voice Notes", free: false, monthly: true, sixmonth: true, yearly: true },
    { feature: "Deal Tracker", free: false, monthly: true, sixmonth: true, yearly: true },
    { feature: "Gamification System", free: true, monthly: true, sixmonth: true, yearly: true },
    { feature: "XP Progression", free: true, monthly: true, sixmonth: true, yearly: true },
    { feature: "Achievements", free: true, monthly: true, sixmonth: true, yearly: true },
    { feature: "Community Access", free: false, monthly: true, sixmonth: true, yearly: true },
    { feature: "Priority Support", free: false, monthly: true, sixmonth: true, yearly: true },
    { feature: "Founding Member Badge", free: false, monthly: false, sixmonth: true, yearly: true },
    { feature: "Early Access Features", free: false, monthly: false, sixmonth: false, yearly: true }
  ]

  if (loading) {
    return (
      <SidebarLayout>
        <div className="max-w-6xl mx-auto space-y-10 pb-12 animate-pulse">
          {/* Banner Skeleton */}
          <div className="h-14 bg-slate-900/40 border border-slate-800 rounded-2xl w-full" />
          
          {/* Title Skeleton */}
          <div className="text-center space-y-3">
            <div className="h-6 bg-slate-900 rounded-full w-48 mx-auto" />
            <div className="h-8 bg-slate-900 rounded w-64 mx-auto" />
            <div className="h-4 bg-slate-900 rounded w-96 mx-auto" />
          </div>

          {/* Cards Grid Skeleton */}
          <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto pt-4">
            <div className="h-[550px] bg-[#0A0F1F]/40 rounded-2xl border border-gray-900" />
            <div className="h-[550px] bg-[#0A0F1F]/40 rounded-2xl border border-gray-900" />
            <div className="h-[580px] bg-[#0A0F1F]/40 rounded-2xl border border-violet-500/20" />
            <div className="h-[550px] bg-[#0A0F1F]/40 rounded-2xl border border-gray-900" />
          </div>
        </div>
      </SidebarLayout>
    )
  }

  if (!pricing) {
    return (
      <SidebarLayout>
        <div className="py-20 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Error Loading Pricing</h2>
          <p className="text-xs text-gray-500">Failed to connect to the pricing system. Please refresh the page.</p>
        </div>
      </SidebarLayout>
    )
  }

  const { stage, prices, standardPrices, spots, savings } = pricing

  // Dynamic progress calculation
  const progressPct = (spots.total && spots.remaining !== null) ? Math.round(((spots.total - spots.remaining) / spots.total) * 100) : 99

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16 pb-20 relative text-slate-100 font-sans bg-[#050816] overflow-x-hidden min-h-screen">
        
        {/* Glow ambient background effects */}
        <div className="absolute top-[-10%] left-[10%] w-[400px] h-[400px] bg-[#8B5CF6]/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-[30%] right-[5%] w-[500px] h-[500px] bg-[#6366F1]/5 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[20%] left-[5%] w-[450px] h-[450px] bg-[#67E8F9]/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-50">
            <div className="bg-[#0A0F1F]/90 border border-violet-500/50 shadow-[0_0_30px_rgba(139,92,246,0.35)] backdrop-blur-md rounded-xl p-4 flex items-center gap-3 max-w-sm">
              <div className="p-2 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-black text-white">Payment Portal</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{toastMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* TOP BANNER */}
        <div className="flex justify-center pt-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(245,158,11,0.15)] animate-pulse">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>🔥 Limited Founding Member Offer</span>
          </div>
        </div>

        {/* HEADLINE */}
        <div className="text-center space-y-4 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
            GO PREMIUM <br className="sm:hidden" />
            <span className="bg-gradient-to-r from-[#8B5CF6] via-[#A78BFA] to-[#6366F1] bg-clip-text text-transparent">
              WITH FOUNDING MEMBER PRICING
            </span>
          </h1>
          <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto font-medium">
            Lock in your rate before the next pricing stage activates. Your rate remains locked forever as long as your subscription is active.
          </p>
        </div>

        {/* COUNTDOWN CARD */}
        <div className="flex justify-center">
          <div className="glass-panel w-full max-w-md bg-[#0A0F1F]/60 border border-violet-500/20 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-[0_0_25px_rgba(139,92,246,0.15)] text-center">
            <div className="space-y-1">
              <span className="inline-block bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded uppercase tracking-wider">
                🔥 FOUNDING MEMBER PRICING
              </span>
              <p className="text-xs font-bold text-gray-200">
                Lock in your founding rate before the next pricing stage activates.
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-[2px]">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 via-[#8B5CF6] to-[#67E8F9] rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-black text-gray-400 px-0.5 uppercase tracking-wide">
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  <span>{spots.used ?? 1} / {spots.total ?? 100} Spots Claimed</span>
                </span>
                <span className="text-[#A78BFA]">{progressPct}% Filled</span>
                <span className="text-amber-500">{spots.remaining ?? 99} Spots Left</span>
              </div>
            </div>
          </div>
        </div>

        {/* PRICING CARDS */}
        <div id="pricing-plans" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch max-w-6xl mx-auto pt-6">
          
          {/* Card 1: Free */}
          <div className="bg-[#0A0F1F]/40 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between hover:border-slate-700/80 transition-all duration-300">
            <div className="space-y-6">
              <div>
                <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Entry Tier</span>
                <h3 className="text-xl font-black text-white mt-1 uppercase tracking-wide">FREE</h3>
                <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">Explore basic wholesaling calculation utilities.</p>
              </div>

              <div>
                <div className="flex items-baseline">
                  <span className="text-4xl font-black text-white">$0</span>
                </div>
                <div className="text-[10px] text-gray-500 font-bold mt-1.5 uppercase tracking-wider">Forever Free</div>
              </div>

              <hr className="border-slate-800" />

              <div className="space-y-3">
                <span className="text-[9px] font-bold uppercase text-gray-500 tracking-wider">Included Features:</span>
                <ul className="space-y-2.5">
                  {[
                    "First 4 Learn Hub Modules",
                    "ARV Calculator",
                    "MAO Calculator",
                    "Marketplace Browsing",
                    "XP System",
                    "Badges & Achievements",
                    "Basic Profile"
                  ].map((feat, i) => (
                    <li key={i} className="flex gap-2.5 items-start text-xs text-gray-300">
                      <Check className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-800">
              {user && !isSubscribed ? (
                <div className="w-full bg-slate-900/50 border border-slate-800 text-slate-400 text-xs font-extrabold py-3 rounded-lg text-center uppercase tracking-wider">
                  Current Tier
                </div>
              ) : (
                <Link
                  href={user ? "/dashboard" : "/login"}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-extrabold py-3 rounded-lg text-center block transition-colors border border-slate-800"
                >
                  Get Started Free
                </Link>
              )}
            </div>
          </div>

          {/* Card 2: Monthly */}
          <div className="bg-[#0A0F1F]/60 border border-violet-500/20 shadow-[0_0_20px_rgba(139,92,246,0.08)] rounded-3xl p-6 flex flex-col justify-between hover:border-violet-500/40 transition-all duration-300 relative">
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] font-black uppercase text-violet-400 tracking-widest">Growth Tier</span>
                  <h3 className="text-xl font-black text-white mt-1 uppercase tracking-wide">MONTHLY</h3>
                </div>
                <span className="bg-violet-500/10 text-[#A78BFA] border border-violet-500/20 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                  GOOD
                </span>
              </div>
              
              <p className="text-[11px] text-gray-400 leading-relaxed -mt-3">For active deal coordinators building momentum.</p>

              <div>
                <div className="flex items-center gap-2 text-xs text-red-500 font-bold mb-1">
                  <span className="line-through">${standardPrices.monthly.toFixed(2)}/mo</span>
                  <span className="bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded text-[9px]">50% OFF</span>
                </div>
                <div className="flex items-baseline">
                  <span className="text-4xl font-black text-white">${prices.monthly.toFixed(2)}</span>
                  <span className="text-xs text-gray-500 font-bold ml-1">/month</span>
                </div>
                
                <div className="mt-3 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/10 px-2 py-1 rounded">
                  ✓ Save ${Math.round(standardPrices.monthly - prices.monthly).toLocaleString()} every month
                </div>
              </div>

              <hr className="border-slate-800" />

              <div className="space-y-3">
                <span className="text-[9px] font-bold uppercase text-gray-500 tracking-wider">All Free Features Plus:</span>
                <ul className="space-y-2.5">
                  {[
                    "Full Learn Hub",
                    "Deal Intelligence CRM",
                    "Marketplace Posting",
                    "Voice Notes",
                    "Deal Tracker",
                    "AI Deal Analysis",
                    "Community Access"
                  ].map((feat, i) => (
                    <li key={i} className="flex gap-2.5 items-start text-xs text-gray-200">
                      <Check className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-800">
              {isSubscribed ? (
                activePlan === 'monthly' ? (
                  <div className="w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-extrabold py-3 rounded-lg text-center block uppercase tracking-wider">
                    Your Current Plan
                  </div>
                ) : (
                  <div className="w-full bg-slate-900/50 border border-slate-800 text-slate-500 text-xs font-extrabold py-3 rounded-lg text-center block uppercase tracking-wider cursor-not-allowed">
                    Active Subscription
                  </div>
                )
              ) : (
                <button
                  onClick={() => handleSubscribe('monthly')}
                  disabled={subscribing}
                  className="w-full bg-[#6366F1] hover:bg-[#6366F1]/90 text-white text-xs font-extrabold py-3 rounded-lg transition-all shadow-md shadow-indigo-950/20 text-center block disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Start Monthly
                </button>
              )}
            </div>
          </div>

          {/* Card 3: 6-Month (MOST POPULAR) */}
          <div className="bg-[#0A0F1F]/80 border-2 border-violet-500/50 shadow-[0_0_35px_rgba(139,92,246,0.25)] rounded-3xl p-6 flex flex-col justify-between hover:border-violet-500 transition-all duration-300 relative md:scale-[1.03] lg:scale-[1.05] z-10">
            {/* Spotlight shimmer element */}
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-indigo-500/5 to-transparent rounded-3xl pointer-events-none" />

            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] font-black uppercase text-[#A78BFA] tracking-widest font-black">Elite Tier</span>
                  <h3 className="text-[17px] sm:text-lg lg:text-xl font-black text-white mt-1 uppercase tracking-wide whitespace-nowrap">6-MONTH</h3>
                </div>
                <span className="bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-lg shrink-0">
                  🏆 MOST POPULAR
                </span>
              </div>
              
              <p className="text-[11px] text-gray-400 leading-relaxed -mt-3">Highly recommended to maximize wholesaling deal flow.</p>

              <div>
                <div className="flex items-center gap-2 text-xs text-[#A78BFA] font-bold mb-1">
                  <span>Standard Price: <span className="line-through">${standardPrices.sixmonth.toFixed(2)}</span></span>
                </div>
                <div className="flex items-baseline">
                  <span className="text-4xl font-black text-white">${prices.sixmonth.toFixed(2)}</span>
                  <span className="text-[10px] text-gray-500 font-bold ml-1 uppercase">/ 6 mo</span>
                </div>
                
                <div className="mt-3 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/10 px-2 py-1 rounded">
                  ✓ Save ${Math.round(standardPrices.sixmonth - prices.sixmonth).toLocaleString()}
                </div>
              </div>

              <hr className="border-slate-800" />

              <div className="space-y-3">
                <span className="text-[9px] font-bold uppercase text-gray-500 tracking-wider">Premium Features Plus:</span>
                <ul className="space-y-2.5">
                  {[
                    "Full Learn Hub",
                    "Deal Intelligence CRM",
                    "Marketplace Posting",
                    "Voice Notes",
                    "Deal Tracker",
                    "AI Deal Analysis",
                    "Community Access",
                    "Priority Support Desk"
                  ].map((feat, i) => (
                    <li key={i} className="flex gap-2.5 items-start text-xs text-gray-100">
                      <Check className="w-4 h-4 text-[#67E8F9] shrink-0 mt-0.5" />
                      <span className={feat === "Priority Support Desk" ? "font-bold text-[#67E8F9]" : ""}>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-800">
              {isSubscribed ? (
                activePlan === 'six_month' ? (
                  <div className="w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-extrabold py-3 rounded-lg text-center block uppercase tracking-wider">
                    Your Current Plan
                  </div>
                ) : (
                  <div className="w-full bg-slate-900/50 border border-slate-800 text-slate-500 text-xs font-extrabold py-3 rounded-lg text-center block uppercase tracking-wider cursor-not-allowed">
                    Active Subscription
                  </div>
                )
              ) : (
                <button
                  onClick={() => handleSubscribe('six_month')}
                  disabled={subscribing}
                  className="w-full bg-gradient-to-r from-violet-600 via-purple-650 to-indigo-650 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-extrabold py-3 rounded-lg transition-all shadow-lg shadow-violet-950/20 text-center block disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Lock In 6-Month Rate
                </button>
              )}
            </div>
          </div>

          {/* Card 4: Yearly */}
          <div className="p-[1.5px] bg-gradient-to-b from-[#8B5CF6] via-[#6366F1] to-[#67E8F9] rounded-[24px] shadow-[0_0_45px_rgba(139,92,246,0.35)] flex flex-col justify-between hover:scale-[1.01] transition-transform duration-300">
            <div className="bg-[#0A0F1F] rounded-[22px] p-6 h-full flex flex-col justify-between">
              
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-black uppercase text-[#67E8F9] tracking-widest font-black">Elite VIP Tier</span>
                    <h3 className="text-xl font-black text-white mt-1 uppercase tracking-wide">YEARLY</h3>
                  </div>
                  <span className="bg-gradient-to-r from-[#8B5CF6] to-[#67E8F9] text-white text-[9px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg shrink-0">
                    👑 FOUNDING ELITE
                  </span>
                </div>
                
                <p className="text-[11px] text-gray-400 leading-relaxed -mt-3">The ultimate investment path for dedicated wholesaling systems.</p>

                <div>
                  <div className="flex items-center gap-2 text-xs text-[#67E8F9] font-bold mb-1">
                    <span>Standard Price: <span className="line-through">${standardPrices.yearly.toFixed(2)}</span></span>
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-black text-white">${prices.yearly.toFixed(2)}</span>
                    <span className="text-[10px] text-gray-500 font-bold ml-1 uppercase">/ year</span>
                  </div>
                  
                  <div className="mt-3 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/10 px-2 py-1 rounded">
                    ✓ Save ${Math.round(standardPrices.yearly - prices.yearly).toLocaleString()}
                  </div>
                </div>

                <hr className="border-slate-800" />

                <div className="space-y-3">
                  <span className="text-[9px] font-bold uppercase text-gray-500 tracking-wider">VIP Benefits Included:</span>
                  <ul className="space-y-2.5">
                    {[
                      "Full Learn Hub",
                      "Deal Intelligence CRM",
                      "Marketplace Posting",
                      "Voice Notes",
                      "Deal Tracker",
                      "AI Deal Analysis",
                      "Community Access",
                      "VIP Priority Support (24/7)",
                      "Founding Member Profile Badge",
                      "Early Access to Beta Features"
                    ].map((feat, i) => (
                      <li key={i} className="flex gap-2.5 items-start text-xs text-gray-100">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className={["VIP Priority Support (24/7)", "Founding Member Profile Badge", "Early Access to Beta Features"].includes(feat) ? "font-bold text-[#67E8F9]" : ""}>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-800">
                {isSubscribed ? (
                  activePlan === 'yearly' ? (
                    <div className="w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-extrabold py-3 rounded-lg text-center block uppercase tracking-wider">
                      Your Current Plan
                    </div>
                  ) : (
                    <div className="w-full bg-slate-900/50 border border-slate-800 text-slate-500 text-xs font-extrabold py-3 rounded-lg text-center block uppercase tracking-wider cursor-not-allowed">
                      Active Subscription
                    </div>
                  )
                ) : (
                  <button
                    onClick={() => handleSubscribe('yearly')}
                    disabled={subscribing}
                    className="w-full bg-gradient-to-r from-[#8B5CF6] via-[#6366F1] to-[#67E8F9] hover:opacity-95 text-white text-xs font-black py-3 rounded-lg transition-all shadow-lg shadow-violet-950/20 text-center block disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wider"
                  >
                    Get Maximum Savings
                  </button>
                )}
              </div>

            </div>
          </div>

        </div>

        {/* FEATURE COMPARISON TABLE */}
        <div className="pt-16 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider">COMPARE PLANS</h2>
            <p className="text-xs text-gray-500 max-w-xl mx-auto">Compare the complete set of wholesaling tools, calculation logs, and credentials across our service tiers.</p>
          </div>

          <div className="glass-panel border border-slate-800/80 rounded-2xl overflow-hidden bg-[#0A0F1F]/40 shadow-xl max-w-5xl mx-auto">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#0A0F1F]/80 text-gray-400 text-[10px] uppercase font-black tracking-widest">
                    <th className="py-4 px-6">Feature Details</th>
                    <th className="py-4 px-6 text-center">Free</th>
                    <th className="py-4 px-6 text-center">Monthly</th>
                    <th className="py-4 px-6 text-center">6-Month</th>
                    <th className="py-4 px-6 text-center text-violet-400">Yearly</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-gray-300">
                  {comparisonData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/10 transition-colors">
                      <td className="py-3.5 px-6 font-semibold text-gray-200">{row.feature}</td>
                      
                      {/* Free Col */}
                      <td className="py-3.5 px-6 text-center">
                        {typeof row.free === 'boolean' ? (
                          row.free ? (
                            <Check className="w-4 h-4 text-violet-400 mx-auto" />
                          ) : (
                            <span className="text-gray-600">—</span>
                          )
                        ) : (
                          <span className="text-[10px] text-gray-400 font-bold bg-slate-900/50 px-2 py-0.5 rounded border border-slate-800">{row.free}</span>
                        )}
                      </td>

                      {/* Monthly Col */}
                      <td className="py-3.5 px-6 text-center">
                        {typeof row.monthly === 'boolean' ? (
                          row.monthly ? (
                            <Check className="w-4 h-4 text-violet-400 mx-auto" />
                          ) : (
                            <span className="text-gray-600">—</span>
                          )
                        ) : (
                          <span className="text-[10px] text-[#A78BFA] font-bold bg-violet-500/5 px-2 py-0.5 rounded border border-violet-500/10">{row.monthly}</span>
                        )}
                      </td>

                      {/* 6-Month Col */}
                      <td className="py-3.5 px-6 text-center">
                        {typeof row.sixmonth === 'boolean' ? (
                          row.sixmonth ? (
                            <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                          ) : (
                            <span className="text-gray-600">—</span>
                          )
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">{row.sixmonth}</span>
                        )}
                      </td>

                      {/* Yearly Col */}
                      <td className="py-3.5 px-6 text-center font-bold">
                        {typeof row.yearly === 'boolean' ? (
                          row.yearly ? (
                            <Check className="w-4 h-4 text-emerald-400 mx-auto" />
                          ) : (
                            <span className="text-gray-600">—</span>
                          )
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">{row.yearly}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* PRICING PROGRESSION ROADMAP */}
        <div className="pt-16 space-y-6 max-w-4xl mx-auto">
          <div className="text-center space-y-2">
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/5 border border-amber-500/10 px-3 py-1 rounded-full">
              {spots.remaining} / {spots.total || 100} Founding Spots Remaining
            </span>
            <h2 className="text-lg font-black text-white uppercase tracking-wider mt-2">PRICING PROGRESSION ROADMAP</h2>
          </div>

          <div className="glass-panel border border-slate-800/80 rounded-2xl p-6 sm:p-8 bg-[#0A0F1F]/40 shadow-xl space-y-8">
            
            {/* Step roadmap graphic */}
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-8 md:gap-4">
              
              {/* Timeline connecting track */}
              <div className="absolute top-1/2 left-[5%] right-[5%] h-[2px] bg-slate-800 -translate-y-1/2 hidden md:block" />
              
              {[
                { label: 'FOUNDING MEMBERS', stageKey: 'founding', desc: '50% off forever (Current)', color: 'text-amber-500' },
                { label: 'EARLY ADOPTERS', stageKey: 'early_adopter', desc: '30% discount on release', color: 'text-[#8B5CF6]' },
                { label: 'GROWTH STAGE', stageKey: 'growth', desc: '15% discount on scale', color: 'text-[#6366F1]' },
                { label: 'STANDARD PRICING', stageKey: 'standard', desc: 'Regular MSRP rate', color: 'text-gray-400' }
              ].map((step, idx) => {
                const isActive = stage === step.stageKey
                const isPast = ['founding', 'early_adopter', 'growth', 'standard'].indexOf(stage) > idx
                
                return (
                  <div key={idx} className="relative z-10 flex flex-col items-center text-center space-y-2 md:w-1/4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                      isActive 
                        ? 'bg-[#0A0F1F] border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.6)] scale-110' 
                        : isPast 
                        ? 'bg-amber-500 border-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-950 border-slate-800 text-gray-600'
                    }`}>
                      {isPast ? "✓" : idx + 1}
                    </div>
                    <div>
                      <span className={`text-[10px] font-black tracking-wider block ${
                        isActive ? 'text-amber-400 font-extrabold' : 'text-gray-400'
                      }`}>
                        {step.label}
                      </span>
                      <span className="text-[9px] text-gray-500 font-medium mt-0.5 block">{step.desc}</span>
                    </div>
                    
                    {isActive && (
                      <span className="absolute -top-6 bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider animate-bounce">
                        ACTIVE
                      </span>
                    )}
                  </div>
                )
              })}

            </div>

            {/* Stepper info details */}
            <div className="border-t border-slate-800/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-gray-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-500" />
                <span>Founding members keep their rate forever.</span>
              </div>
              <div className="text-right sm:text-left">
                <span>New users pay future pricing increases.</span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] text-gray-500 font-black uppercase">
                <span className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                  </span>
                  <span>{(spots.total && spots.remaining !== null) ? (spots.total - spots.remaining) : 99} / {spots.total || 100} Spots Claimed</span>
                </span>
                <span>{progressPct}% Capacity</span>
              </div>
              <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 via-violet-500 to-indigo-500 transition-all duration-1000" 
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

          </div>
        </div>

        {/* SOCIAL PROOF SECTION */}
        <div className="pt-16 space-y-6 max-w-4xl mx-auto">
          <div className="text-center space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider">PLATFORM MOMENTUM</h2>
            <p className="text-xs text-gray-500">Live statistics generated across our investor networks and education modules.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Active Users', value: stats.users, suffix: '+', icon: Users, color: 'text-violet-400' },
              { label: 'Lessons Completed', value: stats.lessons, suffix: '+', icon: BookOpen, color: 'text-amber-500' },
              { label: 'Deals Sourced', value: stats.deals, suffix: '+', icon: TrendingUp, color: 'text-emerald-400' },
              { label: 'Active Members', value: stats.active, suffix: '+', icon: Trophy, color: 'text-cyan-400' },
            ].map((stat, idx) => {
              const Icon = stat.icon
              return (
                <div key={idx} className="glass-panel border border-slate-800/80 rounded-2xl p-5 text-center flex flex-col items-center justify-center bg-[#0A0F1F]/40 shadow-lg hover:border-slate-700/60 transition-colors">
                  <div className={`p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 mb-3 ${stat.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-white bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-1">
                    {stat.value}{stat.suffix}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest font-black">{stat.label}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* BOTTOM CTA */}
        <div className="pt-16 max-w-5xl mx-auto">
          <div className="relative rounded-[32px] p-8 sm:p-12 overflow-hidden bg-gradient-to-br from-[#0C1226] to-[#050816] border border-violet-500/20 shadow-[0_0_50px_rgba(139,92,246,0.15)] text-center space-y-6">
            
            {/* Background element */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-[#8B5CF6]/5 rounded-full blur-[90px] pointer-events-none" />

            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Ready To Build Your Wholesaling System?
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 max-w-xl mx-auto font-medium">
              Join Vanta and lock in founding pricing before the next stage activates. Get full calculation ledgers, AI reports, and networking access right away.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href={user ? "/dashboard" : "/login"}
                className="w-full sm:w-auto bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-black px-8 py-3.5 rounded-xl transition-all uppercase tracking-wider shadow"
              >
                Get Started Free
              </Link>
              <button
                onClick={scrollToPricing}
                className="w-full sm:w-auto bg-gradient-to-r from-[#8B5CF6] via-[#6366F1] to-[#67E8F9] hover:opacity-95 text-slate-950 font-black text-xs px-8 py-3.5 rounded-xl transition-all uppercase tracking-wider shadow shadow-violet-500/10 cursor-pointer"
              >
                Become a Founding Member
              </button>
            </div>

          </div>
        </div>

        {/* TRUST SECTION / FOOTER */}
        <div className="glass-panel border border-slate-800/80 bg-slate-950/20 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-center max-w-5xl mx-auto">
          <div className="flex flex-col items-center justify-center space-y-2 p-2">
            <div className="p-2.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Crown className="w-5 h-5 fill-amber-400/15" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Founding Rate Locked For Life</h4>
              <p className="text-[10px] text-gray-500 mt-1">Your subscription rate will never increase for as long as you stay active.</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center space-y-2 p-2 border-t md:border-t-0 md:border-x border-slate-800/80">
            <div className="p-2.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Cancel Anytime</h4>
              <p className="text-[10px] text-gray-500 mt-1">No long-term commitments. Cancel online with one simple click.</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center space-y-2 p-2 border-t md:border-t-0 border-slate-800/80">
            <div className="p-2.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Unlock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Instant Access After Payment</h4>
              <p className="text-[10px] text-gray-500 mt-1">Get immediate access to calculation logs and AI modules right away.</p>
            </div>
          </div>
        </div>

        {/* FAQS */}
        <div className="max-w-3xl mx-auto space-y-6 pt-6">
          <div className="text-center space-y-1">
            <HelpCircle className="w-6 h-6 mx-auto text-violet-400 opacity-80" />
            <h2 className="text-base font-black text-white uppercase tracking-wider">Frequently Asked Questions</h2>
            <p className="text-[10px] text-gray-500">Answers to common queries about our founding packages and pricing schedules.</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx
              return (
                <div 
                  key={idx}
                  className="glass-panel border border-slate-800/60 rounded-xl overflow-hidden transition-all duration-200"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full flex justify-between items-center p-4 text-left text-xs font-bold text-white hover:bg-slate-900/30 transition-colors cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-violet-400" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-[11px] text-gray-400 leading-relaxed border-t border-slate-800/40 pt-3 bg-slate-950/20">
                       {faq.answer}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </SidebarLayout>
  )
}
