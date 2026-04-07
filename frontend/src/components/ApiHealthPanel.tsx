import type { ApiIntegration } from '../types'

interface ApiHealthPanelProps {
  integrations: ApiIntegration[]
}

function statusIcon(status: string): string {
  switch (status) {
    case 'healthy': return '\u2713'
    case 'degraded': return '\u25B3'
    case 'down': return '\u2717'
    default: return '?'
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'healthy': return 'text-working'
    case 'degraded': return 'text-reed'
    case 'down': return 'text-blocked'
    default: return 'text-gray-600'
  }
}

function dotColor(status: string): string {
  switch (status) {
    case 'healthy': return 'bg-working'
    case 'degraded': return 'bg-reed'
    case 'down': return 'bg-blocked'
    default: return 'bg-offline'
  }
}

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  return `${Math.floor(seconds / 3600)}h ago`
}

export function ApiHealthPanel({ integrations }: ApiHealthPanelProps) {
  const allHealthy = integrations.every(i => i.status === 'healthy')

  return (
    <div className="bg-bg-card rounded-2xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <h3 className="text-xs text-gray-500 uppercase tracking-widest font-medium">
          API Health
        </h3>
        {allHealthy && (
          <span className="text-[0.6rem] text-working font-medium">All systems go</span>
        )}
      </div>

      <div className="divide-y divide-border/30">
        {integrations.map(integration => (
          <div key={integration.id} className="px-4 py-3 flex items-center gap-3 hover:bg-bg-dark/50 transition-colors">
            {/* Status dot */}
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor(integration.status)}`} />

            {/* Integration info */}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-gray-300 flex items-center gap-2">
                {integration.name}
                <span className={`text-[0.65rem] font-semibold ${statusColor(integration.status)}`}>
                  {statusIcon(integration.status)}
                </span>
              </div>
              <div className="text-[0.65rem] text-gray-600 mt-0.5">
                {integration.detail}
              </div>
            </div>

            {/* Last checked */}
            <div className="text-[0.6rem] text-gray-600 shrink-0">
              {timeAgo(integration.lastChecked)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
