import { useState } from 'react'
import { PermissionAlert } from './components/PermissionAlert'
import { OfficeScene } from './components/OfficeScene'
import { SolarpunkScene } from './components/SolarpunkScene'
import { ActivityFeed } from './components/ActivityFeed'
import { DailySummaryPanel } from './components/DailySummaryPanel'
import { FernTerminal } from './components/FernTerminal'
import { ContextWindowSidebar } from './components/ContextWindowSidebar'
import { OperationsPage } from './components/OperationsPage'
import { TaskPanel } from './components/TaskPanel'
import { KanbanPage } from './components/KanbanPage'
import { AnalyticsPage } from './components/AnalyticsPage'
import { useAgentEvents } from './hooks/useAgentEvents'
import { useOperationalData } from './hooks/useOperationalData'
import { useAgentTasks } from './hooks/useAgentTasks'
import { formatBubbleText } from './utils'
import type { AgentName } from './types'

type Page = 'dashboard' | 'operations' | 'kanban' | 'analytics'

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

function App() {
  const { agents: rawAgents, events, connected, usingSeed, blockedAgents } = useAgentEvents()
  const { crons, integrations, context, runs, summaryItems, tokenStats, liveTokenStats } = useOperationalData(connected)
  const { tasksByAgent } = useAgentTasks(connected)
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [selectedAgent, setSelectedAgent] = useState<AgentName | null>(null)
  const [sceneMode, setSceneMode] = useState<'pixel' | 'solarpunk'>('pixel')

  // Merge task state into agent state.
  // If an agent has an active task in the task queue but the event-driven state
  // doesn't reflect this (because the PreToolUse happened before the polling window),
  // override the agent status to "working" and surface the task title.
  // "blocked" state always takes precedence over task-driven "working".
  const agents = usingSeed ? rawAgents : (() => {
    const merged = { ...rawAgents }
    const agentNames = Object.keys(merged) as AgentName[]
    for (const name of agentNames) {
      const agent = merged[name]
      if (!agent) continue
      // Don't override blocked state
      if (agent.status === 'blocked') continue
      const agentTasks = tasksByAgent[name] || []
      // Stale tasks must not influence agent status — they're ghosts from a previous session
      const activeTask = agentTasks.find(t => t.status === 'in_progress')
      if (activeTask) {
        // Always update highLevelTask from active task to ensure it reflects current work.
        // Also promote to 'working' if not already in that state.
        const needsStatusUpdate = agent.status !== 'working'
        merged[name] = {
          ...agent,
          status: needsStatusUpdate ? 'working' : agent.status,
          highLevelTask: formatBubbleText(activeTask.title) || agent.highLevelTask,
        }
      } else if (agent.status !== 'blocked') {
        // No active task — clear any stale task label regardless of event-stream state.
        // Task queue is source of truth for whether real work is happening.
        if (agent.highLevelTask !== 'Standing by...') {
          merged[name] = { ...agent, highLevelTask: 'Standing by...' }
        }
      }
    }
    return merged
  })()

  function handleAgentClick(name: AgentName) {
    setSelectedAgent(prev => prev === name ? null : name)
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Permission alert banner — very top, above everything */}
      <PermissionAlert blockedAgents={blockedAgents} agentStates={agents} />

      {/* Main layout: sidebar + content */}
      <div className="flex-1 flex min-h-0">

        {/* ===== LEFT SIDEBAR ===== */}
        <aside className="w-[290px] shrink-0 bg-bg-card border-r border-border flex flex-col max-lg:hidden">

          {/* Welcome banner */}
          <div className="px-5 py-5 border-b border-border/50">
            <h1 className="text-base font-semibold text-fern tracking-wide">
              Welcome back, Josie
            </h1>
            <div className="text-xs text-gray-500 mt-1">{formatDate()}</div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  connected
                    ? 'bg-working'
                    : usingSeed
                      ? 'bg-reed'
                      : 'bg-blocked'
                }`}
              />
              <span className={connected ? 'text-working' : usingSeed ? 'text-reed' : 'text-blocked'}>
                {connected ? 'live' : usingSeed ? 'demo mode' : 'disconnected'}
              </span>
            </div>
          </div>

          {/* Output Summary */}
          <div className="flex-1 overflow-y-auto feed-scroll min-h-0">
            <div className="p-3">
              <DailySummaryPanel items={summaryItems} runs={runs} />
            </div>

            {/* Pending Decisions */}
            <div className="px-3 pb-3">
              <div className="bg-bg-dark rounded-2xl border border-border overflow-hidden">
                <div className="px-4 py-3 border-b border-border/50">
                  <h3 className="text-xs text-gray-500 uppercase tracking-widest font-medium">
                    Pending Decisions
                  </h3>
                </div>
                <div className="p-4">
                  {blockedAgents.length === 0 ? (
                    <div className="text-xs text-gray-600 italic text-center py-2">
                      No agents waiting for approval
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {blockedAgents.map(name => {
                        const state = agents[name]
                        return (
                          <div key={name} className="flex items-center gap-2 text-xs">
                            <span className="w-2 h-2 rounded-full bg-blocked animate-pulse-dot shrink-0" />
                            <span className="text-gray-300 font-medium capitalize">{name}</span>
                            <span className="text-gray-600 truncate">
                              {state?.blockedTool || 'permission'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Context Window — always visible */}
            <div className="px-3 pb-3">
              <ContextWindowSidebar usage={context} tokenStats={tokenStats} liveTokenStats={liveTokenStats} />
            </div>
          </div>

          {/* Action buttons at bottom */}
          <div className="p-3 border-t border-border/50 space-y-2">
            <div className="flex gap-2">
              <button className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-working/20 text-working border border-working/30 hover:bg-working/30 transition-colors">
                Start
              </button>
              <button className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-blocked/20 text-blocked border border-blocked/30 hover:bg-blocked/30 transition-colors">
                Stop
              </button>
            </div>
            <button className="w-full px-3 py-2 text-xs font-medium rounded-lg bg-bg-dark text-gray-400 border border-border hover:bg-bg-primary transition-colors">
              Import Context
            </button>
            <button
              onClick={() => setCurrentPage(currentPage === 'operations' ? 'dashboard' : 'operations')}
              className={`w-full px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                currentPage === 'operations'
                  ? 'bg-fern/10 text-fern border-fern/30'
                  : 'bg-bg-dark text-gray-400 border-border hover:bg-bg-primary'
              }`}
            >
              Health & Operations
            </button>
            <button
              onClick={() => setCurrentPage(currentPage === 'kanban' ? 'dashboard' : 'kanban')}
              className={`w-full px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                currentPage === 'kanban'
                  ? 'bg-fern/10 text-fern border-fern/30'
                  : 'bg-bg-dark text-gray-400 border-border hover:bg-bg-primary'
              }`}
            >
              Task Board
            </button>
            <button
              onClick={() => setCurrentPage(currentPage === 'analytics' ? 'dashboard' : 'analytics')}
              className={`w-full px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                currentPage === 'analytics'
                  ? 'bg-fern/10 text-fern border-fern/30'
                  : 'bg-bg-dark text-gray-400 border-border hover:bg-bg-primary'
              }`}
            >
              Content Analytics
            </button>
          </div>
        </aside>

        {/* ===== RIGHT MAIN AREA ===== */}
        {currentPage === 'operations' ? (
          <OperationsPage
            integrations={integrations}
            crons={crons}
            context={context}
            runs={runs}
            tokenStats={tokenStats}
            onBack={() => setCurrentPage('dashboard')}
          />
        ) : currentPage === 'kanban' ? (
          <KanbanPage onBack={() => setCurrentPage('dashboard')} />
        ) : currentPage === 'analytics' ? (
          <AnalyticsPage onBack={() => setCurrentPage('dashboard')} />
        ) : (
          <main className="flex-1 flex flex-col min-w-0 min-h-0">

            {/* Top: Office Scene — dominant focal point */}
            <div className="flex-1 p-5 min-h-0 overflow-hidden flex flex-col">
              {/* Header row: label + scene toggle + agent pills */}
              <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center gap-3">
                  <h2 className="text-xs text-gray-500 uppercase tracking-widest font-medium">
                    Agents
                  </h2>
                  {/* Scene mode toggle */}
                  <button
                    onClick={() => setSceneMode(prev => prev === 'pixel' ? 'solarpunk' : 'pixel')}
                    className="text-[0.58rem] font-medium px-2 py-0.5 rounded border border-border text-gray-500 hover:border-fern/30 hover:text-gray-300 transition-colors"
                    title="Toggle between pixel art and solarpunk scene"
                  >
                    {sceneMode === 'pixel' ? '🌿 Solarpunk' : '🎮 Pixel'}
                  </button>
                </div>
                {/* Clickable agent pills — click to show task panel */}
                <div className="flex items-center gap-1.5">
                  {(['fern', 'scout', 'reed', 'sentinel', 'timber'] as AgentName[]).map(name => {
                    const agent = agents[name]
                    const agentTasks = tasksByAgent[name] || []
                    const activeTasks = agentTasks.filter(t => t.status === 'in_progress' || t.status === 'queued').length
                    const isSelected = selectedAgent === name
                    const statusColor =
                      agent?.status === 'working' ? 'bg-working' :
                      agent?.status === 'blocked' ? 'bg-blocked' :
                      agent?.status === 'offline' ? 'bg-gray-600' :
                      'bg-fern'
                    return (
                      <button
                        key={name}
                        onClick={() => handleAgentClick(name)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[0.62rem] font-medium transition-colors border ${
                          isSelected
                            ? 'bg-fern/15 text-fern border-fern/40'
                            : 'bg-bg-dark text-gray-400 border-border hover:border-fern/30 hover:text-gray-300'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
                        <span className="capitalize">{name}</span>
                        {activeTasks > 0 && (
                          <span className="ml-0.5 bg-working/30 text-working text-[0.55rem] px-1 rounded-full font-semibold">
                            {activeTasks}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Task panel — shown when an agent is selected */}
              {selectedAgent && (
                <div className="mb-3 shrink-0">
                  <TaskPanel
                    agentName={selectedAgent}
                    tasks={tasksByAgent[selectedAgent] || []}
                    onClose={() => setSelectedAgent(null)}
                  />
                </div>
              )}

              <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
                {sceneMode === 'pixel' ? (
                  <OfficeScene agents={agents} />
                ) : (
                  <SolarpunkScene agents={agents} />
                )}
              </div>
            </div>

            {/* Bottom row: Activity Feed + Fern Terminal — constrained to viewport */}
            <div className="grid grid-cols-[1fr_380px] gap-0 border-t border-border h-[240px] shrink-0">
              {/* Activity Feed */}
              <div className="border-r border-border p-4 min-h-0 overflow-hidden">
                <ActivityFeed events={events} />
              </div>

              {/* Fern Terminal */}
              <div className="p-4 min-h-0 overflow-hidden">
                <FernTerminal />
              </div>
            </div>
          </main>
        )}
      </div>
    </div>
  )
}

export default App
