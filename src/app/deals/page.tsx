'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import SidebarLayout from '@/components/dashboard/SidebarLayout'
import { createClient } from '@/lib/supabase/client'
import { 
  Percent, 
  MapPin, 
  Search, 
  Plus, 
  X, 
  Sparkles, 
  Lock
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { type Deal } from '@/types/database'
import { type User } from '@supabase/supabase-js'
import { awardXp, awardBadge, updateStreak } from '@/lib/gamification'

// Main wrapper containing Suspense boundary
export default function DealsPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
      </div>
    }>
      <DealsPage />
    </Suspense>
  )
}

function DealsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  
  // Modals & States
  const [showPostModal, setShowPostModal] = useState(false)
  const [showPaywallModal, setShowPaywallModal] = useState(false)

  // Filters State
  const [searchQuery, setSearchQuery] = useState('')
  const [filterState, setFilterState] = useState('')
  const [minDiscount, setMinDiscount] = useState('')

  // Post Deal Form State
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [askingPrice, setAskingPrice] = useState('')
  const [estArv, setEstArv] = useState('')
  const [estRehab, setEstRehab] = useState('')
  const [notes, setNotes] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [posting, setPosting] = useState(false)

  // Auto trigger post modal if URL has ?create=true
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      const timer = setTimeout(() => {
        setShowPostModal(true)
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  const loadData = async () => {
    // 1. Get Current User & Subscription Status
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUser(user)
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()
      
      setIsSubscribed(!!sub)
    }

    // 2. Load all active deals
    const { data: allDeals } = await supabase
      .from('deals')
      .select('*, profiles(username, full_name, avatar_url)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    setDeals(allDeals || [])
    setLoading(false)
  }

  useEffect(() => {
    let active = true
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!active) return
      if (user) {
        setCurrentUser(user)
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()
        if (!active) return
        setIsSubscribed(!!sub)
      }

      const { data: allDeals } = await supabase
        .from('deals')
        .select('*, profiles(username, full_name, avatar_url)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
      if (!active) return
      setDeals(allDeals || [])
      setLoading(false)
    }
    init()
    return () => {
      active = false
    }
  }, [supabase])

  const handlePostDeal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return
    setPosting(true)

    try {
      // Mock property image if user leaves it empty
      const defaultPhotos = [
        'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=500&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=500&auto=format&fit=crop&q=60',
        'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=500&auto=format&fit=crop&q=60'
      ]
      const url = photoUrl.trim() || defaultPhotos[Math.floor(Math.random() * defaultPhotos.length)]

      const { error } = await supabase
        .from('deals')
        .insert({
          owner_id: currentUser.id,
          address: address.trim(),
          city: city.trim(),
          state: state.trim().toUpperCase(),
          zip: zip.trim(),
          asking_price: Number(askingPrice),
          estimated_arv: estArv ? Number(estArv) : null,
          estimated_rehab: estRehab ? Number(estRehab) : null,
          property_notes: notes.trim(),
          photo_urls: [url],
          status: 'active'
        })
        .select()
        .single()

      if (error) throw error

      // Award XP & Badges check
      const { count: dealCount } = await supabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', currentUser.id)

      const isFirstDeal = (dealCount || 0) <= 1

      if (isFirstDeal) {
        await awardBadge(supabase, currentUser.id, 'deal-finder')
      } else {
        await awardXp(supabase, currentUser.id, 250, 'Posted Deal')
      }

      if ((dealCount || 0) >= 10) {
        await awardBadge(supabase, currentUser.id, 'deal-machine')
      }

      // Update streak logs
      await updateStreak(supabase, currentUser.id, 'deal')

      confetti({ particleCount: 150, spread: 80 })
      setShowPostModal(false)
      
      // Clear form
      setAddress('')
      setCity('')
      setState('')
      setZip('')
      setAskingPrice('')
      setEstArv('')
      setEstRehab('')
      setNotes('')
      setPhotoUrl('')

      // Reload
      setLoading(true)
      await loadData()
    } catch (err) {
      console.error(err)
      alert('Error creating listing. Check database validation constraints.')
    } finally {
      setPosting(false)
    }
  }

  const handleMessageWholesaler = (dealOwnerId: string, dealId: string) => {
    if (!currentUser) {
      router.push('/login')
      return
    }

    if (dealOwnerId === currentUser.id) {
      alert('You cannot start a joint venture chat with yourself!')
      return
    }

    if (!isSubscribed) {
      setShowPaywallModal(true)
    } else {
      // Redirect to Chat route with search params to open specific deal thread
      router.push(`/chat?recipient=${dealOwnerId}&deal=${dealId}`)
    }
  }

  // Filter Logic
  const filteredDeals = deals.filter(deal => {
    const matchesSearch = searchQuery === '' || 
      deal.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.zip.includes(searchQuery)

    const matchesState = filterState === '' || 
      deal.state.toLowerCase() === filterState.toLowerCase()

    // Calculate wholesale discount (if ARV exists)
    let matchesDiscount = true
    if (minDiscount && deal.estimated_arv) {
      const discount = ((deal.estimated_arv - deal.asking_price) / deal.estimated_arv) * 100
      matchesDiscount = discount >= Number(minDiscount)
    }

    return matchesSearch && matchesState && matchesDiscount
  })

  return (
    <SidebarLayout>
      <div className="space-y-6">
        {/* Page Banner Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white mb-1 flex items-center gap-2">
              <Percent className="w-6 h-6 text-violet-400" />
              <span>JV Deal Board</span>
            </h1>
            <p className="text-xs text-gray-400">
              Browse wholesale deal listings posted by scouts. Messaging and negotiating requires a subscription.
            </p>
          </div>

          <button
            onClick={() => setShowPostModal(true)}
            className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow-lg shadow-violet-950/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Post a Deal Listing</span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="glass-panel border border-gray-900 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Search by city, zip, or street..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 pl-9 pr-4 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <input
              type="text"
              placeholder="State abbreviation (e.g. GA, TX)"
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <select
              value={minDiscount}
              onChange={(e) => setMinDiscount(e.target.value)}
              className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-400 focus:outline-none focus:border-violet-500"
            >
              <option value="">Any wholesale discount %</option>
              <option value="15">15%+ below ARV</option>
              <option value="30">30%+ below ARV (Deep Discount)</option>
              <option value="40">40%+ below ARV (Premium Deals)</option>
            </select>
          </div>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="w-8 h-8 border-3 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-3" />
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Syncing properties...</p>
          </div>
        ) : filteredDeals.length === 0 ? (
          <div className="glass-panel border-gray-900 rounded-xl p-12 text-center max-w-lg mx-auto">
            <Percent className="w-10 h-10 mx-auto text-gray-600 mb-3" />
            <h3 className="text-sm font-bold text-gray-400">No properties found</h3>
            <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1 leading-relaxed">
              Try adjusting your search query parameters or click &quot;Post a Deal Listing&quot; to seed the directory.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {filteredDeals.map((deal) => {
              // Calculate discount % below ARV
              const discountPercent = deal.estimated_arv
                ? Math.round(((deal.estimated_arv - deal.asking_price) / deal.estimated_arv) * 100)
                : null

              return (
                <div 
                  key={deal.id} 
                  className="glass-card rounded-2xl border border-gray-900 overflow-hidden flex flex-col justify-between"
                >
                  {/* Photo Container */}
                  <div className="relative h-44 bg-slate-900 shrink-0">
                    <img 
                      src={deal.photo_urls?.[0] || 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=500&auto=format&fit=crop&q=60'} 
                      alt="Property" 
                      className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    {discountPercent !== null && discountPercent > 0 && (
                      <div className="absolute top-3 left-3 bg-emerald-500/90 text-white text-[10px] font-black px-2 py-0.5 rounded shadow flex items-center gap-0.5">
                        <Sparkles className="w-3 h-3 fill-white" />
                        <span>{discountPercent}% BELOW ARV</span>
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Address */}
                      <div className="mb-3">
                        <h4 className="text-sm font-bold text-white truncate">{deal.address}</h4>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                          <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                          <span>{deal.city}, {deal.state} {deal.zip}</span>
                        </div>
                      </div>

                      {/* Pricing Table */}
                      <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-gray-900/60 text-center">
                        <div>
                          <div className="text-[8px] uppercase font-bold text-gray-500 mb-0.5">Asking</div>
                          <div className="text-xs font-black text-white">${Number(deal.asking_price).toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-[8px] uppercase font-bold text-gray-500 mb-0.5">ARV</div>
                          <div className="text-xs font-bold text-violet-400">
                            {deal.estimated_arv ? `$${Number(deal.estimated_arv).toLocaleString()}` : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[8px] uppercase font-bold text-gray-500 mb-0.5">Rehab</div>
                          <div className="text-xs font-bold text-amber-500">
                            {deal.estimated_rehab ? `$${Number(deal.estimated_rehab).toLocaleString()}` : 'N/A'}
                          </div>
                        </div>
                      </div>

                      {/* Notes snippet */}
                      {deal.property_notes && (
                        <p className="text-[10px] text-gray-400 leading-relaxed mt-3 max-h-16 overflow-y-auto no-scrollbar">
                          {deal.property_notes}
                        </p>
                      )}
                    </div>

                    {/* Footer / Wholesaler Details & CTA */}
                    <div className="pt-3 border-t border-gray-900/60 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <div className="w-7 h-7 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center font-bold text-[10px] text-violet-400 shrink-0">
                          {deal.profiles?.full_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="truncate">
                          <div className="text-[10px] font-bold text-white truncate">{deal.profiles?.full_name || 'Scout'}</div>
                          <div className="text-[8px] text-gray-500 font-medium">@{deal.profiles?.username || 'user'}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleMessageWholesaler(deal.owner_id, deal.id)}
                        className="bg-slate-900 hover:bg-violet-950/20 border border-gray-800 hover:border-violet-500/30 text-white hover:text-violet-400 text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all shrink-0"
                      >
                        {!isSubscribed && deal.owner_id !== currentUser?.id && (
                          <Lock className="w-3 h-3 text-violet-400 shrink-0" />
                        )}
                        <span>JV Chat</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Modal: Post Deal Listing */}
        {showPostModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              onClick={() => setShowPostModal(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />
            
            <div className="relative glass-panel rounded-2xl border border-gray-800 w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto z-10">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-base font-bold text-white">Create Deal Listing</h3>
                  <p className="text-[10px] text-gray-400">Post details to the public JV Board and gain <span className="text-violet-400 font-bold">+250 XP 🎓</span></p>
                </div>
                <button 
                  onClick={() => setShowPostModal(false)}
                  className="p-1 rounded hover:bg-slate-900 text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handlePostDeal} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                    Property Address
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 123 Main St"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
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
                      placeholder="e.g. Houston"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
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
                      placeholder="e.g. TX"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                      Zip Code
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 77002"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
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
                      placeholder="e.g. 180000"
                      value={askingPrice}
                      onChange={(e) => setAskingPrice(e.target.value)}
                      className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                      Est. ARV ($)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 260000"
                      value={estArv}
                      onChange={(e) => setEstArv(e.target.value)}
                      className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                      Est. Rehab ($)
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 35000"
                      value={estRehab}
                      onChange={(e) => setEstRehab(e.target.value)}
                      className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                    Photo URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="Leave empty for generic property stock image"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                    Property Notes / motivated seller details
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Roof is 5 yrs old, kitchen needs upgrade. Motivated seller moving out of state. Cash buy only."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={posting}
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {posting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Submit Deal Listing</span>
                      <Sparkles className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Paywall Gating */}
        {showPaywallModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              onClick={() => setShowPaywallModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            <div className="relative glass-panel rounded-2xl border border-gray-800 w-full max-w-sm p-6 text-center z-10 animate-scale-up">
              <div className="inline-flex p-4 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 mb-4">
                <Lock className="w-8 h-8" />
              </div>

              <h3 className="text-base font-black text-white mb-2">Unlock Wholesaler Messaging</h3>
              <p className="text-xs text-gray-400 max-w-xs mx-auto mb-6 leading-relaxed">
                Connect directly with cash buyers, JV partners, and contract finders. Subscribing unlocks real-time chat, unlimited AI property checks, and 250 monthly credits.
              </p>

              <div className="bg-slate-950/80 border border-gray-900 rounded-xl p-4 max-w-xs mx-auto mb-6 text-left space-y-2.5">
                <div className="text-[10px] uppercase font-bold text-gray-500">Premium Plan Includes:</div>
                <div className="text-xs flex items-center gap-2 text-gray-300">
                  <span className="text-emerald-400">✓</span>
                  <span>Unrestricted Direct Messaging</span>
                </div>
                <div className="text-xs flex items-center gap-2 text-gray-300">
                  <span className="text-emerald-400">✓</span>
                  <span>+250 Monthly Calculator Credits 🪙</span>
                </div>
                <div className="text-xs flex items-center gap-2 text-gray-300">
                  <span className="text-emerald-400">✓</span>
                  <span>Advanced Deal Map Filters</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => router.push('/pricing')}
                className="w-full bg-gradient-to-r from-violet-600 via-purple-600 to-emerald-600 hover:from-violet-500 hover:to-emerald-500 text-white text-xs font-bold py-2.5 rounded-lg shadow-lg shadow-violet-950/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Subscribe for $149.99/mo</span>
                <Sparkles className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setShowPaywallModal(false)}
                className="text-[10px] text-gray-500 hover:text-white mt-4 block mx-auto underline font-medium cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  )
}
