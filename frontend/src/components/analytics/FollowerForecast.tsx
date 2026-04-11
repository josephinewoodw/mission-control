// components/analytics/FollowerForecast.tsx
// Follower forecast — 3-scenario projection chart with milestone markers.

import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { Forecast, FollowerSnapshot } from '../../hooks/useAnalyticsData'

function formatDateShort(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

interface FollowerForecastProps {
  forecast: Forecast
  snapshots: FollowerSnapshot[]
  currentFollowers: number
}

export function FollowerForecast({ forecast, snapshots, currentFollowers }: FollowerForecastProps) {
  const [showConservative, setShowConservative] = useState(true)
  const [showModerate, setShowModerate] = useState(true)
  const [showOptimistic, setShowOptimistic] = useState(true)
  // Build combined chart data: historical + forecast
  // Historical: use deduplicated monthly snapshots
  const snapshotMap = new Map<string, number>()
  for (const s of snapshots) {
    const key = s.captured_at.substring(0, 7) // YYYY-MM
    if (!snapshotMap.has(key)) snapshotMap.set(key, s.follower_count)
  }

  const historical = [...snapshotMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({
      date: month,
      displayDate: formatDateShort(month + '-01'),
      historical: count,
      conservative: null as number | null,
      moderate: null as number | null,
      optimistic: null as number | null,
    }))

  const projectionData = forecast.projectionPoints.map(p => ({
    date: p.date.substring(0, 7),
    displayDate: formatDateShort(p.date),
    historical: null as number | null,
    conservative: p.conservative,
    moderate: p.moderate,
    optimistic: p.optimistic,
  }))

  // Merge: last historical point connects to first forecast point
  const allData = [...historical, ...projectionData]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null
    return (
      <div className="bg-bg-card border border-border rounded-lg px-3 py-2 text-xs space-y-1">
        <p className="text-gray-300 font-medium">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color }}>
            {p.name}: {p.value?.toLocaleString()}
          </p>
        ))}
      </div>
    )
  }

  // Determine chart Y max to filter milestones that are in range
  const chartYMax = Math.max(
    currentFollowers,
    ...allData.map(d => Math.max(
      d.historical ?? 0,
      d.conservative ?? 0,
      d.moderate ?? 0,
      d.optimistic ?? 0,
    ))
  )

  // Show milestones that are below the chart ceiling (with 10% buffer below top)
  const ALL_MILESTONES = [5000, 10000, 25000, 50000, 100000]
  const visibleMilestones = ALL_MILESTONES.filter(m => m > currentFollowers && m <= chartYMax * 1.05)

  return (
    <div className="space-y-5">
      {/* Scenario toggles */}
      <div className="flex flex-wrap gap-3 items-center">
        <span className="text-xs text-gray-500">Scenarios:</span>
        {[
          { key: 'conservative' as const, label: 'Conservative', color: '#6b7280', show: showConservative, toggle: setShowConservative },
          { key: 'moderate' as const, label: 'Moderate', color: '#a8d8a8', show: showModerate, toggle: setShowModerate },
          { key: 'optimistic' as const, label: 'Optimistic', color: '#fbbf24', show: showOptimistic, toggle: setShowOptimistic },
        ].map(s => (
          <button
            key={s.key}
            onClick={() => s.toggle(!s.show)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg border transition-all ${
              s.show ? 'border-border/70' : 'border-border/30 opacity-40'
            }`}
          >
            <span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: s.color }} />
            <span style={{ color: s.show ? s.color : '#6b7280' }}>{s.label}</span>
            <span className="text-gray-600 text-[0.6rem]">+{s.key === 'conservative' ? forecast.conservativeRate.toFixed(1) : s.key === 'moderate' ? forecast.moderateRate.toFixed(1) : forecast.optimisticRate.toFixed(1)}/day</span>
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-64 min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart data={allData} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" vertical={false} />
            <XAxis dataKey="displayDate" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v.toString()}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Milestone reference lines */}
            {visibleMilestones.map(m => (
              <ReferenceLine
                key={m}
                y={m}
                stroke="#3d6b3d"
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{
                  value: m >= 1000 ? `${m/1000}K` : m.toString(),
                  position: 'insideTopRight',
                  fill: '#5a9e5a',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />
            ))}

            {/* Historical line */}
            <Line
              type="monotone"
              dataKey="historical"
              name="Historical"
              stroke="#a8c8d8"
              strokeWidth={2}
              dot={false}
              connectNulls={false}
            />

            {/* Forecast lines */}
            {showConservative && (
              <Line
                type="monotone"
                dataKey="conservative"
                name="Conservative"
                stroke="#6b7280"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                connectNulls={false}
              />
            )}
            {showModerate && (
              <Line
                type="monotone"
                dataKey="moderate"
                name="Moderate"
                stroke="#a8d8a8"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
            )}
            {showOptimistic && (
              <Line
                type="monotone"
                dataKey="optimistic"
                name="Optimistic"
                stroke="#fbbf24"
                strokeWidth={1.5}
                strokeDasharray="6 2"
                dot={false}
                connectNulls={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Disclaimer — only shown if backend provides one */}
      {forecast.disclaimer && (
        <div className="text-xs text-gray-600 italic">{forecast.disclaimer}</div>
      )}
    </div>
  )
}
