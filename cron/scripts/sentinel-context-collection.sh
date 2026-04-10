#!/usr/bin/env bash
# sentinel-context-collection.sh — Sentinel context collection (every 3h)
# Schedule: every 3 hours at :17 (e.g. 00:17, 03:17, 06:17, ...)
#
# Reads the current Fern transcript, updates today's daily note,
# updates state.md and promises.md if needed. Git commit and push.
#
# Logs: ~/Library/Logs/mission-control/sentinel-context-collection.log

JOB="sentinel-context-collection"
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
