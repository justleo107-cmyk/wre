'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowRight, Trophy, Sparkles, Building, Users, Search, GraduationCap } from 'lucide-react'
import confetti from 'canvas-confetti'
import { type Profile } from '@/types/database'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Form state
  const [specialty, setSpecialty] = useState('')
  const [experience, setExperience] = useState('')
  const [bio, setBio] = useState('')
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    async function checkProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (error) {
        console.error('Error fetching profile:', error)
      } else {
        setProfile(data)
        // If they already have a specialty and experience, they might have completed onboarding.
        // But let them see the onboarding details if they want, or redirect if XP > 0.
        if (data.xp > 0) {
          router.push('/dashboard')
        }
      }
      setLoading(false)
    }

    checkProfile()
  }, [router, supabase])

  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#8b5cf6', '#10b981', '#f59e0b']
    })
  }

  // Auto trigger confetti on the final reward screen
  useEffect(() => {
    if (step === 4) {
      triggerConfetti()
    }
  }, [step])

  const handleCompleteOnboarding = async () => {
    setCompleting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Update Profile (Add XP, update rank, set last active)
      const rank = experience === 'master' ? 'JV Connector' : 'Rookie Wholesaler'
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          xp: 100, // 100 XP from first badge
          current_rank: rank,
          last_active_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // 2. Award First Badge
      const { error: badgeError } = await supabase
        .from('user_badges')
        .insert({
          user_id: user.id,
          badge_id: 'first-step',
          earned_at: new Date().toISOString()
        })

      if (badgeError) {
        // If badge is already awarded, ignore
        if (!badgeError.message.includes('duplicate')) {
          throw badgeError
        }
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      console.error('Error completing onboarding:', err)
      alert('Something went wrong. Let us take you to the dashboard.')
      router.push('/dashboard')
    } finally {
      setCompleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-4" />
        <p className="text-xs text-gray-400 font-medium">Initializing your profile...</p>
      </div>
    )
  }

  return (
    <div className="glass-panel rounded-2xl p-6 shadow-2xl border border-gray-800/80">
      {/* Step Indicator */}
      <div className="flex justify-between items-center mb-6">
        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
          Step {step} of 4
        </span>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-1 rounded-full transition-all duration-300 ${
                s === step 
                  ? 'w-6 bg-violet-500' 
                  : s < step 
                    ? 'w-2 bg-emerald-500' 
                    : 'w-2 bg-gray-800'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step 1: Specialty Selection */}
      {step === 1 && (
        <div>
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white mb-1">Choose Your Wholesaling Focus</h3>
            <p className="text-xs text-gray-400">Select the path that matches your current goal. You can change this anytime.</p>
          </div>

          <div className="space-y-3">
            {[
              {
                id: 'finder',
                title: 'Deal Finder / Scout',
                desc: 'You focus on locating motivated sellers and locking properties under contract.',
                icon: Search,
                color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
              },
              {
                id: 'connector',
                title: 'JV Matchmaker / Connector',
                desc: 'You have a strong cash buyers list and want to co-wholesale deals with other finders.',
                icon: Users,
                color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
              },
              {
                id: 'hybrid',
                title: 'Solo Operator (Both)',
                desc: 'You do it all—find off-market leads and connect directly with final cash buyers.',
                icon: Building,
                color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
              }
            ].map((opt) => {
              const Icon = opt.icon
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSpecialty(opt.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex gap-4 ${
                    specialty === opt.id
                      ? 'border-violet-500 bg-violet-500/5 shadow-md shadow-violet-500/5'
                      : 'border-gray-800 hover:border-gray-700 bg-slate-900/40'
                  }`}
                >
                  <div className={`p-2.5 rounded-lg shrink-0 ${opt.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-0.5">{opt.title}</h4>
                    <p className="text-xs text-gray-400 leading-relaxed">{opt.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>

          <button
            type="button"
            disabled={!specialty}
            onClick={() => setStep(2)}
            className="w-full mt-6 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 2: Experience level */}
      {step === 2 && (
        <div>
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white mb-1">What is Your Wholesaling Level?</h3>
            <p className="text-xs text-gray-400">Help customize your gamified learning flow and dashboard milestones.</p>
          </div>

          <div className="space-y-3">
            {[
              {
                id: 'rookie',
                title: 'Rookie (0 Deals)',
                desc: 'New to the industry. Eager to learn ARV, MAO, contracts, and secure the first assignment.',
                icon: GraduationCap,
                color: 'from-blue-600/20 to-blue-500/5 border-blue-500/20 text-blue-400',
              },
              {
                id: 'intermediate',
                title: 'Deal Hunter (1-5 Deals Completed)',
                desc: 'You understand the basics, have locked in a few contracts, and want to scale Deal Flow.',
                icon: Search,
                color: 'from-purple-600/20 to-purple-500/5 border-purple-500/20 text-purple-400',
              },
              {
                id: 'master',
                title: 'Closer / Operator (5+ Deals)',
                desc: 'Experienced investor. Looking to scale via joint ventures and collaborate on deals.',
                icon: Trophy,
                color: 'from-amber-600/20 to-amber-500/5 border-amber-500/20 text-amber-400',
              }
            ].map((opt) => {
              const Icon = opt.icon
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setExperience(opt.id)}
                  className={`w-full text-left p-4 rounded-xl border bg-gradient-to-br transition-all cursor-pointer flex gap-4 ${
                    experience === opt.id
                      ? 'border-violet-500 shadow-md shadow-violet-500/5'
                      : 'border-gray-800 hover:border-gray-700'
                  } ${opt.color}`}
                >
                  <div className="p-2.5 rounded-lg shrink-0 bg-black/40">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-0.5">{opt.title}</h4>
                    <p className="text-xs text-gray-400 leading-relaxed">{opt.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-1/3 bg-slate-900 border border-gray-800 hover:bg-slate-800 text-gray-300 text-sm font-semibold py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!experience}
              onClick={() => setStep(3)}
              className="w-2/3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Bio and Confirmation */}
      {step === 3 && (
        <div>
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white mb-1">Tell Us About Yourself</h3>
            <p className="text-xs text-gray-400">Introduce yourself to other wholesalers on the JV Deal Board.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Full Name
              </label>
              <input
                type="text"
                disabled
                value={profile?.full_name || ''}
                className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-sm text-gray-400 focus:outline-none cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Mini Bio (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Wholesaling in Atlanta metro area, looking for fix & flip cash buyers."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-1/3 bg-slate-900 border border-gray-800 hover:bg-slate-800 text-gray-300 text-sm font-semibold py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="w-2/3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Verify Profile</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Claim Reward Screen */}
      {step === 4 && (
        <div className="text-center py-4">
          <div className="inline-flex p-4 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-4 animate-bounce">
            <Trophy className="w-12 h-12" />
          </div>

          <h3 className="text-xl font-black text-white mb-2 tracking-tight">Onboarding Completed!</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto mb-6 leading-relaxed">
            {"You've officially joined the Vanta wholesaling network. We've funded your ledger and unlocked your starter badge."}
          </p>

          <div className="bg-slate-900/80 border border-gray-800 rounded-xl p-4 max-w-xs mx-auto mb-8 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400 font-medium">Starter Credits:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                +50 Credits 🪙
              </span>
            </div>
            <div className="h-px bg-gray-800" />
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-400 font-medium">Unlocked Badge:</span>
              <span className="text-violet-400 font-bold flex items-center gap-1">
                First Step 🎓 (+100 XP)
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={completing}
            onClick={handleCompleteOnboarding}
            className="w-full bg-gradient-to-r from-violet-600 via-purple-600 to-emerald-600 hover:from-violet-500 hover:to-emerald-500 text-white text-sm font-bold py-3 px-4 rounded-lg shadow-lg shadow-violet-950/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {completing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Claim Rewards & Enter Dashboard</span>
                <Sparkles className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
