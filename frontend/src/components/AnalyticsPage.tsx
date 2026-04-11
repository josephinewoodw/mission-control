// components/AnalyticsPage.tsx
// Content analytics dashboard page — Instagram performance, category breakdown,
// hook analysis, follower trends and forecast.

import { useState, useMemo } from 'react'
import { useAnalyticsData } from '../hooks/useAnalyticsData'
import { PostsTable } from './analytics/PostsTable'
import { CategoryCards } from './analytics/CategoryCards'
import { HookAnalysis } from './analytics/HookAnalysis'
import { FollowerChart } from './analytics/FollowerChart'
import { FollowerForecast } from './analytics/FollowerForecast'

// ─── Date range presets ───────────────────────────────────────────────────────

type DatePreset = '7d' | '30d' | '90d' | 'all'

const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: 'all', label: 'All time' },
]

function getDateRange(preset: DatePreset): { start: Date | null; end: Date | null } {
  if (preset === 'all') return { start: null, end: null }
  const end = new Date()
  const start = new Date()
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90
  start.setDate(start.getDate() - days)
  return { start, end }
}

// ─── Summary KPI tiles ────────────────────────────────────────────────────────

function KpiTile({ label, value, sub, highlight = false }: {
  label: string
  value: string | number
  sub?: string
  highlight?: boolean
}) {
  return (
    <div className={`bg-bg-dark rounded-xl border px-4 py-3 flex flex-col gap-1 min-w-0 ${highlight ? 'border-fern/30' : 'border-border'}`}>
      <div className="text-[0.65rem] text-gray-500 uppercase tracking-widest font-medium">{label}</div>
      <div className={`text-xl font-semibold leading-tight truncate ${highlight ? 'text-fern' : 'text-gray-100'}`}>{value}</div>
      {sub && <div className="text-[0.65rem] text-gray-500 leading-tight">{sub}</div>}
    </div>
  )
}

