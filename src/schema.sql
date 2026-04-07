-- Mission Control events database
-- Stores all hook events from Claude Code agent sessions

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    agent TEXT NOT NULL,           -- fern, scout, reed, sentinel
    event_type TEXT NOT NULL,      -- session_start, session_end, tool_use, permission_request, etc.
    status TEXT,                   -- idle, working, blocked, done
    detail TEXT,                   -- JSON blob with event-specific data
    tool_name TEXT,                -- for tool_use events
    duration_ms INTEGER            -- for completed tool calls
);

CREATE TABLE IF NOT EXISTS agent_status (
    agent TEXT PRIMARY KEY,        -- fern, scout, reed, sentinel
    status TEXT NOT NULL DEFAULT 'offline',  -- offline, idle, working, blocked
    last_event TEXT,               -- last event type
    last_activity TEXT,            -- timestamp of last activity
    current_task TEXT,             -- what they're working on (human-readable)
    session_start TEXT             -- when the current session started
);

-- Initialize agent status rows
INSERT OR IGNORE INTO agent_status (agent, status) VALUES ('fern', 'idle');
INSERT OR IGNORE INTO agent_status (agent, status) VALUES ('scout', 'offline');
INSERT OR IGNORE INTO agent_status (agent, status) VALUES ('reed', 'offline');
INSERT OR IGNORE INTO agent_status (agent, status) VALUES ('sentinel', 'offline');

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_events_agent ON events(agent);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
