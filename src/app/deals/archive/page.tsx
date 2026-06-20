'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import SidebarLayout from '@/components/dashboard/SidebarLayout'
import { createClient } from '@/lib/supabase/client'
import { 
  Archive, 
  MapPin, 
  RotateCcw, 
  Trash2, 
  MoreVertical,
  Calendar
} from 'lucide-react'
import Link from 'next/link'
import { type Deal } from '@/types/database'

export default function ArchivePage() {
  const supabase = createClient()
  const [archivedDeals, setArchivedDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  
  // Dropdown & Modal State
  const [activeMenuDealId, setActiveMenuDealId] = useState<string | null>(null)
  const [deletingDealId, setDeletingDealId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuDealId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadArchivedDeals = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('deals')
      .select('*')
      .eq('owner_id', user.id)
      .eq('is_archived', true)
      .order('created_at', { ascending: false })

    setArchivedDeals(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadArchivedDeals()
    }, 0)
    return () => clearTimeout(timer)
  }, [loadArchivedDeals])

  const handleRestore = async (dealId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('deals')
        .update({ is_archived: false })
        .eq('id', dealId)
        .eq('owner_id', user.id)

      if (error) throw error
      
      setActiveMenuDealId(null)
      loadArchivedDeals()
    } catch (err) {
      console.error('Error restoring deal:', err)
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
      loadArchivedDeals()
    } catch (err) {
      console.error('Error deleting deal:', err)
    }
  }

  return (
    <SidebarLayout>
      <div className="space-y-6 pb-12">
        {/* Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-900 pb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white mb-1 flex items-center gap-2">
              <Archive className="w-6 h-6 text-violet-400" />
              <span>Archived Deals</span>
            </h1>
            <p className="text-xs text-gray-400">
              Restore deals back to your Deal Flow Board or permanently delete them from the database.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="bg-slate-900 hover:bg-slate-800 border border-gray-800 text-gray-300 text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="w-8 h-8 border-3 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-3" />
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Loading archive...</p>
          </div>
        ) : archivedDeals.length === 0 ? (
          <div className="glass-panel border-gray-900 rounded-xl p-16 text-center max-w-lg mx-auto">
            <Archive className="w-12 h-12 mx-auto text-gray-650 mb-4" />
            <h3 className="text-sm font-bold text-gray-400">No archived deals</h3>
            <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1.5 leading-relaxed">
              Deals you archive from the main board will show up here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {archivedDeals.map((deal) => {
              const formattedDate = new Date(deal.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })

              return (
                <div 
                  key={deal.id} 
                  className="glass-card rounded-2xl border border-gray-900 overflow-hidden flex flex-col justify-between p-4 relative"
                >
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div className="truncate">
                      <h4 className="text-sm font-bold text-white truncate">{deal.property_name || deal.address}</h4>
                      <div className="flex items-center gap-1 text-[10px] text-gray-500 truncate mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-600 shrink-0" />
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
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2 bg-slate-950/60 p-3 rounded-lg border border-gray-900/60 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Asking Price:</span>
                      <span className="text-emerald-400 font-bold">${Number(deal.asking_price).toLocaleString()}</span>
                    </div>
                    {deal.estimated_arv && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">ARV Valuation:</span>
                        <span className="text-violet-400 font-semibold">${Number(deal.estimated_arv).toLocaleString()}</span>
                      </div>
                    )}
                    {deal.estimated_mao && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Suggested MAO:</span>
                        <span className="text-emerald-500 font-bold">${Number(deal.estimated_mao).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-gray-500 mt-4 border-t border-gray-900/65 pt-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-600" />
                      <span>Created {formattedDate}</span>
                    </span>
                    <span className="uppercase text-[8px] font-black tracking-wider px-2 py-0.5 rounded bg-slate-900 text-gray-450 border border-gray-800">
                      Archived
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Dropdown Menu Overlay */}
        {activeMenuDealId && (
          <div 
            ref={menuRef}
            className="fixed z-50 bg-slate-950 border border-gray-850 rounded-xl shadow-2xl w-44 p-1.5 animate-scale-up"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="text-[9px] uppercase font-bold text-gray-500 px-2.5 py-1.5 border-b border-gray-900 truncate">
              Actions
            </div>
            <button
              onClick={() => handleRestore(activeMenuDealId)}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-gray-350 hover:text-white hover:bg-slate-900 rounded-lg text-left cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-violet-400" />
              <span>Restore Deal</span>
            </button>
            <div className="h-px bg-gray-900 my-1" />
            <button
              onClick={() => {
                setDeletingDealId(activeMenuDealId)
                setActiveMenuDealId(null)
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/20 rounded-lg text-left cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
              <span>Delete Deal</span>
            </button>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingDealId && (
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
                Are you sure you want to permanently delete this deal from the archive? This cannot be undone.
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
        )}
      </div>
    </SidebarLayout>
  )
}
