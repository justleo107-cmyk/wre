import React from 'react'

interface StatWidgetProps {
  label: string
  value: string | number
  desc?: string
  color?: string
}

export function StatWidget({
  label,
  value,
  desc,
  color = 'border-l-violet-500'
}: StatWidgetProps) {
  return (
    <div className={`glass-card glass-card-interactive rounded-xl p-4 border border-gray-900 border-l-4 ${color} relative overflow-hidden`}>
      <div className="shimmer-overlay" />
      <div className="relative z-10">
        <div className="text-[10px] uppercase font-bold text-gray-500 mb-1">{label}</div>
        <div className="text-2xl font-black text-white mb-0.5">{value}</div>
        {desc && <div className="text-[10px] text-gray-400">{desc}</div>}
      </div>
    </div>
  )
}

