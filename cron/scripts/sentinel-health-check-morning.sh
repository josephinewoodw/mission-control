#!/usr/bin/env bash
# sentinel-health-check-morning.sh — Sentinel morning health check
# Schedule: 6:00am CT daily (11:00 UTC)
#
# Checks for unanswered iMessages, verifies git status, checks token health,
# verifies Mission Control services are running.
# Logs to 08-tools/agents/security/reports/health-log.md.
#
# Logs: ~/Library/Logs/mission-control/sentinel-health-check-morning.log

JOB="sentinel-health-check-morning"
VAULT_DIR="${VAULT_DIR:-$HOME/fern-vault}"
LOG_DIR="${LOG_DIR:-$HOME/Library/Logs/mission-control}"
CLAUDE="${CLAUDE_PATH:-$HOME/.local/bin/claude}"
MODEL="${CLAUDE_MODEL:-sonnet}"

mkdir -p "$LOG_DIR"
exec >> "$LOG_DIR/$JOB.log" 2>&1

trap 'echo "=== ERROR: $JOB failed at line $LINENO (exit $?) at $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" ; exit 1' ERR

echo ""
echo "=== $JOB started at $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

FERN_CONFIG="$HOME/.config/fern"
[[ -f "$FERN_CONFIG/notion_key" ]]           && export NOTION_API_KEY="$(cat "$FERN_CONFIG/notion_key")"
[[ -f "$FERN_CONFIG/instagram_token" ]]      && export INSTAGRAM_ACCESS_TOKEN="$(cat "$FERN_CONFIG/instagram_token")"
[[ -f "$FERN_CONFIG/discord_token" ]]        && export DISCORD_BOT_TOKEN="$(cat "$FERN_CONFIG/discord_token")"
[[ -f "$FERN_CONFIG/brave_key" ]]            && export BRAVE_API_KEY="$(cat "$FERN_CONFIG/brave_key")"
[[ -f "$FERN_CONFIG/openai_key" ]]           && export OPENAI_API_KEY="$(cat "$FERN_CONFIG/openai_key")"
[[ -f "$FERN_CONFIG/gemini_key" ]]           && export GEMINI_API_KEY="$(cat "$FERN_CONFIG/gemini_key")"
[[ -f "$FERN_CONFIG/facebook_app_id" ]]      && export FACEBOOK_APP_ID="$(cat "$FERN_CONFIG/facebook_app_id")"
[[ -f "$FERN_CONFIG/facebook_app_secret" ]]  && export FACEBOOK_APP_SECRET="$(cat "$FERN_CONFIG/facebook_app_secret")"

cd "$VAULT_DIR"

PROMPT="You are Sentinel. Read your identity at .claude/agents/sentinel.md. \
Perform morning health check: check for unanswered iMessages, verify git status, \
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
