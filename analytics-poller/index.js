// analytics-poller/index.js
// Instagram analytics polling service for Mission Control.
// Runs tiered polling, stores data in SQLite at ../data/analytics.db.
// Exposes REST API on port 4982 for the frontend to consume.

import express from 'express'
import cors from 'cors'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load token from file if env var not set
if (!process.env.INSTAGRAM_ACCESS_TOKEN) {
  try {
    const token = readFileSync(resolve(process.env.HOME, '.config/fern/instagram_token'), 'utf8').trim()
    process.env.INSTAGRAM_ACCESS_TOKEN = token
    console.log('[poller] Loaded INSTAGRAM_ACCESS_TOKEN from ~/.config/fern/instagram_token')
  } catch (e) {
    console.warn('[poller] Could not load instagram token from file:', e.message)
  }
}

import {
  getDb,
  upsertPost,
  insertPostMetrics,
  upsertFollowerSnapshot,
  upsertAccountSnapshot,
  getAllPosts,
  getAllLatestMetrics,
  getMetricsHistoryForPost,
  getFollowerSnapshots,
  getLatestFollowerSnapshot,
  getLatestAccountSnapshot,
  updatePostCategory,
  getLatestRateLimit,
} from './db.js'

import {
  fetchAllPosts,
  fetchRecentPostMetrics,
  fetchAccountSnapshot,
  fetchFollowerDeltaHistory,
  extractInsights,
} from './instagram.js'

import {
  suggestCategory,
  extractHookText,
  classifyHookType,
  CATEGORIES,
} from './categorize.js'

const PORT = parseInt(process.env.ANALYTICS_PORT || '4982', 10)

// ─── Polling State ────────────────────────────────────────────────────────────

let backfillDone = false
let lastError = null
let pollCounts = {
  recentPosts: 0,
  olderPosts: 0,
  archivePosts: 0,
  followerSnapshot: 0,
  followerDelta: 0,
  accountSnapshot: 0,
}

// ─── Data Processing ──────────────────────────────────────────────────────────


function storePost(post) {
  const db = getDb()
  const hookText = extractHookText(post.caption)
  const processed = {
    id: post.id,
    caption: post.caption || '',
    hook_text: hookText,
    hook_type: classifyHookType(hookText),
    media_type: post.media_type || null,
    permalink: post.permalink || null,
    published_at: post.timestamp || null,
    category: null, // preserve existing category
    slug: null,
    thumbnail_url: post.thumbnail_url || post.media_url || null,
  }

  // Check existing post to preserve manual category
  const existing = db.prepare('SELECT category FROM posts WHERE id = ?').get(post.id)
  if (!existing) {
    // New post — auto-suggest category
    processed.category = suggestCategory(post.caption)
  }

  // Use INSERT OR IGNORE + UPDATE pattern to preserve category
  db.prepare(`
    INSERT OR IGNORE INTO posts (id, caption, hook_text, hook_type, media_type, permalink, published_at, category, slug, thumbnail_url)
    VALUES (@id, @caption, @hook_text, @hook_type, @media_type, @permalink, @published_at, @category, @slug, @thumbnail_url)
  `).run(processed)

  // Update everything except category (which is manually set)
  db.prepare(`
    UPDATE posts SET
      caption = @caption,
      hook_text = @hook_text,
      hook_type = @hook_type,
      media_type = @media_type,
      permalink = @permalink,
      published_at = @published_at,
      slug = @slug,
      thumbnail_url = @thumbnail_url
    WHERE id = @id
  `).run(processed)

  // Store metrics
  const metrics = {
    post_id: post.id,
    captured_at: new Date().toISOString(),
    reach: null,
    impressions: null,
    plays: null,
    likes: post.like_count ?? null,
    comments: post.comments_count ?? null,
    shares: null,
    saves: null,
    avg_watch_time_ms: null,
    total_watch_time_ms: null,
  }

  // Extract insights if available
  const insights = extractInsights(post)
  Object.assign(metrics, {
    reach: insights.reach,
    impressions: insights.impressions,
    plays: insights.plays,
    shares: insights.shares,
    saves: insights.saves,
    avg_watch_time_ms: insights.avg_watch_time_ms,
    total_watch_time_ms: insights.total_watch_time_ms,
  })

  insertPostMetrics(metrics)
}

