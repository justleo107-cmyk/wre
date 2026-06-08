import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div 
      className={`bg-slate-900 border border-gray-800 rounded-xl p-5 transition-all duration-350 ease-in-out hover:border-violet-500/20 hover:scale-[1.01] hover:shadow-xl hover:shadow-violet-950/5 ${className}`} 
      {...props}
    >
      {children}
    </div>
  )
}

export function GlassCard({ children, className = '', ...props }: CardProps) {
  return (
    <div 
      className={`glass-card glass-card-interactive rounded-xl p-5 relative overflow-hidden ${className}`} 
      {...props}
    >
      <div className="shimmer-overlay" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

export function GlassPanel({ children, className = '', ...props }: CardProps) {
  return (
    <div 
      className={`glass-panel rounded-xl p-5 relative overflow-hidden transition-all duration-350 ease-in-out hover:border-violet-500/10 hover:shadow-2xl hover:shadow-violet-950/10 ${className}`} 
      {...props}
    >
      <div className="shimmer-overlay" />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

