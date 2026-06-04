'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SidebarLayout from '@/components/dashboard/SidebarLayout'
import { createClient } from '@/lib/supabase/client'
import { 
  Coins, 
  Sparkles, 
  HelpCircle, 
  Check, 
  ChevronRight, 
  Info,
  DollarSign,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  TrendingUp,
  Brain,
  X
} from 'lucide-react'
import confetti from 'canvas-confetti'

interface BundleItem {
  id: string
  credits: number
  price: string
  label: string
  badge?: string
  glowing: boolean
  desc: string
  arv: number
  mao: number
  ai: number
}

interface CreditTransaction {
  id: string
  date: string
  feature: string
  credits_used: number
  credits_added: number
  balance: number
}

export default function CreditsPage() {
  const router = useRouter()
  const supabase = createClient()
  
  // Balances
  const [arvCredits, setArvCredits] = useState<number>(0)
  const [maoCredits, setMaoCredits] = useState<number>(0)
  const [aiUses, setAiUses] = useState<number>(0)
  const [userSubscription, setUserSubscription] = useState<string>('free')
  const [unlimitedMathUntil, setUnlimitedMathUntil] = useState<string | null>(null)

  // History & States
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(true)
  
  // Checkout Modal State
  const [showCheckoutModal, setShowCheckoutModal] = useState<BundleItem | null>(null)
  const [processingPurchase, setProcessingPurchase] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (message: string) => {
    setToastMessage(message)
    setTimeout(() => {
      setToastMessage(null)
    }, 4000)
  }

  const fetchCreditsAndHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Fetch Profile Credits
    const { data: profile } = await supabase
      .from('profiles')
      .select('arv_credits, mao_credits, ai_uses_remaining, subscription_status, unlimited_math_until')
      .eq('id', user.id)
      .single()

    if (profile) {
      setArvCredits(profile.arv_credits || 0)
      setMaoCredits(profile.mao_credits || 0)
      setAiUses(profile.ai_uses_remaining || 0)
      setUserSubscription(profile.subscription_status || 'free')
      setUnlimitedMathUntil(profile.unlimited_math_until || null)
    }

    setLoading(false)

    // 2. Fetch Transaction History
    const { data: history } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })

    if (history) {
      setTransactions(history)
    }
    setLoadingHistory(false)
  }

  useEffect(() => {
    fetchCreditsAndHistory()
  }, [supabase])

  const handlePurchaseClick = (bundle: BundleItem) => {
    setShowCheckoutModal(bundle)
  }

  const handleConfirmPurchase = async () => {
    if (!showCheckoutModal) return
    setProcessingPurchase(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const creditsToAdd = showCheckoutModal.credits
      const newArv = arvCredits + showCheckoutModal.arv
      const newMao = maoCredits + showCheckoutModal.mao
      const newAi = aiUses + showCheckoutModal.ai

      const updatedFields = {
        arv_credits: newArv,
        mao_credits: newMao,
        ai_uses_remaining: newAi
      }
      
      const logFeature = `Purchase: ${showCheckoutModal.label} (+${showCheckoutModal.arv} ARV, +${showCheckoutModal.mao} MAO, +${showCheckoutModal.ai} AI)`

      // 1. Update Profile Credits
      const { error: profileErr } = await supabase
        .from('profiles')
        .update(updatedFields)
        .eq('id', user.id)

      if (profileErr) throw profileErr

      // 2. Log in credit_transactions
      const totalCombinedBalance = newArv + newMao + newAi
      const { error: txErr } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: user.id,
          feature: logFeature,
          credits_used: 0,
          credits_added: creditsToAdd,
          balance: totalCombinedBalance
        })

      if (txErr) throw txErr

      // 3. Log in credit_ledger for backward compatibility
      await supabase.from('credit_ledger').insert({
        user_id: user.id,
        transaction_type: 'allotment',
        credits_changed: creditsToAdd,
        description: logFeature
      })

      // Success
      confetti({ particleCount: 150, spread: 80 })
      setShowCheckoutModal(null)
      showToast(`Success! Added ${creditsToAdd} credits. Check your updated balances below!`)
      fetchCreditsAndHistory()
    } catch (err) {
      console.error('Error confirming credit purchase:', err)
      alert('Error processing payment check.')
    } finally {
      setProcessingPurchase(false)
    }
  }

  const bundles: BundleItem[] = [
    {
      id: "bundle_110",
      credits: 110,
      price: "$49.99",
      label: "Basic Package",
      glowing: false,
      desc: "Perfect for quick deals analysis and formula runs.",
      arv: 50,
      mao: 50,
      ai: 10
    },
    {
      id: "bundle_250",
      credits: 250,
      price: "$99.99",
      label: "Professional Bundle",
      badge: "Best Seller",
      glowing: true,
      desc: "Optimal value for active regional wholesalers.",
      arv: 100,
      mao: 100,
      ai: 50
    },
    {
      id: "bundle_500",
      credits: 500,
      price: "$199.99",
      label: "Enterprise Block",
      badge: "Save 20%",
      glowing: false,
      desc: "Maximum allowance for high-volume deal machines.",
      arv: 200,
      mao: 200,
      ai: 100
    }
  ]

  return (
    <SidebarLayout>
      <div className="max-w-5xl mx-auto space-y-10 pb-12 relative">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-50 animate-bounce">
            <div className="glass-panel border-emerald-500 bg-slate-900/90 shadow-[0_0_20px_rgba(16,185,129,0.3)] rounded-xl p-4 flex items-center gap-3 max-w-sm">
              <div className="p-2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-black text-white">Purchase Confirmed</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{toastMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-900 pb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white mb-1 flex items-center gap-2">
              <Coins className="w-6 h-6 text-emerald-400" />
              <span>Credits Balance & Ledger</span>
            </h1>
            <p className="text-xs text-gray-400">
              Manage your calculator credits, purchase additions, and trace transaction records.
            </p>
          </div>
          
          <div className="bg-slate-950/80 px-3.5 py-1.5 rounded-lg border border-gray-900 text-xs font-bold text-gray-400 flex items-center gap-2">
            <span className="text-[10px] text-gray-500 uppercase">Status:</span>
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
              userSubscription === 'active' 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
            }`}>
              {userSubscription === 'active' ? 'Subscriber' : 'Free Account'}
            </span>
          </div>
        </div>

        {/* Unlimited Math Runs Perk Banner */}
        {!loading && unlimitedMathUntil && new Date(unlimitedMathUntil) > new Date() && (
          <div className="glass-panel border-violet-500 bg-violet-905/10 shadow-[0_0_25px_rgba(139,92,246,0.12)] rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-violet-600/10 text-violet-400 border border-violet-500/20">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">Market Operator Perk Active</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  You have unlimited free math runs on ARV and MAO estimators until <span className="text-violet-400 font-extrabold">{new Date(unlimitedMathUntil).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>.
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/calculators')}
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-[10px] font-black px-4 py-2 rounded-lg tracking-wider uppercase shadow transition-all cursor-pointer"
            >
              Go to Calculators
            </button>
          </div>
        )}

        {/* Credit Buckets Display */}
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="w-8 h-8 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* ARV Credits */}
            <div className="glass-card rounded-2xl border border-gray-900 p-5 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">ARV Valuation Credits</span>
                <TrendingUp className="w-4 h-4 text-violet-400" />
              </div>
              <h3 className="text-3xl font-black text-white flex items-baseline gap-1 mt-2">
                <span>{arvCredits}</span>
                <span className="text-xs text-gray-500 font-semibold uppercase">Tokens</span>
              </h3>
              <p className="text-[10px] text-gray-400 leading-relaxed pt-1.5 border-t border-gray-950/60">
                Enough for <span className="text-violet-400 font-bold">{Math.floor(arvCredits / 2)}</span> comp calculations (2 credits each).
              </p>
            </div>

            {/* MAO Credits */}
            <div className="glass-card rounded-2xl border border-gray-900 p-5 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-600/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">MAO Formulas Credits</span>
                <Coins className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="text-3xl font-black text-white flex items-baseline gap-1 mt-2">
                <span>{maoCredits}</span>
                <span className="text-xs text-gray-500 font-semibold uppercase">Tokens</span>
              </h3>
              <p className="text-[10px] text-gray-400 leading-relaxed pt-1.5 border-t border-gray-950/60">
                Enough for <span className="text-emerald-400 font-bold">{Math.floor(maoCredits / 2)}</span> offer equations (2 credits each).
              </p>
            </div>

            {/* AI Analysis Remaining */}
            <div className="glass-card rounded-2xl border border-gray-900 p-5 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-600/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">AI Analyses Remaining</span>
                <Brain className="w-4 h-4 text-purple-400" />
              </div>
              <h3 className="text-3xl font-black text-white flex items-baseline gap-1 mt-2">
                <span>{aiUses}</span>
                <span className="text-xs text-gray-500 font-semibold uppercase">Runs</span>
              </h3>
              <p className="text-[10px] text-gray-400 leading-relaxed pt-1.5 border-t border-gray-950/60">
                Allows for <span className="text-purple-400 font-bold">{aiUses}</span> deal analysis runs (1 credit each).
              </p>
            </div>

          </div>
        )}

        {/* Top Up Bundle Cards */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Top Up Tokens (No Subscription Required)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {bundles.map((bundle) => (
              <div 
                key={bundle.id}
                className={`relative rounded-xl p-5 border flex flex-col justify-between transition-all duration-300 ${
                  bundle.glowing 
                    ? 'bg-slate-905 border-violet-500 shadow-[0_0_25px_rgba(139,92,246,0.12)] scale-[1.01]' 
                    : 'bg-slate-900/40 border-gray-900 hover:border-gray-800'
                }`}
              >
                {bundle.badge && (
                  <div className={`absolute -top-2.5 right-4 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    bundle.glowing 
                      ? 'bg-violet-600 text-white' 
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {bundle.badge}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wide block">{bundle.label}</span>
                    <h3 className="text-xl font-black text-white flex items-center gap-1.5 mt-1">
                      <span>{bundle.credits}</span>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Credits</span>
                    </h3>
                  </div>

                  <p className="text-[10px] text-gray-400 leading-relaxed min-h-[30px]">
                    {bundle.desc}
                  </p>

                  <div className="space-y-1.5 text-[9px] text-gray-400 bg-slate-950/40 p-2.5 rounded-lg border border-gray-900/50">
                    <div className="flex justify-between">
                      <span>ARV Credits:</span>
                      <span className="text-violet-400 font-bold">+{bundle.arv}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>MAO Credits:</span>
                      <span className="text-emerald-400 font-bold">+{bundle.mao}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>AI Analyses:</span>
                      <span className="text-purple-400 font-bold">+{bundle.ai}</span>
                    </div>
                  </div>

                  <div className="h-px bg-gray-950" />

                  <div>
                    <div className="text-xl font-black text-white">{bundle.price}</div>
                    <span className="text-[8px] text-gray-550 block mt-0.5">One-time checkout</span>
                  </div>
                </div>

                <button
                  onClick={() => handlePurchaseClick(bundle)}
                  className={`w-full text-[10px] font-black py-2 rounded-lg mt-6 cursor-pointer tracking-wider uppercase transition-all ${
                    bundle.glowing
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow shadow-violet-900/20'
                      : 'bg-slate-950 hover:bg-slate-900 text-gray-200 border border-gray-800'
                  }`}
                >
                  Buy Bundle
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Transactions Ledger */}
        <div className="glass-panel border-gray-900 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-900 pb-3">
            <Coins className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Full Transactions History</h3>
              <p className="text-[9px] text-gray-500 mt-0.5">Auditable record of all credits added or consumed.</p>
            </div>
          </div>

          {loadingHistory ? (
            <div className="text-center py-6 text-gray-500 text-xs">Syncing logs...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-10 text-xs text-gray-600">No transaction records found on this account.</div>
          ) : (
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto no-scrollbar">
              <table className="w-full text-left text-[10px] min-w-[500px]">
                <thead>
                  <tr className="border-b border-gray-905 text-gray-550 font-black uppercase tracking-wider">
                    <th className="py-2.5 px-2 font-bold">Date</th>
                    <th className="py-2.5 px-2 font-bold">Activity / Feature</th>
                    <th className="py-2.5 px-2 font-bold text-center">Used</th>
                    <th className="py-2.5 px-2 font-bold text-center">Added</th>
                    <th className="py-2.5 px-2 font-bold text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-950 text-gray-300">
                  {transactions.map((tx) => {
                    const txDate = new Date(tx.date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })

                    return (
                      <tr key={tx.id} className="hover:bg-slate-950/20">
                        <td className="py-2.5 px-2 font-medium text-gray-500">{txDate}</td>
                        <td className="py-2.5 px-2 font-bold text-white">{tx.feature}</td>
                        <td className="py-2.5 px-2 text-center text-red-400 font-bold">
                          {tx.credits_used > 0 ? `-${tx.credits_used}` : '—'}
                        </td>
                        <td className="py-2.5 px-2 text-center text-emerald-400 font-bold">
                          {tx.credits_added > 0 ? `+${tx.credits_added}` : '—'}
                        </td>
                        <td className="py-2.5 px-2 text-right font-black text-gray-400">{tx.balance} 🪙</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Credit Rules Breakdown */}
        <div className="glass-panel border-gray-900 rounded-xl p-5 max-w-xl mx-auto space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-900 pb-3">
            <Info className="w-4 h-4 text-violet-400" />
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Conversion & Valuation Rates</h3>
              <p className="text-[10px] text-gray-500 mt-0.5">Token deduction and default allowances.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 text-[10px] text-gray-400 leading-relaxed">
            <div className="space-y-2">
              <h4 className="font-bold text-white uppercase tracking-wider">Calculator Rates</h4>
              <ul className="space-y-1.5 list-disc list-inside">
                <li>ARV Calculation: <span className="text-emerald-400 font-bold">2 credits</span></li>
                <li>MAO Formula Run: <span className="text-emerald-400 font-bold">2 credits</span></li>
                <li>AI Deal Analysis: <span className="text-violet-400 font-bold">1 credit (1 run)</span></li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-white uppercase tracking-wider">Sign-up Allocations</h4>
              <ul className="space-y-1.5 list-disc list-inside">
                <li>Free: <span className="text-white">50 ARV / 50 MAO / 10 AI uses (110 Total)</span></li>
                <li>Subscriber: <span className="text-white">200 ARV / 200 MAO / 100 AI uses (500 Total)</span></li>
              </ul>
            </div>
          </div>
        </div>

      </div>

      {/* Simulated Stripe Checkout Allocation Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setShowCheckoutModal(null)}
            className="absolute inset-0 bg-black/85 backdrop-blur-sm"
          />
          
          <div className="relative glass-panel rounded-2xl border border-gray-800 w-full max-w-sm p-6 text-center z-10 animate-scale-up">
            <button 
              onClick={() => setShowCheckoutModal(null)}
              className="absolute top-4 right-4 p-1 rounded hover:bg-slate-900 text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="inline-flex p-3 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 mb-4">
              <Coins className="w-7 h-7" />
            </div>

            <h3 className="text-base font-extrabold text-white">Purchase Credits Bundle</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto mb-6">
              You are purchasing <span className="text-emerald-400 font-bold">{showCheckoutModal.credits} credits</span> for <span className="text-white font-bold">{showCheckoutModal.price}</span>. Credits will be automatically split into your account:
            </p>

            <div className="space-y-3 mb-6 text-left">
              {/* ARV Allocation Display */}
              <div className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-800 bg-slate-950/50 text-gray-300">
                <span className="text-xs font-semibold">ARV Credits</span>
                <span className="text-[10px] text-violet-400 font-black">+{showCheckoutModal.arv} ARV</span>
              </div>

              {/* MAO Allocation Display */}
              <div className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-800 bg-slate-950/50 text-gray-300">
                <span className="text-xs font-semibold">MAO Credits</span>
                <span className="text-[10px] text-emerald-400 font-black">+{showCheckoutModal.mao} MAO</span>
              </div>

              {/* AI Allocation Display */}
              <div className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-800 bg-slate-950/50 text-gray-300">
                <span className="text-xs font-semibold">AI Analyses</span>
                <span className="text-[10px] text-purple-400 font-black">+{showCheckoutModal.ai} Runs</span>
              </div>
            </div>

            <button
              onClick={handleConfirmPurchase}
              disabled={processingPurchase}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-650 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black py-2.5 rounded-lg shadow-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              {processingPurchase ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Simulate payment & checkout</span>
                  <ArrowUpRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

    </SidebarLayout>
  )
}
