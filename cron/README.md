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

## Jobs

| Job | Agent | Schedule (CT) | Schedule (UTC) | Cron |
|-----|-------|--------------|----------------|------|
| scout-daily-brief | Scout | 6:57am daily | 11:57 daily | `57 11 * * *` |
| sentinel-context-collection | Sentinel | Every 3h at :17 | Every 3h at :17 | `17 */3 * * *` |
| sentinel-health-check-morning | Sentinel | 6:00am daily | 11:00 daily | `0 11 * * *` |
| sentinel-health-check-evening | Sentinel | 10:00pm daily | 03:00 daily | `0 3 * * *` |
| sentinel-nightly-security-scan | Sentinel | 11:00pm daily | 04:00 daily | `0 4 * * *` |
| reed-weekly-content | Reed | Thu 9:00am | Thu 14:00 | `0 14 * * 4` |
| scout-weekly-content-review | Scout | Fri 5:00pm | Fri 22:00 | `0 22 * * 5` |
| scout-derek-job-scan | Scout | Wed 8:00am | Wed 13:00 | `0 13 * * 3` |

Note: launchd uses local system time, not UTC. The UTC times above are for reference assuming CT (UTC-5 standard / UTC-6 daylight). **Adjust the plist Hour values if your system timezone differs from CT.**

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
  plists/              # launchd plists (one per job)
    com.mission-control.scout-daily-brief.plist
    com.mission-control.sentinel-context-collection.plist
    com.mission-control.sentinel-health-check-morning.plist
    com.mission-control.sentinel-health-check-evening.plist
    com.mission-control.sentinel-nightly-security-scan.plist
    com.mission-control.reed-weekly-content.plist
    com.mission-control.scout-weekly-content-review.plist
    com.mission-control.scout-derek-job-scan.plist
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
