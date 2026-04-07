import { AGENTS } from '../data/agents'
import { LpcSprite } from './LpcSprite'
import type { AgentState } from '../types'

interface AgentDeskProps {
  state: AgentState
}

function timeAgo(timestamp: number | null): string {
  if (!timestamp) return ''
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function statusDotClass(status: string): string {
  switch (status) {
    case 'working': return 'bg-working animate-pulse-dot'
    case 'blocked': return 'bg-blocked animate-pulse-dot'
    case 'idle': return 'bg-idle'
    case 'offline': return 'bg-offline'
    default: return 'bg-offline'
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'working': return 'working'
    case 'blocked': return 'BLOCKED'
    case 'idle': return 'idle'
    case 'offline': return 'offline'
    default: return status
  }
}

function deskBorderClass(status: string): string {
  switch (status) {
    case 'working': return 'border-working/50 shadow-[0_0_20px_rgba(74,158,74,0.1)]'
    case 'blocked': return 'border-blocked animate-alert-pulse'
    case 'offline': return 'border-border opacity-50'
    default: return 'border-border'
  }
}

function avatarBorderColor(status: string): string {
  switch (status) {
    case 'working': return 'border-working'
    case 'blocked': return 'border-blocked'
    case 'idle': return 'border-border-light'
    case 'offline': return 'border-border-light'
    default: return 'border-border-light'
  }
}

export function AgentDesk({ state }: AgentDeskProps) {
  const info = AGENTS[state.name]
  if (!info) return null

  const isBlocked = state.status === 'blocked'

  return (
    <div
      className={`
        bg-bg-card rounded-2xl p-5 border-2 transition-all duration-300 relative
        ${deskBorderClass(state.status)}
      `}
    >
      {/* Blocked overlay warning badge */}
      {isBlocked && (
        <div className="absolute -top-2 -right-2 bg-blocked text-white text-[0.6rem] font-bold px-2 py-0.5 rounded-full animate-pulse-dot z-10 uppercase tracking-wider">
          Needs Permission
        </div>
      )}

      {/* Agent header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <div className={`
            w-16 h-16 rounded-xl overflow-hidden border-2 bg-bg-dark
            transition-colors duration-300
            ${avatarBorderColor(state.status)}
          `}>
            <LpcSprite agent={state.name} status={state.status} size={64} />
          </div>
          {/* Status indicator dot */}
          <span
            className={`
              absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-bg-card
              ${statusDotClass(state.status)}
            `}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <span>{info.emoji}</span>
            <span style={{ color: info.color }}>{info.displayName}</span>
            {isBlocked && (
              <span className="text-blocked text-xs ml-1" role="img" aria-label="warning">&#9888;&#65039;</span>
            )}
          </div>
          <div className={`text-[0.7rem] mt-0.5 ${isBlocked ? 'text-blocked font-semibold' : 'text-gray-500'}`}>
            {info.role} &middot; {statusLabel(state.status)}
          </div>
        </div>
      </div>

      {/* Current task */}
      <div
        className={`
          text-xs px-3 py-2 rounded-lg min-h-[36px] flex items-center
          ${isBlocked ? 'bg-blocked/10 text-blocked font-medium' : 'bg-bg-dark'}
          ${!isBlocked && state.currentTask ? 'text-gray-400' : ''}
          ${!isBlocked && !state.currentTask ? 'text-gray-600 italic' : ''}
        `}
      >
        {isBlocked ? (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blocked animate-pulse-dot inline-block" />
            Blocked on <span className="font-mono">{state.blockedTool || 'permission'}</span> — waiting for approval
          </span>
        ) : state.status === 'offline' ? (
          'Offline'
        ) : (
          state.currentTask || 'Standing by...'
        )}
      </div>

      {/* Last activity */}
      {state.lastActivity && (
        <div className="text-[0.65rem] text-gray-600 mt-2 text-right">
          {timeAgo(state.lastActivity)}
          {state.eventCount > 0 && (
            <span className="ml-2 text-gray-700">
              {state.eventCount} events
            </span>
          )}
        </div>
      )}
    </div>
  )
}
