import { useEffect, useRef, useState } from 'react'
import type { AgentState } from '../types'

interface SolarpunkSceneProps {
  agents: Record<string, AgentState>
}

/** True if any agent is actively working */
function anyAgentWorking(agents: Record<string, AgentState>): boolean {
  return Object.values(agents).some(a => a.status === 'working')
}

/** How many agents are working */
function workingCount(agents: Record<string, AgentState>): number {
  return Object.values(agents).filter(a => a.status === 'working').length
}

/** Compute day/night tint overlay based on current hour (local time) */
function getDayNightStyle(hour: number): React.CSSProperties {
  // Dawn: 5-7, Day: 7-18, Dusk: 18-20, Night: 20-5
  if (hour >= 7 && hour < 18) {
    // Full daylight — no overlay
    return {}
  } else if (hour >= 5 && hour < 7) {
    // Dawn — warm amber tint
    const t = (hour - 5) / 2 // 0→1
    return { backgroundColor: `rgba(255, 160, 60, ${0.25 * (1 - t)})` }
  } else if (hour >= 18 && hour < 20) {
    // Dusk — warm orange/red
    const t = (hour - 18) / 2 // 0→1
    return { backgroundColor: `rgba(200, 80, 30, ${0.15 + t * 0.25})` }
  } else {
    // Night — deep blue/indigo
    return { backgroundColor: 'rgba(20, 30, 80, 0.55)' }
  }
}

/**
 * Solarpunk Office Scene — animated layered illustration with live agent integration.
 *
 * Layer stack (bottom to top, multiply blend):
 *   1. sky-clouds  — animated cloud drift
 *   2. background  — building structure
 *   3. floor       — ground plane
 *   4. monitors    — ON/OFF based on agent working status
 *   5. tree        — swaying tree
 *   6. left-awnings, right-awnings — swaying awnings
 *   7. day/night overlay
 *   8. status bar overlay
 */
