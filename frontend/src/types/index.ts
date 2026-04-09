/** Agent identity — our 6 named agents */
export type AgentName = 'fern' | 'scout' | 'reed' | 'sentinel' | 'timber' | 'tide'

export type AgentStatus = 'idle' | 'working' | 'blocked' | 'offline'

export interface AgentInfo {
  name: AgentName
  displayName: string
  role: string
  emoji: string
  color: string
  avatar: string
  /** Short description shown in the office scene */
  station: string
}

export interface AgentState {
  name: AgentName
  status: AgentStatus
  currentTask: string
  /** High-level task description (persists across tool calls) */
  highLevelTask: string
  lastActivity: number | null
  lastEvent: string
  eventCount: number
  /** When status is 'blocked', the tool that triggered the permission request */
  blockedTool?: string | null
  /** Timestamp when the agent entered blocked state */
  blockedSince?: number | null
  /** Agent this one is currently collaborating with, if any */
  collaboratingWith?: AgentName | null
}

/** Health status for the system health panel */
export type HealthLevel = 'green' | 'yellow' | 'red'

export interface AgentHealth {
  name: AgentName
  status: AgentStatus
  lastActivity: number | null
  lastHealthCheck: number | null
  healthCheckPassed: boolean
  healthLevel: HealthLevel
}

/** Events from agents-observe or seed data */
export interface MCEvent {
  id: number
  agent: AgentName
  type: string
  subtype: string | null
  toolName: string | null
  toolUseId?: string | null
  summary: string
  timestamp: number
  payload?: Record<string, unknown>
}

/** WebSocket message types matching agents-observe */
export interface WSEvent {
  type: 'event'
  data: {
    id: number
    agentId: string
    sessionId: string
    type: string
    subtype: string | null
    toolName: string | null
    toolUseId: string | null
    status: string
    timestamp: number
    payload: Record<string, unknown>
  }
}

export type WSMessage =
  | WSEvent
  | { type: 'session_update'; data: Record<string, unknown> }
  | { type: 'project_update'; data: Record<string, unknown> }

/** Cron job status for the cron panel */
export type CronStatus = 'ok' | 'due-soon' | 'overdue'

export interface CronJob {
  id: string
  name: string
  agent: AgentName
  schedule: string
  humanSchedule: string
  lastFired: number | null
  nextFire: number
  status: CronStatus
}

/** API integration health */
export type IntegrationStatus = 'healthy' | 'degraded' | 'down' | 'unknown'

export interface ApiIntegration {
  id: string
  name: string
  status: IntegrationStatus
  lastChecked: number
  detail: string
}

/** Context window / session usage */
export interface ContextUsage {
  maxTokens: number
  usedTokens: number
  fillPercent: number
}

export interface SubagentRun {
  agent: AgentName
  task: string
  tokensUsed: number
  completedAt: number
  duration: string
}

/** Token usage stats from ~/.claude/stats-cache.json */
export interface DayTokenSnapshot {
  date: string
  total: number
  byModel: Record<string, number>
  messages?: number
  toolCalls?: number
}

export interface ModelCumulative {
  total: number
  input: number
  output: number
  cacheRead: number
  cacheCreate: number
}

export interface TokenStats {
  lastComputedDate: string
  today: DayTokenSnapshot & { messages: number; toolCalls: number }
  yesterday: DayTokenSnapshot
  weeklyAvg: number
  recentDays: Array<DayTokenSnapshot & { messageCount: number; toolCallCount: number }>
  cumulative: Record<string, ModelCumulative>
  totalSessions: number
  totalMessages: number
  /** Per-agent, per-task-category tool call counts from observe.db */
  heatmap: Record<string, Record<string, number>>
  heatmapAgents: string[]
  heatmapCategories: string[]
}

/** Agent task from the task queue */
export interface AgentTask {
  id: number
  agent_name: AgentName
  title: string
  description: string | null
  status: 'queued' | 'active' | 'completed' | 'failed' | 'stale'
  priority: number
  created_at: number
  started_at: number | null
  completed_at: number | null
  tool_use_id: string | null
}

/** Kanban task — persistent strategic backlog */
export type KanbanStatus = 'backlog' | 'active' | 'in_progress' | 'done'
export type KanbanPriority = 'low' | 'medium' | 'high'

export interface KanbanTask {
  id: number
  title: string
  description: string | null
  agent_name: string
  status: KanbanStatus
  priority: KanbanPriority
  created_at: number
  updated_at: number
  activated_at: number | null
  completed_at: number | null
}

/** Daily summary item */
export interface DailySummaryItem {
  agent: AgentName
  description: string
  output: string | null
  completedAt: number
}