// ─── Polling Functions ────────────────────────────────────────────────────────

async function runBackfill() {
  console.log('[poller] Starting backfill of all posts...')
  try {
    const posts = await fetchAllPosts()
    for (const post of posts) {
      storePost(post)
    }
    backfillDone = true
    lastError = null
    console.log(`[poller] Backfill complete: ${posts.length} posts stored`)
  } catch (err) {
    lastError = err.message
    console.error('[poller] Backfill failed:', err.message)
  }
}

async function pollRecentPosts() {
  try {
    const posts = await fetchRecentPostMetrics(7)
    for (const post of posts) {
      storePost(post)
    }
    pollCounts.recentPosts++
    lastError = null
    console.log(`[poller] Recent posts poll #${pollCounts.recentPosts}: ${posts.length} posts updated`)
  } catch (err) {
    lastError = err.message
    console.error('[poller] Recent posts poll failed:', err.message)
  }
}

async function pollOlderPosts() {
  try {
    const posts = await fetchRecentPostMetrics(30)
    // Only store posts older than 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const olderPosts = posts.filter(p => new Date(p.timestamp) < sevenDaysAgo)
    for (const post of olderPosts) {
      storePost(post)
    }
    pollCounts.olderPosts++
    lastError = null
  } catch (err) {
    lastError = err.message
    console.error('[poller] Older posts poll failed:', err.message)
  }
}

async function pollFollowerSnapshot() {
  try {
    const account = await fetchAccountSnapshot()
    const now = new Date().toISOString()

    upsertAccountSnapshot({
      captured_at: now,
      followers_count: account.followers_count,
      media_count: account.media_count,
      username: account.username,
    })

    // Also record as follower snapshot (no delta available here — set null)
    upsertFollowerSnapshot({
      captured_at: now,
      follower_count: account.followers_count,
      daily_delta: null,
    })

    pollCounts.followerSnapshot++
    lastError = null
    console.log(`[poller] Follower snapshot: ${account.followers_count} followers`)
  } catch (err) {
    lastError = err.message
    console.error('[poller] Follower snapshot failed:', err.message)
  }
}

async function pollFollowerDeltaHistory() {
  try {
    const deltas = await fetchFollowerDeltaHistory()

    // Get current follower count to anchor reconstruction
    const latestAccount = getLatestAccountSnapshot()
    const currentCount = latestAccount?.followers_count || 100 // fallback to known baseline

    // Reconstruct absolute counts by working backwards from current
    // deltas are ordered oldest-to-newest from API
    const sorted = [...deltas].sort((a, b) => new Date(a.date) - new Date(b.date))

    // Work forward from 30 days ago using baseline
    // The API gives net daily change; we need to reconstruct absolute count
    // Strategy: use current count and work backwards through deltas
    let runningCount = currentCount
    const reversedDeltas = [...sorted].reverse()

    for (const item of reversedDeltas) {
      upsertFollowerSnapshot({
        captured_at: item.date,
        follower_count: runningCount,
        daily_delta: item.delta,
      })
      runningCount -= item.delta // working backwards
    }

    pollCounts.followerDelta++
    lastError = null
    console.log(`[poller] Follower delta history stored: ${deltas.length} days`)
  } catch (err) {
    lastError = err.message
    console.error('[poller] Follower delta history failed:', err.message)
  }
}

// ─── Polling Scheduler ────────────────────────────────────────────────────────

