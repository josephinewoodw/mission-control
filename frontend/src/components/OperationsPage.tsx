import { ApiHealthPanel } from './ApiHealthPanel'
import { CronJobPanel } from './CronJobPanel'
import { ContextWindowPanel } from './ContextWindowPanel'
import { TokenUsagePanel } from './TokenUsagePanel'
import type { ApiIntegration, CronJob, ContextUsage, SubagentRun, TokenStats } from '../types'

interface OperationsPageProps {
  integrations: ApiIntegration[]
  crons: CronJob[]
  context: ContextUsage
  runs: SubagentRun[]
  tokenStats: TokenStats | null
  onBack: () => void
}

export function OperationsPage({ integrations, crons, context, runs, tokenStats, onBack }: OperationsPageProps) {
  return (
    <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto feed-scroll">
      <div className="p-5">
        {/* Header with back button */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={onBack}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-bg-dark text-gray-400 border border-border hover:bg-bg-primary hover:text-gray-300 transition-colors"
          >
            &larr; Dashboard
          </button>
          <h2 className="text-xs text-gray-500 uppercase tracking-widest font-medium">
            Health &amp; Operations
          </h2>
        </div>

        {/* Top row: system panels */}
        <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-1 mb-4">
          <ApiHealthPanel integrations={integrations} />
          <CronJobPanel jobs={crons} />
          <ContextWindowPanel usage={context} runs={runs} />
        </div>

        {/* Token usage — full-width panel */}
        <div className="grid grid-cols-3 gap-4">
          <TokenUsagePanel tokenStats={tokenStats} />
        </div>
      </div>
    </div>
  )
}
