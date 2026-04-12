# Mission Control Cron Jobs

Standalone launchd jobs that run Fern's scheduled agent work directly via the Claude CLI. No Fern session required — scheduling is handled by launchd, execution is handled by `claude -p`.

## Design Principle

```
launchd (scheduling) → shell script (env setup + logging) → claude -p (LLM work)
```

Fern's session no longer manages cron jobs. Each job is a self-contained launchd agent that:
1. Sources `~/.zshrc` to load environment variables (API tokens, etc.)
2. `cd`s into the vault
3. Invokes `claude --print --model sonnet --dangerously-skip-permissions` with the agent prompt
4. Appends stdout + stderr to a log file in `~/Library/Logs/mission-control/`

## ⚠️ CRITICAL: launchd uses LOCAL time, not UTC

`StartCalendarInterval` in every plist is interpreted in the **system's local timezone**, not UTC. The `<Hour>` value is the local hour the job fires — NOT the UTC hour.

A previous bug had all 7 plists encoded as if `Hour` were UTC, which made every job fire 5 hours late (e.g., the 6:57am brief was firing at 11:57am). Fixed 2026-04-12 by rewriting every plist to local hours. **Don't reintroduce this.** If you want 6:57am CT, write `<Hour>6</Hour><Minute>57</Minute>`. Do not "convert to UTC."

On DST transitions the plists keep the same local hour — no edit needed.

## Jobs

Plist Hour/Minute values below are **local time** — what launchd actually reads.

| Job | Agent | Local time | Plist Hour / Minute | Weekday |
|-----|-------|-----------|----------------------|---------|
| dispatcher | system | Every 30s | `StartInterval` 30s | n/a |
| scout-daily-brief | Scout | 6:57am daily | 6 / 57 | any |
| sentinel-context-collection | Sentinel | Every 3h at :17 | `StartInterval` 10800s | n/a |
| sentinel-health-check-morning | Sentinel | 6:00am daily | 6 / 0 | any |
| sentinel-health-check-evening | Sentinel | 10:00pm daily | 22 / 0 | any |
| sentinel-nightly-security-scan | Sentinel | 11:00pm daily | 23 / 0 | any |
| reed-weekly-content | Reed | Thu 9:00am | 9 / 0 | 4 (Thu) |
| scout-weekly-content-review | Scout | Fri 5:00pm | 17 / 0 | 5 (Fri) |
| scout-derek-job-scan | Scout | Wed 8:00am | 8 / 0 | 3 (Wed) |
| scout-frontier-labs-deep-dive | Scout | Mon 9:00am | 9 / 0 | 1 (Mon) |

### Dispatcher (special)

The `dispatcher` job polls `/api/kanban/pending-dispatch` every 30s. Any task created from the kanban UI (with `source='ui'`) gets auto-dispatched to the matching agent via `claude -p`. The dispatcher:
1. Claims the task (`PATCH status=in_progress`) to prevent double-dispatch
2. Spawns `claude -p --model sonnet --dangerously-skip-permissions` with the agent identity doc + kanban update instructions
3. Logs to `~/Library/Logs/mission-control/dispatch-task-{id}.log`

The dispatcher does NOT use `install.sh` — it's loaded separately and managed outside the standard batch install.

## Installation

```bash
cd ~/mission-control/cron
./install.sh
```

This symlinks all plists into `~/Library/LaunchAgents/` and loads them. Safe to re-run.

Verify the jobs are loaded:
```bash
launchctl list | grep mission-control
```

## Uninstall

```bash
cd ~/mission-control/cron
./uninstall.sh
```

Unloads all jobs and removes symlinks. Log files are preserved. The dispatcher job is skipped (managed separately).

## Structure

```
cron/
  install.sh           # Symlink + load all plists
  uninstall.sh         # Unload + remove symlinks
  README.md            # This file
  scripts/             # Wrapper shell scripts (one per job)
    scout-daily-brief.sh
    sentinel-context-collection.sh
    sentinel-health-check-morning.sh
    sentinel-health-check-evening.sh
    sentinel-nightly-security-scan.sh
    reed-weekly-content.sh
    scout-weekly-content-review.sh
    scout-derek-job-scan.sh
    scout-frontier-labs-deep-dive.sh
  plists/              # launchd plists (one per job)
    com.mission-control.scout-daily-brief.plist
    com.mission-control.sentinel-context-collection.plist
    com.mission-control.sentinel-health-check-morning.plist
    com.mission-control.sentinel-health-check-evening.plist
    com.mission-control.sentinel-nightly-security-scan.plist
    com.mission-control.reed-weekly-content.plist
    com.mission-control.scout-weekly-content-review.plist
    com.mission-control.scout-derek-job-scan.plist
    com.mission-control.scout-frontier-labs-deep-dive.plist
```

## Logs

All jobs log to `~/Library/Logs/mission-control/[job-name].log`. Each run appends a timestamped block.

View live output:
```bash
tail -f ~/Library/Logs/mission-control/scout-daily-brief.log
```

View all logs:
```bash
ls ~/Library/Logs/mission-control/
```

## Customization

All wrapper scripts support these environment variable overrides:

| Variable | Default | Purpose |
|----------|---------|---------|
| `VAULT_DIR` | `~/fern-vault` | Path to the vault repo |
| `CLAUDE_PATH` | `~/.local/bin/claude` | Path to the Claude CLI |
| `CLAUDE_MODEL` | `sonnet` | Model tier for agent invocations |
| `LOG_DIR` | `~/Library/Logs/mission-control` | Where to write log files |

Set these in the plist `EnvironmentVariables` dict to override on a per-job basis.

## Manual Trigger

To run a job immediately (useful for testing):
```bash
# Run the wrapper script directly
~/mission-control/cron/scripts/scout-daily-brief.sh

# Or trigger via launchctl
launchctl start com.mission-control.scout-daily-brief
```

## Portability

Paths in plists and scripts are hardcoded to `/Users/josephinewood/`. To adapt for a different user:
1. Update `VAULT_DIR`, `HOME`, `PATH`, `CLAUDE_PATH` in each plist's `EnvironmentVariables`
2. Update `ProgramArguments` script paths in each plist
3. Update `StandardOutPath` / `StandardErrorPath` log paths

The wrapper scripts themselves use `$HOME` and are portable — only the plists need path updates.