function startPolling() {
  // Initial backfill then start tiered polling
  runBackfill().then(() => {
    // After backfill, also pull follower history
    pollFollowerDeltaHistory()
    pollFollowerSnapshot()
  })

  // Every 5 minutes: recent posts (last 7 days)
  setInterval(pollRecentPosts, 5 * 60 * 1000)

  // Every 30 minutes: older posts (7-30 days)
  setInterval(pollOlderPosts, 30 * 60 * 1000)

  // Every 15 minutes: follower count snapshot
  setInterval(pollFollowerSnapshot, 15 * 60 * 1000)

  // Every 6 hours: full archive backfill (catches any missed posts)
  setInterval(runBackfill, 6 * 60 * 60 * 1000)

  // Daily at midnight: follower delta history
  function scheduleFollowerDeltaDaily() {
    const now = new Date()
    const midnight = new Date()
    midnight.setHours(24, 0, 0, 0)
    const msUntilMidnight = midnight - now
    setTimeout(() => {
      pollFollowerDeltaHistory()
      setInterval(pollFollowerDeltaHistory, 24 * 60 * 60 * 1000)
    }, msUntilMidnight)
  }
  scheduleFollowerDeltaDaily()
}

// ─── Analytics API Computation ────────────────────────────────────────────────

function computeAnalyticsData() {
  const db = getDb()
  const posts = getAllPosts()
  const latestMetrics = getAllLatestMetrics()

  // Build a map of post_id -> latest metrics
  const metricsMap = {}
  for (const m of latestMetrics) {
    metricsMap[m.post_id] = m
  }

  // Merge posts with metrics
  const postsWithMetrics = posts.map(post => {
    const m = metricsMap[post.id] || {}
    const likes = m.likes || 0
    const comments = m.comments || 0
    const shares = m.shares || 0
    const saves = m.saves || 0
    const reach = m.reach || 0
    const totalInteractions = likes + comments + shares + saves
    const engagementRate = reach > 0 ? (totalInteractions / reach * 100) : 0

    return {
      ...post,
      metrics: {
        reach,
        impressions: m.impressions || 0,
        plays: m.plays || 0,
        likes,
        comments,
        shares,
        saves,
        avg_watch_time_ms: m.avg_watch_time_ms || null,
        total_watch_time_ms: m.total_watch_time_ms || null,
        total_interactions: totalInteractions,
        engagement_rate: Math.round(engagementRate * 10) / 10,
        captured_at: m.captured_at || null,
      },
    }
  })

  // Category breakdown
  const categoryMap = {}
  for (const post of postsWithMetrics) {
    const cat = post.category || 'Uncategorized'
    if (!categoryMap[cat]) {
      categoryMap[cat] = {
        category: cat,
        post_count: 0,
        total_reach: 0,
        total_engagement_rate: 0,
        total_shares: 0,
        total_saves: 0,
        best: null,
        worst: null,
      }
    }
    const c = categoryMap[cat]
    c.post_count++
    c.total_reach += post.metrics.reach
    c.total_engagement_rate += post.metrics.engagement_rate
    c.total_shares += post.metrics.shares
    c.total_saves += post.metrics.saves

    // Track best/worst by reach
    if (!c.best || post.metrics.reach > c.best.reach) {
      c.best = { id: post.id, title: (post.hook_text || post.caption || '').substring(0, 80), reach: post.metrics.reach }
    }
    if (!c.worst || (post.metrics.reach < c.worst.reach && post.metrics.reach > 0)) {
      c.worst = { id: post.id, title: (post.hook_text || post.caption || '').substring(0, 80), reach: post.metrics.reach }
    }
  }

  const categories = Object.values(categoryMap).map(c => ({
    ...c,
    avg_reach: c.post_count > 0 ? Math.round(c.total_reach / c.post_count) : 0,
    avg_engagement_rate: c.post_count > 0 ? Math.round(c.total_engagement_rate / c.post_count * 10) / 10 : 0,
  }))

  // Hook analysis
  const hookMap = {}
  for (const post of postsWithMetrics) {
    const hookType = post.hook_type || 'Other'
    if (!hookMap[hookType]) {
      hookMap[hookType] = {
        hook_type: hookType,
        post_count: 0,
        total_reach: 0,
      }
    }
    hookMap[hookType].post_count++
    hookMap[hookType].total_reach += post.metrics.reach
  }

  const hookStats = Object.values(hookMap).map(h => ({
    ...h,
    avg_reach: h.post_count > 0 ? Math.round(h.total_reach / h.post_count) : 0,
  }))

  // Follower data
  const followerSnapshots = getFollowerSnapshots(90)
  const latestAccount = getLatestAccountSnapshot()
  const latestFollower = getLatestFollowerSnapshot()

  // Compute follower trend stats
  const followerStats = computeFollowerStats(followerSnapshots, latestAccount)

  // Forecast
  const forecast = computeForecast(followerSnapshots, latestAccount)

  return {
    posts: postsWithMetrics,
    categories,
    hookStats,
    followerSnapshots: followerSnapshots.reverse(), // chronological order
    followerStats,
    forecast,
    account: latestAccount,
    rateLimit: getLatestRateLimit(),
    backfillDone,
    lastError,
    pollCounts,
    lastUpdated: new Date().toISOString(),
  }
}

