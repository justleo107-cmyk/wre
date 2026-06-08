import React from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md'
}: ModalProps) {
  if (!isOpen) return null

  const widths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
      />
      
      {/* Panel */}
      <div className={`relative glass-panel rounded-2xl border border-gray-800 w-full ${widths[maxWidth]} p-6 max-h-[90vh] overflow-y-auto z-10 animate-scale-up`}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-base font-bold text-white">{title}</h3>
            {description && <p className="text-[10px] text-gray-400 mt-1">{description}</p>}
          </div>
          <button 
            onClick={onClose}
            type="button"
            className="p-1 rounded hover:bg-slate-900 text-gray-400 hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  )
}
