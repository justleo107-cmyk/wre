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
  Sparkles, 
  Lock,
  MessageSquare,
  Crown
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { type Deal } from '@/types/database'
import { type User } from '@supabase/supabase-js'
import { awardXp, awardBadge, updateStreak } from '@/lib/gamification'
import { detectSqliXss, sanitizeContent } from '@/lib/firewall'

import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { GlassCard, GlassPanel } from '@/components/ui/Card'
import { UpgradeModal } from '@/components/ui/UpgradeModal'

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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

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
  const [certifyEquitableInterest, setCertifyEquitableInterest] = useState(false)

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
      .select('*, profiles(username, full_name, avatar_url, level)')
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

    // 1. Equitable Interest Certification check
    if (!certifyEquitableInterest) {
      alert('Policy Verification Denied: You must certify that you have equitable interest (a valid, assignable purchase agreement or ownership) in this property to list it.')
      return
    }

    // 2. SQLi / XSS Injection check
    if (detectSqliXss(address) || detectSqliXss(city) || detectSqliXss(notes)) {
      alert('Security Threat Blocked: Potential SQL Injection or Cross-Site Scripting (XSS) payload signature detected. Request blocked.')
      return
    }

    // 3. Spam, Profanity & Abuse check
    const notesSanitize = sanitizeContent(notes)
    if (!notesSanitize.clean) {
      alert(`Content Blocked: Property description contains prohibited terms: ${notesSanitize.blockedWords.join(', ')}. Action blocked by Vanta Shield.`);
      return
    }

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
        await awardXp(supabase, currentUser.id, 25, 'Posted Deal')
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
      setCertifyEquitableInterest(false)

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

    // Redirect to Chat route with search params to open specific deal thread
    router.push(`/chat?recipient=${dealOwnerId}&deal=${dealId}`)
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
              <span>Marketplace</span>
            </h1>
            <p className="text-xs text-gray-400">
              Browse wholesale deal listings posted by scouts. Message wholesalers directly and negotiate splits.
            </p>
          </div>

          <Button
            onClick={() => {
              if (!isSubscribed) {
                setShowUpgradeModal(true)
              } else {
                setShowPostModal(true)
              }
            }}
            icon={!isSubscribed ? <Crown className="w-4 h-4 text-amber-500 fill-amber-500/10" /> : <Plus className="w-4 h-4" />}
            title={!isSubscribed ? "Premium Feature" : undefined}
          >
            Post a Deal Listing
          </Button>
        </div>

        {/* Filter Toolbar */}
        <GlassPanel className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-20 gap-4 w-full">
            <div className="relative md:col-span-12">
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

            <div className="md:col-span-3">
              <Input
                placeholder="State abbreviation (e.g. GA, TX)"
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
              />
            </div>

            <div className="md:col-span-5">
              <Select
                value={minDiscount}
                onChange={(e) => setMinDiscount(e.target.value)}
              >
                <option value="">Any wholesale discount %</option>
                <option value="15">15%+ below ARV</option>
                <option value="30">30%+ below ARV (Deep Discount)</option>
                <option value="40">40%+ below ARV (Premium Deals)</option>
              </Select>
            </div>
          </div>
        </GlassPanel>

        {/* Listings Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="w-8 h-8 border-3 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-3" />
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Syncing properties...</p>
          </div>
        ) : filteredDeals.length === 0 ? (
          <GlassPanel className="p-12 text-center max-w-lg mx-auto">
            <Percent className="w-10 h-10 mx-auto text-gray-600 mb-3" />
            <h3 className="text-sm font-bold text-gray-400">No properties found</h3>
            <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1 leading-relaxed">
              Try adjusting your search query parameters or click &quot;Post a Deal Listing&quot; to seed the directory.
            </p>
          </GlassPanel>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {filteredDeals.map((deal) => {
              // Calculate discount % below ARV
              const discountPercent = deal.estimated_arv
                ? Math.round(((deal.estimated_arv - deal.asking_price) / deal.estimated_arv) * 100)
                : null

              return (
                <GlassCard 
                  key={deal.id} 
                  className="overflow-hidden flex flex-col justify-between p-0"
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

                    {deal.profiles?.level && deal.profiles.level >= 4 && (
                      <div className="absolute top-3 right-3 bg-violet-600/90 text-white text-[9px] font-black px-2 py-0.5 rounded shadow flex items-center gap-1 border border-violet-500/30">
                        <span>⭐ VIP DEAL</span>
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
                        {deal.profiles?.avatar_url ? (
                          <img 
                            src={deal.profiles.avatar_url} 
                            alt={deal.profiles.full_name || 'Scout'} 
                            className="w-7 h-7 rounded-full object-cover border border-violet-500/25 shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center font-bold text-[10px] text-violet-400 shrink-0">
                            {deal.profiles?.full_name?.[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                        <div className="truncate">
                          <div className="text-[10px] font-bold text-white truncate flex items-center gap-1">
                            <span>{deal.profiles?.full_name || 'Scout'}</span>
                            {deal.profiles?.level && deal.profiles.level >= 4 && (
                              <span className="text-[8px] px-1.5 py-0.2 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 font-black uppercase tracking-widest shrink-0 animate-pulse">
                                VIP
                              </span>
                            )}
                          </div>
                          <div className="text-[8px] text-gray-500 font-medium">@{deal.profiles?.username || 'user'}</div>
                        </div>
                      </div>

                      <Button
                        onClick={() => {
                          if (!isSubscribed) {
                            setShowUpgradeModal(true)
                          } else {
                            handleMessageWholesaler(deal.owner_id, deal.id)
                          }
                        }}
                        variant="outline"
                        className="py-1.5 px-3 shrink-0 flex items-center gap-1.5 font-bold"
                        title={!isSubscribed ? "Premium Feature" : undefined}
                      >
                        {!isSubscribed ? (
                          <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500/10 shrink-0" />
                        ) : (
                          <MessageSquare className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                        )}
                        <span>Chat</span>
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              )
            })}
          </div>
        )}

        {/* Modal: Post Deal Listing */}
        <Modal
          isOpen={showPostModal}
          onClose={() => setShowPostModal(false)}
          title="Create Marketplace Listing"
          description="Post details to the public Marketplace and gain +25 XP 🎓"
        >
          <form onSubmit={handlePostDeal} className="space-y-4">
            <Input
              label="Property Address"
              required
              placeholder="e.g. 123 Main St"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />

            <div className="grid grid-cols-3 gap-3">
              <Input
                label="City"
                required
                placeholder="e.g. Houston"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <Input
                label="State (Abbr)"
                required
                maxLength={2}
                placeholder="e.g. TX"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
              <Input
                label="Zip Code"
                required
                placeholder="e.g. 77002"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Asking Price ($)"
                type="number"
                required
                placeholder="e.g. 180000"
                value={askingPrice}
                onChange={(e) => setAskingPrice(e.target.value)}
              />
              <Input
                label="Est. ARV ($)"
                type="number"
                placeholder="e.g. 260000"
                value={estArv}
                onChange={(e) => setEstArv(e.target.value)}
              />
              <Input
                label="Est. Rehab ($)"
                type="number"
                placeholder="e.g. 35000"
                value={estRehab}
                onChange={(e) => setEstRehab(e.target.value)}
              />
            </div>

            <Input
              label="Photo URL (Optional)"
              type="url"
              placeholder="Leave empty for generic property stock image"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
            />

            <div className="space-y-1.5">
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
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

            {/* Certify Checkbox */}
            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-violet-500/10 bg-violet-500/5 select-none">
              <input
                id="certify-equitable-interest"
                type="checkbox"
                checked={certifyEquitableInterest}
                onChange={(e) => setCertifyEquitableInterest(e.target.checked)}
                className="mt-0.5 cursor-pointer accent-violet-600 rounded"
              />
              <label 
                htmlFor="certify-equitable-interest" 
                className="text-[10px] text-gray-400 leading-normal font-bold cursor-pointer"
              >
                I certify under penalty of terms violation that I hold a valid, signed purchase agreement and equitable interest in this property, allowing me to co-wholesale or assign rights in a Joint Venture.
              </label>
            </div>

            <Button
              type="submit"
              loading={posting}
              className="w-full mt-2"
              iconRight={<Sparkles className="w-4 h-4" />}
            >
              Submit Deal Listing
            </Button>
          </form>
        </Modal>

        {/* Modal: Upgrade Gating */}
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
        />
      </div>
    </SidebarLayout>
  )
}
