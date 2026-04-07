import type { CronJob, ApiIntegration, ContextUsage, SubagentRun, DailySummaryItem } from '../types'

const now = Date.now()
const min = 60_000
const hour = 3_600_000

/**
 * Seed cron job data matching Fern's actual cron schedule.
 * In production, these would come from the session cron registry.
 */
export const SEED_CRON_JOBS: CronJob[] = [
  {
    id: 'sentinel-context',
    name: 'Context Collection',
    agent: 'sentinel',
    schedule: '17 */3 * * *',
    humanSchedule: 'Every 3h at :17',
    lastFired: now - 1.5 * hour,
    nextFire: now + 1.5 * hour,
    status: 'ok',
  },
  {
    id: 'sentinel-health-am',
    name: 'Health Check (Morning)',
    agent: 'sentinel',
    schedule: '3 11 * * *',
    humanSchedule: 'Daily 6am CT',
    lastFired: now - 4 * hour,
    nextFire: now + 20 * hour,
    status: 'ok',
  },
  {
    id: 'sentinel-health-pm',
    name: 'Health Check (Evening)',
    agent: 'sentinel',
    schedule: '3 3 * * *',
    humanSchedule: 'Daily 10pm CT',
    lastFired: now - 12 * hour,
    nextFire: now + 12 * hour,
    status: 'ok',
  },
  {
    id: 'sentinel-security',
    name: 'Nightly Security Scan',
    agent: 'sentinel',
    schedule: '3 4 * * *',
    humanSchedule: 'Daily 11pm CT',
    lastFired: now - 5 * hour,
    nextFire: now + 19 * hour,
    status: 'ok',
  },
  {
    id: 'reed-content',
    name: 'Weekly Content Production',
    agent: 'reed',
    schedule: '3 14 * * 4',
    humanSchedule: 'Thu 9am CT',
    lastFired: now - 24 * hour,
    nextFire: now + 6 * 24 * hour,
    status: 'ok',
  },
  {
    id: 'scout-review',
    name: 'Weekly Content Review',
    agent: 'scout',
    schedule: '3 22 * * 5',
    humanSchedule: 'Fri 5pm CT',
    lastFired: now - 2 * 24 * hour,
    nextFire: now + 5 * 24 * hour,
    status: 'ok',
  },
  {
    id: 'scout-derek',
    name: 'Derek Job Scan',
    agent: 'scout',
    schedule: '3 13 * * 3',
    humanSchedule: 'Wed 8am CT',
    lastFired: now - 24 * hour,
    nextFire: now + 6 * 24 * hour,
    status: 'ok',
  },
]

/**
 * Seed API integration health data.
 * All mocked as healthy — will wire up real checks later.
 */
export const SEED_API_HEALTH: ApiIntegration[] = [
  {
    id: 'notion',
    name: 'Notion API',
    status: 'healthy',
    lastChecked: now - 15 * min,
    detail: 'Content 125 database accessible',
  },
  {
    id: 'instagram',
    name: 'Instagram Graph API',
    status: 'healthy',
    lastChecked: now - 15 * min,
    detail: 'Token valid, expires in 47d',
  },
  {
    id: 'discord',
    name: 'Discord Bot',
    status: 'healthy',
    lastChecked: now - 5 * min,
    detail: 'Connected, 4 channels active',
  },
  {
    id: 'brave',
    name: 'Brave Search',
    status: 'healthy',
    lastChecked: now - 15 * min,
    detail: 'API key valid',
  },
]

/**
 * Seed context window / usage data for Fern's session.
 */
export const SEED_CONTEXT_USAGE: ContextUsage = {
  maxTokens: 1_000_000,
  usedTokens: 342_500,
  fillPercent: 34.25,
}

export const SEED_SUBAGENT_RUNS: SubagentRun[] = [
  {
    agent: 'scout',
    task: 'Daily brief — AI news scan',
    tokensUsed: 48_200,
    completedAt: now - 3 * hour,
    duration: '4m 12s',
  },
  {
    agent: 'sentinel',
    task: 'Context collection — Discord sync',
    tokensUsed: 22_800,
    completedAt: now - 30 * min,
    duration: '2m 45s',
  },
  {
    agent: 'reed',
    task: 'Script writing — sycophancy reel',
    tokensUsed: 61_400,
    completedAt: now - 44 * min,
    duration: '6m 30s',
  },
]

/**
 * Seed "what we got done today" summary items.
 */
export const SEED_DAILY_SUMMARY: DailySummaryItem[] = [
  {
    agent: 'scout',
    description: 'Completed daily brief — 3 trending AI stories identified',
    output: '03-content/research/scans/2026-04-03-scan.md',
    completedAt: now - 3 * hour,
  },
  {
    agent: 'fern',
    description: 'Loaded session context, checked iMessage (3 messages), flagged 2 overdue promises',
    output: null,
    completedAt: now - 3.5 * hour,
  },
  {
    agent: 'sentinel',
    description: 'Context collection — synced Discord to daily note, committed 4 files',
    output: '01-daily/2026/04/2026-04-03.md',
    completedAt: now - 22 * min,
  },
  {
    agent: 'reed',
    description: 'Drafted sycophancy reel script (v1-initial.md) — BLOCKED on humanizer pass',
    output: '03-content/studio/drafts/week-of-2026-03-31/sycophancy-reel/v1-initial.md',
    completedAt: now - 44 * min,
  },
  {
    agent: 'sentinel',
    description: 'Nightly security scan — no issues found, all tokens valid',
    output: '08-tools/agents/security/reports/2026-04-03-security.md',
    completedAt: now - 5 * hour,
  },
  {
    agent: 'fern',
    description: 'Updated state.md with current pressures',
    output: '02-memory/state.md',
    completedAt: now - 10 * min,
  },
]
