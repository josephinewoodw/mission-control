// hooks/useAnalyticsData.ts
// Fetches analytics data from the analytics poller service (port 4982 via /analytics proxy).
// Polls every 30 seconds — well within API budget since the poller handles the actual Instagram calls.

import { useState, useEffect, useRef, useCallback } from 'react'

const ANALYTICS_BASE = ''
const POLL_INTERVAL_MS = 30_000

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PostMetrics {
  reach: number
  impressions: number
  plays: number
  likes: number
  comments: number
  shares: number
  saves: number
  avg_watch_time_ms: number | null
  total_watch_time_ms: number | null
  total_interactions: number
  engagement_rate: number
  captured_at: string | null
}

export interface Post {
  id: string
  caption: string
  hook_text: string | null
  hook_type: string | null
  media_type: string | null
  permalink: string | null
  published_at: string | null
  category: string
  series: string | null
  slug: string | null
  thumbnail_url: string | null
  metrics: PostMetrics
}

export interface CategoryStats {
  category: string
  post_count: number
  total_reach: number
  avg_reach: number
  total_engagement_rate: number
  avg_engagement_rate: number
  total_shares: number
  total_saves: number
  best: { id: string; title: string; reach: number } | null
  worst: { id: string; title: string; reach: number } | null
}

export interface HookStat {
  hook_type: string
  post_count: number
  total_reach: number
  avg_reach: number
}

export interface FollowerSnapshot {
  captured_at: string
  follower_count: number
  daily_delta: number | null
}

export interface FollowerStats {
  current: number
  change_7d: number | null
  change_30d: number | null
  avg_daily_gain: number | null
  best_day: { date: string; delta: number } | null
}

export interface ForecastMilestone {
  milestone: number
  conservative_days: number | null
  moderate_days: number | null
  optimistic_days: number | null
  conservative_date: string | null
  moderate_date: string | null
  optimistic_date: string | null
}

export interface ForecastPoint {
  date: string
  conservative: number
  moderate: number
  optimistic: number
}

export interface Forecast {
  conservativeRate: number
  moderateRate: number
  optimisticRate: number
  milestoneTable: ForecastMilestone[]
  projectionPoints: ForecastPoint[]
  disclaimer: string | null
}

export interface AccountSnapshot {
  captured_at: string
  followers_count: number
  media_count: number
  username: string | null
}

export interface RateLimitInfo {
  captured_at: string
  call_count: number
  total_cputime: number
  total_time: number
}

export interface AnalyticsData {
  posts: Post[]
  categories: CategoryStats[]
  hookStats: HookStat[]
  followerSnapshots: FollowerSnapshot[]
  followerStats: FollowerStats
  forecast: Forecast
  account: AccountSnapshot | null
  rateLimit: RateLimitInfo | null
  backfillDone: boolean
  lastError: string | null
  lastUpdated: string
}

interface UseAnalyticsDataReturn {
  data: AnalyticsData | null
  loading: boolean
  error: string | null
  connected: boolean
  updatePostCategory: (postId: string, category: string) => Promise<boolean>
  triggerBackfill: () => Promise<void>
  refetch: () => void
}

export function useAnalyticsData(): UseAnalyticsDataReturn {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const cancelledRef = useRef(false)

  const fetchData = useCallback(async () => {
    if (cancelledRef.current) return
    try {
      const res = await fetch(`${ANALYTICS_BASE}/analytics`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: AnalyticsData = await res.json()
      if (!cancelledRef.current) {
        setData(json)
        setConnected(true)
        setError(null)
        setLoading(false)
      }
    } catch (err: any) {
      if (!cancelledRef.current) {
        setError(err.message || 'Failed to fetch analytics')
        setConnected(false)
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    cancelledRef.current = false
    fetchData()
    pollRef.current = setInterval(fetchData, POLL_INTERVAL_MS)
    return () => {
      cancelledRef.current = true
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [fetchData])

  const updatePostCategory = useCallback(async (postId: string, category: string): Promise<boolean> => {
    try {
      const res = await fetch(`${ANALYTICS_BASE}/analytics/post/${postId}/category`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category }),
      })
      if (!res.ok) return false
      // Optimistically update local state
      setData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          posts: prev.posts.map(p => p.id === postId ? { ...p, category } : p),
        }
      })
      return true
    } catch {
      return false
    }
  }, [])

  const triggerBackfill = useCallback(async () => {
    await fetch(`${ANALYTICS_BASE}/analytics/backfill`, { method: 'POST' })
    setTimeout(fetchData, 3000) // Re-fetch after 3s
  }, [fetchData])

  return {
    data,
    loading,
    error,
    connected,
    updatePostCategory,
    triggerBackfill,
    refetch: fetchData,
  }
}
