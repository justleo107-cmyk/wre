/* eslint-disable */
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SidebarLayout from '@/components/dashboard/SidebarLayout'
import { createClient } from '@/lib/supabase/client'
import { deductCredits } from '@/lib/gamification'
import { 
  Calculator, 
  HelpCircle, 
  Sparkles, 
  TrendingUp, 
  Coins, 
  AlertCircle, 
  Check, 
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkle,
  Gauge,
  Search,
  Trash2,
  Eye,
  X,
  History,
  Pencil
} from 'lucide-react'
import confetti from 'canvas-confetti'

const t = (key: string) => key

export default function CalculatorsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'arv' | 'mao'>('arv')
  const [credits, setCredits] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [creditsError, setCreditsError] = useState(false)
  const [isUnlimitedMath, setIsUnlimitedMath] = useState(false)

  // ARV Calculator Form State
  const [arvPropertyName, setArvPropertyName] = useState('')
  const [comp1, setComp1] = useState('')
  const [comp2, setComp2] = useState('')
  const [comp3, setComp3] = useState('')
  const [estimatedRepairs, setEstimatedRepairs] = useState('')
  const [calculatedRepairs, setCalculatedRepairs] = useState<number>(0)
  const [arvResult, setArvResult] = useState<number | null>(null)

  // History States
  const [arvHistory, setArvHistory] = useState<any[]>([])
  const [maoHistory, setMaoHistory] = useState<any[]>([])
  const [aiHistory, setAiHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [selectedArvHistoryId, setSelectedArvHistoryId] = useState('')

  // Search, Pagination, View Detail States
  const [searchQuery, setSearchQuery] = useState('')
  const [arvPage, setArvPage] = useState(1)
  const [maoPage, setMaoPage] = useState(1)
  const [viewingRecord, setViewingRecord] = useState<{ type: 'arv' | 'mao'; record: any } | null>(null)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')

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

  // Load available credits from profile
  const fetchCredits = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('arv_credits, mao_credits, ai_uses_remaining, unlimited_math_until')
      .eq('id', user.id)
      .single()

    if (profile) {
      const isUnlimited = profile.unlimited_math_until && new Date(profile.unlimited_math_until) > new Date()
      setIsUnlimitedMath(!!isUnlimited)

      let currentBal = 0
      let required = 2
      if (activeTab === 'arv') {
        currentBal = profile.arv_credits || 0
        required = 2
      } else if (activeTab === 'mao') {
        currentBal = profile.mao_credits || 0
        required = 2
      }

      setCredits(currentBal)
      if (isUnlimited) {
        setCreditsError(false)
      } else {
        setCreditsError(currentBal < required)
      }
    }
  }

  const fetchHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Fetch ARV History
    const { data: arvData } = await supabase
      .from('arv_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (arvData) setArvHistory(arvData)

    // 2. Fetch MAO History
    const { data: maoData } = await supabase
      .from('mao_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (maoData) setMaoHistory(maoData)

    // 3. Fetch AI History
    const { data: aiData } = await supabase
      .from('ai_analysis_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (aiData) setAiHistory(aiData)

    setLoadingHistory(false)
  }

  useEffect(() => {
    Promise.all([fetchCredits(), fetchHistory()]).then(() => setLoading(false))
  }, [activeTab])

  useEffect(() => {
    setIsEditingName(false)
    setEditedName('')
  }, [viewingRecord])

  const handleBuyCredits = () => {
    router.push('/credits')
  }

  // Calculate ARV
  const handleCalculateARV = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!arvPropertyName.trim()) {
      alert('Property Name or Address is required.')
      return
    }
    if (!isUnlimitedMath && credits < 2) {
      setCreditsError(true)
      return
    }

    setCalculating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Deduct 2 credits via gamification helper
      const { success } = await deductCredits(supabase, user.id, 'arv', 2, 'ARV Calculation Run')

      if (!success) {
        setCreditsError(true)
        setCalculating(false)
        return
      }

      // Perform math logic
      const val1 = Number(comp1)
      const val2 = Number(comp2)
      const val3 = Number(comp3)
      const repairs = Number(estimatedRepairs) || 0
      const average = (val1 + val2 + val3) / 3

      const calculatedArv = Math.round(average)
      setArvResult(calculatedArv)
      setCalculatedRepairs(repairs)

      // Save to Supabase arv_history (using upsert to avoid duplicates and update existing)
      await supabase
        .from('arv_history')
        .upsert({
          user_id: user.id,
          property_name: arvPropertyName.trim(),
          comp_1: val1,
          comp_2: val2,
          comp_3: val3,
          estimated_repairs: repairs,
          calculated_arv: calculatedArv
        }, {
          onConflict: 'user_id, property_name'
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
      await fetchHistory()
    } catch (err) {
      console.error(err)
    } finally {
      setCalculating(false)
    }
  }

  // Calculate MAO
  const handleCalculateMAO = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedArvHistoryId) {
      alert('Please select a property from your ARV history.')
      return
    }
    if (!isUnlimitedMath && credits < 2) {
      setCreditsError(true)
      return
    }

    setCalculating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Deduct 2 credits via gamification helper
      const { success } = await deductCredits(supabase, user.id, 'mao', 2, 'MAO Calculation Run')

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

      // Get property name from selected history
      const matchedProperty = arvHistory.find(x => x.id === selectedArvHistoryId)
      const propertyName = matchedProperty ? matchedProperty.property_name : 'Unknown Property'

      // Save to Supabase mao_history
      await supabase
        .from('mao_history')
        .insert({
          user_id: user.id,
          property_name: propertyName,
          arv,
          estimated_repairs: rehab,
          assignment_fee: fee,
          calculated_mao: mao
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
      await fetchHistory()
    } catch (err) {
      console.error(err)
    } finally {
      setCalculating(false)
    }
  }

  // Calculate AI Deal Analysis
  const handleCalculateAI = async (e: React.FormEvent) => {
    e.preventDefault()
    if (credits < 1) {
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
        
        // Save to Supabase ai_analysis_history
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('ai_analysis_history')
            .insert({
              user_id: user.id,
              property_name: aiLocation.trim(),
              analysis_score: data.dealQualityScore || 0,
              analysis_summary: data.buyerSuitability || ''
            })
        }

        confetti({ particleCount: 120, spread: 70 })
        await fetchCredits()
        await fetchHistory()
      } else {
        alert(data.error || 'Failed to complete AI valuation.')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setCalculating(false)
    }
  }

  const handleDeleteRecord = async (type: 'arv' | 'mao', id: string) => {
    if (!confirm('Are you sure you want to permanently delete this calculation from your history?')) return

    const tableMap = {
      arv: 'arv_history',
      mao: 'mao_history',
      ai: 'ai_analysis_history'
    } as const

    const { error } = await supabase
      .from(tableMap[type])
      .delete()
      .eq('id', id)

    if (error) {
      alert('Failed to delete history record: ' + error.message)
    } else {
      await fetchHistory()
      if (viewingRecord?.record.id === id) {
        setViewingRecord(null)
      }
    }
  }

  const handleSaveName = async () => {
    if (!viewingRecord || !editedName.trim()) return
    const recordId = viewingRecord.record.id
    const table = viewingRecord.type === 'arv' ? 'arv_history' : 'mao_history'

    const { error } = await supabase
      .from(table)
      .update({ property_name: editedName.trim() })
      .eq('id', recordId)

    if (error) {
      alert('Failed to update property name: ' + error.message)
    } else {
      setViewingRecord({
        ...viewingRecord,
        record: {
          ...viewingRecord.record,
          property_name: editedName.trim()
        }
      })
      setIsEditingName(false)
      await fetchHistory()
    }
  }

  // Filter history lists by search query
  const filteredArv = arvHistory.filter(x => 
    x.property_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredMao = maoHistory.filter(x => 
    x.property_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Pagination config
  const ITEMS_PER_PAGE = 5

  const arvTotalPages = Math.ceil(filteredArv.length / ITEMS_PER_PAGE) || 1
  const maoTotalPages = Math.ceil(filteredMao.length / ITEMS_PER_PAGE) || 1

  const currentArvPage = Math.min(arvPage, arvTotalPages)
  const currentMaoPage = Math.min(maoPage, maoTotalPages)

  const arvSlice = filteredArv.slice((currentArvPage - 1) * ITEMS_PER_PAGE, currentArvPage * ITEMS_PER_PAGE)
  const maoSlice = filteredMao.slice((currentMaoPage - 1) * ITEMS_PER_PAGE, currentMaoPage * ITEMS_PER_PAGE)

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
              {t("Double-spend transactions are prevented on-chain. Standard math uses ")}<span className="text-emerald-400 font-bold">{t("2 Credits 🪙")}</span>{t(".")}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-gray-800">
            <Coins className="w-4 h-4 text-emerald-400" />
            <span>
              {t("Credits Balance:")}{' '}
              <span className="text-emerald-400">{credits}</span>{' '}
              {t("Credits")}
            </span>
          </div>
        </div>

        {/* Unlimited Math Perk Active Banner */}
        {isUnlimitedMath && (activeTab === 'arv' || activeTab === 'mao') && (
          <div className="glass-panel border-violet-500/30 bg-violet-500/5 rounded-xl p-4 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-violet-400 animate-pulse shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-white">{t("Market Operator Perk Active")}</h4>
              <p className="text-[10px] text-gray-400">
                {t("You have unlocked unlimited free calculations on ARV and MAO estimators as a Market Operator.")}
              </p>
            </div>
          </div>
        )}

        {/* Paywall Banner / Alert */}
        {creditsError && (
          <div className="glass-panel border-red-500/30 bg-red-500/5 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white">{t("Insufficient Calculator Credits")}</h4>
                <p className="text-[10px] text-gray-400">
                  {t("You need at least 2 credits to perform standard calculations.")}
                </p>
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
                      {t("Property Name or Address")}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 123 Main St Dallas TX"
                      value={arvPropertyName}
                      onChange={(e) => setArvPropertyName(e.target.value)}
                      className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
                    />
                  </div>

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
                      {t("Estimated Repairs ($)")}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 25,000"
                      value={estimatedRepairs ? Number(estimatedRepairs).toLocaleString() : ''}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\D/g, '')
                        setEstimatedRepairs(clean)
                      }}
                      className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={calculating || (!isUnlimitedMath && credits < 2)}
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow shadow-violet-950/20 disabled:opacity-40 cursor-pointer"
                >
                  {calculating ? t("Analyzing...") : isUnlimitedMath ? t("Calculate ARV (Free Run)") : t("Calculate ARV (-2 Credits)")}
                </button>
              </form>
                        ) : (
              <form onSubmit={handleCalculateMAO} className="space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  <span>{t("MAO 70% Calculator")}</span>
                </h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                      {t("Select Property (ARV History)")}
                    </label>
                    <select
                      required
                      value={selectedArvHistoryId}
                      onChange={(e) => {
                        const id = e.target.value
                        setSelectedArvHistoryId(id)
                        const matched = arvHistory.find(x => x.id === id)
                        if (matched) {
                          setMaoArv(String(matched.calculated_arv))
                          setRehabCost(String(matched.estimated_repairs))
                        } else {
                          setMaoArv('')
                          setRehabCost('')
                        }
                      }}
                      className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-300 focus:outline-none focus:border-violet-500"
                    >
                      <option value="">{t("-- Select a Property --")}</option>
                      {arvHistory.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.property_name} (ARV: ${item.calculated_arv.toLocaleString()}, Repairs: ${item.estimated_repairs.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                      {t("After Repair Value / ARV ($)")}
                    </label>
                    <input
                      type="text"
                      disabled
                      value={maoArv ? Number(maoArv).toLocaleString() : ''}
                      className="w-full bg-slate-900/30 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                      {t("Estimated Rehab Cost ($)")}
                    </label>
                    <input
                      type="text"
                      disabled
                      value={rehabCost ? Number(rehabCost).toLocaleString() : ''}
                      className="w-full bg-slate-900/30 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">
                      {t("Wholesale Assignment Fee Target ($)")}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 10,000"
                      value={wholesaleFee ? Number(wholesaleFee).toLocaleString() : ''}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\D/g, '')
                        setWholesaleFee(clean)
                      }}
                      className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={calculating || (!isUnlimitedMath && credits < 2)}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow shadow-emerald-950/20 disabled:opacity-40 cursor-pointer"
                >
                  {calculating ? t("Deducting...") : isUnlimitedMath ? t("Calculate MAO (Free Run)") : t("Calculate MAO (-2 Credits)")}
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
                      <span className="text-gray-500">{t("Estimated Repairs:")}</span>
                      <span className="text-violet-400 font-bold">
                        ${calculatedRepairs.toLocaleString()}
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
                        ) : (
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
            )}
          </div>
        </div>

        {/* Calculation History Section */}
        <div className="glass-panel border border-gray-900 rounded-xl p-5 mt-8 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-900">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-violet-400" />
                <span>{activeTab === 'arv' ? t("ARV Calculation History") : t("MAO Calculation History")}</span>
              </h3>
              <p className="text-[10px] text-gray-500 mt-1">
                {t("Review, search, and manage your past calculations.")}
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={t("Search by property...")}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setArvPage(1)
                  setMaoPage(1)
                }}
                className="w-full sm:w-48 bg-slate-950 border border-gray-800 rounded-lg py-1.5 pl-9 pr-3 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {/* History Data Table */}
          <div className="overflow-x-auto">
            {activeTab === 'arv' ? (
              arvSlice.length > 0 ? (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-900 text-gray-500 text-[10px] uppercase font-semibold">
                      <th className="py-2 px-3">{t("Property Name / Address")}</th>
                      <th className="py-2 px-3">{t("Calculated ARV")}</th>
                      <th className="py-2 px-3">{t("Estimated Repairs")}</th>
                      <th className="py-2 px-3">{t("Date")}</th>
                      <th className="py-2 px-3 text-right">{t("Actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-900 text-gray-300">
                    {arvSlice.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-900/40">
                        <td className="py-3 px-3 font-semibold text-white truncate max-w-[200px]">{item.property_name}</td>
                        <td className="py-3 px-3 font-bold text-violet-400">${item.calculated_arv?.toLocaleString()}</td>
                        <td className="py-3 px-3">${item.estimated_repairs?.toLocaleString()}</td>
                        <td className="py-3 px-3 text-gray-500">{new Date(item.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-3 text-right space-x-2">
                          <button
                            onClick={() => setViewingRecord({ type: 'arv', record: item })}
                            className="inline-flex items-center gap-1 bg-slate-950 hover:bg-slate-900 border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white text-[10px] font-semibold py-1 px-2.5 rounded transition-all cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>{t("View")}</span>
                          </button>
                          <button
                            onClick={() => handleDeleteRecord('arv', item.id)}
                            className="inline-flex items-center gap-1 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 hover:border-red-900/50 text-red-400 text-[10px] font-semibold py-1 px-2.5 rounded transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{t("Delete")}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8 text-gray-600 text-xs">
                  {t("No ARV calculations found.")}
                </div>
              )
            ) : (
              maoSlice.length > 0 ? (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-900 text-gray-500 text-[10px] uppercase font-semibold">
                      <th className="py-2 px-3">{t("Property Name / Address")}</th>
                      <th className="py-2 px-3">{t("Calculated MAO")}</th>
                      <th className="py-2 px-3">{t("ARV")}</th>
                      <th className="py-2 px-3">{t("Assignment Fee")}</th>
                      <th className="py-2 px-3">{t("Date")}</th>
                      <th className="py-2 px-3 text-right">{t("Actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-900 text-gray-300">
                    {maoSlice.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-900/40">
                        <td className="py-3 px-3 font-semibold text-white truncate max-w-[200px]">{item.property_name}</td>
                        <td className="py-3 px-3 font-bold text-emerald-400">${item.calculated_mao?.toLocaleString()}</td>
                        <td className="py-3 px-3">${item.arv?.toLocaleString()}</td>
                        <td className="py-3 px-3">${item.assignment_fee?.toLocaleString()}</td>
                        <td className="py-3 px-3 text-gray-500">{new Date(item.created_at).toLocaleDateString()}</td>
                        <td className="py-3 px-3 text-right space-x-2">
                          <button
                            onClick={() => setViewingRecord({ type: 'mao', record: item })}
                            className="inline-flex items-center gap-1 bg-slate-950 hover:bg-slate-900 border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white text-[10px] font-semibold py-1 px-2.5 rounded transition-all cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>{t("View")}</span>
                          </button>
                          <button
                            onClick={() => handleDeleteRecord('mao', item.id)}
                            className="inline-flex items-center gap-1 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 hover:border-red-900/50 text-red-400 text-[10px] font-semibold py-1 px-2.5 rounded transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>{t("Delete")}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8 text-gray-600 text-xs">
                  {t("No MAO calculations found.")}
                </div>
              )
            )}
          </div>

          {/* Pagination Controls */}
          {activeTab === 'arv' && arvTotalPages > 1 && (
            <div className="flex justify-between items-center pt-4 border-t border-gray-900">
              <span className="text-[10px] text-gray-500">
                {t("Page")} {currentArvPage} {t("of")} {arvTotalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={currentArvPage === 1}
                  onClick={() => setArvPage(p => Math.max(1, p - 1))}
                  className="p-1 rounded bg-slate-950 border border-gray-800 text-gray-400 hover:text-white disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={currentArvPage === arvTotalPages}
                  onClick={() => setArvPage(p => Math.min(arvTotalPages, p + 1))}
                  className="p-1 rounded bg-slate-950 border border-gray-800 text-gray-400 hover:text-white disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'mao' && maoTotalPages > 1 && (
            <div className="flex justify-between items-center pt-4 border-t border-gray-900">
              <span className="text-[10px] text-gray-500">
                {t("Page")} {currentMaoPage} {t("of")} {maoTotalPages}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={currentMaoPage === 1}
                  onClick={() => setMaoPage(p => Math.max(1, p - 1))}
                  className="p-1 rounded bg-slate-950 border border-gray-800 text-gray-400 hover:text-white disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={currentMaoPage === maoTotalPages}
                  onClick={() => setMaoPage(p => Math.min(maoTotalPages, p + 1))}
                  className="p-1 rounded bg-slate-950 border border-gray-800 text-gray-400 hover:text-white disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Detail Modal Overlay */}
        {viewingRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="glass-panel border border-gray-900 rounded-xl max-w-md w-full bg-slate-950 p-6 space-y-4 shadow-2xl relative">
              {/* Close Button */}
              <button
                onClick={() => setViewingRecord(null)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Modal Header */}
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded">
                  {viewingRecord.type === 'arv' ? t("ARV Calculation Details") : t("MAO Calculation Details")}
                </span>
                {isEditingName ? (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="bg-slate-900 border border-gray-800 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-violet-500 w-full font-semibold"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveName}
                      className="p-1.5 rounded bg-violet-600 hover:bg-violet-500 text-white cursor-pointer transition-colors"
                      title="Save"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setIsEditingName(false)}
                      className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-gray-400 hover:text-white cursor-pointer transition-colors"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-2">
                    <h3 className="text-sm font-black text-white break-words">
                      {viewingRecord.record.property_name}
                    </h3>
                    <button
                      onClick={() => {
                        setIsEditingName(true)
                        setEditedName(viewingRecord.record.property_name)
                      }}
                      className="text-gray-500 hover:text-violet-400 p-1 rounded transition-colors cursor-pointer"
                      title="Edit property name"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <p className="text-[10px] text-gray-500 mt-1">
                  {t("Calculated on")} {new Date(viewingRecord.record.created_at).toLocaleString()}
                </p>
              </div>

              {/* Modal Body */}
              <div className="space-y-4 border-t border-b border-gray-900 py-4 text-xs">
                {viewingRecord.type === 'arv' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-slate-900/60 border border-gray-900 p-2 rounded">
                        <span className="text-[8px] uppercase text-gray-500">{t("Comp #1")}</span>
                        <div className="text-xs font-bold text-white">${viewingRecord.record.comp_1?.toLocaleString()}</div>
                      </div>
                      <div className="bg-slate-900/60 border border-gray-900 p-2 rounded">
                        <span className="text-[8px] uppercase text-gray-500">{t("Comp #2")}</span>
                        <div className="text-xs font-bold text-white">${viewingRecord.record.comp_2?.toLocaleString()}</div>
                      </div>
                      <div className="bg-slate-900/60 border border-gray-900 p-2 rounded">
                        <span className="text-[8px] uppercase text-gray-500">{t("Comp #3")}</span>
                        <div className="text-xs font-bold text-white">${viewingRecord.record.comp_3?.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-900/60">
                      <span className="text-gray-500">{t("Average Comparable Value")}</span>
                      <span className="text-gray-300 font-semibold">
                        ${Math.round((viewingRecord.record.comp_1 + viewingRecord.record.comp_2 + viewingRecord.record.comp_3) / 3).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-900/60">
                      <span className="text-gray-500">{t("Estimated Repairs")}</span>
                      <span className="text-gray-300 font-semibold">${viewingRecord.record.estimated_repairs?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 bg-violet-500/5 px-2 rounded border border-violet-500/20">
                      <span className="text-gray-300 font-bold">{t("Calculated After Repair Value")}</span>
                      <span className="text-violet-400 font-extrabold text-sm">${viewingRecord.record.calculated_arv?.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {viewingRecord.type === 'mao' && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-900/60">
                      <span className="text-gray-500">{t("After Repair Value (ARV)")}</span>
                      <span className="text-gray-300 font-semibold">${viewingRecord.record.arv?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-900/60">
                      <span className="text-gray-500">{t("Estimated Repairs")}</span>
                      <span className="text-gray-300 font-semibold">${viewingRecord.record.estimated_repairs?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-900/60">
                      <span className="text-gray-500">{t("Target Wholesale Fee")}</span>
                      <span className="text-gray-300 font-semibold">${viewingRecord.record.assignment_fee?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-gray-900/60">
                      <span className="text-gray-500">{t("70% Value Limit")}</span>
                      <span className="text-gray-300 font-semibold">${Math.round(viewingRecord.record.arv * 0.7).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 bg-emerald-500/5 px-2 rounded border border-emerald-500/20">
                      <span className="text-gray-300 font-bold">{t("Maximum Allowable Offer (MAO)")}</span>
                      <span className="text-emerald-400 font-extrabold text-sm">${viewingRecord.record.calculated_mao?.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setViewingRecord(null)}
                  className="bg-slate-900 hover:bg-slate-850 border border-gray-800 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer"
                >
                  {t("Close")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  )
}
