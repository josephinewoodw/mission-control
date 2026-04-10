// components/analytics/PostsTable.tsx
// Recent content performance table — sortable, expandable rows, inline category editing.

import { useState } from 'react'
import type { Post } from '../../hooks/useAnalyticsData'

const CATEGORIES = ['Warning', 'Educational', 'Current Events', 'Opinion', 'Other', 'Uncategorized']

const CATEGORY_COLORS: Record<string, string> = {
  'Warning': 'bg-red-500/20 text-red-300 border-red-500/30',
  'Educational': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'Current Events': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'Opinion': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'Other': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  'Uncategorized': 'bg-gray-600/20 text-gray-500 border-gray-600/30',
}

const MEDIA_TYPE_COLORS: Record<string, string> = {
  'VIDEO': 'bg-fern/20 text-fern border-fern/30',
  'IMAGE': 'bg-scout/20 text-scout border-scout/30',
  'CAROUSEL_ALBUM': 'bg-reed/20 text-reed border-reed/30',
}

type SortKey = 'published_at' | 'reach' | 'engagement_rate' | 'likes' | 'comments' | 'shares' | 'saves'
type SortDir = 'asc' | 'desc'

function performanceTier(reach: number, er: number): { label: string; color: string } {
  if (reach >= 1000 && er >= 6) return { label: 'Strong', color: 'text-fern' }
  if (reach >= 300) return { label: 'Average', color: 'text-reed' }
  return { label: 'Weak', color: 'text-gray-500' }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null
  const diff = Date.now() - new Date(iso).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function formatWatchTime(ms: number | null): string {
  if (ms === null || ms === 0) return '—'
  const secs = Math.round(ms / 1000)
  return `${secs}s`
}

interface PostsTableProps {
  posts: Post[]
  dateFilter?: { start: Date | null; end: Date | null }
  categoryFilter?: string | null
  searchQuery?: string
  onUpdateCategory: (postId: string, category: string) => Promise<boolean>
}

export function PostsTable({
  posts,
  dateFilter,
  categoryFilter,
  searchQuery,
  onUpdateCategory,
}: PostsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('published_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [editingCategory, setEditingCategory] = useState<string | null>(null)

  // Filter
  let filtered = [...posts]

  if (categoryFilter) {
    filtered = filtered.filter(p => p.category === categoryFilter)
  }

  if (dateFilter?.start || dateFilter?.end) {
    filtered = filtered.filter(p => {
      if (!p.published_at) return false
      const d = new Date(p.published_at)
      if (dateFilter.start && d < dateFilter.start) return false
      if (dateFilter.end && d > dateFilter.end) return false
      return true
    })
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase()
    filtered = filtered.filter(p =>
      p.caption?.toLowerCase().includes(q) ||
      p.hook_text?.toLowerCase().includes(q)
    )
  }

  // Sort
  filtered.sort((a, b) => {
    let aVal: number | string, bVal: number | string
    switch (sortKey) {
      case 'published_at':
        aVal = a.published_at || ''
        bVal = b.published_at || ''
        break
      case 'reach': aVal = a.metrics.reach; bVal = b.metrics.reach; break
      case 'engagement_rate': aVal = a.metrics.engagement_rate; bVal = b.metrics.engagement_rate; break
      case 'likes': aVal = a.metrics.likes; bVal = b.metrics.likes; break
      case 'comments': aVal = a.metrics.comments; bVal = b.metrics.comments; break
      case 'shares': aVal = a.metrics.shares; bVal = b.metrics.shares; break
      case 'saves': aVal = a.metrics.saves; bVal = b.metrics.saves; break
      default: aVal = a.published_at || ''; bVal = b.published_at || ''
    }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  function toggleExpand(id: string) {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleCategoryChange(postId: string, category: string) {
    await onUpdateCategory(postId, category)
    setEditingCategory(null)
  }

  function SortHeader({ label, sortK }: { label: string; sortK: SortKey }) {
    const active = sortKey === sortK
    return (
      <th
        className="px-3 py-2 text-left text-xs text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-300 select-none whitespace-nowrap"
        onClick={() => handleSort(sortK)}
      >
        {label}
        {active && <span className="ml-1 text-fern">{sortDir === 'desc' ? '↓' : '↑'}</span>}
      </th>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase tracking-wider w-8"></th>
            <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase tracking-wider">Hook / Title</th>
            <SortHeader label="Date" sortK="published_at" />
            <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase tracking-wider">Type</th>
            <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase tracking-wider">Category</th>
            <SortHeader label="Reach" sortK="reach" />
            <SortHeader label="ER%" sortK="engagement_rate" />
            <SortHeader label="Likes" sortK="likes" />
            <SortHeader label="Comments" sortK="comments" />
            <SortHeader label="Shares" sortK="shares" />
            <SortHeader label="Saves" sortK="saves" />
            <th className="px-3 py-2 text-left text-xs text-gray-500 uppercase tracking-wider">Age</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {filtered.map(post => {
            const isExpanded = expandedRows.has(post.id)
            const tier = performanceTier(post.metrics.reach, post.metrics.engagement_rate)
            const age = daysSince(post.published_at)
            const catColor = CATEGORY_COLORS[post.category] || CATEGORY_COLORS['Uncategorized']
            const mediaColor = MEDIA_TYPE_COLORS[post.media_type || ''] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'

            return (
              <>
                <tr
                  key={post.id}
                  className="hover:bg-bg-dark/50 cursor-pointer transition-colors"
                  onClick={() => toggleExpand(post.id)}
                >
                  {/* Expand icon */}
                  <td className="px-3 py-2 text-gray-600 text-xs">
                    {isExpanded ? '▼' : '▶'}
                  </td>

                  {/* Hook / title */}
                  <td className="px-3 py-2 max-w-[260px]">
                    <div className="flex items-start gap-2">
                      {post.thumbnail_url && (
                        <img
                          src={post.thumbnail_url}
                          alt=""
                          className="w-8 h-8 rounded object-cover shrink-0"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      )}
                      <span className="text-gray-200 text-xs line-clamp-2 leading-relaxed">
                        {post.hook_text || post.caption?.substring(0, 80) || '(no caption)'}
                      </span>
                    </div>
                  </td>

                  {/* Date */}
                  <td className="px-3 py-2 text-gray-400 text-xs whitespace-nowrap">
                    {formatDate(post.published_at)}
                  </td>

                  {/* Type badge */}
                  <td className="px-3 py-2">
                    <span className={`inline-block px-1.5 py-0.5 text-[0.6rem] font-medium rounded border ${mediaColor}`}>
                      {post.media_type === 'CAROUSEL_ALBUM' ? 'CAROUSEL' : post.media_type || '?'}
                    </span>
                  </td>

                  {/* Category — click to edit */}
                  <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                    {editingCategory === post.id ? (
                      <select
                        className="text-xs bg-bg-dark border border-border rounded px-1 py-0.5 text-gray-200 focus:outline-none focus:border-fern/50"
                        defaultValue={post.category}
                        autoFocus
                        onBlur={() => setEditingCategory(null)}
                        onChange={e => handleCategoryChange(post.id, e.target.value)}
                        onClick={e => e.stopPropagation()}
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <button
                        className={`inline-block px-1.5 py-0.5 text-[0.6rem] font-medium rounded border hover:opacity-80 transition-opacity ${catColor}`}
                        onClick={e => { e.stopPropagation(); setEditingCategory(post.id) }}
                        title="Click to change category"
                      >
                        {post.category}
                      </button>
                    )}
                  </td>

                  {/* Metrics */}
                  <td className="px-3 py-2 text-right text-xs font-mono text-gray-200">{post.metrics.reach.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-xs font-mono">
                    <span className={post.metrics.engagement_rate >= 6 ? 'text-fern' : post.metrics.engagement_rate >= 3 ? 'text-reed' : 'text-gray-500'}>
                      {post.metrics.engagement_rate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-mono text-gray-400">{post.metrics.likes}</td>
                  <td className="px-3 py-2 text-right text-xs font-mono text-gray-400">{post.metrics.comments}</td>
                  <td className="px-3 py-2 text-right text-xs font-mono text-gray-400">{post.metrics.shares}</td>
                  <td className="px-3 py-2 text-right text-xs font-mono text-gray-400">{post.metrics.saves}</td>
                  <td className="px-3 py-2 text-right text-xs text-gray-500">{age !== null ? `${age}d` : '—'}</td>
                </tr>

                {/* Expanded row */}
                {isExpanded && (
                  <tr key={`${post.id}-expanded`} className="bg-bg-dark/80">
                    <td colSpan={12} className="px-6 py-4">
                      <div className="grid grid-cols-[1fr_auto] gap-6">
                        <div className="space-y-3">
                          {/* Performance tier */}
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-semibold ${tier.color}`}>{tier.label} Performer</span>
                            <span className="text-xs text-gray-500">
                              {post.metrics.total_interactions} total interactions
                            </span>
                            {post.permalink && (
                              <a
                                href={post.permalink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-fern hover:underline"
                                onClick={e => e.stopPropagation()}
                              >
                                View on Instagram ↗
                              </a>
                            )}
                          </div>

                          {/* Hook text */}
                          {post.hook_text && (
                            <div>
                              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Hook</div>
                              <div className="text-sm text-gray-200 italic">"{post.hook_text}"</div>
                              {post.hook_type && (
                                <span className="text-xs text-gray-500 mt-1 block">Type: {post.hook_type}</span>
                              )}
                            </div>
                          )}

                          {/* Full caption */}
                          <div>
                            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Full Caption</div>
                            <div className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                              {post.caption || '(no caption)'}
                            </div>
                          </div>
                        </div>

                        {/* Watch time (Reels only) */}
                        {(post.metrics.avg_watch_time_ms !== null || post.metrics.total_watch_time_ms !== null) && (
                          <div className="shrink-0 space-y-2 min-w-[140px]">
                            <div className="text-xs text-gray-500 uppercase tracking-wider">Watch Time</div>
                            <div className="space-y-1">
                              <div className="flex justify-between gap-4 text-xs">
                                <span className="text-gray-500">Avg:</span>
                                <span className="text-gray-200 font-mono">{formatWatchTime(post.metrics.avg_watch_time_ms)}</span>
                              </div>
                              <div className="flex justify-between gap-4 text-xs">
                                <span className="text-gray-500">Total:</span>
                                <span className="text-gray-200 font-mono">
                                  {post.metrics.total_watch_time_ms
                                    ? `${Math.round(post.metrics.total_watch_time_ms / 60000)}min`
                                    : '—'}
                                </span>
                              </div>
                              {post.metrics.plays > 0 && (
                                <div className="flex justify-between gap-4 text-xs">
                                  <span className="text-gray-500">Plays:</span>
                                  <span className="text-gray-200 font-mono">{post.metrics.plays.toLocaleString()}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            )
          })}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={12} className="px-6 py-8 text-center text-gray-500 text-sm">
                No posts match the current filters
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
