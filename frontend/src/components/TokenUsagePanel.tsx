import type { TokenStats } from '../types'

interface TokenUsagePanelProps {
  tokenStats: TokenStats | null
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatTokensShort(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function modelLabel(modelId: string): string {
  if (modelId.includes('opus')) return 'Opus'
  if (modelId.includes('sonnet')) return 'Sonnet'
  if (modelId.includes('haiku')) return 'Haiku'
  return modelId
}

const MODEL_COLORS: Record<string, string> = {
  'claude-opus-4-6': '#4ade80',
  'claude-sonnet-4-6': '#60a5fa',
  'claude-haiku-4-5-20251001': '#f87171',
}

function modelColor(modelId: string): string {
  return MODEL_COLORS[modelId] ?? '#9ca3af'
}

const AGENT_COLORS: Record<string, string> = {
  fern: '#4ade80',
  scout: '#60a5fa',
  reed: '#f87171',
  sentinel: '#a78bfa',
  timber: '#fb923c',
}

const CATEGORY_LABELS: Record<string, string> = {
  files: 'Files',
  exec: 'Exec',
  search: 'Search',
  content: 'Content',
  agents: 'Agents',
  notify: 'Notify',
  planning: 'Plan',
  other: 'Other',
}

// ── SVG Line Chart ──

interface LineChartProps {
  days: Array<{ date: string; byModel: Record<string, number>; total: number }>
  width?: number
  height?: number
}

function LineChart({ days, width = 480, height = 120 }: LineChartProps) {
  // Filter out days with zero tokens from view, but keep grid aligned
  const models = Array.from(
    new Set(days.flatMap(d => Object.keys(d.byModel)))
  ).filter(m => days.some(d => (d.byModel[m] ?? 0) > 0))

  const maxVal = Math.max(...days.map(d => d.total), 1)

  const PAD_LEFT = 36
  const PAD_RIGHT = 8
  const PAD_TOP = 8
  const PAD_BOTTOM = 20

  const chartW = width - PAD_LEFT - PAD_RIGHT
  const chartH = height - PAD_TOP - PAD_BOTTOM

  function xPos(i: number): number {
    return PAD_LEFT + (i / Math.max(days.length - 1, 1)) * chartW
  }

  function yPos(val: number): number {
    return PAD_TOP + chartH - (val / maxVal) * chartH
  }

  function polyline(values: number[]): string {
    return values
      .map((v, i) => `${xPos(i)},${yPos(v)}`)
      .join(' ')
  }

  // Y axis labels
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0]

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      {/* Grid lines */}
      {yTicks.map((t) => {
        const y = PAD_TOP + chartH - t * chartH
        return (
          <g key={t}>
            <line
              x1={PAD_LEFT} y1={y} x2={width - PAD_RIGHT} y2={y}
              stroke="#2a2a3a" strokeWidth="0.5"
            />
            <text x={PAD_LEFT - 3} y={y + 3} fontSize="7" fill="#4b5563" textAnchor="end">
              {formatTokensShort(maxVal * t)}
            </text>
          </g>
        )
      })}

      {/* X axis labels — every 3rd day */}
      {days.map((d, i) => {
        if (i % 3 !== 0) return null
        return (
          <text key={d.date} x={xPos(i)} y={height - 4} fontSize="6" fill="#4b5563" textAnchor="middle">
            {d.date.slice(5)}
          </text>
        )
      })}

      {/* Total area (filled, subtle) */}
      {days.length > 1 && (
        <polygon
          points={[
            `${xPos(0)},${PAD_TOP + chartH}`,
            ...days.map((d, i) => `${xPos(i)},${yPos(d.total)}`),
            `${xPos(days.length - 1)},${PAD_TOP + chartH}`,
          ].join(' ')}
          fill="#4ade8010"
        />
      )}

      {/* Per-model lines */}
      {models.map((model) => {
        const values = days.map(d => d.byModel[model] ?? 0)
        return (
          <polyline
            key={model}
            points={polyline(values)}
            fill="none"
            stroke={modelColor(model)}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.85"
          />
        )
      })}

      {/* Total line */}
      <polyline
        points={polyline(days.map(d => d.total))}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="1"
        strokeDasharray="3,2"
        strokeLinejoin="round"
        opacity="0.3"
      />

      {/* Dots for last point */}
      {models.map((model) => {
        const lastVal = days[days.length - 1]?.byModel[model] ?? 0
        if (lastVal === 0) return null
        return (
          <circle
            key={model}
            cx={xPos(days.length - 1)}
            cy={yPos(lastVal)}
            r={2.5}
            fill={modelColor(model)}
          />
        )
      })}
    </svg>
  )
}

