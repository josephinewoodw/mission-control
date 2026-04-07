import { AGENTS } from '../data/agents'
import type { ContextUsage, SubagentRun } from '../types'

interface ContextWindowPanelProps {
  usage: ContextUsage
  runs: SubagentRun[]
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

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}

export function ContextWindowPanel({ usage, runs }: ContextWindowPanelProps) {
  const totalSubagentTokens = runs.reduce((sum, r) => sum + r.tokensUsed, 0)

  return (
    <div className="bg-bg-card rounded-2xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50">
        <h3 className="text-xs text-gray-500 uppercase tracking-widest font-medium">
          Context Window
        </h3>
      </div>

      <div className="p-4">
        {/* Fern's context bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-400">Fern Session</span>
            <span className={`text-xs font-semibold ${fillTextColor(usage.fillPercent)}`}>
              {usage.fillPercent.toFixed(1)}%
            </span>
          </div>
          <div className="h-3 bg-bg-dark rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${fillColor(usage.fillPercent)}`}
              style={{ width: `${Math.min(usage.fillPercent, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[0.6rem] text-gray-600">
              {formatTokens(usage.usedTokens)} used
            </span>
            <span className="text-[0.6rem] text-gray-600">
              {formatTokens(usage.maxTokens)} max
            </span>
          </div>
        </div>

        {/* Subagent runs today */}
        <div className="border-t border-border/30 pt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[0.65rem] text-gray-500 uppercase tracking-wider font-medium">
              Subagent runs today
            </span>
            <span className="text-[0.6rem] text-gray-600">
              {formatTokens(totalSubagentTokens)} total
            </span>
          </div>

          <div className="space-y-2">
            {runs.map((run, i) => {
              const agent = AGENTS[run.agent]
              return (
                <div key={i} className="flex items-center gap-2 text-[0.7rem]">
                  <span className="font-semibold w-16 shrink-0" style={{ color: agent?.color || '#888' }}>
                    {agent?.displayName || run.agent}
                  </span>
                  <span className="text-gray-400 flex-1 truncate">
                    {run.task}
                  </span>
                  <span className="text-gray-600 shrink-0 font-mono text-[0.6rem]">
                    {formatTokens(run.tokensUsed)}
                  </span>
                  <span className="text-gray-700 shrink-0 text-[0.6rem]">
                    {timeAgo(run.completedAt)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
