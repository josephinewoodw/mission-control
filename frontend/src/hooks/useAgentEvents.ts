import { useState, useEffect, useRef, useCallback } from 'react'
import type { AgentName, AgentState, AgentStatus, MCEvent } from '../types'
import { defaultAgentState } from '../data/agents'
import { SEED_EVENTS, SEED_AGENT_STATES } from '../data/seed-events'

const API_BASE = '/api'

/** Poll interval for fetching new events */
const POLL_INTERVAL_MS = 3_000

/** If no activity for this long, mark agent offline */
const OFFLINE_TIMEOUT_MS = 5 * 60 * 1000

/**
 * Map agents-observe events to our named agents.
 * Checks session slug, agent name/type, and payload fields for agent identifiers.
 */
function resolveAgentName(event: Record<string, unknown>): AgentName {
  const payload = event.payload as Record<string, unknown> | undefined
  const toolInput = payload?.tool_input as Record<string, unknown> | undefined
  const fields = [
    event.agentType,
    event.agentName,
    event.sessionSlug,
    event.sessionId,
    payload?.agent_type,
    payload?.subagent_type,
    payload?.name,
    // Check nested tool_input for Agent tool calls
    toolInput?.subagent_type,
    toolInput?.name,
    toolInput?.prompt,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (fields.includes('scout')) return 'scout'
  if (fields.includes('reed') || fields.includes('herman')) return 'reed'
  if (fields.includes('sentinel')) return 'sentinel'
  if (fields.includes('timber')) return 'timber'
  if (fields.includes('tide')) return 'tide'
  return 'fern'
}

function statusFromEvent(type: string, subtype: string | null): AgentStatus {
  if (subtype === 'PermissionRequest') return 'blocked'
  if (subtype === 'SessionEnd' || subtype === 'SubagentStop') return 'offline'
  if (subtype === 'SessionStart' || subtype === 'SubagentStart') return 'idle'
  if (subtype === 'PreToolUse' || subtype === 'TaskCreated') return 'working'
  if (subtype === 'PostToolUse' || subtype === 'TaskCompleted') return 'idle'
  if (subtype === 'Stop') return 'idle'
  if (subtype === 'UserPromptSubmit') return 'working'
  if (type === 'tool') return 'working'
  return 'idle'
}

function summarizeEvent(type: string, subtype: string | null, toolName: string | null): string {
  if (subtype === 'SessionStart') return 'Session started'
  if (subtype === 'SessionEnd') return 'Session ended'
  if (subtype === 'SubagentStart') return 'Agent spawned'
  if (subtype === 'SubagentStop') return 'Agent completed task'
  if (subtype === 'PermissionRequest') return `Permission needed: ${toolName || 'unknown tool'}`
  if (subtype === 'TaskCreated') return 'New task assigned'
  if (subtype === 'TaskCompleted') return 'Task complete'
  if (subtype === 'PreToolUse' && toolName) return `Using ${toolName}...`
  if (subtype === 'PostToolUse' && toolName) return `Finished ${toolName}`
  if (toolName) return `Using ${toolName}`
  if (subtype === 'UserPromptSubmit') return 'Received instructions'
  if (subtype === 'Stop') return 'Finished thinking'
  return subtype || type || 'Activity'
}

interface UseAgentEventsReturn {
  agents: Record<string, AgentState>
  events: MCEvent[]
  connected: boolean
  usingSeed: boolean
  blockedAgents: AgentName[]
}

export function useAgentEvents(): UseAgentEventsReturn {
  const [agents, setAgents] = useState<Record<string, AgentState>>(() => {
    const initial: Record<string, AgentState> = {}
    for (const name of ['fern', 'scout', 'reed', 'sentinel', 'timber', 'tide'] as const) {
      initial[name] = defaultAgentState(name)
    }
    return initial
  })

  const [events, setEvents] = useState<MCEvent[]>([])
  const [connected, setConnected] = useState(false)
  const [usingSeed, setUsingSeed] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const seenEventIds = useRef(new Set<number>())
  // Track active subagent spawns: tool_use_id -> subagent AgentName
  const activeSubagentSpawns = useRef(new Map<string, AgentName>())

  const processEvent = useCallback((event: MCEvent) => {
    // Deduplicate
    if (seenEventIds.current.has(event.id)) return
    seenEventIds.current.add(event.id)

    setEvents(prev => {
      const updated = [event, ...prev]
      return updated.slice(0, 100)
    })

    // ── Subagent spawn tracking ──
    // When Fern calls the Agent tool (PreToolUse), extract the subagent_type
    // and mark that agent as "working" until the PostToolUse fires for the same tool_use_id.
    const isAgentToolCall = event.toolName === 'Agent' || event.toolName === 'agent'
    const toolUseId = event.toolUseId

    if (isAgentToolCall && event.subtype === 'PreToolUse' && toolUseId) {
      // Try to extract the subagent_type from the event payload
      const payload = event.payload
      const toolInput = payload?.tool_input as Record<string, unknown> | undefined
      let subagentType = (
        toolInput?.subagent_type ||
        toolInput?.name ||
        payload?.subagent_type
      ) as string | undefined
      const taskDescription = (toolInput?.description as string) || ''
      const taskPrompt = (toolInput?.prompt as string) || ''

      // Map legacy "herman" subagent_type to "reed"
      if (subagentType?.toLowerCase() === 'herman') {
        subagentType = 'reed'
      }

      // If no explicit subagent_type, check description and prompt fields
      // for agent names (e.g. Timber doesn't have a registered subagent_type)
      if (!subagentType) {
        const searchText = `${taskDescription} ${taskPrompt}`.toLowerCase()
        for (const candidate of ['scout', 'reed', 'herman', 'sentinel', 'timber', 'tide']) {
          if (searchText.includes(candidate)) {
            subagentType = candidate === 'herman' ? 'reed' : candidate
            break
          }
        }
      }

      if (subagentType) {
        const agentName = subagentType.toLowerCase() as AgentName
        if (['scout', 'reed', 'sentinel', 'timber', 'tide'].includes(agentName)) {
          activeSubagentSpawns.current.set(toolUseId, agentName)
          // Mark the subagent as working with high-level task
          const displayName = agentName.charAt(0).toUpperCase() + agentName.slice(1)
          setAgents(prev => {
            const prevAgent = prev[agentName]
            if (!prevAgent) return prev
            const prevFern = prev['fern']
            return {
              ...prev,
              [agentName]: {
                ...prevAgent,
                status: 'working' as AgentStatus,
                currentTask: 'Spawned by Fern',
                highLevelTask: taskDescription || 'Spawned by Fern',
                lastActivity: event.timestamp,
              },
              ...(prevFern ? {
                fern: {
                  ...prevFern,
                  highLevelTask: `Routing to ${displayName}`,
                },
              } : {}),
            }
          })
        }
      }
    }

    if (isAgentToolCall && event.subtype === 'PostToolUse' && toolUseId) {
      const spawnedAgent = activeSubagentSpawns.current.get(toolUseId)
      if (spawnedAgent) {
        // Check if this was a background launch — the Agent tool returns immediately
        // but the subagent is still actively working
        const payload = event.payload
        const toolInput = payload?.tool_input as Record<string, unknown> | undefined
        const toolResponse = payload?.tool_response as Record<string, unknown> | undefined
        const isBackgroundLaunch = toolInput?.run_in_background === true
        // Detect from structured async response (isAsync:true / status:'async_launched')
        const responseIsAsync = toolResponse?.isAsync === true || toolResponse?.status === 'async_launched'
        // Also detect from response text mentioning async/background launch (legacy fallback)
        const responseText = typeof toolResponse?.result === 'string' ? toolResponse.result : ''
        const responseHintsBackground = /async|background|launched/i.test(responseText)

        if (isBackgroundLaunch || responseIsAsync || responseHintsBackground) {
          // Background launch: keep the agent in "working" state.
          // Don't remove from activeSubagentSpawns — SubagentStop will handle cleanup.
          // Just update Fern's status back to standing by since the routing is done.
          setAgents(prev => {
            const prevFern = prev['fern']
            if (!prevFern) return prev
            return {
              ...prev,
              fern: {
                ...prevFern,
                highLevelTask: 'Standing by...',
              },
            }
          })
        } else {
          // Synchronous agent call completed — mark subagent as idle
          activeSubagentSpawns.current.delete(toolUseId)
          setAgents(prev => {
            const prevAgent = prev[spawnedAgent]
            if (!prevAgent) return prev
            const prevFern = prev['fern']
            return {
              ...prev,
              [spawnedAgent]: {
                ...prevAgent,
                status: 'idle' as AgentStatus,
                currentTask: 'Task complete',
                highLevelTask: 'Standing by...',
                lastActivity: event.timestamp,
              },
              ...(prevFern ? {
                fern: {
                  ...prevFern,
                  highLevelTask: 'Standing by...',
                },
              } : {}),
            }
          })
        }
      }
    }

    // ── Background subagent completion tracking ──
    // When a SubagentStop event fires, find and clean up any background-spawned agent
    if (event.subtype === 'SubagentStop') {
      const stoppedAgent = event.agent
      // Clean up from activeSubagentSpawns if this agent was tracked
      for (const [tuId, agentName] of activeSubagentSpawns.current.entries()) {
        if (agentName === stoppedAgent) {
          activeSubagentSpawns.current.delete(tuId)
          break
        }
      }
      // Set the completed agent to idle with "Standing by..."
      setAgents(prev => {
        const prevAgent = prev[stoppedAgent]
        if (!prevAgent) return prev
        return {
          ...prev,
          [stoppedAgent]: {
            ...prevAgent,
            status: 'idle' as AgentStatus,
            currentTask: 'Task complete',
            highLevelTask: 'Standing by...',
            lastActivity: event.timestamp,
          },
        }
      })
    }

    // ── High-level task tracking for specific tools ──
    if (!isAgentToolCall && event.subtype === 'PreToolUse') {
      const toolName = event.toolName || ''
      if (toolName === 'mcp__plugin_imessage_imessage__reply') {
        setAgents(prev => {
          const prevFern = prev['fern']
          if (!prevFern) return prev
          return { ...prev, fern: { ...prevFern, highLevelTask: 'Talking to Josie' } }
        })
      } else if (toolName === 'CronCreate') {
        setAgents(prev => {
          const prevFern = prev['fern']
          if (!prevFern) return prev
          return { ...prev, fern: { ...prevFern, highLevelTask: 'Setting up schedules' } }
        })
      }
      // For all other tools, don't update highLevelTask — let it persist
    }

    setAgents(prev => {
      const prevAgent = prev[event.agent]
      if (!prevAgent) return prev

      // Don't override a subagent's "working" status set by spawn tracking
      // if the event is coming from Fern's Agent tool call
      if (isAgentToolCall && event.agent === 'fern') {
        const newStatus = statusFromEvent(event.type, event.subtype)
        const wasBlocked = prevAgent.status === 'blocked'
        const isNowBlocked = newStatus === 'blocked'
        const clearedBlock = wasBlocked && !isNowBlocked
        return {
          ...prev,
          [event.agent]: {
            ...prevAgent,
            status: newStatus,
            currentTask: event.summary,
            lastActivity: event.timestamp,
            lastEvent: event.subtype || event.type,
            eventCount: prevAgent.eventCount + 1,
            blockedTool: isNowBlocked ? (event.toolName || null) : (clearedBlock ? null : prevAgent.blockedTool),
            blockedSince: isNowBlocked ? event.timestamp : (clearedBlock ? null : prevAgent.blockedSince),
          },
        }
      }

      // For subagents that are currently tracked as "working" from a spawn,
      // don't let normal PostToolUse events flip them to idle
      const isTrackedSubagent = [...activeSubagentSpawns.current.values()].includes(event.agent as AgentName)
      let newStatus = statusFromEvent(event.type, event.subtype)
      if (isTrackedSubagent && newStatus === 'idle') {
        newStatus = 'working' // Keep working until the Agent tool PostToolUse fires
      }

      const wasBlocked = prevAgent.status === 'blocked'
      const isNowBlocked = newStatus === 'blocked'
      const clearedBlock = wasBlocked && !isNowBlocked

      return {
        ...prev,
        [event.agent]: {
          ...prevAgent,
          status: newStatus,
          currentTask: event.summary,
          lastActivity: event.timestamp,
          lastEvent: event.subtype || event.type,
          eventCount: prevAgent.eventCount + 1,
          blockedTool: isNowBlocked ? (event.toolName || null) : (clearedBlock ? null : prevAgent.blockedTool),
          blockedSince: isNowBlocked ? event.timestamp : (clearedBlock ? null : prevAgent.blockedSince),
        },
      }
    })
  }, [])

  // Offline detection timer
  useEffect(() => {
    if (usingSeed) return

    const interval = setInterval(() => {
      setAgents(prev => {
        const now = Date.now()
        let changed = false
        const updated = { ...prev }

        for (const name of ['fern', 'scout', 'reed', 'sentinel', 'timber', 'tide'] as const) {
          const agent = updated[name]
          if (!agent) continue
          if (agent.status === 'offline' || agent.status === 'blocked') continue
          if (agent.lastActivity && now - agent.lastActivity > OFFLINE_TIMEOUT_MS) {
            updated[name] = { ...agent, status: 'offline' }
            changed = true
          }
        }

        return changed ? updated : prev
      })
    }, 30_000)

    return () => clearInterval(interval)
  }, [usingSeed])

  // Poll for events across all sessions
  useEffect(() => {
    let cancelled = false

    async function checkHealth(): Promise<boolean> {
      try {
        const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) })
        return res.ok
      } catch {
        return false
      }
    }

    async function pollEvents() {
      if (cancelled) return
      try {
        // Get all active sessions
        const sessionsRes = await fetch(`${API_BASE}/sessions/recent?limit=20`)
        if (!sessionsRes.ok) return
        const sessions: Array<{ id: string; status: string }> = await sessionsRes.json()

        // Fetch latest events from each active session
        for (const session of sessions) {
          const eventsRes = await fetch(`${API_BASE}/sessions/${encodeURIComponent(session.id)}/events?limit=10`)
          if (!eventsRes.ok) continue
          const sessionEvents: Array<{
            id: number
            agentId: string
            sessionId: string
            type: string
            subtype: string | null
            toolName: string | null
            timestamp: string
            payload: Record<string, unknown>
          }> = await eventsRes.json()

          for (const e of sessionEvents) {
            if (seenEventIds.current.has(e.id)) continue
            const agent = resolveAgentName({
              ...e,
              agentType: e.payload?.agent_type as string,
              agentName: e.payload?.name as string,
              sessionSlug: session.id,
            })
            const mcEvent: MCEvent = {
              id: e.id,
              agent,
              type: e.type,
              subtype: e.subtype,
              toolName: e.toolName,
              toolUseId: (e as Record<string, unknown>).toolUseId as string | null ?? null,
              summary: summarizeEvent(e.type, e.subtype, e.toolName),
              timestamp: e.timestamp ? new Date(e.timestamp).getTime() : Date.now(),
              payload: e.payload,
            }
            processEvent(mcEvent)
          }
        }
      } catch {
        // Silently fail — will retry next poll
      }
    }

    async function start() {
      const healthy = await checkHealth()
      if (cancelled) return

      if (healthy) {
        setConnected(true)
        setUsingSeed(false)
        console.log('[MC] Connected to agents-observe, polling every 3s')
        await pollEvents()
        pollRef.current = setInterval(pollEvents, POLL_INTERVAL_MS)
      } else {
        console.log('[MC] agents-observe not running, using seed data')
        setUsingSeed(true)
        setAgents(SEED_AGENT_STATES)
        setEvents([...SEED_EVENTS].reverse())
      }
    }

    start()

    return () => {
      cancelled = true
      clearInterval(pollRef.current)
    }
  }, [processEvent])

  const blockedAgents = (Object.values(agents) as AgentState[])
    .filter(a => a.status === 'blocked')
    .map(a => a.name)

  return { agents, events, connected, usingSeed, blockedAgents }
}
