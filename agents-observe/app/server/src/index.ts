// app/server/src/index.ts
import type { Server } from 'http'
import { serve } from '@hono/node-server'
import { createApp } from './app'
import { createStore } from './storage'
import { attachWebSocket, broadcastToSession, broadcastToAll } from './websocket'
import { config } from './config'
import { startConsumerSweep } from './consumer-tracker'

const store = createStore()
const PORT = config.port

// Mark any tasks left open from a previous session/crash as stale.
// This runs before the server accepts connections so the initial GET /api/tasks
// already returns clean state.
store.markStaleTasksOnStartup().catch((err) => {
  console.warn('[startup] Failed to mark stale tasks:', err)
})

// Seed kanban backlog on first run (idempotent — only seeds if the table is empty)
seedKanbanIfEmpty(store).catch((err) => {
  console.warn('[startup] Failed to seed kanban:', err)
})

async function seedKanbanIfEmpty(s: typeof store) {
  const existing = await s.getKanbanTasks()
  if (existing.length > 0) return

  const seeds: Array<{ title: string; description?: string; agent_name: string }> = [
    {
      title: 'Agent collaboration visualization',
      description: 'Add visual indicators when agents are working together — show parent/child relationships in the office scene.',
      agent_name: 'timber',
    },
    {
      title: 'Tide spritesheet integration',
      description: 'Integrate the Tide agent spritesheet into the canvas engine and add to the office scene.',
      agent_name: 'timber',
    },
    {
      title: 'Add KNYC Central Park to weather model',
      description: 'Include KNYC Central Park weather station data in Tide\'s prediction models for NYC-based events.',
      agent_name: 'tide',
    },
    {
      title: 'Investigate daily brief RemoteTrigger failure',
      description: 'The daily brief RemoteTrigger occasionally fails to fire. Investigate root cause and add retry logic.',
      agent_name: 'scout',
    },
    {
      title: 'Dropbox setup for phone-Fern file transfer',
      description: 'Set up Dropbox integration so Josie can drop files on her phone and Fern can read them.',
      agent_name: 'fern',
    },
    {
      title: 'Permissions audit',
      description: 'Audit all agent permissions in settings.json — verify each tool is correctly gated and no over-provisioning.',
      agent_name: 'sentinel',
    },
  ]

  for (const seed of seeds) {
    await s.createKanbanTask({
      title: seed.title,
      description: seed.description ?? null,
      agentName: seed.agent_name,
      status: 'backlog',
      priority: 'medium',
    })
  }
  console.log(`[startup] Seeded ${seeds.length} kanban tasks`)
}

const app = createApp(store, broadcastToSession, broadcastToAll)

function start(retries = 3) {
  const server = serve({ fetch: app.fetch, port: PORT }, () => {
    console.log(`Server running on http://localhost:${PORT}`)
    console.log(`POST events: http://localhost:${PORT}/api/events`)
  })

  ;(server as unknown as Server).on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE' && retries > 0) {
      console.log(`Port ${PORT} in use, retrying in 1s... (${retries} left)`)
      setTimeout(() => start(retries - 1), 1000)
    } else {
      console.error(err)
      process.exit(1)
    }
  })

  attachWebSocket(server as unknown as Server)
  startConsumerSweep()
}

start()
