'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import SidebarLayout from '@/components/dashboard/SidebarLayout'
import { createClient } from '@/lib/supabase/client'
import { 
  Mic, 
  Trash2, 
  Loader2, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  Coins, 
  Database,
  ArrowUpRight,
  FileText,
  Crown
} from 'lucide-react'
import confetti from 'canvas-confetti'

interface SimpleDeal {
  id: string
  property_name: string
}

interface VoiceNote {
  id: string
  file_name: string
  deal_id: string | null
  created_at: string
  status: string
  transcript?: string
  asking_price?: string
  seller_motivation?: string
  property_condition?: string
  timeline?: string
  recommended_next_action?: string
  summary?: string
  deal_intelligence_files?: { property_name: string } | null
}

export default function VoiceNotesPage() {
  const supabase = createClient()

  // States
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [deals, setDeals] = useState<SimpleDeal[]>([])
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([])
  const [loading, setLoading] = useState(true)
  const [userCredits, setUserCredits] = useState(0)


  // Upload States
  const [selectedDealId, setSelectedDealId] = useState('')
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Accordion state
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({})

  // Modals
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [deletingNote, setDeletingNote] = useState<VoiceNote | null>(null)

  const fetchVoiceNotes = useCallback(async () => {
    const res = await fetch('/api/voice-notes/list')
    const data = await res.json()
    if (res.ok) {
      setVoiceNotes(data.voiceNotes || [])
    }
  }, [])

  const fetchUserDataAndDeals = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch credits & profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('ai_uses_remaining, subscription_status')
        .eq('id', user.id)
        .single()
      if (profile) {
        setUserCredits(profile.ai_uses_remaining || 0)
      }

      // Fetch subscription
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      setIsSubscribed(!!sub || profile?.subscription_status === 'active')


      // Fetch deal workspaces
      const { data: dealFiles } = await supabase
        .from('deal_intelligence_files')
        .select('id, property_name')
        .order('created_at', { ascending: false })
      if (dealFiles) {
        setDeals(dealFiles)
      }

      // Fetch voice notes
      await fetchVoiceNotes()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [supabase, fetchVoiceNotes])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUserDataAndDeals()
    }, 0)
    return () => clearTimeout(timer)
  }, [fetchUserDataAndDeals])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    setErrorMessage('')

    const file = e.dataTransfer.files?.[0]
    if (file) {
      await processSelectedFile(file)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    setErrorMessage('')
    const file = e.target.files?.[0]
    if (file) {
      await processSelectedFile(file)
    }
  }

  const processSelectedFile = async (file: File) => {
    // 1. Verify credits
    if (userCredits < 2) {
      setShowUpgradeModal(true)
      return
    }

    // 2. Validate Type
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/vnd.dlna.adts', 'audio/x-wav']
    const fileExt = file.name.split('.').pop()?.toLowerCase()
    const allowedExts = ['mp3', 'wav', 'm4a', 'mp4']
    const isTypeAllowed = allowedTypes.includes(file.type) || (fileExt && allowedExts.includes(fileExt))

    if (!isTypeAllowed) {
      setErrorMessage('Unsupported file format. Please upload MP3, WAV, or M4A.')
      return
    }

    // 3. Validate Size
    const maxSizeBytes = 25 * 1024 * 1024 // 25MB
    if (file.size > maxSizeBytes) {
      setErrorMessage('File size exceeds the 25MB limit.')
      return
    }

    // 4. Trigger Upload
    await uploadVoiceNote(file)
  }

  const uploadVoiceNote = async (file: File) => {
    try {
      setUploading(true)
      setUploadProgress(0)

      const formData = new FormData()
      formData.append('file', file)
      if (selectedDealId) {
        formData.append('dealId', selectedDealId)
      }

      // Upload file
      const res = await fetch('/api/voice-notes/upload', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload audio file.')
      }

      const voiceNoteId = data.voiceNoteId
      setUploadProgress(null)

      // Start processing AI analysis
      await analyzeVoiceNote(voiceNoteId)
    } catch (err) {
      const error = err as Error
      console.error(error)
      setErrorMessage(error.message || 'Failed to complete upload.')
      setUploading(false)
      fetchUserDataAndDeals()
    }
  }

  const analyzeVoiceNote = async (voiceNoteId: string) => {
    try {
      setUploading(true)
      
      const res = await fetch('/api/voice-notes/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceNoteId })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'AI transcription and analysis failed.')
      }

      confetti({ particleCount: 150, spread: 80 })
      
      // Auto expand the completed note
      setExpandedNotes(prev => ({ ...prev, [voiceNoteId]: true }))
    } catch (err) {
      const error = err as Error
      console.error(error)
      alert('Analysis Error: ' + error.message)
    } finally {
      setUploading(false)
      setSelectedDealId('')
      fetchUserDataAndDeals()
    }
  }

  const handleDeleteVoiceNote = async () => {
    if (!deletingNote) return

    try {
      const res = await fetch('/api/voice-notes/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceNoteId: deletingNote.id })
      })

      if (res.ok) {
        setDeletingNote(null)
        fetchVoiceNotes()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete voice note.')
      }
    } catch (err) {
      console.error(err)
      alert('Connection error deleting voice note.')
    }
  }

  const handleSaveToDealIntelligence = async (note: VoiceNote) => {
    const dealId = note.deal_id
    if (!dealId) {
      alert('This voice note is not linked to any Deal Intelligence workspace. Please select a deal when uploading or retry linking.')
      return
    }

    try {
      const { error } = await supabase
        .from('deal_intelligence_analyses')
        .insert({
          deal_id: dealId,
          deal_score: null,
          motivation_score: null,
          risk_score: null,
          recommended_offer_range: note.asking_price && note.asking_price !== 'Not mentioned' ? `Asking Price: ${note.asking_price}` : 'N/A',
          negotiation_suggestions: [
            `Seller Motivation: ${note.seller_motivation}`,
            `Property Condition: ${note.property_condition}`,
            `Urgency Timeline: ${note.timeline}`
          ],
          potential_red_flags: [],
          recommended_next_action: note.recommended_next_action,
          summary: note.summary
        })

      if (error) {
        alert('Failed to save analysis: ' + error.message)
        return
      }

      // Write timeline
      await supabase.from('deal_activity_timeline').insert({
        deal_id: dealId,
        event_type: 'Imported Voice Note AI',
        description: `Imported voice note analysis results from conversation: "${note.file_name}"`
      })

      alert('Success! Voice Note AI audit report successfully imported into Deal Intelligence workspace.')
    } catch (err) {
      const error = err as Error
      console.error(error)
      alert('Error importing to CRM: ' + error.message)
    }
  }

  const toggleAccordion = (noteId: string) => {
    setExpandedNotes(prev => ({
      ...prev,
      [noteId]: !prev[noteId]
    }))
  }

  if (!isSubscribed && !loading) {
    return (
      <SidebarLayout>
        <div className="max-w-md mx-auto my-12 p-8 glass-panel rounded-2xl border border-violet-500/20 text-center space-y-6">
          <div className="inline-flex p-4 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Crown className="w-8 h-8 fill-amber-500/15" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white flex items-center justify-center gap-2">
              <Crown className="w-5 h-5 text-amber-500 fill-amber-500/10" />
              <span>Premium Feature</span>
            </h2>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              Voice Notes Whisper Transcription & Analysis is available for Premium members.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-gray-900 rounded-xl p-4 text-left space-y-2.5">
            <div className="text-[10px] uppercase font-bold text-gray-500">Unlock:</div>
            <div className="text-xs flex items-center gap-2 text-gray-300">
              <span className="text-amber-500">👑</span>
              <span>Full Learn Hub Access</span>
            </div>
            <div className="text-xs flex items-center gap-2 text-gray-300">
              <span className="text-amber-500">👑</span>
              <span>Deal Intelligence</span>
            </div>
            <div className="text-xs flex items-center gap-2 text-gray-300">
              <span className="text-amber-500">👑</span>
              <span>Voice Notes</span>
            </div>
            <div className="text-xs flex items-center gap-2 text-gray-300">
              <span className="text-amber-500">👑</span>
              <span>Marketplace Posting</span>
            </div>
            <div className="text-xs flex items-center gap-2 text-gray-300">
              <span className="text-amber-500">👑</span>
              <span>Chat Access</span>
            </div>
            <div className="text-xs flex items-center gap-2 text-gray-300">
              <span className="text-amber-500">👑</span>
              <span>And more...</span>
            </div>
          </div>

          <Link
            href="/pricing"
            className="block w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-white font-extrabold text-center py-2.5 rounded-lg text-xs"
          >
            Upgrade to Premium
          </Link>
        </div>
      </SidebarLayout>
    )
  }

  return (
    <SidebarLayout>

      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Title */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white mb-1 flex items-center gap-2">
              <Mic className="w-6 h-6 text-violet-400" />
              <span>Vanta Voice Notes V1</span>
            </h1>
            <p className="text-xs text-gray-400">
              Upload seller phone calls, voicemail recordings or speech memos. Whisper transcribes and GPT-4o extracts wholesaling summaries.
            </p>
          </div>
          
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold shadow-sm shadow-emerald-950/10 shrink-0">
            <Coins className="w-4 h-4 text-emerald-400 fill-emerald-500/20" />
            <span>Balance: {userCredits} AI Uses</span>
          </div>
        </div>

        {/* Upload Section */}
        <div className="glass-panel border border-gray-900 rounded-xl p-6 bg-slate-900/10 space-y-6 relative overflow-hidden">
          
          {/* Main Drag active Overlay */}
          {dragActive && (
            <div 
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className="absolute inset-0 z-30 bg-violet-650/10 backdrop-blur-xs border-2 border-dashed border-violet-500 rounded-xl flex items-center justify-center"
            >
              <div className="text-center space-y-2">
                <Mic className="w-10 h-10 text-violet-400 mx-auto animate-bounce" />
                <p className="text-sm font-bold text-white uppercase tracking-wider">Drop Audio File to Upload</p>
              </div>
            </div>
          )}

          {/* Loader or Drag drop content */}
          {uploading ? (
            <div className="py-8 text-center space-y-4">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin mx-auto" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-white uppercase tracking-wider">
                  {uploadProgress !== null ? 'Uploading file...' : 'Transcribing and analyzing your conversation...'}
                </p>
                {uploadProgress !== null && (
                  <div className="max-w-xs mx-auto space-y-1.5 mt-2">
                    <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-gray-900">
                      <div className="h-full bg-violet-500" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <div className="text-[9px] text-gray-500 font-bold">{uploadProgress}%</div>
                  </div>
                )}
                {uploadProgress === null && (
                  <p className="text-[10px] text-gray-500 animate-pulse">Whisper & GPT-4o are analyzing the audio. This takes 10-15 seconds.</p>
                )}
              </div>
            </div>
          ) : (
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className="border border-dashed border-gray-850 hover:border-violet-500/40 rounded-xl p-8 text-center space-y-4 bg-slate-950/20 transition-all"
            >
              <Mic className="w-8 h-8 text-violet-400/40 mx-auto" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-white uppercase tracking-wider">Drag & drop seller call audio files here</p>
                <p className="text-[10px] text-gray-500">Supported formats: MP3, WAV, M4A — Max file size 25MB.</p>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp3,.wav,.m4a,.mp4,audio/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-slate-950 border border-gray-800 hover:border-violet-500/40 text-white text-xs font-bold py-2 px-6 rounded-lg transition-colors cursor-pointer"
                >
                  Browse Files
                </button>
              </div>

              {errorMessage && (
                <div className="flex items-center gap-1.5 text-[10px] text-red-400 justify-center font-bold">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* Form settings */}
          <div className="grid sm:grid-cols-2 gap-4 items-end pt-2 border-t border-gray-900/60">
            <div>
              <label className="block text-[9px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">
                Optionally Link to CRM Workspace
              </label>
              <select
                disabled={uploading}
                value={selectedDealId}
                onChange={(e) => setSelectedDealId(e.target.value)}
                className="w-full bg-slate-950 border border-gray-850 rounded-lg py-2 px-3 text-xs text-gray-300 focus:outline-none focus:border-violet-500"
              >
                <option value="">-- Do Not Link Deal --</option>
                {deals.map(deal => (
                  <option key={deal.id} value={deal.id}>{deal.property_name}</option>
                ))}
              </select>
            </div>
            <div className="text-[10px] text-gray-500 leading-normal bg-slate-950/40 p-3 rounded-lg border border-gray-900/40">
              💡 <span className="font-bold text-gray-400">Analysis cost:</span> 2 AI credits per voice note. Completed audits can be easily imported into Deal Intelligence workspaces.
            </div>
          </div>
        </div>

        {/* History Table */}
        <div className="space-y-4">
          <h2 className="text-xs font-black text-white uppercase tracking-wider">Voice Notes History & AI Audits</h2>

          {loading ? (
            <div className="py-12 text-center text-xs text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-violet-500" />
              <span>Retrieving transcription history...</span>
            </div>
          ) : voiceNotes.length === 0 ? (
            <div className="glass-panel border border-gray-900 rounded-xl p-10 text-center text-xs text-gray-600">
              No voice notes recorded. Upload your first seller recording above to start transcription audits.
            </div>
          ) : (
            <div className="glass-panel border border-gray-900 rounded-xl overflow-hidden bg-slate-900/10">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-900 text-gray-500 text-[10px] uppercase font-semibold">
                    <th className="py-2.5 px-3">File name</th>
                    <th className="py-2.5 px-3">Linked Deal</th>
                    <th className="py-2.5 px-3">Upload Date</th>
                    <th className="py-2.5 px-3">AI Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900/60 text-gray-300">
                  {voiceNotes.map((note) => {
                    const isExpanded = !!expandedNotes[note.id]
                    const linkedName = note.deal_intelligence_files?.property_name || 'Not Linked'
                    
                    let badgeColor = 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                    if (note.status === 'processing') badgeColor = 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-pulse'
                    if (note.status === 'completed') badgeColor = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    if (note.status === 'failed') badgeColor = 'bg-red-500/10 text-red-400 border border-red-500/20'

                    return (
                      <React.Fragment key={note.id}>
                        <tr className="hover:bg-slate-900/30">
                          <td className="py-3.5 px-3 font-semibold text-white truncate max-w-[200px]" title={note.file_name}>
                            {note.file_name}
                          </td>
                          <td className="py-3.5 px-3 text-gray-400">{linkedName}</td>
                          <td className="py-3.5 px-3 text-gray-500">
                            {new Date(note.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className={`py-0.5 px-2 rounded-full text-[9px] font-black uppercase tracking-wider ${badgeColor}`}>
                              {note.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right space-x-2 whitespace-nowrap">
                            {note.status === 'completed' && (
                              <button
                                onClick={() => toggleAccordion(note.id)}
                                className="inline-flex items-center gap-1 bg-slate-950 border border-gray-805 hover:border-gray-700 text-gray-400 hover:text-white text-[9px] font-semibold py-1.5 px-2.5 rounded transition-all cursor-pointer"
                              >
                                <span>Results</span>
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            )}
                            
                            {note.status === 'failed' && (
                              <button
                                onClick={() => {
                                  if (userCredits < 2) {
                                    setShowUpgradeModal(true)
                                  } else {
                                    analyzeVoiceNote(note.id)
                                  }
                                }}
                                className="inline-flex items-center gap-1 bg-violet-950/20 hover:bg-violet-950/40 border border-violet-900/30 hover:border-violet-900/50 text-violet-400 text-[9px] font-semibold py-1.5 px-2.5 rounded transition-all cursor-pointer animate-pulse"
                              >
                                <span>Retry</span>
                              </button>
                            )}

                            <button
                              onClick={() => setDeletingNote(note)}
                              className="inline-flex items-center gap-1 bg-red-950/10 hover:bg-red-950/30 border border-red-900/20 hover:border-red-900/40 text-red-400 text-[9px] font-semibold py-1.5 px-2.5 rounded transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>

                        {/* Accordion Expand Panel */}
                        {isExpanded && note.status === 'completed' && (
                          <tr>
                            <td colSpan={5} className="bg-slate-950/40 p-5 border-t border-gray-900/45">
                              <div className="grid md:grid-cols-3 gap-5 text-xs animate-fade-in">
                                
                                {/* Transcript Box */}
                                <div className="md:col-span-2 space-y-2">
                                  <span className="text-[9px] font-bold uppercase text-gray-500 tracking-wider flex items-center gap-1">
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>Whisper Voice Transcript</span>
                                  </span>
                                  <div className="bg-slate-950 border border-gray-900 p-3.5 rounded-lg h-56 overflow-y-auto leading-relaxed text-gray-300 whitespace-pre-line text-[11px]">
                                    {note.transcript}
                                  </div>
                                </div>

                                {/* GPT-4o Insights Dashboard */}
                                <div className="space-y-4">
                                  <div className="flex justify-between items-start">
                                    <span className="text-[9px] font-bold uppercase text-gray-500 tracking-wider flex items-center gap-1">
                                      <Sparkles className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
                                      <span>AI Wholesaling Extraction</span>
                                    </span>
                                    {note.deal_id && (
                                      <button
                                        onClick={() => handleSaveToDealIntelligence(note)}
                                        className="text-[9px] font-bold text-violet-400 hover:text-violet-300 border border-violet-850/50 hover:border-violet-700 px-2 py-1 rounded bg-violet-950/10 transition-colors flex items-center gap-1 cursor-pointer"
                                      >
                                        <Database className="w-3 h-3" />
                                        <span>Save to CRM</span>
                                      </button>
                                    )}
                                  </div>

                                  <div className="bg-slate-950 border border-gray-900 rounded-lg p-4 space-y-3.5">
                                    <div>
                                      <span className="text-[8px] font-bold uppercase text-gray-500 block mb-0.5">Asking Price</span>
                                      <div className="text-sm font-black text-emerald-400">{note.asking_price || 'Not mentioned'}</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <span className="text-[8px] font-bold uppercase text-gray-500 block mb-0.5">Seller Motivation</span>
                                        <div className="text-[10px] font-bold text-amber-500">{note.seller_motivation}</div>
                                      </div>
                                      <div>
                                        <span className="text-[8px] font-bold uppercase text-gray-500 block mb-0.5">Condition</span>
                                        <div className="text-[10px] font-bold text-white">{note.property_condition}</div>
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-[8px] font-bold uppercase text-gray-500 block mb-0.5">Urgency / Timeline</span>
                                      <p className="text-[10px] text-gray-300 leading-normal">{note.timeline}</p>
                                    </div>
                                    <div>
                                      <span className="text-[8px] font-bold uppercase text-gray-500 block mb-0.5">Recommended Next Action</span>
                                      <p className="text-[10px] text-violet-350 italic font-semibold leading-normal">{note.recommended_next_action}</p>
                                    </div>
                                    <div className="border-t border-gray-900/60 pt-3">
                                      <span className="text-[8px] font-bold uppercase text-gray-500 block mb-1">Deal Summary Summary</span>
                                      <p className="text-[10px] text-gray-400 leading-relaxed italic">{note.summary}</p>
                                    </div>
                                  </div>
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MODAL: DELETE CONFIRMATION */}
        {deletingNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="glass-panel border border-gray-900 rounded-xl max-w-sm w-full bg-slate-950 p-6 space-y-4 shadow-2xl">
              <div>
                <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider">Delete Voice Note</h3>
                <p className="text-xs text-gray-300 mt-2 leading-relaxed">
                  Are you sure you want to delete this voice note audit? This will permanently delete the audio file from storage and remove it from history.
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setDeletingNote(null)}
                  className="bg-slate-900 hover:bg-slate-850 border border-gray-800 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteVoiceNote}
                  className="bg-red-650 hover:bg-red-550 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: INSUFFICIENT CREDITS */}
        {showUpgradeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="glass-panel border border-gray-900 rounded-xl max-w-sm w-full bg-slate-950 p-6 text-center space-y-4 shadow-2xl">
              <div className="inline-flex p-3 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Coins className="w-8 h-8 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Insufficient Credits</h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  You need at least 2 AI uses to transcribe and audit a seller conversation voice recording. Your balance is {userCredits} 🪙.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="bg-slate-900 hover:bg-slate-850 border border-gray-800 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer"
                >
                  Dismiss
                </button>
                <Link
                  href="/credits"
                  className="bg-violet-650 hover:bg-violet-550 text-white text-xs font-bold py-2 px-5 rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-violet-950/10"
                >
                  <span>Top Up Credits</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

      </div>
    </SidebarLayout>
  )
}
