import type { KanbanTask, AgentName } from '../types'

// AgentTask is now unified with KanbanTask
type AgentTask = KanbanTask

/** Tasks completed within this many ms get a "just completed" highlight */
const JUST_COMPLETED_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

interface TaskPanelProps {
  agentName: AgentName | null
  tasks: AgentTask[]
  onClose: () => void
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  if (hours > 0) return `${hours}h ago`
  if (mins > 0) return `${mins}m ago`
  return 'just now'
}

function isJustCompleted(task: AgentTask): boolean {
  if (task.status !== 'completed') return false
  const ts = task.completed_at
  if (!ts) return false
  return Date.now() - ts < JUST_COMPLETED_WINDOW_MS
}

function statusBadge(task: AgentTask): { label: string; className: string } {
  const justDone = isJustCompleted(task)
  switch (task.status) {
    case 'in_progress':
      return { label: 'In Progress', className: 'bg-working/20 text-working border border-working/30' }
    case 'active':
      return { label: 'Pending', className: 'bg-reed/20 text-reed border border-reed/30' }
    case 'queued':
      return { label: 'Queued', className: 'bg-fern/10 text-fern border border-fern/20' }
    case 'completed':
      return justDone
        ? { label: 'Just done', className: 'bg-fern/20 text-fern border border-fern/40' }
        : { label: 'Done', className: 'bg-gray-700/40 text-gray-400 border border-gray-600/30' }
    case 'failed':
      return { label: 'Failed', className: 'bg-blocked/20 text-blocked border border-blocked/30' }
    case 'stale':
      return { label: 'Stale', className: 'bg-gray-700/30 text-gray-500 border border-gray-600/20' }
  }
}

function TaskItem({ task }: { task: AgentTask }) {
  const badge = statusBadge(task)
  const timeTs = task.completed_at ?? task.activated_at ?? task.created_at
  const justDone = isJustCompleted(task)

  return (
    <div
      className={`p-3 rounded-lg border transition-all ${
        task.status === 'in_progress'
          ? 'border-working/30 bg-working/5'
          : task.status === 'active'
            ? 'border-reed/30 bg-reed/5'
            : task.status === 'queued'
              ? 'border-border bg-bg-primary/50'
              : task.status === 'stale'
                ? 'border-gray-700/30 bg-transparent opacity-40'
                : justDone
                  ? 'border-fern/30 bg-fern/5 shadow-[0_0_8px_rgba(74,222,128,0.08)]'
                  : 'border-border/40 bg-transparent opacity-60'
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Status dot */}
        <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
          task.status === 'in_progress' ? 'bg-working animate-pulse-dot' :
          task.status === 'active' ? 'bg-reed' :
          task.status === 'queued' ? 'bg-fern' :
          task.status === 'stale' ? 'bg-gray-600' :
          task.status === 'completed' ? (justDone ? 'bg-fern' : 'bg-gray-600') :
          'bg-blocked'
        }`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-200 font-medium leading-tight truncate flex-1">
              {task.title}
            </span>
            <span className={`text-[0.6rem] px-1.5 py-0.5 rounded font-medium shrink-0 ${badge.className}`}>
              {badge.label}
            </span>
          </div>

          {task.description && task.status !== 'completed' && (
            <p className="text-[0.62rem] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          <div className="text-[0.58rem] text-gray-600 mt-1">
            {formatRelativeTime(timeTs)}
          </div>
        </div>
      </div>
    </div>
  )
}

export function TaskPanel({ agentName, tasks, onClose }: TaskPanelProps) {
  const activeTasks = tasks.filter(t => t.status === 'in_progress')
  const pendingTasks = tasks.filter(t => t.status === 'active')
  const queuedTasks = tasks.filter(t => t.status === 'queued')
  const staleTasks = tasks.filter(t => t.status === 'stale').slice(0, 5)
  const recentDone = tasks
    .filter(t => t.status === 'completed' || t.status === 'failed')
    .slice(0, 5)

  const displayName = agentName
    ? agentName.charAt(0).toUpperCase() + agentName.slice(1)
    : 'All Agents'

  const totalActive = activeTasks.length + pendingTasks.length + queuedTasks.length

  return (
    <div className="bg-bg-card border border-border rounded-2xl overflow-hidden flex flex-col max-h-[500px]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">{displayName} — Tasks</h3>
          <div className="text-[0.62rem] text-gray-500 mt-0.5">
            {totalActive > 0
              ? `${totalActive} pending · ${recentDone.length} recently done`
              : recentDone.length > 0
                ? `${recentDone.length} recently completed`
                : staleTasks.length > 0
                  ? `${staleTasks.length} stale from previous session`
                  : 'No tasks'}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-600 hover:text-gray-400 transition-colors text-lg leading-none px-1"
          aria-label="Close task panel"
        >
          ×
        </button>
      </div>

      {/* Task list */}
      <div className="overflow-y-auto feed-scroll flex-1 p-3 space-y-1.5">
        {activeTasks.length === 0 && queuedTasks.length === 0 && recentDone.length === 0 && staleTasks.length === 0 && (
          <div className="text-xs text-gray-600 italic text-center py-6">
            No tasks recorded yet
          </div>
        )}

        {/* In Progress */}
        {activeTasks.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[0.6rem] text-gray-600 uppercase tracking-widest px-1">In Progress</div>
            {activeTasks.map(t => <TaskItem key={t.id} task={t} />)}
          </div>
        )}

        {/* Pending (needs help) */}
        {pendingTasks.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[0.6rem] text-gray-600 uppercase tracking-widest px-1 mt-2">Pending</div>
            {pendingTasks.map(t => <TaskItem key={t.id} task={t} />)}
          </div>
        )}

        {/* Queued */}
        {queuedTasks.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[0.6rem] text-gray-600 uppercase tracking-widest px-1 mt-2">Queued</div>
            {queuedTasks.map(t => <TaskItem key={t.id} task={t} />)}
          </div>
        )}

        {/* Recently completed */}
        {recentDone.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[0.6rem] text-gray-600 uppercase tracking-widest px-1 mt-2">
              Recently Done
              {recentDone.some(t => isJustCompleted(t)) && (
                <span className="ml-1.5 text-fern text-[0.55rem] normal-case tracking-normal">
                  · just completed
                </span>
              )}
            </div>
            {recentDone.map(t => <TaskItem key={t.id} task={t} />)}
          </div>
        )}

        {/* Stale — leftover from previous session crash, shown last and dimmed */}
        {staleTasks.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[0.6rem] text-gray-500/60 uppercase tracking-widest px-1 mt-2">
              Stale
              <span className="ml-1.5 text-[0.55rem] normal-case tracking-normal text-gray-600">
                · from crashed session
              </span>
            </div>
            {staleTasks.map(t => <TaskItem key={t.id} task={t} />)}
          </div>
        )}
      </div>
    </div>
  )
}
