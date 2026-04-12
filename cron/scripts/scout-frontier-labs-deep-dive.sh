#!/usr/bin/env bash
# scout-frontier-labs-deep-dive.sh — Weekly deep-dive on top 5 frontier AI labs
# Schedule: Mon 9:00am CT weekly
#
# Invokes Scout via the Claude CLI to produce a research report covering
# Anthropic, OpenAI, Google DeepMind, Meta, and xAI — past 7 days only.
# Output saved to 03-content/research/scans/YYYY-MM-DD-frontier-labs.md.
#
# Logs: ~/Library/Logs/mission-control/scout-frontier-labs-deep-dive.log

JOB="scout-frontier-labs-deep-dive"
VAULT_DIR="${VAULT_DIR:-$HOME/fern-vault}"
LOG_DIR="${LOG_DIR:-$HOME/Library/Logs/mission-control}"
CLAUDE="${CLAUDE_PATH:-$HOME/.local/bin/claude}"
MODEL="${CLAUDE_MODEL:-sonnet}"

mkdir -p "$LOG_DIR"
exec >> "$LOG_DIR/$JOB.log" 2>&1

# Trap unexpected errors — log and exit cleanly so launchd doesn't loop
trap 'echo "=== ERROR: $JOB failed at line $LINENO (exit $?) at $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" ; exit 1' ERR

echo ""
echo "=== $JOB started at $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="

# Load env vars directly from credential files — do NOT source zshrc (bash + zsh syntax incompatible)
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

OUTPUT_FILE="03-content/research/scans/$(date +%Y-%m-%d)-frontier-labs.md"

PROMPT="You are Scout. Read your identity at .claude/agents/scout.md.

Produce a weekly deep-dive report on the top 5 frontier AI labs covering the PAST 7 DAYS ONLY (not lifetime context).

Labs to cover: Anthropic, OpenAI, Google DeepMind, Meta AI, xAI

For each lab, write approximately 300 words covering:
- New model releases, product launches, or feature changes
- Funding rounds, legal developments, or org/leadership moves
- Notable research papers published or announced
- Quote-worthy statements from executives or researchers (cite source)
- Content angles you spot — flag strong candidates with [CONTENT RADAR] prefix

Cite sources inline for every claim. Use web search to find the latest news for each lab.

Format:
- YAML frontmatter with date, type: frontier-labs-deep-dive, labs covered
- H1 title: Frontier Labs Deep Dive — [date]
- One H2 section per lab
- A final H2 section: ## Content Radar — summarize the top 3 content angle candidates flagged above with a one-line pitch for each

Save the report to $OUTPUT_FILE. Git commit and push when done."

echo "Running claude -p --model $MODEL ..."
"$CLAUDE" --print \
  --model "$MODEL" \
  --dangerously-skip-permissions \
  "$PROMPT"

EXIT_CODE=$?
echo "=== $JOB finished at $(date -u +%Y-%m-%dT%H:%M:%SZ) — exit $EXIT_CODE ==="
exit $EXIT_CODE
