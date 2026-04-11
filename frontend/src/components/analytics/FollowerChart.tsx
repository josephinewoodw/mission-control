// components/analytics/FollowerChart.tsx
// Follower trends — interactive time series with post markers + daily delta bar chart.

import { useState } from 'react'
import {
  ComposedChart, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from 'recharts'
import type { FollowerSnapshot, FollowerStats, Post } from '../../hooks/useAnalyticsData'

function formatDateShort(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

interface FollowerChartProps {
  snapshots: FollowerSnapshot[]
  stats: FollowerStats
  posts: Post[]
  onJumpToPost?: (postId: string) => void
  compact?: boolean
}

export function FollowerChart({ snapshots, stats, posts, onJumpToPost, compact = false }: FollowerChartProps) {
  const [chartMode, setChartMode] = useState<'absolute' | 'delta'>('absolute')

  // Deduplicate and sort snapshots by date
  const snapshotMap = new Map<string, FollowerSnapshot>()
  for (const s of snapshots) {
    const dateKey = s.captured_at.split('T')[0]
    if (!snapshotMap.has(dateKey) || s.captured_at > snapshotMap.get(dateKey)!.captured_at) {
      snapshotMap.set(dateKey, s)
    }
  }
  const sorted = [...snapshotMap.values()].sort((a, b) => a.captured_at.localeCompare(b.captured_at))

  // Match posts to follower data points (within same day)
  function getPostsForDate(dateStr: string): Post[] {
    return posts.filter(p => {
      if (!p.published_at) return false
      return p.published_at.split('T')[0] === dateStr.split('T')[0]
    })
  }

  // Build chart data
  const chartData = sorted.map(s => {
    const dateKey = s.captured_at.split('T')[0]
    const dayPosts = getPostsForDate(dateKey)
    return {
      date: dateKey,
      displayDate: formatDateShort(s.captured_at),
      followers: s.follower_count,
      delta: s.daily_delta,
      hasPost: dayPosts.length > 0,
      posts: dayPosts,
    }
  })

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null
    const d = payload[0].payload
    return (
      <div className="bg-bg-card border border-border rounded-lg px-3 py-2 text-xs space-y-1 max-w-[240px]">
        <p className="text-gray-300 font-medium">{label}</p>
        {chartMode === 'absolute' ? (
          <p className="text-fern">{d.followers?.toLocaleString()} followers</p>
        ) : (
          <p className={d.delta >= 0 ? 'text-fern' : 'text-blocked'}>
            {d.delta >= 0 ? '+' : ''}{d.delta} followers
          </p>
        )}
        {d.posts?.length > 0 && (
          <div className="border-t border-border/50 pt-1 mt-1">
            {d.posts.map((p: Post) => (
              <p key={p.id} className="text-gray-400 truncate">
                Posted: {(p.hook_text || p.caption || '').substring(0, 50)}
              </p>
            ))}
          </div>
        )}
      </div>
    )
  }

  const DotWithPost = (props: any) => {
    const { cx, cy, payload } = props
    if (!payload.hasPost) return null
    return (
      <g>
        <circle cx={cx} cy={cy} r={5} fill="#a8d8a8" stroke="#1a1a2e" strokeWidth={2} />
      </g>
    )
  }

  // Shared chart content (toggle buttons + chart + legend)
  const chartContent = (
    <div className="flex-1 min-w-0 space-y-3">
      <div className="flex gap-2">
        {(['absolute', 'delta'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setChartMode(mode)}
            className={`px-3 py-1 text-xs rounded-lg border transition-colors capitalize ${
              chartMode === mode
                ? 'bg-fern/15 text-fern border-fern/30'
                : 'bg-bg-dark text-gray-400 border-border hover:text-gray-300'
            }`}
          >
            {mode === 'absolute' ? 'Follower Count' : 'Daily Change'}
          </button>
        ))}
      </div>

      {chartMode === 'absolute' ? (
        <div className="h-52 min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" vertical={false} />
              <XAxis dataKey="displayDate" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v.toLocaleString()} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="followers"
                stroke="#a8d8a8"
                strokeWidth={2}
                dot={<DotWithPost />}
                activeDot={{ r: 4, fill: '#a8d8a8' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-52 min-w-0">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={chartData.filter(d => d.delta !== null)} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" vertical={false} />
              <XAxis dataKey="displayDate" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(168,216,168,0.05)' }} />
              <ReferenceLine y={0} stroke="#2a2a4a" />
              <Bar dataKey="delta" radius={[2, 2, 0, 0]}>
                {chartData.filter(d => d.delta !== null).map((entry, i) => (
                  <Cell key={i} fill={(entry.delta ?? 0) >= 0 ? '#4a9e4a' : '#e74c3c'} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-fern inline-block" />
          <span>Post published on this day</span>
        </div>
      </div>
    </div>
  )

  if (compact) {
    // Compact layout: stats as a tight row above the chart
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <div className="bg-bg-dark rounded-lg border border-border px-3 py-2">
            <div className="text-[0.6rem] text-gray-500 uppercase tracking-widest">Current</div>
            <div className="text-base font-semibold text-gray-100 leading-tight">{stats.current.toLocaleString()}</div>
          </div>
          <div className="bg-bg-dark rounded-lg border border-border px-3 py-2">
            <div className="text-[0.6rem] text-gray-500 uppercase tracking-widest">7d</div>
            <div className={`text-base font-semibold leading-tight ${(stats.change_7d || 0) >= 0 ? 'text-fern' : 'text-blocked'}`}>
              {stats.change_7d !== null ? `${stats.change_7d >= 0 ? '+' : ''}${stats.change_7d}` : '—'}
            </div>
          </div>
          <div className="bg-bg-dark rounded-lg border border-border px-3 py-2">
            <div className="text-[0.6rem] text-gray-500 uppercase tracking-widest">30d</div>
            <div className={`text-base font-semibold leading-tight ${(stats.change_30d || 0) >= 0 ? 'text-fern' : 'text-blocked'}`}>
              {stats.change_30d !== null ? `${stats.change_30d >= 0 ? '+' : ''}${stats.change_30d}` : '—'}
            </div>
          </div>
          <div className="bg-bg-dark rounded-lg border border-border px-3 py-2">
            <div className="text-[0.6rem] text-gray-500 uppercase tracking-widest">Daily avg</div>
            <div className="text-base font-semibold text-gray-200 leading-tight">
              {stats.avg_daily_gain !== null ? `+${stats.avg_daily_gain}` : '—'}
            </div>
          </div>
          {stats.best_day && (
            <div className="bg-bg-dark rounded-lg border border-fern/20 px-3 py-2">
              <div className="text-[0.6rem] text-gray-500 uppercase tracking-widest">Best day</div>
              <div className="text-base font-semibold text-fern leading-tight">+{stats.best_day.delta}</div>
              <div className="text-[0.6rem] text-gray-500">{formatDateShort(stats.best_day.date)}</div>
            </div>
          )}
        </div>
        {chartContent}
      </div>
    )
  }

  // Full layout: stats sidebar beside the chart
  return (
    <div className="flex items-start gap-6">
      <div className="shrink-0 grid grid-cols-2 gap-3 w-[280px]">
        <div className="bg-bg-dark rounded-xl border border-border p-3">
          <div className="text-xs text-gray-500 mb-1">Current</div>
          <div className="text-xl font-semibold text-gray-100">{stats.current.toLocaleString()}</div>
          <div className="text-xs text-gray-500">followers</div>
        </div>
        <div className="bg-bg-dark rounded-xl border border-border p-3">
          <div className="text-xs text-gray-500 mb-1">7-day change</div>
          <div className={`text-xl font-semibold ${(stats.change_7d || 0) >= 0 ? 'text-fern' : 'text-blocked'}`}>
            {stats.change_7d !== null ? `${stats.change_7d >= 0 ? '+' : ''}${stats.change_7d}` : '—'}
          </div>
        </div>
        <div className="bg-bg-dark rounded-xl border border-border p-3">
          <div className="text-xs text-gray-500 mb-1">30-day change</div>
          <div className={`text-xl font-semibold ${(stats.change_30d || 0) >= 0 ? 'text-fern' : 'text-blocked'}`}>
            {stats.change_30d !== null ? `${stats.change_30d >= 0 ? '+' : ''}${stats.change_30d}` : '—'}
          </div>
        </div>
        <div className="bg-bg-dark rounded-xl border border-border p-3">
          <div className="text-xs text-gray-500 mb-1">Daily avg (30d)</div>
          <div className="text-xl font-semibold text-gray-200">
            {stats.avg_daily_gain !== null ? `+${stats.avg_daily_gain}` : '—'}
          </div>
        </div>
        {stats.best_day && (
          <div className="bg-bg-dark rounded-xl border border-fern/20 p-3 col-span-2">
            <div className="text-xs text-gray-500 mb-1">Best day</div>
            <div className="text-fern font-semibold">+{stats.best_day.delta} followers</div>
            <div className="text-xs text-gray-500">{formatDateShort(stats.best_day.date)}</div>
          </div>
        )}
      </div>
      {chartContent}
    </div>
  )
}
