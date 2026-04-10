#!/usr/bin/env node
/**
 * Kanban Dispatcher
 *
 * Polls the agents-observe API for pending kanban tasks, claims them, spawns
 * the appropriate Claude agent via CLI, and updates task status when done.
 *
 * Usage:
 *   node dispatcher.js
 *
 * Environment variables:
 *   API_BASE_URL      agents-observe server base URL (default: http://localhost:4981)
 *   POLL_INTERVAL_MS  polling interval in milliseconds (default: 60000)
 *   AGENT_TIMEOUT_MS  max time to wait for a spawned agent (default: 600000 / 10min)
 *   MAX_CONCURRENT    max tasks running at once (default: 2)
 *   CLAUDE_PATH       path to claude CLI (default: resolved from PATH)
 *   CLAUDE_MODEL      model to pass to claude --model (default: sonnet)
 *   DRY_RUN           set to "1" to log tasks without spawning agents
 */

import { spawn } from 'child_process';
import { execSync } from 'child_process';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:4981';
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS ?? '60000', 10);
const AGENT_TIMEOUT_MS = parseInt(process.env.AGENT_TIMEOUT_MS ?? '600000', 10);
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT ?? '2', 10);
const DRY_RUN = process.env.DRY_RUN === '1';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? 'sonnet';

// Resolve claude CLI path: env override, then PATH lookup, then common locations.
function resolveClaude() {
  if (process.env.CLAUDE_PATH) return process.env.CLAUDE_PATH;
  const common = [
    '/Users/' + (process.env.USER ?? 'user') + '/.local/bin/claude',
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
  ];
  try {
    return execSync('which claude', { encoding: 'utf8' }).trim();
  } catch {
    for (const p of common) {
      try { execSync(`test -x "${p}"`); return p; } catch {}
    }
  }
  return 'claude'; // fallback — let the OS sort it out
}

const CLAUDE_PATH = resolveClaude();

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function log(level, msg, extra) {
  const ts = new Date().toISOString();
  const line = extra !== undefined
    ? `[${ts}] [${level}] ${msg} ${JSON.stringify(extra)}`
    : `[${ts}] [${level}] ${msg}`;
  console.log(line);
}

const info  = (msg, x) => log('INFO ', msg, x);
const warn  = (msg, x) => log('WARN ', msg, x);
const error = (msg, x) => log('ERROR', msg, x);

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function apiFetch(path, options = {}) {
  const url = `${API_BASE_URL}/api${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${path}: ${body}`);
  }
  return res.json();
}

async function getPendingTasks() {
  return apiFetch('/kanban/pending');
}

async function claimTask(id) {
  return apiFetch(`/kanban/${id}/claim`, { method: 'PATCH', body: '{}' });
}

