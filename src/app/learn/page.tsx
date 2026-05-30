'use client'

import React, { useState, useEffect } from 'react'
import SidebarLayout from '@/components/dashboard/SidebarLayout'
import { createClient } from '@/lib/supabase/client'
import { 
  Trophy, 
  BookOpen, 
  Lock, 
  Check, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Flame, 
  Award,
  AlertCircle,
  HelpCircle
} from 'lucide-react'
import confetti from 'canvas-confetti'

export default function LearnHubPage() {
  const supabase = createClient()
  const [lessons, setLessons] = useState<any[]>([])
  const [userLessons, setUserLessons] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Lesson modal state
  const [activeLesson, setActiveLesson] = useState<any>(null)
  const [currentSlideIdx, setCurrentSlideIdx] = useState(0) // slides index + 1 for quiz
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [quizChecked, setQuizChecked] = useState(false)
  const [quizCorrect, setQuizCorrect] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Load Profile
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(p)

    // 2. Load Lessons sorted by order_index
    const { data: les } = await supabase
      .from('lessons')
      .select('*')
      .order('order_index', { ascending: true })
    setLessons(les || [])

    // 3. Load Completed User Lessons
    const { data: uLes } = await supabase
      .from('user_lessons')
      .select('*')
      .eq('user_id', user.id)
    setUserLessons(uLes || [])

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [supabase])

  const handleStartLesson = (lesson: any) => {
    setActiveLesson(lesson)
    setCurrentSlideIdx(0)
    setSelectedOption(null)
    setQuizChecked(false)
    setQuizCorrect(false)
  }

  const handleNextSlide = () => {
    const totalSlides = activeLesson.content.slides.length
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
    if (selectedOption === null) return
    const isCorrect = selectedOption === activeLesson.content.quiz.answer
    setQuizCorrect(isCorrect)
    setQuizChecked(true)

    if (isCorrect) {
      confetti({ particleCount: 80, spread: 60 })
    }
  }

  const handleFinishLesson = async () => {
    if (submitting) return
    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. Record completed lesson in database
      const { error: completeErr } = await supabase
        .from('user_lessons')
        .insert({
          user_id: user.id,
          lesson_id: activeLesson.id,
          completed_at: new Date().toISOString(),
          score: quizCorrect ? 100 : 0
        })

      if (completeErr) {
        if (!completeErr.message.includes('duplicate')) {
          throw completeErr
        }
      }

      // 2. Calculate daily streak and update profiles table
      const todayStr = new Date().toISOString().split('T')[0]
      let newStreak = profile?.streak_count || 0
      
      if (profile?.last_active_date) {
        const lastActive = new Date(profile.last_active_date)
        const today = new Date(todayStr)
        const diffTime = Math.abs(today.getTime() - lastActive.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays === 1) {
          // Increment streak
          newStreak += 1
        } else if (diffDays > 1) {
          // Streak reset to 1 (re-started today)
          newStreak = 1
        }
      } else {
        newStreak = 1
      }

      // Update XP (+100 XP) and streak details in profile
      const newXp = (profile?.xp || 0) + activeLesson.xp_reward
      await supabase
        .from('profiles')
        .update({
          xp: newXp,
          streak_count: newStreak,
          last_active_date: todayStr
        })
        .eq('id', user.id)

      // 3. Award 'first-step' badge if it is their first completed lesson
      const isFirstLesson = userLessons.length === 0
      if (isFirstLesson) {
        await supabase.from('user_badges').insert({
          user_id: user.id,
          badge_id: 'first-step',
          earned_at: new Date().toISOString()
        })
      }

      // 4. Check if they earned a 7-day streak badge
      if (newStreak >= 7) {
        await supabase.from('user_badges').insert({
          user_id: user.id,
          badge_id: 'hot-streak',
          earned_at: new Date().toISOString()
        })
      }

      // Refresh state & Close
      await loadData()
      setActiveLesson(null)
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex flex-col items-center justify-center p-12">
          <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-4" />
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Syncing path progress...</p>
        </div>
      </SidebarLayout>
    )
  }

  // Linear progression checks: a lesson is unlocked if it's the first lesson or the previous lesson is completed.
  const isLessonUnlocked = (index: number) => {
    if (index === 0) return true
    const prevLesson = lessons[index - 1]
    return userLessons.some(ul => ul.lesson_id === prevLesson.id)
  }

  return (
    <SidebarLayout>
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Hub Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-900 pb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white mb-1 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-violet-400" />
              <span>Learn Pathway</span>
            </h1>
            <p className="text-xs text-gray-400">
              Duolingo-style milestones. Each lesson completed grants <span className="text-violet-400 font-bold">+100 XP 🎓</span> and maintains streaks.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-gray-800 text-xs font-bold">
            <Flame className="w-4 h-4 text-orange-400 fill-orange-400" />
            <span>Streak: <span className="text-orange-400">{profile?.streak_count || 0}</span> Days</span>
          </div>
        </div>

        {/* Winding Vertical Pathway (Stepping Stones) */}
        <div className="relative flex flex-col items-center py-10 max-w-md mx-auto">
          {/* Connector Winding Line */}
          <div className="absolute top-10 bottom-10 w-1 bg-gradient-to-b from-violet-600 via-purple-600 to-emerald-500/20 rounded-full z-0" />

          <div className="space-y-16 w-full relative z-10">
            {lessons.map((lesson, idx) => {
              const completed = userLessons.some(ul => ul.lesson_id === lesson.id)
              const unlocked = isLessonUnlocked(idx)
              
              // Winding alternating offsets for Duolingo layout feel
              const alignClass = idx % 2 === 0 ? '-translate-x-10 md:-translate-x-16' : 'translate-x-10 md:translate-x-16'

              return (
                <div key={lesson.id} className="flex flex-col items-center">
                  <div className={`transform ${alignClass} flex flex-col items-center`}>
                    <button
                      disabled={!unlocked}
                      onClick={() => handleStartLesson(lesson)}
                      className={`w-16 h-16 rounded-full border-4 flex items-center justify-center transition-all relative cursor-pointer ${
                        completed
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-950/20 hover:scale-105'
                          : unlocked
                            ? 'bg-violet-600/10 border-violet-500 text-violet-400 shadow-lg shadow-violet-950/30 hover:scale-105 animate-pulse'
                            : 'bg-slate-900 border-gray-900 text-gray-700 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      {completed ? (
                        <Check className="w-7 h-7 stroke-[3]" />
                      ) : unlocked ? (
                        <BookOpen className="w-6 h-6" />
                      ) : (
                        <Lock className="w-5 h-5" />
                      )}
                      
                      {/* Active Bounce Pointer */}
                      {unlocked && !completed && (
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-violet-500"></span>
                        </span>
                      )}
                    </button>

                    {/* Lesson Label */}
                    <div className="text-center mt-3 max-w-[140px]">
                      <div className={`text-[10px] font-black uppercase tracking-wider ${
                        unlocked ? 'text-gray-300' : 'text-gray-600'
                      }`}>
                        Unit {idx + 1}
                      </div>
                      <div className={`text-xs font-bold leading-tight mt-0.5 truncate ${
                        completed ? 'text-emerald-400' : unlocked ? 'text-white' : 'text-gray-600'
                      }`}>
                        {lesson.title}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Modal: Interactive Lesson Overlay */}
        {activeLesson && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              onClick={() => setActiveLesson(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />

            <div className="relative glass-panel rounded-2xl border border-gray-800 w-full max-w-lg p-6 min-h-[420px] flex flex-col justify-between z-10">
              {/* Header Details */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[9px] uppercase font-black text-violet-400 tracking-wider">
                    {activeLesson.title}
                  </span>
                  <span className="text-xs text-gray-500 font-bold">
                    {currentSlideIdx + 1} / {activeLesson.content.slides.length + 1}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden mb-6">
                  <div 
                    className="h-full bg-violet-500 transition-all duration-300"
                    style={{ 
                      width: `${((currentSlideIdx + 1) / (activeLesson.content.slides.length + 1)) * 100}%` 
                    }}
                  />
                </div>
              </div>

              {/* Dynamic Slide Content */}
              <div className="flex-1 flex flex-col justify-center py-4">
                {currentSlideIdx < activeLesson.content.slides.length ? (
                  // Information Slides
                  <div className="space-y-4 animate-fade-in">
                    <h3 className="text-base font-extrabold text-white">
                      {activeLesson.content.slides[currentSlideIdx].title}
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed font-medium">
                      {activeLesson.content.slides[currentSlideIdx].text}
                    </p>
                  </div>
                ) : (
                  // Final Quiz Slide
                  <div className="space-y-5 animate-fade-in">
                    <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold">
                      <HelpCircle className="w-4 h-4" />
                      <span>Knowledge Check Quiz</span>
                    </div>
                    
                    <h3 className="text-sm font-extrabold text-white leading-relaxed">
                      {activeLesson.content.quiz.question}
                    </h3>

                    <div className="space-y-2">
                      {activeLesson.content.quiz.options.map((opt: string, optIdx: number) => (
                        <button
                          key={optIdx}
                          type="button"
                          disabled={quizChecked}
                          onClick={() => setSelectedOption(optIdx)}
                          className={`w-full text-left p-3 rounded-lg border text-xs font-semibold leading-relaxed transition-all cursor-pointer ${
                            selectedOption === optIdx
                              ? 'border-violet-500 bg-violet-500/5 text-white'
                              : 'border-gray-800 bg-slate-900/40 text-gray-400 hover:border-gray-700 hover:text-white'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>

                    {/* Result Box */}
                    {quizChecked && (
                      <div className={`p-3 rounded-lg border text-xs flex gap-2 items-start ${
                        quizCorrect 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                          : 'bg-red-500/10 border-red-500/20 text-red-400'
                      }`}>
                        <Award className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-bold">{quizCorrect ? 'Correct Answer!' : 'Incorrect'}</h4>
                          <p className="text-[10px] mt-0.5 opacity-90">
                            {quizCorrect 
                              ? 'Superb! You gained +100 XP and unlocked the milestone.' 
                              : "Don't worry, try another option or read the slides again."
                            }
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Navigation Actions Footer */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-900/60 mt-6">
                <button
                  type="button"
                  disabled={currentSlideIdx === 0}
                  onClick={handlePrevSlide}
                  className="bg-slate-900 hover:bg-slate-800 border border-gray-800 text-gray-400 hover:text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Prev</span>
                </button>

                {currentSlideIdx < activeLesson.content.slides.length ? (
                  <button
                    type="button"
                    onClick={handleNextSlide}
                    className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold py-1.5 px-4 rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : !quizChecked ? (
                  <button
                    type="button"
                    disabled={selectedOption === null}
                    onClick={handleCheckAnswer}
                    className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold py-1.5 px-4 rounded-lg shadow disabled:opacity-40 cursor-pointer"
                  >
                    Check Answer
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting || !quizCorrect}
                    onClick={handleFinishLesson}
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black py-1.5 px-4 rounded-lg shadow disabled:opacity-40 cursor-pointer flex items-center gap-1"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Finish & Claim XP</span>
                        <Sparkles className="w-4 h-4 fill-white/10" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  )
}
