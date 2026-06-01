/* eslint-disable */
'use client'

import React, { useState, useEffect } from 'react'
import SidebarLayout from '@/components/dashboard/SidebarLayout'
import { createClient } from '@/lib/supabase/client'
import { 
  Check, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  Clock, 
  Unlock,
  Sparkles,
  Zap
} from 'lucide-react'
import confetti from 'canvas-confetti'

interface FAQItem {
  question: string
  answer: string
}

interface PlanItem {
  name: string
  type: 'monthly' | 'six_month' | 'yearly'
  priceVal: number
  period: string
  description: string
  badge: string | null
  buttonText: string
  subtext: string
  highlighted: boolean
  features: string[]
}

export default function PricingPage() {
  const supabase = createClient()
  
  // Profile & Timer States
  const [profile, setProfile] = useState<any>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0) // in seconds
  const [discountActive, setDiscountActive] = useState<boolean>(false)
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true)

  // System States
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastType, setToastType] = useState<'success' | 'info'>('info')
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)

  const showToast = (message: string, type: 'success' | 'info' = 'info') => {
    setToastMessage(message)
    setToastType(type)
    setTimeout(() => {
      setToastMessage(null)
    }, 4500)
  }

  // 1. Fetch Profile on Mount
  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoadingProfile(false)
        return
      }
      
      const { data } = await supabase
        .from('profiles')
        .select('created_at, arv_credits, mao_credits, ai_uses_remaining, subscription_status')
        .eq('id', user.id)
        .single()
      if (data) {
        setProfile(data)
      }
      setLoadingProfile(false)
    }
    fetchProfile()
  }, [supabase])

  // 2. Real-time Countdown Timer
  useEffect(() => {
    if (!profile?.created_at) return

    const calculateTimeLeft = () => {
      const createdAt = new Date(profile.created_at).getTime()
      const now = new Date().getTime()
      const diffSeconds = Math.floor((createdAt + 60 * 60 * 1000 - now) / 1000)
      
      if (diffSeconds > 0) {
        setTimeLeft(diffSeconds)
        setDiscountActive(true)
      } else {
        setTimeLeft(0)
        setDiscountActive(false)
      }
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)
    return () => clearInterval(timer)
  }, [profile])

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    const pad = (n: number) => String(n).padStart(2, '0')
    return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
  }

  // 3. Purchase Handler calling the Server-side validation API
  const handleSubscribe = async (plan: PlanItem) => {
    setProcessing(plan.name)
    try {
      const res = await fetch('/api/subscriptions/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planType: plan.type,
          planName: plan.name
        })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        confetti({ particleCount: 200, spread: 90 })
        showToast(
          `Success! Subscribed to ${plan.name}. Charged $${data.priceCharged.toFixed(2)}${
            data.discountApplied ? ' (20% New User discount applied)' : ''
          }. +500 combined credits loaded!`,
          'success'
        )
        // Reload page after a delay to sync state
        setTimeout(() => {
          window.location.reload()
        }, 3000)
      } else {
        showToast(data.error || 'Failed to complete subscription.', 'info')
      }
    } catch (err) {
      console.error('Error completing subscription:', err)
      showToast('Failed to activate subscription. Check connection.', 'info')
    } finally {
      setProcessing(null)
    }
  }

  const faqs: FAQItem[] = [
    {
      question: "Will I be charged immediately?",
      answer: "Yes, your payment card will be charged immediately upon checkout, and your premium access will be activated instantly."
    },
    {
      question: "Can I cancel anytime?",
      answer: "Absolutely. There are no contracts, commitments, or hidden fees. You can cancel your subscription at any time with a single click from your profile settings."
    },
    {
      question: "What happens to my credits if I cancel?",
      answer: "If you cancel your subscription, any unused credits remaining on your account will remain active and usable until the end of your current billing period."
    }
  ]

  const plans: PlanItem[] = [
    {
      name: "Monthly",
      type: "monthly",
      priceVal: 149.99,
      period: "/month",
      description: "Perfect for entry-level wholesalers testing the market.",
      badge: null,
      buttonText: "Get Started",
      subtext: "No commitments, cancel anytime",
      highlighted: false,
      features: [
        "Chat Access",
        "500 Monthly Credits",
        "100 AI Analyses",
        "Priority Notifications",
        "Advanced Networking"
      ]
    },
    {
      name: "6 Month Plan",
      type: "six_month",
      priceVal: 799.99,
      period: "",
      description: "Our most popular plan for active local wholesalers.",
      badge: "BEST VALUE",
      buttonText: "Most Popular",
      subtext: "Lock in 6 months of premium access",
      highlighted: true,
      features: [
        "Everything in Monthly",
        "Save vs Monthly Billing"
      ]
    },
    {
      name: "Yearly",
      type: "yearly",
      priceVal: 1499.99,
      period: "",
      description: "Designed for serious high-volume wholesale operations.",
      badge: "MAX SAVINGS",
      buttonText: "Go Pro",
      subtext: "Best long-term wholesaling value",
      highlighted: false,
      features: [
        "Everything in Monthly",
        "Maximum Savings"
      ]
    }
  ]

  return (
    <SidebarLayout>
      <div className="max-w-6xl mx-auto space-y-10 pb-12 relative">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-50 animate-bounce duration-500">
            <div className="glass-panel border-violet-500/50 bg-slate-900/90 shadow-[0_0_20px_rgba(139,92,246,0.3)] rounded-xl p-4 flex items-center gap-3 max-w-sm">
              <div className="p-2 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-black text-white">System Update</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{toastMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* 60-Minute Countdown Banner */}
        {discountActive && timeLeft > 0 && (
          <div className="bg-gradient-to-r from-violet-600/15 via-purple-600/20 to-violet-600/15 border border-violet-500/25 rounded-2xl p-4 text-center text-xs text-white max-w-2xl mx-auto shadow-[0_0_15px_rgba(139,92,246,0.1)] flex flex-col sm:flex-row items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🎉</span>
              <div className="text-left">
                <p className="font-extrabold text-white uppercase tracking-wider text-[10px]">New User Offer</p>
                <p className="text-gray-400 text-[10px]">20% OFF Your First Subscription</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-slate-950/80 px-4 py-1.5 rounded-lg border border-violet-500/20">
              <span className="text-gray-500 text-[9px] font-bold uppercase tracking-wider">Offer expires in:</span>
              <span className="font-mono text-violet-400 font-black tracking-wider text-xs">
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        )}

        {/* Headline Header */}
        <div className="text-center space-y-3 pt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[10px] font-black uppercase tracking-widest">
            <Zap className="w-3 h-3 fill-violet-400" />
            <span>Premium Wholesaling Console</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white max-w-2xl mx-auto leading-none">
            Unlock Your Full Potential
          </h1>
          <p className="text-sm text-gray-400 max-w-lg mx-auto leading-relaxed">
            Join thousands of wholesalers closing more deals every month.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid md:grid-cols-3 gap-8 items-stretch pt-4">
          {plans.map((plan, idx) => {
            const isDiscounted = discountActive && timeLeft > 0
            const displayPrice = isDiscounted ? (plan.priceVal * 0.8) : plan.priceVal

            return (
              <div 
                key={idx}
                className={`relative rounded-2xl flex flex-col justify-between p-6 transition-all duration-300 border ${
                  plan.highlighted 
                    ? 'bg-slate-900/80 border-violet-500 shadow-[0_0_30px_rgba(139,92,246,0.15)] scale-[1.02] md:scale-[1.04] z-10' 
                    : 'bg-slate-900/40 border-gray-900 hover:border-gray-800'
                }`}
              >
                {/* Glowing Badge for Popular */}
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-[9px] font-black px-3 py-1 rounded-full shadow-lg shadow-violet-950/50 uppercase tracking-widest border border-violet-400/30 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 fill-white" />
                    <span>{plan.badge}</span>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Plan Identification */}
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">{plan.name}</h3>
                    <p className="text-[11px] text-gray-400 leading-relaxed min-h-[32px]">{plan.description}</p>
                  </div>

                  {/* Pricing Rate */}
                  <div>
                    <div className="flex items-baseline gap-2 text-white">
                      <span className="text-3xl font-black">${displayPrice.toFixed(2)}</span>
                      {isDiscounted && (
                        <span className="text-sm text-gray-500 line-through font-semibold">${plan.priceVal.toFixed(2)}</span>
                      )}
                      <span className="text-xs text-gray-500 font-bold">{plan.period}</span>
                    </div>
                    {isDiscounted && (
                      <div className="text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded inline-block mt-2 tracking-wide">
                        NEW USER 20% DISCOUNT APPLIED
                      </div>
                    )}
                  </div>

                  <hr className="border-gray-900" />

                  {/* Features Checklist */}
                  <div className="space-y-3">
                    <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Features Included:</div>
                    <ul className="space-y-2.5">
                      {plan.features.map((feature, fIdx) => (
                        <li key={fIdx} className="flex gap-2.5 items-start text-xs text-gray-300">
                          <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-6 mt-6 border-t border-gray-900/60 space-y-3">
                  <button
                    disabled={processing !== null || loadingProfile}
                    onClick={() => handleSubscribe(plan)}
                    className={`w-full text-xs font-bold py-2.5 rounded-lg transition-all cursor-pointer text-center block disabled:opacity-50 ${
                      plan.highlighted
                        ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-955/30'
                        : 'bg-slate-950 hover:bg-slate-900 text-gray-200 border border-gray-800 hover:border-gray-750'
                    }`}
                  >
                    {processing === plan.name ? 'Processing...' : plan.buttonText}
                  </button>
                  <p className="text-[10px] text-center font-medium text-gray-500">
                    {plan.subtext}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Trust Section */}
        <div className="glass-panel border-gray-900/60 bg-slate-950/30 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-center max-w-4xl mx-auto">
          <div className="flex flex-col items-center justify-center space-y-2 p-2">
            <div className="p-2 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Cancel Anytime</h4>
              <p className="text-[10px] text-gray-500 mt-0.5">No long contracts or termination fees.</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center space-y-2 p-2 border-t md:border-t-0 md:border-x border-gray-900/60">
            <div className="p-2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Unlock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Instant Access</h4>
              <p className="text-[10px] text-gray-500 mt-0.5">Start analyzing and chatting immediately.</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center space-y-2 p-2 border-t md:border-t-0 border-gray-900/60">
            <div className="p-2 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Secured by Stripe</h4>
              <p className="text-[10px] text-gray-500 mt-0.5">Bank-grade checkout encryption.</p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto space-y-6 pt-6">
          <div className="text-center space-y-1">
            <HelpCircle className="w-6 h-6 mx-auto text-violet-400 opacity-80" />
            <h2 className="text-base font-bold text-white uppercase tracking-wider">Frequently Asked Questions</h2>
            <p className="text-[10px] text-gray-500">Everything you need to know about plans and billing.</p>
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
