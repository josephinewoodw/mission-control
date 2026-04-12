// app/server/src/storage/types.ts

export interface InsertEventParams {
  agentId: string
  sessionId: string
  type: string
  subtype: string | null
  toolName: string | null
  summary: string | null
  timestamp: number
  payload: Record<string, unknown>
  toolUseId?: string | null
  status?: string
}

export interface EventFilters {
  agentIds?: string[]
  type?: string
  subtype?: string
  search?: string
  limit?: number
  offset?: number
}

export interface StoredEvent {
  id: number
  agent_id: string
  session_id: string
  type: string
  subtype: string | null
  tool_name: string | null
  tool_use_id: string | null
  status: string
  summary: string | null
  timestamp: number
  payload: string // JSON string in DB
}

export interface EventStore {
  createProject(slug: string, name: string, transcriptPath: string | null): Promise<number>
  getProjectBySlug(slug: string): Promise<any | null>
  getProjectByTranscriptPath(transcriptPath: string): Promise<any | null>
  updateProjectName(projectId: number, name: string): Promise<void>
  isSlugAvailable(slug: string): Promise<boolean>
  deleteProject(projectId: number): Promise<void>
  upsertSession(
    id: string,
    projectId: number,
    slug: string | null,
    metadata: Record<string, unknown> | null,
    timestamp: number,
  ): Promise<void>
  upsertAgent(
    id: string,
    sessionId: string,
    parentAgentId: string | null,
    name: string | null,
    description: string | null,
    agentType?: string | null,
  ): Promise<void>
  updateAgentType(id: string, agentType: string): Promise<void>
  updateSessionStatus(id: string, status: string): Promise<void>
  updateSessionSlug(sessionId: string, slug: string): Promise<void>
  updateAgentName(agentId: string, name: string): Promise<void>
  insertEvent(params: InsertEventParams): Promise<number>
  getProjects(): Promise<any[]>
  getSessionsForProject(projectId: number): Promise<any[]>
  getSessionById(sessionId: string): Promise<any | null>
  getAgentById(agentId: string): Promise<any | null>
  getAgentsForSession(sessionId: string): Promise<any[]>
  getEventsForSession(sessionId: string, filters?: EventFilters): Promise<StoredEvent[]>
  getEventsForAgent(agentId: string): Promise<StoredEvent[]>
  getThreadForEvent(eventId: number): Promise<StoredEvent[]>
  getEventsSince(sessionId: string, sinceTimestamp: number): Promise<StoredEvent[]>
  deleteSession(sessionId: string): Promise<void>
  clearAllData(): Promise<void>
  clearSessionEvents(sessionId: string): Promise<void>
  getRecentSessions(limit?: number): Promise<any[]>
  upsertSessionUsage(
    sessionId: string,
    usage: {
      inputTokens: number
      outputTokens: number
      cacheReadTokens: number
      cacheCreationTokens: number
      totalCostUsd?: number | null
    },
  ): Promise<void>
  getSessionUsage(sessionId: string): Promise<any | null>
  getUsageForSessions(sessionIds: string[]): Promise<any[]>
  healthCheck(): Promise<{ ok: boolean; error?: string }>

  // Unified task API (backed by kanban_tasks table)
  createTask(params: {
    agentName: string
    title: string
    description?: string | null
    priority?: number | KanbanPriority
    toolUseId?: string | null
    sessionId?: string | null
  }): Promise<number>
  getTasksForAgent(agentName: string, limit?: number): Promise<any[]>
  getAllTasks(limit?: number): Promise<any[]>
  updateTaskStatus(id: number, status: KanbanStatus): Promise<void>
  updateTaskByToolUseId(toolUseId: string, status: 'in_progress' | 'completed' | 'failed'): Promise<void>
  getTaskById(id: number): Promise<any | null>
  /** Mark all active/queued tasks as stale — called on server cold startup to clear leftover tasks from crashed sessions */
  markStaleTasksOnStartup(): Promise<number>
  /** Mark active/queued tasks from previous sessions as stale — called on SessionStart with the new session ID */
  markStaleTasksForNewSession(currentSessionId: string): Promise<number>

  // Kanban tasks (same table — unified API)
  createKanbanTask(params: {
    title: string
    description?: string | null
    agentName: string
    status?: KanbanStatus
    priority?: KanbanPriority
  }): Promise<number>
  getKanbanTasks(): Promise<KanbanTask[]>
  getKanbanTaskById(id: number): Promise<KanbanTask | null>
  updateKanbanTask(id: number, updates: Partial<{
    title: string
    description: string | null
    agentName: string
    status: KanbanStatus
    priority: KanbanPriority
  }>): Promise<void>
  deleteKanbanTask(id: number): Promise<void>
  getPendingKanbanTasks(): Promise<KanbanTask[]>
  claimKanbanTask(id: number): Promise<void>
  getPendingDispatchTasks(): Promise<KanbanTask[]>
}

export type KanbanStatus = 'queued' | 'active' | 'in_progress' | 'completed' | 'failed' | 'stale'
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
  tool_use_id: string | null
  session_id: string | null
}
