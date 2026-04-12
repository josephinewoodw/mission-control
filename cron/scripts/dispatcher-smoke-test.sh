#!/usr/bin/env bash
# dispatcher-smoke-test.sh — End-to-end test of the auto-dispatcher.
#
# Creates a trivial UI task for 'timber', waits up to 120s for it to reach
# 'completed', then exits 0 (pass) or 1 (fail). Cleans up after itself.
#
# Usage: bash dispatcher-smoke-test.sh [timeout_seconds]
# Example: bash dispatcher-smoke-test.sh 120

set -euo pipefail

API_BASE="${MC_API_BASE:-http://localhost:4981/api}"
TIMEOUT="${1:-120}"
POLL_INTERVAL=5

echo "=== dispatcher smoke test $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
echo "    api: $API_BASE"
echo "    timeout: ${TIMEOUT}s"
echo ""

# 1. Create a trivial UI task
# NOTE: must use /api/kanban (not /api/tasks) — only /kanban accepts source=ui
TASK_PAYLOAD='{
  "agent_name": "timber",
  "title": "Smoke test — echo hello and mark done",
  "description": "This is an automated dispatcher smoke test. Your only job: PATCH this kanban task to completed. Do not write any files or do any real work. Just mark the task done immediately.",
  "status": "queued",
  "source": "ui",
  "priority": "low"
}'

echo "1. Creating smoke-test task (via /api/kanban with source=ui)..."
CREATE_RESPONSE=$(curl -s -X POST "$API_BASE/kanban" \
    -H 'Content-Type: application/json' \
    -d "$TASK_PAYLOAD")

TASK_ID=$(echo "$CREATE_RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('id', ''))" 2>/dev/null || echo "")

if [[ -z "$TASK_ID" ]]; then
    echo "   FAIL: could not create task. Response: $CREATE_RESPONSE"
    exit 1
fi

echo "   created task ID: $TASK_ID"
echo ""

# 2. Poll for completion
echo "2. Polling for task completion (up to ${TIMEOUT}s)..."
ELAPSED=0
FINAL_STATUS=""

while [[ $ELAPSED -lt $TIMEOUT ]]; do
    # GET /api/kanban returns {columns: {...}, tasks: [...]}; filter by task ID
    STATUS_RESPONSE=$(curl -s "$API_BASE/kanban" 2>/dev/null || echo "{}")
    CURRENT_STATUS=$(echo "$STATUS_RESPONSE" | python3 -c "
import json,sys
d=json.load(sys.stdin)
tasks = d.get('tasks', [])
task = next((t for t in tasks if t['id'] == $TASK_ID), None)
print(task['status'] if task else 'not_found')
" 2>/dev/null || echo "unknown")

    echo "   t+${ELAPSED}s: status=$CURRENT_STATUS"

    if [[ "$CURRENT_STATUS" == "completed" ]]; then
        FINAL_STATUS="completed"
        break
    elif [[ "$CURRENT_STATUS" == "failed" ]]; then
        FINAL_STATUS="failed"
        break
    fi

    sleep $POLL_INTERVAL
    ELAPSED=$((ELAPSED + POLL_INTERVAL))
done

echo ""

# 3. Report result
if [[ "$FINAL_STATUS" == "completed" ]]; then
    echo "=== PASS: task $TASK_ID reached 'completed' in ${ELAPSED}s ==="
    exit 0
elif [[ "$FINAL_STATUS" == "failed" ]]; then
    echo "=== FAIL: task $TASK_ID reached 'failed' after ${ELAPSED}s ==="
    echo "    Check: ~/Library/Logs/mission-control/dispatch-task-${TASK_ID}.log"
    echo "    Check: ~/Library/Logs/mission-control/dispatcher-failures.log"
    exit 1
else
    LAST_STATUS=$(curl -s "$API_BASE/kanban" 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); tasks=d.get('tasks',[]); t=next((x for x in tasks if x['id']==$TASK_ID),None); print(t['status'] if t else 'not_found')" 2>/dev/null || echo "?")
    echo "=== FAIL: task $TASK_ID did not complete within ${TIMEOUT}s (last status: $LAST_STATUS) ==="
    echo "    Check: ~/Library/Logs/mission-control/dispatcher.log"
    echo "    Check: ~/Library/Logs/mission-control/dispatch-task-${TASK_ID}.log"
    # Mark it failed so it doesn't pollute the board
    curl -s -X PATCH "$API_BASE/tasks/$TASK_ID" \
        -H 'Content-Type: application/json' \
        -d '{"status": "failed"}' > /dev/null 2>&1
    echo "    (marked task as failed to clean up board)"
    exit 1
fi