// ── Heatmap ──

interface HeatmapProps {
  heatmap: Record<string, Record<string, number>>
  agents: string[]
  categories: string[]
}

function Heatmap({ heatmap, agents, categories }: HeatmapProps) {
  // Find max value for color scaling
  const allValues = agents.flatMap(a => categories.map(c => heatmap[a]?.[c] ?? 0))
  const maxVal = Math.max(...allValues, 1)

  function cellOpacity(val: number): number {
    if (val === 0) return 0
    return 0.1 + (val / maxVal) * 0.85
  }

  function agentColor(agent: string): string {
    return AGENT_COLORS[agent] ?? '#9ca3af'
  }

  return (
    <div>
      {/* Column headers */}
      <div className="flex items-center gap-0.5 mb-1 ml-14">
        {categories.map(cat => (
          <div key={cat} className="flex-1 text-center text-[0.5rem] text-gray-600 uppercase tracking-wide">
            {CATEGORY_LABELS[cat] ?? cat}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-0.5">
        {agents.map(agent => (
          <div key={agent} className="flex items-center gap-0.5">
            {/* Agent label */}
            <div
              className="w-14 shrink-0 text-[0.6rem] font-medium capitalize pr-1 text-right"
              style={{ color: agentColor(agent) }}
            >
              {agent}
            </div>
            {/* Cells */}
            {categories.map(cat => {
              const val = heatmap[agent]?.[cat] ?? 0
              const opacity = cellOpacity(val)
              return (
                <div
                  key={cat}
                  className="flex-1 h-5 rounded-sm flex items-center justify-center relative group"
                  style={{ backgroundColor: opacity > 0 ? `${agentColor(agent)}${Math.round(opacity * 255).toString(16).padStart(2, '0')}` : '#1a1a2a' }}
                  title={`${agent} / ${cat}: ${val.toLocaleString()} tool calls`}
                >
                  {val > 0 && (
                    <span className="text-[0.45rem] text-white/60 font-mono">
                      {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div className="mt-1.5 text-[0.5rem] text-gray-700 italic">
        Tool call counts from agents-observe · cell intensity = relative activity
      </div>
    </div>
  )
}

// ── Main panel ──

export function TokenUsagePanel({ tokenStats }: TokenUsagePanelProps) {
  if (!tokenStats) {
    return (
      <div className="bg-bg-card rounded-2xl border border-border overflow-hidden col-span-3">
        <div className="px-4 py-3 border-b border-border/50">
          <h3 className="text-xs text-gray-500 uppercase tracking-widest font-medium">
            Token Usage
          </h3>
        </div>
        <div className="p-6 text-center text-xs text-gray-600 italic">
          Loading token data...
        </div>
      </div>
    )
  }

  // Active day: today if has tokens, else yesterday
  const activeDay = tokenStats.today.total > 0 ? tokenStats.today : tokenStats.yesterday
  const activeDayLabel = activeDay.date === tokenStats.today.date ? 'Today' : 'Yesterday'

  // Trend vs weekly avg
  const trendRatio = tokenStats.weeklyAvg > 0 ? activeDay.total / tokenStats.weeklyAvg : null
  const trendPct = trendRatio != null ? Math.round((trendRatio - 1) * 100) : null

  // Chart data — only days with any tokens (and last 14)
  const chartDays = tokenStats.recentDays

  return (
    <div className="bg-bg-card rounded-2xl border border-border overflow-hidden col-span-3">
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <h3 className="text-xs text-gray-500 uppercase tracking-widest font-medium">
          Token Usage
        </h3>
        <span className="text-[0.6rem] text-gray-600">
          cached · updated {tokenStats.lastComputedDate}
        </span>
      </div>

      <div className="p-4 space-y-5">

        {/* Top row: daily summary + cumulative */}
        <div className="grid grid-cols-3 gap-4">

          {/* Current day summary */}
          <div className="space-y-2.5">
            <div>
              <div className="text-[0.6rem] text-gray-500 uppercase tracking-wider mb-0.5">{activeDayLabel}</div>
              <div className="text-2xl font-bold text-gray-200">
                {formatTokens(activeDay.total)}
              </div>
              {trendPct !== null && (
                <div className={`text-[0.65rem] mt-0.5 ${trendPct > 20 ? 'text-blocked' : trendPct < -20 ? 'text-working' : 'text-gray-500'}`}>
                  {trendPct > 0 ? '+' : ''}{trendPct}% vs 7-day avg ({formatTokensShort(tokenStats.weeklyAvg)}/day)
                </div>
              )}
            </div>

            {/* Model breakdown */}
            <div className="space-y-1.5">
              {Object.keys(activeDay.byModel).length === 0 ? (
                <div className="text-[0.65rem] text-gray-600 italic">No data for {activeDayLabel.toLowerCase()}</div>
              ) : (
                Object.entries(activeDay.byModel).map(([model, tokens]) => {
                  const pct = activeDay.total > 0 ? (tokens / activeDay.total) * 100 : 0
                  return (
                    <div key={model}>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-[0.65rem]" style={{ color: modelColor(model) }}>
                          {modelLabel(model)}
                        </span>
                        <span className="text-[0.65rem] text-gray-400 font-mono">
                          {formatTokens(tokens)} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-1 bg-bg-dark rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: modelColor(model) }}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Activity */}
            {'messages' in activeDay && (
              <div className="text-[0.6rem] text-gray-600 space-y-0.5 pt-1 border-t border-border/30">
                <div className="flex justify-between">
                  <span>Messages</span>
                  <span className="font-mono">{(activeDay as typeof tokenStats.today).messages?.toLocaleString() ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tool calls</span>
                  <span className="font-mono">{(activeDay as typeof tokenStats.today).toolCalls?.toLocaleString() ?? '—'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Cumulative all-time */}
          <div className="col-span-2">
            <div className="text-[0.6rem] text-gray-500 uppercase tracking-wider mb-2">All-time cumulative</div>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(tokenStats.cumulative).map(([model, stats]) => (
                <div key={model} className="bg-bg-dark rounded-lg p-2.5 space-y-1">
                  <div className="text-[0.65rem] font-semibold" style={{ color: modelColor(model) }}>
                    {modelLabel(model)}
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                    <span className="text-[0.58rem] text-gray-600">Input</span>
                    <span className="text-[0.58rem] text-gray-400 font-mono text-right">{formatTokens(stats.input)}</span>
                    <span className="text-[0.58rem] text-gray-600">Output</span>
                    <span className="text-[0.58rem] text-gray-400 font-mono text-right">{formatTokens(stats.output)}</span>
                    <span className="text-[0.58rem] text-gray-600">Cache read</span>
                    <span className="text-[0.58rem] text-gray-400 font-mono text-right">{formatTokens(stats.cacheRead)}</span>
                    <span className="text-[0.58rem] text-gray-600">Cache write</span>
                    <span className="text-[0.58rem] text-gray-400 font-mono text-right">{formatTokens(stats.cacheCreate)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2 flex gap-4 text-[0.6rem] text-gray-600">
              <span>Total sessions: <span className="text-gray-400 font-mono">{tokenStats.totalSessions.toLocaleString()}</span></span>
              <span>Total messages: <span className="text-gray-400 font-mono">{tokenStats.totalMessages.toLocaleString()}</span></span>
            </div>
          </div>
        </div>

        {/* Line chart */}
        <div className="border-t border-border/30 pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[0.6rem] text-gray-500 uppercase tracking-wider">Daily trend (14 days)</div>
            {/* Legend */}
            <div className="flex gap-3">
              {['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'].map(m => (
                <div key={m} className="flex items-center gap-1">
                  <div className="w-3 h-0.5 rounded" style={{ backgroundColor: modelColor(m) }} />
                  <span className="text-[0.55rem] text-gray-600">{modelLabel(m)}</span>
                </div>
              ))}
            </div>
          </div>
          <LineChart days={chartDays} height={110} />
        </div>

        {/* Heatmap */}
        <div className="border-t border-border/30 pt-4">
          <div className="text-[0.6rem] text-gray-500 uppercase tracking-wider mb-2">
            Agent activity heatmap — tool calls by category
          </div>
          <Heatmap
            heatmap={tokenStats.heatmap}
            agents={tokenStats.heatmapAgents}
            categories={tokenStats.heatmapCategories}
          />
        </div>

      </div>
    </div>
  )
}
