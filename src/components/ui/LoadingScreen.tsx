'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export type LoadingType = 'dashboard' | 'calculators' | 'deals' | 'progression' | 'chat' | 'billing' | 'default'

interface LoadingScreenProps {
  type?: LoadingType
  customSteps?: string[]
  onComplete?: () => void
  durationPerStep?: number // in ms
}

const STEP_PRESETS: Record<LoadingType, string[]> = {
  dashboard: [
    'Preparing dashboard',
    'Loading achievements',
    'Syncing deal intelligence',
    'Initializing workspace'
  ],
  calculators: [
    'Loading calculator engines',
    'Parsing property metrics',
    'Running financial simulations',
    'Calibrating cash flow projections'
  ],
  deals: [
    'Analyzing deal parameters',
    'Scanning local markets',
    'Simulating cash flow scenarios',
    'Computing risk-adjusted yields'
  ],
  progression: [
    'Fetching user activities',
    'Calculating streak multiplier',
    'Syncing XP records',
    'Updating progression ledger'
  ],
  chat: [
    'Connecting to Vanta AI',
    'Processing semantic context',
    'Analyzing market intent',
    'Synthesizing intelligence response'
  ],
  billing: [
    'Establishing secure gateway',
    'Synchronizing credit ledger',
    'Verifying transaction signature',
    'Updating credit balance'
  ],
  default: [
    'Loading workspace resources',
    'Establishing secure connection',
    'Syncing database changes',
    'Readying user interface'
  ]
}

// Simulated console operations to display below the progress bar
const CONSOLE_LOGS_POOL = [
  'SYS: initializing core kernel...',
  'DB: connecting to postgres-db.supabase.co...',
  'DB: connection established successfully.',
  'AUTH: parsing local storage token...',
  'AUTH: credentials validated via jwt token.',
  'API: fetching profile data structure...',
  'GAMIFY: checking active streak triggers...',
  'GAMIFY: calculating current rank multipliers...',
  'SYNC: merging transaction ledger...',
  'SYNC: verifying Whop membership status...',
  'INTELLIGENCE: caching model weights locally...',
  'INTELLIGENCE: scanning recent market deals...',
  'WS: opening socket wss://api.vantahq.pro/feed...',
  'WS: streaming updates active.',
  'SYS: garbage collection completed.',
  'SYS: local workspace cached and active.'
]

export function LoadingScreen({
  type = 'default',
  customSteps,
  onComplete,
  durationPerStep = 750 // Time in ms to show each step
}: LoadingScreenProps) {
  const steps = customSteps || STEP_PRESETS[type]
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [animationPhase, setAnimationPhase] = useState<'typing' | 'waiting'>('typing')
  const [consoleLogs, setConsoleLogs] = useState<string[]>([])
  
  // Progress percentage
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  // Handle step cycling
  useEffect(() => {
    setAnimationPhase('typing')
    
    // Timeout to transition to "waiting" (where dots animate)
    const typingDuration = 350 // Approximate duration of the typing animation
    const typingTimer = setTimeout(() => {
      setAnimationPhase('waiting')
    }, typingDuration)

    // Timeout to transition to the next step
    const stepTimer = setTimeout(() => {
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex(prev => prev + 1)
      } else {
        // Complete
        if (onComplete) {
          onComplete()
        }
      }
    }, durationPerStep)

    return () => {
      clearTimeout(typingTimer)
      clearTimeout(stepTimer)
    }
  }, [currentStepIndex, steps.length, durationPerStep, onComplete])

  // Cycle simulated console logs rapidly in the background
  useEffect(() => {
    const logInterval = setInterval(() => {
      const randomLog = CONSOLE_LOGS_POOL[Math.floor(Math.random() * CONSOLE_LOGS_POOL.length)]
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, fractionSecondDigits: 3 } as any)
      setConsoleLogs(prev => [`[${timestamp}] ${randomLog}`, ...prev.slice(0, 3)])
    }, 250)

    return () => clearInterval(logInterval)
  }, [])

  const currentText = steps[currentStepIndex]

  // Framer-motion variants for the letter animation
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.02
      }
    }
  }

  const letterVariants = {
    hidden: { opacity: 0, y: 5 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        damping: 12,
        stiffness: 150
      }
    }
  }

  return (
    <div className="fixed inset-0 min-h-screen bg-[#050816] flex flex-col items-center justify-center z-[9999] overflow-hidden select-none">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />
      
      {/* Glowing Grid Background Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Main Center Container */}
      <div className="relative z-10 flex flex-col items-center max-w-md w-full px-6">
        
        {/* Futuristic Glowing Loader Ring & Orb */}
        <div className="relative w-24 h-24 mb-10 flex items-center justify-center">
          {/* Pulsing Backlight */}
          <div className="absolute inset-0 bg-gradient-to-tr from-violet-600 to-cyan-500 rounded-full blur-xl opacity-30 animate-pulse" />
          
          {/* Rotating Outer Ring (Clockwise) */}
          <motion.div 
            className="absolute inset-0 border-2 border-transparent border-t-violet-500 border-r-violet-500/40 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          />

          {/* Rotating Inner Ring (Counter-Clockwise) */}
          <motion.div 
            className="absolute inset-2 border border-dashed border-transparent border-b-cyan-400 border-l-cyan-400/40 rounded-full"
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          />

          {/* Central Pulsing Glowing Orb containing a mini-Vanta 'V' Logo */}
          <motion.div 
            className="absolute inset-5 bg-slate-900 border border-white/10 rounded-full flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.1)]"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          >
            <svg className="w-6 h-6 text-violet-400 filter drop-shadow-[0_0_8px_rgba(139,92,246,0.8)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4.5L12 20L20 4.5" />
            </svg>
          </motion.div>
        </div>

        {/* Dynamic Loading Text with Letter-by-Letter reveal */}
        <div className="h-8 mb-4 flex items-center justify-center gap-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStepIndex}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center text-lg md:text-xl font-medium text-white tracking-wide font-sans"
            >
              {/* Render each character individually */}
              {Array.from(currentText).map((char, index) => (
                <motion.span key={index} variants={letterVariants}>
                  {char}
                </motion.span>
              ))}

              {/* Animating trailing dots */}
              <span className="inline-flex ml-1 w-6 items-center">
                {animationPhase === 'waiting' ? (
                  <>
                    <motion.span
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ repeat: Infinity, duration: 0.9, delay: 0 }}
                      className="text-violet-400"
                    >
                      .
                    </motion.span>
                    <motion.span
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ repeat: Infinity, duration: 0.9, delay: 0.3 }}
                      className="text-violet-400"
                    >
                      .
                    </motion.span>
                    <motion.span
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ repeat: Infinity, duration: 0.9, delay: 0.6 }}
                      className="text-violet-400"
                    >
                      .
                    </motion.span>
                  </>
                ) : (
                  <span className="opacity-0">...</span>
                )}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Premium Glassmorphic Progress Bar */}
        <div className="w-72 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10 relative mb-8">
          <div 
            className="h-full bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400 rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(139,92,246,0.6)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Background Console Operations Feed (Monospace, premium look) */}
        <div className="w-full bg-black/40 border border-white/5 rounded-lg p-3 font-mono text-[10px] text-gray-500 h-24 overflow-hidden flex flex-col justify-start gap-1">
          <div className="text-gray-600 text-[9px] uppercase tracking-wider font-bold mb-1 border-b border-white/5 pb-1">
            System Console Feed
          </div>
          <AnimatePresence>
            {consoleLogs.map((log, i) => (
              <motion.div
                key={log}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1 - i * 0.25, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="truncate text-violet-300/70"
              >
                {log}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
