#!/usr/bin/env bash
# sentinel-nightly-security-scan.sh — Sentinel nightly security scan
# Schedule: 11:00pm CT daily (04:00 UTC next day)
#
# Credential scan, git audit, token health, file integrity.
# Writes report to 08-tools/agents/security/reports/.
#
# Logs: ~/Library/Logs/mission-control/sentinel-nightly-security-scan.log

set -euo pipefail

JOB="sentinel-nightly-security-scan"
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
Perform nightly security scan: credential scan (check for tokens/keys accidentally \
committed or present in vault files), git audit (recent commits, unexpected files), \
token health (verify all tokens in ~/.config/fern/ are readable and not expired), \
file integrity (check for unexpected large files or permission changes). \
Write report to 08-tools/agents/security/reports/$(date +%Y-%m-%d)-security-scan.md. \
Git commit and push."

echo "Running claude -p --model $MODEL ..."
"$CLAUDE" --print \
  --model "$MODEL" \
  --dangerously-skip-permissions \
  "$PROMPT"

EXIT_CODE=$?
echo "=== $JOB finished at $(date -u +%Y-%m-%dT%H:%M:%SZ) — exit $EXIT_CODE ==="
exit $EXIT_CODE
