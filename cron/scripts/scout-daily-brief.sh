#!/usr/bin/env bash
# scout-daily-brief.sh — Run Scout's daily brief
# Schedule: 6:57am CT daily (11:57 UTC)
#
# Invokes Scout via the Claude CLI to produce the morning brief, covering
# AI news, world events, community pulse, cool AI project, and content radar.
# Full brief saved to 03-content/research/scans/YYYY-MM-DD-brief.md.
#
# Logs: ~/Library/Logs/mission-control/scout-daily-brief.log

set -euo pipefail

JOB="scout-daily-brief"
VAULT_DIR="${VAULT_DIR:-$HOME/fern-vault}"
LOG_DIR="${LOG_DIR:-$HOME/Library/Logs/mission-control}"
CLAUDE="${CLAUDE_PATH:-$HOME/.local/bin/claude}"
MODEL="${CLAUDE_MODEL:-sonnet}"

mkdir -p "$LOG_DIR"
exec >> "$LOG_DIR/$JOB.log" 2>&1

echo ""
echo "=== $JOB started at $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

# Source zshrc to load env vars (tokens, API keys, etc.)
# shellcheck disable=SC1090
if [[ -f "$HOME/.zshrc" ]]; then
  set +u
  # Use a subshell-safe source — zshrc may reference $ZSH_VERSION etc.
  source "$HOME/.zshrc" 2>/dev/null || true
  set -u
fi

cd "$VAULT_DIR"

PROMPT="You are Scout. Read your identity at .claude/agents/scout.md. \
Run the daily brief following the framework at 03-content/research/docs/daily-brief.md. \
Save the full brief to 03-content/research/scans/$(date +%Y-%m-%d)-brief.md. \
Git commit and push when done."

echo "Running claude -p --model $MODEL ..."
"$CLAUDE" --print \
  --model "$MODEL" \
  --dangerously-skip-permissions \
  "$PROMPT"

EXIT_CODE=$?
echo "=== $JOB finished at $(date -u +%Y-%m-%dT%H:%M:%SZ) — exit $EXIT_CODE ==="
exit $EXIT_CODE
