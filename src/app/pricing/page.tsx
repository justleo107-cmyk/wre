/* eslint-disable */
'use client'

import React, { useState } from 'react'
import SidebarLayout from '@/components/dashboard/SidebarLayout'
import { 
  Check, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  Clock, 
  Unlock,
  Sparkles,
  Zap,
  CreditCard,
  AlertCircle
} from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
}

export default function PricingPage() {
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastType, setToastType] = useState<'success' | 'info'>('info')
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  const showToast = (message: string, type: 'success' | 'info' = 'info') => {
    setToastMessage(message)
    setToastType(type)
    setTimeout(() => {
      setToastMessage(null)
    }, 3000)
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

  const features = [
    "Unlimited JV Chat Messages",
    "250 Calculator Credits per month",
    "100 AI Deal Analyses per month",
    "Advanced Deal Networking",
    "Priority Deal Notifications",
    "Rank & Badge Upgrades"
  ]

  const plans = [
    {
      name: "Monthly",
      price: "$149.99",
      period: "/month",
      description: "Perfect for entry-level wholesalers testing the market.",
      badge: null,
      buttonText: "Get Started",
      savings: null,
      subtext: "No commitments, cancel anytime",
      highlighted: false
    },
    {
      name: "6 Months",
      price: "$599.99",
      period: "",
      description: "Our most popular plan for active local wholesalers.",
      badge: "BEST VALUE",
      buttonText: "Most Popular",
      savings: "Save $300 compared to monthly",
      subtext: "Billed semi-annually ($100/mo equivalent)",
      highlighted: true
    },
    {
      name: "Yearly",
      price: "$999.99",
      period: "",
      description: "Designed for serious high-volume wholesale operations.",
      badge: "MAX SAVINGS",
      buttonText: "Go Pro",
      savings: "Save $800 compared to monthly",
      subtext: "Most Serious Wholesalers Choose This",
      highlighted: false
    }
  ]

  return (
    <SidebarLayout>
      <div className="max-w-6xl mx-auto space-y-12 pb-12 relative">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-50 animate-bounce duration-500">
            <div className="glass-panel border-violet-500/50 bg-slate-900/90 shadow-[0_0_20px_rgba(139,92,246,0.3)] rounded-xl p-4 flex items-center gap-3 max-w-sm">
              <div className="p-2 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-black text-white">System Redirect</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{toastMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Headline Header */}
        <div className="text-center space-y-3 pt-4">
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
            return (
              <div 
                key={idx}
                className={`relative rounded-2xl flex flex-col justify-between p-6 transition-all duration-300 border ${
                  plan.highlighted 
                    ? 'bg-slate-900/80 border-violet-500 shadow-[0_0_30px_rgba(139,92,246,0.15)] scale-[1.03] md:scale-[1.05] z-10' 
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
                    <div className="flex items-baseline gap-1 text-white">
                      <span className="text-3xl font-black">{plan.price}</span>
                      <span className="text-xs text-gray-500 font-bold">{plan.period}</span>
                    </div>
                    {plan.savings && (
                      <div className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded inline-block mt-2">
                        {plan.savings}
                      </div>
                    )}
                  </div>

                  <hr className="border-gray-900" />

                  {/* Features Checklist */}
                  <div className="space-y-3">
                    <div className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Features Included:</div>
                    <ul className="space-y-2.5">
                      {features.map((feature, fIdx) => (
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
                    onClick={() => showToast(`Redirecting to checkout for the ${plan.name} plan...`)}
                    className={`w-full text-xs font-bold py-2.5 rounded-lg transition-all cursor-pointer text-center block ${
                      plan.highlighted
                        ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-950/30'
                        : 'bg-slate-950 hover:bg-slate-900 text-gray-200 border border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    {plan.buttonText}
                  </button>
                  <p className={`text-[10px] text-center font-medium ${plan.name === 'Yearly' ? 'text-violet-400 font-bold' : 'text-gray-500'}`}>
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
