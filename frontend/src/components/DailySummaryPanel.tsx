import { AGENTS } from '../data/agents'
import type { DailySummaryItem, SubagentRun } from '../types'

interface DailySummaryPanelProps {
  items: DailySummaryItem[]
  runs: SubagentRun[]
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function DailySummaryPanel({ items, runs }: DailySummaryPanelProps) {
  const totalTokens = runs.reduce((sum, r) => sum + r.tokensUsed, 0)
  const sorted = [...items].sort((a, b) => b.completedAt - a.completedAt)

  return (
    <div className="bg-bg-card rounded-2xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <h3 className="text-xs text-gray-500 uppercase tracking-widest font-medium">
          What We Got Done Today
        </h3>
        <span className="text-[0.6rem] text-gray-600">
          {items.length} tasks &middot; {formatTokens(totalTokens)} tokens
        </span>
      </div>

      <div className="feed-scroll max-h-[260px] overflow-y-auto divide-y divide-border/30">
        {sorted.map((item, i) => {
          const agent = AGENTS[item.agent]
          return (
            <div key={i} className="px-4 py-2.5 hover:bg-bg-dark/50 transition-colors">
              <div className="flex items-start gap-2">
                <span className="text-[0.65rem] text-gray-600 font-mono w-14 shrink-0 pt-0.5">
                  {formatTime(item.completedAt)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[0.65rem] font-semibold" style={{ color: agent?.color || '#888' }}>
                      {agent?.displayName || item.agent}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {item.description}
                  </div>
                  {item.output && (
                    <div className="text-[0.6rem] text-gray-600 font-mono mt-0.5 truncate">
                      {item.output}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
