// app/server/src/routes/kanban.ts
// Persistent kanban backlog — strategic task board for agent work.
// Separate from agent_tasks (live session queue). This is the backlog Fern polls
// to spawn agents for planned work.

import { Hono } from 'hono'
import type { EventStore, KanbanStatus, KanbanPriority } from '../storage/types'

type Env = {
  Variables: {
    store: EventStore
    broadcastToAll: (msg: object) => void
  }
}

const router = new Hono<Env>()

const VALID_STATUSES: KanbanStatus[] = ['queued', 'active', 'in_progress', 'completed', 'failed', 'stale']
const VALID_PRIORITIES: KanbanPriority[] = ['low', 'medium', 'high']

// GET /kanban — list all tasks, grouped by status column
router.get('/kanban', async (c) => {
  const store = c.get('store')
  try {
    const tasks = await store.getKanbanTasks()
    // Group by status for convenient frontend consumption
    const grouped = {
      queued: tasks.filter(t => t.status === 'queued'),
      active: tasks.filter(t => t.status === 'active'),
      in_progress: tasks.filter(t => t.status === 'in_progress'),
      completed: tasks.filter(t => t.status === 'completed').slice(0, 10), // cap completed at 10
      failed: tasks.filter(t => t.status === 'failed'),
      stale: tasks.filter(t => t.status === 'stale'),
    }
    return c.json({ tasks, grouped })
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch kanban tasks' }, 500)
  }
})

// POST /kanban — create a new task
router.post('/kanban', async (c) => {
  const store = c.get('store')
  const broadcastToAll = c.get('broadcastToAll')

  try {
    const body = await c.req.json()
    const { title, description, agent_name, status, priority, source } = body

    if (!title || typeof title !== 'string') {
      return c.json({ error: 'title is required' }, 400)
    }
    if (!agent_name || typeof agent_name !== 'string') {
      return c.json({ error: 'agent_name is required' }, 400)
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return c.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, 400)
    }
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return c.json({ error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}` }, 400)
    }

    const id = await store.createKanbanTask({
      title,
      description: description ?? null,
      agentName: agent_name,
      status: status ?? 'queued',
      priority: priority ?? 'medium',
      source: source ?? null,
    })

    const task = await store.getKanbanTaskById(id)
    broadcastToAll({ type: 'kanban_created', data: task })

    return c.json(task, 201)
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to create kanban task' }, 500)
  }
})

// GET /kanban/pending — tasks with status 'active' not yet claimed (for Fern to poll)
router.get('/kanban/pending', async (c) => {
  const store = c.get('store')
  try {
    const tasks = await store.getPendingKanbanTasks()
    return c.json(tasks)
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch pending kanban tasks' }, 500)
  }
})

// GET /kanban/pending-dispatch — queued tasks created via the UI that Fern hasn't dispatched yet.
// These are tasks with no tool_use_id or session_id (i.e. not created by an agent hook).
// Fern polls this endpoint to detect new UI-created tasks and dispatch them to the correct agent.
// After picking up a task, Fern should PATCH it to status=active (or in_progress) to prevent double-dispatch.
router.get('/kanban/pending-dispatch', async (c) => {
  const store = c.get('store')
  try {
    const tasks = await store.getPendingDispatchTasks()
    return c.json(tasks)
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch pending dispatch tasks' }, 500)
  }
})

// PATCH /kanban/:id — update a task (title, description, agent_name, status, priority)
router.patch('/kanban/:id', async (c) => {
  const store = c.get('store')
  const broadcastToAll = c.get('broadcastToAll')
  const id = parseInt(c.req.param('id'))

  if (isNaN(id)) {
    return c.json({ error: 'Invalid task id' }, 400)
  }

  try {
    const body = await c.req.json()
    const { title, description, agent_name, status, priority } = body

    if (status && !VALID_STATUSES.includes(status)) {
      return c.json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, 400)
    }
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return c.json({ error: `priority must be one of: ${VALID_PRIORITIES.join(', ')}` }, 400)
    }

    const existing = await store.getKanbanTaskById(id)
    if (!existing) {
      return c.json({ error: 'Task not found' }, 404)
    }

    await store.updateKanbanTask(id, {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(agent_name !== undefined && { agentName: agent_name }),
      ...(status !== undefined && { status }),
      ...(priority !== undefined && { priority }),
    })

    const task = await store.getKanbanTaskById(id)
    broadcastToAll({ type: 'kanban_updated', data: task })

    return c.json(task)
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to update kanban task' }, 500)
  }
})

// PATCH /kanban/:id/claim — Fern calls this to mark a task as in_progress (prevents double-pickup)
router.patch('/kanban/:id/claim', async (c) => {
  const store = c.get('store')
  const broadcastToAll = c.get('broadcastToAll')
  const id = parseInt(c.req.param('id'))

  if (isNaN(id)) {
    return c.json({ error: 'Invalid task id' }, 400)
  }

  try {
    const existing = await store.getKanbanTaskById(id)
    if (!existing) {
      return c.json({ error: 'Task not found' }, 404)
    }
    if (existing.status !== 'active') {
      return c.json({ error: `Task is ${existing.status}, not active — cannot claim` }, 409)
    }

    await store.claimKanbanTask(id)
    const task = await store.getKanbanTaskById(id)
    broadcastToAll({ type: 'kanban_updated', data: task })

    return c.json(task)
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to claim kanban task' }, 500)
  }
})

// DELETE /kanban/:id — remove a task
router.delete('/kanban/:id', async (c) => {
  const store = c.get('store')
  const broadcastToAll = c.get('broadcastToAll')
  const id = parseInt(c.req.param('id'))

  if (isNaN(id)) {
    return c.json({ error: 'Invalid task id' }, 400)
  }

  try {
    const existing = await store.getKanbanTaskById(id)
    if (!existing) {
      return c.json({ error: 'Task not found' }, 404)
    }

    await store.deleteKanbanTask(id)
    broadcastToAll({ type: 'kanban_deleted', data: { id } })

    return c.json({ ok: true, id })
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to delete kanban task' }, 500)
  }
})

export default router
