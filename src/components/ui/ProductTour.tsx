'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { awardBadge } from '@/lib/gamification'
import { Compass, Trophy, Award, ArrowLeft, ArrowRight, Sparkles, X } from 'lucide-react'
import confetti from 'canvas-confetti'

interface ProductTourProps {
  userId: string
  isOpen: boolean
  onClose: () => void
  onSkip: () => void
  onExpandSidebar: (group: string, state: boolean) => void
}

const STEPS = [
  {
    stepIndex: 1,
    title: 'Welcome to Vanta',
    targetId: '',
    groupToExpand: '',
    description: (
      <div className="space-y-3">
        <p className="text-xs text-gray-300 leading-relaxed">
          Before you start learning wholesaling, let's take a quick tour of the platform.
        </p>
        <div className="bg-slate-950/80 border border-gray-900 rounded-xl p-4 text-left space-y-2.5">
          <div className="text-[10px] uppercase font-bold text-gray-500">Complete this tour to earn:</div>
          <div className="text-xs flex items-center gap-2 text-violet-400 font-bold">
            <span className="text-violet-400">🎓</span>
            <span>+100 XP</span>
          </div>
          <div className="text-xs flex items-center gap-2 text-amber-500 font-bold">
            <span>🧭</span>
            <span>Platform Explorer Badge</span>
          </div>
        </div>
      </div>
    )
  },
  {
    stepIndex: 2,
    title: 'Dashboard',
    targetId: 'tour-dashboard',
    groupToExpand: '',
    description: (
      <div className="space-y-2 text-xs text-gray-300 leading-relaxed">
        <p>This is your command center.</p>
        <p>Here you'll monitor:</p>
        <ul className="list-disc pl-4 space-y-1 mt-1 text-gray-400">
          <li>XP Progress</li>
          <li>Current Rank</li>
          <li>Streaks</li>
          <li>Badges</li>
          <li>Recent Activity</li>
          <li>Deal Progress</li>
        </ul>
        <p className="mt-2 text-violet-450 font-medium">Everything important appears here first.</p>
      </div>
    )
  },
  {
    stepIndex: 3,
    title: 'Learn Hub',
    targetId: 'tour-learn',
    groupToExpand: 'tools',
    description: (
      <div className="space-y-2 text-xs text-gray-300 leading-relaxed">
        <p>This is where your wholesaling journey starts.</p>
        <p>Learn Hub contains:</p>
        <ul className="list-disc pl-4 space-y-1 mt-1 text-gray-400">
          <li>Beginner Lessons</li>
          <li>Quizzes</li>
          <li>XP Rewards</li>
          <li>Real Deal Examples</li>
          <li>Progress Tracking</li>
        </ul>
        <div className="mt-2.5 p-2.5 bg-violet-500/10 border border-violet-500/20 rounded-lg text-[10px] font-bold text-violet-400">
          Recommended: Complete the Learn Hub before analyzing real deals.
        </div>
      </div>
    )
  },
  {
    stepIndex: 4,
    title: 'Deal Analysis Tools',
    targetId: 'tour-calculators',
    groupToExpand: 'tools',
    description: (
      <div className="space-y-2 text-xs text-gray-300 leading-relaxed">
        <p>Use these tools to evaluate deals.</p>
        <div className="space-y-1.5 mt-2 text-gray-400">
          <p><span className="text-white font-bold">ARV Calculator:</span> Estimate property value after repairs.</p>
          <p><span className="text-white font-bold">MAO Calculator:</span> Calculate the maximum offer price.</p>
        </div>
        <p className="mt-2 text-amber-500 font-black uppercase text-[9px] tracking-wider">Never make offers without checking your numbers first.</p>
      </div>
    )
  },
  {
    stepIndex: 5,
    title: 'Deal Tracker',
    targetId: 'tour-deals',
    groupToExpand: 'deals',
    description: (
      <div className="space-y-2 text-xs text-gray-300 leading-relaxed">
        <p>Manage every opportunity in one place.</p>
        <p>Track:</p>
        <ul className="list-disc pl-4 space-y-1 mt-1 text-gray-400">
          <li>Properties</li>
          <li>Sellers</li>
          <li>Notes</li>
          <li>Deal Status</li>
          <li>Milestones</li>
        </ul>
        <p className="mt-2 text-violet-400 font-semibold">Think of it as your wholesaling workspace.</p>
      </div>
    )
  },
  {
    stepIndex: 6,
    title: 'Deal Intelligence',
    targetId: 'tour-deal-intelligence',
    groupToExpand: 'deals',
    description: (
      <div className="space-y-2 text-xs text-gray-300 leading-relaxed">
        <p>Store and analyze deal information.</p>
        <p>You can save:</p>
        <ul className="list-disc pl-4 space-y-1 mt-1 text-gray-400">
          <li>Property Details</li>
          <li>Seller Motivation</li>
          <li>Call Notes</li>
          <li>Voice Notes</li>
          <li>Deal Concerns</li>
        </ul>
        <p className="mt-2 text-violet-450 italic font-semibold">AI helps organize information and identify opportunities.</p>
      </div>
    )
  },
  {
    stepIndex: 7,
    title: 'Marketplace',
    targetId: 'tour-marketplace',
    groupToExpand: 'deals',
    description: (
      <div className="space-y-2 text-xs text-gray-300 leading-relaxed">
        <p>Connect with other wholesalers.</p>
        <p>Use Marketplace to:</p>
        <ul className="list-disc pl-4 space-y-1 mt-1 text-gray-400">
          <li>Find JV Opportunities</li>
          <li>Browse Deals</li>
          <li>Post Opportunities</li>
          <li>Network With Investors</li>
        </ul>
        <p className="mt-2 text-emerald-400 font-semibold">Deals are often found through relationships.</p>
      </div>
    )
  },
  {
    stepIndex: 8,
    title: 'Voice Notes',
    targetId: 'tour-voice-notes',
    groupToExpand: 'deals',
    description: (
      <div className="space-y-2 text-xs text-gray-300 leading-relaxed">
        <p>Upload or record conversations.</p>
        <p>Vanta can:</p>
        <ul className="list-disc pl-4 space-y-1 mt-1 text-gray-400">
          <li>Store Notes</li>
          <li>Transcribe Audio</li>
          <li>Organize Seller Conversations</li>
        </ul>
        <p className="mt-2 text-violet-400 font-semibold">Keep all deal communication organized.</p>
      </div>
    )
  },
  {
    stepIndex: 9,
    title: "You're Ready",
    targetId: '',
    groupToExpand: '',
    description: (
      <div className="space-y-3">
        <p className="text-xs text-gray-300 leading-relaxed">
          Congratulations. You've completed the Vanta Product Tour.
        </p>
        <div className="bg-slate-950/80 border border-gray-900 rounded-xl p-4 text-left space-y-2.5">
          <div className="text-[10px] uppercase font-bold text-gray-500">Rewards Earned:</div>
          <div className="text-xs flex items-center gap-2 text-violet-400 font-bold">
            <span>🎓</span>
            <span>+100 XP</span>
          </div>
          <div className="text-xs flex items-center gap-2 text-amber-500 font-bold">
            <span>🧭</span>
            <span>Platform Explorer Badge</span>
          </div>
        </div>
        <div className="text-left space-y-1.5 text-xs text-gray-400 pt-1">
          <span className="font-bold text-white block">Recommended Next Step:</span>
          <div className="flex gap-1.5 items-center">
            <span className="text-violet-450 font-bold">1.</span>
            <span>Complete Learn Hub</span>
          </div>
          <div className="flex gap-1.5 items-center">
            <span className="text-violet-450 font-bold">2.</span>
            <span>Analyze Deals</span>
          </div>
          <div className="flex gap-1.5 items-center">
            <span className="text-violet-450 font-bold">3.</span>
            <span>Track Opportunities</span>
          </div>
          <div className="flex gap-1.5 items-center">
            <span className="text-violet-450 font-bold">4.</span>
            <span>Network in Marketplace</span>
          </div>
        </div>
      </div>
    )
  }
]

