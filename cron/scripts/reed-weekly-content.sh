#!/usr/bin/env bash
# reed-weekly-content.sh — Reed weekly content production
# Schedule: Thursday 9:00am CT (14:00 UTC)
#
# Checks existing scripts, reviews posting strategy and content radar,
# writes new scripts needed for the coming week, runs humanizer pass,
# saves to 03-content/studio/scripts/.
#
# Logs: ~/Library/Logs/mission-control/reed-weekly-content.log

set -euo pipefail

JOB="reed-weekly-content"
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

PROMPT="You are Reed. Read your identity at .claude/agents/reed.md. \
Perform weekly content production: review the content pipeline docs at \
03-content/studio/docs/ (voice.md, audience.md, viral-formula.md), \
check existing scripts in 03-content/studio/scripts/, \
review recent research scans at 03-content/research/scans/ for this week's ideas, \
write new scripts needed for the coming week using the ig-scriptwriter approach, \
run a humanizer pass on each draft (save as v2-humanized.md), \
save all output to 03-content/studio/scripts/. \
Git commit and push."

echo "Running claude -p --model $MODEL ..."
"$CLAUDE" --print \
  --model "$MODEL" \
  --dangerously-skip-permissions \
  "$PROMPT"

EXIT_CODE=$?
echo "=== $JOB finished at $(date -u +%Y-%m-%dT%H:%M:%SZ) — exit $EXIT_CODE ==="
exit $EXIT_CODE
