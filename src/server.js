/**
 * Mission Control WebSocket Server
 *
 * Watches the SQLite events database and pushes updates to connected
 * browser clients. The React frontend connects here for real-time
 * agent status updates.
 *
 * Also serves the static frontend files.
 *
 * Usage: bun run src/server.js
 * Default: http://localhost:4200
 */

import { Database } from 'bun:sqlite'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const PORT = process.env.MC_PORT || 4200
const DB_PATH = join(process.env.HOME, '.config/fern/mission-control.db')
const PUBLIC_DIR = join(import.meta.dir, '..', 'public')

// Open database
const db = new Database(DB_PATH, { readonly: true })

// Track connected WebSocket clients
const clients = new Set()

// Track last event ID we've sent
let lastEventId = db.query('SELECT MAX(id) as max_id FROM events').get()?.max_id || 0

/**
 * Get current status for all agents
 */
function getAgentStatuses() {
  return db.query('SELECT * FROM agent_status').all()
}

/**
 * Get recent events (last N)
 */
function getRecentEvents(limit = 50) {
  return db.query('SELECT * FROM events ORDER BY id DESC LIMIT ?').all(limit)
}

/**
 * Check for new events and broadcast to clients
 */
function pollForUpdates() {
  const newEvents = db.query('SELECT * FROM events WHERE id > ? ORDER BY id ASC').all(lastEventId)

  if (newEvents.length > 0) {
    lastEventId = newEvents[newEvents.length - 1].id

    const statuses = getAgentStatuses()
    const message = JSON.stringify({
      type: 'update',
      events: newEvents,
      statuses: statuses,
      timestamp: new Date().toISOString(),
    })

    for (const client of clients) {
      try {
        client.send(message)
      } catch (e) {
        clients.delete(client)
      }
    }
  }
}

// Poll every 500ms for new events
setInterval(pollForUpdates, 500)

/**
 * Serve static files from public/
 */
function serveStatic(path) {
  const filePath = join(PUBLIC_DIR, path === '/' ? 'index.html' : path)

  if (!existsSync(filePath)) return null

  const content = readFileSync(filePath)
  const ext = filePath.split('.').pop()
  const contentTypes = {
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
    png: 'image/png',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
  }

  return new Response(content, {
    headers: { 'Content-Type': contentTypes[ext] || 'application/octet-stream' },
  })
}

/**
 * API endpoints
 */
function handleAPI(path) {
  if (path === '/api/status') {
    return Response.json({
      agents: getAgentStatuses(),
      timestamp: new Date().toISOString(),
    })
  }

  if (path === '/api/events') {
    return Response.json({
      events: getRecentEvents(),
      timestamp: new Date().toISOString(),
    })
  }

  return null
}

/**
 * Bun HTTP + WebSocket server
 */
const server = Bun.serve({
  port: PORT,

  fetch(req, server) {
    const url = new URL(req.url)

    // WebSocket upgrade
    if (url.pathname === '/ws') {
      if (server.upgrade(req)) return
      return new Response('WebSocket upgrade failed', { status: 500 })
    }

    // API routes
    const apiResponse = handleAPI(url.pathname)
    if (apiResponse) return apiResponse

    // Static files
    const staticResponse = serveStatic(url.pathname)
    if (staticResponse) return staticResponse

    // 404
    return new Response('Not found', { status: 404 })
  },

  websocket: {
    open(ws) {
      clients.add(ws)
      // Send initial state on connect
      ws.send(JSON.stringify({
        type: 'init',
        statuses: getAgentStatuses(),
        events: getRecentEvents(20),
        timestamp: new Date().toISOString(),
      }))
    },

    close(ws) {
      clients.delete(ws)
    },

    message(ws, message) {
      // Client can request refresh
      if (message === 'refresh') {
        ws.send(JSON.stringify({
          type: 'init',
          statuses: getAgentStatuses(),
          events: getRecentEvents(20),
          timestamp: new Date().toISOString(),
        }))
      }
    },
  },
})

console.log(`🌿 Mission Control running at http://localhost:${PORT}`)
console.log(`   WebSocket: ws://localhost:${PORT}/ws`)
console.log(`   Database: ${DB_PATH}`)
console.log(`   Static files: ${PUBLIC_DIR}`)
