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
  const [chartMode, setChartMode] = useState<'daily' | 'total'>('daily')
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null)

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

  // Helper to format Date objects as YYYY-MM-DD local strings
  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper to parse YYYY-MM-DD local strings safely without timezone shift
  const parseLocalDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  };

  interface ChartPoint {
    label: string;
    dateStr: string;
    xpEarned: number;
    value: number;
    actions: string[];
  }

  // Calculations for charts
  const getChartPoints = (): ChartPoint[] => {
    const now = new Date();
    const todayStr = getLocalDateString(now);

    // Group all logs by local date string
    const logsByDay = new Map<string, { xpEarned: number; actions: string[] }>();
    const sortedLogs = [...xpLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (const log of sortedLogs) {
      const logDate = new Date(log.date);
      const dateStr = getLocalDateString(logDate);
      if (!logsByDay.has(dateStr)) {
        logsByDay.set(dateStr, { xpEarned: 0, actions: [] });
      }
      const entry = logsByDay.get(dateStr)!;
      entry.xpEarned += log.xp_earned;
      entry.actions.push(log.action);
    }

    // Earliest log date
    let earliestDate = new Date();
    if (sortedLogs.length > 0) {
      earliestDate = new Date(sortedLogs[0].date);
    }
    const startDate = new Date(earliestDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(now);
    endDate.setHours(0, 0, 0, 0);

    // Generate chronological daily stats
    const allDaysSequence: string[] = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      allDaysSequence.push(getLocalDateString(current));
      current.setDate(current.getDate() + 1);
    }

    const totalLogsXp = sortedLogs.reduce((acc, log) => acc + log.xp_earned, 0);
    const startingXp = profile ? Math.max(0, profile.xp - totalLogsXp) : 0;

    const dailyStats = new Map<string, { xpEarned: number; cumulativeXp: number; actions: string[] }>();
    let runningCumulative = startingXp;
    for (const dayStr of allDaysSequence) {
      const logEntry = logsByDay.get(dayStr);
      const xpEarned = logEntry ? logEntry.xpEarned : 0;
      const actions = logEntry ? logEntry.actions : [];
      runningCumulative += xpEarned;
      dailyStats.set(dayStr, {
        xpEarned,
        cumulativeXp: runningCumulative,
        actions
      });
    }

    const getCumulativeXpForDay = (dayStr: string) => {
      if (dailyStats.has(dayStr)) {
        return dailyStats.get(dayStr)!.cumulativeXp;
      }
      let latestBeforeStr = '';
      for (const d of dailyStats.keys()) {
        if (d < dayStr && (latestBeforeStr === '' || d > latestBeforeStr)) {
          latestBeforeStr = d;
        }
      }
      if (latestBeforeStr !== '') {
        return dailyStats.get(latestBeforeStr)!.cumulativeXp;
      }
      return startingXp;
    };

    if (timeFilter === 'today') {
      const todayLogs = sortedLogs.filter(log => getLocalDateString(new Date(log.date)) === todayStr);
      const yesterdayStr = getLocalDateString(new Date(now.getTime() - 24 * 60 * 60 * 1000));
      const yesterdayCumulative = getCumulativeXpForDay(yesterdayStr);

      const intervals = [
        { label: "12 AM", startHour: 0, endHour: 3 },
        { label: "3 AM", startHour: 3, endHour: 6 },
        { label: "6 AM", startHour: 6, endHour: 9 },
        { label: "9 AM", startHour: 9, endHour: 12 },
        { label: "12 PM", startHour: 12, endHour: 15 },
        { label: "3 PM", startHour: 15, endHour: 18 },
        { label: "6 PM", startHour: 18, endHour: 21 },
        { label: "9 PM", startHour: 21, endHour: 24 }
      ];

      let runningTodayCumulative = yesterdayCumulative;
      return intervals.map(interval => {
        const intervalLogs = todayLogs.filter(log => {
          const hr = new Date(log.date).getHours();
          return hr >= interval.startHour && hr < interval.endHour;
        });
        const xpEarned = intervalLogs.reduce((sum, l) => sum + l.xp_earned, 0);
        const actions = intervalLogs.map(l => l.action);
        runningTodayCumulative += xpEarned;

        const formatHour = (h: number) => {
          if (h === 0 || h === 24) return "12 AM";
          if (h === 12) return "12 PM";
          return h < 12 ? `${h} AM` : `${h - 12} PM`;
        };

        return {
          label: interval.label,
          dateStr: `Today, ${formatHour(interval.startHour)} - ${formatHour(interval.endHour)}`,
          xpEarned,
          value: chartMode === 'daily' ? xpEarned : runningTodayCumulative,
          actions
        };
      });
    }

    let targetDays: string[] = [];
    if (timeFilter === 'week') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        targetDays.push(getLocalDateString(d));
      }
    } else if (timeFilter === 'month') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        targetDays.push(getLocalDateString(d));
      }
    } else { // 'all'
      if (allDaysSequence.length < 7) {
        const padCount = 7 - allDaysSequence.length;
        const firstDayObj = parseLocalDate(allDaysSequence[0] || todayStr);
        const paddedDays: string[] = [];
        for (let i = padCount; i > 0; i--) {
          const d = new Date(firstDayObj.getTime() - i * 24 * 60 * 60 * 1000);
          paddedDays.push(getLocalDateString(d));
        }
        targetDays = [...paddedDays, ...allDaysSequence];
      } else {
        targetDays = [...allDaysSequence];
      }
    }

    return targetDays.map(dayStr => {
      const stats = dailyStats.get(dayStr);
      const xpEarned = stats ? stats.xpEarned : 0;
      const cumulativeXp = stats ? stats.cumulativeXp : getCumulativeXpForDay(dayStr);
      const actions = stats ? stats.actions : [];

      const dateObj = parseLocalDate(dayStr);
      const label = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const dateFull = dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

      return {
        label,
        dateStr: dateFull,
        xpEarned,
        value: chartMode === 'daily' ? xpEarned : cumulativeXp,
        actions
      };
    });
  };

  const chartPoints = getChartPoints();

  // Build SVG path for growth area/line chart
  const buildSvgPath = (width: number, height: number) => {
    if (chartPoints.length === 0) return { line: '', area: '', points: [], yMin: 0, yMax: 100, bottomY: 165, gridYValues: [], paddingL: 35, paddingR: 25, getYCoords: (v: number) => 0 };

    const paddingT = 20;
    const paddingB = 35; // space at the bottom for labels
    const paddingL = 35; // space on the left for Y-axis labels
    const paddingR = 25;

    const usableW = width - paddingL - paddingR;
    const usableH = height - paddingT - paddingB;

    const xMax = chartPoints.length - 1;
    const values = chartPoints.map(d => d.value);
    const yMin = chartMode === 'daily' ? 0 : Math.min(0, ...values);
    let yMax = Math.max(...values);
    if (yMax === yMin) {
      yMax = yMin + 100;
    }
    const yRange = yMax - yMin;

    const getXCoords = (index: number) => paddingL + (xMax === 0 ? usableW / 2 : (index / xMax) * usableW);
    const getYCoords = (val: number) => paddingT + usableH - ((val - yMin) / yRange) * usableH;

    const points = chartPoints.map((d, i) => ({
      x: getXCoords(i),
      y: getYCoords(d.value),
      xpEarned: d.xpEarned,
      value: d.value,
      label: d.label,
      dateStr: d.dateStr,
      actions: d.actions
    }));

    const linePoints = points.map(pt => `${pt.x},${pt.y}`).join(' L ');
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    const bottomY = paddingT + usableH;

    const areaPoints = `M ${firstX},${bottomY} L ${linePoints} L ${lastX},${bottomY} Z`;
    const linePath = `M ${linePoints}`;

    const gridYValues = [yMin, yMin + yRange * 0.33, yMin + yRange * 0.66, yMax];

    return { 
      line: linePath, 
      area: areaPoints, 
      points, 
      yMin, 
      yMax, 
      bottomY,
      gridYValues,
      paddingL,
      paddingR,
      getYCoords
    };
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
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-gray-950 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-violet-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  {chartMode === 'daily' ? 'Daily XP Activity' : 'Cumulative XP Growth'}
                </h3>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Chart Mode Toggle */}
                <div className="flex rounded-lg bg-slate-950 p-0.5 border border-gray-900 text-[9px] font-black">
                  <button
                    onClick={() => setChartMode('daily')}
                    className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                      chartMode === 'daily' 
                        ? 'bg-violet-600/20 text-violet-400 font-extrabold' 
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Daily XP
                  </button>
                  <button
                    onClick={() => setChartMode('total')}
                    className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                      chartMode === 'total' 
                        ? 'bg-violet-600/20 text-violet-400 font-extrabold' 
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Total XP
                  </button>
                </div>

                {/* Timeframe Filter Tab */}
                <div className="flex rounded-lg bg-slate-950 p-0.5 border border-gray-900 text-[9px] font-black">
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
            </div>

            {/* SVG Cumulative Growth Area Chart */}
            <div className="relative h-56 bg-slate-950/80 rounded-xl border border-gray-900 flex items-center justify-center p-2 select-none">
              {loading ? (
                <div className="w-6 h-6 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
              ) : chartPoints.length === 0 ? (
                <div className="text-center text-[10px] text-gray-600">No activity logged within this timeframe.</div>
              ) : (
                <>
                  <svg viewBox="0 0 500 200" className="w-full h-full">
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Y-axis Grid Lines & Labels */}
                    {svgData.gridYValues.map((val, idx) => {
                      const y = svgData.getYCoords(val);
                      return (
                        <g key={idx} className="opacity-40">
                          <line 
                            x1={svgData.paddingL} 
                            y1={y} 
                            x2={500 - svgData.paddingR} 
                            y2={y} 
                            stroke="#1e293b" 
                            strokeWidth="0.5" 
                            strokeDasharray="3,3" 
                          />
                          <text 
                            x={svgData.paddingL - 6} 
                            y={y + 3} 
                            fill="#64748b" 
                            fontSize="8" 
                            fontWeight="600"
                            textAnchor="end"
                          >
                            {Math.round(val)}
                          </text>
                        </g>
                      );
                    })}

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
                      <circle 
                        key={i} 
                        cx={pt.x} 
                        cy={pt.y} 
                        r="3" 
                        fill="#8b5cf6" 
                        stroke="#fff" 
                        strokeWidth="1" 
                        className="transition-all duration-200 hover:r-5 cursor-crosshair"
                        onMouseEnter={() => setHoveredPoint(pt)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    ))}

                    {/* X-axis Labels */}
                    {svgData.points.map((pt, i) => {
                      // Show every label for today/week; sparse labels for month/all
                      const showLabel = 
                        timeFilter === 'today' || 
                        timeFilter === 'week' || 
                        (timeFilter === 'month' && i % 5 === 0) ||
                        (timeFilter === 'all' && (
                          svgData.points.length <= 10 ||
                          (svgData.points.length <= 20 && i % 2 === 0) ||
                          (svgData.points.length <= 50 && i % 5 === 0) ||
                          (i % 10 === 0)
                        )) || i === svgData.points.length - 1;

                      if (!showLabel) return null;

                      return (
                        <text
                          key={i}
                          x={pt.x}
                          y={200 - 10}
                          fill="#64748b"
                          fontSize="8"
                          fontWeight="600"
                          textAnchor="middle"
                        >
                          {pt.label}
                        </text>
                      );
                    })}
                  </svg>

                  {/* Interactive Premium Tooltip */}
                  {hoveredPoint && (
                    <div 
                      className="absolute z-30 p-2.5 rounded-lg bg-slate-950/95 border border-gray-800 text-[10px] text-gray-300 shadow-xl pointer-events-none transition-all duration-150"
                      style={{ 
                        left: `${(hoveredPoint.x / 500) * 100}%`, 
                        top: hoveredPoint.y < 60 ? `${(hoveredPoint.y / 200) * 100 + 10}%` : `${(hoveredPoint.y / 200) * 100 - 10}%`,
                        transform: hoveredPoint.y < 60 ? 'translate(-50%, 0)' : 'translate(-50%, -100%)'
                      }}
                    >
                      <div className="font-extrabold text-white mb-0.5">{hoveredPoint.dateStr}</div>
                      <div className="text-violet-400 font-bold mb-1">
                        {chartMode === 'daily' 
                          ? `+${hoveredPoint.xpEarned} XP Earned` 
                          : `${hoveredPoint.value} Total XP`}
                      </div>
                      {hoveredPoint.actions && hoveredPoint.actions.length > 0 ? (
                        <div className="space-y-0.5 max-w-[150px]">
                          <div className="text-[8px] text-gray-500 uppercase font-bold">Activities:</div>
                          <div className="max-h-[60px] overflow-y-auto pr-0.5 no-scrollbar">
                            {hoveredPoint.actions.map((act: string, idx: number) => (
                              <div key={idx} className="text-gray-400 truncate font-medium">• {act}</div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[8px] text-gray-500 italic">No activity logged</div>
                      )}
                    </div>
                  )}
                </>
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
