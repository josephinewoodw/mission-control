#!/usr/bin/env bash
# scout-derek-job-scan.sh — Scout Derek job scan
# Schedule: Wednesday 8:00am CT (13:00 UTC)
#
# Searches for AI/data strategy roles that would suit Derek,
# saves digest to 06-research/derek-jobs/.
#
# Logs: ~/Library/Logs/mission-control/scout-derek-job-scan.log

JOB="scout-derek-job-scan"
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
