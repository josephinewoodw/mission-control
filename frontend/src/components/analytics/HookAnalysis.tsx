// components/analytics/HookAnalysis.tsx
// Hook analysis — table sorted by reach + bar chart of avg reach by hook type.

import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import type { Post, HookStat } from '../../hooks/useAnalyticsData'

const HOOK_TYPE_COLORS: Record<string, string> = {
  'Question': '#60a5fa',
  'Warning': '#ef4444',
  'Statistic': '#fbbf24',
  'Personal': '#a855f7',
  'Other': '#6b7280',
}

const HOOK_TYPE_BADGE: Record<string, string> = {
  'Question': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'Warning': 'bg-red-500/20 text-red-300 border-red-500/30',
  'Statistic': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'Personal': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'Other': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

type SortKey = 'reach' | 'shares' | 'saves' | 'engagement_rate' | 'published_at'

interface HookAnalysisProps {
  posts: Post[]
  hookStats: HookStat[]
  dateFilter?: { start: Date | null; end: Date | null }
}

export function HookAnalysis({ posts, hookStats, dateFilter }: HookAnalysisProps) {
  const [sortKey, setSortKey] = useState<SortKey>('reach')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [filterHookType, setFilterHookType] = useState<string | null>(null)

  let filtered = [...posts].filter(p => p.hook_text)

  if (filterHookType) {
    filtered = filtered.filter(p => p.hook_type === filterHookType)
  }

  if (dateFilter?.start || dateFilter?.end) {
    filtered = filtered.filter(p => {
      if (!p.published_at) return false
      const d = new Date(p.published_at)
      if (dateFilter.start && d < dateFilter.start) return false
      if (dateFilter.end && d > dateFilter.end) return false
      return true
    })
  }

  filtered.sort((a, b) => {
    let aVal: number | string, bVal: number | string
    switch (sortKey) {
      case 'reach': aVal = a.metrics.reach; bVal = b.metrics.reach; break
      case 'shares': aVal = a.metrics.shares; bVal = b.metrics.shares; break
      case 'saves': aVal = a.metrics.saves; bVal = b.metrics.saves; break
      case 'engagement_rate': aVal = a.metrics.engagement_rate; bVal = b.metrics.engagement_rate; break
      case 'published_at': aVal = a.published_at || ''; bVal = b.published_at || ''; break
      default: aVal = a.metrics.reach; bVal = b.metrics.reach
    }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const chartData = [...hookStats].sort((a, b) => b.avg_reach - a.avg_reach).map(h => ({
    name: h.hook_type,
    avg_reach: h.avg_reach,
    color: HOOK_TYPE_COLORS[h.hook_type] || '#6b7280',
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-card border border-border rounded-lg px-3 py-2 text-xs">
          <p className="text-gray-300 font-medium">{label}</p>
          <p className="text-fern">Avg reach: {payload[0].value.toLocaleString()}</p>
        </div>
      )
    }
    return null
  }

  function SortHeader({ label, sortK }: { label: string; sortK: SortKey }) {
    const active = sortKey === sortK
    return (
      <th
        className="px-3 py-2 text-right text-xs text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-300 select-none"
        onClick={() => handleSort(sortK)}
      >
        {label}
        {active && <span className="ml-1 text-fern">{sortDir === 'desc' ? '↓' : '↑'}</span>}
      </th>
    )
  }

  return (
    <div className="space-y-5">
      {/* Hook type filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterHookType(null)}
          className={`px-3 py-1 text-xs rounded-full border transition-colors ${
            !filterHookType ? 'bg-fern/15 text-fern border-fern/30' : 'bg-bg-dark text-gray-400 border-border hover:text-gray-300'
          }`}
        >
          All
        </button>
        {Object.keys(HOOK_TYPE_COLORS).map(type => (
          <button
            key={type}
            onClick={() => setFilterHookType(filterHookType === type ? null : type)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              filterHookType === type
                ? HOOK_TYPE_BADGE[type]
                : 'bg-bg-dark text-gray-400 border-border hover:text-gray-300'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase tracking-wider">Hook</th>
              <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase tracking-wider">Category</th>
              <SortHeader label="Reach" sortK="reach" />
              <SortHeader label="Shares" sortK="shares" />
              <SortHeader label="Saves" sortK="saves" />
              <SortHeader label="ER%" sortK="engagement_rate" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filtered.map(post => {
              const hookBadge = HOOK_TYPE_BADGE[post.hook_type || 'Other'] || HOOK_TYPE_BADGE['Other']
              return (
                <tr key={post.id} className="hover:bg-bg-dark/50 transition-colors">
                  <td className="px-3 py-2 max-w-[320px]">
                    <span className="text-xs text-gray-200 line-clamp-2">{post.hook_text || '—'}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-1.5 py-0.5 text-[0.6rem] font-medium rounded border ${hookBadge}`}>
                      {post.hook_type || 'Other'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">{post.category}</td>
                  <td className="px-3 py-2 text-right text-xs font-mono text-gray-200">{post.metrics.reach.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-xs font-mono text-gray-400">{post.metrics.shares}</td>
                  <td className="px-3 py-2 text-right text-xs font-mono text-gray-400">{post.metrics.saves}</td>
                  <td className="px-3 py-2 text-right text-xs font-mono">
                    <span className={post.metrics.engagement_rate >= 6 ? 'text-fern' : 'text-gray-400'}>
                      {post.metrics.engagement_rate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-6 text-center text-gray-500 text-xs">
                  No posts with this hook type
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bar chart — avg reach by hook type */}
      {chartData.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">Avg Reach by Hook Type</div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v.toLocaleString()} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(168,216,168,0.05)' }} />
                <Bar dataKey="avg_reach" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
