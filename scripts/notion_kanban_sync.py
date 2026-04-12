#!/usr/bin/env python3
"""
Notion Kanban Sync — syncs Mission Control task queue to Notion.

Reads tasks from the agents-observe SQLite API and upserts them
into the Notion "Agent Task Queue" database for phone access.

Usage:
    python notion_kanban_sync.py              # sync all active tasks
    python notion_kanban_sync.py --all        # sync all tasks (including completed/stale)
    python notion_kanban_sync.py --dry-run    # preview without writing to Notion
    python notion_kanban_sync.py --watch      # run continuously, sync every 30s

Configuration:
    NOTION_KEY env var, or read from ~/.config/fern/notion_key
    MC API at http://localhost:4981/api/tasks
    Notion DB ID in NOTION_DB_ID below
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

# ── Config ──────────────────────────────────────────────────────────────────
MC_API = "http://localhost:4981/api/tasks"
NOTION_DB_ID = "34036a72-e3cc-8146-944f-cb6842166738"
NOTION_API_BASE = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"

# Statuses to sync (default: exclude stale)
ACTIVE_STATUSES = {"queued", "in_progress", "active", "completed", "failed"}

# Map task status to Notion status option (must match DB options exactly)
STATUS_MAP = {
    "queued": "queued",
    "in_progress": "in_progress",
    "active": "active",
    "completed": "completed",
    "failed": "failed",
    "stale": "stale",
}

NOTION_EMOJI = {
    "queued": "⏳",
    "in_progress": "🔵",
    "active": "⚠️",
    "completed": "✅",
    "failed": "❌",
    "stale": "💤",
}


def get_notion_key() -> str:
    key = os.environ.get("NOTION_API_KEY", "")
    if not key:
        key_path = os.path.expanduser("~/.config/fern/notion_key")
        if os.path.exists(key_path):
            key = open(key_path).read().strip()
    if not key:
        raise RuntimeError("No Notion API key found. Set NOTION_API_KEY or ~/.config/fern/notion_key")
    return key


def mc_request(path: str) -> list:
    url = f"{MC_API}{path}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=5) as resp:
        return json.loads(resp.read().decode("utf-8"))


def notion_request(method: str, path: str, body: dict = None, notion_key: str = "") -> dict:
    url = f"{NOTION_API_BASE}{path}"
    headers = {
        "Authorization": f"Bearer {notion_key}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }
    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body_str = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Notion HTTP {e.code}: {body_str}")


def get_notion_pages(notion_key: str) -> dict:
    """Fetch all existing pages in the Notion DB, keyed by Task ID."""
    pages = {}
    start_cursor = None
    while True:
        body = {"page_size": 100}
        if start_cursor:
            body["start_cursor"] = start_cursor
        result = notion_request("POST", f"/databases/{NOTION_DB_ID}/query", body, notion_key)
        for page in result.get("results", []):
            props = page.get("properties", {})
            task_id_prop = props.get("Task ID", {})
            task_id = task_id_prop.get("number")
            if task_id is not None:
                pages[int(task_id)] = page
        if not result.get("has_more"):
            break
        start_cursor = result.get("next_cursor")
    return pages


def ts_to_iso(ts_ms: int | None) -> str | None:
    if not ts_ms:
        return None
    return datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc).strftime("%Y-%m-%d")


def task_to_notion_props(task: dict) -> dict:
    status = task.get("status", "queued")
    emoji = NOTION_EMOJI.get(status, "")
    title = f"{emoji} {task.get('title', 'Untitled')}".strip()
    desc = (task.get("description") or "")[:2000]  # Notion rich_text limit

    props = {
        "Title": {
            "title": [{"type": "text", "text": {"content": title}}]
        },
        "Status": {
            "select": {"name": STATUS_MAP.get(status, "queued")}
        },
        "Agent": {
            "select": {"name": task.get("agent_name", "fern")}
        },
        "Priority": {
            "select": {"name": task.get("priority", "medium")}
        },
        "Task ID": {
            "number": task.get("id")
        },
    }

    if desc:
        props["Description"] = {
            "rich_text": [{"type": "text", "text": {"content": desc}}]
        }

    created_iso = ts_to_iso(task.get("created_at"))
    if created_iso:
        props["Created"] = {"date": {"start": created_iso}}

    updated_iso = ts_to_iso(task.get("updated_at"))
    if updated_iso:
        props["Updated"] = {"date": {"start": updated_iso}}

    return props


def sync(dry_run: bool = False, include_all: bool = False, verbose: bool = True) -> dict:
    """
    Sync kanban tasks to Notion.
    Returns stats dict: {created, updated, skipped, errors}
    """
    notion_key = get_notion_key()

    # Fetch tasks from MC API
    try:
        tasks = mc_request("")
    except Exception as e:
        print(f"[ERROR] Failed to fetch tasks from MC API: {e}")
        return {"created": 0, "updated": 0, "skipped": 0, "errors": 1}

    # Filter to relevant statuses
    if not include_all:
        tasks = [t for t in tasks if t.get("status") in ACTIVE_STATUSES]

    if verbose:
        print(f"[SYNC] Fetched {len(tasks)} tasks from MC API")

    # Fetch existing Notion pages
    try:
        existing_pages = get_notion_pages(notion_key)
        if verbose:
            print(f"[SYNC] Found {len(existing_pages)} existing Notion entries")
    except Exception as e:
        print(f"[ERROR] Failed to fetch Notion pages: {e}")
        return {"created": 0, "updated": 0, "skipped": 0, "errors": 1}

    stats = {"created": 0, "updated": 0, "skipped": 0, "errors": 0}

    for task in tasks:
        task_id = task.get("id")
        if task_id is None:
            continue

        props = task_to_notion_props(task)
        existing = existing_pages.get(int(task_id))

        try:
            if existing:
                # Check if update needed by comparing status and title
                ex_props = existing.get("properties", {})
                ex_status = ex_props.get("Status", {}).get("select", {}).get("name", "")
                current_status = STATUS_MAP.get(task.get("status", ""), "")
                ex_title_parts = ex_props.get("Title", {}).get("title", [])
                ex_title = ex_title_parts[0].get("plain_text", "") if ex_title_parts else ""
                new_title = (props["Title"]["title"][0]["text"]["content"])

                if ex_status == current_status and ex_title == new_title:
                    stats["skipped"] += 1
                    continue

                if not dry_run:
                    notion_request("PATCH", f"/pages/{existing['id']}", {"properties": props}, notion_key)
                stats["updated"] += 1
                if verbose:
                    print(f"  [UPDATE] Task {task_id}: {task.get('title', '?')[:40]} → {task.get('status')}")
            else:
                if not dry_run:
                    notion_request("POST", "/pages", {
                        "parent": {"database_id": NOTION_DB_ID},
                        "properties": props,
                    }, notion_key)
                stats["created"] += 1
                if verbose:
                    print(f"  [CREATE] Task {task_id}: {task.get('title', '?')[:40]} ({task.get('agent_name')}) → {task.get('status')}")
        except Exception as e:
            stats["errors"] += 1
            print(f"  [ERROR] Task {task_id}: {e}")

    if dry_run:
        print(f"\n[DRY RUN] Would create {stats['created']}, update {stats['updated']}, skip {stats['skipped']} (errors: {stats['errors']})")
    else:
        print(f"\n[DONE] Created {stats['created']}, updated {stats['updated']}, skipped {stats['skipped']} (errors: {stats['errors']})")

    return stats


def main():
    dry_run = "--dry-run" in sys.argv
    include_all = "--all" in sys.argv
    watch = "--watch" in sys.argv

    if watch:
        interval = 30
        print(f"[WATCH] Syncing every {interval}s. Ctrl+C to stop.")
        while True:
            print(f"\n[{datetime.now().strftime('%H:%M:%S')}] Running sync...")
            sync(dry_run=dry_run, include_all=include_all)
            time.sleep(interval)
    else:
        sync(dry_run=dry_run, include_all=include_all)


if __name__ == "__main__":
    main()