function SummaryTiles({ data }: { data: any }) {
  const followers = data?.followerStats?.current ?? 0
  const change7d = data?.followerStats?.change_7d
  const change30d = data?.followerStats?.change_30d
  const totalPosts = data?.account?.media_count ?? data?.posts?.length ?? 0

  // Avg reach and engagement rate from all posts with real metrics
  const postsWithMetrics = (data?.posts ?? []).filter((p: any) => p.metrics?.reach > 0)
  const avgReach = postsWithMetrics.length > 0
    ? Math.round(postsWithMetrics.reduce((sum: number, p: any) => sum + p.metrics.reach, 0) / postsWithMetrics.length)
    : 0
  const avgEngRate = postsWithMetrics.length > 0
    ? (postsWithMetrics.reduce((sum: number, p: any) => sum + p.metrics.engagement_rate, 0) / postsWithMetrics.length).toFixed(1)
    : '—'

  // Best post this week (last 7 days by reach)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const recentPosts = (data?.posts ?? []).filter((p: any) =>
    p.published_at && new Date(p.published_at) >= weekAgo && p.metrics?.reach > 0
  )
  const bestPost = recentPosts.length > 0
    ? recentPosts.reduce((best: any, p: any) => p.metrics.reach > best.metrics.reach ? p : best, recentPosts[0])
    : null
  const bestPostTitle = bestPost
    ? (bestPost.hook_text || bestPost.caption || '').substring(0, 40) + ((bestPost.hook_text || bestPost.caption || '').length > 40 ? '…' : '')
    : '—'
  const bestPostReach = bestPost ? bestPost.metrics.reach.toLocaleString() : null

  const fmt = (n: number | null | undefined) => {
    if (n == null) return '—'
    return n >= 0 ? `+${n.toLocaleString()}` : n.toLocaleString()
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <KpiTile
        label="Followers"
        value={followers.toLocaleString()}
        sub={change7d != null ? `${fmt(change7d)} this week` : undefined}
        highlight
      />
      <KpiTile
        label="30d Change"
        value={fmt(change30d)}
        sub="follower growth"
      />
      <KpiTile
        label="Total Posts"
        value={totalPosts}
        sub="published"
      />
      <KpiTile
        label="Avg Reach"
        value={avgReach > 0 ? avgReach.toLocaleString() : '—'}
        sub="per post"
      />
      <KpiTile
        label="Avg Engagement"
        value={`${avgEngRate}%`}
        sub="engagement rate"
      />
      <KpiTile
        label="Best This Week"
        value={bestPost ? `${Number(bestPostReach?.replace(/,/g, '')).toLocaleString()} reach` : '—'}
        sub={bestPost ? bestPostTitle : 'no posts this week'}
      />
    </div>
  )
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children, className = '' }: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`bg-bg-card rounded-2xl border border-border overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-border/50">
        <h2 className="text-xs text-gray-500 uppercase tracking-widest font-medium">{title}</h2>
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  )
}

// ─── Account header bar ───────────────────────────────────────────────────────

function AccountHeader({ account, connected, lastUpdated, backfillDone, onBackfill }: {
  account: any
  connected: boolean
  lastUpdated: string | null
  backfillDone: boolean
  onBackfill: () => void
}) {
  const followersNow = account?.followers_count || 0
  // 24h delta isn't tracked precisely yet — show placeholder
  const formattedUpdated = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '—'

  return (
    <div className="bg-bg-card rounded-2xl border border-border px-5 py-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          {/* Connection status */}
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-working' : 'bg-blocked'}`} />
            <span className={`text-xs ${connected ? 'text-working' : 'text-blocked'}`}>
              {connected ? 'Live' : 'Disconnected'}
            </span>
          </div>

          {/* Account info */}
          <div className="flex items-center gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-200">@josieandthe_ai</div>
              <div className="text-xs text-gray-500">Instagram</div>
            </div>
          </div>

          {/* Metrics */}
          <div className="flex items-center gap-6">
            <div>
              <div className="text-lg font-semibold text-gray-100">{followersNow.toLocaleString()}</div>
              <div className="text-xs text-gray-500">followers</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-100">{account?.media_count || '—'}</div>
              <div className="text-xs text-gray-500">posts</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Backfill status */}
          {!backfillDone && (
            <span className="text-xs text-reed animate-pulse">Syncing posts...</span>
          )}

          <div className="text-xs text-gray-600">Updated {formattedUpdated}</div>

          <button
            onClick={onBackfill}
            className="px-3 py-1.5 text-xs rounded-lg bg-bg-dark border border-border text-gray-400 hover:text-gray-200 hover:border-fern/30 transition-colors"
          >
            Force sync
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AnalyticsPageProps {
  onBack: () => void
}

