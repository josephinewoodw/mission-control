import type { ContextUsage, TokenStats } from '../types'
import type { LiveTokenStats } from '../hooks/useOperationalData'

interface ContextWindowSidebarProps {
  usage: ContextUsage
  tokenStats: TokenStats | null
  liveTokenStats: LiveTokenStats | null
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function fillColor(percent: number): string {
  if (percent < 50) return 'bg-working'
  if (percent < 75) return 'bg-reed'
  return 'bg-blocked'
}

function fillTextColor(percent: number): string {
  if (percent < 50) return 'text-working'
  if (percent < 75) return 'text-reed'
  return 'text-blocked'
}

/** Short display name for model IDs */
function modelLabel(modelId: string): string {
  if (modelId.includes('opus')) return 'Opus'
  if (modelId.includes('sonnet')) return 'Sonnet'
  if (modelId.includes('haiku')) return 'Haiku'
  return modelId.split('-').slice(0, 2).join(' ')
}

function modelColor(modelId: string): string {
  if (modelId.includes('opus')) return 'text-fern'
  if (modelId.includes('sonnet')) return 'text-working'
  if (modelId.includes('haiku')) return 'text-reed'
  return 'text-gray-400'
}

function trendArrow(today: number, reference: number): { symbol: string; color: string } | null {
  if (reference === 0) return null
  const ratio = today / reference
  if (ratio > 1.2) return { symbol: '↑', color: 'text-blocked' }
  if (ratio < 0.8) return { symbol: '↓', color: 'text-working' }
  return { symbol: '→', color: 'text-gray-500' }
}

export function ContextWindowSidebar({ usage, tokenStats, liveTokenStats }: ContextWindowSidebarProps) {
  // Determine the "most recent active day" for display
  // If today has 0 tokens, show yesterday as the reference day
  const activeDay = tokenStats
    ? (tokenStats.today.total > 0 ? tokenStats.today : tokenStats.yesterday)
    : null

  const activeDayLabel = activeDay?.date === tokenStats?.today.date ? 'Today' : 'Yesterday'

  const trend = tokenStats
    ? trendArrow(tokenStats.today.total > 0 ? tokenStats.today.total : tokenStats.yesterday.total, tokenStats.weeklyAvg)
    : null

  return (
    <div className="bg-bg-dark rounded-2xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50">
        <h3 className="text-xs text-gray-500 uppercase tracking-widest font-medium">
          Token Usage
        </h3>
      </div>

      <div className="p-3 space-y-3">
        {/* Weekly quota bar — pushed to /operational/context by Fern */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[0.62rem] text-gray-500">Weekly quota</span>
            <span className={`text-[0.62rem] font-semibold ${fillTextColor(usage.fillPercent)}`}>
              {usage.fillPercent.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 bg-bg-primary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${fillColor(usage.fillPercent)}`}
              style={{ width: `${Math.min(usage.fillPercent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-[0.55rem] text-gray-600">
              {formatTokens(usage.usedTokens)} used
            </span>
            <span className="text-[0.55rem] text-gray-600">
              {formatTokens(usage.maxTokens)} limit
            </span>
          </div>
        </div>

        {/* Today's usage from session_usage table — sums all sessions started today */}
        {liveTokenStats !== null && (
          <div className="border-t border-border/30 pt-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[0.62rem] text-gray-400 font-medium">
                  Today's usage
                </span>
                <div className="text-[0.55rem] text-gray-600">all sessions today · updates on Stop</div>
              </div>
              <span className="text-[0.65rem] font-semibold text-working">
                {formatTokens(liveTokenStats.totalTokens)}
              </span>
            </div>
            {liveTokenStats.totalTokens > 0 && (
              <div className="mt-1.5 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[0.58rem] text-gray-600">Input</span>
                  <span className="text-[0.58rem] text-gray-500 font-mono">{formatTokens(liveTokenStats.inputTokens)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[0.58rem] text-gray-600">Output</span>
                  <span className="text-[0.58rem] text-gray-500 font-mono">{formatTokens(liveTokenStats.outputTokens)}</span>
                </div>
                {liveTokenStats.cacheReadTokens > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[0.58rem] text-gray-600">Cache read</span>
                    <span className="text-[0.58rem] text-gray-500 font-mono">{formatTokens(liveTokenStats.cacheReadTokens)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Historical stats from stats-cache.json — updated periodically by Claude Code */}
        {tokenStats && activeDay && (
          <div className="border-t border-border/30 pt-2.5 space-y-2">
            {/* Daily total with trend */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[0.62rem] text-gray-400 font-medium">{activeDayLabel} (stats-cache)</span>
                <div className="text-[0.55rem] text-gray-600">~/.claude/stats-cache.json · hourly</div>
              </div>
              <div className="flex items-center gap-1">
                {trend && (
                  <span className={`text-[0.62rem] ${trend.color}`}>{trend.symbol}</span>
                )}
                <span className="text-[0.65rem] font-semibold text-gray-300">
                  {formatTokens(activeDay.total)}
                </span>
              </div>
            </div>

            {/* Per-model breakdown */}
            {Object.entries(activeDay.byModel).length > 0 && (
              <div className="space-y-0.5">
                {Object.entries(activeDay.byModel).map(([model, tokens]) => (
                  <div key={model} className="flex items-center justify-between">
                    <span className={`text-[0.58rem] ${modelColor(model)}`}>
                      {modelLabel(model)}
                    </span>
                    <span className="text-[0.58rem] text-gray-500 font-mono">
                      {formatTokens(tokens)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Weekly avg comparison */}
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-[0.58rem] text-gray-600">7-day avg</span>
              <span className="text-[0.58rem] text-gray-600 font-mono">
                {formatTokens(tokenStats.weeklyAvg)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
