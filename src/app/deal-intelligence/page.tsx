/* eslint-disable */
'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import SidebarLayout from '@/components/dashboard/SidebarLayout'
import { createClient } from '@/lib/supabase/client'
import { deductCredits } from '@/lib/gamification'
import { 
  Plus, 
  Search, 
  Trash2, 
  ExternalLink, 
  User, 
  Home,
  AlertCircle,
  Coins
} from 'lucide-react'
import confetti from 'canvas-confetti'

import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { GlassCard, GlassPanel } from '@/components/ui/Card'

const t = (key: string) => key

const STATUSES = [
  'Lead',
  'Contacted',
  'Follow Up',
  'Negotiating',
  'Offer Sent',
  'Under Contract',
  'Buyer Found',
  'Closed',
  'Dead Lead'
]

const STATUS_COLORS: Record<string, string> = {
  'Lead': 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  'Contacted': 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
  'Follow Up': 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  'Negotiating': 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  'Offer Sent': 'bg-pink-500/10 text-pink-400 border border-pink-500/20',
  'Under Contract': 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  'Buyer Found': 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
  'Closed': 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  'Dead Lead': 'bg-red-500/10 text-red-400 border border-red-500/20'
}

export default function DealIntelligenceDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [deals, setDeals] = useState<any[]>([])
  const [arvHistory, setArvHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [credits, setCredits] = useState<number>(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  // Create Deal Form States
  const [propertyName, setPropertyName] = useState('')
  const [propertyAddress, setPropertyAddress] = useState('')
  const [sellerName, setSellerName] = useState('')
  const [sellerPhone, setSellerPhone] = useState('')
  const [sellerEmail, setSellerEmail] = useState('')
  const [status, setStatus] = useState('Lead')
  
  // ARV Selection Modes: 'none' | 'select' | 'calculate'
  const [arvMode, setArvMode] = useState<'none' | 'select' | 'calculate'>('none')
  const [selectedArvId, setSelectedArvId] = useState('')
  
  // Calculator inputs if 'calculate' mode
  const [comp1, setComp1] = useState('')
  const [comp2, setComp2] = useState('')
  const [comp3, setComp3] = useState('')
  const [estimatedRepairs, setEstimatedRepairs] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch Profile for Credits
      const { data: profile } = await supabase
        .from('profiles')
        .select('arv_credits, mao_credits, ai_uses_remaining')
        .eq('id', user.id)
        .single()
      if (profile) {
        setCredits(profile.arv_credits || 0)
      }

      // Fetch Deals
      const { data: dealsData } = await supabase
        .from('deal_intelligence_files')
        .select(`
          *,
          arv_history:arv_history_id(*),
          mao_history:mao_history_id(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (dealsData) setDeals(dealsData)

      // Fetch ARV History
      const { data: arvData } = await supabase
        .from('arv_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (arvData) setArvHistory(arvData)

    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let arvId: string | null = null

      if (arvMode === 'select') {
        if (!selectedArvId) {
          alert('Please select an ARV record.')
          setSubmitting(false)
          return
        }
        arvId = selectedArvId
      } else if (arvMode === 'calculate') {
        if (credits < 2) {
          alert('Insufficient credits to calculate new ARV. You need 2 credits.')
          setSubmitting(false)
          return
        }

        // Deduct credits
        const { success } = await deductCredits(supabase, user.id, 'arv', 2, `ARV Auto-Calc for Deal: ${propertyName}`)
        if (!success) {
          alert('Failed to deduct credits.')
          setSubmitting(false)
          return
        }

        // Calculate Average
        const average = (Number(comp1) + Number(comp2) + Number(comp3)) / 3
        const calculatedArv = Math.round(average)
        const repairs = Number(estimatedRepairs) || 0

        // Create ARV Record
        const { data: newArv, error: arvErr } = await supabase
          .from('arv_history')
          .insert({
            user_id: user.id,
            property_name: propertyName.trim(),
            comp_1: Number(comp1),
            comp_2: Number(comp2),
            comp_3: Number(comp3),
            estimated_repairs: repairs,
            calculated_arv: calculatedArv
          })
          .select()
          .single()

        if (arvErr || !newArv) {
          alert('Failed to save ARV calculation: ' + arvErr?.message)
          setSubmitting(false)
          return
        }

        arvId = newArv.id
      }

      // Create Deal Intelligence File
      const { data: newDeal, error: dealErr } = await supabase
        .from('deal_intelligence_files')
        .insert({
          user_id: user.id,
          property_name: propertyName.trim(),
          property_address: propertyAddress.trim(),
          seller_name: sellerName.trim() || null,
          seller_phone: sellerPhone.trim() || null,
          seller_email: sellerEmail.trim() || null,
          status,
          arv_history_id: arvId
        })
        .select()
        .single()

      if (dealErr) {
        alert('Failed to create Deal Intelligence file: ' + dealErr.message)
        return
      }

      // Log event in deal activity timeline
      await supabase
        .from('deal_activity_timeline')
        .insert({
          deal_id: newDeal.id,
          event_type: 'Created Deal',
          description: `Initialized Deal Intelligence workspace for ${propertyName}.`
        })

      // Clean form states
      setPropertyName('')
      setPropertyAddress('')
      setSellerName('')
      setSellerPhone('')
      setSellerEmail('')
      setStatus('Lead')
      setArvMode('none')
      setSelectedArvId('')
      setComp1('')
      setComp2('')
      setComp3('')
      setEstimatedRepairs('')

      setIsCreateModalOpen(false)
      confetti({ particleCount: 80, spread: 50 })
      fetchData()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteDeal = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to permanently delete this Deal Intelligence file? This deletes all notes, call logs, and AI history.')) return

    const { error } = await supabase
      .from('deal_intelligence_files')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Failed to delete deal: ' + error.message)
    } else {
      fetchData()
    }
  }

  // Filter deals
  const filteredDeals = deals.filter(x => 
    x.property_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    x.property_address?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <SidebarLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Banner */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-gray-900 pb-5 gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white mb-1">
              Deal Intelligence CRM
            </h1>
            <p className="text-xs text-gray-400">
              Manage wholesaling property pipelines, log conversations, attach valuations, and analyze deals with AI.
            </p>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Create Deal File
          </Button>
        </div>

        {/* Search bar */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by property name or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-gray-800 rounded-lg py-2.5 pl-10 pr-4 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-violet-500"
          />
        </div>

        {/* Deals Grid */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-gray-500">Loading workspaces...</p>
          </div>
        ) : filteredDeals.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {filteredDeals.map((deal) => {
              const displayArv = deal.arv_history?.calculated_arv || null
              const displayMao = deal.mao_history?.calculated_mao || null
              return (
                <GlassPanel
                  key={deal.id}
                  onClick={() => router.push(`/deal-intelligence/${deal.id}`)}
                  className="hover:border-gray-800 transition-all cursor-pointer relative group flex flex-col justify-between min-h-[180px] bg-slate-900/30 hover:bg-slate-900/60 p-5"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="text-xs font-bold text-white group-hover:text-violet-400 transition-colors uppercase tracking-wide truncate max-w-[200px]">
                          {deal.property_name}
                        </h3>
                        <p className="text-[10px] text-gray-500 truncate max-w-[220px]">
                          {deal.property_address}
                        </p>
                      </div>
                      <span className={`text-[8px] font-bold uppercase py-0.5 px-2 rounded-full border shrink-0 ${STATUS_COLORS[deal.status] || 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                        {deal.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-950/40 p-2.5 rounded border border-gray-900/50 text-center">
                      <div>
                        <div className="text-[8px] text-gray-500 uppercase font-semibold">{t("ARV Target")}</div>
                        <div className="text-xs font-bold text-violet-400">
                          {displayArv ? `$${displayArv.toLocaleString()}` : '--'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[8px] text-gray-500 uppercase font-semibold">{t("MAO Target")}</div>
                        <div className="text-xs font-bold text-emerald-400">
                          {displayMao ? `$${displayMao.toLocaleString()}` : '--'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-gray-900/50 pt-3 mt-3 text-[10px] text-gray-500">
                    <div>
                      {deal.seller_name && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-gray-600" />
                          <span className="truncate max-w-[120px]">{deal.seller_name}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleDeleteDeal(deal.id, e)}
                        className="p-1 text-gray-600 hover:text-red-400 rounded hover:bg-red-500/10 transition-all"
                        title="Delete Deal File"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="inline-flex items-center gap-0.5 text-violet-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                        <span>Workspace</span>
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </GlassPanel>
              )
            })}
          </div>
        ) : (
          <GlassPanel className="p-10 text-center space-y-3">
            <Home className="w-10 h-10 text-gray-600 mx-auto opacity-30" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">No Property Deals Found</h3>
            <p className="text-[10px] text-gray-500 max-w-sm mx-auto leading-relaxed">
              Create a new Deal Intelligence CRM workspace to begin tracking seller details, calculatives, and conversations.
            </p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-1"
              icon={<Plus className="w-3.5 h-3.5" />}
            >
              Create First Deal
            </Button>
          </GlassPanel>
        )}
      </div>

      {/* Create Modal Overlay */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Deal Intelligence File"
        description="Initialize a dedicated WHOLESALING workspace file for this property."
      >
        <form onSubmit={handleCreateDeal} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Property Name"
              required
              placeholder="e.g. Dallas Fixer Upper #1"
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
            />
            <Input
              label="Property Address"
              required
              placeholder="e.g. 123 Main St, Dallas TX"
              value={propertyAddress}
              onChange={(e) => setPropertyAddress(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Input
              label="Seller Name"
              placeholder="John Doe"
              value={sellerName}
              onChange={(e) => setSellerName(e.target.value)}
            />
            <Input
              label="Seller Phone"
              placeholder="214-555-0199"
              value={sellerPhone}
              onChange={(e) => setSellerPhone(e.target.value)}
            />
            <Input
              label="Seller Email"
              type="email"
              placeholder="john@gmail.com"
              value={sellerEmail}
              onChange={(e) => setSellerEmail(e.target.value)}
            />
          </div>

          <Select
            label="Lead Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUSES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>

          {/* ARV Connect Section */}
          <div className="border-t border-gray-900 pt-3 space-y-3">
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide">
              ARV Integration
            </label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() => {
                  setArvMode('none')
                  setSelectedArvId('')
                }}
                variant={arvMode === 'none' ? 'primary' : 'outline'}
                className="py-1.5 px-3 text-[10px]"
              >
                Input Manually
              </Button>
              <Button
                onClick={() => setArvMode('select')}
                variant={arvMode === 'select' ? 'primary' : 'outline'}
                className="py-1.5 px-3 text-[10px]"
              >
                Link Existing ARV
              </Button>
              <Button
                onClick={() => setArvMode('calculate')}
                variant={arvMode === 'calculate' ? 'primary' : 'outline'}
                className="py-1.5 px-3 text-[10px]"
              >
                Auto-Calculate ARV
              </Button>
            </div>

            {arvMode === 'select' && (
              <Select
                label="Select Existing ARV Record"
                value={selectedArvId}
                onChange={(e) => {
                  const id = e.target.value
                  setSelectedArvId(id)
                  const matched = arvHistory.find(x => x.id === id)
                  if (matched && !propertyName) {
                    setPropertyName(matched.property_name)
                  }
                }}
              >
                <option value="">-- Choose Calculation --</option>
                {arvHistory.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.property_name} (ARV: ${item.calculated_arv?.toLocaleString()})
                  </option>
                ))}
              </Select>
            )}

            {arvMode === 'calculate' && (
              <div className="space-y-3 bg-slate-900/40 border border-gray-900 p-3 rounded-lg">
                <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold">
                  <span>NEW ARV ESTIMATE</span>
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Coins className="w-3.5 h-3.5" />
                    <span>Costs 2 Credits (Bal: {credits})</span>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Input
                    label="Comp #1 Sold ($)"
                    type="number"
                    required={arvMode === 'calculate'}
                    placeholder="e.g. 250000"
                    value={comp1}
                    onChange={(e) => setComp1(e.target.value)}
                  />
                  <Input
                    label="Comp #2 Sold ($)"
                    type="number"
                    required={arvMode === 'calculate'}
                    placeholder="e.g. 260000"
                    value={comp2}
                    onChange={(e) => setComp2(e.target.value)}
                  />
                  <Input
                    label="Comp #3 Sold ($)"
                    type="number"
                    required={arvMode === 'calculate'}
                    placeholder="e.g. 245000"
                    value={comp3}
                    onChange={(e) => setComp3(e.target.value)}
                  />
                </div>

                <Input
                  label="Estimated Repairs ($)"
                  type="number"
                  placeholder="e.g. 35000"
                  value={estimatedRepairs}
                  onChange={(e) => setEstimatedRepairs(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-900">
            <Button
              onClick={() => setIsCreateModalOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={submitting}
            >
              Create Deal
            </Button>
          </div>
        </form>
      </Modal>
    </SidebarLayout>
  )
}