function computeFollowerStats(snapshots, account) {
  if (!snapshots || snapshots.length === 0) {
    return {
      current: account?.followers_count || 0,
      change_7d: null,
      change_30d: null,
      avg_daily_gain: null,
      best_day: null,
    }
  }

  const current = account?.followers_count || snapshots[0]?.follower_count || 0
  const sorted = [...snapshots].sort((a, b) => new Date(a.captured_at) - new Date(b.captured_at))

  const now = new Date()
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000)

  const snap7dAgo = sorted.find(s => new Date(s.captured_at) >= sevenDaysAgo)
  const snap30dAgo = sorted.find(s => new Date(s.captured_at) >= thirtyDaysAgo)

  const change_7d = snap7dAgo ? current - snap7dAgo.follower_count : null
  const change_30d = snap30dAgo ? current - snap30dAgo.follower_count : null

  // Average daily gain from deltas
  const deltasLast30 = sorted
    .filter(s => s.daily_delta !== null && new Date(s.captured_at) >= thirtyDaysAgo)
    .map(s => s.daily_delta)
  const avg_daily_gain = deltasLast30.length > 0
    ? Math.round(deltasLast30.reduce((a, b) => a + b, 0) / deltasLast30.length * 10) / 10
    : null

  // Best single day
  const withDeltas = sorted.filter(s => s.daily_delta !== null && s.daily_delta > 0)
  const bestDay = withDeltas.reduce((best, s) => (!best || s.daily_delta > best.daily_delta) ? s : best, null)

  return {
    current,
    change_7d,
    change_30d,
    avg_daily_gain,
    best_day: bestDay ? { date: bestDay.captured_at, delta: bestDay.daily_delta } : null,
  }
}

