import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, className = '', id, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label 
            htmlFor={id} 
            className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        <input
          id={id}
          ref={ref}
          className={`w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-100 placeholder-gray-600 focus:outline-none focus:border-violet-500 disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
          {...props}
        />
      </div>
    )
  }
)

Input.displayName = 'Input'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  children: React.ReactNode
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, children, className = '', id, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label 
            htmlFor={id} 
            className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        <select
          id={id}
          ref={ref}
          className={`w-full bg-slate-900/60 border border-gray-800 rounded-lg py-2 px-3 text-xs text-gray-350 focus:outline-none focus:border-violet-500 disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
          {...props}
        >
          {children}
        </select>
      </div>
    )
  }
)

Select.displayName = 'Select'
