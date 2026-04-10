#!/usr/bin/env bash
# uninstall.sh — Unload and remove all Mission Control cron launchd agents
#
# Unloads each job from launchd and removes the symlink from ~/Library/LaunchAgents/.
# Does NOT delete plists from cron/plists/ (source files are preserved).
# Does NOT delete log files.
#
# Usage:
#   cd ~/mission-control/cron && ./uninstall.sh

set -euo pipefail

LAUNCH_AGENTS="$HOME/Library/LaunchAgents"

echo "=== Mission Control Cron Uninstaller ==="
echo ""

REMOVED=0
SKIPPED=0

for target in "$LAUNCH_AGENTS"/com.mission-control.*.plist; do
  # Skip dispatcher — that's managed separately
  name="$(basename "$target" .plist)"
  if [[ "$name" == "com.mission-control.dispatcher" ]]; then
    echo "Skipping dispatcher (managed separately)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  echo "Uninstalling $name ..."

  # Unload — ignore errors if already unloaded
  if launchctl unload "$target" 2>/dev/null; then
    echo "  Unloaded"
  else
    echo "  (was not loaded)"
  fi

  # Remove the symlink/file
  if [[ -e "$target" || -L "$target" ]]; then
    rm "$target"
    echo "  Removed: $target"
  fi

  REMOVED=$((REMOVED + 1))
  echo ""
done

echo "=== Uninstall complete: $REMOVED removed, $SKIPPED skipped ==="
echo ""
echo "Log files preserved at: $HOME/Library/Logs/mission-control/"
echo "To reinstall: ./install.sh"