export function SolarpunkScene({ agents }: SolarpunkSceneProps) {
  const [hour, setHour] = useState(new Date().getHours())
  const sceneRef = useRef<HTMLDivElement>(null)

  // Update hour every minute for day/night cycle
  useEffect(() => {
    const id = setInterval(() => setHour(new Date().getHours()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Scale scene to fit container
  useEffect(() => {
    const el = sceneRef.current
    if (!el) return
    const parent = el.parentElement
    if (!parent) return

    function scale() {
      if (!el || !parent) return
      const pw = parent.clientWidth
      const ph = parent.clientHeight
      const s = Math.min(pw / 1456, ph / 816)
      el.style.transform = `scale(${s})`
    }

    scale()
    const ro = new ResizeObserver(scale)
    ro.observe(parent)
    return () => ro.disconnect()
  }, [])

  const monitorsOn = anyAgentWorking(agents)
  const working = workingCount(agents)
  const nightStyle = getDayNightStyle(hour)
  const isNight = hour < 5 || hour >= 20
  const isDusk = (hour >= 18 && hour < 20)

  // Build agent status labels for the overlay
  const agentEntries = Object.entries(agents)
    .filter(([, a]) => a.status !== 'offline')
    .slice(0, 6)

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: isNight ? '#0a1020' : isDusk ? '#1a0a05' : '#0a0a0a',
      }}
    >
      {/* Scene container — 1456x816 native, CSS-scaled */}
      <div
        ref={sceneRef}
        style={{
          position: 'relative',
          width: 1456,
          height: 816,
          transformOrigin: 'center center',
          background: '#ffffff',
          flexShrink: 0,
        }}
      >
        {/* Layer 1: Sky and clouds — animated horizontal drift */}
        <img
          src="/solarpunk/sky-clouds.png"
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            zIndex: 1,
            mixBlendMode: 'normal',
            animation: 'spCloudDrift 45s linear infinite',
          }}
        />

        {/* Layer 2: Background structure */}
        <img
          src="/solarpunk/background.png"
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            zIndex: 2,
            mixBlendMode: 'multiply',
          }}
        />

        {/* Layer 3: Floor */}
        <img
          src="/solarpunk/floor.png"
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            zIndex: 3,
            mixBlendMode: 'multiply',
          }}
        />

        {/* Layer 4: Monitors — ON when agents working, OFF otherwise */}
        <img
          src={monitorsOn ? '/solarpunk/monitors-on.png' : '/solarpunk/monitors-off.png'}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            zIndex: 4,
            mixBlendMode: 'multiply',
            transition: 'opacity 1.5s ease',
            opacity: 1,
          }}
        />

        {/* Monitor glow effect when working — subtle teal/blue bloom */}
        {monitorsOn && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 5,
              pointerEvents: 'none',
              background: 'radial-gradient(ellipse 60% 20% at 50% 68%, rgba(60, 180, 200, 0.08) 0%, transparent 100%)',
              animation: 'spMonitorGlow 3s ease-in-out infinite',
            }}
          />
        )}

        {/* Layer 5: Tree — swaying */}
        <img
          src="/solarpunk/tree.png"
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            zIndex: 6,
            mixBlendMode: 'multiply',
            transformOrigin: '50% 88%',
            animation: 'spTreeSway 9s ease-in-out infinite',
          }}
        />

        {/* Layer 6: Left awnings */}
        <img
          src="/solarpunk/left-awnings.png"
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            zIndex: 7,
            mixBlendMode: 'multiply',
            transformOrigin: '8% 20%',
            animation: 'spAwningLeft 6.5s ease-in-out infinite',
          }}
        />

        {/* Layer 7: Right awnings */}
        <img
          src="/solarpunk/right-awnings.png"
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            zIndex: 8,
            mixBlendMode: 'multiply',
            transformOrigin: '92% 20%',
            animation: 'spAwningRight 7.2s ease-in-out infinite',
            animationDelay: '-2.8s',
          }}
        />

        {/* Day/night tint overlay */}
        {Object.keys(nightStyle).length > 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 9,
              pointerEvents: 'none',
              ...nightStyle,
            }}
          />
        )}

        {/* Agent status overlay — bottom left corner */}
        {agentEntries.length > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: 24,
              left: 24,
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {agentEntries.map(([name, agent]) => {
              const color =
                agent.status === 'working' ? '#4a9e4a' :
                agent.status === 'blocked' ? '#e74c3c' :
                '#888'
              return (
                <div
                  key={name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(4px)',
                    borderRadius: 6,
                    padding: '3px 8px',
                    border: `1px solid ${color}40`,
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: color,
                      boxShadow: agent.status === 'working' ? `0 0 6px ${color}` : 'none',
                    }}
                  />
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#ddd', textTransform: 'capitalize' }}>
                    {name}
                  </span>
                  {agent.status === 'working' && (
                    <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#888', maxWidth: 120, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {agent.highLevelTask?.slice(0, 18) || 'working'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Working count badge — top right */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            zIndex: 10,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            borderRadius: 8,
            padding: '4px 12px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: working > 0 ? '#4a9e4a' : '#888', letterSpacing: '0.1em' }}>
            {working > 0 ? `${working} AGENT${working > 1 ? 'S' : ''} ACTIVE` : 'STANDBY'}
          </span>
        </div>

        {/* MISSION CONTROL watermark */}
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            zIndex: 10,
          }}
        >
          <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em' }}>
            MISSION CONTROL
          </span>
        </div>
      </div>

      {/* CSS animations via style tag */}
      <style>{`
        @keyframes spCloudDrift {
          0%, 100% { transform: translateX(0px); }
          50% { transform: translateX(-22px); }
        }
        @keyframes spTreeSway {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(0.6deg); }
          75% { transform: rotate(-0.5deg); }
        }
        @keyframes spAwningLeft {
          0%, 100% { transform: rotate(0deg); }
          30% { transform: rotate(0.4deg); }
          70% { transform: rotate(-0.35deg); }
        }
        @keyframes spAwningRight {
          0%, 100% { transform: rotate(0deg); }
          35% { transform: rotate(-0.4deg); }
          65% { transform: rotate(0.3deg); }
        }
        @keyframes spMonitorGlow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
