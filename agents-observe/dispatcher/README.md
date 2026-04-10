# Kanban Dispatcher

A standalone Node.js process that replaces the Fern-session cron for kanban task dispatch. Instead of burning LLM tokens on empty polls, this runs as its own OS process, polls the agents-observe API, and spawns Claude agents via CLI.

## How it works

1. Every `POLL_INTERVAL_MS` (default 60s), polls `GET /api/kanban/pending`
2. For each pending task (status `active`, not yet claimed):
   - Claims it via `PATCH /api/kanban/{id}/claim` — sets status to `in_progress`, prevents double-pickup
   - Reads `agent_name` and `description` from the task
   - Spawns `claude --print --model <model> "<prompt>"` as a child process
   - The prompt tells the agent to read its identity doc at `.claude/agents/<name>.md`
3. When the agent exits:
   - Exit code 0 → marks task `done`
   - Non-zero or timeout → marks task `failed`
4. Up to `MAX_CONCURRENT` tasks run in parallel

## Requirements

- Node.js 18+ (uses native `fetch`)
- `claude` CLI installed and authenticated (`claude --version` should work)
- agents-observe server running on port 4981

## Running manually

```bash
node dispatcher.js
```

```bash
# With overrides:
API_BASE_URL=http://localhost:4981 POLL_INTERVAL_MS=30000 node dispatcher.js

# Dry run — polls but doesn't spawn real agents:
DRY_RUN=1 node dispatcher.js
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `API_BASE_URL` | `http://localhost:4981` | agents-observe server |
| `POLL_INTERVAL_MS` | `60000` | Poll interval (ms) |
| `AGENT_TIMEOUT_MS` | `600000` | Max agent run time (ms) |
| `MAX_CONCURRENT` | `2` | Max parallel tasks |
| `CLAUDE_PATH` | auto-detected | Path to `claude` CLI |
| `CLAUDE_MODEL` | `sonnet` | Model passed to `--model` |
| `DRY_RUN` | `0` | Set to `1` to log without spawning |

## Running as a background service (launchd)

The included plist installs the dispatcher as a persistent launchd agent:

```bash
# 1. Edit the plist if your checkout is not at ~/mission-control
# 2. Create the log directory
mkdir -p ~/Library/Logs/mission-control

# 3. Copy the plist to LaunchAgents
cp com.mission-control.dispatcher.plist ~/Library/LaunchAgents/

# 4. Load it
launchctl load ~/Library/LaunchAgents/com.mission-control.dispatcher.plist

# 5. Confirm it's running
launchctl list | grep dispatcher

# 6. Tail logs
tail -f ~/Library/Logs/mission-control/dispatcher.log
```

To stop and unload:

```bash
launchctl unload ~/Library/LaunchAgents/com.mission-control.dispatcher.plist
```

## Task priority

When multiple tasks are ready, higher-priority tasks run first (`high > medium > low`). Within the same priority, older tasks run first (FIFO).

## Edge cases handled

- **API down**: warns on first failure, retries silently on subsequent polls, logs recovery
- **Double-claim**: claim endpoint returns 409 if already `in_progress` — dispatcher detects and skips
- **Agent timeout**: SIGTERM after `AGENT_TIMEOUT_MS`, SIGKILL 5s later, task marked `failed`
- **Concurrent tasks**: `inFlight` set prevents re-queuing a task already running
- **Graceful shutdown**: SIGTERM/SIGINT waits up to 60s for in-flight tasks to finish before exiting

## No Fern dependencies

The dispatcher has zero vault-specific dependencies. It reads only the standard `claude` CLI and the agents-observe HTTP API. The identity doc path (`.claude/agents/<name>.md`) is passed as part of the prompt — the agent reads it itself. To use this in a fresh clone, you only need `node` and `claude` on PATH.
