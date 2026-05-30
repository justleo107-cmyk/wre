'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, User, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  // Clear messages on toggle
  useEffect(() => {
    setMessage(null)
  }, [isLogin])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (isLogin) {
        // Sign In logic
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error

        setMessage({ type: 'success', text: 'Welcome back! Redirecting...' })
        router.push('/dashboard')
        router.refresh()
      } else {
        // Sign Up logic
        if (!username || !fullName) {
          throw new Error('Please fill out all fields.')
        }
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username.toLowerCase().trim(),
              full_name: fullName.trim(),
            },
          },
        })
        if (error) throw error

        // If email confirmation is required, Supabase might not create session immediately.
        // If session is created, route to onboarding. Otherwise, prompt user to check email.
        if (data.session) {
          setMessage({ type: 'success', text: 'Account created! Redirecting...' })
          router.push('/onboarding')
          router.refresh()
        } else {
          setMessage({
            type: 'success',
            text: 'Account created! Please check your email to verify your account.',
          })
        }
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'An error occurred' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass-panel rounded-2xl p-6 shadow-2xl border border-gray-800/80">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-bold tracking-tight text-white mb-1">
          {isLogin ? 'Welcome Back' : 'Create Your Account'}
        </h2>
        <p className="text-xs text-gray-400">
          {isLogin 
            ? 'Access your deal pipeline and start analyzing properties'
            : 'Join the premier ecosystem for wholesaling collaboration'
          }
        </p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-xs mb-4 flex items-start gap-2 ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {message.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 pl-10 pr-4 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-mono text-sm select-none">
                  @
                </span>
                <input
                  type="text"
                  required
                  placeholder="johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 pl-8 pr-4 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                />
              </div>
            </div>
          </>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
            Email Address
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
              <Mail className="w-4 h-4" />
            </span>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 pl-10 pr-4 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Password
            </label>
            {isLogin && (
              <button 
                type="button" 
                className="text-[10px] text-violet-400 hover:text-violet-300 font-medium"
                onClick={() => alert('Feature coming in Phase 2!')}
              >
                Forgot?
              </button>
            )}
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
              <Lock className="w-4 h-4" />
            </span>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 pl-10 pr-4 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-semibold py-2.5 px-4 rounded-lg shadow-lg shadow-violet-900/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>{isLogin ? 'Sign In' : 'Get Started'}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 border-t border-gray-800/80 pt-4 text-center">
        <button
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          {isLogin ? (
            <>
              New to WRE SaaS? <span className="text-violet-400 font-semibold">Create account</span>
            </>
          ) : (
            <>
              Already have an account? <span className="text-violet-400 font-semibold">Sign In</span>
            </>
          )}
        </button>
      </div>

      {!isLogin && (
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-emerald-400 font-medium bg-emerald-500/5 py-1 px-3 rounded-full border border-emerald-500/10">
          <Sparkles className="w-3 h-3" />
          <span>Includes 50 free credits upon completion</span>
        </div>
      )}
    </div>
  )
}
