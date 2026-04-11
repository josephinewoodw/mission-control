// components/KanbanPage.tsx
// Persistent kanban board for strategic agent task backlog.
// Columns: Backlog → Active → In Progress → Done
// Drag-and-drop between columns using HTML5 native drag API.
// Agent filter, create task form, click-to-edit cards.

import { useState, useRef } from 'react'
import { useKanban } from '../hooks/useKanban'
import type { KanbanTask, KanbanStatus, KanbanPriority, AgentName } from '../types'

// ─── Constants ───────────────────────────────────────────────────────────────

const AGENT_NAMES: AgentName[] = ['fern', 'scout', 'reed', 'sentinel', 'timber', 'tide']

const COLUMN_ORDER: KanbanStatus[] = ['backlog', 'active', 'in_progress', 'done']

const COLUMN_LABELS: Record<KanbanStatus, string> = {
  backlog: 'Backlog',
  active: 'Pending',
  in_progress: 'In Progress',
  done: 'Done',
}

const COLUMN_COLORS: Record<KanbanStatus, string> = {
  backlog: 'text-gray-400',
  active: 'text-fern',
  in_progress: 'text-working',
  done: 'text-gray-500',
}

const COLUMN_BORDER_ACTIVE: Record<KanbanStatus, string> = {
  backlog: 'border-gray-600',
  active: 'border-fern/60',
  in_progress: 'border-working/60',
  done: 'border-gray-600',
}

const AGENT_COLORS: Record<string, string> = {
  fern: 'bg-fern/15 text-fern border-fern/30',
  scout: 'bg-scout/15 text-scout border-scout/30',
  reed: 'bg-reed/15 text-reed border-reed/30',
  sentinel: 'bg-sentinel/15 text-sentinel border-sentinel/30',
  timber: 'bg-working/15 text-working border-working/30',
  tide: 'bg-blue-400/15 text-blue-300 border-blue-400/30',
}

const PRIORITY_COLORS: Record<KanbanPriority, string> = {
  high: 'text-blocked',
  medium: 'text-reed',
  low: 'text-gray-500',
}

