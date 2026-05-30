/* eslint-disable */
'use client'

import React, { useState, useEffect } from 'react'
import SidebarLayout from '@/components/dashboard/SidebarLayout'
import { createClient } from '@/lib/supabase/client'
import { 
  Coins, 
  Sparkles, 
  HelpCircle, 
  Check, 
  ChevronRight, 
  Flame,
  Info,
  DollarSign
} from 'lucide-react'

interface BundleItem {
  id: string
  credits: number
  price: string
  label: string
  badge?: string
  glowing: boolean
  desc?: string
}

export default function CreditsPage() {
  const supabase = createClient()
  const [credits, setCredits] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => {
      setToastMessage(null)
    }, 3000)
  }

  // Load available credits from ledger
  const fetchCredits = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('credit_ledger')
      .select('credits_changed')
      .eq('user_id', user.id)

    if (data) {
      const total = data.reduce((acc, curr) => acc + curr.credits_changed, 0)
      setCredits(total)
    }
  }

  useEffect(() => {
    fetchCredits().then(() => setLoading(false))
  }, [])

  const bundles: BundleItem[] = [
    {
      id: "bundle_testing",
      credits: 50,
      price: "$25",
      label: "Just Testing",
      glowing: false,
      desc: "Perfect for a few quick analysis runs"
    },
    {
      id: "bundle_popular",
      credits: 100,
      price: "$45",
      label: "Most Popular",
      badge: "Save $5",
      glowing: true,
      desc: "Optimal bundle for active local scouts"
    },
    {
      id: "bundle_power",
      credits: 250,
      price: "$99",
      label: "Power User",
      badge: "Save $26",
      glowing: false,
      desc: "Bigger projects, higher-volume math"
    },
    {
      id: "bundle_machine",
      credits: 500,
      price: "$199",
      label: "Wholesaling Machine",
      glowing: false,
      badge: "Best Value",
      desc: "Best cost per credit"
    }
  ]

  return (
    <SidebarLayout>
      <div className="max-w-5xl mx-auto space-y-10 pb-12 relative">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-50 animate-bounce">
            <div className="glass-panel border-violet-500/50 bg-slate-900/90 shadow-[0_0_20px_rgba(139,92,246,0.3)] rounded-xl p-4 flex items-center gap-3 max-w-sm">
              <div className="p-2 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
                <Coins className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <p className="text-xs font-black text-white">Payment Checkout</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{toastMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Top Header */}
        <div className="text-center space-y-3 pt-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest">
            <Coins className="w-3.5 h-3.5 text-emerald-400 fill-emerald-500/25" />
            <span>Ledger Fuel Shop</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white max-w-2xl mx-auto">
            Top Up Your Credits
          </h1>
          <p className="text-xs md:text-sm text-gray-400 max-w-lg mx-auto">
            Never run out of fuel mid-deal. Keep your calculators running hot.
          </p>
        </div>

        {/* Grid Bundles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {bundles.map((bundle) => {
            return (
              <div 
                key={bundle.id}
                className={`relative rounded-xl p-5 border flex flex-col justify-between transition-all duration-300 ${
                  bundle.glowing 
                    ? 'bg-slate-900/80 border-violet-500 shadow-[0_0_25px_rgba(139,92,246,0.15)] scale-[1.02]' 
                    : 'bg-slate-900/40 border-gray-900 hover:border-gray-800'
                }`}
              >
                {/* Badge if present */}
                {bundle.badge && (
                  <div className={`absolute -top-2.5 right-4 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    bundle.glowing 
                      ? 'bg-violet-600 text-white border border-violet-400/20 shadow' 
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {bundle.badge}
                  </div>
                )}

                <div className="space-y-4">
                  {/* Title & Description */}
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block">{bundle.label}</span>
                    <h3 className="text-xl font-black text-white flex items-center gap-1.5 mt-1">
                      <span>{bundle.credits}</span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Credits</span>
                    </h3>
                  </div>

                  <p className="text-[10px] text-gray-400 leading-relaxed min-h-[30px]">
                    {bundle.desc}
                  </p>

                  <div className="h-px bg-gray-900" />

                  {/* Pricing Rate */}
                  <div>
                    <div className="text-2xl font-black text-white">{bundle.price}</div>
                    <span className="text-[9px] text-gray-500 font-semibold block mt-0.5">One-time payment</span>
                  </div>
                </div>

                {/* Button Action */}
                <button
                  onClick={() => showToast(`Redirecting to payment for the ${bundle.credits} credits bundle...`)}
                  className={`w-full text-[10px] font-black py-2 rounded-lg mt-6 cursor-pointer tracking-wider uppercase transition-all ${
                    bundle.glowing
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow shadow-violet-900/20'
                      : 'bg-slate-950 hover:bg-slate-900 text-gray-200 border border-gray-800'
                  }`}
                >
                  Buy Bundle
                </button>
              </div>
            )
          })}
        </div>

        {/* Credit Usage Breakdown Table */}
        <div className="glass-panel border-gray-900 rounded-xl p-5 max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-900 pb-3">
            <div className="p-1.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Credit Ledger Breakdown</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">How credits are deducted from your balance.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-gray-900/60 text-gray-500 font-black uppercase tracking-wider">
                  <th className="py-2.5 px-1 font-bold">Valuation Tool</th>
                  <th className="py-2.5 px-1 font-bold text-center">Credit Cost</th>
                  <th className="py-2.5 px-1 font-bold">Calculation Rule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900/40 text-gray-300">
                <tr>
                  <td className="py-3 px-1 font-bold text-white">ARV Calculation</td>
                  <td className="py-3 px-1 text-center font-bold text-emerald-400">2 Credits</td>
                  <td className="py-3 px-1 text-gray-400">Standard mathematical property comp averages.</td>
                </tr>
                <tr>
                  <td className="py-3 px-1 font-bold text-white">MAO Calculation</td>
                  <td className="py-3 px-1 text-center font-bold text-emerald-400">2 Credits</td>
                  <td className="py-3 px-1 text-gray-400">Standard 70% rule wholesale offer formula run.</td>
                </tr>
                <tr>
                  <td className="py-3 px-1 font-bold text-white">AI Deal Analysis</td>
                  <td className="py-3 px-1 text-center font-bold text-violet-400">5 Credits</td>
                  <td className="py-3 px-1 text-gray-400 italic">Uses its own separate credit ledger deduction limit.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Current Balance Bottom Line */}
        <div className="text-center pt-2">
          <div className="inline-flex items-center gap-2 bg-slate-950/80 px-4 py-2.5 rounded-full border border-gray-900 text-xs font-bold text-gray-400 shadow-sm">
            <Coins className="w-4 h-4 text-emerald-400" />
            <span>
              Current Balance:{" "}
              {loading ? (
                <span className="text-[10px] text-gray-600 font-medium uppercase tracking-wider animate-pulse">Syncing...</span>
              ) : (
                <span className="text-emerald-400 font-black">{credits !== null ? credits : 0} Credits</span>
              )}
            </span>
          </div>
        </div>

      </div>
    </SidebarLayout>
  )
}
