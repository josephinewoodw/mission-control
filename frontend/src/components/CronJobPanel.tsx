import { AGENTS } from '../data/agents'
import type { CronJob } from '../types'

interface CronJobPanelProps {
  jobs: CronJob[]
}

function statusColor(status: string): string {
  switch (status) {
    case 'ok': return 'bg-working'
    case 'due-soon': return 'bg-reed'
    case 'overdue': return 'bg-blocked'
    default: return 'bg-offline'
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'ok': return 'OK'
    case 'due-soon': return 'Due Soon'
    case 'overdue': return 'Overdue'
    default: return status
  }
}

function timeAgo(ts: number | null): string {
  if (!ts) return 'never'
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function timeUntil(ts: number): string {
  const seconds = Math.floor((ts - Date.now()) / 1000)
  if (seconds < 0) return 'overdue'
  if (seconds < 60) return 'now'
  if (seconds < 3600) return `in ${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `in ${Math.floor(seconds / 3600)}h`
  return `in ${Math.floor(seconds / 86400)}d`
}

export function CronJobPanel({ jobs }: CronJobPanelProps) {
  return (
    <div className="bg-bg-card rounded-2xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50">
        <h3 className="text-xs text-gray-500 uppercase tracking-widest font-medium">
          Cron Jobs
        </h3>
      </div>

      <div className="divide-y divide-border/30">
        {jobs.map(job => {
          const agent = AGENTS[job.agent]
          return (
            <div key={job.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-bg-dark/50 transition-colors">
              {/* Status dot */}
              <span className={`w-2 h-2 rounded-full shrink-0 ${statusColor(job.status)} ${job.status === 'overdue' ? 'animate-pulse-dot' : ''}`} />

              {/* Job info */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-300 flex items-center gap-1.5">
                  {job.name}
                  <span className="text-[0.6rem] font-normal" style={{ color: agent?.color || '#888' }}>
                    {agent?.displayName}
                  </span>
                </div>
                <div className="text-[0.65rem] text-gray-600 mt-0.5">
                  {job.humanSchedule}
                </div>
              </div>

              {/* Timing */}
              <div className="text-right shrink-0">
                <div className="text-[0.65rem] text-gray-500">
                  Last: {timeAgo(job.lastFired)}
                </div>
                <div className="text-[0.65rem] text-gray-600">
                  Next: {timeUntil(job.nextFire)}
                </div>
              </div>

              {/* Status badge */}
              <span className={`
                text-[0.55rem] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0
                ${job.status === 'ok' ? 'text-working bg-working/10' : ''}
                ${job.status === 'due-soon' ? 'text-reed bg-reed/10' : ''}
                ${job.status === 'overdue' ? 'text-blocked bg-blocked/10' : ''}
              `}>
                {statusLabel(job.status)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
