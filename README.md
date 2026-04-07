---
updated: 2026-04-03
---

# Mission Control — Agent Dashboard

An animated lo-fi office dashboard showing the Fern agent team in real time. Each agent has a character that reflects what they're currently doing.

## Architecture

```
Claude Code Hooks --> agents-observe (SQLite + Hono API) --> WebSocket
                                                              |
                                                              v
                                                     React + Tailwind frontend
                                                     (animated office scene)
```

### Data Flow
1. **Hooks** fire on every agent action (via agents-observe plugin hooks)
2. Hook scripts POST events to the **agents-observe API server** (port 4981)
3. Events stored in **SQLite** and broadcast via **WebSocket** at `/api/events/stream`
4. The **React frontend** (port 4200) connects to the WebSocket and displays real-time agent status
5. Frontend falls back to **seed data** if the backend is not running (demo mode)

### Characters
- Fern — center desk, coordinator. States: idle, working, routing
- Scout — research station. States: idle, researching, reporting
- Reed — writing desk. States: idle, writing, reviewing
- Sentinel — monitoring station. States: idle, scanning, alerting

### Tech Stack
- **Frontend:** React + Tailwind CSS (Vite dev server)
- **Backend:** agents-observe (Hono + better-sqlite3 + WebSocket)
- **Data:** Claude Code hooks → shell scripts → HTTP POST → SQLite
- **Assets:** OpenPeeps-style avatar PNGs

## Quick Start

```bash
# Frontend only (demo mode with seed data)
cd frontend && bun install && bun run dev
# Open http://localhost:4200

# Full stack (with agents-observe backend)
cd agents-observe/app/server && npm install && npm run dev &
cd frontend && bun run dev
```

## Build Plan

Locked 2026-04-03. Ordered by technical dependency, not UX priority.

### Phase 1 — Data Pipeline + Core Rendering
- [ ] Hook configuration (agents-observe hooks into Claude Code settings.json)
- [ ] Pending permissions detection + alert (blocked agent → UI notification)
- [ ] Agent status tracking (online/offline/blocked/working from real events)
- [ ] Office scene rendering with state-driven animations

### Phase 2 — Operational Data
- [ ] Cron job status + last-fired tracking
- [ ] API key health checks
- [ ] Session usage / context window tracking
- [ ] System health aggregate view

### Phase 3 — Summaries + Layout
- [ ] "What we got done today" (aggregates Phase 1+2 data)
- [ ] Context summary panel (state.md + daily note rendered)
- [ ] Full layout matching Josie's sketch (welcome header, sidebar, bottom panels)

### Phase 4 — Stretch (Interactive)
- [ ] Start/stop session buttons (with auth)
- [ ] Chat with agents (poll-based inbox)
- [ ] Terminal embedding (ttyd/gotty iframe)

### Design Reference
- Josie's sketches: Home Dash with welcome header, office scene center, activity feed sidebar, bottom row (output summary, pending decisions, Fern terminal)
- Lo-fi cozy office vibe, not corporate
- Open Peeps style characters → Rive state machines

## Directory Structure

```
mission-control/
  agents-observe/     # Cloned from josephinewoodw/agents-observe
  frontend/           # React + Tailwind dashboard
    src/
      components/     # Header, OfficeScene, AgentDesk, ActivityFeed
      hooks/          # useAgentEvents (WebSocket + seed fallback)
      data/           # Agent definitions, seed events
      types/          # TypeScript types
    public/assets/    # Agent avatar PNGs
  src/                # Original basic server + seed scripts
  public/             # Original basic HTML dashboard
  assets/             # Avatar source PNGs
```

## Related
- [[BUILD-LOG]] — architecture decisions
- [[ARCHITECTURE]] — agent system overview
- Avatar specs: `08-tools/agents/avatars/`
- Research: `06-research/technical/2026-04-02-lofi-dashboard-research.md`
