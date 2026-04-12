import { useState, useEffect, useRef, useCallback } from 'react'

const API_BASE = '/api'
const POLL_INTERVAL_MS = 5_000
const MAX_LINES = 80

type LogLine = {
  id: number
  text: string
  ts: number
}

type LogFile = {
  id: string
  exists: boolean
  lastModified: string | null
}

const LOG_OPTIONS = [
  { id: 'sentinel-context-collection', label: 'Sentinel' },
  { id: 'scout-daily-brief', label: 'Scout Brief' },
  { id: 'reed-weekly-content', label: 'Reed' },
  { id: 'sentinel-nightly-security-scan', label: 'Security' },
  { id: 'notion-kanban-sync', label: 'Notion Sync' },
  { id: 'fern-session', label: 'Fern Session' },
]

/** Classify a log line for colorization */
function classifyLine(text: string): 'prompt' | 'success' | 'error' | 'warn' | 'dim' | 'normal' {
  const lower = text.toLowerCase()
  if (text.startsWith('===') || text.startsWith('---')) return 'dim'
  if (lower.includes('error') || lower.includes('fail') || lower.includes('exception')) return 'error'
  if (lower.includes('warn') || lower.includes('missing')) return 'warn'
  if (lower.includes('done') || lower.includes('success') || lower.includes('exit 0') || lower.includes('completed') || lower.includes('finished')) return 'success'
  if (text.startsWith('[') && text.includes(']')) return 'prompt'
  if (text.startsWith('#') || text.startsWith('**')) return 'prompt'
  return 'normal'
}

const LINE_COLORS = {
  prompt: 'text-fern',
  success: 'text-working',
  error: 'text-blocked',
  warn: 'text-reed',
  dim: 'text-gray-600',
  normal: 'text-gray-400',
}

export function FernTerminal() {
  const [lines, setLines] = useState<LogLine[]>([])
  const [selectedLog, setSelectedLog] = useState<string>('sentinel-context-collection')
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lineCounter = useRef(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const lastLineCount = useRef(0)

  const addLines = useCallback((newLines: string[]) => {
    if (newLines.length === 0) return
    setLines(prev => {
      const incoming = newLines.map(text => ({
        id: lineCounter.current++,
        text,
        ts: Date.now(),
      }))
      const combined = [...prev, ...incoming]
      return combined.slice(-MAX_LINES)
    })
  }, [])

  const fetchTail = useCallback(async (logId: string, reset = false) => {
    try {
      const res = await fetch(`${API_BASE}/logs/tail?file=${encodeURIComponent(logId)}&lines=50`)
      if (!res.ok) {
        setError(`Failed to load ${logId}`)
        setConnected(false)
        return
      }
      const data: { file: string; lines: string[]; count: number } = await res.json()
      setConnected(true)
      setError(null)

      if (reset) {
        lineCounter.current = 0
        lastLineCount.current = 0
        setLines([])
      }

      if (data.lines.length > lastLineCount.current || reset) {
        const newLines = reset ? data.lines : data.lines.slice(lastLineCount.current)
        lastLineCount.current = data.lines.length
        addLines(newLines)
      }
    } catch {
      setError('Cannot reach agents-observe server')
      setConnected(false)
    }
  }, [addLines])

  // Load initial lines when log selection changes
  useEffect(() => {
    clearInterval(pollRef.current)
    lastLineCount.current = 0
    fetchTail(selectedLog, true)

    // Poll for new lines
    pollRef.current = setInterval(() => {
      fetchTail(selectedLog)
    }, POLL_INTERVAL_MS)

    return () => clearInterval(pollRef.current)
  }, [selectedLog, fetchTail])

  // Auto-scroll to bottom when new lines arrive
  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [lines])

  const selectedLabel = LOG_OPTIONS.find(o => o.id === selectedLog)?.label || selectedLog

  return (
    <div className="h-full flex flex-col bg-bg-dark rounded-2xl border border-border overflow-hidden">
      {/* Title bar */}
      <div className="px-4 py-2.5 border-b border-border/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blocked/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-reed/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-working/60" />
          </div>
          <h3 className="text-xs text-gray-500 uppercase tracking-widest font-medium ml-1">
            {selectedLabel} Log
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-working' : 'bg-gray-600'}`}
          />
          {/* Log selector */}
          <select
            value={selectedLog}
            onChange={e => setSelectedLog(e.target.value)}
            className="text-[0.6rem] bg-bg-dark border border-border/60 text-gray-400 rounded px-1 py-0.5 cursor-pointer hover:border-fern/30 transition-colors"
          >
            {LOG_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Log content */}
      <div
        ref={scrollRef}
        className="flex-1 p-3 font-mono text-[0.62rem] leading-relaxed overflow-y-auto feed-scroll"
      >
        {error ? (
          <div className="text-blocked/70 italic text-center py-4">{error}</div>
        ) : lines.length === 0 ? (
          <div className="text-gray-600 italic text-center py-4">Loading {selectedLabel} log...</div>
        ) : (
          lines.map(line => {
            const cls = classifyLine(line.text)
            return (
              <div key={line.id} className={`${LINE_COLORS[cls]} leading-relaxed break-words`}>
                {cls === 'prompt' ? (
                  <span>
                    <span className="text-fern opacity-50 mr-1">▸</span>
                    {line.text}
                  </span>
                ) : (
                  line.text
                )}
              </div>
            )
          })
        )}
        {/* Blinking cursor */}
        <div className="mt-1 flex items-center">
          <span className="text-fern opacity-50 mr-1">▸</span>
          <span className="w-1.5 h-3 bg-fern/50 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
