import { useState, useEffect, useRef } from 'react'
import type { AgentTask, AgentName } from '../types'

const API_BASE = '/api'
const POLL_INTERVAL_MS = 5_000

interface UseAgentTasksReturn {
  tasks: AgentTask[]
  tasksByAgent: Record<string, AgentTask[]>
  loading: boolean
}

export function useAgentTasks(connected: boolean): UseAgentTasksReturn {
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [loading, setLoading] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined)

  useEffect(() => {
    if (!connected) return

    let cancelled = false

    async function fetchTasks() {
      if (cancelled) return
      try {
        const res = await fetch(`${API_BASE}/tasks`)
        if (!res.ok) return
        const data: AgentTask[] = await res.json()
        if (!cancelled) setTasks(data)
      } catch {
        // Silent fail
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    setLoading(true)
    fetchTasks()
    pollRef.current = setInterval(fetchTasks, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(pollRef.current)
    }
  }, [connected])

  // Group tasks by agent
  const tasksByAgent: Record<string, AgentTask[]> = {}
  const agentNames: AgentName[] = ['fern', 'scout', 'reed', 'sentinel', 'timber', 'tide']
  for (const name of agentNames) {
    tasksByAgent[name] = tasks.filter(t => t.agent_name === name)
  }

  return { tasks, tasksByAgent, loading }
}
