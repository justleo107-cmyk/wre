'use client'

import React, { useState, useEffect } from 'react'
import SidebarLayout from '@/components/dashboard/SidebarLayout'
import { createClient } from '@/lib/supabase/client'
import { User, Settings, Save, AlertCircle, CheckCircle, Shield } from 'lucide-react'
import confetti from 'canvas-confetti'

export default function SettingsPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileData) {
      setProfile(profileData)
      setFullName(profileData.full_name || '')
      setUsername(profileData.username || '')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !fullName.trim()) {
      setStatus({ type: 'error', message: 'All fields are required.' })
      return
    }

    setSaving(true)
    setStatus(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          username: username.trim().toLowerCase()
        })
        .eq('id', user.id)

      if (error) {
        if (error.message.includes('unique')) {
          throw new Error('Username is already taken.')
        }
        throw error
      }

      setStatus({ type: 'success', message: 'Profile settings updated successfully!' })
      confetti({ particleCount: 50, spread: 40 })
      await fetchProfile()
    } catch (err: any) {
      console.error(err)
      setStatus({ type: 'error', message: err.message || 'Failed to update profile.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <SidebarLayout>
      <div className="max-w-xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-900 pb-5">
          <Settings className="w-6 h-6 text-violet-400" />
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white mb-1">
              Account Settings
            </h1>
            <p className="text-xs text-gray-400">
              Customize your profile username, display name, and account preferences.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12">
            <div className="w-8 h-8 border-3 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-3" />
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Syncing settings...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status alerts */}
            {status && (
              <div className={`p-4 rounded-xl border flex gap-3 text-xs font-semibold ${
                status.type === 'success' 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                  : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {status.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0" />
                )}
                <span>{status.message}</span>
              </div>
            )}

            {/* Profile Summary Card */}
            <div className="glass-panel border border-gray-900 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center font-bold text-violet-300 text-lg">
                {profile?.full_name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>{profile?.full_name}</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 font-black">
                    {profile?.current_rank || 'Rookie'}
                  </span>
                </h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Level {profile?.level || 1} • {profile?.xp || 0} XP • {profile?.current_streak || 0} Day Streak</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="glass-panel border border-gray-900 rounded-2xl p-6 space-y-5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <User className="w-4 h-4 text-violet-400" />
                <span>Profile Information</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                    Username
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-gray-650 font-bold">@</span>
                    <input
                      type="text"
                      required
                      placeholder="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 pl-7 pr-3 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow shadow-violet-950/20 disabled:opacity-50 cursor-pointer font-semibold"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Platform Settings Details */}
            <div className="glass-panel border border-gray-900 rounded-2xl p-5 space-y-3.5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-950 pb-3">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Security & Platform Rules</span>
              </h3>
              <div className="space-y-2 text-[11px] text-gray-400 leading-relaxed">
                <p>✓ All computations are double-check locked on the Supabase ledger to prevent credit exploitation.</p>
                <p>✓ Username edits are immediate but must remain unique across the entire SaaS workspace.</p>
                <p>✓ Canceling subscription will immediately deduct remaining monthly credit bonuses at the end of the billing period.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  )
}
