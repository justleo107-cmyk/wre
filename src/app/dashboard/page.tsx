'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import SidebarLayout from '@/components/dashboard/SidebarLayout'
import { StatWidget } from '@/components/ui/StatWidget'
import { createClient } from '@/lib/supabase/client'
import { 
  Plus, 
  MapPin, 
  TrendingUp, 
  Coins, 
  MoreVertical,
  Edit2,
  Copy,
  Archive,
  Trash2,
  Calendar,
  X
} from 'lucide-react'
import Link from 'next/link'
import confetti from 'canvas-confetti'
import { type Profile, type Deal, type Badge, type UserBadge } from '@/types/database'
import { getRankAndLevel, awardXp, awardBadge } from '@/lib/gamification'

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
  const [, setUpdatingDealId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  // Action Menu State
  const [activeMenuDealId, setActiveMenuDealId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Modals
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [deletingDealId, setDeletingDealId] = useState<string | null>(null)

  // Edit Form Fields
  const [editForm, setEditForm] = useState({
    propertyName: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    askingPrice: '',
    dealValue: '',
    estimatedArv: '',
    estimatedMao: '',
    notes: ''
  })

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuDealId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadDashboardData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Load Profile
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(p)

    // Load User's unarchived deals
    const { data: d } = await supabase
      .from('deals')
      .select('*')
      .eq('owner_id', user.id)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
    
    const loadedDeals = d || []
    setDeals(loadedDeals)

    // Calculate stats
    const active = loadedDeals.filter(x => x.status === 'active').length
    const contract = loadedDeals.filter(x => x.status === 'under_contract').length
    const closed = loadedDeals.filter(x => x.status === 'closed').length
    
    // Load credit transactions deductions
    const { data: txs } = await supabase
      .from('credit_transactions')
      .select('credits_used')
      .eq('user_id', user.id)

    const totalDeducted = txs?.reduce((acc, curr) => acc + curr.credits_used, 0) || 0

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
  }, [supabase])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDashboardData()
    }, 0)

    // Check if redirect has checkout_success query
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('checkout_success') === 'true') {
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } })
      // Remove query parameters from URL without reloading
      const cleanUrl = window.location.pathname
      window.history.replaceState({}, document.title, cleanUrl)
    }

    return () => clearTimeout(timer)
  }, [loadDashboardData])

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

      // If status changed to closed, add +200 XP & Award Closer Badge
      if (newStatus === 'closed') {
        confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 } })
        
        // Award XP
        await awardXp(supabase, user.id, 200, 'Closed Assignment')
        
        // Award Badge
        await awardBadge(supabase, user.id, 'closer-club')

        // Reload data to reflect XP changes
        loadDashboardData()
      }
    } catch (err) {
      console.error('Error updating deal status:', err)
    } finally {
      setUpdatingDealId(null)
      setDragOverColumn(null)
    }
  }

  // Card Action Menu callbacks
  const handleOpenEdit = (deal: Deal) => {
    setEditingDeal(deal)
    setEditForm({
      propertyName: deal.property_name || '',
      address: deal.address || '',
      city: deal.city || '',
      state: deal.state || '',
      zip: deal.zip || '',
      askingPrice: deal.asking_price ? String(deal.asking_price) : '',
      dealValue: deal.deal_value ? String(deal.deal_value) : '',
      estimatedArv: deal.estimated_arv ? String(deal.estimated_arv) : '',
      estimatedMao: deal.estimated_mao ? String(deal.estimated_mao) : '',
      notes: deal.property_notes || ''
    })
    setActiveMenuDealId(null)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDeal) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('deals')
        .update({
          property_name: editForm.propertyName.trim() || editForm.address.trim(),
          address: editForm.address.trim(),
          city: editForm.city.trim(),
          state: editForm.state.trim().toUpperCase(),
          zip: editForm.zip.trim(),
          asking_price: Number(editForm.askingPrice),
          deal_value: Number(editForm.dealValue || editForm.askingPrice),
          estimated_arv: editForm.estimatedArv ? Number(editForm.estimatedArv) : null,
          estimated_mao: editForm.estimatedMao ? Number(editForm.estimatedMao) : null,
          property_notes: editForm.notes.trim()
        })
        .eq('id', editingDeal.id)
        .eq('owner_id', user.id)

      if (error) throw error

      setEditingDeal(null)
      loadDashboardData()
    } catch (err) {
      console.error('Error updating deal details:', err)
      alert('Error updating deal information.')
    }
  }

  const handleDuplicate = async (deal: Deal) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('deals')
        .insert({
          owner_id: user.id,
          property_name: `${deal.property_name || deal.address} (Copy)`,
          address: deal.address,
          city: deal.city,
          state: deal.state,
          zip: deal.zip,
          asking_price: deal.asking_price,
          deal_value: deal.deal_value || deal.asking_price,
          estimated_arv: deal.estimated_arv,
          estimated_rehab: deal.estimated_rehab,
          estimated_mao: deal.estimated_mao,
          property_notes: deal.property_notes,
          photo_urls: deal.photo_urls,
          status: deal.status,
          is_archived: false
        })

      if (error) throw error
      setActiveMenuDealId(null)
      loadDashboardData()
    } catch (err) {
      console.error('Error duplicating deal:', err)
    }
  }

  const handleArchive = async (dealId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('deals')
        .update({ is_archived: true })
        .eq('id', dealId)
        .eq('owner_id', user.id)

      if (error) throw error
      setActiveMenuDealId(null)
      loadDashboardData()
    } catch (err) {
      console.error('Error archiving deal:', err)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deletingDealId) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('deals')
        .delete()
        .eq('id', deletingDealId)
        .eq('owner_id', user.id)

      if (error) throw error
      setDeletingDealId(null)
      loadDashboardData()
    } catch (err) {
      console.error('Error deleting deal:', err)
    }
  }

  // HTML5 Drag & Drop Logic
  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData('text/plain', dealId)
  }

  const handleDragOver = (e: React.DragEvent, column: string) => {
    e.preventDefault()
    setDragOverColumn(column)
  }

  const handleDrop = (e: React.DragEvent, targetStatus: 'active' | 'under_contract' | 'closed') => {
    e.preventDefault()
    const dealId = e.dataTransfer.getData('text/plain')
    if (dealId) {
      handleUpdateStatus(dealId, targetStatus)
    }
  }

  // Group deals by status columns for the pipeline
  const pipeline = {
    active: deals.filter(d => d.status === 'active'),
    under_contract: deals.filter(d => d.status === 'under_contract'),
    closed: deals.filter(d => d.status === 'closed')
  }

  const rankInfo = profile ? getRankAndLevel(profile.xp) : null

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
      <div className="space-y-8 pb-12">
        
        {/* Welcome Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white mb-1">
              Hey, {profile?.full_name || 'User'}! 👋
            </h1>
            <p className="text-xs text-gray-400">
              Rank: <span className="text-violet-400 font-bold">{rankInfo?.currentRank || profile?.rank}</span> • Maintain your streak to multiply XP gains!
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/deals/archive"
              className="bg-slate-900 hover:bg-slate-800 border border-gray-800 text-gray-300 text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Archive className="w-4 h-4 text-violet-400" />
              <span>View Archived Deals</span>
            </Link>

            <Link
              href="/deals?create=true"
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow-lg shadow-violet-950/20"
            >
              <Plus className="w-4 h-4" />
              <span>Post New Marketplace Deal</span>
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
            <StatWidget
              key={idx}
              label={stat.label}
              value={stat.val}
              desc={stat.desc}
              color={stat.color}
            />
          ))}
        </div>

        {/* Main Grid: Pipeline on Left, Gamification on Right */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Deal Flow Board Column (ColSpan 2) */}
          <div id="tour-deals" className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Deal Flow Board</h2>
              <span className="text-[10px] text-gray-500 font-semibold">Drag cards to transition stage</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Column 1: Under Analysis (active) */}
              <div 
                className="space-y-3"
                onDragOver={(e) => handleDragOver(e, 'active')}
                onDrop={(e) => handleDrop(e, 'active')}
              >
                <div className="flex items-center justify-between px-1.5">
                  <span className="text-xs font-bold text-violet-400">1. Under Analysis</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-bold">
                    {pipeline.active.length}
                  </span>
                </div>
                <div className={`rounded-xl p-3 border min-h-[450px] space-y-3 transition-colors ${
                  dragOverColumn === 'active' 
                    ? 'bg-violet-950/10 border-violet-500/50' 
                    : 'bg-slate-900/40 border-gray-900'
                }`}>
                  {pipeline.active.length === 0 ? (
                    <div className="text-center py-20 text-[10px] text-gray-600 font-medium">No deals listed.</div>
                  ) : (
                    pipeline.active.map(deal => renderDealCard(deal))
                  )}
                </div>
              </div>

              {/* Column 2: Under Contract */}
              <div 
                className="space-y-3"
                onDragOver={(e) => handleDragOver(e, 'under_contract')}
                onDrop={(e) => handleDrop(e, 'under_contract')}
              >
                <div className="flex items-center justify-between px-1.5">
                  <span className="text-xs font-bold text-amber-400">2. Under Contract</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                    {pipeline.under_contract.length}
                  </span>
                </div>
                <div className={`rounded-xl p-3 border min-h-[450px] space-y-3 transition-colors ${
                  dragOverColumn === 'under_contract' 
                    ? 'bg-amber-950/10 border-amber-500/50' 
                    : 'bg-slate-900/40 border-gray-900'
                }`}>
                  {pipeline.under_contract.length === 0 ? (
                    <div className="text-center py-20 text-[10px] text-gray-600 font-medium">No active contracts.</div>
                  ) : (
                    pipeline.under_contract.map(deal => renderDealCard(deal))
                  )}
                </div>
              </div>

              {/* Column 3: Closed / Settled */}
              <div 
                className="space-y-3"
                onDragOver={(e) => handleDragOver(e, 'closed')}
                onDrop={(e) => handleDrop(e, 'closed')}
              >
                <div className="flex items-center justify-between px-1.5">
                  <span className="text-xs font-bold text-emerald-400">3. Closed / Settled</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                    {pipeline.closed.length}
                  </span>
                </div>
                <div className={`rounded-xl p-3 border min-h-[450px] space-y-3 transition-colors ${
                  dragOverColumn === 'closed' 
                    ? 'bg-emerald-950/10 border-emerald-500/50' 
                    : 'bg-slate-900/40 border-gray-900'
                }`}>
                  {pipeline.closed.length === 0 ? (
                    <div className="text-center py-20 text-[10px] text-gray-600 font-medium">No settlements yet.</div>
                  ) : (
                    pipeline.closed.map(deal => renderDealCard(deal))
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

            {/* Chat System Link */}
            <div className="glass-panel border border-gray-900 rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">JV Negotiations</h3>
                <span className="text-[10px] text-violet-400 font-bold bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">Chat</span>
              </div>
              <p className="text-[10px] text-gray-450 leading-relaxed">
                Coordinate assignment splits, co-wholesale deal flow, and negotiate contracts directly with active scouts.
              </p>
              <Link
                href="/chat"
                className="w-full bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/30 text-violet-400 hover:text-white text-center py-2.5 rounded-lg block text-xs font-bold transition-all shadow"
              >
                Open Chat Inbox
              </Link>
            </div>

            {/* Badges Drawer */}
            <div className="glass-panel border border-gray-900 rounded-xl p-5 space-y-4">
              <Link href="/badges" className="flex justify-between items-center group cursor-pointer">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider group-hover:text-violet-400 transition-colors">Earned Badges</h3>
                <span className="text-[10px] text-violet-400 font-bold bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">{userBadges.length} / {badges.length}</span>
              </Link>

              <div className="grid grid-cols-5 gap-2">
                {badges.map((badge) => {
                  const earned = userBadges.some(ub => ub.badge_id === badge.id)
                  return (
                    <Link 
                      href="/badges"
                      key={badge.id}
                      title={`${badge.name}: ${badge.description}`}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg border transition-all ${
                        earned 
                          ? 'bg-violet-600/10 border-violet-500/40 text-white shadow shadow-violet-950 hover:scale-105' 
                          : 'bg-slate-900/40 border-gray-900 text-gray-700 opacity-40 hover:opacity-60'
                      }`}
                    >
                      {badge.icon}
                    </Link>
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

      {/* Render Card Action Menu Dropdown */}
      {renderDropdownMenu()}

      {/* Render Edit Modal */}
      {editingDeal && renderEditModal()}

      {/* Render Delete Confirmation Modal */}
      {deletingDealId && renderDeleteModal()}

    </SidebarLayout>
  )

  // Deal card JSX
  function renderDealCard(deal: Deal) {
    const formattedDate = new Date(deal.created_at).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: '2-digit'
    })

    const statusLabels = {
      active: 'Under Analysis',
      under_contract: 'Under Contract',
      closed: 'Closed / Settled',
      dead: 'Inactive'
    }

    return (
      <div 
        key={deal.id}
        draggable
        onDragStart={(e) => handleDragStart(e, deal.id)}
        className="glass-card rounded-lg p-3.5 border border-gray-800 hover:border-violet-500/30 group cursor-grab active:cursor-grabbing relative transition-all duration-200 hover:-translate-y-0.5 select-none"
      >
        {/* Header containing Property Name & Actions */}
        <div className="flex justify-between items-start gap-2 mb-1.5">
          <div className="truncate flex-1">
            <h4 className="text-xs font-bold text-white truncate group-hover:text-violet-400 transition-colors">
              {deal.property_name || deal.address}
            </h4>
            <div className="flex items-center gap-1 text-[9px] text-gray-500 truncate mt-0.5">
              <MapPin className="w-2.5 h-2.5 shrink-0" />
              <span>{deal.address}, {deal.city}</span>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation()
              setActiveMenuDealId(activeMenuDealId === deal.id ? null : deal.id)
            }}
            className="p-1 rounded text-gray-500 hover:text-white hover:bg-slate-800 shrink-0 cursor-pointer"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Info Grid */}
        <div className="space-y-2 text-[10px] border-t border-gray-900/60 pt-2.5 mt-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 font-medium">Value / Asking:</span>
            <span className="text-emerald-400 font-bold">
              ${Number(deal.deal_value || deal.asking_price).toLocaleString()}
            </span>
          </div>

          {deal.estimated_arv && (
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Est. ARV:</span>
              <span className="text-violet-400 font-semibold">${Number(deal.estimated_arv).toLocaleString()}</span>
            </div>
          )}

          {deal.estimated_mao && (
            <div className="flex justify-between items-center bg-emerald-500/5 px-1 py-0.5 rounded border border-emerald-500/10">
              <span className="text-emerald-500 font-bold text-[9px]">Est. MAO:</span>
              <span className="text-emerald-400 font-black">${Number(deal.estimated_mao).toLocaleString()}</span>
            </div>
          )}

          <div className="flex justify-between items-center text-[9px] border-t border-gray-950 pt-2 mt-1">
            <span className="text-gray-600 font-medium flex items-center gap-0.5">
              <Calendar className="w-2.5 h-2.5" />
              <span>{formattedDate}</span>
            </span>
            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${
              deal.status === 'active' 
                ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' 
                : deal.status === 'under_contract'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              {statusLabels[deal.status] || deal.status}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // 3-Dot Action Menu dropdown JSX
  function renderDropdownMenu() {
    if (!activeMenuDealId) return null
    const deal = deals.find(d => d.id === activeMenuDealId)
    if (!deal) return null

    // Simple absolute coordinates overlaying the screen
    return (
      <div 
        ref={menuRef}
        className="fixed z-50 bg-slate-950/95 border border-gray-800 rounded-xl shadow-2xl w-40 p-1.5 animate-scale-up"
        style={{
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="text-[9px] uppercase font-bold text-gray-500 px-2.5 py-1.5 border-b border-gray-900 truncate">
          Actions
        </div>
        <button
          onClick={() => handleOpenEdit(deal)}
          className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:bg-slate-900 rounded-lg text-left cursor-pointer"
        >
          <Edit2 className="w-3.5 h-3.5 text-violet-400" />
          <span>Edit Deal</span>
        </button>
        <button
          onClick={() => handleDuplicate(deal)}
          className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:bg-slate-900 rounded-lg text-left cursor-pointer"
        >
          <Copy className="w-3.5 h-3.5 text-blue-400" />
          <span>Duplicate Deal</span>
        </button>
        <button
          onClick={() => handleArchive(deal.id)}
          className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:bg-slate-900 rounded-lg text-left cursor-pointer"
        >
          <Archive className="w-3.5 h-3.5 text-amber-400" />
          <span>Archive Deal</span>
        </button>
        <div className="h-px bg-gray-900 my-1" />
        <button
          onClick={() => {
            setDeletingDealId(deal.id)
            setActiveMenuDealId(null)
          }}
          className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/20 rounded-lg text-left cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
          <span>Delete Deal</span>
        </button>
      </div>
    )
  }

  // Edit Modal JSX
  function renderEditModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          onClick={() => setEditingDeal(null)}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        
        <div className="relative glass-panel rounded-2xl border border-gray-800 w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto z-10 animate-scale-up">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-white">Edit Deal Details</h3>
              <p className="text-[10px] text-gray-400">Modify properties on the Deal Flow Board</p>
            </div>
            <button 
              onClick={() => setEditingDeal(null)}
              className="p-1 rounded hover:bg-slate-900 text-gray-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Property name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Oakwood Rehab Project"
                value={editForm.propertyName}
                onChange={(e) => setEditForm({ ...editForm, propertyName: e.target.value })}
                className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Property Address
              </label>
              <input
                type="text"
                required
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  City
                </label>
                <input
                  type="text"
                  required
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  State (Abbr)
                </label>
                <input
                  type="text"
                  required
                  maxLength={2}
                  value={editForm.state}
                  onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                  className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Zip Code
                </label>
                <input
                  type="text"
                  required
                  value={editForm.zip}
                  onChange={(e) => setEditForm({ ...editForm, zip: e.target.value })}
                  className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Asking Price ($)
                </label>
                <input
                  type="number"
                  required
                  value={editForm.askingPrice}
                  onChange={(e) => setEditForm({ ...editForm, askingPrice: e.target.value })}
                  className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Deal Value ($)
                </label>
                <input
                  type="number"
                  placeholder="Defaults to Asking"
                  value={editForm.dealValue}
                  onChange={(e) => setEditForm({ ...editForm, dealValue: e.target.value })}
                  className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Est. ARV ($)
                </label>
                <input
                  type="number"
                  value={editForm.estimatedArv}
                  onChange={(e) => setEditForm({ ...editForm, estimatedArv: e.target.value })}
                  className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Estimated MAO Limit ($)
              </label>
              <input
                type="number"
                placeholder="70% Formula Limit"
                value={editForm.estimatedMao}
                onChange={(e) => setEditForm({ ...editForm, estimatedMao: e.target.value })}
                className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Notes
              </label>
              <textarea
                rows={2}
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500 resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold py-2.5 rounded-lg transition-all cursor-pointer"
            >
              Save Deal Updates
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Delete Modal JSX
  function renderDeleteModal() {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          onClick={() => setDeletingDealId(null)}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        
        <div className="relative glass-panel rounded-2xl border border-gray-850 w-full max-w-sm p-6 text-center z-10 animate-scale-up">
          <div className="inline-flex p-3 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 mb-4 animate-pulse">
            <Trash2 className="w-6 h-6" />
          </div>

          <h3 className="text-base font-black text-white mb-2">Delete Sourced Deal</h3>
          <p className="text-xs text-gray-400 max-w-xs mx-auto mb-6 leading-relaxed">
            Are you sure you want to permanently delete this deal? This action cannot be undone.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => setDeletingDealId(null)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-gray-400 hover:text-white border border-gray-800 text-xs font-bold py-2 rounded-lg transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold py-2 rounded-lg transition-all cursor-pointer"
            >
              Yes, Delete
            </button>
          </div>
        </div>
      </div>
    )
  }
}

