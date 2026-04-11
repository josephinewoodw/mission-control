// components/analytics/CategoryCards.tsx
// Category/series breakdown — card grid + bar chart comparing avg reach by category.

import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import type { CategoryStats } from '../../hooks/useAnalyticsData'

const CATEGORY_COLORS: Record<string, string> = {
  'Warning': '#ef4444',
  'Educational': '#60a5fa',
  'Current Events': '#fbbf24',
  'Opinion': '#a855f7',
  'Other': '#6b7280',
  'Uncategorized': '#4b5563',
}

const CARD_BORDER_COLORS: Record<string, string> = {
  'Warning': 'border-red-500/30 hover:border-red-500/50',
  'Educational': 'border-blue-500/30 hover:border-blue-500/50',
  'Current Events': 'border-yellow-500/30 hover:border-yellow-500/50',
  'Opinion': 'border-purple-500/30 hover:border-purple-500/50',
  'Other': 'border-gray-500/30 hover:border-gray-500/50',
  'Uncategorized': 'border-gray-600/30 hover:border-gray-600/50',
}

interface CategoryCardsProps {
  categories: CategoryStats[]
  onSelectCategory?: (category: string | null) => void
  selectedCategory?: string | null
}

export function CategoryCards({ categories, onSelectCategory, selectedCategory }: CategoryCardsProps) {
  const [metricView, setMetricView] = useState<'average' | 'total'>('average')

  const sorted = [...categories].sort((a, b) => b.avg_reach - a.avg_reach)

  const chartData = sorted.map(c => ({
    name: c.category.split(' / ')[0], // shorten for chart
    reach: metricView === 'average' ? c.avg_reach : c.total_reach,
    color: CATEGORY_COLORS[c.category] || '#6b7280',
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-bg-card border border-border rounded-lg px-3 py-2 text-xs">
          <p className="text-gray-300 font-medium">{label}</p>
          <p className="text-fern">{metricView === 'average' ? 'Avg' : 'Total'} reach: {payload[0].value.toLocaleString()}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-5">
      {/* Metric toggle */}
      <div className="flex items-center gap-2">
        {(['average', 'total'] as const).map(v => (
          <button
            key={v}
            onClick={() => setMetricView(v)}
            className={`px-3 py-1 text-xs rounded-lg border transition-colors capitalize ${
              metricView === v
                ? 'bg-fern/15 text-fern border-fern/30'
                : 'bg-bg-dark text-gray-400 border-border hover:text-gray-300'
            }`}
          >
            {v} metrics
          </button>
        ))}
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
        {sorted.map(cat => {
          const isSelected = selectedCategory === cat.category
          const borderColor = CARD_BORDER_COLORS[cat.category] || CARD_BORDER_COLORS['Uncategorized']
          const accentColor = CATEGORY_COLORS[cat.category] || '#6b7280'

          return (
            <div
              key={cat.category}
              className={`bg-bg-dark rounded-xl border p-4 cursor-pointer transition-all ${borderColor} ${
                isSelected ? 'ring-1 ring-fern/30' : ''
              }`}
              onClick={() => onSelectCategory?.(isSelected ? null : cat.category)}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: accentColor }}
                  />
                  <span className="text-sm font-medium text-gray-200">{cat.category}</span>
                </div>
                <span className="text-xs text-gray-500">{cat.post_count} post{cat.post_count !== 1 ? 's' : ''}</span>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Avg Reach</div>
                  <div className="text-base font-semibold text-gray-200">{cat.avg_reach.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Avg ER</div>
                  <div className="text-base font-semibold text-gray-200">{cat.avg_engagement_rate.toFixed(1)}%</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Shares</div>
                  <div className="text-sm text-gray-300">{cat.total_shares}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Saves</div>
                  <div className="text-sm text-gray-300">{cat.total_saves}</div>
                </div>
              </div>

              {/* Best/worst */}
              {cat.best && (
                <div className="border-t border-border/50 pt-2 space-y-1">
                  <div className="text-xs text-gray-500">
                    Best: <span className="text-fern">{cat.best.reach.toLocaleString()}</span> reach
                    <span className="text-gray-600 ml-1">— {cat.best.title.substring(0, 40)}{cat.best.title.length > 40 ? '...' : ''}</span>
                  </div>
                  {cat.worst && cat.worst.id !== cat.best.id && (
                    <div className="text-xs text-gray-500">
                      Worst: <span className="text-blocked">{cat.worst.reach.toLocaleString()}</span> reach
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Bar chart */}
      {chartData.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">
            {metricView === 'average' ? 'Average' : 'Total'} Reach by Category
          </div>
          <div className="h-44 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => v.toLocaleString()}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(168,216,168,0.05)' }} />
                <Bar dataKey="reach" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} fillOpacity={0.8} />
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
