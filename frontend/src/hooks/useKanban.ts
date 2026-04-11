// hooks/useKanban.ts
// Polling hook for the kanban board. Fetches all tasks and provides mutation functions.
// WebSocket updates are handled via the existing useAgentEvents infrastructure —
// kanban_created/updated/deleted messages trigger a re-fetch.

import { useState, useEffect, useRef, useCallback } from 'react'
import type { KanbanTask, KanbanStatus, KanbanPriority } from '../types'

const API_BASE = '/api'
const POLL_INTERVAL_MS = 10_000

export interface KanbanGrouped {
  queued: KanbanTask[]
  active: KanbanTask[]
  in_progress: KanbanTask[]
  completed: KanbanTask[]
  failed: KanbanTask[]
  stale: KanbanTask[]
}

interface UseKanbanReturn {
  tasks: KanbanTask[]
  grouped: KanbanGrouped
  loading: boolean
  error: string | null
  createTask: (params: {
    title: string
    description?: string | null
    agent_name: string
    status?: KanbanStatus
    priority?: KanbanPriority
  }) => Promise<KanbanTask | null>
  updateTask: (id: number, updates: Partial<{
    title: string
    description: string | null
    agent_name: string
    status: KanbanStatus
    priority: KanbanPriority
  }>) => Promise<KanbanTask | null>
  deleteTask: (id: number) => Promise<boolean>
  refetch: () => void
}

export function useKanban(): UseKanbanReturn {
  const [tasks, setTasks] = useState<KanbanTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const cancelledRef = useRef(false)

  const fetchTasks = useCallback(async () => {
    if (cancelledRef.current) return
    try {
      const res = await fetch(`${API_BASE}/kanban`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: { tasks: KanbanTask[]; grouped: KanbanGrouped } = await res.json()
      if (!cancelledRef.current) {
        setTasks(data.tasks)
        setError(null)
      }
    } catch (err: any) {
      if (!cancelledRef.current) {
        setError(err.message || 'Failed to fetch kanban tasks')
      }
    } finally {
      if (!cancelledRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    cancelledRef.current = false
    setLoading(true)
    fetchTasks()
    pollRef.current = setInterval(fetchTasks, POLL_INTERVAL_MS)
    return () => {
      cancelledRef.current = true
      clearInterval(pollRef.current)
    }
  }, [fetchTasks])

  const createTask = useCallback(async (params: {
    title: string
    description?: string | null
    agent_name: string
    status?: KanbanStatus
    priority?: KanbanPriority
  }): Promise<KanbanTask | null> => {
    try {
      const res = await fetch(`${API_BASE}/kanban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const task: KanbanTask = await res.json()
      setTasks(prev => [task, ...prev])
      return task
    } catch (err: any) {
      setError(err.message)
      return null
    }
  }, [])

  const updateTask = useCallback(async (
    id: number,
    updates: Partial<{
      title: string
      description: string | null
      agent_name: string
      status: KanbanStatus
      priority: KanbanPriority
    }>,
  ): Promise<KanbanTask | null> => {
    try {
      const res = await fetch(`${API_BASE}/kanban/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      const task: KanbanTask = await res.json()
      setTasks(prev => prev.map(t => t.id === id ? task : t))
      return task
    } catch (err: any) {
      setError(err.message)
      return null
    }
  }, [])

  const deleteTask = useCallback(async (id: number): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/kanban/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      setTasks(prev => prev.filter(t => t.id !== id))
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    }
  }, [])

  // Group tasks into columns
  const grouped: KanbanGrouped = {
    queued: tasks.filter(t => t.status === 'queued'),
    active: tasks.filter(t => t.status === 'active'),
    in_progress: tasks.filter(t => t.status === 'in_progress'),
    completed: tasks.filter(t => t.status === 'completed').slice(0, 10),
    failed: tasks.filter(t => t.status === 'failed'),
    stale: tasks.filter(t => t.status === 'stale'),
  }

  return {
    tasks,
    grouped,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    refetch: fetchTasks,
  }
}
