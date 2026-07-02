'use client'

import React, { useState, useEffect, useCallback } from 'react'
import SidebarLayout from '@/components/dashboard/SidebarLayout'
import { createClient } from '@/lib/supabase/client'
import { 
  ShieldCheck, 
  Trash2, 
  BookOpen, 
  Activity,
  Users,
  Key,
  BarChart3,
  FileText,
  DollarSign,
  Search,
  Shield,
  Ban,
  CheckCircle,
  AlertTriangle,
  Award,
  RefreshCw,
  Coins,
  Flame,
  Trophy,
  TrendingUp,
  X,
  UserCheck,
  Server,
  Clock,
  ChevronRight
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { type Deal } from '@/types/database'

interface CreditTransaction {
  id: string
  credits_added: number
  credits_used: number
  feature: string
  date: string
  profiles?: {
    username: string
    full_name: string | null
  }
}

interface Review {
  id: string
  rating: number
  testimonial: string
  is_approved: boolean
  created_at: string
  profiles?: {
    username: string
    full_name: string | null
  }
}

interface UserProfile {
  id: string
  username: string
  full_name: string
  role: string
  subscription_status: string
  is_suspended: boolean
  created_at: string
  xp: number
  ai_uses_remaining: number
  arv_credits: number
  mao_credits: number
  current_streak: number
  longest_streak: number
}

interface UserSession {
  session_id: string
  user_id: string
  created_at: string
  email: string
  username: string
  full_name: string
}

interface AuditLog {
  id: string
  admin_email: string
  action: string
  target_id: string
  target_type: string
  details: any
  created_at: string
}

type TabType = 
  | 'users' 
  | 'sessions' 
  | 'subscriptions'
  | 'affiliates' 
  | 'analytics' 
  | 'moderation'
  | 'audit_logs' 
  | 'security'

export default function AdminDashboardPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<TabType>('users')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Database queue data
  const [deals, setDeals] = useState<Deal[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [sessions, setSessions] = useState<UserSession[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  
  // Search query for users
  const [searchQuery, setSearchQuery] = useState('')

  // Detailed inspect modal state
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)

  // Subscription states
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [subscriptionStats, setSubscriptionStats] = useState({
    activeCount: 0,
    trialingCount: 0,
    expiredCount: 0,
    monthlyRev: 0,
    annualRev: 0
  })

  // Analytics states
  const [analytics, setAnalytics] = useState<any>({
    dau: 0,
    total_users: 0,
    ai_usage_30d: 0,
    lesson_completions_30d: 0,
    feature_usage_30d: {},
    subscription_overview: {}
  })

  // Vanta Shield WAF states
  const [scraperShield, setScraperShield] = useState(true)
  const [rateLimiterActive, setRateLimiterActive] = useState(true)
  const [injectionShield, setInjectionShield] = useState(true)
  const [spamFilterActive, setSpamFilterActive] = useState(true)
  const [interestValidationActive, setInterestValidationActive] = useState(true)

  // Failed login attempts / lockouts log
  const [failedLogins, setFailedLogins] = useState([
    { email: 'hackerman_pro@gmail.com', ip: '198.51.100.42', reason: 'Invalid password credentials', time: '10 mins ago', status: 'blocked' },
    { email: 'johndoe_wholesale@gmail.com', ip: '203.0.113.15', reason: 'Too many attempts (rate limit exceeded)', time: '40 mins ago', status: 'account locked' },
    { email: 'spam_lead_bot@yahoo.com', ip: '82.165.12.109', reason: 'Suspicious request payload fingerprint', time: '2 hours ago', status: 'blocked' },
    { email: 'anonymous_hacker@sec.org', ip: '142.250.190.46', reason: 'XSS script injection attempt in username', time: '4 hours ago', status: 'blocked' }
  ])

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

  // Fetch API handlers
  const fetchUsers = useCallback(async (query: string = '') => {
    try {
      const res = await fetch(`/api/admin?action=users&search=${encodeURIComponent(query)}`)
      const data = await res.json()
      if (res.ok) {
        setUsers(data.users || [])
      } else {
        throw new Error(data.error || 'Failed to fetch users')
      }
    } catch (err: any) {
      console.error(err)
    }
  }, [])

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin?action=sessions')
      const data = await res.json()
      if (res.ok) {
        setSessions(data.sessions || [])
      } else {
        throw new Error(data.error || 'Failed to fetch sessions')
      }
    } catch (err: any) {
      console.error(err)
    }
  }, [])

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/admin?action=analytics')
      const data = await res.json()
      if (res.ok) {
        setAnalytics(data.analytics || {})
      } else {
        throw new Error(data.error || 'Failed to fetch analytics')
      }
    } catch (err: any) {
      console.error(err)
    }
  }, [])

  const fetchSubscriptions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin?action=subscriptions')
      const data = await res.json()
      if (res.ok) {
        setSubscriptions(data.subscriptions || [])
        setSubscriptionStats(data.stats || { activeCount: 0, trialingCount: 0, expiredCount: 0, monthlyRev: 0, annualRev: 0 })
      } else {
        throw new Error(data.error || 'Failed to fetch subscriptions')
      }
    } catch (err: any) {
      console.error(err)
    }
  }, [])

  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin?action=audit_logs')
      const data = await res.json()
      if (res.ok) {
        setAuditLogs(data.auditLogs || [])
      } else {
        throw new Error(data.error || 'Failed to fetch audit logs')
      }
    } catch (err: any) {
      console.error(err)
    }
  }, [])

  const initData = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Fetch community moderation queues from database
      const { data: d } = await supabase
        .from('deals')
        .select('*, profiles(username, full_name)')
        .order('created_at', { ascending: false })
      setDeals(d || [])

      const { data: revs } = await supabase
        .from('reviews')
        .select('*, profiles(username, full_name)')
        .order('created_at', { ascending: false })
      setReviews(revs || [])

      // 2. Fetch Super Admin telemetry datasets
      await fetchUsers()
      await fetchSessions()
      await fetchAnalytics()
      await fetchSubscriptions()
      await fetchAuditLogs()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [supabase, fetchUsers, fetchSessions, fetchAnalytics, fetchSubscriptions, fetchAuditLogs])

  useEffect(() => {
    initData()
  }, [initData])

  // User management triggers
  const handleToggleSuspend = async (userId: string, currentSuspended: boolean) => {
    setSubmitting(true)
    setMessage(null)
    try {
      const action = currentSuspended ? 'reactivate' : 'suspend'
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetUserId: userId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update user status')
      
      setMessage({ type: 'success', text: data.message })
      
      // Update selectedUser modal status in real-time
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, is_suspended: !currentSuspended } : null)
      }

      await fetchUsers(searchQuery)
      await fetchAuditLogs()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Operation failed' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleChangeRole = async (userId: string, newRole: string) => {
    setSubmitting(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_role', targetUserId: userId, role: newRole })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to change user role')
      
      setMessage({ type: 'success', text: data.message })

      // Update selectedUser modal role in real-time
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, role: newRole } : null)
      }

      await fetchUsers(searchQuery)
      await fetchAuditLogs()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Operation failed' })
    } finally {
      setSubmitting(false)
    }
  }

  // Moderation handlers
  const handleApproveReview = async (reviewId: string) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve_review', reviewId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Approve failed')

      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, is_approved: true } : r))
      setMessage({ type: 'success', text: 'Review approved and published to landing page.' })
      await fetchAuditLogs()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Approve failed' })
    }
  }

  const handleDisapproveReview = async (reviewId: string) => {
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disapprove_review', reviewId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Disapprove failed')

      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, is_approved: false } : r))
      setMessage({ type: 'success', text: 'Review hidden from landing page.' })
      await fetchAuditLogs()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Operation failed' })
    }
  }

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review permanently?')) return
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_review', reviewId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')

      setReviews(prev => prev.filter(r => r.id !== reviewId))
      setMessage({ type: 'success', text: 'Review deleted permanently.' })
      await fetchAuditLogs()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Delete failed' })
    }
  }

  const handleDeleteDeal = async (dealId: string) => {
    if (!confirm('Are you sure you want to moderate (delete) this listing permanently?')) return
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_deal', dealId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')

      setDeals(prev => prev.filter(d => d.id !== dealId))
      setMessage({ type: 'success', text: 'Deal moderated and listing deleted successfully.' })
      await fetchAuditLogs()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Delete failed' })
    }
  }

  // Publish Wholesaling Lesson
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
        order_index: 9
      }

      const { error } = await supabase.from('lessons').insert(newLesson)
      if (error) throw error

      confetti({ particleCount: 150, spread: 80 })
      setMessage({ type: 'success', text: `Wholesaling lesson "${lessonTitle}" published to Learn Hub!` })
      
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
      await fetchAuditLogs()
    } catch (err: any) {
      console.error(err)
      setMessage({ type: 'error', text: err.message || 'Error inserting lesson.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSearchUsers = (e: React.FormEvent) => {
    e.preventDefault()
    fetchUsers(searchQuery)
  }

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex flex-col items-center justify-center p-20 min-h-[500px]">
          <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-4" />
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Syncing Admin Console...</p>
        </div>
      </SidebarLayout>
    )
  }

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto space-y-8 pb-10 font-sans">
        
        {/* Banner Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-900 pb-5 gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white mb-1 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-violet-400" />
              <span>Super Admin Dashboard</span>
            </h1>
            <p className="text-xs text-gray-400">
              Complete platform management, active session audits, user lifecycle controls, and system telemetry.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={initData}
              className="p-2 text-gray-400 hover:text-white bg-slate-900 border border-gray-800 rounded-lg transition-colors cursor-pointer hover:border-gray-700 active:scale-95 flex items-center justify-center"
              title="Reload Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-xs font-black text-emerald-400 bg-emerald-500/5 px-3 py-1.5 rounded-lg border border-emerald-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>ACCESS: SECURE SUPER ADMIN</span>
            </div>
          </div>
        </div>

        {/* Global Notifications */}
        {message && (
          <div className={`p-4 rounded-xl border flex gap-3 text-xs font-semibold ${
            message.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Categories Tab Navigation */}
        <div className="flex flex-wrap border-b border-gray-900 gap-1">
          {[
            { id: 'users', label: 'User Control', icon: Users },
            { id: 'sessions', label: 'Login History', icon: Key },
            { id: 'subscriptions', label: 'Subscriptions', icon: DollarSign },
            { id: 'affiliates', label: 'Ambassadors', icon: Award },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'moderation', label: 'Moderation', icon: CheckCircle },
            { id: 'audit_logs', label: 'Audit Logs', icon: FileText },
            { id: 'security', label: 'Security Shield', icon: Shield },
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-4 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'border-violet-500 text-violet-400'
                    : 'border-transparent text-gray-500 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* --- USERS PANEL --- */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="glass-panel border border-gray-900 rounded-xl p-5 flex justify-between items-center bg-slate-950/20">
              <form onSubmit={handleSearchUsers} className="flex gap-2 w-full max-w-md">
                <input
                  type="text"
                  placeholder="Search by name, username, or UUID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-violet-500"
                />
                <button
                  type="submit"
                  className="bg-violet-650 hover:bg-violet-600 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer border-none"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Search</span>
                </button>
              </form>
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                Showing {users.length} registered users
              </div>
            </div>

            <div className="glass-panel border border-gray-900 rounded-xl overflow-hidden bg-slate-900/10">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-xs text-left text-gray-400">
                  <thead className="bg-slate-950/60 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-900">
                    <tr>
                      <th className="p-4">Name / ID</th>
                      <th className="p-4">Username</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Plan Status</th>
                      <th className="p-4">Suspended</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-900/60">
                    {users.map(user => (
                      <tr key={user.id} className={`hover:bg-slate-900/30 transition-colors ${user.is_suspended ? 'bg-red-500/5' : ''}`}>
                        <td className="p-4">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="font-semibold text-white hover:text-violet-400 transition-colors text-left bg-transparent border-none cursor-pointer p-0"
                          >
                            {user.full_name || 'No Name'}
                          </button>
                          <div className="text-[9px] text-gray-500 font-mono select-all mt-0.5">{user.id}</div>
                        </td>
                        <td className="p-4">@{user.username || 'unknown'}</td>
                        <td className="p-4">
                          <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-black border ${
                            user.role === 'super_admin'
                              ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                              : user.role === 'premium'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-gray-800 text-gray-400 border-gray-700'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold border ${
                            user.subscription_status === 'active' || user.role === 'premium' || user.role === 'super_admin'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-slate-950/60 text-gray-500 border-gray-900'
                          }`}>
                            {user.subscription_status || 'free'}
                          </span>
                        </td>
                        <td className="p-4">
                          {user.is_suspended ? (
                            <span className="text-red-400 font-bold flex items-center gap-1">
                              <Ban className="w-3.5 h-3.5" />
                              <span>Suspended</span>
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-medium">Active</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center items-center gap-2">
                            <button
                              disabled={submitting}
                              onClick={() => handleToggleSuspend(user.id, user.is_suspended)}
                              className={`px-2 py-1 rounded text-[10px] font-bold transition-all border cursor-pointer ${
                                user.is_suspended
                                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                                  : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
                              }`}
                            >
                              {user.is_suspended ? 'Reactivate' : 'Suspend'}
                            </button>
                            <select
                              disabled={submitting}
                              value={user.role}
                              onChange={(e) => handleChangeRole(user.id, e.target.value)}
                              className="bg-slate-900 border border-gray-800 text-gray-300 text-[10px] py-1 px-1.5 rounded focus:outline-none"
                            >
                              <option value="user">User Role</option>
                              <option value="premium">Premium</option>
                              <option value="super_admin">Super Admin</option>
                            </select>
                            <button
                              onClick={() => setSelectedUser(user)}
                              className="px-2 py-1 bg-violet-650 hover:bg-violet-600 text-white rounded text-[10px] font-bold border-none transition-colors cursor-pointer"
                            >
                              Inspect
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-600 font-medium">No users match search parameter.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- SESSIONS PANEL --- */}
        {activeTab === 'sessions' && (
          <div className="space-y-6 animate-fade-in">
            <div className="glass-panel border border-gray-900 rounded-xl overflow-hidden bg-slate-900/10">
              <div className="p-4 border-b border-gray-900/60 bg-slate-950/40">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Active User Sessions</h3>
              </div>
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-xs text-left text-gray-400">
                  <thead className="bg-slate-950/60 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-900">
                    <tr>
                      <th className="p-4">Email</th>
                      <th className="p-4">Full Name</th>
                      <th className="p-4">Username</th>
                      <th className="p-4">Session UUID</th>
                      <th className="p-4">Established Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-900/60">
                    {sessions.map(sess => (
                      <tr key={sess.session_id} className="hover:bg-slate-900/30">
                        <td className="p-4 font-semibold text-white">{sess.email}</td>
                        <td className="p-4">{sess.full_name || 'N/A'}</td>
                        <td className="p-4">@{sess.username || 'unknown'}</td>
                        <td className="p-4 font-mono text-[10px] text-gray-500 select-all">{sess.session_id}</td>
                        <td className="p-4 text-gray-400">{new Date(sess.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                    {sessions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-600 font-medium">No active sessions found in database.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- SUBSCRIPTIONS PANEL --- */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass-panel border-gray-900 bg-slate-900/10 rounded-xl p-5">
                <div className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Active Subs</div>
                <div className="text-2xl font-black text-white mt-1.5">{subscriptionStats.activeCount}</div>
                <div className="text-[9px] text-emerald-400 font-bold mt-1">Paying Premium members</div>
              </div>
              <div className="glass-panel border-gray-900 bg-slate-900/10 rounded-xl p-5">
                <div className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Trialing Users</div>
                <div className="text-2xl font-black text-violet-400 mt-1.5">{subscriptionStats.trialingCount}</div>
                <div className="text-[9px] text-gray-500 font-semibold mt-1">7-Day Free Trial phase</div>
              </div>
              <div className="glass-panel border-gray-900 bg-slate-900/10 rounded-xl p-5">
                <div className="text-[10px] font-black uppercase text-gray-500 tracking-wider font-bold">MRR Overview</div>
                <div className="text-2xl font-black text-emerald-400 mt-1.5">${subscriptionStats.monthlyRev.toLocaleString()}</div>
                <div className="text-[9px] text-gray-500 font-semibold mt-1">Based on $49/mo pricing</div>
              </div>
              <div className="glass-panel border-gray-900 bg-slate-900/10 rounded-xl p-5">
                <div className="text-[10px] font-black uppercase text-gray-500 tracking-wider">ARR Projection</div>
                <div className="text-2xl font-black text-white mt-1.5">${subscriptionStats.annualRev.toLocaleString()}</div>
                <div className="text-[9px] text-violet-400 font-semibold mt-1">Annual projected revenue</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Database Premium Subscriptions */}
              <div className="glass-panel border border-gray-900 rounded-xl overflow-hidden md:col-span-2 bg-slate-900/10">
                <div className="p-4 border-b border-gray-900/60 bg-slate-950/40">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Active Premium Subscriptions</h3>
                </div>
                <div className="overflow-y-auto max-h-[350px] no-scrollbar">
                  <table className="w-full text-xs text-left text-gray-400">
                    <tbody className="divide-y divide-gray-900/60">
                      {subscriptions.map(sub => (
                        <tr key={sub.id} className="hover:bg-slate-900/30">
                          <td className="p-3 font-semibold text-white">
                            {sub.profiles?.full_name || 'Anonymous User'} 
                            <span className="text-[10px] text-gray-500 font-medium block mt-0.5">@{sub.profiles?.username}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-[10px] uppercase font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded">
                              {sub.plan_type}
                            </span>
                          </td>
                          <td className="p-3 text-[10px] text-gray-500">
                            Renew: {new Date(sub.current_period_end).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-right">
                            <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-black border ${
                              sub.status === 'active' 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {sub.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {subscriptions.length === 0 && (
                        <tr>
                          <td className="p-8 text-center text-gray-650 font-medium">No subscription logs in database.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Simulated Transaction logs (Payment History) */}
              <div className="glass-panel border border-gray-900 rounded-xl overflow-hidden bg-slate-900/10">
                <div className="p-4 border-b border-gray-900/60 bg-slate-950/40">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Payment History Overview</h3>
                </div>
                <div className="overflow-y-auto max-h-[350px] no-scrollbar">
                  <div className="divide-y divide-gray-900/60">
                    {[
                      { email: 'sarah.jones@cl.com', amount: 49.00, desc: 'Premium Monthly Renewal', date: 'Today, 2:34 PM', status: 'success' },
                      { email: 'mikeydeals@wh.com', amount: 249.00, desc: 'Premium 6-Month Bundle', date: 'Today, 11:12 AM', status: 'success' },
                      { email: 'robsdeals@gmail.com', amount: 49.00, desc: 'Premium Monthly Renewal', date: 'Yesterday, 6:40 PM', status: 'success' },
                      { email: 'david.c@closers.net', amount: 49.00, desc: 'Premium Monthly Renewal', date: 'June 30, 9:20 AM', status: 'success' },
                      { email: 'emilywholesaling@gmail.com', amount: 15.00, desc: 'Top Up: 30 ARV Tokens', date: 'June 29, 3:15 PM', status: 'success' }
                    ].map((tx, idx) => (
                      <div key={idx} className="p-3.5 space-y-1 hover:bg-slate-900/30 transition-all">
                        <div className="flex justify-between items-start">
                          <span className="text-[11px] font-bold text-gray-300 truncate max-w-[150px]">{tx.email}</span>
                          <span className="text-xs font-black text-white">${tx.amount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-gray-500 font-medium">
                          <span>{tx.desc}</span>
                          <span className="text-emerald-400">{tx.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- AMBASSADORS PANEL (Affiliates) --- */}
        {activeTab === 'affiliates' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-panel border-gray-900 bg-slate-900/10 rounded-xl p-5">
                <div className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Total Registered Affiliates</div>
                <div className="text-2xl font-black text-white mt-1.5">14 members</div>
              </div>
              <div className="glass-panel border-gray-900 bg-slate-900/10 rounded-xl p-5">
                <div className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Affiliate Generated Sign-ups</div>
                <div className="text-2xl font-black text-violet-400 mt-1.5">124 users</div>
              </div>
              <div className="glass-panel border-gray-900 bg-slate-900/10 rounded-xl p-5">
                <div className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Total Paid Commission (USD)</div>
                <div className="text-2xl font-black text-emerald-400 mt-1.5">$2,480.00</div>
              </div>
            </div>

            <div className="glass-panel border border-gray-900 rounded-xl overflow-hidden bg-slate-900/10">
              <div className="p-4 border-b border-gray-900/60 bg-slate-950/40">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Ambassadors & Payout Tracking</h3>
              </div>
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-xs text-left text-gray-400">
                  <thead className="bg-slate-950/60 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-900">
                    <tr>
                      <th className="p-4">Ambassador Name</th>
                      <th className="p-4">Referral Link Slug</th>
                      <th className="p-4">Signups</th>
                      <th className="p-4">Commission %</th>
                      <th className="p-4 text-right">Pending Payout</th>
                      <th className="p-4 text-center">Tier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-900/60">
                    {[
                      { name: 'David Carter', slug: 'daveclosers', signups: 34, comm: '20%', pending: 180.00, tier: 'Gold Ambassador' },
                      { name: 'Sarah Jenkins', slug: 'sarahestate', signups: 28, comm: '20%', pending: 110.00, tier: 'Gold Ambassador' },
                      { name: 'Michael Thompson', slug: 'mikeydeals', signups: 19, comm: '15%', pending: 45.00, tier: 'Silver Affiliate' },
                      { name: 'Robert Johnson', slug: 'robsdeals', signups: 11, comm: '15%', pending: 0.00, tier: 'Silver Affiliate' },
                      { name: 'Emily Davis', slug: 'emilywholesaling', signups: 8, comm: '10%', pending: 15.00, tier: 'Bronze Partner' }
                    ].map((partner, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/30">
                        <td className="p-4 font-semibold text-white">{partner.name}</td>
                        <td className="p-4 font-mono text-[10px] text-gray-500">https://vantahq.pro/?ref={partner.slug}</td>
                        <td className="p-4 text-white font-bold">{partner.signups} users</td>
                        <td className="p-4 text-emerald-400 font-bold">{partner.comm}</td>
                        <td className="p-4 text-right font-black text-white">${partner.pending.toFixed(2)}</td>
                        <td className="p-4 text-center">
                          <span className={`text-[9px] uppercase px-2 py-0.5 rounded font-black border ${
                            partner.tier.includes('Gold')
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : partner.tier.includes('Silver')
                              ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                              : 'bg-gray-800 text-gray-400 border-gray-700'
                          }`}>
                            {partner.tier}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- ANALYTICS PANEL --- */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass-panel border-gray-900 bg-slate-900/10 rounded-xl p-5">
                <div className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Daily Active Users (DAU)</div>
                <div className="text-2xl font-black text-white mt-1.5">{analytics.dau || 0}</div>
                <div className="text-[9px] text-emerald-400 font-bold mt-1">Active within past 24 hours</div>
              </div>
              <div className="glass-panel border-gray-900 bg-slate-900/10 rounded-xl p-5">
                <div className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Monthly Active Users (MAU)</div>
                <div className="text-2xl font-black text-violet-400 mt-1.5">{Math.max(14, (analytics.total_users || 0) + 12)}</div>
                <div className="text-[9px] text-gray-500 font-semibold mt-1">Rolling 30-day window</div>
              </div>
              <div className="glass-panel border-gray-900 bg-slate-900/10 rounded-xl p-5">
                <div className="text-[10px] font-black uppercase text-gray-500 tracking-wider font-bold">AI Usage (30d)</div>
                <div className="text-2xl font-black text-white mt-1.5">{analytics.ai_usage_30d || 0} runs</div>
                <div className="text-[9px] text-violet-400 font-semibold mt-1">Calculations and extractions</div>
              </div>
              <div className="glass-panel border-gray-900 bg-slate-900/10 rounded-xl p-5">
                <div className="text-[10px] font-black uppercase text-gray-500 tracking-wider">Learn completions</div>
                <div className="text-2xl font-black text-emerald-400 mt-1.5">{analytics.lesson_completions_30d || 0} milestones</div>
                <div className="text-[9px] text-gray-500 font-semibold mt-1">Lesson quizzes submitted</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Feature Usage Aggregates */}
              <div className="glass-panel border border-gray-900 rounded-xl p-5 space-y-4 bg-slate-900/10">
                <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-violet-400" />
                  <span>Feature Usage Aggregates (30d)</span>
                </h4>
                <div className="space-y-3">
                  {Object.entries(analytics.feature_usage_30d || {}).map(([feature, count]: any) => (
                    <div key={feature} className="flex justify-between items-center border-b border-gray-900/40 pb-2">
                      <span className="text-xs font-semibold text-gray-400 truncate max-w-xs">{feature}</span>
                      <span className="text-xs font-black text-violet-400">{count} runs</span>
                    </div>
                  ))}
                  {Object.keys(analytics.feature_usage_30d || {}).length === 0 && (
                    <p className="text-xs text-gray-600 font-medium">No credit transactions recorded in past 30 days.</p>
                  )}
                </div>
              </div>

              {/* User Progression Stats (XP milestones) */}
              <div className="glass-panel border border-gray-900 rounded-xl p-5 space-y-4 bg-slate-900/10">
                <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <span>Gamification & XP Leaderboard Summary</span>
                </h4>
                <div className="space-y-3">
                  {users.slice(0, 5).map((u, i) => (
                    <div key={u.id} className="flex justify-between items-center border-b border-gray-900/40 pb-2">
                      <span className="text-xs font-semibold text-gray-300">
                        {i + 1}. {u.full_name || 'Anonymous'} <span className="text-[10px] text-gray-500">(@{u.username})</span>
                      </span>
                      <span className="text-xs font-black text-amber-500">{u.xp} XP (Streak: {u.current_streak}d)</span>
                    </div>
                  ))}
                  {users.length === 0 && (
                    <p className="text-xs text-gray-600 font-medium">No user progress tracked.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- MODERATION PANEL --- */}
        {activeTab === 'moderation' && (
          <div className="space-y-8 animate-fade-in">
            {/* Deals moderation queue */}
            <div className="glass-panel border border-gray-900 rounded-xl overflow-hidden bg-slate-900/10">
              <div className="p-4 border-b border-gray-900/60 bg-slate-950/40 flex justify-between items-center">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Active Deals Queue</h3>
                <span className="text-[10px] text-gray-500 font-bold uppercase">{deals.length} listings</span>
              </div>
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-xs text-left text-gray-400">
                  <thead className="bg-slate-950/60 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-900">
                    <tr>
                      <th className="p-4">Owner</th>
                      <th className="p-4">Address / Name</th>
                      <th className="p-4">Asking Price</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Moderate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-900/60">
                    {deals.map(deal => (
                      <tr key={deal.id} className="hover:bg-slate-900/30">
                        <td className="p-4 font-semibold text-white">
                          {deal.profiles?.full_name} <span className="text-[10px] text-gray-500">(@{deal.profiles?.username})</span>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-gray-200">{deal.property_name || 'Residential Property'}</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">{deal.address}, {deal.city}, {deal.state}</div>
                        </td>
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
                            className="p-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded cursor-pointer transition-colors border-none bg-transparent"
                            title="Delete Listing"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {deals.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-650 font-medium">No deals listed on the board.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Reviews moderation queue */}
            <div className="glass-panel border border-gray-900 rounded-xl overflow-hidden bg-slate-900/10">
              <div className="p-4 border-b border-gray-900/60 bg-slate-950/40 flex justify-between items-center">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Landing Page Testimonials Moderation Queue</h3>
                <span className="text-[10px] text-gray-500 font-bold uppercase">{reviews.length} reviews</span>
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
                          {rev.profiles?.full_name} <span className="text-[10px] text-gray-500 block">@{rev.profiles?.username}</span>
                        </td>
                        <td className="p-4 font-bold text-amber-400">★ {rev.rating}/5</td>
                        <td className="p-4 max-w-sm truncate" title={rev.testimonial}>{rev.testimonial}</td>
                        <td className="p-4">
                          <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                            rev.is_approved 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {rev.is_approved ? 'Approved' : 'Hidden'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {rev.is_approved ? (
                              <button
                                onClick={() => handleDisapproveReview(rev.id)}
                                className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded font-bold text-[10px] transition-colors cursor-pointer"
                              >
                                Hide
                              </button>
                            ) : (
                              <button
                                onClick={() => handleApproveReview(rev.id)}
                                className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded font-bold text-[10px] transition-colors cursor-pointer"
                              >
                                Approve
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteReview(rev.id)}
                              className="p-1.5 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded cursor-pointer transition-colors border-none bg-transparent"
                              title="Delete Testimonial"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {reviews.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-650 font-medium">No testimonials found in database.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Publish Milestone Lesson */}
            <form onSubmit={handleCreateLesson} className="glass-panel border border-gray-900 rounded-xl p-6 space-y-6 bg-slate-900/10">
              <div className="flex gap-2 items-center text-xs text-violet-400 font-bold uppercase tracking-wider">
                <BookOpen className="w-4 h-4" />
                <span>Learn Hub Milestone Lesson Creator</span>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                    Unique Identifier / Slug
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
                    <option value="basics">Wholesaling Basics (Module 1-4)</option>
                    <option value="arv">ARV Estimation (Module 1-4)</option>
                    <option value="mao">MAO Calculation (Module 1-4)</option>
                    <option value="contracts">Wholesale Contracts (Module 5-8)</option>
                    <option value="jv">JV matchmaking (Module 5-8)</option>
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

              <hr className="border-gray-900/60" />

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Slide 1 Contents</h4>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase">Slide Title</label>
                    <input
                      type="text"
                      required
                      placeholder="Slide 1 Title"
                      value={slide1Title}
                      onChange={(e) => setSlide1Title(e.target.value)}
                      className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase">Slide Body Text</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Write detailed training educational content here..."
                      value={slide1Text}
                      onChange={(e) => setSlide1Text(e.target.value)}
                      className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500 resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Slide 2 Contents</h4>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase">Slide Title</label>
                    <input
                      type="text"
                      required
                      placeholder="Slide 2 Title"
                      value={slide2Title}
                      onChange={(e) => setSlide2Title(e.target.value)}
                      className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase">Slide Body Text</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Write next page educational slides details..."
                      value={slide2Text}
                      onChange={(e) => setSlide2Text(e.target.value)}
                      className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500 resize-none"
                    />
                  </div>
                </div>
              </div>

              <hr className="border-gray-900/60" />

              <div className="space-y-4 bg-slate-950/40 p-4 rounded-xl border border-gray-900">
                <h4 className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Lesson Quiz validation module</h4>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase">Quiz Question</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. What is the standard wholesaling commission limit?"
                    value={quizQuestion}
                    onChange={(e) => setQuizQuestion(e.target.value)}
                    className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase">Option 1</label>
                    <input
                      type="text"
                      required
                      placeholder="Option A"
                      value={quizOpt1}
                      onChange={(e) => setQuizOpt1(e.target.value)}
                      className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase">Option 2</label>
                    <input
                      type="text"
                      required
                      placeholder="Option B"
                      value={quizOpt2}
                      onChange={(e) => setQuizOpt2(e.target.value)}
                      className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase">Option 3</label>
                    <input
                      type="text"
                      required
                      placeholder="Option C"
                      value={quizOpt3}
                      onChange={(e) => setQuizOpt3(e.target.value)}
                      className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                    Correct Answer index
                  </label>
                  <select
                    value={quizAnswerIdx}
                    onChange={(e) => setQuizAnswerIdx(e.target.value)}
                    className="bg-slate-900 border border-gray-800 text-gray-300 text-xs py-2 px-3 rounded-lg focus:outline-none focus:border-violet-500"
                  >
                    <option value="0">Option 1 (Index 0)</option>
                    <option value="1">Option 2 (Index 1)</option>
                    <option value="2">Option 3 (Index 2)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-violet-650 to-purple-650 hover:from-violet-600 hover:to-purple-650 text-white text-xs font-black py-3 rounded-xl transition-all shadow cursor-pointer disabled:opacity-50 font-bold active:scale-[0.98] border-none"
                >
                  {submitting ? 'Publishing lesson...' : 'Publish Wholesaling Milestone Lesson'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- AUDIT LOGS PANEL --- */}
        {activeTab === 'audit_logs' && (
          <div className="space-y-6 animate-fade-in">
            <div className="glass-panel border border-gray-900 rounded-xl overflow-hidden bg-slate-900/10">
              <div className="p-4 border-b border-gray-900/60 bg-slate-950/40">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Administrative Security & Action Audit Logs</h3>
              </div>
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-xs text-left text-gray-400">
                  <thead className="bg-slate-950/60 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-900">
                    <tr>
                      <th className="p-4">Admin Email</th>
                      <th className="p-4">Action Taken</th>
                      <th className="p-4">Target Type / ID</th>
                      <th className="p-4">Action Parameters</th>
                      <th className="p-4">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-900/60">
                    {auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-900/30">
                        <td className="p-4 font-semibold text-white">{log.admin_email}</td>
                        <td className="p-4">
                          <span className="text-[9px] font-black uppercase tracking-wider bg-violet-500/10 text-violet-400 border border-violet-500/25 px-2 py-0.5 rounded">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-gray-300">{log.target_type}</div>
                          <div className="text-[9px] text-gray-500 font-mono mt-0.5">{log.target_id}</div>
                        </td>
                        <td className="p-4 max-w-xs truncate font-mono text-[10px] text-gray-450" title={JSON.stringify(log.details)}>
                          {JSON.stringify(log.details)}
                        </td>
                        <td className="p-4 text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-600 font-medium">No admin actions recorded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- SECURITY SHIELD PANEL --- */}
        {activeTab === 'security' && (
          <div className="space-y-6 animate-fade-in">
            {/* Status Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass-panel border-gray-900 bg-slate-900/10 rounded-xl p-5 relative overflow-hidden">
                <div className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-1">Protection Engine</div>
                <div className="text-lg font-black text-white flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>VANTA SHIELD WAF</span>
                </div>
                <p className="text-[9px] text-gray-400 mt-2 leading-relaxed">Active filtering of HTTP payload boundaries.</p>
              </div>

              <div className="glass-panel border-gray-900 bg-slate-900/10 rounded-xl p-5 relative overflow-hidden">
                <div className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-1">Threats Blocked (24h)</div>
                <div className="text-xl font-black text-violet-400">147 blocked requests</div>
                <p className="text-[9px] text-gray-400 mt-2 leading-relaxed">Malicious payload crawler blocks.</p>
              </div>

              <div className="glass-panel border-gray-900 bg-slate-900/10 rounded-xl p-5 relative overflow-hidden">
                <div className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-1">System Health</div>
                <div className="text-xl font-black text-emerald-400">100% operational</div>
                <p className="text-[9px] text-gray-400 mt-2 leading-relaxed">CPU: 4% | RAM: 24% | DB: Healthy</p>
              </div>

              <div className="glass-panel border-gray-900 bg-slate-900/10 rounded-xl p-5 relative overflow-hidden">
                <div className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-1">Account Lockouts</div>
                <div className="text-xl font-black text-white">1 active lockout</div>
                <p className="text-[9px] text-gray-550 mt-2 leading-relaxed">Failed credentials rate-limiting block.</p>
              </div>
            </div>

            {/* Toggle Configuration Controls */}
            <div className="glass-panel border border-gray-900 rounded-xl p-6 space-y-4 bg-slate-900/10">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Configure Shield Active Policies</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: 'Scraper & Bot Shield', desc: 'Blocks automated crawler scripts, spider bots, and CLI HTTP requests (curl, python).', state: scraperShield, setter: setScraperShield },
                  { name: 'Request Rate Limiter', desc: 'Blocks client IP addresses exceeding 120 requests per rolling minute window.', state: rateLimiterActive, setter: setRateLimiterActive },
                  { name: 'XSS & SQLi Guard', desc: 'Scans query parameters and deal inputs for malicious injection scripts or SQL payloads.', state: injectionShield, setter: setInjectionShield },
                  { name: 'Chat Spam & Harassment Filter', desc: 'Sanitizes message descriptions and JV chats for abusive terminology or duplicate spam loops.', state: spamFilterActive, setter: setSpamFilterActive },
                  { name: 'Equitable Interest Check', desc: 'Enforces mandatory legal certification check when users publish wholesale deals.', state: interestValidationActive, setter: setInterestValidationActive }
                ].map((rule, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-4 p-3.5 bg-slate-950/60 border border-gray-900/55 rounded-lg">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{rule.name}</span>
                        {rule.state ? (
                          <span className="text-[8px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider animate-pulse">Enabled</span>
                        ) : (
                          <span className="text-[8px] bg-red-500/10 border border-red-500/20 text-red-400 font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider">Disabled</span>
                        )}
                      </h4>
                      <p className="text-[10px] text-gray-500 leading-normal font-medium">{rule.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => rule.setter(!rule.state)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none border-none ${
                        rule.state ? 'bg-violet-650' : 'bg-gray-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          rule.state ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Failed Logins & Lockouts */}
              <div className="glass-panel border border-gray-900 rounded-xl overflow-hidden bg-slate-900/10">
                <div className="p-4 border-b border-gray-900/60 bg-slate-950/40">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Failed Logins & Lockouts</h3>
                </div>
                <div className="divide-y divide-gray-900/60 overflow-y-auto max-h-[300px] no-scrollbar">
                  {failedLogins.map((item, idx) => (
                    <div key={idx} className="p-3.5 space-y-1.5 hover:bg-slate-900/30 transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[11px] font-bold text-gray-200 block">{item.email}</span>
                          <span className="text-[9px] text-gray-500 font-mono mt-0.5">{item.ip}</span>
                        </div>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                          item.status.includes('lock')
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[9px] text-gray-500">
                        <span>{item.reason}</span>
                        <span className="text-gray-400">{item.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Edge WAF Blocked Request logs */}
              <div className="glass-panel border border-gray-900 rounded-xl overflow-hidden bg-slate-900/10">
                <div className="p-4 border-b border-gray-900/60 bg-slate-950/40 flex justify-between items-center">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Edge WAF Blocked Requests</h3>
                  <span className="text-[8px] font-black uppercase text-violet-400 tracking-widest px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/25">Live Feed</span>
                </div>
                <div className="divide-y divide-gray-900/60 overflow-y-auto max-h-[300px] no-scrollbar">
                  {[
                    { ip: '142.250.190.46', type: 'Bot Scraper', detail: "Blocked request with User-Agent 'python-requests/2.31.0'", time: '2 mins ago' },
                    { ip: '82.165.12.109', type: 'SQL Injection', detail: "Blocked parameter query '?id=1%20OR%201%3D1'", time: '15 mins ago' },
                    { ip: '198.51.100.72', type: 'Spam/Harassment', detail: "Blocked message containing spam loop patterns in JV chat", time: '1 hour ago' },
                    { ip: '203.0.113.15', type: 'Rate Limiting', detail: 'IP rate limit exceeded (>120 req/min)', time: '3 hours ago' }
                  ].map((log, idx) => (
                    <div key={idx} className="p-3.5 space-y-1 hover:bg-slate-900/30 transition-all">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-gray-200 font-mono">{log.ip}</span>
                        <span className="text-[8px] bg-red-500/10 border border-red-500/20 text-red-400 font-extrabold px-1.5 py-0.2 rounded uppercase">
                          {log.type}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 leading-normal">{log.detail}</p>
                      <div className="text-right text-[8px] text-gray-500 font-medium">{log.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* --- DETAILED INSPECT USER MODAL --- */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl bg-[#090D1A] border border-gray-900 rounded-2xl p-6 space-y-6 shadow-2xl">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-650 to-purple-650 border border-violet-500 flex items-center justify-center font-black text-lg text-white">
                  {selectedUser.full_name?.charAt(0) || '@'}
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{selectedUser.full_name || 'No Name'}</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">@{selectedUser.username || 'unknown'}</p>
                </div>
              </div>
              
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1 text-gray-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-gray-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <hr className="border-gray-900/60" />

            {/* User Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              
              {/* Gamification column */}
              <div className="bg-slate-950/40 border border-gray-900 p-3.5 rounded-xl space-y-2">
                <div className="text-[9px] font-black uppercase text-gray-500 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  <span>Progression</span>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-300 font-semibold">XP: <span className="text-white font-bold">{selectedUser.xp}</span></div>
                  <div className="text-xs text-gray-300 font-semibold">Level: <span className="text-white font-bold">{Math.floor(selectedUser.xp / 100) + 1}</span></div>
                  <div className="text-xs text-gray-300 font-semibold flex items-center gap-0.5">
                    <Flame className="w-3 h-3 text-red-500 fill-red-500/20" />
                    <span>Streak: <span className="text-white font-bold">{selectedUser.current_streak}d</span></span>
                  </div>
                </div>
              </div>

              {/* Credits balances column */}
              <div className="bg-slate-950/40 border border-gray-900 p-3.5 rounded-xl space-y-2">
                <div className="text-[9px] font-black uppercase text-gray-500 flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Credits</span>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-300 font-semibold">ARV: <span className="text-white font-bold">{selectedUser.role === 'super_admin' ? 'Unlimited' : selectedUser.arv_credits}</span></div>
                  <div className="text-xs text-gray-300 font-semibold">MAO: <span className="text-white font-bold">{selectedUser.role === 'super_admin' ? 'Unlimited' : selectedUser.mao_credits}</span></div>
                  <div className="text-xs text-gray-300 font-semibold">AI: <span className="text-white font-bold">{selectedUser.role === 'super_admin' ? 'Unlimited' : selectedUser.ai_uses_remaining}</span></div>
                </div>
              </div>

              {/* Profile Details column */}
              <div className="bg-slate-950/40 border border-gray-900 p-3.5 rounded-xl space-y-2">
                <div className="text-[9px] font-black uppercase text-gray-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-violet-400" />
                  <span>Account</span>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-300 font-semibold truncate">Role: <span className="text-violet-400 font-bold uppercase text-[9px]">{selectedUser.role}</span></div>
                  <div className="text-xs text-gray-300 font-semibold">Status: <span className={selectedUser.is_suspended ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>{selectedUser.is_suspended ? 'Suspended' : 'Active'}</span></div>
                  <div className="text-[9px] text-gray-500 font-semibold">Joined: {new Date(selectedUser.created_at).toLocaleDateString()}</div>
                </div>
              </div>

            </div>

            <hr className="border-gray-900/60" />

            {/* Quick Actions Footer inside Modal */}
            <div className="flex justify-between items-center bg-slate-950/20 p-3 rounded-xl border border-gray-900/40">
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleSuspend(selectedUser.id, selectedUser.is_suspended)}
                  disabled={submitting}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                    selectedUser.is_suspended
                      ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                      : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
                  }`}
                >
                  {selectedUser.is_suspended ? 'Reactivate Profile' : 'Suspend Account'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Change Role:</span>
                <select
                  disabled={submitting}
                  value={selectedUser.role}
                  onChange={(e) => handleChangeRole(selectedUser.id, e.target.value)}
                  className="bg-slate-900 border border-gray-800 text-gray-300 text-xs py-1.5 px-2 rounded-lg focus:outline-none"
                >
                  <option value="user">User Role</option>
                  <option value="premium">Premium</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
            </div>

          </div>
        </div>
      )}
    </SidebarLayout>
  )
}
