'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, User, ArrowRight, CheckCircle2, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="glass-panel rounded-2xl p-8 shadow-2xl border border-gray-800/80 max-w-md w-full mx-auto flex items-center justify-center min-h-[200px]"><div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /></div>}>
      <LoginPageInner />
    </Suspense>
  )
}

function LoginPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)

  // Display OAuth error messages redirected from the callback route
  useEffect(() => {
    const oauthError = searchParams.get('error')
    if (oauthError) {
      setMessage({ type: 'error', text: oauthError })
    }
  }, [searchParams])

  const handleLegacySubmit = async (e: React.FormEvent) => {
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

        setMessage({ type: 'success', text: 'Welcome back! Syncing subscription...' })

        // Whop subscription sync removed (handled directly in database profiles/subscriptions schemas)

        router.push('/dashboard')
        router.refresh()
      } else {
        // Sign Up logic
        if (!agreeTerms || !agreePrivacy) {
          throw new Error('You must agree to the Terms of Service and Privacy Policy to create an account.')
        }

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

        if (data.session) {
          setMessage({ type: 'success', text: 'Account created! Syncing subscription...' })
          
          // Whop subscription sync removed

          router.push('/dashboard')
          router.refresh()
        } else {
          setMessage({
            type: 'success',
            text: 'Account created! Please check your email to verify your account.',
          })
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'An error occurred'
      setMessage({ type: 'error', text: errMsg })
    } finally {
      setLoading(false)
    }
  }

  // SSO OAuth handler (Placeholder for Google OAuth / third party SSO integration)
  const handleSSOLogin = (provider: 'google') => {
    setLoading(true)
    // Future integration: supabase.auth.signInWithOAuth({ provider })
    alert(`OAuth SSO integration with ${provider} is disabled. Please continue with your Email and Password.`)
    setLoading(false)
  }

  return (
    <div className="glass-panel rounded-2xl p-8 shadow-2xl border border-gray-800/80 max-w-md w-full mx-auto space-y-7">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-black tracking-tight text-white uppercase">
          Sign in to Vanta
        </h2>
        <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
          Access your wholesaling workspace, AI tools, marketplace, and community.
        </p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
          message.type === 'success' 
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {message.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* SSO Auth Providers (Google OAuth placeholder) */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => handleSSOLogin('google')}
          disabled={loading}
          className="w-full bg-slate-900 hover:bg-slate-800 border border-gray-800 hover:border-gray-700 text-white text-xs font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" width="100%" height="100%">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Continue with Google</span>
        </button>
      </div>

      {/* Modern Divider */}
      <div className="h-px bg-slate-900 w-full my-6" />

      {/* Secondary: Email/Password Form */}
      <form onSubmit={handleLegacySubmit} className="space-y-4">
        <div className="text-left mb-2">
          <h3 className="text-xs font-black text-gray-300 uppercase tracking-wider">
            {isLogin ? 'Continue with Email' : 'Create your Account'}
          </h3>
        </div>

        {!isLogin && (
          <>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-650">
                  <User className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 pl-9 pr-4 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-650 font-mono text-xs select-none">
                  @
                </span>
                <input
                  type="text"
                  required
                  placeholder="johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 pl-7 pr-4 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
          </>
        )}

        <div>
          <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
            Email Address
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-650">
              <Mail className="w-3.5 h-3.5" />
            </span>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 pl-9 pr-4 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Password
            </label>
            {isLogin && (
              <button 
                type="button" 
                className="text-[10px] text-violet-400 hover:text-violet-300 font-medium"
                onClick={() => alert('Password reset is managed through your profile settings or provider.')}
              >
                Forgot?
              </button>
            )}
          </div>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-650">
              <Lock className="w-3.5 h-3.5" />
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 pl-9 pr-10 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-violet-500"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-550 hover:text-gray-300 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {!isLogin && (
          <div className="space-y-2.5 my-3 p-3 rounded-lg border border-gray-800/60 bg-slate-900/40 select-none">
            <div className="flex items-start gap-2.5">
              <input
                id="agree-terms"
                type="checkbox"
                required
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-800 bg-slate-950 text-violet-650 focus:ring-violet-500/20 cursor-pointer accent-violet-600 transition-colors"
              />
              <label 
                htmlFor="agree-terms" 
                className="text-[11px] text-gray-400 leading-normal cursor-pointer hover:text-gray-300 transition-colors font-medium"
              >
                I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-violet-400 font-semibold hover:underline hover:text-violet-300">Terms of Service</a>
              </label>
            </div>
            
            <div className="flex items-start gap-2.5">
              <input
                id="agree-privacy"
                type="checkbox"
                required
                checked={agreePrivacy}
                onChange={(e) => setAgreePrivacy(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-800 bg-slate-950 text-violet-650 focus:ring-violet-500/20 cursor-pointer accent-violet-600 transition-colors"
              />
              <label 
                htmlFor="agree-privacy" 
                className="text-[11px] text-gray-400 leading-normal cursor-pointer hover:text-gray-300 transition-colors font-medium"
              >
                I have read and agree to the <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-violet-400 font-semibold hover:underline hover:text-violet-300">Privacy Policy</a>
              </label>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || (!isLogin && (!agreeTerms || !agreePrivacy))}
          className="w-full mt-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-semibold py-2.5 px-4 rounded-lg shadow-lg shadow-violet-900/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
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

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin)
              setMessage(null)
              setAgreeTerms(false)
              setAgreePrivacy(false)
            }}
            className="text-[11px] text-gray-500 hover:text-white transition-colors"
          >
            {isLogin ? (
              <>New to Vanta? <span className="text-violet-450 font-bold">Create account</span></>
            ) : (
              <>Already have an account? <span className="text-violet-450 font-bold">Sign In</span></>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
