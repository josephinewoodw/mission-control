import { MAX_DT } from './constants'
import { render } from './renderer'
import type { Character } from './character'

export interface GameLoop {
  start(): void
  stop(): void
  /** Update the characters list (called when agent data changes) */
  setCharacters(chars: Character[]): void
}

export function createGameLoop(ctx: CanvasRenderingContext2D): GameLoop {
  let running = false
  let rafId: number | null = null
  let lastTime = 0
  let characters: Character[] = []

  function tick(timestamp: number) {
    if (!running) return

    // First frame: no delta
    if (lastTime === 0) lastTime = timestamp

    const rawDt = timestamp - lastTime
    const dt = Math.min(rawDt, MAX_DT) // clamp to prevent huge jumps
    lastTime = timestamp

    // Update all characters
    for (const char of characters) {
      char.update(dt, timestamp)
    }

    // Render everything
    render(ctx, characters, timestamp)

    rafId = requestAnimationFrame(tick)
  }

  return {
    start() {
      if (running) return
      running = true
      lastTime = 0
      rafId = requestAnimationFrame(tick)
    },

    stop() {
      running = false
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
    },

    setCharacters(chars: Character[]) {
      characters = chars
    },
  }
}
