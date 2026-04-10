import { useState, useEffect, useRef } from 'react'
import type { CronJob, ApiIntegration, ContextUsage, SubagentRun, DailySummaryItem, TokenStats } from '../types'
import {
  SEED_CRON_JOBS,
  SEED_API_HEALTH,
  SEED_CONTEXT_USAGE,
  SEED_SUBAGENT_RUNS,
  SEED_DAILY_SUMMARY,
} from '../data/operational-data'

const API_BASE = '/api'
const POLL_INTERVAL_MS = 10_000
// Stats cache only updates periodically — poll less frequently
const STATS_POLL_INTERVAL_MS = 60_000

export interface LiveTokenStats {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheCreationTokens: number
  totalTokens: number
  totalCostUsd: number
  sessionCount: number
  lastUpdated: number | null
}

interface OperationalData {
  crons: CronJob[]
  integrations: ApiIntegration[]
  context: ContextUsage
  runs: SubagentRun[]
  summaryItems: DailySummaryItem[]
  tokenStats: TokenStats | null
  liveTokenStats: LiveTokenStats | null
  live: boolean
}

export function useOperationalData(connected: boolean): OperationalData {
  const [crons, setCrons] = useState<CronJob[]>(SEED_CRON_JOBS)
  const [integrations, setIntegrations] = useState<ApiIntegration[]>(SEED_API_HEALTH)
  const [context, setContext] = useState<ContextUsage>(SEED_CONTEXT_USAGE)
  const [runs, setRuns] = useState<SubagentRun[]>(SEED_SUBAGENT_RUNS)
  const [summaryItems, setSummaryItems] = useState<DailySummaryItem[]>(SEED_DAILY_SUMMARY)
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null)
  const [liveTokenStats, setLiveTokenStats] = useState<LiveTokenStats | null>(null)
  const [live, setLive] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const statsPollRef = useRef<ReturnType<typeof setInterval>>(undefined)

  // Poll stats-cache and live stats endpoints independently
  useEffect(() => {
    async function pollStats() {
      try {
        const [statsRes, liveRes, ctxRes] = await Promise.all([
          fetch(`${API_BASE}/stats`),
          fetch(`${API_BASE}/stats/live`),
          fetch(`${API_BASE}/operational/context`),
        ])
        if (statsRes.ok) {
          const data = await statsRes.json()
          if (!data.error) {
            setTokenStats(data)

            // Derive weekly quota from stats-cache when hooks aren't pushing
            // real context data (maxTokens === 0 means no hook data).
            const ctxData = ctxRes.ok ? await ctxRes.json() : null
            if (!ctxData || ctxData.maxTokens === 0) {
              // Sum the last 7 calendar days from recentDays
              const today = new Date().toISOString().slice(0, 10)
              const sevenDaysAgo = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10)
              const weekTotal = (data.recentDays as Array<{ date: string; total: number }>)
                .filter((d) => d.date >= sevenDaysAgo && d.date <= today)
                .reduce((sum: number, d: { date: string; total: number }) => sum + d.total, 0)

              // Claude Code Max plan: ~25M tokens/week estimated cap
              // Expressed as weekly rolling usage (not a hard limit — just for display)
              const WEEKLY_LIMIT = 25_000_000
              setContext({
                maxTokens: WEEKLY_LIMIT,
                usedTokens: weekTotal,
                fillPercent: Math.min((weekTotal / WEEKLY_LIMIT) * 100, 100),
              })
            } else {
              setContext(ctxData)
            }
          }
        }
        if (liveRes.ok) {
          const liveData = await liveRes.json()
          if (!liveData.error) setLiveTokenStats(liveData)
        }
      } catch {
        // Silent fail
      }
    }

    pollStats()
    statsPollRef.current = setInterval(pollStats, STATS_POLL_INTERVAL_MS)
    return () => clearInterval(statsPollRef.current)
  }, [])

  useEffect(() => {
    if (!connected) {
      setLive(false)
      return
    }

    let cancelled = false

    async function poll() {
      if (cancelled) return

      try {
        const [cronsRes, integrationsRes, contextRes, summaryRes] = await Promise.all([
          fetch(`${API_BASE}/operational/crons`),
          fetch(`${API_BASE}/operational/integrations`),
          fetch(`${API_BASE}/operational/context`),
          fetch(`${API_BASE}/operational/summary`),
        ])

        const cronsData = cronsRes.ok ? await cronsRes.json() : null
        const intData = integrationsRes.ok ? await integrationsRes.json() : null
        const ctxData = contextRes.ok ? await contextRes.json() : null
        const sumData = summaryRes.ok ? await summaryRes.json() : null

        let hasLiveData = false

        if (cronsData && Array.isArray(cronsData) && cronsData.length > 0) {
          setCrons(cronsData)
          hasLiveData = true
        }

        if (intData && Array.isArray(intData) && intData.length > 0) {
          setIntegrations(intData)
          hasLiveData = true
        }

        if (ctxData && ctxData.maxTokens > 0) {
          setContext(ctxData)
          hasLiveData = true
        }

        if (sumData) {
          if (sumData.items?.length > 0) {
            setSummaryItems(sumData.items)
            hasLiveData = true
          }
          if (sumData.runs?.length > 0) {
            setRuns(sumData.runs)
            hasLiveData = true
          }
        }

        setLive(hasLiveData)
      } catch {
        // Silent fail — keep showing last known data
      }
    }

    poll()
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(pollRef.current)
    }
  }, [connected])

  return { crons, integrations, context, runs, summaryItems, tokenStats, liveTokenStats, live }
}
