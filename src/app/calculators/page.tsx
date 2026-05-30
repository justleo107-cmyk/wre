/* eslint-disable */
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SidebarLayout from '@/components/dashboard/SidebarLayout'
import { createClient } from '@/lib/supabase/client'
import { 
  Calculator, 
  HelpCircle, 
  Sparkles, 
  TrendingUp, 
  Coins, 
  AlertCircle, 
  Check, 
  ShieldCheck,
  ChevronRight,
  Sparkle,
  Gauge
} from 'lucide-react'
import confetti from 'canvas-confetti'

const t = (key: string) => key

export default function CalculatorsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'arv' | 'mao' | 'ai'>('arv')
  const [credits, setCredits] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [creditsError, setCreditsError] = useState(false)

  // ARV Calculator Form State
  const [comp1, setComp1] = useState('')
  const [comp2, setComp2] = useState('')
  const [comp3, setComp3] = useState('')
  const [propertyCondition, setPropertyCondition] = useState<'average' | 'poor' | 'excellent'>('average')
  const [arvResult, setArvResult] = useState<number | null>(null)

  // MAO Calculator Form State
  const [maoArv, setMaoArv] = useState('')
  const [rehabCost, setRehabCost] = useState('')
  const [wholesaleFee, setWholesaleFee] = useState('')
  const [maoResult, setMaoResult] = useState<{
    mao: number
    margin: number
    investorProfit: number
  } | null>(null)

  // AI Deal Analyzer Form State
  const [aiLocation, setAiLocation] = useState('')
  const [aiPrice, setAiPrice] = useState('')
  const [aiRehab, setAiRehab] = useState('')
  const [aiCondition, setAiCondition] = useState<'average' | 'poor' | 'excellent'>('average')
  const [aiNotes, setAiNotes] = useState('')
  const [aiResult, setAiResult] = useState<{
    estimatedArv: number
    estimatedRehab: number
    suggestedMao: number
    riskScore: number
    dealQualityScore: number
    negotiationSuggestions: string[]
    buyerSuitability: string
  } | null>(null)

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
      if (total < 2) {
        setCreditsError(true)
      } else {
        setCreditsError(false)
      }
    }
  }

  useEffect(() => {
    fetchCredits().then(() => setLoading(false))
  }, [])

  const handleBuyCredits = () => {
    router.push('/credits')
  }

  // Calculate ARV
  const handleCalculateARV = async (e: React.FormEvent) => {
    e.preventDefault()
    if (credits < 2) {
      setCreditsError(true)
      return
    }

    setCalculating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Deduct 2 credits via PG RPC function
      const { data: success, error: rpcError } = await supabase.rpc('deduct_credits', {
        amount_to_deduct: 2,
        transaction_desc: 'ARV Calculation Run'
      })

      if (rpcError) throw rpcError
      if (!success) {
        setCreditsError(true)
        setCalculating(false)
        return
      }

      // Perform math logic
      const val1 = Number(comp1)
      const val2 = Number(comp2)
      const val3 = Number(comp3)
      const average = (val1 + val2 + val3) / 3

      // Adjust for property condition
      let multiplier = 1.0
      let condAdjusted: 'excellent' | 'poor' | 'average' = propertyCondition
      if (condAdjusted === 'excellent') multiplier = 1.10
      if (condAdjusted === 'poor') multiplier = 0.85

      const calculatedArv = Math.round(average * multiplier)
      setArvResult(calculatedArv)

      // Award XP badge check for 'math-whiz'
      const { data: checkBadges } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', user.id)
        .eq('badge_id', 'math-whiz')

      if (checkBadges && checkBadges.length === 0) {
        await supabase.from('user_badges').insert({
          user_id: user.id,
          badge_id: 'math-whiz',
          earned_at: new Date().toISOString()
        })
        const { data: p } = await supabase.from('profiles').select('xp').eq('id', user.id).single()
        if (p) {
          await supabase.from('profiles').update({ xp: p.xp + 150 }).eq('id', user.id)
        }
      }

      confetti({ particleCount: 80, spread: 50 })
      await fetchCredits()
    } catch (err) {
      console.error(err)
    } finally {
      setCalculating(false)
    }
  }

  // Calculate MAO
  const handleCalculateMAO = async (e: React.FormEvent) => {
    e.preventDefault()
    if (credits < 2) {
      setCreditsError(true)
      return
    }

    setCalculating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Deduct 2 credits via PG RPC
      const { data: success, error: rpcError } = await supabase.rpc('deduct_credits', {
        amount_to_deduct: 2,
        transaction_desc: 'MAO Calculation Run'
      })

      if (rpcError) throw rpcError
      if (!success) {
        setCreditsError(true)
        setCalculating(false)
        return
      }

      const arv = Number(maoArv)
      const rehab = Number(rehabCost)
      const fee = Number(wholesaleFee)

      const mao = Math.round((arv * 0.70) - rehab - fee)
      const margin = arv - mao - rehab
      const profit = Math.round(arv * 0.20)

      setMaoResult({
        mao,
        margin,
        investorProfit: profit
      })

      // Award XP badge check for 'math-whiz'
      const { data: checkBadges } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', user.id)
        .eq('badge_id', 'math-whiz')

      if (checkBadges && checkBadges.length === 0) {
        await supabase.from('user_badges').insert({
          user_id: user.id,
          badge_id: 'math-whiz',
          earned_at: new Date().toISOString()
        })
        const { data: p } = await supabase.from('profiles').select('xp').eq('id', user.id).single()
        if (p) {
          await supabase.from('profiles').update({ xp: p.xp + 150 }).eq('id', user.id)
        }
      }

      confetti({ particleCount: 80, spread: 50 })
      await fetchCredits()
    } catch (err) {
      console.error(err)
    } finally {
      setCalculating(false)
    }
  }

  // Calculate AI Deal Analysis
  const handleCalculateAI = async (e: React.FormEvent) => {
    e.preventDefault()
    if (credits < 5) {
      router.push('/credits')
      return
    }

    setCalculating(true)
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          askingPrice: aiPrice,
          rehabEstimates: aiRehab,
          location: aiLocation,
          propertyCondition: aiCondition,
          notes: aiNotes
        })
      })

      const data = await res.json()
      if (res.ok) {
        setAiResult(data)
        confetti({ particleCount: 120, spread: 70 })
        await fetchCredits()
      } else {
        alert(data.error || 'Failed to complete AI valuation.')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setCalculating(false)
    }
  }

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex flex-col items-center justify-center p-12">
          <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-4" />
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{t("Syncing Ledger...")}</p>
        </div>
      </SidebarLayout>
    )
  }

  return (
    <SidebarLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Banner */}
        <div className="flex justify-between items-center border-b border-gray-900 pb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white mb-1">
              {t("Credit-Locked Calculators")}
            </h1>
            <p className="text-xs text-gray-400">
              {t("Double-spend transactions are prevented on-chain. Standard math uses ")}<span className="text-emerald-400 font-bold">{t("2 Credits 🪙")}</span>{t(", AI uses ")}<span className="text-violet-400 font-bold">{t("5 Credits 🔮")}</span>{t(".")}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-gray-800">
            <Coins className="w-4 h-4 text-emerald-400" />
            <span>{t("Balance:")} <span className="text-emerald-400">{credits}</span> {t("Credits")}</span>
          </div>
        </div>

        {/* Paywall Banner / Alert */}
        {creditsError && (
          <div className="glass-panel border-red-500/30 bg-red-500/5 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white">{t("Insufficient Calculator Credits")}</h4>
                <p className="text-[10px] text-gray-400">{t("You need at least 2 credits to perform standard calculations and 5 for AI reports.")}</p>
              </div>
            </div>
            <button
              onClick={handleBuyCredits}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow transition-colors shrink-0 cursor-pointer"
            >
              {t("Top Up Credits")}
            </button>
          </div>
        )}

        {/* Tab Controls */}
        <div className="flex border-b border-gray-900">
          <button
            onClick={() => setActiveTab('arv')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'arv'
                ? 'border-violet-500 text-violet-400'
                : 'border-transparent text-gray-500 hover:text-white'
            }`}
          >
            {t("After Repair Value (ARV)")}
          </button>
          <button
            onClick={() => setActiveTab('mao')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'mao'
                ? 'border-violet-500 text-violet-400'
                : 'border-transparent text-gray-500 hover:text-white'
            }`}
          >
            {t("Maximum Allowable Offer (MAO)")}
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1 ${
              activeTab === 'ai'
                ? 'border-violet-500 text-violet-400'
                : 'border-transparent text-gray-500 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t("AI Deal Analyzer")}</span>
          </button>
        </div>

        {/* Calculator Grid */}
        <div className="grid md:grid-cols-2 gap-6 items-start">
          {/* Form Side */}
          <div className="glass-panel border border-gray-900 rounded-xl p-5">
            {activeTab === 'arv' ? (
              <form onSubmit={handleCalculateARV} className="space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-violet-400" />
                  <span>{t("ARV Estimator")}</span>
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                      {t("Comp #1 Sold Price ($)")}
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 240000"
                      value={comp1}
                      onChange={(e) => setComp1(e.target.value)}
                      className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                      {t("Comp #2 Sold Price ($)")}
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 255000"
                      value={comp2}
                      onChange={(e) => setComp2(e.target.value)}
                      className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                      {t("Comp #3 Sold Price ($)")}
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 235000"
                      value={comp3}
                      onChange={(e) => setComp3(e.target.value)}
                      className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                      {t("Estimated Repair Condition")}
                    </label>
                    <select
                      value={propertyCondition}
                      onChange={(e: any) => setPropertyCondition(e.target.value)}
                      className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-300 focus:outline-none focus:border-violet-500"
                    >
                      <option value="excellent">{t("Excellent Condition (+10% to Comp avg)")}</option>
                      <option value="average">{t("Average Condition (+0%)")}</option>
                      <option value="poor">{t("Poor Condition (-15% to Comp avg)")}</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={calculating || credits < 2}
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow shadow-violet-950/20 disabled:opacity-40 cursor-pointer"
                >
                  {calculating ? t("Analyzing...") : t("Calculate ARV (-2 Credits)")}
                </button>
              </form>
            ) : activeTab === 'mao' ? (
              <form onSubmit={handleCalculateMAO} className="space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  <span>{t("MAO 70% Calculator")}</span>
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                      {t("After Repair Value / ARV ($)")}
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 300000"
                      value={maoArv}
                      onChange={(e) => setMaoArv(e.target.value)}
                      className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                      {t("Estimated Rehab Cost ($)")}
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 45000"
                      value={rehabCost}
                      onChange={(e) => setRehabCost(e.target.value)}
                      className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                      {t("Wholesale Assignment Fee Target ($)")}
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 10000"
                      value={wholesaleFee}
                      onChange={(e) => setWholesaleFee(e.target.value)}
                      className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={calculating || credits < 2}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow shadow-emerald-950/20 disabled:opacity-40 cursor-pointer"
                >
                  {calculating ? t("Deducting...") : t("Calculate MAO (-2 Credits)")}
                </button>
              </form>
            ) : (
              <form onSubmit={handleCalculateAI} className="space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sparkle className="w-4 h-4 text-violet-400" />
                  <span>{t("AI Deal Analyzer")}</span>
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                      {t("Property Location / Address")}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 789 Maple Rd, Atlanta GA"
                      value={aiLocation}
                      onChange={(e) => setAiLocation(e.target.value)}
                      className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                        {t("Asking Price ($)")}
                      </label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 195000"
                        value={aiPrice}
                        onChange={(e) => setAiPrice(e.target.value)}
                        className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                        {t("Est. Rehab ($)")}
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 40000"
                        value={aiRehab}
                        onChange={(e) => setAiRehab(e.target.value)}
                        className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                      {t("Property Condition")}
                    </label>
                    <select
                      value={aiCondition}
                      onChange={(e: any) => setAiCondition(e.target.value)}
                      className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-300 focus:outline-none focus:border-violet-500"
                    >
                      <option value="average">{t("Average Condition")}</option>
                      <option value="poor">{t("Poor (Needs Heavy Renovation)")}</option>
                      <option value="excellent">{t("Excellent (Cosmetic Touches Only)")}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                      {t("Notes / Motivated Seller Info")}
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Inherited property. Needs roof inspection and cosmetic updates."
                      value={aiNotes}
                      onChange={(e) => setAiNotes(e.target.value)}
                      className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={calculating || credits < 5}
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow shadow-violet-950/20 disabled:opacity-40 cursor-pointer"
                >
                  {calculating ? t("Analyzing with AI...") : t("Run AI Property Check (-5 Credits)")}
                </button>
              </form>
            )}
          </div>

          {/* Results Side */}
          <div className="glass-panel border border-gray-900 rounded-xl p-5 min-h-[380px] flex flex-col justify-center">
            {activeTab === 'arv' ? (
              arvResult !== null ? (
                <div className="space-y-6 text-center animate-fade-in">
                  <div className="inline-flex p-3 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
                    <TrendingUp className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">{t("Estimated After Repair Value")}</div>
                    <div className="text-3xl font-black text-white">${arvResult.toLocaleString()}</div>
                  </div>
                  <div className="bg-slate-950/80 border border-gray-900 rounded-lg p-4 text-left max-w-sm mx-auto space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">{t("Comp Average:")}</span>
                      <span className="text-gray-300 font-bold">
                        ${Math.round((Number(comp1) + Number(comp2) + Number(comp3)) / 3).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">{t("Condition adjustment:")}</span>
                      <span className={`font-bold ${
                        propertyCondition === 'excellent' ? 'text-emerald-400' : propertyCondition === 'poor' ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {propertyCondition === 'excellent' ? '+10%' : propertyCondition === 'poor' ? '-15%' : '0%'}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 max-w-xs mx-auto leading-relaxed">
                    {t("This estimate represents the potential market value after renovations. Use this ARV to calculate your MAO.")}
                  </p>
                </div>
              ) : (
                <div className="text-center space-y-2 text-gray-600 p-8">
                  <Calculator className="w-8 h-8 mx-auto opacity-30 mb-2" />
                  <h4 className="text-xs font-bold text-gray-400">{t("Awaiting Calculation inputs")}</h4>
                  <p className="text-[10px] max-w-xs mx-auto leading-relaxed">{t("Enter comparable sales details and submit the form to estimate the property value.")}</p>
                </div>
              )
            ) : activeTab === 'mao' ? (
              maoResult !== null ? (
                <div className="space-y-6 text-center animate-fade-in">
                  <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">{t("Maximum Allowable Offer")}</div>
                    <div className="text-3xl font-black text-emerald-400">${maoResult.mao.toLocaleString()}</div>
                  </div>
                  <div className="bg-slate-950/80 border border-gray-900 rounded-lg p-4 text-left max-w-sm mx-auto space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">{t("70% Value limit:")}</span>
                      <span className="text-gray-300 font-bold">${Math.round(Number(maoArv) * 0.70).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500">{t("Target wholesale fee:")}</span>
                      <span className="text-violet-400 font-bold">${Number(wholesaleFee).toLocaleString()}</span>
                    </div>
                    <div className="h-px bg-gray-900" />
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400 font-bold">{t("Estimated Buyer Margin:")}</span>
                      <span className="text-emerald-400 font-bold">${maoResult.margin.toLocaleString()}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 max-w-xs mx-auto leading-relaxed">
                    {t("Offering more than ")}<span className="text-white font-bold">${maoResult.mao.toLocaleString()}</span>{t(" increases risk and reduces the attractiveness to buyer cash lists.")}
                  </p>
                </div>
              ) : (
                <div className="text-center space-y-2 text-gray-600 p-8">
                  <Calculator className="w-8 h-8 mx-auto opacity-30 mb-2" />
                  <h4 className="text-xs font-bold text-gray-400">{t("Awaiting Calculation inputs")}</h4>
                  <p className="text-[10px] max-w-xs mx-auto leading-relaxed">{t("Enter ARV and rehab inputs to calculate your maximum safe acquisition offer limit.")}</p>
                </div>
              )
            ) : (
              aiResult !== null ? (
                <div className="space-y-5 animate-fade-in text-left p-2 max-h-[380px] overflow-y-auto no-scrollbar">
                  <div className="flex items-center gap-2 border-b border-gray-900 pb-3">
                    <div className="p-1.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
                      <Sparkle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{t("AI Property Audit")}</h4>
                      <p className="text-[9px] text-gray-500">{aiLocation}</p>
                    </div>
                  </div>

                  {/* Top Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-950 p-2 rounded-lg border border-gray-900">
                      <div className="text-[8px] uppercase text-gray-500">{t("Est. ARV")}</div>
                      <div className="text-xs font-black text-white">${aiResult.estimatedArv.toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-lg border border-gray-900">
                      <div className="text-[8px] uppercase text-gray-500">{t("Est. Rehab")}</div>
                      <div className="text-xs font-bold text-amber-500">${aiResult.estimatedRehab.toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-lg border border-gray-900">
                      <div className="text-[8px] uppercase text-gray-500">{t("Rec. MAO")}</div>
                      <div className="text-xs font-black text-emerald-400">${aiResult.suggestedMao.toLocaleString()}</div>
                    </div>
                  </div>

                  {/* Scores */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between items-center text-[9px] mb-1 font-semibold">
                        <span className="text-gray-400">{t("RISK SCORE")}</span>
                        <span className={aiResult.riskScore > 5 ? 'text-red-400' : 'text-emerald-400'}>{aiResult.riskScore}/10</span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${aiResult.riskScore > 5 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                          style={{ width: `${aiResult.riskScore * 10}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-[9px] mb-1 font-semibold">
                        <span className="text-gray-400">{t("DEAL QUALITY")}</span>
                        <span className="text-violet-400">{aiResult.dealQualityScore}/10</span>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-violet-500 transition-all" 
                          style={{ width: `${aiResult.dealQualityScore * 10}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Negotiation suggestions */}
                  <div className="space-y-2">
                    <h5 className="text-[9px] uppercase font-bold text-gray-500">{t("Negotiation Strategy")}</h5>
                    <ul className="space-y-1.5 text-[10px] text-gray-300">
                      {aiResult.negotiationSuggestions.map((item, idx) => (
                        <li key={idx} className="flex gap-1.5 items-start">
                          <span className="text-violet-400 shrink-0 select-none">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Suitability */}
                  <div className="space-y-1 bg-slate-950 p-3 rounded-lg border border-gray-900">
                    <h5 className="text-[9px] uppercase font-bold text-gray-500">{t("Buyer Suitability")}</h5>
                    <p className="text-[10px] text-gray-400 leading-relaxed">{aiResult.buyerSuitability}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-2 text-gray-600 p-8">
                  <Sparkles className="w-8 h-8 mx-auto opacity-30 mb-2 text-violet-400 animate-pulse" />
                  <h4 className="text-xs font-bold text-gray-400">{t("Awaiting AI evaluation")}</h4>
                  <p className="text-[10px] max-w-xs mx-auto leading-relaxed">{t("Enter property specifications and run the analysis to generate custom reports and negotiation tips.")}</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </SidebarLayout>
  )
}
