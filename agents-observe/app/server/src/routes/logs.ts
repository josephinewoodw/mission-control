// app/server/src/routes/logs.ts
// Log streaming for the FernTerminal component.
// GET /api/logs/tail?file=scout-daily-brief — returns last 50 lines as JSON
// GET /api/logs/stream?file=scout-daily-brief — SSE stream of new log lines (tail -f style)
// GET /api/logs/list — list available log files

import { Hono } from 'hono'
import { stream } from 'hono/streaming'
import fs from 'fs'
import path from 'path'
import os from 'os'
import readline from 'readline'

const LOG_DIR = path.join(os.homedir(), 'Library', 'Logs', 'mission-control')
const FERN_LOG = path.join(os.homedir(), '.config', 'fern', 'fern-session.log')

// Known log files and their display names
const KNOWN_LOGS: Record<string, string> = {
  'fern-session': FERN_LOG,
  'scout-daily-brief': path.join(LOG_DIR, 'scout-daily-brief.log'),
  'reed-weekly-content': path.join(LOG_DIR, 'reed-weekly-content.log'),
  'sentinel-context-collection': path.join(LOG_DIR, 'sentinel-context-collection.log'),
  'sentinel-nightly-security-scan': path.join(LOG_DIR, 'sentinel-nightly-security-scan.log'),
  'sentinel-health-check-morning': path.join(LOG_DIR, 'sentinel-health-check-morning.log'),
  'sentinel-health-check-evening': path.join(LOG_DIR, 'sentinel-health-check-evening.log'),
  'scout-weekly-content-review': path.join(LOG_DIR, 'scout-weekly-content-review.log'),
  'scout-derek-job-scan': path.join(LOG_DIR, 'scout-derek-job-scan.log'),
  'notion-kanban-sync': path.join(LOG_DIR, 'notion-kanban-sync.log'),
}

function resolvePath(file: string): string | null {
  if (!file) return null
  if (KNOWN_LOGS[file]) return KNOWN_LOGS[file]
  return null
}

/** Read last N lines from a file */
async function tailLines(filePath: string, n: number): Promise<string[]> {
  if (!fs.existsSync(filePath)) return []
  const stat = fs.statSync(filePath)
  if (stat.size === 0) return []

  // Read file backward to get last N lines efficiently
  const MAX_READ = Math.min(stat.size, n * 200) // estimate ~200 chars per line
  const buffer = Buffer.alloc(MAX_READ)
  const fd = fs.openSync(filePath, 'r')
  const offset = Math.max(0, stat.size - MAX_READ)
  fs.readSync(fd, buffer, 0, MAX_READ, offset)
  fs.closeSync(fd)

  const content = buffer.toString('utf-8')
  const lines = content.split('\n').filter(l => l.trim())
  return lines.slice(-n)
}

const router = new Hono()

// GET /api/logs/list — list available log files with last-modified
router.get('/logs/list', (c) => {
  const result = Object.entries(KNOWN_LOGS).map(([id, filePath]) => {
    let exists = false
    let size = 0
    let lastModified: string | null = null
    try {
      const stat = fs.statSync(filePath)
      exists = true
      size = stat.size
      lastModified = stat.mtime.toISOString()
    } catch {
      // file doesn't exist
    }
    return { id, path: filePath, exists, size, lastModified }
  })
  return c.json(result)
})

// GET /api/logs/tail?file=<id>&lines=50 — return last N lines as JSON
router.get('/logs/tail', async (c) => {
  const file = c.req.query('file') || 'scout-daily-brief'
  const lines = Math.min(parseInt(c.req.query('lines') || '50'), 200)

  const filePath = resolvePath(file)
  if (!filePath) {
    return c.json({ error: `Unknown log file: ${file}. Use /api/logs/list to see available files.` }, 400)
  }

  const content = await tailLines(filePath, lines)
  return c.json({ file, lines: content, count: content.length })
})

// GET /api/logs/stream?file=<id> — SSE stream of new log lines (tail -f)
router.get('/logs/stream', (c) => {
  const file = c.req.query('file') || 'scout-daily-brief'
  const filePath = resolvePath(file)

  if (!filePath) {
    return c.json({ error: `Unknown log file: ${file}` }, 400)
  }

  return stream(c, async (s) => {
    // Set SSE headers
    c.header('Content-Type', 'text/event-stream')
    c.header('Cache-Control', 'no-cache')
    c.header('Connection', 'keep-alive')
    c.header('X-Accel-Buffering', 'no')

    let currentSize = 0
    try {
      if (fs.existsSync(filePath)) {
        currentSize = fs.statSync(filePath).size
      }
    } catch {
      // file might not exist yet
    }

    // Send last 30 lines immediately on connect
    const initial = await tailLines(filePath, 30)
    for (const line of initial) {
      await s.write(`data: ${JSON.stringify({ type: 'line', line, ts: Date.now() })}\n\n`)
    }
    await s.write(`data: ${JSON.stringify({ type: 'connected', file })}\n\n`)

    // Poll for new content every 500ms
    const INTERVAL = 500
    let running = true

    const cleanup = () => {
      running = false
    }

    // Stream is done when client disconnects
    s.onAbort(cleanup)

    while (running) {
      await new Promise<void>(resolve => setTimeout(resolve, INTERVAL))

      if (!running) break

      try {
        let size = currentSize
        if (fs.existsSync(filePath)) {
          size = fs.statSync(filePath).size
        }

        if (size > currentSize) {
          // Read only new bytes
          const newBytes = size - currentSize
          const buf = Buffer.alloc(newBytes)
          const fd = fs.openSync(filePath, 'r')
          fs.readSync(fd, buf, 0, newBytes, currentSize)
          fs.closeSync(fd)
          currentSize = size

          const newContent = buf.toString('utf-8')
          const newLines = newContent.split('\n').filter(l => l.trim())

          for (const line of newLines) {
            await s.write(`data: ${JSON.stringify({ type: 'line', line, ts: Date.now() })}\n\n`)
          }
        } else if (size < currentSize) {
          // Log was rotated/truncated
          currentSize = size
          await s.write(`data: ${JSON.stringify({ type: 'reset', file })}\n\n`)
        }
      } catch {
        // Ignore fs errors during streaming (file might be temporarily locked)
      }
    }
  })
})

export default router
