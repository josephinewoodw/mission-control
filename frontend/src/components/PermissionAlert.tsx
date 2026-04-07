import { useState, useEffect } from 'react'
import { AGENTS } from '../data/agents'
import type { AgentName, AgentState } from '../types'

interface PermissionAlertProps {
  blockedAgents: AgentName[]
  agentStates: Record<string, AgentState>
}

function timeBlocked(since: number | null): string {
  if (!since) return ''
  const seconds = Math.floor((Date.now() - since) / 1000)
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

export function PermissionAlert({ blockedAgents, agentStates }: PermissionAlertProps) {
  const [, setTick] = useState(0)

  // Update the "waiting Xm" timer every 10s
  useEffect(() => {
    if (blockedAgents.length === 0) return
    const id = setInterval(() => setTick(t => t + 1), 10_000)
    return () => clearInterval(id)
  }, [blockedAgents.length])

  if (blockedAgents.length === 0) return null

  return (
    <div className="w-full bg-blocked/15 border-b-2 border-blocked">
      <div className="max-w-[1200px] mx-auto px-4 py-3">
        {blockedAgents.map(name => {
          const agent = AGENTS[name]
          const state = agentStates[name]
          if (!agent || !state) return null

          return (
            <div
              key={name}
              className="flex items-center gap-3 animate-alert-pulse"
            >
              {/* Pulsing warning icon */}
              <div className="text-2xl shrink-0 animate-pulse-dot">
                <span role="img" aria-label="warning">&#9888;&#65039;</span>
              </div>

              {/* Alert content */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-blocked tracking-wide">
                  AGENT BLOCKED — PERMISSION REQUIRED
                </div>
                <div className="text-xs text-gray-300 mt-0.5">
                  <span className="font-semibold" style={{ color: agent.color }}>
                    {agent.displayName}
                  </span>
                  {' '}is waiting for permission to use{' '}
                  <span className="font-mono font-semibold text-gray-200">
                    {state.blockedTool || 'a tool'}
                  </span>
                  {state.blockedSince && (
                    <span className="text-blocked/80 ml-2 font-medium">
                      waiting {timeBlocked(state.blockedSince)}
                    </span>
                  )}
                </div>
              </div>

              {/* Pulsing dot */}
              <div className="w-3 h-3 rounded-full bg-blocked animate-pulse-dot shrink-0" />
            </div>
          )
        })}
      </div>
    </div>
  )
}
