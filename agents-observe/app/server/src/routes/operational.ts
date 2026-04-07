// app/server/src/routes/operational.ts
// Operational data endpoints — Fern pushes state, frontend polls it.
// Crons, integrations, and context are stored in-memory (session-scoped).
// Daily summary is derived from the events DB.

import { Hono } from 'hono'
import type { EventStore } from '../storage/types'

type Env = { Variables: { store: EventStore } }

const router = new Hono<Env>()

// ── In-memory operational state ──

interface CronJobData {
  id: string
  name: string
  agent: string
  schedule: string
  humanSchedule: string
  lastFired: number | null
  nextFire: number
  status: string
}

interface IntegrationData {
  id: string
  name: string
  status: string
  lastChecked: number
  detail: string
}

interface ContextData {
  maxTokens: number
  usedTokens: number
  fillPercent: number
}

let cronJobs: CronJobData[] = []
let integrations: IntegrationData[] = []
let contextUsage: ContextData | null = null

// ── Cron Jobs ──

router.get('/operational/crons', (c) => {
  return c.json(cronJobs)
})

router.post('/operational/crons', async (c) => {
  const body = await c.req.json()
  if (Array.isArray(body)) {
    cronJobs = body
  } else {
    return c.json({ error: 'Expected array of cron jobs' }, 400)
  }
  return c.json({ ok: true, count: cronJobs.length })
})

// ── API Integrations ──

router.get('/operational/integrations', (c) => {
  return c.json(integrations)
})

router.post('/operational/integrations', async (c) => {
  const body = await c.req.json()
  if (Array.isArray(body)) {
    integrations = body
  } else {
    return c.json({ error: 'Expected array of integrations' }, 400)
  }
  return c.json({ ok: true, count: integrations.length })
})

// ── Context Usage ──

router.get('/operational/context', (c) => {
  return c.json(contextUsage || { maxTokens: 0, usedTokens: 0, fillPercent: 0 })
})

router.post('/operational/context', async (c) => {
  const body = await c.req.json()
  contextUsage = {
    maxTokens: body.maxTokens ?? 1_000_000,
    usedTokens: body.usedTokens ?? 0,
    fillPercent: body.fillPercent ?? 0,
  }
  return c.json({ ok: true })
})

// ── Daily Summary (derived from events DB) ──

router.get('/operational/summary', async (c) => {
  const store = c.get('store')

  // Get today's events across all sessions
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayMs = todayStart.getTime()

  try {
    // Get recent sessions
    const sessions = await store.getRecentSessions(10)
    const summaryItems: Array<{
      agent: string
      description: string
      output: string | null
      completedAt: number
    }> = []

    const subagentRuns: Array<{
      agent: string
      task: string
      tokensUsed: number
      completedAt: number
      duration: string
    }> = []

    for (const session of sessions) {
      const events = await store.getEventsForSession(session.id, {
        limit: 500,
      })

      // Filter to today's events
      const todayEvents = events.filter((e: any) => e.timestamp >= todayMs)

      // Find subagent start/stop pairs
      const subagentStarts = new Map<string, any>()
      for (const e of todayEvents) {
        if (e.subtype === 'SubagentStart') {
          const payload = typeof e.payload === 'string' ? JSON.parse(e.payload) : e.payload
          subagentStarts.set(e.agent_id, {
            agent: payload?.subagent_type || payload?.name || 'unknown',
            task: payload?.description || payload?.prompt?.slice(0, 60) || 'Task',
            startedAt: e.timestamp,
          })
        }
        if (e.subtype === 'SubagentStop') {
          const start = subagentStarts.get(e.agent_id)
          if (start) {
            const durationMs = e.timestamp - start.startedAt
            const mins = Math.floor(durationMs / 60_000)
            const secs = Math.floor((durationMs % 60_000) / 1000)
            subagentRuns.push({
              agent: start.agent,
              task: start.task,
              tokensUsed: 0, // not available from events
              completedAt: e.timestamp,
              duration: `${mins}m ${secs}s`,
            })
            summaryItems.push({
              agent: start.agent,
              description: start.task,
              output: null,
              completedAt: e.timestamp,
            })
            subagentStarts.delete(e.agent_id)
          }
        }
      }

      // Count tool uses by agent type for session activity summary
      const toolCounts = new Map<string, number>()
      for (const e of todayEvents) {
        if (e.subtype === 'PostToolUse' && e.tool_name) {
          const key = e.tool_name
          toolCounts.set(key, (toolCounts.get(key) || 0) + 1)
        }
      }

      // Add session-level summary if there was activity
      if (todayEvents.length > 0 && summaryItems.length === 0) {
        summaryItems.push({
          agent: 'fern',
          description: `Session active — ${todayEvents.length} events, ${toolCounts.size} unique tools used`,
          output: null,
          completedAt: todayEvents[todayEvents.length - 1]?.timestamp || Date.now(),
        })
      }
    }

    return c.json({ items: summaryItems, runs: subagentRuns })
  } catch {
    return c.json({ items: [], runs: [] })
  }
})

export default router
