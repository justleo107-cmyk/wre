'use client'

import React, { useState, useEffect } from 'react'
import SidebarLayout from '@/components/dashboard/SidebarLayout'
import { createClient } from '@/lib/supabase/client'
import { 
  Trophy, 
  TrendingUp, 
  Calendar, 
  Clock, 
  Sparkles, 
  ChevronRight,
  Filter,
  Activity,
  Award,
  Info
} from 'lucide-react'
import { getRankAndLevel } from '@/lib/gamification'

interface XPLog {
  id: string
  date: string
  action: string
  xp_earned: number
}

export default function XPActivityPage() {
  const supabase = createClient()
  
  // Profile & Rank States
  const [profile, setProfile] = useState<any>(null)
  const [xpLogs, setXpLogs] = useState<XPLog[]>([])
  const [loading, setLoading] = useState(true)
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'all'>('all')

  const fetchXPData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Fetch Profile
    const { data: p } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    setProfile(p)

    // 2. Fetch XP Logs
    const { data: logs } = await supabase
      .from('xp_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })

    setXpLogs(logs || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchXPData()
  }, [supabase])

  // Filters logic
  const filteredLogs = xpLogs.filter(log => {
    const logDate = new Date(log.date)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - logDate.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (timeFilter === 'today') {
      return logDate.toDateString() === now.toDateString()
    }
    if (timeFilter === 'week') {
      return diffDays <= 7
    }
    if (timeFilter === 'month') {
      return diffDays <= 30
    }
    return true
  })

  // Calculations for charts
  // Create coordinates for a cumulative line chart (XP Growth)
  const getChartPoints = () => {
    if (filteredLogs.length === 0) return ''
    
    // Sort chronological ascending
    const sorted = [...filteredLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    
    let cumulative = profile ? profile.xp - sorted.reduce((acc, curr) => acc + curr.xp_earned, 0) : 0
    if (cumulative < 0) cumulative = 0

    const points = sorted.map((log, idx) => {
      cumulative += log.xp_earned
      return {
        x: idx,
        y: cumulative,
        label: log.action
      }
    })

    if (points.length === 1) {
      // Duplicate to draw line
      points.unshift({ x: -1, y: points[0].y - sorted[0].xp_earned, label: 'Start' })
    }

    return points
  }

  const chartData = getChartPoints()

  // Build SVG path for cumulative growth area chart
  const buildSvgPath = (width: number, height: number) => {
    if (!chartData || chartData.length === 0) return { line: '', area: '' }

    const padding = 20
    const usableW = width - padding * 2
    const usableH = height - padding * 2

    const xMax = chartData.length - 1
    const yMin = Math.min(...chartData.map(d => d.y))
    const yMax = Math.max(...chartData.map(d => d.y))
    const yRange = yMax - yMin || 1

    const getXCoords = (index: number) => padding + (index / (xMax || 1)) * usableW
    const getYCoords = (value: number) => padding + usableH - ((value - yMin) / yRange) * usableH

    const linePoints = chartData.map((d, i) => `${getXCoords(i)},${getYCoords(d.y)}`).join(' L ')
    const firstX = getXCoords(0)
    const lastX = getXCoords(xMax)
    const bottomY = padding + usableH

    const areaPoints = `M ${firstX},${bottomY} L ${linePoints} L ${lastX},${bottomY} Z`
    const linePath = `M ${linePoints}`

    return { line: linePath, area: areaPoints, points: chartData.map((d, i) => ({ x: getXCoords(i), y: getYCoords(d.y), value: d.y, label: d.label })) }
  }

  const rankInfo = profile ? getRankAndLevel(profile.xp) : null
  const svgData = buildSvgPath(500, 200)

  return (
    <SidebarLayout>
      <div className="max-w-5xl mx-auto space-y-10 pb-12">
        
        {/* Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-900 pb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white mb-1 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-violet-400" />
              <span>XP Activity & Progression History</span>
            </h1>
            <p className="text-xs text-gray-400">
              Track your experience points, wholesaling level progressions, and historical growth logs.
            </p>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-gray-800 text-xs font-bold">
            <Trophy className="w-4 h-4 text-violet-400" />
            <span>Total XP: <span className="text-violet-400">{profile?.xp || 0}</span></span>
          </div>
        </div>

        {/* Level Stats Summary */}
        {profile && rankInfo && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Rank Card */}
            <div className="glass-card rounded-2xl border border-gray-900 p-5 space-y-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Current Wholesaler Rank</span>
                <Award className="w-4 h-4 text-violet-400" />
              </div>
              <h3 className="text-xl font-black text-white mt-1 leading-tight">{rankInfo.currentRank}</h3>
              <p className="text-[9px] text-gray-500 font-medium">Level {rankInfo.currentLevel} • Next: {rankInfo.nextRank}</p>
            </div>

            {/* XP Progression Card */}
            <div className="glass-card rounded-2xl border border-gray-900 p-5 space-y-3 md:col-span-2">
              <div className="flex justify-between items-center text-[10px] font-bold text-gray-400">
                <span>XP PROGRESS TO NEXT RANK</span>
                <span className="text-violet-400">{profile.xp} / {rankInfo.nextRankXp} XP</span>
              </div>
              
              <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-gray-900/60 p-0.5">
                <div 
                  className="h-full bg-gradient-to-r from-violet-600 via-purple-500 to-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: `${rankInfo.progress}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[9px] text-gray-500 font-medium">
                <span>Level {rankInfo.currentLevel} ({rankInfo.minXp} XP)</span>
                <span>{Math.round(rankInfo.progress)}% Complete</span>
                <span>Level {rankInfo.currentLevel + 1} ({rankInfo.nextRankXp} XP)</span>
              </div>
            </div>

          </div>
        )}

        {/* Charts & Filter Panel */}
        <div className="grid md:grid-cols-3 gap-6 items-start">
          
          {/* Charts Column (ColSpan 2) */}
          <div className="md:col-span-2 glass-panel border-gray-900 rounded-xl p-5 space-y-5">
            <div className="flex justify-between items-center border-b border-gray-950 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-violet-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">XP Growth Chart</h3>
              </div>

              {/* Timeframe Filter Tab */}
              <div className="flex rounded-lg bg-slate-950 p-1 border border-gray-900 text-[9px] font-black">
                {([
                  { label: 'Today', key: 'today' },
                  { label: 'Week', key: 'week' },
                  { label: 'Month', key: 'month' },
                  { label: 'All Time', key: 'all' }
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setTimeFilter(tab.key)}
                    className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                      timeFilter === tab.key 
                        ? 'bg-violet-600/20 text-violet-400 font-extrabold' 
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Cumulative Growth Area Chart */}
            <div className="relative h-56 bg-slate-950/80 rounded-xl border border-gray-900 flex items-center justify-center p-2">
              {loading ? (
                <div className="w-6 h-6 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
              ) : filteredLogs.length === 0 ? (
                <div className="text-center text-[10px] text-gray-600">No activity logged within this timeframe.</div>
              ) : (
                <svg viewBox="0 0 500 200" className="w-full h-full">
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal grid lines */}
                  <line x1="20" y1="20" x2="480" y2="20" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />
                  <line x1="20" y1="70" x2="480" y2="70" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />
                  <line x1="20" y1="120" x2="480" y2="120" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />
                  <line x1="20" y1="170" x2="480" y2="170" stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />

                  {/* Area */}
                  {svgData.area && (
                    <path d={svgData.area} fill="url(#areaGrad)" />
                  )}

                  {/* Line */}
                  {svgData.line && (
                    <path d={svgData.line} fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" />
                  )}

                  {/* Intersect points */}
                  {svgData.points && svgData.points.map((pt, i) => (
                    <g key={i} className="group/dot">
                      <circle cx={pt.x} cy={pt.y} r="3" fill="#8b5cf6" stroke="#fff" strokeWidth="1" className="transition-all duration-200 hover:r-5 cursor-help" />
                      <title>{`${pt.label}: ${pt.value} XP`}</title>
                    </g>
                  ))}
                </svg>
              )}
            </div>

            <div className="flex items-center gap-1.5 p-3 rounded-lg bg-slate-950 border border-gray-900 text-[10px] text-gray-500 leading-relaxed">
              <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
              <span>Hover over chart dots to view specific XP allotment details. Growth chart updates automatically as calculations, lessons, and deals are logged.</span>
            </div>
          </div>

          {/* XP History Logs Column (ColSpan 1) */}
          <div className="glass-panel border-gray-900 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-950 pb-3">
              <Clock className="w-4 h-4 text-violet-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Activity History</h3>
            </div>

            {loading ? (
              <div className="text-center py-6 text-gray-500 text-xs">Syncing logs...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-10 text-xs text-gray-600">No activities logged.</div>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 no-scrollbar">
                {filteredLogs.map((log) => {
                  const logDate = new Date(log.date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })

                  return (
                    <div 
                      key={log.id} 
                      className="glass-card p-3 rounded-xl border border-gray-900 flex justify-between items-center text-[10px] bg-slate-950/20"
                    >
                      <div className="space-y-0.5 truncate">
                        <div className="font-bold text-white truncate">{log.action}</div>
                        <div className="text-gray-500 font-medium">{logDate}</div>
                      </div>
                      <div className="text-violet-400 font-black shrink-0 px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/15">
                        +{log.xp_earned} XP
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>

      </div>
    </SidebarLayout>
  )
}
