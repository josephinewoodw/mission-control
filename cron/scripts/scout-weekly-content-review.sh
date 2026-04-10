#!/usr/bin/env bash
# scout-weekly-content-review.sh — Scout weekly content review
# Schedule: Friday 5:00pm CT (22:00 UTC)
#
# Pulls Instagram analytics, analyzes performance,
# saves to 03-content/analytics/output/.
#
# Logs: ~/Library/Logs/mission-control/scout-weekly-content-review.log

set -euo pipefail

JOB="scout-weekly-content-review"
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
Perform weekly content review: pull Instagram analytics via the Instagram Graph API \
(tools.md has credentials info — use instagram-api skill pattern), \
analyze performance (reach, likes, comments, shares, saves for recent posts), \
identify what performed well vs. underperformed, \
save analysis to 03-content/analytics/output/$(date +%Y-%m-%d)-performance.md. \
Git commit and push."

echo "Running claude -p --model $MODEL ..."
"$CLAUDE" --print \
  --model "$MODEL" \
  --dangerously-skip-permissions \
  "$PROMPT"

EXIT_CODE=$?
echo "=== $JOB finished at $(date -u +%Y-%m-%dT%H:%M:%SZ) — exit $EXIT_CODE ==="
exit $EXIT_CODE
