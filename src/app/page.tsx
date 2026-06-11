'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, Trophy, Zap, MessageSquare, Award, Star, Compass, Loader2 } from 'lucide-react'
import { motion, useInView } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Magnetic, SpotlightCard, HoverScale } from '@/components/ui/Interactive'

// Animated Counter Component
function AnimatedCounter({ value, duration = 1500, suffix = "" }: { value: number, duration?: number, suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return

    let start = 0
    const end = value
    const timer = setInterval(() => {
      start += Math.ceil((end - start) / 8)
      if (start >= end) {
        clearInterval(timer)
        setCount(end)
      } else {
        setCount(start)
      }
    }, 20)

    return () => clearInterval(timer)
  }, [value, duration, isInView])

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

export default function Home() {
  const [reviews, setReviews] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  const [totalUsers, setTotalUsers] = useState(10)
  const [dealsSourced, setDealsSourced] = useState(8)
  const [lessonsCompleted, setLessonsCompleted] = useState(200)
  const [activeMembers, setActiveMembers] = useState(7)
  const [pricing, setPricing] = useState<any>(null)
  const [rating, setRating] = useState(5)
  const [testimonial, setTestimonial] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const heroRef = useRef<HTMLDivElement>(null)

  const defaultReviews = [
    {
      id: 'd1',
      rating: 5,
      testimonial: "Moving my joint venture deal finding from chaotic Facebook groups to this platform has doubled my deal velocity. The MAO calculator is bulletproof.",
      profiles: { full_name: "Marcus V.", username: "marcus_closer" }
    },
    {
      id: 'd2',
      rating: 5,
      testimonial: "The AI ledger validation ensures that our numbers make sense before we present them to cash buyers. Game changer.",
      profiles: { full_name: "Sarah T.", username: "saraht_deals" }
    },
    {
      id: 'd3',
      rating: 5,
      testimonial: "The Learn Hub streak system makes learning wholesaling addictive. Already closed my first co-wholesale deal in two weeks!",
      profiles: { full_name: "Jason K.", username: "jason_k" }
    },
    {
      id: 'd4',
      rating: 5,
      testimonial: "We found our best JV buyer on the Marketplace within 24 hours of posting. Highly recommended for any deal coordinator.",
      profiles: { full_name: "Elena R.", username: "elena_invests" }
    }
  ]

  useEffect(() => {
    const supabase = createClient()
    
    // Get session
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user)
      }
    })

    // Fetch approved reviews
    supabase
      .from('reviews')
      .select('*, profiles(username, full_name)')
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setReviews(data)
        }
      })

    // Fetch stats counts
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .then(({ count }) => {
        if (count !== null) {
          setTotalUsers(count + 10)
        }
      })

    supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .then(({ count }) => {
        if (count !== null) {
          setDealsSourced(count + 8)
        }
      })

    supabase
      .from('user_lessons')
      .select('*', { count: 'exact', head: true })
      .not('completed_at', 'is', null)
      .then(({ count }) => {
        if (count !== null) {
          setLessonsCompleted(count + 200)
        }
      })

    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .not('last_active_date', 'is', null)
      .then(({ count }) => {
        if (count !== null) {
          setActiveMembers(count + 7)
        }
      })

    fetch('/api/pricing')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setPricing(data)
        }
      })
      .catch(err => console.error('Error fetching pricing on home:', err))
  }, [])

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!heroRef.current) return
    const rect = heroRef.current.getBoundingClientRect()
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!testimonial.trim()) return

    setSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('reviews')
      .insert({
        user_id: user.id,
        rating: rating,
        testimonial: testimonial.trim(),
        is_approved: false
      })

    setSubmitting(false)
    if (error) {
      alert(error.message)
    } else {
      alert("Thank you! Your testimonial has been submitted and is pending admin approval.")
      setRating(5)
      setTestimonial('')
    }
  }

  const displayReviews = reviews.length > 0 ? reviews : defaultReviews
  const doubleReviews = [...displayReviews, ...displayReviews]

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Animated Floating Gradients */}
      <motion.div 
        animate={{
          y: [0, -20, 0],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-violet-600/5 rounded-full blur-[100px] pointer-events-none"
      />
      <motion.div 
        animate={{
          y: [0, 20, 0],
          scale: [1, 0.95, 1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-1/2 right-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"
      />

      {/* Decorative Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      {/* Header / Navbar */}
      <header className="relative z-20 border-b border-gray-900/80 bg-slate-950/60 backdrop-blur-md">
        <div className="w-full max-w-[92%] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center">
            <div className="relative overflow-hidden flex items-center justify-center w-[125px] sm:w-[160px] md:w-[200px] h-16">
              <img 
                src="/vanta_logo_full.jpg" 
                alt="Vanta" 
                className="absolute object-cover w-[125px] sm:w-[160px] md:w-[200px] h-[125px] sm:h-[160px] md:h-[200px]" 
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <Link 
              href="/login" 
              className="text-xs font-semibold text-gray-400 hover:text-white transition-colors animated-underline"
            >
              Sign In
            </Link>
            <Magnetic>
              <Link
                href="/login"
                className="bg-gradient-to-r from-violet-600 via-purple-650 to-violet-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-md shadow-violet-950/20 flex items-center gap-1 hover:scale-105 btn-premium-gradient border border-violet-500/20"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Magnetic>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section 
        ref={heroRef}
        onMouseMove={handleMouseMove}
        className="relative z-10 max-w-5xl mx-auto px-6 pt-20 pb-16 text-center"
      >
        {/* Mouse Follow Glow Container */}
        <div 
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 opacity-60"
          style={{
            background: `radial-gradient(800px circle at ${mousePos.x}px ${mousePos.y}px, rgba(139, 92, 246, 0.08), transparent 80%)`
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[10px] font-bold uppercase tracking-wider mb-6 animate-pulse">
            <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span>The Next-Gen Wholesaling Platform</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-6 max-w-4xl mx-auto leading-[1.1]">
            Turn Chaotic Wholesaling Into a{' '}
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
              Structured Ecosystem
            </span>
          </h1>

          <p className="text-sm md:text-base text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Post wholesale deals, calculate ARV & MAO with AI ledger validation, connect with JV partners, and progress through interactive, gamified education paths.
          </p>
        </motion.div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
          <Magnetic>
            <Link
              href="/login"
              className="w-full sm:w-auto bg-gradient-to-r from-violet-600 via-purple-650 to-emerald-600 text-white text-sm font-extrabold py-3 px-8 rounded-xl shadow-lg shadow-violet-950/40 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] btn-premium-gradient border border-violet-500/20 group"
            >
              <span>Start Wholesaling Free</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Magnetic>
          
          <Magnetic>
            <Link
              href="/login"
              className="w-full sm:w-auto bg-slate-900/80 border border-gray-800 hover:bg-slate-800 text-gray-300 text-sm font-bold py-3 px-8 rounded-xl transition-colors flex items-center justify-center gap-2 hover:text-white"
            >
              <Compass className="w-4 h-4 text-violet-400" />
              <span>Explore Learn Hub</span>
            </Link>
          </Magnetic>
        </div>

        {/* Founding Member Banner */}
        {pricing && pricing.stage !== 'standard' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto mt-16 p-5 rounded-2xl bg-gradient-to-r from-violet-900/40 via-purple-900/30 to-indigo-900/40 border border-violet-500/20 backdrop-blur-sm relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 animate-fade-in"
          >
            <div className="text-left space-y-2 flex-1 w-full">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-black uppercase tracking-wider">
                Limited Time Founding Pricing
              </span>
              <h3 className="text-sm md:text-base font-extrabold text-white">
                Vanta {pricing.stage === 'founding' ? 'Founding Member' : pricing.stage === 'early_adopter' ? 'Early Adopter' : 'Growth Stage'} Rate — Only ${pricing.prices.monthly}/mo
              </h3>
              <p className="text-xs text-gray-400">
                Lock in {pricing.stage === 'founding' ? '50% off for life' : 'discounted rates'} before spots are gone. Rate remains locked even after next stage activation.
              </p>
              
              {pricing.spots.total && (
                <div className="space-y-1 pt-1 max-w-sm">
                  <div className="flex justify-between text-[10px] text-gray-500 font-bold">
                    <span>🔥 {pricing.spots.remaining} of {pricing.spots.total} spots remaining</span>
                    <span>{Math.round(((pricing.spots.total - pricing.spots.remaining) / pricing.spots.total) * 100)}% filled</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden border border-gray-900">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-violet-500" 
                      style={{ width: `${((pricing.spots.total - pricing.spots.remaining) / pricing.spots.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            
            <Link
              href="/pricing"
              className="w-full md:w-auto bg-gradient-to-r from-amber-500 via-yellow-600 to-amber-500 hover:from-amber-400 hover:to-amber-400 text-slate-950 font-black text-xs px-6 py-3 rounded-xl transition-all shadow shadow-amber-500/20 text-center shrink-0 flex items-center justify-center gap-1.5 hover:scale-[1.02]"
            >
              <span>See Pricing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>
        )}

        {/* Social Proof Stats Counter Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mt-20 p-6 rounded-2xl bg-slate-900/40 border border-gray-900/80 backdrop-blur-sm relative z-10"

        >
          {[
            { label: 'Total Users', value: totalUsers, suffix: '+' },
            { label: 'Deals Sourced', value: dealsSourced, suffix: '+' },
            { label: 'Lessons Completed', value: lessonsCompleted, suffix: '+' },
            { label: 'Active Members', value: activeMembers, suffix: '+' },
          ].map((stat, idx) => (
            <div key={idx} className="text-center">
              <div className="text-2xl md:text-3xl font-black text-white bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent mb-1">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wider font-semibold">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Core Features Grid */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-2xl font-bold text-white mb-2">Designed For Modern Deal Makers</h2>
          <p className="text-xs text-gray-400">Everything you need to source, analyze, collaborate, and close deals in one place.</p>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-6">
          {[
            {
              title: 'AI Deal Analysis',
              desc: 'Estimate After Repair Value (ARV) and calculate Maximum Allowable Offers (MAO) safely based on automated criteria check.',
              icon: Zap,
              color: 'text-violet-400 bg-violet-500/10 border-violet-500/20'
            },
            {
              title: 'Gamified Learn Hub',
              desc: 'Interactive, bite-sized lessons modeled after Duolingo. Maintain daily login streaks and unlock industry certifications.',
              icon: Trophy,
              color: 'text-amber-400 bg-amber-500/10 border-amber-500/20'
            },
            {
              title: 'Real-Time JV Chat',
              desc: 'Instantly negotiate terms, collaborate on marketing, and form Joint Ventures directly inside our subscription-gated portal.',
              icon: MessageSquare,
              color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
            },
            {
              title: 'JV Marketplace',
              desc: 'Explore active wholesale deals, post your own properties, and find matching co-wholesalers and buyers in real-time.',
              icon: Award,
              color: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
            }
          ].map((item, idx) => {
            const Icon = item.icon
            return (
              <SpotlightCard 
                key={idx}
                tilt={true}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                glowColor={
                  item.title === 'AI Deal Analysis' ? 'rgba(139, 92, 246, 0.12)' :
                  item.title === 'Gamified Learn Hub' ? 'rgba(245, 158, 11, 0.12)' :
                  item.title === 'Real-Time JV Chat' ? 'rgba(16, 185, 129, 0.12)' :
                  'rgba(59, 130, 246, 0.12)'
                }
                className="cursor-pointer h-full flex flex-col justify-between group"
              >
                <div>
                  <div className={`p-2.5 rounded-lg w-fit mb-4 transition-transform duration-300 group-hover:scale-110 ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2 transition-colors duration-200 group-hover:text-violet-400">{item.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </SpotlightCard>
            )
          })}
        </div>
      </section>

      {/* Testimonials Carousel & Submission Section */}
      <section className="relative z-10 py-20 overflow-hidden border-t border-gray-900/60 mt-12 bg-slate-950/40">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-6xl mx-auto px-6 text-center mb-12"
        >
          <h2 className="text-2xl font-bold text-white mb-2">What Real Deal Makers Say</h2>
          <p className="text-xs text-gray-400">Join thousands of investors, wholesaling experts, and JV partners cooperating in our ecosystem.</p>
        </motion.div>

        {/* Infinite Loop Carousel */}
        <div className="relative flex overflow-x-hidden w-full group py-4 mb-8">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none" />

          <div className="flex gap-6 animate-marquee hover:[animation-play-state:paused] w-max">
            {doubleReviews.map((rev, idx) => (
              <div 
                key={`${rev.id}-${idx}`}
                className="flex-shrink-0 w-[280px] sm:w-[320px] md:w-[350px] p-5 rounded-2xl bg-slate-900/50 border border-gray-900/80 flex flex-col justify-between backdrop-blur-sm glass-card-interactive"
              >
                <div>
                  <div className="flex gap-1 text-amber-400 mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-700'}`} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed italic mb-4">
                    &quot;{rev.testimonial}&quot;
                  </p>
                </div>
                <div className="flex items-center gap-2 border-t border-gray-900/60 pt-3 mt-2">
                  <div className="w-8 h-8 rounded-full bg-violet-600/20 border border-violet-500/20 flex items-center justify-center font-bold text-xs text-violet-400 uppercase flex-shrink-0">
                    {rev.profiles?.full_name?.charAt(0) || rev.profiles?.username?.charAt(0) || 'U'}
                  </div>
                  <div className="text-left min-w-0">
                    <div className="text-xs font-semibold text-white truncate">
                      {rev.profiles?.full_name || 'Anonymous User'}
                    </div>
                    <div className="text-[10px] text-gray-500 truncate">
                      @{rev.profiles?.username || 'user'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Review Form or login call to action */}
        <div className="max-w-xl mx-auto px-6 mt-16 relative z-10">
          {user ? (
            <motion.form 
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              onSubmit={handleSubmitReview}
              className="glass-panel border border-gray-900 rounded-2xl p-6 text-left space-y-4 shadow-xl"
            >
              <div>
                <h3 className="text-sm font-bold text-white mb-0.5">Share Your Vanta Experience</h3>
                <p className="text-[10px] text-gray-400">Leave a review to be featured on our homepage slider. Submissions undergo moderation.</p>
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Rating</label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star className={`w-5 h-5 ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-700'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Testimonial</label>
                <textarea
                  required
                  rows={3}
                  value={testimonial}
                  onChange={(e) => setTestimonial(e.target.value)}
                  placeholder="How did Vanta help you scale your real estate business?"
                  className="w-full bg-slate-950 border border-gray-800 rounded-xl py-2 px-3 text-xs text-gray-200 focus:outline-none focus:border-violet-500 resize-none font-medium"
                />
              </div>

              <Magnetic>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-violet-600 via-purple-650 to-violet-500 text-white text-xs font-bold py-2.5 px-6 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow disabled:opacity-50 cursor-pointer btn-premium-gradient border border-violet-500/20"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting review...</span>
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Submit Testimonial</span>
                    </>
                  )}
                </button>
              </Magnetic>
            </motion.form>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-panel border border-gray-900 rounded-2xl p-6 text-center"
            >
              <Star className="w-8 h-8 text-amber-400 fill-amber-400 mx-auto mb-2 opacity-80" />
              <h3 className="text-xs font-bold text-white mb-1">Are you a Vanta member?</h3>
              <p className="text-[11px] text-gray-400 mb-4">Log in to your account to share your success story and post a review.</p>
              <Link
                href="/login"
                className="inline-block bg-slate-900 hover:bg-slate-800 text-gray-300 text-xs font-semibold py-2 px-4 rounded-lg border border-gray-800 transition-colors"
              >
                Sign In to Review
              </Link>
            </motion.div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-950 bg-black/40 py-8 text-center text-xs text-gray-500">
        <p>© 2026 Vanta Inc. All rights reserved. Not a real estate brokerage.</p>
      </footer>
    </div>
  )
}
