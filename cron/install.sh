#!/usr/bin/env bash
# install.sh — Install all Mission Control cron jobs as launchd agents
#
# Symlinks each plist from cron/plists/ to ~/Library/LaunchAgents/ and loads it.
# Safe to re-run: unloads before re-loading if already installed.
#
# Usage:
#   cd ~/mission-control/cron && ./install.sh
#
# To install for a different user, set HOME before running.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLISTS_DIR="$SCRIPT_DIR/plists"
LAUNCH_AGENTS="$HOME/Library/LaunchAgents"
LOG_DIR="$HOME/Library/Logs/mission-control"

echo "=== Mission Control Cron Installer ==="
echo "Plists: $PLISTS_DIR"
echo "LaunchAgents: $LAUNCH_AGENTS"
echo "Logs: $LOG_DIR"
echo ""

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Ensure LaunchAgents directory exists
mkdir -p "$LAUNCH_AGENTS"

INSTALLED=0
FAILED=0

for plist in "$PLISTS_DIR"/com.mission-control.*.plist; do
  name="$(basename "$plist" .plist)"
  target="$LAUNCH_AGENTS/$name.plist"

  echo "Installing $name ..."

  # Unload first if already loaded (ignore errors — not loaded is fine)
  launchctl unload "$target" 2>/dev/null || true

  # Remove old symlink or file if present
  if [[ -e "$target" || -L "$target" ]]; then
    rm "$target"
  fi

  # Symlink plist into LaunchAgents
  ln -sf "$plist" "$target"
  echo "  Symlinked: $target -> $plist"

  # Load the job
  if launchctl load "$target"; then
    echo "  Loaded: $name"
    INSTALLED=$((INSTALLED + 1))
  else
    echo "  ERROR: failed to load $name" >&2
    FAILED=$((FAILED + 1))
  fi

  echo ""
done

echo "=== Install complete: $INSTALLED loaded, $FAILED failed ==="
echo ""
echo "Verify with:"
echo "  launchctl list | grep mission-control"
echo ""
echo "View logs:"
echo "  ls $LOG_DIR"
