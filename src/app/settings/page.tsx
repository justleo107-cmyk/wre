'use client'

import React, { useState, useEffect, useCallback } from 'react'
import SidebarLayout from '@/components/dashboard/SidebarLayout'
import { createClient } from '@/lib/supabase/client'
import { User, Settings, Save, AlertCircle, CheckCircle, Shield, Camera, Upload, CreditCard } from 'lucide-react'
import confetti from 'canvas-confetti'
import { type Profile, type Subscription } from '@/types/database'

export default function SettingsPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const fetchProfile = useCallback(async () => {
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

    const { data: subData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (subData) {
      setSubscription(subData)
    }
    setLoading(false)
  }, [supabase])

  const handleManageSubscription = async () => {
    setPortalLoading(true)
    setStatus(null)
    try {
      const res = await fetch('/api/subscriptions/portal', {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to open billing portal')
      
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No portal URL returned')
      }
    } catch (err) {
      const error = err as Error
      console.error(error)
      setStatus({ type: 'error', message: error.message || 'Failed to access billing portal.' })
    } finally {
      setPortalLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProfile()
    }, 0)
    return () => clearTimeout(timer)
  }, [fetchProfile])

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
    } catch (err) {
      const error = err as Error
      console.error(error)
      setStatus({ type: 'error', message: error.message || 'Failed to update profile.' })
    } finally {
      setSaving(false)
    }
  }

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setStatus(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Authentication session expired. Please log in again.')

      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { cacheControl: '3600', upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      setStatus({ type: 'success', message: 'Profile picture updated successfully!' })
      confetti({ particleCount: 60, spread: 35 })
      await fetchProfile()
    } catch (err) {
      const error = err as Error
      console.error(error)
      setStatus({ type: 'error', message: error.message || 'Failed to upload image file.' })
    } finally {
      setUploading(false)
    }
  }

  const handleSelectPreset = async (url: string) => {
    setSaving(true)
    setStatus(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Authentication session expired.')

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', user.id)

      if (updateError) throw updateError

      setStatus({ type: 'success', message: 'Profile avatar updated with preset!' })
      confetti({ particleCount: 40, spread: 30 })
      await fetchProfile()
    } catch (err) {
      const error = err as Error
      console.error(error)
      setStatus({ type: 'error', message: error.message || 'Failed to update preset avatar.' })
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
              Customize your profile avatar, display name, and user account parameters.
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
            <div className="glass-panel border border-gray-900 rounded-2xl p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative group w-14 h-14 rounded-full overflow-hidden border border-violet-500/30 bg-slate-900 flex items-center justify-center shrink-0">
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt={profile.full_name || 'Avatar'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-black text-violet-300 text-xl bg-violet-650/10">
                      {profile?.full_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  
                  {/* Hover Overlay */}
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity duration-200">
                    <Camera className="w-4 h-4 text-white" />
                    <span className="text-[8px] text-gray-300 font-bold uppercase mt-0.5">Upload</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleUploadAvatar} 
                      disabled={uploading}
                      className="hidden" 
                    />
                  </label>

                  {uploading && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>{profile?.full_name}</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 font-black">
                      {profile?.rank || 'Rookie'}
                    </span>
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">Level {profile?.level || 1} • {profile?.xp || 0} XP • {profile?.current_streak || 0} Day Streak</p>
                </div>
              </div>
              
              <div className="shrink-0">
                <label className="bg-slate-950 hover:bg-slate-900 border border-gray-800 hover:border-gray-700 text-gray-300 text-[10px] font-bold py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 select-none active:scale-[0.98]">
                  <Upload className="w-3.5 h-3.5 text-violet-400" />
                  <span>{uploading ? 'Uploading...' : 'Upload Photo'}</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleUploadAvatar} 
                    disabled={uploading}
                    className="hidden" 
                  />
                </label>
              </div>
            </div>

            {/* Presets Selection Card */}
            <div className="glass-panel border border-gray-900 rounded-2xl p-5 space-y-3.5">
              <div>
                <h4 className="text-[11px] font-bold text-white uppercase tracking-wider">Preset Closer Illustrations</h4>
                <p className="text-[9px] text-gray-500 mt-0.5">Quickly select a pre-made real-estate scout character portrait.</p>
              </div>
              <div className="flex gap-4 items-center">
                {[
                  { name: 'VIP Closer', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
                  { name: 'Deal Scout', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
                  { name: 'Analyst Pro', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80' },
                  { name: 'Closer Pro', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' }
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(preset.url)}
                    className={`relative w-12 h-12 rounded-full overflow-hidden border hover:scale-110 active:scale-[0.95] transition-all cursor-pointer shrink-0 ${
                      profile?.avatar_url === preset.url 
                        ? 'border-violet-500 shadow-md shadow-violet-950/20 scale-105' 
                        : 'border-gray-800 hover:border-gray-700'
                    }`}
                    title={preset.name}
                  >
                    <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                  </button>
                ))}
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
                    className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 placeholder-gray-650 focus:outline-none focus:border-violet-500"
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
                      className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 pl-7 pr-3 text-xs text-gray-100 placeholder-gray-650 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow shadow-violet-955/20 disabled:opacity-50 cursor-pointer font-semibold active:scale-[0.98]"
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

            {/* Billing & Subscription Card */}
            <div className="glass-panel border border-gray-900 rounded-2xl p-6 space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-950 pb-3">
                <CreditCard className="w-4 h-4 text-violet-400" />
                <span>Billing & Subscription</span>
              </h3>
              
              <div className="grid grid-cols-2 gap-4 bg-slate-950/40 p-4 rounded-xl border border-gray-900/50">
                <div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Current Plan</div>
                  <div className="text-sm font-black text-white mt-1">
                    {subscription?.status === 'active' || subscription?.status === 'trialing' ? (
                      <span className="text-violet-400 font-extrabold">Premium ({subscription.plan_type === 'six_month' ? '6-Month' : subscription.plan_type === 'yearly' ? 'Yearly' : 'Monthly'})</span>
                    ) : (
                      <span className="text-gray-400 font-bold">Free Tier</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Status</div>
                  <div className="text-xs font-bold mt-1">
                    {subscription ? (
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        subscription.status === 'active' || subscription.status === 'trialing'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : subscription.status === 'past_due'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {subscription.status}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gray-550/10 text-gray-400 border border-gray-800">
                        Free
                      </span>
                    )}
                  </div>
                </div>
                {(subscription?.status === 'active' || subscription?.status === 'trialing') && subscription?.current_period_end && (
                  <div className="col-span-2 border-t border-gray-900/60 pt-3 mt-1">
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Next Renewal Date</div>
                    <div className="text-xs text-gray-300 mt-1 font-semibold">
                      {new Date(subscription.current_period_end).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                {subscription ? (
                  <button
                    type="button"
                    onClick={handleManageSubscription}
                    disabled={portalLoading}
                    className="w-full bg-slate-950 hover:bg-slate-900 border border-gray-800 hover:border-gray-700 text-gray-300 text-xs font-extrabold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow select-none disabled:opacity-50 cursor-pointer"
                  >
                    {portalLoading ? 'Loading Billing Portal...' : 'Manage Subscription'}
                  </button>
                ) : (
                  <a
                    href="/pricing"
                    className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-extrabold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow shadow-violet-955/20 text-center block cursor-pointer select-none active:scale-[0.98]"
                  >
                    Upgrade to Premium
                  </a>
                )}
              </div>
            </div>

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
