// components/analytics/FollowerForecast.tsx
// Follower forecast — 3-scenario projection chart with milestone markers.

import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
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
  const [milestoneRef, setMilestoneRef] = useState<'moderate' | 'conservative' | 'optimistic'>('moderate')

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

  // Next milestone based on selected reference line
  const nextMilestone = forecast.milestoneTable[0]

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

  // Milestone reference lines (for upcoming milestones)
  const upcomingMilestones = forecast.milestoneTable.filter(m => m.milestone <= 10000)

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
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
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
            {upcomingMilestones.map(m => (
              <ReferenceLine
                key={m.milestone}
                y={m.milestone}
                stroke="#2a2a4a"
                strokeDasharray="4 4"
                label={{
                  value: m.milestone >= 1000 ? `${m.milestone/1000}k` : m.milestone.toString(),
                  position: 'right',
                  fill: '#4b5563',
                  fontSize: 10,
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

      {/* Confidence disclaimer */}
      <div className="text-xs text-gray-600 italic">{forecast.disclaimer}</div>

      {/* Milestone table */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="text-xs text-gray-500 uppercase tracking-wider">Milestone Projections</div>
          <div className="flex gap-2">
            {(['moderate', 'conservative', 'optimistic'] as const).map(ref => (
              <button
                key={ref}
                onClick={() => setMilestoneRef(ref)}
                className={`px-2 py-0.5 text-[0.6rem] rounded border transition-colors capitalize ${
                  milestoneRef === ref
                    ? 'bg-fern/15 text-fern border-fern/30'
                    : 'bg-bg-dark text-gray-500 border-border hover:text-gray-400'
                }`}
              >
                {ref}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider">Milestone</th>
                <th className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider">Conservative</th>
                <th className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider">Moderate</th>
                <th className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider">Optimistic</th>
                <th className="px-3 py-2 text-left text-gray-500 uppercase tracking-wider">Days Away ({milestoneRef})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {forecast.milestoneTable.map(m => {
                const daysKey = `${milestoneRef}_days` as 'conservative_days' | 'moderate_days' | 'optimistic_days'
                const daysAway = m[daysKey]
                const isPrimary = m.milestone === 5000 || m.milestone === 10000
                return (
                  <tr key={m.milestone} className={`hover:bg-bg-dark/50 ${isPrimary ? 'bg-fern/5' : ''}`}>
                    <td className={`px-3 py-2 font-medium ${isPrimary ? 'text-fern' : 'text-gray-300'}`}>
                      {m.milestone >= 1000 ? `${m.milestone/1000}k` : m.milestone}
                      {isPrimary && <span className="ml-1 text-[0.6rem] text-fern/60">★</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-400">{m.conservative_date || '—'}</td>
                    <td className="px-3 py-2 text-gray-300">{m.moderate_date || '—'}</td>
                    <td className="px-3 py-2 text-gray-400">{m.optimistic_date || '—'}</td>
                    <td className={`px-3 py-2 font-mono ${daysAway && daysAway < 180 ? 'text-fern' : 'text-gray-500'}`}>
                      {daysAway !== null ? `${daysAway}d` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
