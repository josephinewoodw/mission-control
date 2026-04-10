// db.js — SQLite helpers for analytics database
// Uses better-sqlite3 (synchronous API)

import Database from 'better-sqlite3'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = resolve(__dirname, '../data/analytics.db')

let db

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('synchronous = NORMAL')
    db.pragma('foreign_keys = ON')
    initSchema()
  }
  return db
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      caption TEXT,
      hook_text TEXT,
      hook_type TEXT,
      media_type TEXT,
      permalink TEXT,
      published_at TEXT,
      category TEXT DEFAULT 'Uncategorized',
      series TEXT,
      slug TEXT,
      thumbnail_url TEXT
    );

    CREATE TABLE IF NOT EXISTS post_metrics (
      post_id TEXT REFERENCES posts(id),
      captured_at TEXT NOT NULL,
      reach INTEGER,
      impressions INTEGER,
      plays INTEGER,
      likes INTEGER,
      comments INTEGER,
      shares INTEGER,
      saves INTEGER,
      avg_watch_time_ms INTEGER,
      total_watch_time_ms INTEGER,
      PRIMARY KEY (post_id, captured_at)
    );

    CREATE TABLE IF NOT EXISTS follower_snapshots (
      captured_at TEXT PRIMARY KEY,
      follower_count INTEGER,
      daily_delta INTEGER
    );

    CREATE TABLE IF NOT EXISTS account_snapshots (
      captured_at TEXT PRIMARY KEY,
      followers_count INTEGER,
      media_count INTEGER,
      username TEXT
    );

    CREATE TABLE IF NOT EXISTS rate_limit_log (
      captured_at TEXT PRIMARY KEY,
      call_count INTEGER,
      total_cputime INTEGER,
      total_time INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_post_metrics_post_id ON post_metrics(post_id);
    CREATE INDEX IF NOT EXISTS idx_post_metrics_captured_at ON post_metrics(captured_at);
    CREATE INDEX IF NOT EXISTS idx_follower_snapshots_captured_at ON follower_snapshots(captured_at);
  `)
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export function upsertPost(post) {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO posts (id, caption, hook_text, hook_type, media_type, permalink, published_at, category, slug, thumbnail_url)
    VALUES (@id, @caption, @hook_text, @hook_type, @media_type, @permalink, @published_at, @category, @slug, @thumbnail_url)
    ON CONFLICT(id) DO UPDATE SET
      caption = excluded.caption,
      hook_text = excluded.hook_text,
      hook_type = excluded.hook_type,
      media_type = excluded.media_type,
      permalink = excluded.permalink,
      published_at = excluded.published_at,
      slug = excluded.slug,
      thumbnail_url = excluded.thumbnail_url
  `)
  stmt.run(post)
}

export function updatePostCategory(postId, category) {
  const db = getDb()
  db.prepare('UPDATE posts SET category = ? WHERE id = ?').run(category, postId)
}

export function getAllPosts() {
  const db = getDb()
  return db.prepare('SELECT * FROM posts ORDER BY published_at DESC').all()
}

export function getPostById(id) {
  const db = getDb()
  return db.prepare('SELECT * FROM posts WHERE id = ?').get(id)
}

// ─── Post Metrics ─────────────────────────────────────────────────────────────

export function insertPostMetrics(metrics) {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO post_metrics
      (post_id, captured_at, reach, impressions, plays, likes, comments, shares, saves, avg_watch_time_ms, total_watch_time_ms)
    VALUES
      (@post_id, @captured_at, @reach, @impressions, @plays, @likes, @comments, @shares, @saves, @avg_watch_time_ms, @total_watch_time_ms)
  `)
  stmt.run(metrics)
}

export function getLatestMetricsForPost(postId) {
  const db = getDb()
  return db.prepare(`
    SELECT * FROM post_metrics WHERE post_id = ? ORDER BY captured_at DESC LIMIT 1
  `).get(postId)
}

export function getMetricsHistoryForPost(postId, limit = 20) {
  const db = getDb()
  return db.prepare(`
    SELECT * FROM post_metrics WHERE post_id = ? ORDER BY captured_at DESC LIMIT ?
  `).all(postId, limit)
}

export function getAllLatestMetrics() {
  const db = getDb()
  // Get the most recent metrics snapshot for each post
  return db.prepare(`
    SELECT pm.* FROM post_metrics pm
    INNER JOIN (
      SELECT post_id, MAX(captured_at) as max_captured
      FROM post_metrics
      GROUP BY post_id
    ) latest ON pm.post_id = latest.post_id AND pm.captured_at = latest.max_captured
  `).all()
}

// ─── Follower Snapshots ───────────────────────────────────────────────────────

export function upsertFollowerSnapshot(snapshot) {
  const db = getDb()
  db.prepare(`
    INSERT OR REPLACE INTO follower_snapshots (captured_at, follower_count, daily_delta)
    VALUES (@captured_at, @follower_count, @daily_delta)
  `).run(snapshot)
}

export function getFollowerSnapshots(limit = 90) {
  const db = getDb()
  return db.prepare(`
    SELECT * FROM follower_snapshots ORDER BY captured_at DESC LIMIT ?
  `).all(limit)
}

export function getLatestFollowerSnapshot() {
  const db = getDb()
  return db.prepare(`
    SELECT * FROM follower_snapshots ORDER BY captured_at DESC LIMIT 1
  `).get()
}

// ─── Account Snapshots ────────────────────────────────────────────────────────

export function upsertAccountSnapshot(snapshot) {
  const db = getDb()
  db.prepare(`
    INSERT OR REPLACE INTO account_snapshots (captured_at, followers_count, media_count, username)
    VALUES (@captured_at, @followers_count, @media_count, @username)
  `).run(snapshot)
}

export function getLatestAccountSnapshot() {
  const db = getDb()
  return db.prepare(`
    SELECT * FROM account_snapshots ORDER BY captured_at DESC LIMIT 1
  `).get()
}

// ─── Rate Limit ───────────────────────────────────────────────────────────────

export function logRateLimit(data) {
  const db = getDb()
  db.prepare(`
    INSERT OR REPLACE INTO rate_limit_log (captured_at, call_count, total_cputime, total_time)
    VALUES (@captured_at, @call_count, @total_cputime, @total_time)
  `).run(data)
}

export function getLatestRateLimit() {
  const db = getDb()
  return db.prepare(`
    SELECT * FROM rate_limit_log ORDER BY captured_at DESC LIMIT 1
  `).get()
}