function computeForecast(snapshots, account) {
  const current = account?.followers_count || 100
  const sorted = [...snapshots].sort((a, b) => new Date(a.captured_at) - new Date(b.captured_at))

  // Conservative: linear regression on last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const recent = sorted.filter(s => new Date(s.captured_at) >= thirtyDaysAgo)

  let conservativeRate = 0
  if (recent.length >= 2) {
    const first = recent[0]
    const last = recent[recent.length - 1]
    const daysDiff = (new Date(last.captured_at) - new Date(first.captured_at)) / (1000 * 60 * 60 * 24)
    if (daysDiff > 0) {
      conservativeRate = (last.follower_count - first.follower_count) / daysDiff
    }
  }

  // Fallback: assume 1 follower/day if no history
  if (conservativeRate <= 0) conservativeRate = 1

  // Moderate: conservative * 1.5 + occasional viral boost
  const moderateRate = conservativeRate * 1.5

  // Optimistic: based on March 13-18 run avg (used as proxy for high-performing period)
  const optimisticRate = Math.max(conservativeRate * 3, 5)

  const milestones = [500, 1000, 2500, 5000, 10000, 25000, 50000, 100000]

  function daysToMilestone(milestone, rate) {
    if (current >= milestone) return null
    if (rate <= 0) return null
    return Math.ceil((milestone - current) / rate)
  }

  function milestoneDate(days) {
    if (days === null) return null
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d.toISOString().split('T')[0]
  }

  const milestoneTable = milestones
    .filter(m => m > current)
    .map(milestone => {
      const dConservative = daysToMilestone(milestone, conservativeRate)
      const dModerate = daysToMilestone(milestone, moderateRate)
      const dOptimistic = daysToMilestone(milestone, optimisticRate)
      return {
        milestone,
        conservative_days: dConservative,
        moderate_days: dModerate,
        optimistic_days: dOptimistic,
        conservative_date: milestoneDate(dConservative),
        moderate_date: milestoneDate(dModerate),
        optimistic_date: milestoneDate(dOptimistic),
      }
    })

  // Generate projection data points (monthly for 12 months)
  const projectionPoints = []
  const today = new Date()
  for (let month = 0; month <= 12; month++) {
    const date = new Date(today)
    date.setMonth(date.getMonth() + month)
    const days = month * 30.5
    projectionPoints.push({
      date: date.toISOString().split('T')[0],
      conservative: Math.round(current + conservativeRate * days),
      moderate: Math.round(current + moderateRate * days),
      optimistic: Math.round(current + optimisticRate * days),
    })
  }

  return {
    conservativeRate: Math.round(conservativeRate * 100) / 100,
    moderateRate: Math.round(moderateRate * 100) / 100,
    optimisticRate: Math.round(optimisticRate * 100) / 100,
    milestoneTable,
    projectionPoints,
    disclaimer: 'Linear regression on ~100 followers. Low confidence — use as directional guide only.',
  }
}

// ─── Express Server ───────────────────────────────────────────────────────────

const app = express()
app.use(cors())
app.use(express.json())

// GET /analytics — full analytics data dump
app.get('/analytics', (req, res) => {
  try {
    const data = computeAnalyticsData()
    res.json(data)
  } catch (err) {
    console.error('[api] /analytics error:', err)
    res.status(500).json({ error: err.message })
  }
})

// GET /analytics/posts — posts with latest metrics
app.get('/analytics/posts', (req, res) => {
  try {
    const data = computeAnalyticsData()
    res.json({ posts: data.posts })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /analytics/post/:id/history — metrics history for a single post
app.get('/analytics/post/:id/history', (req, res) => {
  try {
    const history = getMetricsHistoryForPost(req.params.id, 50)
    res.json({ history })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /analytics/post/:id/category — update post category
app.patch('/analytics/post/:id/category', (req, res) => {
  try {
    const { category } = req.body
    if (!category || typeof category !== 'string') {
      return res.status(400).json({ error: 'category is required' })
    }
    const validCategories = ['Warning', 'Educational', 'Current Events', 'Opinion', 'Other', 'Uncategorized']
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: `Invalid category. Valid: ${validCategories.join(', ')}` })
    }
    updatePostCategory(req.params.id, category)
    res.json({ ok: true, post_id: req.params.id, category })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /analytics/followers — follower snapshots and stats
app.get('/analytics/followers', (req, res) => {
  try {
    const snapshots = getFollowerSnapshots(90)
    const account = getLatestAccountSnapshot()
    const stats = computeFollowerStats(snapshots, account)
    res.json({ snapshots: snapshots.reverse(), stats, account })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /analytics/status — poller health
app.get('/analytics/status', (req, res) => {
  res.json({
    ok: true,
    backfillDone,
    lastError,
    pollCounts,
    lastUpdated: new Date().toISOString(),
  })
})

// POST /analytics/backfill — manually trigger backfill
app.post('/analytics/backfill', async (req, res) => {
  res.json({ ok: true, message: 'Backfill started' })
  runBackfill()
})

// ─── Start ────────────────────────────────────────────────────────────────────

// Ensure DB is initialized
getDb()

app.listen(PORT, () => {
  console.log(`[poller] Analytics poller started on port ${PORT}`)
  console.log(`[poller] DB: ~/mission-control/data/analytics.db`)
  startPolling()
})
