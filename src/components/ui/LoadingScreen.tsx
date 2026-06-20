'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Home, BarChart3, FileText, Coins, Send } from 'lucide-react'

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

export function LoadingScreen({
  type = 'default',
  customSteps,
  onComplete,
  durationPerStep = 750 // Time in ms to show each step
}: LoadingScreenProps) {
  const steps = customSteps || STEP_PRESETS[type]
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [progressWidth, setProgressWidth] = useState(0)
  const [animState, setAnimState] = useState(0)

  useEffect(() => {
    const target = ((currentStepIndex + 1) / steps.length) * 100
    const timer = setTimeout(() => {
      setProgressWidth(target)
    }, 50)
    return () => clearTimeout(timer)
  }, [currentStepIndex, steps.length])

  useEffect(() => {
    const stepTimer = setTimeout(() => {
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex(prev => prev + 1)
      } else {
        if (onComplete) {
          onComplete()
        }
      }
    }, durationPerStep)
    return () => clearTimeout(stepTimer)
  }, [currentStepIndex, steps.length, durationPerStep, onComplete])

  useEffect(() => {
    let delay = 1000
    switch (animState) {
      case 0: delay = 1000; break // Lead appears & holds 1.0s
      case 1: delay = 1500; break // Rocket 1 flies 1.5s (Lead slides left)
      case 2: delay = 1000; break // Analysis appears & holds 1.0s
      case 3: delay = 1500; break // Rocket 2 flies 1.5s
      case 4: delay = 1000; break // Contract appears & holds 1.0s
      case 5: delay = 1500; break // Rocket 3 flies 1.5s
      case 6: delay = 1500; break // Closed appears & holds 1.5s
      case 7: delay = 2000; break // Final row holds 2.0s
      case 8: delay = 600; break  // Soft fade out
      default: delay = 1000; break
    }

    if (animState === 7) return // Stop at the final state, do not loop/reset!

    const timer = setTimeout(() => {
      setAnimState(prev => (prev + 1) % 9)
    }, delay)

    return () => clearTimeout(timer)
  }, [animState])

  const getStageCoords = (stage: 'lead' | 'analysis' | 'contract' | 'closed') => {
    if (animState === 8) return { x: 0, scale: 0.8, opacity: 0 }

    switch (stage) {
      case 'lead':
        return { x: -120, scale: 0.9, opacity: 1 }

      case 'analysis':
        if (animState < 2) return { x: -40, scale: 0.8, opacity: 0 }
        return { x: -40, scale: 0.9, opacity: 1 }

      case 'contract':
        if (animState < 4) return { x: 40, scale: 0.8, opacity: 0 }
        return { x: 40, scale: 0.9, opacity: 1 }

      case 'closed':
        if (animState < 6) return { x: 120, scale: 0.8, opacity: 0 }
        return { 
          x: 120, 
          scale: animState === 7 ? 1.05 : 1, 
          opacity: 1,
          filter: animState === 7 ? 'drop-shadow(0 0 8px rgba(52, 211, 153, 0.6))' : 'none'
        }
    }
  }

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
              {/* Render each character individually, converting spaces to non-breaking spaces */}
              {Array.from(currentText).map((char, index) => (
                <motion.span key={index} variants={letterVariants}>
                  {char === ' ' ? '\u00A0' : char}
                </motion.span>
              ))}

              {/* Animating trailing dots */}
              <span className="inline-flex ml-1 text-violet-400">
                <motion.span
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: 0 }}
                >
                  .
                </motion.span>
                <motion.span
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: 0.3 }}
                >
                  .
                </motion.span>
                <motion.span
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: 0.6 }}
                >
                  .
                </motion.span>
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Premium Glassmorphic Progress Bar */}
        <div className="w-72 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10 relative mb-8">
          <div 
            className="h-full bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-400 rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(139,92,246,0.6)]"
            style={{ width: `${progressWidth}%` }}
          />
        </div>

        {/* Custom Vanta Deal Flow Stage Loader Animation */}
        <div className="w-[360px] h-28 relative overflow-visible select-none mt-2">
          {/* SVG Connecting trails and straight connector lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            <defs>
              <filter id="trail-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Connecting line 1 (Lead -> Analysis) */}
            {(animState === 1 || animState >= 2) && (
              <motion.line
                x1="88"
                y1="36"
                x2="112"
                y2="36"
                stroke="rgba(167, 139, 250, 0.3)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: animState === 1 ? 1.5 : 0.5, ease: "linear" }}
              />
            )}

            {/* Connecting line 2 (Analysis -> Contract) */}
            {(animState === 3 || animState >= 4) && (
              <motion.line
                x1="168"
                y1="36"
                x2="192"
                y2="36"
                stroke="rgba(167, 139, 250, 0.3)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: animState === 3 ? 1.5 : 0.5, ease: "linear" }}
              />
            )}

            {/* Connecting line 3 (Contract -> Closed) */}
            {(animState === 5 || animState >= 6) && (
              <motion.line
                x1="248"
                y1="36"
                x2="272"
                y2="36"
                stroke="rgba(167, 139, 250, 0.3)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: animState === 5 ? 1.5 : 0.5, ease: "linear" }}
              />
            )}
          </svg>

          {/* Rockets */}
          {/* Rocket 1 (Lead -> Analysis) */}
          {animState === 1 && (
            <motion.div
              initial={{ x: -120, y: 0, opacity: 0, rotate: -20 }}
              animate={{
                x: [-120, -40],
                y: [0, -30, 0],
                opacity: [0, 1, 1, 0],
                rotate: [-20, 0, 20]
              }}
              transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
              className="absolute left-1/2 top-6 -ml-3 z-20 pointer-events-none w-6 h-6 flex items-center justify-center"
            >
              {/* Sharp inner exhaust trail */}
              <div className="absolute right-full top-1/2 -translate-y-1/2 w-16 h-[2px] bg-gradient-to-l from-cyan-400 via-violet-500 to-transparent opacity-85 blur-[0.5px]" />
              {/* Soft outer bloom trail */}
              <div className="absolute right-full top-1/2 -translate-y-1/2 w-20 h-4 bg-gradient-to-l from-cyan-500/25 via-violet-600/10 to-transparent blur-md rounded-full" />
              {/* Paper Plane rotated to horizontal nose-right */}
              <Send className="w-6 h-6 text-violet-300 filter drop-shadow-[0_0_8px_rgba(167,139,250,0.85)] relative z-10" style={{ transform: 'rotate(45deg)' }} />
            </motion.div>
          )}

          {/* Rocket 2 (Analysis -> Contract) */}
          {animState === 3 && (
            <motion.div
              initial={{ x: -40, y: 0, opacity: 0, rotate: -20 }}
              animate={{
                x: [-40, 40],
                y: [0, -30, 0],
                opacity: [0, 1, 1, 0],
                rotate: [-20, 0, 20]
              }}
              transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
              className="absolute left-1/2 top-6 -ml-3 z-20 pointer-events-none w-6 h-6 flex items-center justify-center"
            >
              {/* Sharp inner exhaust trail */}
              <div className="absolute right-full top-1/2 -translate-y-1/2 w-12 h-[2px] bg-gradient-to-l from-cyan-400 via-violet-500 to-transparent opacity-85 blur-[0.5px]" />
              {/* Soft outer bloom trail */}
              <div className="absolute right-full top-1/2 -translate-y-1/2 w-16 h-4 bg-gradient-to-l from-cyan-500/25 via-violet-600/10 to-transparent blur-md rounded-full" />
              {/* Paper Plane rotated to horizontal nose-right */}
              <Send className="w-6 h-6 text-violet-300 filter drop-shadow-[0_0_8px_rgba(167,139,250,0.85)] relative z-10" style={{ transform: 'rotate(45deg)' }} />
            </motion.div>
          )}

          {/* Rocket 3 (Contract -> Closed) */}
          {animState === 5 && (
            <motion.div
              initial={{ x: 40, y: 0, opacity: 0, rotate: -20 }}
              animate={{
                x: [40, 120],
                y: [0, -30, 0],
                opacity: [0, 1, 1, 0],
                rotate: [-20, 0, 20]
              }}
              transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
              className="absolute left-1/2 top-6 -ml-3 z-20 pointer-events-none w-6 h-6 flex items-center justify-center"
            >
              {/* Sharp inner exhaust trail */}
              <div className="absolute right-full top-1/2 -translate-y-1/2 w-12 h-[2px] bg-gradient-to-l from-cyan-400 via-violet-500 to-transparent opacity-85 blur-[0.5px]" />
              {/* Soft outer bloom trail */}
              <div className="absolute right-full top-1/2 -translate-y-1/2 w-16 h-4 bg-gradient-to-l from-cyan-500/25 via-violet-600/10 to-transparent blur-md rounded-full" />
              {/* Paper Plane rotated to horizontal nose-right */}
              <Send className="w-6 h-6 text-violet-300 filter drop-shadow-[0_0_8px_rgba(167,139,250,0.85)] relative z-10" style={{ transform: 'rotate(45deg)' }} />
            </motion.div>
          )}

          {/* Stage 1: Lead */}
          {animState !== 8 && (
            <motion.div
              animate={getStageCoords('lead')}
              transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
              className="absolute left-1/2 top-2 -ml-7 flex flex-col items-center select-none"
            >
              <div className="w-14 h-14 rounded-full bg-[#0a0f24]/80 border border-violet-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(139,92,246,0.2)] flex items-center justify-center relative">
                <Home className="w-7 h-7 text-violet-400 filter drop-shadow-[0_0_4px_rgba(139,92,246,0.4)]" />
              </div>
              <span className="mt-2 text-[9px] uppercase font-black tracking-widest text-slate-400">
                Lead
              </span>
            </motion.div>
          )}

          {/* Stage 2: Analysis */}
          {animState >= 2 && animState !== 8 && (
            <motion.div
              initial={{ x: -40, scale: 0.8, opacity: 0 }}
              animate={getStageCoords('analysis')}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              className="absolute left-1/2 top-2 -ml-7 flex flex-col items-center select-none"
            >
              <div className="w-14 h-14 rounded-full bg-[#0a0f24]/80 border border-violet-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(139,92,246,0.2)] flex items-center justify-center relative">
                <BarChart3 className="w-7 h-7 text-violet-400 filter drop-shadow-[0_0_4px_rgba(139,92,246,0.4)]" />
              </div>
              <span className="mt-2 text-[9px] uppercase font-black tracking-widest text-slate-400">
                Analysis
              </span>
            </motion.div>
          )}

          {/* Stage 3: Contract */}
          {animState >= 4 && animState !== 8 && (
            <motion.div
              initial={{ x: 40, scale: 0.8, opacity: 0 }}
              animate={getStageCoords('contract')}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              className="absolute left-1/2 top-2 -ml-7 flex flex-col items-center select-none"
            >
              <div className="w-14 h-14 rounded-full bg-[#0a0f24]/80 border border-violet-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(139,92,246,0.2)] flex items-center justify-center relative">
                <FileText className="w-7 h-7 text-violet-400 filter drop-shadow-[0_0_4px_rgba(139,92,246,0.4)]" />
              </div>
              <span className="mt-2 text-[9px] uppercase font-black tracking-widest text-slate-400">
                Contract
              </span>
            </motion.div>
          )}

          {/* Stage 4: Closed */}
          {animState >= 6 && animState !== 8 && (
            <motion.div
              initial={{ x: 120, scale: 0.8, opacity: 0 }}
              animate={getStageCoords('closed')}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              className="absolute left-1/2 top-2 -ml-7 flex flex-col items-center select-none"
            >
              <div className="w-14 h-14 rounded-full bg-[#0a0f24]/80 border border-violet-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(139,92,246,0.2)] flex items-center justify-center relative transition-shadow duration-300">
                <Coins className="w-7 h-7 text-emerald-400 filter drop-shadow-[0_0_4px_rgba(52,211,153,0.4)]" />
              </div>
              <span className="mt-2 text-[9px] uppercase font-black tracking-widest text-slate-400">
                Closed
              </span>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