async function completeTask(id, status) {
  // status: 'done' | 'failed'
  return apiFetch(`/kanban/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ---------------------------------------------------------------------------
// Agent spawning
// ---------------------------------------------------------------------------

/**
 * Spawn a Claude agent for a kanban task.
 *
 * The prompt passed to the agent includes:
 *   - An instruction to read the agent identity doc at .claude/agents/<name>.md
 *   - The task title and full description
 *
 * Returns: { exitCode, stdout, stderr }
 */
function spawnAgent(task) {
  return new Promise((resolve) => {
    const agentName = task.agent_name.toLowerCase();
    const identityInstruction = `You are ${task.agent_name}. Read your identity doc at .claude/agents/${agentName}.md before starting.`;
    const prompt = [
      identityInstruction,
      '',
      `Task: ${task.title}`,
      task.description ? `\n${task.description}` : '',
    ].join('\n').trim();

    const args = [
      '--print',
      '--model', CLAUDE_MODEL,
      '--dangerously-skip-permissions',
      prompt,
    ];

    info(`Spawning agent`, {
      task_id: task.id,
      agent: task.agent_name,
      title: task.title,
      claude: CLAUDE_PATH,
    });

    if (DRY_RUN) {
      info(`[DRY RUN] Would spawn: ${CLAUDE_PATH} ${args.join(' ')}`);
      return resolve({ exitCode: 0, stdout: '[dry run]', stderr: '' });
    }

    let stdout = '';
    let stderr = '';

    const child = spawn(CLAUDE_PATH, args, {
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      warn(`Agent timeout — killing process`, { task_id: task.id });
      child.kill('SIGTERM');
      // Give it 5s to clean up, then SIGKILL
      setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, 5000);
    }, AGENT_TIMEOUT_MS);

    child.on('close', (code) => {
      clearTimeout(timer);
      const exitCode = timedOut ? -1 : (code ?? -1);
      resolve({ exitCode, stdout: stdout.trim(), stderr: stderr.trim() });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ exitCode: -1, stdout: '', stderr: err.message });
    });
  });
}

// ---------------------------------------------------------------------------
// Task processing
// ---------------------------------------------------------------------------

// Track in-flight task IDs to avoid double-claiming across poll cycles.
const inFlight = new Set();

async function processTask(task) {
  if (inFlight.has(task.id)) {
    warn(`Task already in flight, skipping`, { task_id: task.id });
    return;
  }

  inFlight.add(task.id);
  info(`Claiming task`, { task_id: task.id, title: task.title, agent: task.agent_name });

  try {
    await claimTask(task.id);
  } catch (err) {
    // Another dispatcher may have claimed it between our poll and claim — not an error.
    warn(`Failed to claim task (likely already claimed)`, { task_id: task.id, err: err.message });
    inFlight.delete(task.id);
    return;
  }

  let finalStatus = 'done';
  try {
    const { exitCode, stdout, stderr } = await spawnAgent(task);

    if (exitCode !== 0) {
      warn(`Agent exited with code ${exitCode}`, { task_id: task.id, stderr });
      finalStatus = 'failed';
    } else {
      info(`Agent completed successfully`, { task_id: task.id });
      if (stdout) info(`Agent output (truncated)`, { task_id: task.id, output: stdout.slice(0, 500) });
    }
  } catch (err) {
    error(`Agent spawn threw unexpectedly`, { task_id: task.id, err: err.message });
    finalStatus = 'failed';
  }

  try {
    await completeTask(task.id, finalStatus);
    info(`Task marked ${finalStatus}`, { task_id: task.id });
  } catch (err) {
    error(`Failed to update task status`, { task_id: task.id, status: finalStatus, err: err.message });
  }

  inFlight.delete(task.id);
}

// ---------------------------------------------------------------------------
// Poll loop
// ---------------------------------------------------------------------------

let apiDownSince = null;

async function poll() {
  let tasks;
  try {
    tasks = await getPendingTasks();
    if (apiDownSince !== null) {
      info(`API back online`, { downFor: Date.now() - apiDownSince + 'ms' });
      apiDownSince = null;
    }
  } catch (err) {
    if (apiDownSince === null) {
      apiDownSince = Date.now();
      warn(`API unavailable — will retry next poll`, { url: API_BASE_URL, err: err.message });
    }
    return;
  }

  if (!Array.isArray(tasks)) {
    warn(`Unexpected response shape from /kanban/pending`, { tasks });
    return;
  }

  if (tasks.length === 0) return;

  info(`Found ${tasks.length} pending task(s)`);

  const available = MAX_CONCURRENT - inFlight.size;
  if (available <= 0) {
    info(`At concurrency limit (${MAX_CONCURRENT}), skipping this poll`);
    return;
  }

  // Take up to `available` tasks, sorted by priority then created_at.
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sorted = tasks
    .filter(t => !inFlight.has(t.id))
    .sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 1;
      const pb = priorityOrder[b.priority] ?? 1;
      if (pa !== pb) return pa - pb;
      return a.created_at - b.created_at;
    });

  const batch = sorted.slice(0, available);
  // Fire off without awaiting — tasks run concurrently up to MAX_CONCURRENT.
  for (const task of batch) {
    processTask(task).catch(err => error(`Unhandled task error`, { task_id: task.id, err: err.message }));
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

info(`Kanban dispatcher starting`, {
  api: API_BASE_URL,
  pollIntervalMs: POLL_INTERVAL_MS,
  agentTimeoutMs: AGENT_TIMEOUT_MS,
  maxConcurrent: MAX_CONCURRENT,
  claude: CLAUDE_PATH,
  model: CLAUDE_MODEL,
  dryRun: DRY_RUN,
});

// Run an immediate poll, then schedule on interval.
poll().catch(err => error(`Initial poll failed`, { err: err.message }));
const interval = setInterval(() => {
  poll().catch(err => error(`Poll failed`, { err: err.message }));
}, POLL_INTERVAL_MS);

// Graceful shutdown: finish in-flight tasks before exiting.
async function shutdown(signal) {
  info(`Received ${signal} — shutting down`);
  clearInterval(interval);

  if (inFlight.size > 0) {
    info(`Waiting for ${inFlight.size} in-flight task(s) to finish...`);
    // Poll every 2s until inFlight drains (or 60s max).
    const deadline = Date.now() + 60_000;
    await new Promise(resolve => {
      const check = setInterval(() => {
        if (inFlight.size === 0 || Date.now() > deadline) {
          clearInterval(check);
          resolve();
        }
      }, 2000);
    });
  }

  info(`Dispatcher exited cleanly`);
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