export function ProductTour({ userId, isOpen, onClose, onSkip, onExpandSidebar }: ProductTourProps) {
  const supabase = createClient()
  const [currentStep, setCurrentStep] = useState(0)
  const [spotlightStyle, setSpotlightStyle] = useState<React.CSSProperties>({})
  const [cardStyle, setCardStyle] = useState<React.CSSProperties>({})

  useEffect(() => {
    if (!isOpen) return

    const step = STEPS[currentStep]
    const targetId = step.targetId

    if (step.groupToExpand) {
      onExpandSidebar(step.groupToExpand, true)
    }

    if (!targetId) {
      // Step 1 or 9: Full dark overlay, card in center
      setSpotlightStyle({
        background: 'rgba(2, 6, 23, 0.85)'
      })
      setCardStyle({
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
        width: '340px'
      })
      return
    }

    // Wait a brief tick for accordion animations
    const timer = setTimeout(() => {
      const el = document.getElementById(targetId)
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })

        const rect = el.getBoundingClientRect()
        const x = rect.left + rect.width / 2
        const y = rect.top + rect.height / 2
        const radius = Math.max(rect.width, rect.height) / 2 + 10

        setSpotlightStyle({
          background: `radial-gradient(circle ${radius}px at ${x}px ${y}px, transparent 99%, rgba(2, 6, 23, 0.8) 100%)`
        })

        // Position card near highlighted element
        let cardTop = Math.max(20, y - 100)
        let cardLeft = rect.right + 20

        // Handle viewport overflows
        if (window.innerWidth < 768 || rect.width === 0) {
          setSpotlightStyle({
            background: 'rgba(2, 6, 23, 0.85)'
          })
          setCardStyle({
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            width: 'calc(100% - 32px)',
            maxWidth: '365px'
          })
        } else {
          // Keep popover inside the screen
          if (cardLeft + 320 > window.innerWidth) {
            cardLeft = rect.left - 340 // place to the left of the item
          }
          if (cardTop + 250 > window.innerHeight) {
            cardTop = window.innerHeight - 270
          }
          setCardStyle({
            position: 'fixed',
            top: `${cardTop}px`,
            left: `${cardLeft}px`,
            zIndex: 1000,
            width: '320px'
          })
        }
      } else {
        // Fallback if element not found
        setSpotlightStyle({
          background: 'rgba(2, 6, 23, 0.85)'
        })
        setCardStyle({
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          width: '320px'
        })
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [currentStep, isOpen, onExpandSidebar])

  if (!isOpen) return null

  const activeStep = STEPS[currentStep]

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    localStorage.setItem(`vanta_tour_skipped_${userId}`, 'true')
    onSkip()
  }

  const handleFinish = async () => {
    try {
      // Award the platform-explorer badge
      await awardBadge(supabase, userId, 'platform-explorer')
      confetti({ particleCount: 150, spread: 85, origin: { y: 0.6 } })
    } catch (err) {
      console.error('Error completing tour:', err)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[9999] select-none pointer-events-none">
      {/* Dynamic spotlight backdrop mask */}
      <div 
        className="absolute inset-0 transition-all duration-300 ease-in-out pointer-events-auto"
        style={spotlightStyle}
      />

      {/* Floating Description Card */}
      <div 
        className="glass-panel border-gray-900 bg-slate-900/90 rounded-2xl p-5 shadow-2xl flex flex-col justify-between space-y-4 pointer-events-auto transition-all duration-300 ease-in-out"
        style={cardStyle}
      >
        <div className="space-y-3">
          {/* Card Header */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Compass className="w-4 h-4 animate-spin-slow" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-violet-400 tracking-wider">
                  Step {activeStep.stepIndex} of {STEPS.length}
                </span>
                <h3 className="text-sm font-black text-white">{activeStep.title}</h3>
              </div>
            </div>
            {currentStep < STEPS.length - 1 && (
              <button 
                onClick={handleSkip}
                className="text-[10px] text-gray-500 hover:text-white underline font-semibold transition-colors cursor-pointer"
              >
                Skip Tour
              </button>
            )}
          </div>

          <hr className="border-gray-900/50" />

          {/* Step Description Content */}
          <div className="py-1">{activeStep.description}</div>
        </div>

        {/* Card Footer Actions */}
        <div className="flex justify-between items-center gap-3 pt-3 border-t border-gray-900/50">
          {currentStep > 0 && currentStep < STEPS.length - 1 ? (
            <button
              onClick={handlePrev}
              className="px-3.5 py-1.5 bg-slate-950 border border-gray-800 hover:bg-slate-900 text-gray-400 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep === 0 ? (
            <div className="flex gap-2 w-full justify-between items-center">
              <button
                onClick={handleSkip}
                className="text-xs text-gray-500 hover:text-white underline font-semibold cursor-pointer"
              >
                Skip Tour
              </button>
              <button
                onClick={handleNext}
                className="px-5 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-lg text-xs font-black shadow-lg shadow-violet-950/20 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>Start Tour</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : currentStep === STEPS.length - 1 ? (
            <button
              onClick={handleFinish}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-white rounded-lg text-xs font-black shadow-lg shadow-amber-950/25 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Go To Dashboard</span>
              <Trophy className="w-4 h-4 text-white fill-white/10" />
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-black shadow-lg shadow-violet-950/20 transition-all flex items-center gap-1 cursor-pointer ml-auto"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
