#!/usr/bin/env bash
# sentinel-context-collection.sh — Sentinel context collection (every 3h)
# Schedule: every 3 hours at :17 (e.g. 00:17, 03:17, 06:17, ...)
#
# Reads the current Fern transcript, updates today's daily note,
# updates state.md and promises.md if needed. Git commit and push.
#
# Logs: ~/Library/Logs/mission-control/sentinel-context-collection.log

set -euo pipefail

JOB="sentinel-context-collection"
VAULT_DIR="${VAULT_DIR:-$HOME/fern-vault}"
LOG_DIR="${LOG_DIR:-$HOME/Library/Logs/mission-control}"
CLAUDE="${CLAUDE_PATH:-$HOME/.local/bin/claude}"
MODEL="${CLAUDE_MODEL:-sonnet}"

mkdir -p "$LOG_DIR"
exec >> "$LOG_DIR/$JOB.log" 2>&1

echo ""
echo "=== $JOB started at $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

# shellcheck disable=SC1090
if [[ -f "$HOME/.zshrc" ]]; then
  set +u
  source "$HOME/.zshrc" 2>/dev/null || true
  set -u
fi

cd "$VAULT_DIR"

PROMPT="You are Sentinel. Read your identity at .claude/agents/sentinel.md. \
Perform context collection: read the current Fern transcript, update today's daily note \
(01-daily/$(date +%Y/%m/%Y-%m-%d).md), update state.md and promises.md if needed. \
Git commit and push."

echo "Running claude -p --model $MODEL ..."
"$CLAUDE" --print \
  --model "$MODEL" \
  --dangerously-skip-permissions \
  "$PROMPT"

EXIT_CODE=$?
echo "=== $JOB finished at $(date -u +%Y-%m-%dT%H:%M:%SZ) — exit $EXIT_CODE ==="
exit $EXIT_CODE
