'use client'

import React, { useState, useEffect } from 'react'
import SidebarLayout from '@/components/dashboard/SidebarLayout'
import { createClient } from '@/lib/supabase/client'
import { 
  ShieldCheck, 
  Trash2, 
  BookOpen, 
  Activity
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { type Deal } from '@/types/database'

export default function AdminDashboardPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'deals' | 'lessons' | 'ledger' | 'reviews'>('deals')
  const [deals, setDeals] = useState<Deal[]>([])
  const [ledger, setLedger] = useState<any[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Lesson Creator State
  const [lessonId, setLessonId] = useState('')
  const [lessonTitle, setLessonTitle] = useState('')
  const [lessonCategory, setLessonCategory] = useState('basics')
  const [lessonXp, setLessonXp] = useState('100')
  const [slide1Title, setSlide1Title] = useState('')
  const [slide1Text, setSlide1Text] = useState('')
  const [slide2Title, setSlide2Title] = useState('')
  const [slide2Text, setSlide2Text] = useState('')
  const [quizQuestion, setQuizQuestion] = useState('')
  const [quizOpt1, setQuizOpt1] = useState('')
  const [quizOpt2, setQuizOpt2] = useState('')
  const [quizOpt3, setQuizOpt3] = useState('')
  const [quizAnswerIdx, setQuizAnswerIdx] = useState('0')

  useEffect(() => {
    let active = true
    const init = async () => {
      // 1. Fetch all deals (including inactive or closed ones for review)
      const { data: d } = await supabase
        .from('deals')
        .select('*, profiles(username, full_name)')
        .order('created_at', { ascending: false })
      if (!active) return
      setDeals(d || [])
 
      // 2. Fetch all credit transactions in ledger
      const { data: ledg } = await supabase
        .from('credit_transactions')
        .select('*, profiles(username, full_name)')
        .order('date', { ascending: false })
        .limit(30)
      if (!active) return
      setLedger(ledg || [])
 
      // 3. Fetch all reviews
      const { data: revs } = await supabase
        .from('reviews')
        .select('*, profiles(username, full_name)')
        .order('created_at', { ascending: false })
      if (!active) return
      setReviews(revs || [])
 
      setLoading(false)
    }
    init()
    return () => {
      active = false
    }
  }, [supabase])

  const handleApproveReview = async (reviewId: string) => {
    const { error } = await supabase
      .from('reviews')
      .update({ is_approved: true })
      .eq('id', reviewId)
    if (!error) {
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, is_approved: true } : r))
    } else {
      console.error(error)
      alert('Approve failed')
    }
  }

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)
    if (!error) {
      setReviews(prev => prev.filter(r => r.id !== reviewId))
    } else {
      console.error(error)
      alert('Delete failed')
    }
  }

  const handleDeleteDeal = async (dealId: string) => {
    if (!confirm('Are you sure you want to moderate (delete) this listing?')) return
    
    const { error } = await supabase.from('deals').delete().eq('id', dealId)
    if (!error) {
      setDeals(prev => prev.filter(d => d.id !== dealId))
    } else {
      console.error(error)
      alert('Delete failed. Check database foreign key constraint triggers.')
    }
  }

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const newLesson = {
        id: lessonId.trim().toLowerCase(),
        title: lessonTitle.trim(),
        category: lessonCategory,
        xp_reward: Number(lessonXp),
        content: {
          slides: [
            { title: slide1Title.trim(), text: slide1Text.trim() },
            { title: slide2Title.trim(), text: slide2Text.trim() }
          ],
          quiz: {
            question: quizQuestion.trim(),
            options: [quizOpt1.trim(), quizOpt2.trim(), quizOpt3.trim()].filter(Boolean),
            answer: Number(quizAnswerIdx)
          }
        },
        order_index: 9 // add to end of list
      }

      const { error } = await supabase.from('lessons').insert(newLesson)
      if (error) throw error

      confetti({ particleCount: 150, spread: 80 })
      alert('New wholesaling lesson successfully published to Learn Hub path!')
      
      // Reset form
      setLessonId('')
      setLessonTitle('')
      setSlide1Title('')
      setSlide1Text('')
      setSlide2Title('')
      setSlide2Text('')
      setQuizQuestion('')
      setQuizOpt1('')
      setQuizOpt2('')
      setQuizOpt3('')
    } catch (err) {
      console.error(err)
      const errMsg = err instanceof Error ? err.message : 'Error inserting lesson'
      alert(errMsg || 'Error inserting lesson. Check unique identifier constraints.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex flex-col items-center justify-center p-12">
          <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-4" />
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Syncing Admin tables...</p>
        </div>
      </SidebarLayout>
    )
  }

  return (
    <SidebarLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Banner Header */}
        <div className="flex justify-between items-center border-b border-gray-900 pb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white mb-1 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-violet-400" />
              <span>Admin Console</span>
            </h1>
            <p className="text-xs text-gray-400">
              System monitoring, deal moderation queue, and dynamic lesson content publisher.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-violet-400 bg-violet-500/5 px-3 py-1.5 rounded-lg border border-violet-500/10">
            <span>Access: System Administrator</span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-gray-900">
          <button
            onClick={() => setActiveTab('deals')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'deals'
                ? 'border-violet-500 text-violet-400'
                : 'border-transparent text-gray-500 hover:text-white'
            }`}
          >
            Moderate Deals ({deals.length})
          </button>
          <button
            onClick={() => setActiveTab('lessons')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'lessons'
                ? 'border-violet-500 text-violet-400'
                : 'border-transparent text-gray-500 hover:text-white'
            }`}
          >
            Publish Wholesaling Lesson
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'ledger'
                ? 'border-violet-500 text-violet-400'
                : 'border-transparent text-gray-500 hover:text-white'
            }`}
          >
            Ledger Audit Log
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'reviews'
                ? 'border-violet-500 text-violet-400'
                : 'border-transparent text-gray-500 hover:text-white'
            }`}
          >
            Moderate Reviews ({reviews.length})
          </button>
        </div>

        {/* Dynamic Panels */}
        {activeTab === 'deals' && (
          <div className="glass-panel border border-gray-900 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-900/60 bg-slate-950/40">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Reported & Active Listing Queue</h3>
            </div>
            
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-xs text-left text-gray-400">
                <thead className="bg-slate-950/60 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-900">
                  <tr>
                    <th className="p-4">Owner</th>
                    <th className="p-4">Address</th>
                    <th className="p-4">Asking Price</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900/60">
                  {deals.map(deal => (
                    <tr key={deal.id} className="hover:bg-slate-900/30">
                      <td className="p-4 font-semibold text-white">
                        {deal.profiles?.full_name} <span className="text-[10px] text-gray-500 font-medium">(@{deal.profiles?.username})</span>
                      </td>
                      <td className="p-4">{deal.address}, {deal.city}</td>
                      <td className="p-4 text-emerald-400 font-bold">${Number(deal.asking_price).toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                          deal.status === 'active' 
                            ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' 
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {deal.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleDeleteDeal(deal.id)}
                          className="p-1 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded cursor-pointer transition-colors"
                          title="Delete / Moderate Deal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {deals.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-600 font-medium">No wholesale deals in database queue.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'lessons' && (
          <form onSubmit={handleCreateLesson} className="glass-panel border border-gray-900 rounded-xl p-6 space-y-6">
            <div className="flex gap-2 items-center text-xs text-violet-400 font-bold">
              <BookOpen className="w-4 h-4" />
              <span>Milestone Lesson Builder</span>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Unique Identifier / slug
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. contracts-2"
                  value={lessonId}
                  onChange={(e) => setLessonId(e.target.value)}
                  className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Lesson Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Navigating Assignment Splits"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                  className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  Category
                </label>
                <select
                  value={lessonCategory}
                  onChange={(e) => setLessonCategory(e.target.value)}
                  className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-300 focus:outline-none focus:border-violet-500"
                >
                  <option value="basics">Wholesaling Basics</option>
                  <option value="arv">ARV Estimation</option>
                  <option value="mao">MAO Calculation</option>
                  <option value="contracts">Wholesale Contracts</option>
                  <option value="jv">JV matchmaking</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                  XP Rewards Grant
                </label>
                <input
                  type="number"
                  required
                  value={lessonXp}
                  onChange={(e) => setLessonXp(e.target.value)}
                  className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            {/* Slide 1 */}
            <div className="p-4 bg-slate-950/60 rounded-lg border border-gray-900 space-y-3">
              <h4 className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">Slide #1: Concept Explanation</h4>
              <input
                type="text"
                required
                placeholder="Slide Title (e.g. Assignment Agreements)"
                value={slide1Title}
                onChange={(e) => setSlide1Title(e.target.value)}
                className="w-full bg-slate-900 border border-gray-800 rounded py-1.5 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500"
              />
              <textarea
                rows={2}
                required
                placeholder="Slide description text content..."
                value={slide1Text}
                onChange={(e) => setSlide1Text(e.target.value)}
                className="w-full bg-slate-900 border border-gray-800 rounded py-1.5 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500 resize-none"
              />
            </div>

            {/* Slide 2 */}
            <div className="p-4 bg-slate-950/60 rounded-lg border border-gray-900 space-y-3">
              <h4 className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">Slide #2: Practical Checklist</h4>
              <input
                type="text"
                required
                placeholder="Slide Title (e.g. Finding buyers)"
                value={slide2Title}
                onChange={(e) => setSlide2Title(e.target.value)}
                className="w-full bg-slate-900 border border-gray-800 rounded py-1.5 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500"
              />
              <textarea
                rows={2}
                required
                placeholder="Slide description text content..."
                value={slide2Text}
                onChange={(e) => setSlide2Text(e.target.value)}
                className="w-full bg-slate-900 border border-gray-800 rounded py-1.5 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500 resize-none"
              />
            </div>

            {/* Quiz Section */}
            <div className="p-4 bg-slate-950/60 rounded-lg border border-gray-900 space-y-3">
              <h4 className="text-[10px] font-bold text-gray-300 uppercase tracking-wider">Slide #3: Quiz Validator</h4>
              <input
                type="text"
                required
                placeholder="Quiz Question (e.g. Which contract locks in assignment rights?)"
                value={quizQuestion}
                onChange={(e) => setQuizQuestion(e.target.value)}
                className="w-full bg-slate-900 border border-gray-800 rounded py-1.5 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500"
              />
              
              <div className="grid md:grid-cols-3 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Option A (Index 0)"
                  value={quizOpt1}
                  onChange={(e) => setQuizOpt1(e.target.value)}
                  className="bg-slate-900 border border-gray-800 rounded py-1.5 px-3 text-xs text-gray-100 focus:outline-none"
                />
                <input
                  type="text"
                  required
                  placeholder="Option B (Index 1)"
                  value={quizOpt2}
                  onChange={(e) => setQuizOpt2(e.target.value)}
                  className="bg-slate-900 border border-gray-800 rounded py-1.5 px-3 text-xs text-gray-100 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Option C (Index 2 - Optional)"
                  value={quizOpt3}
                  onChange={(e) => setQuizOpt3(e.target.value)}
                  className="bg-slate-900 border border-gray-800 rounded py-1.5 px-3 text-xs text-gray-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-semibold text-gray-500 mb-1 uppercase">
                  Correct Answer Choice
                </label>
                <select
                  value={quizAnswerIdx}
                  onChange={(e) => setQuizAnswerIdx(e.target.value)}
                  className="bg-slate-900 border border-gray-800 rounded py-1 px-3 text-xs text-gray-400 focus:outline-none"
                >
                  <option value="0">Option A (Index 0) is Correct</option>
                  <option value="1">Option B (Index 1) is Correct</option>
                  <option value="2">Option C (Index 2) is Correct</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow disabled:opacity-40 cursor-pointer"
            >
              {submitting ? 'Publishing...' : 'Publish Lesson to Hub'}
            </button>
          </form>
        )}

        {activeTab === 'ledger' && (
          <div className="glass-panel border border-gray-900 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-900/60 bg-slate-950/40 flex justify-between items-center">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">System-Wide Ledger Monitor</h3>
              <div className="text-[10px] text-gray-500 font-bold flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                <span>Live Transaction Feed</span>
              </div>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-xs text-left text-gray-400">
                <thead className="bg-slate-950/60 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-900">
                  <tr>
                    <th className="p-4">User</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Credits delta</th>
                    <th className="p-4">Description</th>
                    <th className="p-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900/60">
                  {ledger.map(tx => {
                    const isAllotment = tx.credits_added > 0
                    const delta = isAllotment ? tx.credits_added : -tx.credits_used
                    return (
                      <tr key={tx.id} className="hover:bg-slate-900/30">
                        <td className="p-4 font-semibold text-white">
                          {tx.profiles?.full_name} <span className="text-[10px] text-gray-500 font-medium">(@{tx.profiles?.username})</span>
                        </td>
                        <td className="p-4">
                          <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                            isAllotment 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {isAllotment ? 'allotment' : 'deduction'}
                          </span>
                        </td>
                        <td className={`p-4 font-black ${isAllotment ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isAllotment ? `+${delta}` : delta} 🪙
                        </td>
                        <td className="p-4 font-medium text-gray-300">{tx.feature}</td>
                        <td className="p-4 text-gray-500">
                          {new Date(tx.date).toLocaleDateString()} {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    )
                  })}
                  {ledger.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-600 font-medium">No transaction ledgers generated in database.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab === 'reviews' && (
          <div className="glass-panel border border-gray-900 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-900/60 bg-slate-950/40">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Submitted Testimonials & Reviews</h3>
            </div>
            
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-xs text-left text-gray-400">
                <thead className="bg-slate-950/60 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-900">
                  <tr>
                    <th className="p-4">User</th>
                    <th className="p-4">Rating</th>
                    <th className="p-4">Testimonial</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900/60">
                  {reviews.map(rev => (
                    <tr key={rev.id} className="hover:bg-slate-900/30">
                      <td className="p-4 font-semibold text-white">
                        {rev.profiles?.full_name} <span className="text-[10px] text-gray-500 font-medium">(@{rev.profiles?.username})</span>
                      </td>
                      <td className="p-4 text-amber-400 font-bold">
                        {"★".repeat(rev.rating)}{"☆".repeat(5 - rev.rating)}
                      </td>
                      <td className="p-4 max-w-xs truncate" title={rev.testimonial}>
                        {rev.testimonial}
                      </td>
                      <td className="p-4">
                        <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                          rev.is_approved 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {rev.is_approved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {!rev.is_approved && (
                            <button
                              onClick={() => handleApproveReview(rev.id)}
                              className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded font-bold text-[10px] transition-colors"
                            >
                              Approve
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteReview(rev.id)}
                            className="p-1 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded cursor-pointer transition-colors"
                            title="Delete Review"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {reviews.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-650 font-medium">
                        No reviews submitted in database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  )
}
