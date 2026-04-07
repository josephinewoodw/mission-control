/**
 * Seed the agents-observe database with sample data for the Fern agent team.
 * Run: bun run src/seed-db.ts
 *
 * This creates a project, session, 4 agents, and realistic events
 * so the dashboard has something to display without live agent activity.
 */

import { Database } from 'bun:sqlite'
import { existsSync, mkdirSync } from 'fs'
import { dirname, resolve } from 'path'

const DB_PATH = resolve(
  process.env.AGENTS_OBSERVE_DB_PATH || '../../data/observe.db'
)

// Ensure directory exists
const dir = dirname(DB_PATH)
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true })
}

const db = new Database(DB_PATH)

// Enable WAL mode
db.run('PRAGMA journal_mode = WAL')
db.run('PRAGMA foreign_keys = ON')

// Create tables (matching agents-observe schema)
db.run(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    transcript_path TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`)

db.run(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    slug TEXT,
    status TEXT DEFAULT 'active',
    started_at INTEGER NOT NULL,
    stopped_at INTEGER,
    metadata TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`)

db.run(`
  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    parent_agent_id TEXT,
    name TEXT,
    description TEXT,
    agent_type TEXT,
    agent_class TEXT DEFAULT 'claude-code',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    FOREIGN KEY (parent_agent_id) REFERENCES agents(id)
  )
`)

db.run(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    type TEXT NOT NULL,
    subtype TEXT,
    tool_name TEXT,
    summary TEXT,
    timestamp INTEGER NOT NULL,
    payload TEXT NOT NULL,
    tool_use_id TEXT,
    status TEXT DEFAULT 'pending',
    FOREIGN KEY (agent_id) REFERENCES agents(id),
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  )
`)

// Create indexes
db.run('CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id, timestamp)')
db.run('CREATE INDEX IF NOT EXISTS idx_events_agent ON events(agent_id, timestamp)')
db.run('CREATE INDEX IF NOT EXISTS idx_events_type ON events(type, subtype)')
db.run('CREATE INDEX IF NOT EXISTS idx_agents_session ON agents(session_id)')

const now = Date.now()
const min = 60_000
const hour = 3_600_000

// Insert project
const projectSlug = 'fern-vault'
const existingProject = db.query('SELECT id FROM projects WHERE slug = ?').get(projectSlug)
let projectId: number

if (existingProject) {
  projectId = (existingProject as { id: number }).id
  console.log(`Project "${projectSlug}" already exists (id=${projectId}), adding new session`)
} else {
  const result = db.run(
    'INSERT INTO projects (slug, name, transcript_path, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [projectSlug, 'Fern Vault', null, now, now]
  )
  projectId = Number(result.lastInsertRowid)
  console.log(`Created project "${projectSlug}" (id=${projectId})`)
}

// Insert session
const sessionId = `seed-session-${Date.now()}`
db.run(
  'INSERT INTO sessions (id, project_id, slug, status, started_at, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  [sessionId, projectId, 'seed-demo', 'active', now - 4 * hour, null, now, now]
)

// Insert agents
const agentDefs = [
  { id: sessionId, name: null, type: null, parent: null, desc: 'Root session agent' }, // root = Fern
  { id: `scout-${sessionId}`, name: 'Scout', type: 'scout', parent: sessionId, desc: 'Research agent' },
  { id: `reed-${sessionId}`, name: 'Reed', type: 'reed', parent: sessionId, desc: 'Content creation agent' },
  { id: `sentinel-${sessionId}`, name: 'Sentinel', type: 'sentinel', parent: sessionId, desc: 'Security/ops agent' },
]

for (const a of agentDefs) {
  db.run(
    'INSERT INTO agents (id, session_id, parent_agent_id, name, description, agent_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [a.id, sessionId, a.parent, a.name, a.desc, a.type, now, now]
  )
}

// Insert events
const events = [
  // Fern session start
  { agent: sessionId, type: 'lifecycle', subtype: 'SessionStart', tool: null, ts: now - 4 * hour },
  { agent: sessionId, type: 'tool', subtype: 'PostToolUse', tool: 'Read', ts: now - 4 * hour + 5000 },
  { agent: sessionId, type: 'tool', subtype: 'PostToolUse', tool: 'Read', ts: now - 4 * hour + 8000 },

  // Scout daily brief
  { agent: `scout-${sessionId}`, type: 'lifecycle', subtype: 'SubagentStart', tool: null, ts: now - 3.5 * hour },
  { agent: `scout-${sessionId}`, type: 'tool', subtype: 'PreToolUse', tool: 'WebSearch', ts: now - 3.5 * hour + 8000 },
  { agent: `scout-${sessionId}`, type: 'tool', subtype: 'PostToolUse', tool: 'WebSearch', ts: now - 3.5 * hour + 15000 },
  { agent: `scout-${sessionId}`, type: 'tool', subtype: 'PostToolUse', tool: 'Write', ts: now - 3 * hour },
  { agent: `scout-${sessionId}`, type: 'tool', subtype: 'PostToolUse', tool: 'Bash', ts: now - 3 * hour + 5000 },

  // Fern working
  { agent: sessionId, type: 'tool', subtype: 'PostToolUse', tool: 'Read', ts: now - 2.5 * hour },
  { agent: sessionId, type: 'tool', subtype: 'PostToolUse', tool: 'Write', ts: now - 2 * hour },

  // Reed scripts
  { agent: `reed-${sessionId}`, type: 'lifecycle', subtype: 'SubagentStart', tool: null, ts: now - 1.5 * hour },
  { agent: `reed-${sessionId}`, type: 'tool', subtype: 'PostToolUse', tool: 'Read', ts: now - 1.5 * hour + 5000 },
  { agent: `reed-${sessionId}`, type: 'tool', subtype: 'PostToolUse', tool: 'Write', ts: now - 1 * hour },
  { agent: `reed-${sessionId}`, type: 'tool', subtype: 'PostToolUse', tool: 'Write', ts: now - 45 * min },

  // Sentinel context collection
  { agent: `sentinel-${sessionId}`, type: 'lifecycle', subtype: 'SubagentStart', tool: null, ts: now - 30 * min },
  { agent: `sentinel-${sessionId}`, type: 'tool', subtype: 'PostToolUse', tool: 'Bash', ts: now - 28 * min },
  { agent: `sentinel-${sessionId}`, type: 'tool', subtype: 'PostToolUse', tool: 'Write', ts: now - 25 * min },
  { agent: `sentinel-${sessionId}`, type: 'tool', subtype: 'PostToolUse', tool: 'Bash', ts: now - 22 * min },

  // Recent Fern activity
  { agent: sessionId, type: 'tool', subtype: 'PostToolUse', tool: 'Write', ts: now - 10 * min },
  { agent: sessionId, type: 'tool', subtype: 'PostToolUse', tool: 'Read', ts: now - 5 * min },
]

const insertEvent = db.prepare(
  'INSERT INTO events (agent_id, session_id, type, subtype, tool_name, timestamp, payload, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
)

for (const e of events) {
  insertEvent.run(
    e.agent,
    sessionId,
    e.type,
    e.subtype,
    e.tool,
    e.ts,
    JSON.stringify({ hook_event_name: e.subtype, tool_name: e.tool }),
    e.subtype?.startsWith('Pre') ? 'running' : 'completed'
  )
}

console.log(`Seeded ${events.length} events for session ${sessionId}`)
console.log(`Database: ${DB_PATH}`)
console.log('\nTo view: bun run dev')
