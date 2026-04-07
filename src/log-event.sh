#!/bin/bash
# log-event.sh — Claude Code hook handler
# Writes events to the Mission Control SQLite database.
# Called by hooks configured in settings.json.
#
# Usage: log-event.sh <agent> <event_type> [detail_json]
# Stdin: receives hook event JSON from Claude Code
#
# Environment variables set by Claude Code hooks:
#   CLAUDE_SESSION_ID, CLAUDE_AGENT_NAME, etc.

DB="${HOME}/.config/fern/mission-control.db"
SCHEMA_DIR="$(dirname "$0")"

# Initialize DB if it doesn't exist
if [ ! -f "$DB" ]; then
    sqlite3 "$DB" < "${SCHEMA_DIR}/schema.sql"
fi

# Read hook event from stdin
EVENT_JSON=$(cat)

# Extract fields from args or environment
AGENT="${1:-${CLAUDE_AGENT_NAME:-fern}}"
EVENT_TYPE="${2:-unknown}"
DETAIL="${3:-$EVENT_JSON}"

# Determine agent status based on event type
case "$EVENT_TYPE" in
    session_start)
        STATUS="idle"
        ;;
    session_end)
        STATUS="offline"
        ;;
    tool_use)
        STATUS="working"
        ;;
    tool_done)
        STATUS="idle"
        ;;
    permission_request)
        STATUS="blocked"
        ;;
    permission_granted)
        STATUS="working"
        ;;
    subagent_start)
        STATUS="working"
        ;;
    subagent_stop)
        STATUS="idle"
        ;;
    *)
        STATUS="working"
        ;;
esac

# Extract tool name if present
TOOL_NAME=$(echo "$DETAIL" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_name',''))" 2>/dev/null || echo "")

# Insert event
sqlite3 "$DB" "INSERT INTO events (agent, event_type, status, detail, tool_name) VALUES ('$AGENT', '$EVENT_TYPE', '$STATUS', '$(echo "$DETAIL" | sed "s/'/''/g")', '$TOOL_NAME');"

# Update agent status
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
TASK_DESC=$(echo "$DETAIL" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('task','') or d.get('tool_name','') or d.get('message',''))" 2>/dev/null || echo "$EVENT_TYPE")

sqlite3 "$DB" "UPDATE agent_status SET status='$STATUS', last_event='$EVENT_TYPE', last_activity='$TIMESTAMP', current_task='$(echo "$TASK_DESC" | sed "s/'/''/g")' WHERE agent='$AGENT';"

# If session start, update session_start timestamp
if [ "$EVENT_TYPE" = "session_start" ]; then
    sqlite3 "$DB" "UPDATE agent_status SET session_start='$TIMESTAMP' WHERE agent='$AGENT';"
fi
