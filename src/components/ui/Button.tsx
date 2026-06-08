import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  loading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}

export function Button({
  children,
  variant = 'primary',
  loading = false,
  icon,
  iconRight,
  className = '',
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 px-4 rounded-lg transition-all duration-200 ease-in-out cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none active:scale-[0.98]'
  
  const variants = {
    primary: 'btn-premium-gradient bg-gradient-to-r from-violet-600 via-purple-650 to-violet-500 text-white shadow-lg shadow-violet-950/20 hover:scale-[1.02] border border-violet-500/20',
    secondary: 'btn-premium-gradient bg-gradient-to-r from-emerald-600 via-teal-650 to-emerald-500 text-white shadow-lg shadow-emerald-950/20 hover:scale-[1.02] border border-emerald-500/20',
    outline: 'bg-slate-900/40 hover:bg-slate-900 border border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white hover:scale-[1.01]',
    ghost: 'hover:bg-slate-800/60 text-gray-400 hover:text-white',
    danger: 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-950/20 hover:scale-[1.02]'
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin shrink-0" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      <span>{children}</span>
      {!loading && iconRight && <span className="shrink-0">{iconRight}</span>}
    </button>
  )
}
