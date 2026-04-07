import { AGENTS } from '../data/agents'
import type { MCEvent } from '../types'

interface ActivityFeedProps {
  events: MCEvent[]
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function eventIcon(_type: string, subtype: string | null): string {
  if (subtype === 'SessionStart' || subtype === 'SubagentStart') return '\u25B6'
  if (subtype === 'SessionEnd' || subtype === 'SubagentStop') return '\u25A0'
  if (subtype === 'PermissionRequest') return '\u26A0'
  if (subtype === 'PostToolUse') return '\u2713'
  if (subtype === 'PreToolUse') return '\u2192'
  if (subtype === 'UserPromptSubmit') return '\u2709'
  if (subtype === 'Stop') return '\u23F8'
  return '\u00B7'
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  return (
    <div className="h-full flex flex-col">
      <h2 className="text-xs text-gray-500 uppercase tracking-widest mb-3 font-medium">
        Activity Feed
      </h2>

      <div className="feed-scroll flex-1 overflow-y-auto rounded-xl bg-bg-card border border-border">
        {events.length === 0 ? (
          <div className="text-xs text-gray-600 italic p-4 text-center">
            No activity yet
          </div>
        ) : (
          <ul className="divide-y divide-border/50">
            {events.map((event, i) => {
              const agent = AGENTS[event.agent]
              return (
                <li
                  key={event.id}
                  className={`
                    flex items-center gap-2 px-3 py-2 text-xs
                    ${i === 0 ? 'animate-fade-in-up' : ''}
                    ${event.subtype === 'PermissionRequest' ? 'bg-blocked/10 border-l-2 border-blocked' : ''}
                    hover:bg-bg-dark/50 transition-colors
                  `}
                >
                  <span className="text-gray-600 font-mono w-12 shrink-0">
                    {formatTime(event.timestamp)}
                  </span>
                  <span className={`w-4 text-center shrink-0 ${event.subtype === 'PermissionRequest' ? 'text-blocked' : 'text-gray-600'}`}>
                    {eventIcon(event.type, event.subtype)}
                  </span>
                  <span
                    className="font-semibold w-16 shrink-0"
                    style={{ color: agent?.color || '#888' }}
                  >
                    {agent?.displayName || event.agent}
                  </span>
                  <span className="text-gray-400 truncate">
                    {event.summary}
                  </span>
                  {event.toolName && (
                    <span className="ml-auto text-gray-600 font-mono text-[0.65rem] shrink-0">
                      {event.toolName}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
