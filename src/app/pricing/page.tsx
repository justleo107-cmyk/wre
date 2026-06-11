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
  Lock,
  Coins,
  AlertCircle
} from 'lucide-react'
import confetti from 'canvas-confetti'

interface FAQItem {
  question: string
  answer: string
}

export default function PricingPage() {
  const [pricing, setPricing] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'sixmonth' | 'yearly'>('monthly')
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const supabase = createClient()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [user, setUser] = useState<any>(null)


  // Fetch Pricing Live
  useEffect(() => {
    async function fetchPricing() {
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

          setIsSubscribed(!!sub || profileData?.subscription_status === 'active')
        }

        const res = await fetch('/api/pricing')
        const data = await res.json()
        if (res.ok && !data.error) {
          setPricing(data)
        } else {
          console.error(data.error || 'Failed to fetch pricing config')
        }
      } catch (err) {
        console.error('Connection error fetching pricing:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPricing()
  }, [supabase])


  const triggerSoonToast = () => {
    confetti({ particleCount: 80, spread: 50 })
    setToastMessage('Stripe integration coming soon')
    setTimeout(() => {
      setToastMessage(null)
    }, 3500)
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

  if (loading) {
    return (
      <SidebarLayout>
        <div className="max-w-6xl mx-auto space-y-10 pb-12 animate-pulse">
          {/* Banner Skeleton */}
          <div className="h-14 bg-slate-900 rounded-2xl w-full" />
          
          {/* Title Skeleton */}
          <div className="text-center space-y-3">
            <div className="h-6 bg-slate-900 rounded-full w-48 mx-auto" />
            <div className="h-8 bg-slate-900 rounded w-64 mx-auto" />
            <div className="h-4 bg-slate-900 rounded w-96 mx-auto" />
          </div>

          {/* Toggle Skeleton */}
          <div className="h-12 bg-slate-900 rounded-full w-80 mx-auto" />

          {/* Cards Grid Skeleton */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto pt-4">
            <div className="h-[650px] bg-slate-900/50 rounded-2xl border border-gray-900" />
            <div className="h-[700px] bg-slate-900/80 rounded-2xl border border-violet-500/20 shadow-[0_0_20px_rgba(139,92,246,0.05)]" />
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

  // Subheadline changes based on stage
  let subheadline = "Simple, transparent pricing."
  if (stage === 'founding') subheadline = "You're early. Lock in your founding rate before it's gone forever."
  else if (stage === 'early_adopter') subheadline = "Early adopter pricing — still saving big."
  else if (stage === 'growth') subheadline = "Growth stage pricing — still below standard."

  // Active Billing Config
  let currentPrice = prices.monthly
  let currentStandardPrice = standardPrices.monthly
  let billingLabel = "per month"
  
  if (billingPeriod === 'sixmonth') {
    currentPrice = prices.sixmonth
    currentStandardPrice = standardPrices.sixmonth
    billingLabel = "per 6 months"
  } else if (billingPeriod === 'yearly') {
    currentPrice = prices.yearly
    currentStandardPrice = standardPrices.yearly
    billingLabel = "per year"
  }

  // Savings Logic
  const showSavingsVsMonthly = billingPeriod !== 'monthly'
  const savingsVsMonthlyValue = billingPeriod === 'sixmonth' ? savings.sixmonth.vsMonthly : savings.yearly.vsMonthly

  const showSavingsVsStandard = stage !== 'standard'
  let savingsVsStandardValue = standardPrices.monthly - prices.monthly
  if (billingPeriod === 'sixmonth') savingsVsStandardValue = savings.sixmonth.vsStandard
  else if (billingPeriod === 'yearly') savingsVsStandardValue = savings.yearly.vsStandard

  // Progress percentage for visual bar
  const progressPct = spots.total ? Math.round(((spots.total - spots.remaining) / spots.total) * 100) : 0

  return (
    <SidebarLayout>
      <div className="max-w-6xl mx-auto space-y-10 pb-12 relative text-slate-100 font-sans">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-50 animate-bounce">
            <div className="glass-panel border-violet-500/50 bg-slate-900/90 shadow-[0_0_20px_rgba(139,92,246,0.3)] rounded-xl p-4 flex items-center gap-3 max-w-sm">
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
        {stage !== 'standard' && !isSubscribed && (
          <div className={`w-full rounded-2xl p-4 text-center text-xs flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl ${

            stage === 'founding' 
              ? 'bg-gradient-to-r from-amber-500/15 via-yellow-600/20 to-amber-500/15 border border-amber-500/30 text-amber-200'
              : stage === 'early_adopter'
              ? 'bg-gradient-to-r from-blue-500/15 via-indigo-600/20 to-blue-500/15 border border-blue-500/30 text-blue-200'
              : 'bg-gradient-to-r from-purple-500/15 via-fuchsia-600/20 to-purple-500/15 border border-purple-500/30 text-purple-200'
          }`}>
            <div className="flex items-center gap-2.5 w-full md:w-auto text-left">
              {stage === 'founding' ? (
                <Crown className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
              ) : (
                <Sparkles className="w-5 h-5 text-violet-400 shrink-0" />
              )}
              <div>
                <p className="font-extrabold uppercase tracking-widest text-[10px]">
                  {stage === 'founding' 
                    ? 'Founding Member Pricing — Lock In 50% Off For Life' 
                    : stage === 'early_adopter' 
                    ? 'Early Adopter Pricing' 
                    : 'Growth Stage Pricing'}
                </p>
                <p className="text-[10px] opacity-75 mt-0.5">
                  {stage === 'founding' 
                    ? 'Your discounted rate is locked forever and will never increase.' 
                    : 'Get discounted access before spots are filled.'}
                </p>
              </div>
            </div>

            {spots.total && (
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-wider shrink-0">
                  🔥 {spots.remaining} of {spots.total} {stage} spots remaining
                </span>
                <div className="h-2 w-36 bg-slate-950 rounded-full overflow-hidden border border-gray-900 shrink-0">
                  <div 
                    className={`h-full bg-gradient-to-r ${
                      stage === 'founding' 
                        ? 'from-amber-500 to-yellow-400' 
                        : 'from-violet-500 to-indigo-400'
                    }`} 
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* HEADLINE */}
        <div className="text-center space-y-3 pt-4">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-none">
            Choose Your Plan
          </h1>
          <p className="text-sm text-gray-400 max-w-xl mx-auto leading-relaxed">
            {subheadline}
          </p>
        </div>

        {/* BILLING TOGGLE */}
        <div className="flex justify-center pt-2">
          <div className="bg-slate-900/80 p-1 rounded-full border border-gray-800 flex items-center gap-1">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-5 py-2 rounded-full text-xs font-bold tracking-wide transition-all cursor-pointer ${
                billingPeriod === 'monthly'
                  ? 'bg-violet-650 text-white shadow-md shadow-violet-950/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('sixmonth')}
              className={`px-5 py-2 rounded-full text-xs font-bold tracking-wide transition-all cursor-pointer ${
                billingPeriod === 'sixmonth'
                  ? 'bg-violet-650 text-white shadow-md shadow-violet-950/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              6-Month
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-5 py-2 rounded-full text-xs font-bold tracking-wide transition-all cursor-pointer ${
                billingPeriod === 'yearly'
                  ? 'bg-violet-650 text-white shadow-md shadow-violet-950/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Yearly
            </button>
          </div>
        </div>

        {/* TWO PLANS GRID */}
        <div className="grid md:grid-cols-2 gap-8 items-stretch justify-center max-w-4xl mx-auto pt-6">
          
          {/* Card 1: Free Plan */}
          <div className="glass-panel border-gray-900 bg-slate-900/20 rounded-2xl p-6 flex flex-col justify-between hover:border-gray-800 transition-all duration-300">
            <div className="space-y-6">
              <div>
                <span className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Entry tier</span>
                <h3 className="text-xl font-black text-white mt-1">Free</h3>
                <p className="text-[11px] text-gray-500 mt-1 leading-normal">Test the waters and explore basic calculations.</p>
              </div>

              <div>
                <div className="text-3xl font-black text-white">$0</div>
                <div className="text-[10px] text-gray-500 font-bold mt-1.5">Forever free</div>
              </div>

              <hr className="border-gray-900/60" />

            <div className="space-y-3">
                <span className="text-[9px] font-bold uppercase text-gray-500 tracking-wider">Features Included:</span>
                <ul className="space-y-2.5">
                  {[
                    "First 4 Learn Hub modules",
                    "ARV Calculator",
                    "MAO Calculator",
                    "Marketplace browsing",
                    "XP & Progression",
                    "Achievements",
                    "Basic profile"
                  ].map((feat, i) => (
                    <li key={i} className="flex gap-2.5 items-start text-xs text-gray-300">
                      <Check className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-gray-900/60">
              <button className="w-full bg-slate-950 hover:bg-slate-900 border border-gray-800 text-gray-400 text-xs font-bold py-2.5 rounded-lg transition-colors cursor-not-allowed">
                Get Started Free
              </button>
            </div>
          </div>

          {/* Card 2: Premium Plan (GLOWING ACCENT CARD) */}
          <div className="relative glass-panel bg-slate-900/90 border-violet-500 rounded-3xl p-6 flex flex-col justify-between shadow-[0_0_50px_rgba(139,92,246,0.25)] md:scale-105 z-10 transition-transform duration-300">
            
            {/* Top Stage Badge */}
            {stage !== 'standard' && !isSubscribed && (
              <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 text-white text-[9px] font-black px-4 py-1.5 rounded-full shadow-lg uppercase tracking-widest flex items-center gap-1 border ${

                stage === 'founding'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 border-amber-400/30'
                  : stage === 'early_adopter'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 border-blue-400/30'
                  : 'bg-gradient-to-r from-purple-500 to-fuchsia-500 border-purple-400/30'
              }`}>
                {stage === 'founding' ? (
                  <Crown className="w-3 h-3 fill-white" />
                ) : (
                  <Sparkles className="w-3 h-3 fill-white" />
                )}
                <span>
                  {stage === 'founding' 
                    ? 'Founding Member Rate' 
                    : stage === 'early_adopter' 
                    ? 'Early Adopter Rate' 
                    : 'Growth Rate'}
                </span>
              </div>
            )}

            <div className="space-y-6">
              <div className="pt-2 flex justify-between items-center">
                <div>
                  <span className="text-[9px] font-black uppercase text-violet-400 tracking-wider">Ultimate tier</span>
                  <h3 className="text-xl font-black text-white mt-1">Premium</h3>
                </div>
                <span className="bg-violet-500/20 text-violet-300 border border-violet-500/35 text-[8px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse shrink-0">
                  Most Popular
                </span>
              </div>
              
              <p className="text-[11px] text-gray-400 leading-normal -mt-3">Our full suite of automated calculations, AI deal intelligence, and networking portal.</p>

              <div>
                {stage !== 'standard' && (
                  <div className="text-xs text-red-500 line-through font-bold mb-1">
                    ${currentStandardPrice.toFixed(2)}
                  </div>
                )}
                <div className="text-4xl font-black text-white">${currentPrice.toFixed(2)}</div>
                <div className="text-[10px] text-gray-500 font-bold mt-1.5 uppercase tracking-wider">{billingLabel}</div>

                {/* Savings and Spots Warnings */}
                <div className="space-y-1 mt-3.5 text-[10px] font-bold">
                  {showSavingsVsMonthly && (
                    <div className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/10 px-2.5 py-1 rounded">
                      ✓ Save ${savingsVsMonthlyValue.toFixed(2)} vs paying monthly
                    </div>
                  )}
                  {showSavingsVsStandard && (
                    <div className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/10 px-2.5 py-1 rounded">
                      ✓ Save ${savingsVsStandardValue.toFixed(2)} vs standard pricing
                    </div>
                  )}
                  {stage !== 'standard' && spots.remaining !== null && (
                    <div className="text-amber-400 bg-amber-500/10 border border-amber-500/10 px-2.5 py-1 rounded">
                      ⚠ Only {spots.remaining} spots left at this price
                    </div>
                  )}
                </div>
              </div>

              <hr className="border-gray-800" />

              <div className="space-y-3">
                <span className="text-[9px] font-bold uppercase text-gray-500 tracking-wider">Features Included:</span>
                <ul className="space-y-2.5 max-h-80 overflow-y-auto no-scrollbar pr-1">
                  {[
                    "Full Learn Hub access",
                    "Deal Tracker",
                    "Deal Intelligence",
                    "Voice Notes",
                    "AI Transcription",
                    "Marketplace posting",
                    "Chat access"
                  ].map((feat, i) => (
                    <li key={i} className="flex gap-2.5 items-start text-xs text-gray-200">
                      <Check className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-gray-800 space-y-2.5">
              {isSubscribed ? (
                <div className="w-full bg-emerald-550/10 border border-emerald-500/20 text-emerald-400 text-xs font-extrabold py-3 rounded-lg text-center block uppercase tracking-wider">
                  Active Subscription
                </div>
              ) : (
                <>
                  <button
                    onClick={triggerSoonToast}
                    className="w-full bg-gradient-to-r from-violet-600 via-purple-650 to-indigo-650 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-extrabold py-3 rounded-lg transition-all cursor-pointer shadow-lg shadow-violet-955/20 text-center block"
                  >
                    Lock In This Price →
                  </button>
                  {stage !== 'standard' && (
                    <p className="text-[9px] text-center font-bold text-amber-500 uppercase tracking-widest animate-pulse">
                      {stage === 'founding' 
                        ? 'Founding member rate locked for life' 
                        : stage === 'early_adopter' 
                        ? 'Early adopter rate locked for life' 
                        : 'Growth rate locked for life'}
                    </p>
                  )}
                  {stage === 'standard' && (
                    <p className="text-[9px] text-center font-bold text-gray-500 uppercase tracking-widest">
                      Cancel anytime
                    </p>
                  )}
                </>
              )}
            </div>

          </div>

        </div>

        {/* COMPARISON TABLE */}
        <div className="space-y-4 pt-10">
          <div className="text-center space-y-1">
            <h2 className="text-base font-black text-white uppercase tracking-wider">Detailed Feature Comparison</h2>
            <p className="text-[10px] text-gray-500">Analyze the capabilities included across each service level tier.</p>
          </div>

          <div className="glass-panel border-gray-900 rounded-xl overflow-hidden bg-slate-900/10">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-900 text-gray-500 text-[9px] uppercase font-semibold">
                  <th className="py-3 px-4">Wholesaling Module Feature</th>
                  <th className="py-3 px-4 text-center">Free</th>
                  <th className="py-3 px-4 text-center text-violet-400 font-bold">Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900 text-gray-300">
                {[
                  { name: "First 4 Learn Hub modules", free: "✓", prem: "✓" },
                  { name: "All 8 Learn Hub modules", free: "—", prem: "✓" },
                  { name: "Calculators (ARV & MAO)", free: "✓", prem: "✓" },
                  { name: "Deal Tracker Pipeline", free: "—", prem: "✓" },
                  { name: "Deal Intelligence AI Audit", free: "—", prem: "✓" },
                  { name: "Voice Notes & Whisper Transcription", free: "—", prem: "✓" },
                  { name: "Wholesale Chat Portal Access", free: "—", prem: "✓" },
                  { name: "Marketplace Posting", free: "—", prem: "✓" },
                  { name: "Monthly Calculator Credits", free: "0", prem: "250 / mo" },
                  { name: "Monthly AI Audits Credits", free: "0", prem: "100 / mo" },
                  { name: "Priority Support", free: "—", prem: "✓" }
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/20">
                    <td className="py-3 px-4 font-semibold text-gray-200">{row.name}</td>
                    <td className="py-3 px-4 text-center text-gray-500">{row.free}</td>
                    <td className="py-3 px-4 text-center text-violet-400 font-bold">{row.prem}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* TRUST SECTION */}
        <div className="glass-panel border-gray-900 bg-slate-950/30 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-center max-w-4xl mx-auto">
          <div className="flex flex-col items-center justify-center space-y-2 p-2">
            <div className="p-2 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Crown className="w-5 h-5 fill-amber-400/15" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Founding Rate Locked For Life</h4>
              <p className="text-[10px] text-gray-500 mt-0.5">Your subscription rate will never increase for as long as you stay active.</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center space-y-2 p-2 border-t md:border-t-0 md:border-x border-gray-900">
            <div className="p-2 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Cancel Anytime</h4>
              <p className="text-[10px] text-gray-500 mt-0.5">No long-term commitments. Cancel online with one simple click.</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center space-y-2 p-2 border-t md:border-t-0 border-gray-900">
            <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Unlock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Instant Access After Payment</h4>
              <p className="text-[10px] text-gray-500 mt-0.5">Get immediate access to calculation logs and AI modules right away.</p>
            </div>
          </div>
        </div>

        {/* FAQS */}
        <div className="max-w-3xl mx-auto space-y-6 pt-6">
          <div className="text-center space-y-1">
            <HelpCircle className="w-6 h-6 mx-auto text-violet-400 opacity-80" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">Frequently Asked Questions</h2>
            <p className="text-[10px] text-gray-500">Answers to common queries about our founding packages and pricing schedules.</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx
              return (
                <div 
                  key={idx}
                  className="glass-panel border-gray-900 rounded-xl overflow-hidden transition-all duration-200"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full flex justify-between items-center p-4 text-left text-xs font-bold text-white hover:bg-slate-900/30 transition-colors cursor-pointer"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-violet-400" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-[11px] text-gray-400 leading-relaxed border-t border-gray-900/40 pt-3 bg-slate-950/20">
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
