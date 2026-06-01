/* eslint-disable */
'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import SidebarLayout from '@/components/dashboard/SidebarLayout'
import { createClient } from '@/lib/supabase/client'
import { deductCredits } from '@/lib/gamification'
import { 
  ArrowLeft,
  Calendar,
  Phone,
  Mail,
  User,
  Home,
  DollarSign,
  TrendingUp,
  FileText,
  Trash2,
  Plus,
  Sparkles,
  ShieldAlert,
  ListTodo,
  Paperclip,
  Image as ImageIcon,
  Clock,
  ChevronRight,
  Eye,
  Check,
  X,
  Database,
  Calculator,
  Coins
} from 'lucide-react'
import confetti from 'canvas-confetti'

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

export default function DealIntelligenceFileWorkspace() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const supabase = createClient()

  // State
  const [deal, setDeal] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [aiCredits, setAiCredits] = useState<number>(0)
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'calls' | 'property' | 'ai' | 'files' | 'timeline'>('overview')

  // History for attachments
  const [arvList, setArvList] = useState<any[]>([])
  const [maoList, setMaoList] = useState<any[]>([])

  // Modal / Form States
  const [isEditDetailsOpen, setIsEditDetailsOpen] = useState(false)
  const [isLogCallOpen, setIsLogCallOpen] = useState(false)
  const [isUploadFileOpen, setIsUploadFileOpen] = useState(false)

  // Edit Deal Info
  const [editPropertyName, setEditPropertyName] = useState('')
  const [editPropertyAddress, setEditPropertyAddress] = useState('')
  const [editSellerName, setEditSellerName] = useState('')
  const [editSellerPhone, setEditSellerPhone] = useState('')
  const [editSellerEmail, setEditSellerEmail] = useState('')

  // Edit Specs info
  const [beds, setBeds] = useState('')
  const [baths, setBaths] = useState('')
  const [sqft, setSqft] = useState('')
  const [yearBuilt, setYearBuilt] = useState('')
  const [lotSize, setLotSize] = useState('')

  // Notes
  const [noteText, setNoteText] = useState('')

  // Call Logs
  const [callDuration, setCallDuration] = useState('')
  const [callSummary, setCallSummary] = useState('')
  const [callOutcome, setCallOutcome] = useState('')

  // File Upload
  const [uploadFileName, setUploadFileName] = useState('')
  const [uploadFileType, setUploadFileType] = useState('photo') // 'photo' | 'report' | 'contract'
  const [uploadFileUrl, setUploadFileUrl] = useState('')

  // Attachment IDs
  const [linkArvId, setLinkArvId] = useState('')
  const [linkMaoId, setLinkMaoId] = useState('')

  // AI run loading
  const [analyzing, setAnalyzing] = useState(false)
  const [aiResult, setAiResult] = useState<any>(null)
  const [selectedAnalysisForView, setSelectedAnalysisForView] = useState<any>(null)
  
  // Comparisons
  const [compareAnalysisA, setCompareAnalysisA] = useState<any>(null)
  const [compareAnalysisB, setCompareAnalysisB] = useState<any>(null)
  const [isCompareOpen, setIsCompareOpen] = useState(false)

  const fetchDealData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch credits
      const { data: profile } = await supabase
        .from('profiles')
        .select('ai_uses_remaining')
        .eq('id', user.id)
        .single()
      if (profile) {
        setAiCredits(profile.ai_uses_remaining || 0)
      }

      // Fetch specific deal intelligence workspace
      const { data: dealData, error } = await supabase
        .from('deal_intelligence_files')
        .select(`
          *,
          arv_history:arv_history_id(*),
          mao_history:mao_history_id(*),
          notes:deal_notes(*),
          call_logs:deal_call_logs(*),
          files:deal_files(*),
          analyses:deal_intelligence_analyses(*),
          timeline:deal_activity_timeline(*)
        `)
        .eq('id', id)
        .single()

      if (error || !dealData) {
        console.error('Error fetching deal file details:', error)
        router.push('/deal-intelligence')
        return
      }

      setDeal(dealData)

      // Sync form parameters
      setEditPropertyName(dealData.property_name || '')
      setEditPropertyAddress(dealData.property_address || '')
      setEditSellerName(dealData.seller_name || '')
      setEditSellerPhone(dealData.seller_phone || '')
      setEditSellerEmail(dealData.seller_email || '')

      setBeds(dealData.bedrooms ? String(dealData.bedrooms) : '')
      setBaths(dealData.bathrooms ? String(dealData.bathrooms) : '')
      setSqft(dealData.sqft ? String(dealData.sqft) : '')
      setYearBuilt(dealData.year_built ? String(dealData.year_built) : '')
      setLotSize(dealData.lot_size || '')

      // Sync linked calculations
      setLinkArvId(dealData.arv_history_id || '')
      setLinkMaoId(dealData.mao_history_id || '')

      // Set latest AI result if exists
      if (dealData.analyses && dealData.analyses.length > 0) {
        const sorted = [...dealData.analyses].sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        setAiResult(sorted[0])
      }

      // Fetch ARV & MAO histories for links dropdown
      const { data: arvs } = await supabase
        .from('arv_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (arvs) setArvList(arvs)

      const { data: maos } = await supabase
        .from('mao_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (maos) setMaoList(maos)

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDealData()
  }, [id])

  // Update Status
  const handleUpdateStatus = async (newStatus: string) => {
    const oldStatus = deal.status
    const { error } = await supabase
      .from('deal_intelligence_files')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      alert('Failed to update status: ' + error.message)
      return
    }

    // Insert timeline entry
    await supabase.from('deal_activity_timeline').insert({
      deal_id: id,
      event_type: 'Changed Status',
      description: `Transitioned deal status from ${oldStatus} to ${newStatus}.`
    })

    fetchDealData()
  }

  // Edit Basic details
  const handleSaveBasicDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase
      .from('deal_intelligence_files')
      .update({
        property_name: editPropertyName,
        property_address: editPropertyAddress,
        seller_name: editSellerName || null,
        seller_phone: editSellerPhone || null,
        seller_email: editSellerEmail || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      alert('Failed to update deal info: ' + error.message)
      return
    }

    await supabase.from('deal_activity_timeline').insert({
      deal_id: id,
      event_type: 'Updated Details',
      description: `Modified property contact card parameters.`
    })

    setIsEditDetailsOpen(false)
    fetchDealData()
  }

  // Edit specs
  const handleSaveSpecs = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase
      .from('deal_intelligence_files')
      .update({
        bedrooms: beds ? Number(beds) : null,
        bathrooms: baths ? Number(baths) : null,
        sqft: sqft ? Number(sqft) : null,
        year_built: yearBuilt ? Number(yearBuilt) : null,
        lot_size: lotSize || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      alert('Failed to update property details: ' + error.message)
      return
    }

    await supabase.from('deal_activity_timeline').insert({
      deal_id: id,
      event_type: 'Updated Specs',
      description: `Updated beds, baths, sqft, build year, and lot dimensions.`
    })

    alert('Specs saved successfully!')
    fetchDealData()
  }

  // Attach ARV / MAO links
  const handleLinkCalculations = async () => {
    const { error } = await supabase
      .from('deal_intelligence_files')
      .update({
        arv_history_id: linkArvId || null,
        mao_history_id: linkMaoId || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      alert('Failed to link calculations: ' + error.message)
      return
    }

    // Write timeline
    await supabase.from('deal_activity_timeline').insert({
      deal_id: id,
      event_type: 'Linked Calculations',
      description: `Associated ARV/MAO math limits to this deal intelligence card.`
    })

    alert('Calculations successfully attached!')
    fetchDealData()
  }

  // Add Seller Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteText.trim()) return

    const { error } = await supabase
      .from('deal_notes')
      .insert({
        deal_id: id,
        note_text: noteText.trim()
      })

    if (error) {
      alert('Failed to add note: ' + error.message)
      return
    }

    // Timeline event
    await supabase.from('deal_activity_timeline').insert({
      deal_id: id,
      event_type: 'Added Seller Note',
      description: `Logged a seller note: "${noteText.trim().substring(0, 40)}..."`
    })

    setNoteText('')
    fetchDealData()
  }

  // Log Call
  const handleLogCall = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!callSummary.trim()) return

    const { error } = await supabase
      .from('deal_call_logs')
      .insert({
        deal_id: id,
        duration: callDuration || 'Unknown',
        summary: callSummary.trim(),
        outcome: callOutcome || 'N/A'
      })

    if (error) {
      alert('Failed to log call: ' + error.message)
      return
    }

    await supabase.from('deal_activity_timeline').insert({
      deal_id: id,
      event_type: 'Logged Call',
      description: `Logged conversation summary: "${callSummary.trim().substring(0, 40)}..."`
    })

    setCallDuration('')
    setCallSummary('')
    setCallOutcome('')
    setIsLogCallOpen(false)
    fetchDealData()
  }

  // Upload File
  const handleUploadFile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFileName.trim()) return

    // Since we do mock upload, let's auto-generate a mock URL if empty
    const fileUrl = uploadFileUrl.trim() || `https://filebin.net/mock-wre/${uploadFileName.toLowerCase().replace(/\s+/g, '-')}`

    const { error } = await supabase
      .from('deal_files')
      .insert({
        deal_id: id,
        file_name: uploadFileName.trim(),
        file_url: fileUrl,
        file_type: uploadFileType
      })

    if (error) {
      alert('Failed to attach document: ' + error.message)
      return
    }

    await supabase.from('deal_activity_timeline').insert({
      deal_id: id,
      event_type: 'Uploaded File',
      description: `Attached ${uploadFileType} document: "${uploadFileName.trim()}"`
    })

    setUploadFileName('')
    setUploadFileType('photo')
    setUploadFileUrl('')
    setIsUploadFileOpen(false)
    fetchDealData()
  }

  // Run Deal Intelligence AI
  const handleRunAI = async () => {
    if (aiCredits < 1) {
      alert('Insufficient AI Uses. Please buy credits or subscribe to unlock AI Deal audits.')
      return
    }

    setAnalyzing(true)

    try {
      const res = await fetch('/api/ai/deal-intelligence/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: id })
      })

      const data = await res.json()
      if (res.ok) {
        setAiResult(data)
        confetti({ particleCount: 100, spread: 60 })
        await fetchDealData()
      } else {
        alert(data.error || 'Failed to analyze deal.')
      }
    } catch (err) {
      console.error(err)
      alert('Connection error running AI deal check.')
    } finally {
      setAnalyzing(false)
    }
  }

  // Delete Analysis Run
  const handleDeleteAnalysis = async (analysisId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to permanently delete this AI Analysis run record?')) return

    const { error } = await supabase
      .from('deal_intelligence_analyses')
      .delete()
      .eq('id', analysisId)

    if (error) {
      alert('Failed to delete analysis: ' + error.message)
    } else {
      // If we deleted the active displaying one, clear it
      if (aiResult?.id === analysisId) {
        setAiResult(null)
      }
      if (selectedAnalysisForView?.id === analysisId) {
        setSelectedAnalysisForView(null)
      }
      fetchDealData()
    }
  }

  if (loading) {
    return (
      <SidebarLayout>
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-500">Loading Workspace File Details...</p>
        </div>
      </SidebarLayout>
    )
  }

  if (!deal) return null

  // Sort notes & history elements newest first
  const sortedNotes = deal.notes ? [...deal.notes].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) : []
  const sortedCalls = deal.call_logs ? [...deal.call_logs].sort((a: any, b: any) => new Date(b.call_date).getTime() - new Date(a.created_at).getTime()) : []
  const sortedTimeline = deal.timeline ? [...deal.timeline].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) : []
  const sortedAnalyses = deal.analyses ? [...deal.analyses].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) : []

  return (
    <SidebarLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb Navigation */}
        <button
          onClick={() => router.push('/deal-intelligence')}
          className="inline-flex items-center gap-1 text-gray-500 hover:text-white transition-colors text-xs cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to CRM Workspace</span>
        </button>

        {/* CRM File Header */}
        <div className="glass-panel border border-gray-900 rounded-xl p-5 bg-slate-900/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-black text-white uppercase tracking-wide break-words max-w-[500px]">
              {deal.property_name}
            </h1>
            <p className="text-xs text-gray-400 flex items-center gap-1">
              <Home className="w-3.5 h-3.5 text-gray-600 shrink-0" />
              <span>{deal.property_address}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Select dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1.5 rounded-lg border border-gray-800">
              <span className="text-[9px] uppercase font-bold text-gray-500">Pipeline Status:</span>
              <select
                value={deal.status}
                onChange={(e) => handleUpdateStatus(e.target.value)}
                className="bg-transparent border-none text-xs text-violet-400 font-bold focus:outline-none focus:ring-0 cursor-pointer"
              >
                {STATUSES.map(s => (
                  <option key={s} value={s} className="bg-slate-950 text-gray-300">{s}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setIsEditDetailsOpen(true)}
              className="bg-slate-950 border border-gray-850 hover:bg-slate-900 text-gray-300 text-xs font-bold py-2 px-3.5 rounded-lg transition-colors cursor-pointer"
            >
              Edit Contact
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-gray-900 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-xs font-bold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
              activeTab === 'overview' ? 'border-violet-500 text-violet-400' : 'border-transparent text-gray-500 hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-2 text-xs font-bold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
              activeTab === 'notes' ? 'border-violet-500 text-violet-400' : 'border-transparent text-gray-500 hover:text-white'
            }`}
          >
            Seller Notes ({deal.notes?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('calls')}
            className={`px-4 py-2 text-xs font-bold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
              activeTab === 'calls' ? 'border-violet-500 text-violet-400' : 'border-transparent text-gray-500 hover:text-white'
            }`}
          >
            Call Logs ({deal.call_logs?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('property')}
            className={`px-4 py-2 text-xs font-bold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
              activeTab === 'property' ? 'border-violet-500 text-violet-400' : 'border-transparent text-gray-500 hover:text-white'
            }`}
          >
            Property Specs
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2 text-xs font-bold whitespace-nowrap transition-all border-b-2 cursor-pointer flex items-center gap-1 ${
              activeTab === 'ai' ? 'border-violet-500 text-violet-400' : 'border-transparent text-gray-500 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Deal AI Audit</span>
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`px-4 py-2 text-xs font-bold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
              activeTab === 'files' ? 'border-violet-500 text-violet-400' : 'border-transparent text-gray-500 hover:text-white'
            }`}
          >
            Photos & Documents ({deal.files?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-2 text-xs font-bold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
              activeTab === 'timeline' ? 'border-violet-500 text-violet-400' : 'border-transparent text-gray-500 hover:text-white'
            }`}
          >
            Timeline ({deal.timeline?.length || 0})
          </button>
        </div>

        {/* Tab Contents */}
        <div className="space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="grid md:grid-cols-3 gap-6 items-start">
              {/* Left Column: Stats and attachments */}
              <div className="md:col-span-2 space-y-6">
                {/* Contact details */}
                <div className="glass-panel border border-gray-900 rounded-xl p-5 bg-slate-900/10 space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Seller Profile Info</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase text-gray-500 block">Seller Name</span>
                      <div className="font-semibold text-white flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-gray-600" />
                        <span>{deal.seller_name || 'Not Provided'}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase text-gray-500 block">Seller Phone</span>
                      <div className="font-semibold text-violet-400 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-gray-600" />
                        <span>{deal.seller_phone || 'Not Provided'}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase text-gray-500 block">Seller Email</span>
                      <div className="font-semibold text-violet-400 flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-gray-600" />
                        <span className="truncate max-w-[150px]">{deal.seller_email || 'Not Provided'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Calculators Integration */}
                <div className="glass-panel border border-gray-900 rounded-xl p-5 bg-slate-900/10 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Linked Valuation Metrics</h3>
                    <button
                      onClick={() => setActiveTab('property')}
                      className="text-[10px] text-violet-400 font-bold hover:text-violet-300 transition-colors"
                    >
                      Attach Calculations
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* ARV Attachment Summary */}
                    <div className="bg-slate-950/60 p-4 rounded-xl border border-gray-900/80 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-bold text-violet-400">ARV Estimate</span>
                        <TrendingUp className="w-4 h-4 text-violet-400" />
                      </div>
                      {deal.arv_history ? (
                        <div className="space-y-2">
                          <div className="text-2xl font-black text-white">${deal.arv_history.calculated_arv?.toLocaleString()}</div>
                          <div className="text-[10px] text-gray-500 space-y-1">
                            <div className="flex justify-between">
                              <span>Estimated Repairs:</span>
                              <span className="text-gray-300 font-bold">${deal.arv_history.estimated_repairs?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Comp Average:</span>
                              <span className="text-gray-300">${Math.round((deal.arv_history.comp_1 + deal.arv_history.comp_2 + deal.arv_history.comp_3) / 3).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-2 text-center text-[10px] text-gray-500">
                          No ARV attached. Head to specs tab to attach or create.
                        </div>
                      )}
                    </div>

                    {/* MAO Attachment Summary */}
                    <div className="bg-slate-950/60 p-4 rounded-xl border border-gray-900/80 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-bold text-emerald-400">MAO 70% Target</span>
                        <Calculator className="w-4 h-4 text-emerald-400" />
                      </div>
                      {deal.mao_history ? (
                        <div className="space-y-2">
                          <div className="text-2xl font-black text-emerald-400">${deal.mao_history.calculated_mao?.toLocaleString()}</div>
                          <div className="text-[10px] text-gray-500 space-y-1">
                            <div className="flex justify-between">
                              <span>Wholesale Fee Target:</span>
                              <span className="text-gray-300 font-bold">${deal.mao_history.assignment_fee?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Repairs Base:</span>
                              <span className="text-gray-300">${deal.mao_history.estimated_repairs?.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-2 text-center text-[10px] text-gray-500">
                          No MAO attached. Head to specs tab to attach or create.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Latest AI Recommendation */}
                {aiResult ? (
                  <div className="glass-panel border border-violet-900/30 bg-violet-950/5 rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-violet-400" />
                        <span>Deal AI Audit (Latest Run)</span>
                      </h3>
                      <button
                        onClick={() => setActiveTab('ai')}
                        className="text-[10px] text-violet-400 font-bold hover:text-violet-300 transition-colors"
                      >
                        All Analyses
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-gray-900">
                        <div className="text-[8px] uppercase text-gray-500">Deal Score</div>
                        <div className="text-lg font-black text-white">{aiResult.deal_score}/10</div>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-gray-900">
                        <div className="text-[8px] uppercase text-gray-500">Seller Motivation</div>
                        <div className="text-lg font-black text-amber-400">{aiResult.motivation_score}/10</div>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-gray-900">
                        <div className="text-[8px] uppercase text-gray-500">Risk Score</div>
                        <div className="text-lg font-black text-red-400">{aiResult.risk_score}/10</div>
                      </div>
                    </div>

                    <div className="text-xs space-y-2">
                      <div className="flex justify-between items-center py-1.5 border-b border-gray-900/60">
                        <span className="text-gray-500">Recommended Offer Range:</span>
                        <span className="text-emerald-400 font-bold">{aiResult.recommended_offer_range}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-gray-500 block">Recommended Next Action:</span>
                        <p className="text-gray-300 italic leading-relaxed text-[11px]">{aiResult.recommended_next_action}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="glass-panel border border-gray-900 rounded-xl p-6 text-center space-y-2">
                    <Sparkles className="w-7 h-7 text-violet-400/40 mx-auto animate-pulse" />
                    <h4 className="text-xs font-bold text-gray-400">Deal Intelligence AI Recommendations</h4>
                    <p className="text-[10px] text-gray-500 max-w-sm mx-auto leading-relaxed">
                      Analyze property parameters, comps, conversation logs, and timeline notes to identify negotiation leverages.
                    </p>
                    <button
                      onClick={() => setActiveTab('ai')}
                      className="bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
                    >
                      Audit Deal Now
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Spec Summaries and Latest Timeline */}
              <div className="space-y-6 text-xs">
                {/* Spec Summary Card */}
                <div className="glass-panel border border-gray-900 rounded-xl p-5 bg-slate-900/10 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Property Details</h3>
                    <button
                      onClick={() => setActiveTab('property')}
                      className="text-[10px] text-violet-400 font-bold hover:text-violet-300"
                    >
                      Edit specs
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between py-1 border-b border-gray-900">
                      <span className="text-gray-500">Bedrooms:</span>
                      <span className="text-gray-300 font-semibold">{deal.bedrooms || '--'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-900">
                      <span className="text-gray-500">Bathrooms:</span>
                      <span className="text-gray-300 font-semibold">{deal.bathrooms || '--'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-900">
                      <span className="text-gray-500">Square Feet:</span>
                      <span className="text-gray-300 font-semibold">{deal.sqft ? `${deal.sqft.toLocaleString()} sqft` : '--'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-900">
                      <span className="text-gray-500">Year Built:</span>
                      <span className="text-gray-300 font-semibold">{deal.year_built || '--'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-900">
                      <span className="text-gray-500">Lot Size:</span>
                      <span className="text-gray-300 font-semibold">{deal.lot_size || '--'}</span>
                    </div>
                  </div>
                </div>

                {/* Timeline snippet */}
                <div className="glass-panel border border-gray-900 rounded-xl p-5 bg-slate-900/10 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Latest Activity</h3>
                    <button
                      onClick={() => setActiveTab('timeline')}
                      className="text-[10px] text-violet-400 font-bold hover:text-violet-300"
                    >
                      Full history
                    </button>
                  </div>

                  {sortedTimeline.length > 0 ? (
                    <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-900">
                      {sortedTimeline.slice(0, 4).map((event) => (
                        <div key={event.id} className="pl-5 relative">
                          <span className="absolute left-[5px] top-1.5 w-1.5 h-1.5 rounded-full bg-violet-500" />
                          <div className="text-[10px] font-bold text-white uppercase tracking-wide">{event.event_type}</div>
                          <div className="text-[9px] text-gray-500 leading-normal mt-0.5">{event.description}</div>
                          <div className="text-[8px] text-gray-600 mt-0.5">{new Date(event.created_at).toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-600 text-[10px]">
                      No events recorded.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SELLER NOTES TIMELINE */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              {/* Note Submission Form */}
              <form onSubmit={handleAddNote} className="glass-panel border border-gray-900 rounded-xl p-5 bg-slate-900/10 space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Add Chronological Seller Note</h3>
                <div>
                  <textarea
                    rows={3}
                    required
                    placeholder="Seller inherited this property and wants to sell fast. Estimated roof repairs: $15,000..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="w-full bg-slate-950 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500 resize-none"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer"
                  >
                    Append Note
                  </button>
                </div>
              </form>

              {/* Chronological Notes list */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Conversation & Condition Notes Timeline</h3>
                {sortedNotes.length > 0 ? (
                  <div className="space-y-3">
                    {sortedNotes.map((note) => (
                      <div key={note.id} className="glass-panel border border-gray-950 bg-slate-900/20 p-4 rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-[9px] text-gray-500 border-b border-gray-900/60 pb-1.5">
                          <span className="font-bold uppercase tracking-wider text-violet-400">Seller Note Entry</span>
                          <span>{new Date(note.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-gray-200 leading-relaxed whitespace-pre-line">
                          {note.note_text}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="glass-panel border border-gray-900 rounded-xl p-8 text-center text-xs text-gray-600">
                    No notes recorded. Write your first note above to track conversation parameters.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CALL LOGS */}
          {activeTab === 'calls' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Chronological Call Records</h3>
                <button
                  onClick={() => setIsLogCallOpen(true)}
                  className="inline-flex items-center gap-1 bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold py-2 px-3 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log Call</span>
                </button>
              </div>

              {sortedCalls.length > 0 ? (
                <div className="glass-panel border border-gray-900 rounded-xl overflow-hidden bg-slate-900/10">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-900 text-gray-500 text-[10px] uppercase font-semibold">
                        <th className="py-2 px-3">Call Time</th>
                        <th className="py-2 px-3">Duration</th>
                        <th className="py-2 px-3">Call Details / Summary</th>
                        <th className="py-2 px-3">Outcome</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-900 text-gray-300">
                      {sortedCalls.map((call) => (
                        <tr key={call.id} className="hover:bg-slate-900/40">
                          <td className="py-3 px-3 text-gray-500 whitespace-nowrap">{new Date(call.call_date).toLocaleString()}</td>
                          <td className="py-3 px-3 font-semibold text-white">{call.duration}</td>
                          <td className="py-3 px-3 break-words max-w-[300px]">{call.summary}</td>
                          <td className="py-3 px-3">
                            <span className="py-0.5 px-2 rounded-full border border-gray-800 text-[10px] bg-slate-950 font-medium">
                              {call.outcome}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="glass-panel border border-gray-900 rounded-xl p-8 text-center text-xs text-gray-600">
                  No call logs saved. Tap log call above to document phone calls.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PROPERTY SPECS & LINKS */}
          {activeTab === 'property' && (
            <div className="grid md:grid-cols-2 gap-6 items-start">
              {/* Spec Form */}
              <form onSubmit={handleSaveSpecs} className="glass-panel border border-gray-900 rounded-xl p-5 bg-slate-900/10 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Property Specifications</h3>
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Bedrooms</label>
                      <input
                        type="number"
                        placeholder="3"
                        value={beds}
                        onChange={(e) => setBeds(e.target.value)}
                        className="w-full bg-slate-950 border border-gray-850 rounded-lg py-1.5 px-2.5 text-xs text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Bathrooms</label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="2"
                        value={baths}
                        onChange={(e) => setBaths(e.target.value)}
                        className="w-full bg-slate-950 border border-gray-850 rounded-lg py-1.5 px-2.5 text-xs text-gray-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Sq Footage</label>
                      <input
                        type="number"
                        placeholder="1800"
                        value={sqft}
                        onChange={(e) => setSqft(e.target.value)}
                        className="w-full bg-slate-950 border border-gray-850 rounded-lg py-1.5 px-2.5 text-xs text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Year Built</label>
                      <input
                        type="number"
                        placeholder="1995"
                        value={yearBuilt}
                        onChange={(e) => setYearBuilt(e.target.value)}
                        className="w-full bg-slate-950 border border-gray-850 rounded-lg py-1.5 px-2.5 text-xs text-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Lot Size</label>
                      <input
                        type="text"
                        placeholder="0.25 acres"
                        value={lotSize}
                        onChange={(e) => setLotSize(e.target.value)}
                        className="w-full bg-slate-950 border border-gray-850 rounded-lg py-1.5 px-2.5 text-xs text-gray-100"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer"
                  >
                    Save Property Specifications
                  </button>
                </div>
              </form>

              {/* Calculator Integration links */}
              <div className="glass-panel border border-gray-900 rounded-xl p-5 bg-slate-900/10 space-y-4 text-xs">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Calculator Integration</h3>
                <p className="text-[10px] text-gray-500 leading-normal">
                  Connect this deal file to existing ARV and MAO calculations from your calculators history to automatically load deal target offer limits.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[9px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Attach ARV Record</label>
                    <select
                      value={linkArvId}
                      onChange={(e) => setLinkArvId(e.target.value)}
                      className="w-full bg-slate-950 border border-gray-850 rounded-lg py-2 px-3 text-xs text-gray-300"
                    >
                      <option value="">-- No Record --</option>
                      {arvList.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.property_name} (ARV: ${a.calculated_arv?.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Attach MAO Record</label>
                    <select
                      value={linkMaoId}
                      onChange={(e) => setLinkMaoId(e.target.value)}
                      className="w-full bg-slate-950 border border-gray-850 rounded-lg py-2 px-3 text-xs text-gray-300"
                    >
                      <option value="">-- No Record --</option>
                      {maoList.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.property_name} (MAO: ${m.calculated_mao?.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleLinkCalculations}
                      className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer"
                    >
                      Attach Calculations
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DEAL AI AUDIT */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              {/* Header and triggers */}
              <div className="glass-panel border border-gray-900 rounded-xl p-5 bg-slate-900/10 flex justify-between items-center gap-4">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                    <span>Deal Intelligence AI Advisor</span>
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Evaluates conversations, price updates, repair margins, and seller urgency triggers to audit deals.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-gray-400 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-gray-900">
                    <Coins className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Audits: {aiCredits}</span>
                  </div>
                  <button
                    onClick={handleRunAI}
                    disabled={analyzing}
                    className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold py-2.5 px-4 rounded-lg flex items-center gap-1 transition-all disabled:opacity-40 cursor-pointer"
                  >
                    {analyzing ? 'Analyzing Deal history...' : 'Audit Deal (-1 Use)'}
                  </button>
                </div>
              </div>

              {/* Compare Trigger */}
              {sortedAnalyses.length >= 2 && (
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setCompareAnalysisA(sortedAnalyses[0])
                      setCompareAnalysisB(sortedAnalyses[1])
                      setIsCompareOpen(true)
                    }}
                    className="text-[10px] font-bold text-violet-400 hover:text-violet-300 border border-violet-800/40 px-3 py-1.5 rounded-lg bg-violet-950/10 hover:bg-violet-950/20 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>Compare Analysis Versions</span>
                  </button>
                </div>
              )}

              {/* Main AI Dashboard result */}
              {aiResult ? (
                <div className="grid md:grid-cols-3 gap-6 items-start animate-fade-in text-xs">
                  {/* Scores dashboard */}
                  <div className="glass-panel border border-gray-900 rounded-xl p-5 space-y-4 bg-slate-900/20">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">AI Valuation Indexes</h4>

                    <div className="space-y-4">
                      {/* Deal score */}
                      <div>
                        <div className="flex justify-between items-center text-[9px] mb-1 font-semibold">
                          <span className="text-gray-400">DEAL SCORE</span>
                          <span className="text-violet-400">{aiResult.deal_score}/10</span>
                        </div>
                        <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-gray-900">
                          <div className="h-full bg-violet-500" style={{ width: `${aiResult.deal_score * 10}%` }} />
                        </div>
                      </div>

                      {/* Motivation score */}
                      <div>
                        <div className="flex justify-between items-center text-[9px] mb-1 font-semibold">
                          <span className="text-gray-400">SELLER MOTIVATION</span>
                          <span className="text-amber-400">{aiResult.motivation_score}/10</span>
                        </div>
                        <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-gray-900">
                          <div className="h-full bg-amber-500" style={{ width: `${aiResult.motivation_score * 10}%` }} />
                        </div>
                      </div>

                      {/* Risk score */}
                      <div>
                        <div className="flex justify-between items-center text-[9px] mb-1 font-semibold">
                          <span className="text-gray-400">RISK SCORE</span>
                          <span className="text-red-400">{aiResult.risk_score}/10</span>
                        </div>
                        <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-gray-900">
                          <div className="h-full bg-red-500" style={{ width: `${aiResult.risk_score * 10}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="h-px bg-gray-900 mt-2" />

                    <div>
                      <span className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">Recommended Offer Target</span>
                      <div className="text-base font-black text-emerald-400">{aiResult.recommended_offer_range}</div>
                    </div>
                  </div>

                  {/* AI lists output */}
                  <div className="md:col-span-2 space-y-4">
                    {/* Next Action recommendation banner */}
                    <div className="bg-violet-950/15 border border-violet-900/30 p-4 rounded-xl space-y-1">
                      <span className="text-[9px] uppercase font-bold text-violet-400 flex items-center gap-1">
                        <ListTodo className="w-3.5 h-3.5" />
                        <span>Recommended Next Action</span>
                      </span>
                      <p className="text-xs text-gray-200 leading-relaxed font-semibold italic">
                        {aiResult.recommended_next_action}
                      </p>
                    </div>

                    {/* Red Flags & Suggestions tabs/grids */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      {/* Negotiation tips */}
                      <div className="bg-slate-950/40 border border-gray-900 p-4 rounded-xl space-y-2">
                        <span className="text-[9px] uppercase font-bold text-gray-400 block mb-1">Negotiation Leverage Suggestions</span>
                        <ul className="space-y-2 text-[10px] text-gray-300">
                          {(aiResult.negotiation_suggestions || []).map((tip: string, idx: number) => (
                            <li key={idx} className="flex gap-1.5 items-start">
                              <span className="text-violet-400 font-bold shrink-0">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Red Flags */}
                      <div className="bg-slate-950/40 border border-gray-900 p-4 rounded-xl space-y-2">
                        <span className="text-[9px] uppercase font-bold text-red-400 block mb-1">Potential Red Flags</span>
                        <ul className="space-y-2 text-[10px] text-gray-300">
                          {(aiResult.potential_red_flags || []).map((flag: string, idx: number) => (
                            <li key={idx} className="flex gap-1.5 items-start">
                              <span className="text-red-400 font-bold shrink-0">•</span>
                              <span>{flag}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Report Summary */}
                    <div className="bg-slate-950/40 border border-gray-900 p-4 rounded-xl space-y-1.5">
                      <span className="text-[9px] uppercase font-bold text-gray-400 block">Deal Summary Report</span>
                      <p className="text-[11px] text-gray-400 leading-relaxed whitespace-pre-line">
                        {aiResult.summary}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-panel border border-gray-900 rounded-xl p-10 text-center text-xs text-gray-600">
                  No AI Deal analysis audits recorded. Click Audit Deal above to execute a wholesaling Deal Audit.
                </div>
              )}

              {/* Analysis History log */}
              <div className="space-y-3 pt-4 border-t border-gray-900">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Historical Analysis Audit Reports</h3>
                {sortedAnalyses.length > 0 ? (
                  <div className="glass-panel border border-gray-900 rounded-xl overflow-hidden bg-slate-900/10">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-gray-900 text-gray-500 text-[10px] uppercase font-semibold">
                          <th className="py-2 px-3">Run Date</th>
                          <th className="py-2 px-3">Deal Score</th>
                          <th className="py-2 px-3">Seller Motivation</th>
                          <th className="py-2 px-3">Brief Summary</th>
                          <th className="py-2 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-900 text-gray-300">
                        {sortedAnalyses.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-900/40">
                            <td className="py-3 px-3 text-gray-500">{new Date(item.created_at).toLocaleString()}</td>
                            <td className="py-3 px-3 font-bold text-violet-400">{item.deal_score}/10</td>
                            <td className="py-3 px-3 font-bold text-amber-500">{item.motivation_score}/10</td>
                            <td className="py-3 px-3 truncate max-w-[200px] text-gray-400">{item.recommended_next_action}</td>
                            <td className="py-3 px-3 text-right space-x-2 whitespace-nowrap">
                              <button
                                onClick={() => setSelectedAnalysisForView(item)}
                                className="inline-flex items-center gap-1 bg-slate-950 border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white text-[9px] font-semibold py-1 px-2 rounded transition-all cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>View</span>
                              </button>
                              <button
                                onClick={(e) => handleDeleteAnalysis(item.id, e)}
                                className="inline-flex items-center gap-1 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 hover:border-red-900/50 text-red-400 text-[9px] font-semibold py-1 px-2 rounded transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Delete</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center text-xs text-gray-600">No previous audits logs found.</div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: PHOTOS & DOCUMENTS */}
          {activeTab === 'files' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Property Attachments</h3>
                <button
                  onClick={() => setIsUploadFileOpen(true)}
                  className="inline-flex items-center gap-1 bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold py-2 px-3 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Attach Document</span>
                </button>
              </div>

              {deal.files && deal.files.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {deal.files.map((file: any) => {
                    const isPhoto = file.file_type === 'photo'
                    return (
                      <div key={file.id} className="glass-panel border border-gray-900 p-4 rounded-xl flex items-center gap-3 bg-slate-900/20">
                        <div className="p-2 rounded bg-slate-950 border border-gray-850 text-violet-400 shrink-0">
                          {isPhoto ? <ImageIcon className="w-5 h-5" /> : <Paperclip className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="text-xs font-semibold text-white truncate">{file.file_name}</div>
                          <div className="text-[9px] text-gray-500 uppercase font-semibold">{file.file_type}</div>
                          <div className="text-[8px] text-gray-600">{new Date(file.created_at).toLocaleDateString()}</div>
                        </div>
                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-gray-600 hover:text-white rounded hover:bg-slate-950 transition-all shrink-0 cursor-pointer"
                          title="Open File link"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="glass-panel border border-gray-900 rounded-xl p-8 text-center text-xs text-gray-600">
                  No attachments linked. Use the attach button above to log property photos and inspection PDFs.
                </div>
              )}
            </div>
          )}

          {/* TAB 7: TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Chronological Activity Timeline</h3>
              {sortedTimeline.length > 0 ? (
                <div className="relative border-l-2 border-gray-900 ml-4 pl-6 space-y-5">
                  {sortedTimeline.map((item) => (
                    <div key={item.id} className="relative">
                      {/* Timeline Dot */}
                      <span className="absolute -left-[30px] top-1 w-3 h-3 rounded-full bg-violet-600 border border-slate-950 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      </span>
                      <div className="text-xs font-black text-white flex items-center gap-2">
                        <span>{item.event_type}</span>
                        <span className="text-[9px] text-gray-600 font-normal">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 max-w-xl">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-panel border border-gray-900 rounded-xl p-8 text-center text-xs text-gray-600">
                  Timeline empty.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: EDIT CONTACT MODAL */}
      {isEditDetailsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <form
            onSubmit={handleSaveBasicDetails}
            className="glass-panel border border-gray-900 rounded-xl max-w-md w-full bg-slate-950 p-6 space-y-4 shadow-2xl relative"
          >
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Edit Contact Details</h3>
              <p className="text-[10px] text-gray-500 mt-1">Modify core property name, address, and seller contact parameters.</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[9px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Property Name</label>
                <input
                  type="text"
                  required
                  value={editPropertyName}
                  onChange={(e) => setEditPropertyName(e.target.value)}
                  className="w-full bg-slate-900 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-[9px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Property Address</label>
                <input
                  type="text"
                  required
                  value={editPropertyAddress}
                  onChange={(e) => setEditPropertyAddress(e.target.value)}
                  className="w-full bg-slate-900 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-[9px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Seller Name</label>
                <input
                  type="text"
                  value={editSellerName}
                  onChange={(e) => setEditSellerName(e.target.value)}
                  className="w-full bg-slate-900 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Seller Phone</label>
                  <input
                    type="text"
                    value={editSellerPhone}
                    onChange={(e) => setEditSellerPhone(e.target.value)}
                    className="w-full bg-slate-900 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Seller Email</label>
                  <input
                    type="email"
                    value={editSellerEmail}
                    onChange={(e) => setEditSellerEmail(e.target.value)}
                    className="w-full bg-slate-900 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsEditDetailsOpen(false)}
                className="bg-slate-900 hover:bg-slate-850 border border-gray-800 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer"
              >
                Save Details
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: LOG A CALL MODAL */}
      {isLogCallOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <form
            onSubmit={handleLogCall}
            className="glass-panel border border-gray-900 rounded-xl max-w-md w-full bg-slate-950 p-6 space-y-4 shadow-2xl relative"
          >
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Log Conversation call</h3>
              <p className="text-[10px] text-gray-500 mt-1">Record telephone conversation summaries for AI analytics memory.</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[9px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Call Duration</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5 minutes or 12 mins"
                  value={callDuration}
                  onChange={(e) => setCallDuration(e.target.value)}
                  className="w-full bg-slate-900 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-[9px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Call Summary & Notes</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Seller reduced asking price to $180k. Highly motivated to sell..."
                  value={callSummary}
                  onChange={(e) => setCallSummary(e.target.value)}
                  className="w-full bg-slate-900 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Call Outcome</label>
                <input
                  type="text"
                  placeholder="e.g. Price Reduced, Requested Proof of Funds, Left VM"
                  value={callOutcome}
                  onChange={(e) => setCallOutcome(e.target.value)}
                  className="w-full bg-slate-900 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsLogCallOpen(false)}
                className="bg-slate-900 hover:bg-slate-850 border border-gray-800 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer"
              >
                Log Call
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: ATTACH DOCUMENT / FILE */}
      {isUploadFileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <form
            onSubmit={handleUploadFile}
            className="glass-panel border border-gray-900 rounded-xl max-w-md w-full bg-slate-950 p-6 space-y-4 shadow-2xl relative"
          >
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Attach Property File</h3>
              <p className="text-[10px] text-gray-500 mt-1">Upload property pictures, inspection contracts or documents.</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[9px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">File Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Front Yard Damage photo or inspection_report.pdf"
                  value={uploadFileName}
                  onChange={(e) => setUploadFileName(e.target.value)}
                  className="w-full bg-slate-900 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-[9px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Attachment Type</label>
                <select
                  value={uploadFileType}
                  onChange={(e) => setUploadFileType(e.target.value)}
                  className="w-full bg-slate-900 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-350 focus:outline-none focus:border-violet-500"
                >
                  <option value="photo">Photo / Image</option>
                  <option value="report">Inspection Report</option>
                  <option value="contract">Seller Document / Contract</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-semibold text-gray-500 mb-1 uppercase tracking-wider">Mock Resource URL (Optional)</label>
                <input
                  type="text"
                  placeholder="https://example.com/files/inspections.pdf"
                  value={uploadFileUrl}
                  onChange={(e) => setUploadFileUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsUploadFileOpen(false)}
                className="bg-slate-900 hover:bg-slate-850 border border-gray-800 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer"
              >
                Attach File
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: VIEW SINGLE HISTORICAL ANALYSIS */}
      {selectedAnalysisForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-panel border border-gray-900 rounded-xl max-w-md w-full bg-slate-950 p-6 space-y-4 shadow-2xl relative max-h-[85vh] overflow-y-auto">
            {/* Close */}
            <button
              onClick={() => setSelectedAnalysisForView(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-[8px] font-bold uppercase py-0.5 px-2 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded">
                Historical AI Audit Details
              </span>
              <h3 className="text-xs font-black text-white mt-2">
                Audit run on {new Date(selectedAnalysisForView.created_at).toLocaleString()}
              </h3>
            </div>

            <div className="border-t border-b border-gray-900 py-3 space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-900 p-2 rounded">
                  <div className="text-[8px] uppercase text-gray-500">Deal Score</div>
                  <div className="text-sm font-bold text-white">{selectedAnalysisForView.deal_score}/10</div>
                </div>
                <div className="bg-slate-900 p-2 rounded">
                  <div className="text-[8px] uppercase text-gray-500">Motivation</div>
                  <div className="text-sm font-bold text-amber-500">{selectedAnalysisForView.motivation_score}/10</div>
                </div>
                <div className="bg-slate-900 p-2 rounded">
                  <div className="text-[8px] uppercase text-gray-500">Risk Score</div>
                  <div className="text-sm font-bold text-red-500">{selectedAnalysisForView.risk_score}/10</div>
                </div>
              </div>

              <div className="flex justify-between py-1.5 border-b border-gray-900/60">
                <span className="text-gray-500">Target Range:</span>
                <span className="text-emerald-400 font-bold">{selectedAnalysisForView.recommended_offer_range}</span>
              </div>

              <div className="space-y-1">
                <span className="text-gray-500 block font-bold">Recommended Next Action:</span>
                <p className="text-gray-200 italic leading-relaxed text-[11px]">{selectedAnalysisForView.recommended_next_action}</p>
              </div>

              <div className="space-y-1">
                <span className="text-gray-500 block font-bold">Summary Report:</span>
                <p className="text-gray-400 leading-relaxed text-[10px] whitespace-pre-line bg-slate-900 p-2 rounded">{selectedAnalysisForView.summary}</p>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setSelectedAnalysisForView(null)}
                className="bg-slate-900 hover:bg-slate-850 border border-gray-800 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: SIDE-BY-SIDE COMPARE ANALYSES */}
      {isCompareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-panel border border-gray-900 rounded-xl max-w-2xl w-full bg-slate-950 p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Close */}
            <button
              onClick={() => setIsCompareOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Compare AI Analysis Versions</h3>
              <p className="text-[10px] text-gray-500 mt-1">Contrast historical motivation scores, deal metrics, and suggestions side-by-side.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              {/* Select version A */}
              <div>
                <label className="block text-[8px] font-semibold text-gray-500 uppercase mb-1">Version A Date</label>
                <select
                  value={compareAnalysisA?.id || ''}
                  onChange={(e) => setCompareAnalysisA(sortedAnalyses.find(x => x.id === e.target.value))}
                  className="w-full bg-slate-905 border border-gray-850 rounded py-1.5 px-2 text-xs text-gray-300"
                >
                  {sortedAnalyses.map(x => (
                    <option key={x.id} value={x.id}>{new Date(x.created_at).toLocaleString()}</option>
                  ))}
                </select>
              </div>

              {/* Select version B */}
              <div>
                <label className="block text-[8px] font-semibold text-gray-500 uppercase mb-1">Version B Date</label>
                <select
                  value={compareAnalysisB?.id || ''}
                  onChange={(e) => setCompareAnalysisB(sortedAnalyses.find(x => x.id === e.target.value))}
                  className="w-full bg-slate-905 border border-gray-850 rounded py-1.5 px-2 text-xs text-gray-300"
                >
                  {sortedAnalyses.map(x => (
                    <option key={x.id} value={x.id}>{new Date(x.created_at).toLocaleString()}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Compare Content details */}
            {compareAnalysisA && compareAnalysisB ? (
              <div className="grid grid-cols-2 gap-4 border-t border-b border-gray-900 py-3 text-[11px] leading-relaxed">
                {/* Version A info */}
                <div className="space-y-3 border-r border-gray-900 pr-4">
                  <div className="space-y-1">
                    <span className="text-[8px] font-semibold text-gray-500 uppercase block">Score Metrics</span>
                    <div className="font-bold text-white">Deal Score: <span className="text-violet-400">{compareAnalysisA.deal_score}/10</span></div>
                    <div className="font-bold text-white">Motivation Score: <span className="text-amber-400">{compareAnalysisA.motivation_score}/10</span></div>
                    <div className="font-bold text-white">Risk Score: <span className="text-red-400">{compareAnalysisA.risk_score}/10</span></div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[8px] font-semibold text-gray-500 uppercase block">Offer Target Range</span>
                    <div className="text-emerald-400 font-bold">{compareAnalysisA.recommended_offer_range}</div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[8px] font-semibold text-gray-500 uppercase block">Next Action Suggestion</span>
                    <p className="text-gray-300 italic">{compareAnalysisA.recommended_next_action}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[8px] font-semibold text-gray-500 uppercase block">Summary Log</span>
                    <p className="text-gray-400 truncate hover:text-white" title={compareAnalysisA.summary}>{compareAnalysisA.summary}</p>
                  </div>
                </div>

                {/* Version B info */}
                <div className="space-y-3 pl-2">
                  <div className="space-y-1">
                    <span className="text-[8px] font-semibold text-gray-500 uppercase block">Score Metrics</span>
                    <div className="font-bold text-white">Deal Score: <span className="text-violet-400">{compareAnalysisB.deal_score}/10</span></div>
                    <div className="font-bold text-white">Motivation Score: <span className="text-amber-400">{compareAnalysisB.motivation_score}/10</span></div>
                    <div className="font-bold text-white">Risk Score: <span className="text-red-400">{compareAnalysisB.risk_score}/10</span></div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[8px] font-semibold text-gray-500 uppercase block">Offer Target Range</span>
                    <div className="text-emerald-400 font-bold">{compareAnalysisB.recommended_offer_range}</div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[8px] font-semibold text-gray-500 uppercase block">Next Action Suggestion</span>
                    <p className="text-gray-300 italic">{compareAnalysisB.recommended_next_action}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[8px] font-semibold text-gray-500 uppercase block">Summary Log</span>
                    <p className="text-gray-400 truncate hover:text-white" title={compareAnalysisB.summary}>{compareAnalysisB.summary}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-gray-500">
                Select two analysis runs to begin contrast evaluation.
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setIsCompareOpen(false)}
                className="bg-slate-900 hover:bg-slate-850 border border-gray-800 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  )
}
