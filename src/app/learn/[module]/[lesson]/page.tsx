'use client'

import React, { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import SidebarLayout from '@/components/dashboard/SidebarLayout'
import { createClient } from '@/lib/supabase/client'
import { 
  BookOpen, 
  Check, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  HelpCircle,
  X,
  Crown
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { type Lesson, type UserLesson } from '@/types/database'
import { awardXp, awardBadge, updateStreak } from '@/lib/gamification'
import Link from 'next/link'

interface LessonPlayerProps {
  params: Promise<{
    module: string
    lesson: string
  }>
}

export default function LessonPlayerPage({ params }: LessonPlayerProps) {
  const router = useRouter()
  const supabase = createClient()
  
  // Unwrap promise parameters
  const resolvedParams = use(params)
  const moduleParam = resolvedParams.module
  const lessonParam = resolvedParams.lesson

  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [userLessons, setUserLessons] = useState<UserLesson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Lesson player state
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0) // 0 to slides.length-1 for slides, slides.length for quiz
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [quizChecked, setQuizChecked] = useState(false)
  const [quizCorrect, setQuizCorrect] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // 1. Fetch Profile
        const { data: p } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        // 2. Fetch all completed user lessons to verify linear unlock sequence
        const { data: uLes } = await supabase
          .from('user_lessons')
          .select('*')
          .eq('user_id', user.id)
        
        if (active) setUserLessons(uLes || [])

        // 3. Fetch specific lesson
        const { data: les, error: lesErr } = await supabase
          .from('lessons')
          .select('*')
          .eq('category', moduleParam)
          .eq('id', lessonParam)
          .single()

        if (lesErr || !les) {
          if (active) {
            setError('Lesson not found. It may have been renamed or deleted.')
            setLoading(false)
          }
          return
        }

        // Fetch subscription status
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single()

        const isSubscribed = !!sub || p?.subscription_status === 'active'

        const isPremiumModule = ['module-5', 'module-6', 'module-7', 'module-8'].includes(moduleParam) || ['module-5', 'module-6', 'module-7', 'module-8'].includes(les.category)

        if (isPremiumModule && !isSubscribed) {
          if (active) {
            setError('Premium Gated: This lesson is available to Premium members only. Please upgrade to unlock the full curriculum.')
            setLoading(false)
          }
          return
        }

        if (active) {
          setLesson(les)
        }

        // 4. Double check if lesson is unlocked
        // Query all lessons sorted to get linear order
        const { data: allLessons } = await supabase
          .from('lessons')
          .select('id')
          .order('order_index', { ascending: true })

        if (allLessons && active) {
          const targetIndex = allLessons.findIndex(l => l.id === les.id)
          if (targetIndex > 0) {
            const prevLesson = allLessons[targetIndex - 1]
            const prevCompleted = (uLes || []).some(ul => ul.lesson_id === prevLesson.id)
            if (!prevCompleted) {
              setError('This lesson is locked. You must complete previous lessons first.')
            }
          }
        }

        if (active) setLoading(false)
      } catch (err) {
        console.error('Error loading lesson player data:', err)
        if (active) {
          setError('Failed to load lesson database records.')
          setLoading(false)
        }
      }
    }

    init()
    return () => {
      active = false
    }
  }, [supabase, moduleParam, lessonParam, router])

  const handleNextSlide = () => {
    if (!lesson) return
    const totalSlides = lesson.content.slides.length
    if (currentSlideIdx < totalSlides) {
      setCurrentSlideIdx(currentSlideIdx + 1)
    }
  }

  const handlePrevSlide = () => {
    if (currentSlideIdx > 0) {
      setCurrentSlideIdx(currentSlideIdx - 1)
    }
  }

  const handleCheckAnswer = () => {
    if (selectedOption === null || !lesson) return
    const isCorrect = selectedOption === lesson.content.quiz.answer
    setQuizCorrect(isCorrect)
    setQuizChecked(true)

    if (isCorrect) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      })
    }
  }

  const handleFinishLesson = async () => {
    if (submitting || !lesson) return
    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Record completed lesson in database
      const { error: completeErr } = await supabase
        .from('user_lessons')
        .insert({
          user_id: user.id,
          lesson_id: lesson.id,
          completed_at: new Date().toISOString(),
          score: quizCorrect ? 100 : 0
        })

      if (completeErr && !completeErr.message.includes('duplicate')) {
        throw completeErr
      }

      // 2. Award dynamic XP (50 XP)
      await awardXp(supabase, user.id, lesson.xp_reward || 50, `Completed Unit: ${lesson.title}`)

      // 3. Award Badge check (if first lesson completed)
      const isFirstLesson = userLessons.length === 0
      if (isFirstLesson) {
        await awardBadge(supabase, user.id, 'first-step')
      }

      // 4. Update daily streak
      await updateStreak(supabase, user.id, 'lesson')

      // Redirect back to main Learn Hub landing
      router.push('/learn')
    } catch (err) {
      console.error('Error completing lesson:', err)
      setError('An error occurred while saving your progress.')
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex flex-col items-center justify-center p-12 min-h-[50vh]">
          <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-4" />
          <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">Syncing curriculum segment...</p>
        </div>
      </SidebarLayout>
    )
  }

  if (error || !lesson) {
    const isPremiumGateError = error?.startsWith('Premium Gated:')
    return (
      <SidebarLayout>
        <div className="max-w-md mx-auto my-12 p-8 glass-panel rounded-2xl border border-violet-500/20 text-center space-y-6">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
            isPremiumGateError 
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-500' 
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}>
            {isPremiumGateError ? (
              <Crown className="w-8 h-8 fill-amber-500/15" />
            ) : (
              <X className="w-8 h-8" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-black text-white">
              {isPremiumGateError ? 'Premium Lesson' : 'Access Denied'}
            </h2>
            <p className="text-xs text-gray-405 mt-2 leading-relaxed">
              {error || 'The requested lesson could not be loaded.'}
            </p>
          </div>
          {isPremiumGateError ? (
            <Link
              href="/pricing"
              className="inline-block bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-white text-xs font-black py-2.5 px-6 rounded-lg transition-all"
            >
              Upgrade to Premium
            </Link>
          ) : (
            <Link
              href="/learn"
              className="inline-block bg-slate-900 hover:bg-slate-850 border border-gray-800 text-white text-xs font-bold py-2.5 px-6 rounded-lg transition-all"
            >
              Return to Learn Hub
            </Link>
          )}
        </div>
      </SidebarLayout>
    )
  }


  const slides = lesson.content.slides
  const isQuizSlide = currentSlideIdx === slides.length
  const totalSteps = slides.length + 1 // slides + quiz

  return (
    <SidebarLayout>
      <div className="max-w-2xl mx-auto py-6 space-y-6">
        {/* Back Link and Header */}
        <div className="flex items-center justify-between border-b border-gray-900 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/learn"
              className="p-2 rounded-lg bg-slate-900 border border-gray-800 text-gray-400 hover:text-white transition-all"
              title="Return to Learn Hub"
            >
              <X className="w-4 h-4" />
            </Link>
            <div>
              <div className="text-[10px] font-black uppercase text-violet-400 tracking-wider">
                {moduleParam.replace('-', ' ')}
              </div>
              <h1 className="text-sm font-bold text-white leading-tight">
                {lesson.title}
              </h1>
            </div>
          </div>
          <div className="text-xs text-gray-500 font-bold">
            Step {currentSlideIdx + 1} of {totalSteps}
          </div>
        </div>

        {/* Lesson Card */}
        <div className="glass-panel border border-gray-800 rounded-2xl p-6 md:p-8 min-h-[400px] flex flex-col justify-between relative overflow-hidden shadow-2xl shadow-black/40">
          {/* Top visual progress bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900">
            <div 
              className="h-full bg-gradient-to-r from-violet-600 to-purple-600 transition-all duration-300"
              style={{ width: `${((currentSlideIdx + 1) / totalSteps) * 100}%` }}
            />
          </div>

          {/* Dynamic Content */}
          <div className="flex-1 flex flex-col justify-center py-6">
            {!isQuizSlide ? (
              /* Information Slides */
              <div className="space-y-4 animate-fade-in">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] font-bold text-violet-400 uppercase tracking-wider">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Concept slide {currentSlideIdx + 1}</span>
                </div>
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight">
                  {slides[currentSlideIdx].title}
                </h2>
                <p className="text-sm text-gray-300 leading-relaxed font-medium pt-2 whitespace-pre-line">
                  {slides[currentSlideIdx].text}
                </p>
              </div>
            ) : (
              /* Quiz Slide */
              <div className="space-y-6 animate-fade-in">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Knowledge Check</span>
                </div>
                
                <h2 className="text-base md:text-lg font-extrabold text-white leading-relaxed">
                  {lesson.content.quiz.question}
                </h2>

                <div className="space-y-3 pt-2">
                  {lesson.content.quiz.options.map((opt: string, optIdx: number) => (
                    <button
                      key={optIdx}
                      type="button"
                      disabled={quizChecked}
                      onClick={() => setSelectedOption(optIdx)}
                      className={`w-full text-left p-4 rounded-xl border text-xs font-semibold leading-relaxed transition-all cursor-pointer ${
                        selectedOption === optIdx
                          ? 'border-violet-500 bg-violet-600/10 text-white shadow-lg shadow-violet-950/20'
                          : 'border-gray-800 bg-slate-900/40 text-gray-400 hover:border-gray-700 hover:text-white hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                          selectedOption === optIdx ? 'bg-violet-600 text-white' : 'bg-slate-800 text-gray-500'
                        }`}>
                          {optIdx + 1}
                        </span>
                        <span>{opt}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Result Box */}
                {quizChecked && (
                  <div className={`p-4 rounded-xl border text-xs flex gap-3 items-start animate-fade-in ${
                    quizCorrect 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}>
                    <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                      quizCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {quizCorrect ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm">{quizCorrect ? 'Brilliant, Correct!' : 'Incorrect Answer'}</h4>
                      <p className="text-xs mt-1 leading-relaxed opacity-90">
                        {quizCorrect 
                          ? 'Perfect! You are ready to complete this unit and claim your +50 XP reward.' 
                          : "That is not quite right. Select a different option and check your answer again."
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation Action Buttons */}
          <div className="flex justify-between items-center pt-5 border-t border-gray-900 mt-4">
            <button
              type="button"
              disabled={currentSlideIdx === 0}
              onClick={handlePrevSlide}
              className="bg-slate-900 hover:bg-slate-850 border border-gray-800 text-gray-400 hover:text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            {!isQuizSlide ? (
              <button
                type="button"
                onClick={handleNextSlide}
                className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold py-2 px-5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-violet-950/30"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : !quizChecked ? (
              <button
                type="button"
                disabled={selectedOption === null}
                onClick={handleCheckAnswer}
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold py-2 px-5 rounded-xl shadow-lg shadow-violet-950/35 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Submit Answer
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting || !quizCorrect}
                onClick={handleFinishLesson}
                className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black py-2 px-5 rounded-xl shadow-lg shadow-emerald-950/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-2"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Finish & Claim +50 XP</span>
                    <Sparkles className="w-4 h-4 fill-white/10" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </SidebarLayout>
  )
}