export function AnalyticsPage({ onBack }: AnalyticsPageProps) {
  const { data, loading, error, connected, updatePostCategory, triggerBackfill } = useAnalyticsData()

  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSection, setActiveSection] = useState<string | null>(null)

  const dateRange = useMemo(() => getDateRange(datePreset), [datePreset])

  // Filter posts by date range + category (for global category filter)
  const filteredPosts = useMemo(() => {
    if (!data?.posts) return []
    return data.posts.filter(p => {
      if (categoryFilter && p.category !== categoryFilter) return false
      if (dateRange.start && p.published_at && new Date(p.published_at) < dateRange.start) return false
      if (dateRange.end && p.published_at && new Date(p.published_at) > dateRange.end) return false
      return true
    })
  }, [data?.posts, categoryFilter, dateRange])

  if (loading) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <button onClick={onBack} className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1.5">
            ← Back
          </button>
          <span className="text-xs text-gray-500 uppercase tracking-widest">Content Analytics</span>
          <div />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="text-gray-400 text-sm">Loading analytics...</div>
            <div className="text-xs text-gray-600">Connecting to analytics service on port 4982</div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <button onClick={onBack} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">← Back</button>
          <span className="text-xs text-gray-500 uppercase tracking-widest">Content Analytics</span>
          <div />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3 max-w-md px-6">
            <div className="text-blocked text-sm">Analytics service unavailable</div>
            <div className="text-xs text-gray-600">{error}</div>
            <div className="text-xs text-gray-500">
              Start the analytics poller: <code className="bg-bg-dark px-2 py-0.5 rounded text-fern">cd ~/mission-control/analytics-poller && npm start</code>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Page header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
        <button onClick={onBack} className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1.5">
          ← Dashboard
        </button>
        <span className="text-xs text-gray-500 uppercase tracking-widest">Content Analytics</span>
        <div className="flex items-center gap-2">
          {/* Date range filter */}
          <div className="flex items-center gap-1">
            {DATE_PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => setDatePreset(p.key)}
                className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                  datePreset === p.key
                    ? 'bg-fern/15 text-fern border-fern/30'
                    : 'bg-bg-dark text-gray-400 border-border hover:text-gray-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto feed-scroll">
        <div className="p-5 space-y-5 max-w-[1400px]">

          {/* Section 0: Summary KPI tiles */}
          {data && <SummaryTiles data={data} />}

          {/* Section 1: Account header */}
          <AccountHeader
            account={data?.account}
            connected={connected}
            lastUpdated={data?.lastUpdated || null}
            backfillDone={data?.backfillDone || false}
            onBackfill={triggerBackfill}
          />

          {/* Global category filter chips */}
          {data && data.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-gray-600">Filter:</span>
              <button
                onClick={() => setCategoryFilter(null)}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  !categoryFilter ? 'bg-fern/15 text-fern border-fern/30' : 'bg-bg-dark text-gray-500 border-border hover:text-gray-400'
                }`}
              >
                All categories
              </button>
              {data.categories.map(c => (
                <button
                  key={c.category}
                  onClick={() => setCategoryFilter(categoryFilter === c.category ? null : c.category)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    categoryFilter === c.category
                      ? 'bg-bg-card text-gray-200 border-fern/40'
                      : 'bg-bg-dark text-gray-500 border-border hover:text-gray-400'
                  }`}
                >
                  {c.category} ({c.post_count})
                </button>
              ))}
            </div>
          )}

          {/* Section 2: Follower Trend + Forecast side by side */}
          {data && (
            <div className="grid grid-cols-2 gap-4">
              <Section title="Follower Trends" className="min-w-0">
                <FollowerChart
                  snapshots={data.followerSnapshots}
                  stats={data.followerStats}
                  posts={data.posts}
                  compact
                />
              </Section>
              <Section title="Follower Forecast" className="min-w-0">
                <FollowerForecast
                  forecast={data.forecast}
                  snapshots={data.followerSnapshots}
                  currentFollowers={data.followerStats.current}
                />
              </Section>
            </div>
          )}

          {/* Section 3: Recent content performance */}
          <Section title="Recent Content Performance">
            {/* Search bar */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full max-w-xs bg-bg-dark border border-border rounded-lg px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-fern/50"
              />
            </div>
            {data && (
              <PostsTable
                posts={filteredPosts}
                dateFilter={dateRange}
                categoryFilter={null} // already filtered above
                searchQuery={searchQuery}
                onUpdateCategory={updatePostCategory}
              />
            )}
          </Section>

          {/* Section 4: Category breakdown */}
          <Section title="Category Performance">
            {data && (
              <CategoryCards
                categories={data.categories}
                onSelectCategory={setCategoryFilter}
                selectedCategory={categoryFilter}
              />
            )}
          </Section>

          {/* Section 5: Hook analysis */}
          <Section title="Hook Analysis">
            {data && (
              <HookAnalysis
                posts={filteredPosts}
                hookStats={data.hookStats}
                dateFilter={dateRange}
              />
            )}
          </Section>

          {/* Debug info at bottom */}
          {data?.lastError && (
            <div className="text-xs text-blocked/70 text-center py-2">
              Last poll error: {data.lastError}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
