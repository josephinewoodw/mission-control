#!/usr/bin/env bash
# dispatcher-agent-wrapper.sh — Runs a single dispatched agent task.
#
# Called by dispatcher.sh for each task. Runs in a new session (setsid),
# detached from the dispatcher's lifecycle. If claude exits non-zero,
# patches the kanban task to failed and logs the error.
#
# Usage: dispatcher-agent-wrapper.sh <task_id> <agent> <prompt_file> <task_log>
#        <pid_file> <claude_bin> <model> <api_base> <vault_dir> <log_dir>

TASK_ID="$1"
AGENT="$2"
PROMPT_FILE="$3"
TASK_LOG="$4"
PID_FILE="$5"
CLAUDE="$6"
MODEL="$7"
API_BASE="$8"
VAULT_DIR="$9"
LOG_DIR="${10}"

FAILURE_LOG="$LOG_DIR/dispatcher-failures.log"

# Write our PID for auditing
echo "$$" > "$PID_FILE"

# Redirect all output to the task log
exec >> "$TASK_LOG" 2>&1

echo "=== dispatch-agent-wrapper start $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
echo "    task_id=$TASK_ID agent=$AGENT"
echo "    claude=$CLAUDE model=$MODEL"
echo "    vault=$VAULT_DIR"

# Ensure USER is set — claude's auth lookup requires it even when HOME is set
export USER="${USER:-$(id -un)}"
export LOGNAME="${LOGNAME:-$USER}"

# Load credentials from config files (launchd doesn't inherit shell env)
FERN_CONFIG="$HOME/.config/fern"
[[ -f "$FERN_CONFIG/notion_key" ]]           && export NOTION_API_KEY="$(cat "$FERN_CONFIG/notion_key")"
[[ -f "$FERN_CONFIG/instagram_token" ]]      && export INSTAGRAM_ACCESS_TOKEN="$(cat "$FERN_CONFIG/instagram_token")"
[[ -f "$FERN_CONFIG/discord_token" ]]        && export DISCORD_BOT_TOKEN="$(cat "$FERN_CONFIG/discord_token")"
[[ -f "$FERN_CONFIG/brave_key" ]]            && export BRAVE_API_KEY="$(cat "$FERN_CONFIG/brave_key")"
[[ -f "$FERN_CONFIG/openai_key" ]]           && export OPENAI_API_KEY="$(cat "$FERN_CONFIG/openai_key")"
[[ -f "$FERN_CONFIG/gemini_key" ]]           && export GEMINI_API_KEY="$(cat "$FERN_CONFIG/gemini_key")"

# Verify claude is reachable before spawning
echo "    verifying claude auth..."
AUTH_CHECK=$("$CLAUDE" --print --model haiku --dangerously-skip-permissions "ping" 2>&1)
AUTH_EXIT=$?

if [[ $AUTH_EXIT -ne 0 ]]; then
    ERROR_MSG="claude auth check failed (exit $AUTH_EXIT): $AUTH_CHECK"
    echo "    ERROR: $ERROR_MSG"
    # Patch task to failed
    curl -s -X PATCH "$API_BASE/kanban/$TASK_ID" \
        -H 'Content-Type: application/json' \
        -d "{\"status\": \"failed\"}" > /dev/null 2>&1
    # Log to failures file
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] task $TASK_ID [$AGENT] auth check failed" >> "$FAILURE_LOG"
    echo "  reason: $ERROR_MSG" >> "$FAILURE_LOG"
    echo "" >> "$FAILURE_LOG"
    rm -f "$PROMPT_FILE" "$PID_FILE"
    exit 1
fi

echo "    auth ok — spawning claude"

# Run claude with the prompt from file
PROMPT="$(cat "$PROMPT_FILE")"
rm -f "$PROMPT_FILE"

"$CLAUDE" \
    --print \
    --model "$MODEL" \
    --dangerously-skip-permissions \
    "$PROMPT"
CLAUDE_EXIT=$?

echo ""
echo "=== claude exited with code $CLAUDE_EXIT at $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

if [[ $CLAUDE_EXIT -ne 0 ]]; then
    ERROR_MSG="claude exited non-zero ($CLAUDE_EXIT)"
    echo "    ERROR: $ERROR_MSG — patching task to failed"
    curl -s -X PATCH "$API_BASE/kanban/$TASK_ID" \
        -H 'Content-Type: application/json' \
        -d "{\"status\": \"failed\"}" > /dev/null 2>&1
    # Log to failures file
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] task $TASK_ID [$AGENT] claude exited $CLAUDE_EXIT" >> "$FAILURE_LOG"
    echo "  check $TASK_LOG for details" >> "$FAILURE_LOG"
    echo "" >> "$FAILURE_LOG"
fi

rm -f "$PID_FILE"
exit $CLAUDE_EXIT
