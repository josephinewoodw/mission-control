#!/usr/bin/env bash
# sentinel-health-check-evening.sh — Sentinel evening health check
# Schedule: 10:00pm CT daily (03:00 UTC next day)
#
# Same checks as morning health check — unanswered iMessages, git status,
# token health, Mission Control services.
# Logs to 08-tools/agents/security/reports/health-log.md.
#
# Logs: ~/Library/Logs/mission-control/sentinel-health-check-evening.log

set -euo pipefail

JOB="sentinel-health-check-evening"
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
Perform evening health check: check for unanswered iMessages, verify git status, \
check token health (Instagram, Notion, Brave — do they exist and are they readable?), \
verify Mission Control services are running (port 4981 and 4200). \
Log results to 08-tools/agents/security/reports/health-log.md. \
Git commit and push."

echo "Running claude -p --model $MODEL ..."
"$CLAUDE" --print \
  --model "$MODEL" \
  --dangerously-skip-permissions \
  "$PROMPT"

EXIT_CODE=$?
echo "=== $JOB finished at $(date -u +%Y-%m-%dT%H:%M:%SZ) — exit $EXIT_CODE ==="
exit $EXIT_CODE