const PRIORITY_DOT: Record<KanbanPriority, string> = {
  high: 'bg-blocked',
  medium: 'bg-reed',
  low: 'bg-gray-600',
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function AgentPill({ agent }: { agent: string }) {
  const colorClass = AGENT_COLORS[agent] ?? 'bg-gray-700/30 text-gray-400 border-gray-600/30'
  return (
    <span className={`text-[0.58rem] px-1.5 py-0.5 rounded border font-medium capitalize ${colorClass}`}>
      {agent}
    </span>
  )
}

function PriorityIndicator({ priority }: { priority: KanbanPriority }) {
  return (
    <span className={`flex items-center gap-1 text-[0.58rem] font-medium ${PRIORITY_COLORS[priority]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[priority]}`} />
      {priority}
    </span>
  )
}

interface TaskCardProps {
  task: KanbanTask
  onDragStart: (e: React.DragEvent, task: KanbanTask) => void
  onEdit: (task: KanbanTask) => void
}

function TaskCard({ task, onDragStart, onEdit }: TaskCardProps) {
  const isActive = task.status === 'active'
  const isInProgress = task.status === 'in_progress'
  const isDone = task.status === 'done'

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onClick={() => onEdit(task)}
      className={`
        p-3 rounded-lg border cursor-grab active:cursor-grabbing select-none
        transition-all hover:border-opacity-60 hover:shadow-sm
        ${isActive ? 'border-fern/40 bg-fern/5 shadow-[0_0_8px_rgba(168,216,168,0.06)]' :
          isInProgress ? 'border-working/40 bg-working/5' :
          isDone ? 'border-border/40 bg-transparent opacity-50' :
          'border-border bg-bg-dark/50'}
      `}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`text-xs font-medium leading-snug flex-1 ${isDone ? 'line-through text-gray-500' : 'text-gray-200'}`}>
          {task.title}
        </span>
      </div>

      {task.description && !isDone && (
        <p className="text-[0.62rem] text-gray-500 mb-2 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <AgentPill agent={task.agent_name} />
        <PriorityIndicator priority={task.priority} />
      </div>
    </div>
  )
}

// ─── Create / Edit Modal ─────────────────────────────────────────────────────

interface TaskModalProps {
  task: Partial<KanbanTask> | null
  onSave: (data: {
    title: string
    description: string | null
    agent_name: string
    status: KanbanStatus
    priority: KanbanPriority
  }) => void
  onDelete?: () => void
  onClose: () => void
  isNew?: boolean
}

function TaskModal({ task, onSave, onDelete, onClose, isNew = false }: TaskModalProps) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [agentName, setAgentName] = useState(task?.agent_name ?? 'fern')
  const [status, setStatus] = useState<KanbanStatus>(task?.status ?? 'backlog')
  const [priority, setPriority] = useState<KanbanPriority>(task?.priority ?? 'medium')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    onSave({
      title: title.trim(),
      description: description.trim() || null,
      agent_name: agentName,
      status,
      priority,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg-card border border-border rounded-2xl w-full max-w-md shadow-xl">
        <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-200">
            {isNew ? 'New Task' : 'Edit Task'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-400 transition-colors text-xl leading-none px-1"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-[0.68rem] text-gray-500 uppercase tracking-widest mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-fern/50"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[0.68rem] text-gray-500 uppercase tracking-widest mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Context, acceptance criteria, notes..."
              rows={3}
              className="w-full px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-fern/50 resize-none"
            />
          </div>

          {/* Agent + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[0.68rem] text-gray-500 uppercase tracking-widest mb-1.5">
                Agent
              </label>
              <select
                value={agentName}
                onChange={e => setAgentName(e.target.value)}
                className="w-full px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm text-gray-200 focus:outline-none focus:border-fern/50"
              >
                {AGENT_NAMES.map(name => (
                  <option key={name} value={name} className="capitalize">
                    {name.charAt(0).toUpperCase() + name.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[0.68rem] text-gray-500 uppercase tracking-widest mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as KanbanPriority)}
                className="w-full px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm text-gray-200 focus:outline-none focus:border-fern/50"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Status */}
          {!isNew && (
            <div>
              <label className="block text-[0.68rem] text-gray-500 uppercase tracking-widest mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as KanbanStatus)}
                className="w-full px-3 py-2 bg-bg-dark border border-border rounded-lg text-sm text-gray-200 focus:outline-none focus:border-fern/50"
              >
                <option value="backlog">Backlog</option>
                <option value="active">Active</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 px-3 py-2 text-sm font-medium rounded-lg bg-fern/20 text-fern border border-fern/30 hover:bg-fern/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isNew ? 'Create Task' : 'Save Changes'}
            </button>
            {!isNew && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="px-3 py-2 text-sm font-medium rounded-lg bg-blocked/10 text-blocked border border-blocked/20 hover:bg-blocked/20 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Column ───────────────────────────────────────────────────────────────────

interface ColumnProps {
  status: KanbanStatus
  tasks: KanbanTask[]
  isDragOver: boolean
  onDragOver: (e: React.DragEvent, status: KanbanStatus) => void
  onDragLeave: (e: React.DragEvent, status: KanbanStatus) => void
  onDrop: (e: React.DragEvent, status: KanbanStatus) => void
  onDragStart: (e: React.DragEvent, task: KanbanTask) => void
  onEdit: (task: KanbanTask) => void
  agentFilter: AgentName | 'all'
}

function KanbanColumn({
  status,
  tasks,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onEdit,
  agentFilter,
}: ColumnProps) {
  const filtered = agentFilter === 'all' ? tasks : tasks.filter(t => t.agent_name === agentFilter)
  const label = COLUMN_LABELS[status]
  const color = COLUMN_COLORS[status]
  const borderColor = COLUMN_BORDER_ACTIVE[status]

  return (
    <div
      className={`
        flex flex-col min-h-0 rounded-xl border transition-colors
        ${isDragOver
          ? `${borderColor} bg-bg-card shadow-lg`
          : 'border-border/50 bg-bg-dark/30'
        }
      `}
      onDragOver={(e) => onDragOver(e, status)}
      onDragLeave={(e) => onDragLeave(e, status)}
      onDrop={(e) => onDrop(e, status)}
    >
      {/* Column header */}
      <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <h3 className={`text-xs font-semibold uppercase tracking-widest ${color}`}>
            {label}
          </h3>
          <span className="text-[0.62rem] text-gray-600 font-medium">
            {filtered.length}
          </span>
        </div>
        {isDragOver && (
          <span className="text-[0.6rem] text-gray-500 italic">Drop here</span>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto feed-scroll p-3 space-y-2 min-h-[60px]">
        {filtered.length === 0 && (
          <div className={`text-[0.65rem] text-gray-600 italic text-center py-4 ${isDragOver ? 'text-gray-500' : ''}`}>
            {isDragOver ? 'Release to drop' : status === 'done' ? 'Nothing completed yet' : 'No tasks'}
          </div>
        )}
        {filtered.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onDragStart={onDragStart}
            onEdit={onEdit}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main KanbanPage ──────────────────────────────────────────────────────────

interface KanbanPageProps {
  onBack: () => void
}

export function KanbanPage({ onBack }: KanbanPageProps) {
  const { grouped, loading, error, createTask, updateTask, deleteTask } = useKanban()

  const [dragOverColumn, setDragOverColumn] = useState<KanbanStatus | null>(null)
  const dragTaskRef = useRef<KanbanTask | null>(null)

  const [agentFilter, setAgentFilter] = useState<AgentName | 'all'>('all')
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // ─── Drag handlers ──────────────────────────────────────────────────────────

  function handleDragStart(e: React.DragEvent, task: KanbanTask) {
    dragTaskRef.current = task
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(task.id))
  }

  function handleDragOver(e: React.DragEvent, status: KanbanStatus) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(status)
  }

  function handleDragLeave(e: React.DragEvent, _status: KanbanStatus) {
    // Only clear the drag-over state if the pointer has left the column entirely.
    // When dragging over child elements (task cards), the browser fires dragleave
    // on the column and dragenter on the card — relatedTarget will be the card,
    // which is still inside currentTarget. Ignoring those keeps the highlight stable
    // and ensures onDrop fires correctly when releasing over a card.
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setDragOverColumn(null)
  }

  async function handleDrop(e: React.DragEvent, targetStatus: KanbanStatus) {
    e.preventDefault()
    setDragOverColumn(null)

    const task = dragTaskRef.current
    if (!task) return
    dragTaskRef.current = null

    if (task.status === targetStatus) return

    await updateTask(task.id, { status: targetStatus })
  }

  // ─── Edit / create handlers ─────────────────────────────────────────────────

  async function handleSaveEdit(data: {
    title: string
    description: string | null
    agent_name: string
    status: KanbanStatus
    priority: KanbanPriority
  }) {
    if (!editingTask) return
    await updateTask(editingTask.id, {
      title: data.title,
      description: data.description,
      agent_name: data.agent_name,
      status: data.status,
      priority: data.priority,
    })
    setEditingTask(null)
  }

  async function handleDeleteEdit() {
    if (!editingTask) return
    await deleteTask(editingTask.id)
    setEditingTask(null)
  }

  async function handleCreate(data: {
    title: string
    description: string | null
    agent_name: string
    status: KanbanStatus
    priority: KanbanPriority
  }) {
    await createTask(data)
    setShowCreateModal(false)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
      {/* Page header */}
      <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-gray-300 transition-colors text-sm"
          >
            ← Back
          </button>
          <div className="h-4 w-px bg-border" />
          <div>
            <h2 className="text-sm font-semibold text-gray-200">Task Board</h2>
            <p className="text-[0.62rem] text-gray-500 mt-0.5">Strategic backlog · drag cards to change status</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Agent filter pills */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setAgentFilter('all')}
              className={`px-2 py-1 rounded-lg text-[0.62rem] font-medium transition-colors border ${
                agentFilter === 'all'
                  ? 'bg-fern/15 text-fern border-fern/40'
                  : 'bg-transparent text-gray-500 border-border hover:text-gray-300'
              }`}
            >
              All
            </button>
            {AGENT_NAMES.map(name => {
              const colorClass = AGENT_COLORS[name] ?? 'bg-gray-700/30 text-gray-400 border-gray-600'
              const isSelected = agentFilter === name
              return (
                <button
                  key={name}
                  onClick={() => setAgentFilter(agentFilter === name ? 'all' : name)}
                  className={`px-2 py-1 rounded-lg text-[0.62rem] font-medium capitalize transition-colors border ${
                    isSelected ? colorClass : 'bg-transparent text-gray-500 border-border hover:text-gray-300'
                  }`}
                >
                  {name}
                </button>
              )
            })}
          </div>

          <div className="h-4 w-px bg-border mx-1" />

          {/* New task button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-fern/20 text-fern border border-fern/30 hover:bg-fern/30 transition-colors"
          >
            + New Task
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-6 mt-3 px-3 py-2 bg-blocked/10 border border-blocked/20 rounded-lg text-xs text-blocked shrink-0">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-xs text-gray-600 animate-pulse">Loading task board...</div>
        </div>
      )}

      {/* Kanban columns */}
      {!loading && (
        <div className="flex-1 overflow-hidden p-5">
          <div className="h-full grid grid-cols-4 gap-4">
            {COLUMN_ORDER.map(status => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={grouped[status]}
                isDragOver={dragOverColumn === status}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragStart={handleDragStart}
                onEdit={setEditingTask}
                agentFilter={agentFilter}
              />
            ))}
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingTask && (
        <TaskModal
          task={editingTask}
          onSave={handleSaveEdit}
          onDelete={handleDeleteEdit}
          onClose={() => setEditingTask(null)}
        />
      )}

      {/* Create modal */}
      {showCreateModal && (
        <TaskModal
          task={null}
          onSave={handleCreate}
          onClose={() => setShowCreateModal(false)}
          isNew
        />
      )}
    </div>
  )
}
