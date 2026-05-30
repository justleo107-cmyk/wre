'use client'

import React, { useState, useEffect } from 'react'
import SidebarLayout from '@/components/dashboard/SidebarLayout'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, 
  MapPin, 
  TrendingUp, 
  Check, 
  ChevronRight, 
  Coins, 
  Sparkles
} from 'lucide-react'
import Link from 'next/link'
import confetti from 'canvas-confetti'
import { type Profile, type Deal, type Badge, type UserBadge } from '@/types/database'

export default function DashboardPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [deals, setDeals] = useState<Deal[]>([])
  const [badges, setBadges] = useState<Badge[]>([])
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const [stats, setStats] = useState({
    activeCount: 0,
    contractCount: 0,
    closedCount: 0,
    totalCreditsUsed: 0
  })
  const [loading, setLoading] = useState(true)
  const [updatingDealId, setUpdatingDealId] = useState<string | null>(null)

  useEffect(() => {
    async function loadDashboardData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load Profile
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)

      // Load User's Deals
      const { data: d } = await supabase
        .from('deals')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
      
      const loadedDeals = d || []
      setDeals(loadedDeals)

      // Calculate stats
      const active = loadedDeals.filter(x => x.status === 'active').length
      const contract = loadedDeals.filter(x => x.status === 'under_contract').length
      const closed = loadedDeals.filter(x => x.status === 'closed').length
      
      // Load Ledger deductions
      const { data: ledger } = await supabase
        .from('credit_ledger')
        .select('*')
        .eq('user_id', user.id)
        .eq('transaction_type', 'deduction')

      const totalDeducted = Math.abs(ledger?.reduce((acc, curr) => acc + curr.credits_changed, 0) || 0)

      setStats({
        activeCount: active,
        contractCount: contract,
        closedCount: closed,
        totalCreditsUsed: totalDeducted
      })

      // Load All Badges & User Badges
      const { data: allB } = await supabase.from('badges').select('*')
      const { data: userB } = await supabase.from('user_badges').select('*').eq('user_id', user.id)

      setBadges(allB || [])
      setUserBadges(userB || [])
      setLoading(false)
    }

    loadDashboardData()
  }, [supabase])

  const handleUpdateStatus = async (dealId: string, newStatus: 'active' | 'under_contract' | 'closed') => {
    setUpdatingDealId(dealId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('deals')
        .update({ status: newStatus })
        .eq('id', dealId)
        .eq('owner_id', user.id)

      if (error) throw error

      // Update local state
      const updatedDeals = deals.map(d => d.id === dealId ? { ...d, status: newStatus } : d)
      setDeals(updatedDeals)
      
      const active = updatedDeals.filter(x => x.status === 'active').length
      const contract = updatedDeals.filter(x => x.status === 'under_contract').length
      const closed = updatedDeals.filter(x => x.status === 'closed').length
      setStats(prev => ({ ...prev, activeCount: active, contractCount: contract, closedCount: closed }))

      // If status changed to closed, add +1000 XP & Award Closer Badge
      if (newStatus === 'closed') {
        confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } })
        
        // Add XP
        const newXp = (profile?.xp || 0) + 1000
        await supabase.from('profiles').update({ xp: newXp }).eq('id', user.id)
        setProfile((prev) => prev ? { ...prev, xp: newXp } : null)

        // Add Badge
        const { error: bErr } = await supabase.from('user_badges').insert({
          user_id: user.id,
          badge_id: 'closer-club',
          earned_at: new Date().toISOString()
        })
        if (!bErr) {
          setUserBadges(prev => [...prev, { user_id: user.id, badge_id: 'closer-club', earned_at: new Date().toISOString() }])
        }
      }
    } catch (err) {
      console.error('Error updating deal status:', err)
    } finally {
      setUpdatingDealId(null)
    }
  }

  // Group deals by status columns for the pipeline
  const pipeline = {
    active: deals.filter(d => d.status === 'active'),
    under_contract: deals.filter(d => d.status === 'under_contract'),
    closed: deals.filter(d => d.status === 'closed')
  }

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex flex-col items-center justify-center p-12">
          <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-4" />
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Syncing Dashboard workspace...</p>
        </div>
      </SidebarLayout>
    )
  }

  return (
    <SidebarLayout>
      <div className="space-y-8">
        {/* Welcome Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white mb-1">
              Hey, {profile?.full_name || 'User'}! 👋
            </h1>
            <p className="text-xs text-gray-400">
              Rank: <span className="text-violet-400 font-bold">{profile?.current_rank}</span> • Maintain your streak to multiplier XP gains!
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/deals?create=true"
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow-lg shadow-violet-950/20"
            >
              <Plus className="w-4 h-4" />
              <span>Post New JV Deal</span>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Sourced', val: stats.activeCount, desc: 'Under Analysis', color: 'border-l-violet-500' },
            { label: 'Under Contract', val: stats.contractCount, desc: 'Locked in Agreements', color: 'border-l-amber-500' },
            { label: 'Closed Assignments', val: stats.closedCount, desc: 'Paid Settlements', color: 'border-l-emerald-500' },
            { label: 'Calculations Run', val: stats.totalCreditsUsed / 2, desc: 'MAO & ARV Checks', color: 'border-l-blue-500' }
          ].map((stat, idx) => (
            <div key={idx} className={`glass-card rounded-xl p-4 border border-gray-900 border-l-4 ${stat.color}`}>
              <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">{stat.label}</div>
              <div className="text-2xl font-black text-white mb-0.5">{stat.val}</div>
              <div className="text-[10px] text-gray-400">{stat.desc}</div>
            </div>
          ))}
        </div>

        {/* Main Grid: Pipeline on Left, Gamification on Right */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Deal Pipeline Columns (ColSpan 2) */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">CRM Deal Pipeline</h2>
              <span className="text-[10px] text-gray-500 font-semibold">Click cards to transition status</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Column 1: Sourced (Active) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1.5">
                  <span className="text-xs font-bold text-violet-400">1. Under Analysis</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-bold">
                    {pipeline.active.length}
                  </span>
                </div>
                <div className="bg-slate-900/40 rounded-xl p-3 border border-gray-900 min-h-[300px] space-y-3">
                  {pipeline.active.length === 0 ? (
                    <div className="text-center py-12 text-[10px] text-gray-600 font-medium">No deals listed.</div>
                  ) : (
                    pipeline.active.map(deal => (
                      <div key={deal.id} className="glass-card rounded-lg p-3 border border-gray-800 hover:border-violet-500/30 group">
                        <div className="text-xs font-bold text-white mb-1 truncate">{deal.address}</div>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-3">
                          <MapPin className="w-3 h-3 text-gray-500" />
                          <span>{deal.city}, {deal.state}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] mb-3">
                          <span className="text-gray-400 font-medium">Price:</span>
                          <span className="text-emerald-400 font-bold">${Number(deal.asking_price).toLocaleString()}</span>
                        </div>
                        <button
                          disabled={updatingDealId === deal.id}
                          onClick={() => handleUpdateStatus(deal.id, 'under_contract')}
                          className="w-full bg-slate-950 hover:bg-violet-950/20 border border-gray-800 hover:border-violet-500/30 text-[10px] text-gray-400 hover:text-violet-400 font-bold py-1.5 rounded transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>Lock Agreement</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 2: Under Contract */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1.5">
                  <span className="text-xs font-bold text-amber-400">2. Under Contract</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                    {pipeline.under_contract.length}
                  </span>
                </div>
                <div className="bg-slate-900/40 rounded-xl p-3 border border-gray-900 min-h-[300px] space-y-3">
                  {pipeline.under_contract.length === 0 ? (
                    <div className="text-center py-12 text-[10px] text-gray-600 font-medium">No active contracts.</div>
                  ) : (
                    pipeline.under_contract.map(deal => (
                      <div key={deal.id} className="glass-card rounded-lg p-3 border border-gray-800 hover:border-amber-500/30">
                        <div className="text-xs font-bold text-white mb-1 truncate">{deal.address}</div>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-3">
                          <MapPin className="w-3 h-3 text-gray-500" />
                          <span>{deal.city}, {deal.state}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] mb-3">
                          <span className="text-gray-400 font-medium">Price:</span>
                          <span className="text-amber-400 font-bold">${Number(deal.asking_price).toLocaleString()}</span>
                        </div>
                        <button
                          disabled={updatingDealId === deal.id}
                          onClick={() => handleUpdateStatus(deal.id, 'closed')}
                          className="w-full bg-slate-950 hover:bg-emerald-950/20 border border-gray-800 hover:border-emerald-500/30 text-[10px] text-gray-400 hover:text-emerald-400 font-bold py-1.5 rounded transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>Complete Sale</span>
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 3: Closed */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1.5">
                  <span className="text-xs font-bold text-emerald-400">3. Closed / Settle</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    {pipeline.closed.length}
                  </span>
                </div>
                <div className="bg-slate-900/40 rounded-xl p-3 border border-gray-900 min-h-[300px] space-y-3">
                  {pipeline.closed.length === 0 ? (
                    <div className="text-center py-12 text-[10px] text-gray-600 font-medium">No settlements yet.</div>
                  ) : (
                    pipeline.closed.map(deal => (
                      <div key={deal.id} className="glass-card border-emerald-500/20 rounded-lg p-3 border bg-slate-900/20">
                        <div className="text-xs font-bold text-emerald-400 mb-1 truncate">{deal.address}</div>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-3">
                          <MapPin className="w-3 h-3 text-gray-500" />
                          <span>{deal.city}, {deal.state}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-gray-500">Assignment:</span>
                          <span className="text-emerald-400 font-black flex items-center gap-1">
                            Completed <Sparkles className="w-3 h-3 fill-emerald-400/20" />
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Gamification Sidebar Panel (ColSpan 1) */}
          <div className="space-y-6">
            {/* Quick Actions Drawer */}
            <div className="glass-panel border border-gray-900 rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Quick Sandbox</h3>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/calculators"
                  className="bg-slate-900 hover:bg-slate-800 border border-gray-800 hover:border-violet-500/30 text-center py-3 rounded-lg flex flex-col items-center justify-center gap-1 transition-all group"
                >
                  <TrendingUp className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold text-gray-300">ARV Estimate</span>
                </Link>
                <Link
                  href="/calculators"
                  className="bg-slate-900 hover:bg-slate-800 border border-gray-800 hover:border-emerald-500/30 text-center py-3 rounded-lg flex flex-col items-center justify-center gap-1 transition-all group"
                >
                  <Coins className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold text-gray-300">MAO Formula</span>
                </Link>
              </div>
            </div>

            {/* Badges Drawer */}
            <div className="glass-panel border border-gray-900 rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Earned Badges</h3>
                <span className="text-[10px] text-violet-400 font-bold">{userBadges.length} / {badges.length}</span>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {badges.map((badge) => {
                  const earned = userBadges.some(ub => ub.badge_id === badge.id)
                  return (
                    <div 
                      key={badge.id}
                      title={`${badge.name}: ${badge.description}`}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg border transition-all ${
                        earned 
                          ? 'bg-violet-600/10 border-violet-500/40 text-white shadow shadow-violet-950' 
                          : 'bg-slate-900/40 border-gray-900 text-gray-700 opacity-40'
                      }`}
                    >
                      {badge.icon}
                    </div>
                  )
                })}
              </div>

              {/* Show locked badges details */}
              <div className="space-y-2 pt-2 border-t border-gray-900/60 max-h-[160px] overflow-y-auto no-scrollbar">
                {badges.map((badge) => {
                  const earned = userBadges.some(ub => ub.badge_id === badge.id)
                  return (
                    <div key={badge.id} className="flex items-center gap-2 text-[10px]">
                      <span className={earned ? 'opacity-100' : 'opacity-40'}>{badge.icon}</span>
                      <div className="truncate">
                        <div className={`font-bold ${earned ? 'text-gray-200' : 'text-gray-600'}`}>{badge.name}</div>
                        <div className="text-[9px] text-gray-500 truncate">{badge.description}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  )
}
