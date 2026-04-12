#!/usr/bin/env bash
# dispatcher.sh — Poll /api/kanban/pending-dispatch and spawn agents for UI-created tasks.
#
# Runs every 30s via launchd StartInterval. For each queued task with source='ui':
#   1. Claims the task (PATCH status=in_progress) to prevent double-dispatch
#   2. Spawns the matching agent via claude -p with the task ID + description
#   3. Marks task failed if spawn exits non-zero
#
# Agents are responsible for updating kanban status themselves once running.
#
# Logs: ~/Library/Logs/mission-control/dispatcher.log

JOB="dispatcher"
VAULT_DIR="${VAULT_DIR:-$HOME/fern-vault}"
LOG_DIR="${LOG_DIR:-$HOME/Library/Logs/mission-control}"
CLAUDE="${CLAUDE_PATH:-$HOME/.local/bin/claude}"
MODEL="${CLAUDE_MODEL:-sonnet}"
API_BASE="${MC_API_BASE:-http://localhost:4981/api}"

mkdir -p "$LOG_DIR"
exec >> "$LOG_DIR/$JOB.log" 2>&1

echo ""
echo "=== dispatcher poll at $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

# Load credentials from config files
FERN_CONFIG="$HOME/.config/fern"
[[ -f "$FERN_CONFIG/notion_key" ]]           && export NOTION_API_KEY="$(cat "$FERN_CONFIG/notion_key")"
[[ -f "$FERN_CONFIG/instagram_token" ]]      && export INSTAGRAM_ACCESS_TOKEN="$(cat "$FERN_CONFIG/instagram_token")"
[[ -f "$FERN_CONFIG/discord_token" ]]        && export DISCORD_BOT_TOKEN="$(cat "$FERN_CONFIG/discord_token")"
[[ -f "$FERN_CONFIG/brave_key" ]]            && export BRAVE_API_KEY="$(cat "$FERN_CONFIG/brave_key")"
[[ -f "$FERN_CONFIG/openai_key" ]]           && export OPENAI_API_KEY="$(cat "$FERN_CONFIG/openai_key")"
[[ -f "$FERN_CONFIG/gemini_key" ]]           && export GEMINI_API_KEY="$(cat "$FERN_CONFIG/gemini_key")"

# Fetch pending-dispatch tasks
RESPONSE_FILE="$(mktemp /tmp/dispatcher-pending.XXXXXX)"
CURL_EXIT=0
curl -s --max-time 5 "$API_BASE/kanban/pending-dispatch" > "$RESPONSE_FILE" 2>&1 || CURL_EXIT=$?

if [[ $CURL_EXIT -ne 0 ]]; then
  echo "  ERROR: could not reach $API_BASE/kanban/pending-dispatch (curl exit $CURL_EXIT)"
  echo "  (agents-observe may not be running — skipping this poll)"
  rm -f "$RESPONSE_FILE"
  exit 0
fi

# Count tasks
TASK_COUNT="$(python3 -c "import json,sys; d=json.load(open('$RESPONSE_FILE')); print(len(d))" 2>/dev/null || echo "0")"

if [[ "$TASK_COUNT" == "0" ]]; then
  echo "  no pending-dispatch tasks"
  rm -f "$RESPONSE_FILE"
  exit 0
fi

echo "  found $TASK_COUNT task(s) to dispatch"

# Write the dispatcher Python logic to a temp file and execute it
DISPATCH_PY="$(mktemp /tmp/dispatcher-logic.XXXXXX.py)"
cat > "$DISPATCH_PY" << 'PYEOF'
import json, subprocess, os, sys, urllib.request

response_file = os.environ["DISPATCHER_RESPONSE_FILE"]
api_base      = os.environ.get("MC_API_BASE", "http://localhost:4981/api")
vault_dir     = os.environ.get("VAULT_DIR", os.path.expanduser("~/fern-vault"))
claude        = os.environ.get("CLAUDE_PATH", os.path.expanduser("~/.local/bin/claude"))
model         = os.environ.get("CLAUDE_MODEL", "sonnet")
log_dir       = os.environ.get("LOG_DIR", os.path.expanduser("~/Library/Logs/mission-control"))

with open(response_file) as f:
    data = json.load(f)

# Agent name → identity doc path (relative to vault)
AGENT_IDENTITY = {
    "scout":    ".claude/agents/scout.md",
    "reed":     ".claude/agents/reed.md",
    "timber":   ".claude/agents/timber.md",
    "sentinel": ".claude/agents/sentinel.md",
    "tide":     ".claude/agents/tide.md",
    "fern":     ".claude/rules",
}

def patch_task(task_id, status):
    payload = json.dumps({"status": status}).encode()
    req = urllib.request.Request(
        f"{api_base}/kanban/{task_id}",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="PATCH",
    )
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            return r.status == 200
    except Exception as e:
        print(f"    WARNING: could not patch task {task_id}: {e}")
        return False

for task in data:
    task_id   = task["id"]
    title     = task["title"]
    desc      = task.get("description") or ""
    agent     = task.get("agent_name", "").lower()

    print(f"  → task {task_id}: [{agent}] {title[:60]}")

    if agent not in AGENT_IDENTITY:
        print(f"    ERROR: unknown agent '{agent}' — marking failed")
        patch_task(task_id, "failed")
        continue

    identity_path = AGENT_IDENTITY[agent]

    # Claim the task immediately to prevent double-dispatch on next poll
    if not patch_task(task_id, "in_progress"):
        print(f"    ERROR: could not claim task {task_id} — skipping")
        continue

    # Build agent prompt
    kanban_block = (
        f"Your kanban task ID is {task_id}. Update it:\n"
        f"- Start: curl -s -X PATCH {api_base}/kanban/{task_id} -H 'Content-Type: application/json' -d '{{\"status\": \"in_progress\"}}'\n"
        f"- Stuck: curl -s -X PATCH {api_base}/kanban/{task_id} -H 'Content-Type: application/json' -d '{{\"status\": \"active\"}}'\n"
        f"- Done: curl -s -X PATCH {api_base}/kanban/{task_id} -H 'Content-Type: application/json' -d '{{\"status\": \"completed\"}}'\n"
        f"- Failed: curl -s -X PATCH {api_base}/kanban/{task_id} -H 'Content-Type: application/json' -d '{{\"status\": \"failed\"}}'"
    )

    agent_cap = agent.capitalize()
    prompt_parts = [
        f"You are {agent_cap}. Read your identity at {identity_path}.",
        "",
        kanban_block,
        "",
        f"Task: {title}",
    ]
    if desc:
        prompt_parts.append(f"\nDescription: {desc}")

    prompt = "\n".join(prompt_parts)

    # Spawn claude -p in background (non-blocking — agent runs independently)
    task_log = os.path.join(log_dir, f"dispatch-task-{task_id}.log")
    cmd = [claude, "--print", "--model", model, "--dangerously-skip-permissions", prompt]

    try:
        with open(task_log, "a") as lf:
            proc = subprocess.Popen(
                cmd,
                cwd=vault_dir,
                stdout=lf,
                stderr=lf,
            )
        print(f"    spawned PID {proc.pid} — log: {task_log}")
    except Exception as e:
        print(f"    ERROR: spawn failed: {e}")
        patch_task(task_id, "failed")

print("  dispatch complete")
PYEOF

DISPATCHER_RESPONSE_FILE="$RESPONSE_FILE" python3 "$DISPATCH_PY"

rm -f "$RESPONSE_FILE" "$DISPATCH_PY"
echo "=== dispatcher done at $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
