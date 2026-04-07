import { useState, useEffect, useRef } from 'react'
import type { AnimDef } from '../components/LpcSprite'
import { ANIMS } from '../components/LpcSprite'
import type { AgentName } from '../types'

/**
 * An idle activity defines what the agent is doing, what animation to play,
 * and an optional position offset from their home desk.
 */
interface IdleActivity {
  id: string
  anim: AnimDef
  offsetX: number
  offsetY: number
  duration: number // ms to spend on this activity
  overlay?: 'zzz' | 'coffee' | null
  transition?: number // ms for CSS transition to this position
}

/** Each agent gets a slightly different activity rotation for variety */
// Break room is at roughly center-right of the scene (x~320, y~200 from scene origin).
// Offsets are relative to each agent's home desk position.
// Fern home: (70,116), Scout: (450,116), Reed: (70,264), Sentinel: (450,264)

const ACTIVITY_POOLS: Record<AgentName, IdleActivity[]> = {
  fern: [
    { id: 'sitting', anim: ANIMS.idle, offsetX: 0, offsetY: 8, duration: 25000 },
    { id: 'sleeping', anim: ANIMS.static, offsetX: 0, offsetY: 8, duration: 20000, overlay: 'zzz' },
    { id: 'sitting2', anim: ANIMS.idle, offsetX: 0, offsetY: 8, duration: 30000 },
    { id: 'stretching', anim: ANIMS.emote, offsetX: 0, offsetY: 0, duration: 6000, transition: 400 },
    { id: 'sitting3', anim: ANIMS.idle, offsetX: 0, offsetY: 8, duration: 20000 },
    { id: 'walk-to-kitchen', anim: ANIMS.walk, offsetX: 230, offsetY: 84, duration: 4000, transition: 4000 },
    { id: 'at-kitchen', anim: ANIMS.idle, offsetX: 230, offsetY: 84, duration: 8000, overlay: 'coffee' },
    { id: 'walk-back', anim: ANIMS.walk, offsetX: 0, offsetY: 0, duration: 4000, transition: 4000 },
  ],
  scout: [
    { id: 'sitting', anim: ANIMS.idle, offsetX: 0, offsetY: 8, duration: 20000 },
    { id: 'stretching', anim: ANIMS.emote, offsetX: 0, offsetY: 0, duration: 6000, transition: 400 },
    { id: 'sitting2', anim: ANIMS.idle, offsetX: 0, offsetY: 8, duration: 30000 },
    { id: 'sleeping', anim: ANIMS.static, offsetX: 0, offsetY: 8, duration: 18000, overlay: 'zzz' },
    { id: 'sitting3', anim: ANIMS.idle, offsetX: 0, offsetY: 8, duration: 25000 },
    { id: 'walk-to-kitchen', anim: ANIMS.walk, offsetX: -150, offsetY: 84, duration: 4000, transition: 4000 },
    { id: 'at-kitchen', anim: ANIMS.idle, offsetX: -150, offsetY: 84, duration: 7000, overlay: 'coffee' },
    { id: 'walk-back', anim: ANIMS.walk, offsetX: 0, offsetY: 0, duration: 4000, transition: 4000 },
  ],
  reed: [
    { id: 'sitting', anim: ANIMS.idle, offsetX: 0, offsetY: 8, duration: 22000 },
    { id: 'sleeping', anim: ANIMS.static, offsetX: 0, offsetY: 8, duration: 25000, overlay: 'zzz' },
    { id: 'stretching', anim: ANIMS.emote, offsetX: 0, offsetY: 0, duration: 5000, transition: 400 },
    { id: 'sitting2', anim: ANIMS.idle, offsetX: 0, offsetY: 8, duration: 28000 },
    { id: 'walk-to-kitchen', anim: ANIMS.walk, offsetX: 230, offsetY: -64, duration: 4000, transition: 4000 },
    { id: 'at-kitchen', anim: ANIMS.idle, offsetX: 230, offsetY: -64, duration: 9000, overlay: 'coffee' },
    { id: 'walk-back', anim: ANIMS.walk, offsetX: 0, offsetY: 0, duration: 4000, transition: 4000 },
  ],
  sentinel: [
    { id: 'sitting', anim: ANIMS.idle, offsetX: 0, offsetY: 8, duration: 35000 },
    { id: 'sitting2', anim: ANIMS.idle, offsetX: 0, offsetY: 8, duration: 30000 },
    { id: 'stretching', anim: ANIMS.emote, offsetX: 0, offsetY: 0, duration: 5000, transition: 400 },
    { id: 'sitting3', anim: ANIMS.idle, offsetX: 0, offsetY: 8, duration: 28000 },
    { id: 'sleeping', anim: ANIMS.static, offsetX: 0, offsetY: 8, duration: 15000, overlay: 'zzz' },
    { id: 'walk-to-kitchen', anim: ANIMS.walk, offsetX: -150, offsetY: -64, duration: 4000, transition: 4000 },
    { id: 'at-kitchen', anim: ANIMS.idle, offsetX: -150, offsetY: -64, duration: 6000, overlay: 'coffee' },
    { id: 'walk-back', anim: ANIMS.walk, offsetX: 0, offsetY: 0, duration: 4000, transition: 4000 },
  ],
  timber: [
    { id: 'sitting', anim: ANIMS.idle, offsetX: 0, offsetY: 8, duration: 22000 },
    { id: 'stretching', anim: ANIMS.emote, offsetX: 0, offsetY: 0, duration: 6000, transition: 400 },
    { id: 'sitting2', anim: ANIMS.idle, offsetX: 0, offsetY: 8, duration: 28000 },
    { id: 'sleeping', anim: ANIMS.static, offsetX: 0, offsetY: 8, duration: 20000, overlay: 'zzz' },
    { id: 'sitting3', anim: ANIMS.idle, offsetX: 0, offsetY: 8, duration: 25000 },
    { id: 'walk-to-kitchen', anim: ANIMS.walk, offsetX: 230, offsetY: 84, duration: 4000, transition: 4000 },
    { id: 'at-kitchen', anim: ANIMS.idle, offsetX: 230, offsetY: 84, duration: 7000, overlay: 'coffee' },
    { id: 'walk-back', anim: ANIMS.walk, offsetX: 0, offsetY: 0, duration: 4000, transition: 4000 },
  ],
  tide: [
    { id: 'sitting', anim: ANIMS.idle, offsetX: 0, offsetY: 8, duration: 28000 },
    { id: 'sleeping', anim: ANIMS.static, offsetX: 0, offsetY: 8, duration: 16000, overlay: 'zzz' },
    { id: 'sitting2', anim: ANIMS.idle, offsetX: 0, offsetY: 8, duration: 32000 },
    { id: 'stretching', anim: ANIMS.emote, offsetX: 0, offsetY: 0, duration: 5000, transition: 400 },
    { id: 'sitting3', anim: ANIMS.idle, offsetX: 0, offsetY: 8, duration: 24000 },
    { id: 'walk-to-kitchen', anim: ANIMS.walk, offsetX: 200, offsetY: -136, duration: 4500, transition: 4500 },
    { id: 'at-kitchen', anim: ANIMS.idle, offsetX: 200, offsetY: -136, duration: 8000, overlay: 'coffee' },
    { id: 'walk-back', anim: ANIMS.walk, offsetX: 0, offsetY: 0, duration: 4500, transition: 4500 },
  ],
}

interface IdleState {
  anim: AnimDef
  offsetX: number
  offsetY: number
  overlay: 'zzz' | 'coffee' | null
  transition: number
}

export function useIdleActivity(agent: AgentName, isIdle: boolean): IdleState {
  const [activityIndex, setActivityIndex] = useState(() => Math.floor(Math.random() * 3)) // random start
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const pool = ACTIVITY_POOLS[agent]

  useEffect(() => {
    if (!isIdle) {
      clearTimeout(timeoutRef.current)
      return
    }

    const activity = pool[activityIndex % pool.length]

    timeoutRef.current = setTimeout(() => {
      setActivityIndex(i => (i + 1) % pool.length)
    }, activity.duration)

    return () => clearTimeout(timeoutRef.current)
  }, [isIdle, activityIndex, pool])

  if (!isIdle) {
    return { anim: ANIMS.idle, offsetX: 0, offsetY: 0, overlay: null, transition: 0 }
  }

  const activity = pool[activityIndex % pool.length]
  return {
    anim: activity.anim,
    offsetX: activity.offsetX,
    offsetY: activity.offsetY,
    overlay: activity.overlay || null,
    transition: activity.transition || 0,
  }
}
