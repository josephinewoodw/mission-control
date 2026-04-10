// instagram.js — Instagram Graph API call wrappers
// All requests go through igFetch() which handles rate limit tracking and exponential backoff.

import { logRateLimit } from './db.js'

const IG_USER_ID = '17841448210008726'
const API_VERSION = 'v21.0'
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`

// Token expiry warning: token refreshed 2026-04-06, expires ~2026-06-05
const TOKEN_EXPIRY = new Date('2026-06-05T00:00:00Z')
const WARN_DAYS_BEFORE_EXPIRY = 14

function getToken() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  if (!token) {
    throw new Error('INSTAGRAM_ACCESS_TOKEN env var is not set')
  }
  return token
}

function checkTokenExpiry() {
  const now = new Date()
  const daysUntilExpiry = (TOKEN_EXPIRY - now) / (1000 * 60 * 60 * 24)
  if (daysUntilExpiry <= WARN_DAYS_BEFORE_EXPIRY) {
    console.warn(`[instagram] WARNING: Token expires in ${Math.round(daysUntilExpiry)} days (${TOKEN_EXPIRY.toISOString().split('T')[0]})`)
  }
}

// Parse rate limit headers and store them
function parseRateLimitHeaders(headers) {
  try {
    const businessUsage = headers.get('x-business-use-case-usage')
    if (businessUsage) {
      const parsed = JSON.parse(businessUsage)
      const accountData = parsed[IG_USER_ID]
      if (accountData && accountData[0]) {
        const { call_count, total_cputime, total_time } = accountData[0]
        logRateLimit({
          captured_at: new Date().toISOString(),
          call_count,
          total_cputime,
          total_time,
        })
        if (call_count > 80) {
          console.warn(`[instagram] Rate limit at ${call_count}% — pausing non-critical polls`)
        }
        return call_count
      }
    }
  } catch (e) {
    // Non-fatal
  }
  return null
}

// Core fetch with retry on 429
async function igFetch(url, options = {}, retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options)

      parseRateLimitHeaders(res.headers)

      if (res.status === 429) {
        const backoffMs = Math.pow(2, attempt) * 5 * 60 * 1000 // 5min, 10min, 20min
        console.warn(`[instagram] 429 rate limit hit. Backing off ${backoffMs / 60000}min (attempt ${attempt + 1}/${retries})`)
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, backoffMs))
          continue
        }
        throw new Error('Rate limit exceeded after retries')
      }

      if (!res.ok) {
        const errBody = await res.text()
        throw new Error(`HTTP ${res.status}: ${errBody}`)
      }

      return await res.json()
    } catch (err) {
      if (attempt === retries) throw err
      // Brief backoff on network errors
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)))
    }
  }
}

// Build URL with access_token appended
function buildUrl(path, params = {}) {
  const url = new URL(`${BASE_URL}${path}`)
  url.searchParams.set('access_token', getToken())
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  return url.toString()
}

// ─── API Calls ────────────────────────────────────────────────────────────────

/**
 * Fetch all posts with full metrics — used for backfill on first run.
 * Paginates until all posts are fetched.
 */
export async function fetchAllPosts() {
  checkTokenExpiry()
  const fields = [
    'id',
    'caption',
    'media_type',
    'permalink',
    'timestamp',
    'like_count',
    'comments_count',
    'thumbnail_url',
    'media_url',
    `insights.metric(impressions,reach,saved,shares,plays,ig_reels_avg_watch_time,ig_reels_video_view_total_time)`,
  ].join(',')

  let url = buildUrl(`/${IG_USER_ID}/media`, { fields, limit: '25' })
  const allPosts = []

  while (url) {
    console.log(`[instagram] Fetching posts page...`)
    const data = await igFetch(url)
    if (data.data) {
      allPosts.push(...data.data)
    }
    url = data.paging?.next || null
  }

  console.log(`[instagram] Fetched ${allPosts.length} total posts`)
  return allPosts
}

/**
 * Fetch recent posts (last N days) with metrics — used for incremental polling.
 * Returns posts filtered by date, with metrics.
 */
export async function fetchRecentPostMetrics(daysBack = 7) {
  checkTokenExpiry()
  const since = new Date()
  since.setDate(since.getDate() - daysBack)

  const fields = [
    'id',
    'caption',
    'media_type',
    'permalink',
    'timestamp',
    'like_count',
    'comments_count',
    'thumbnail_url',
    `insights.metric(impressions,reach,saved,shares,plays,ig_reels_avg_watch_time,ig_reels_video_view_total_time)`,
  ].join(',')

  const url = buildUrl(`/${IG_USER_ID}/media`, { fields, limit: '25' })
  const data = await igFetch(url)

  // Filter to posts within the date window
  const posts = (data.data || []).filter(p => {
    return new Date(p.timestamp) >= since
  })

  console.log(`[instagram] Fetched ${posts.length} posts from last ${daysBack} days`)
  return posts
}

/**
 * Fetch current account snapshot (followers, media count, username)
 */
export async function fetchAccountSnapshot() {
  checkTokenExpiry()
  const url = buildUrl(`/${IG_USER_ID}`, {
    fields: 'followers_count,media_count,username',
  })
  const data = await igFetch(url)
  console.log(`[instagram] Account snapshot: ${data.followers_count} followers, ${data.media_count} posts`)
  return data
}

/**
 * Fetch daily follower delta for last 30 days.
 * Returns array of { date, delta } objects.
 */
export async function fetchFollowerDeltaHistory() {
  checkTokenExpiry()
  const now = Math.floor(Date.now() / 1000)
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60)

  const url = buildUrl(`/${IG_USER_ID}/insights`, {
    metric: 'follower_count',
    period: 'day',
    since: thirtyDaysAgo.toString(),
    until: now.toString(),
  })

  try {
    const data = await igFetch(url)
    const followerMetric = (data.data || []).find(m => m.name === 'follower_count')
    const values = followerMetric?.values || []
    console.log(`[instagram] Fetched ${values.length} days of follower deltas`)
    return values.map(v => ({
      date: v.end_time,
      delta: v.value,
    }))
  } catch (err) {
    // Follower insights may fail for small accounts — non-fatal
    console.warn(`[instagram] Follower delta fetch failed (may be below threshold): ${err.message}`)
    return []
  }
}

/**
 * Extract metrics from a post's insights array.
 * Returns flat object with reach, impressions, plays, shares, saves, avg_watch_time_ms, total_watch_time_ms
 */
export function extractInsights(post) {
  const metrics = {
    reach: null,
    impressions: null,
    plays: null,
    shares: null,
    saves: null,
    avg_watch_time_ms: null,
    total_watch_time_ms: null,
  }

  const insightData = post.insights?.data || []
  for (const item of insightData) {
    const val = item.values?.[0]?.value ?? null
    switch (item.name) {
      case 'reach': metrics.reach = val; break
      case 'impressions': metrics.impressions = val; break
      case 'plays': metrics.plays = val; break
      case 'shares': metrics.shares = val; break
      case 'saved': metrics.saves = val; break
      case 'ig_reels_avg_watch_time': metrics.avg_watch_time_ms = val; break
      case 'ig_reels_video_view_total_time': metrics.total_watch_time_ms = val; break
    }
  }

  return metrics
}
