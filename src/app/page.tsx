import Link from 'next/link'
import { ArrowRight, Trophy, Zap, MessageSquare, Award, Star, Compass } from 'lucide-react'

export default function Home() {
  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-indigo-900/20 via-purple-900/10 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 -left-40 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Decorative Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_40%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-gray-900/80 bg-slate-950/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/vanta_logo_full.jpg" alt="Vanta" className="h-8 w-auto object-contain" />
          </div>

          <div className="flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-xs font-semibold text-gray-400 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-md shadow-violet-950/20 flex items-center gap-1"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
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

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="w-full sm:w-auto bg-gradient-to-r from-violet-600 via-purple-600 to-emerald-600 hover:from-violet-500 hover:to-emerald-500 text-white text-sm font-extrabold py-3 px-8 rounded-xl shadow-lg shadow-violet-950/40 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
          >
            <span>Start Wholesaling Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          
          <Link
            href="/login"
            className="w-full sm:w-auto bg-slate-900/80 border border-gray-800 hover:bg-slate-800 text-gray-300 text-sm font-bold py-3 px-8 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Compass className="w-4 h-4 text-violet-400" />
            <span>Explore Learn Hub</span>
          </Link>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <h2 className="text-2xl font-bold text-white mb-2">Designed For Modern Deal Makers</h2>
          <p className="text-xs text-gray-400">Everything you need to source, analyze, collaborate, and close deals in one place.</p>
        </div>

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
              title: 'Deal Flow Board',
              desc: 'Visualize your active leads, track contracts, manage buyer details, and gain XP as you move deals toward the closing table.',
              icon: Award,
              color: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
            }
          ].map((item, idx) => {
            const Icon = item.icon
            return (
              <div 
                key={idx}
                className="glass-card rounded-2xl p-5 border border-gray-800/80 hover:border-violet-500/20 flex flex-col justify-between"
              >
                <div>
                  <div className={`p-2.5 rounded-lg w-fit mb-4 ${item.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Testimonial / Social Proof */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 py-16 text-center border-t border-gray-900/60 mt-12">
        <div className="flex justify-center gap-1 text-amber-400 mb-4">
          {[1,2,3,4,5].map((s) => <Star key={s} className="w-4 h-4 fill-amber-400" />)}
        </div>
        <p className="text-base italic text-gray-300 max-w-2xl mx-auto mb-6">
          &quot;Moving my joint venture deal finding from chaotic Facebook groups and unorganized spreadsheets to this platform has doubled my deal velocity. The MAO calculator is bulletproof.&quot;
        </p>
        <div className="font-semibold text-white text-xs">Marcus V. — Houston Deal Finder</div>
        <div className="text-[10px] text-gray-500">Level 4 Closer • 14 deals completed</div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-950 bg-black/40 py-8 text-center text-xs text-gray-500">
        <p>© 2026 Vanta Inc. All rights reserved. Not a real estate brokerage.</p>
      </footer>
    </div>
  )
}

