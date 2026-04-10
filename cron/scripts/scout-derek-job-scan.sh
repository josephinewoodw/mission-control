#!/usr/bin/env bash
# scout-derek-job-scan.sh — Scout Derek job scan
# Schedule: Wednesday 8:00am CT (13:00 UTC)
#
# Searches for AI/data strategy roles that would suit Derek,
# saves digest to 06-research/derek-jobs/.
#
# Logs: ~/Library/Logs/mission-control/scout-derek-job-scan.log

set -euo pipefail

JOB="scout-derek-job-scan"
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

PROMPT="You are Scout. Read your identity at .claude/agents/scout.md. \
Perform Derek job scan: search for AI/data strategy and director-level data roles \
(check Brave search and any job boards accessible via web tools). \
Look for roles at mid-large companies, data strategy, AI strategy, \
data director / VP data titles. \
Save digest to 06-research/derek-jobs/$(date +%Y-%m-%d)-job-scan.md. \
Git commit and push."

echo "Running claude -p --model $MODEL ..."
"$CLAUDE" --print \
  --model "$MODEL" \
  --dangerously-skip-permissions \
  "$PROMPT"

EXIT_CODE=$?
echo "=== $JOB finished at $(date -u +%Y-%m-%dT%H:%M:%SZ) — exit $EXIT_CODE ==="
exit $EXIT_CODE
