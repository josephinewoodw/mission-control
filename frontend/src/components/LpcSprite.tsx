import { useEffect, useRef, useState } from 'react'
import type { AgentName } from '../types'

const FRAME_SIZE = 64

/** Animation definition: which row and how many frames to use */
export interface AnimDef {
  row: number
  frames: number
  speed: number // ms per frame, 0 = static first frame
}

/** Pre-built animation configs */
export const ANIMS = {
  idle:      { row: 32, frames: 3, speed: 600 },
  walk:      { row: 10, frames: 9, speed: 150 },
  hurt:      { row: 20, frames: 6, speed: 400 },
  emote:     { row: 36, frames: 3, speed: 500 },
  run:       { row: 40, frames: 8, speed: 120 },
  static:    { row: 32, frames: 1, speed: 0 },
} as const

const SPRITESHEET_MAP: Record<AgentName, string> = {
  fern:     '/assets/fern-spritesheet.png',
  scout:    '/assets/scout-spritesheet.png',
  reed:   '/assets/reed-spritesheet.png',
  sentinel: '/assets/sentinel-spritesheet.png',
  timber:   '/assets/timber-spritesheet.png',
}

interface LpcSpriteProps {
  agent: AgentName
  anim?: AnimDef
  size?: number
  grayscale?: boolean
}

export function LpcSprite({ agent, anim = ANIMS.idle, size = 64, grayscale = false }: LpcSpriteProps) {
  const [frame, setFrame] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const src = SPRITESHEET_MAP[agent]
  const scale = size / FRAME_SIZE

  useEffect(() => {
    setFrame(0)
    clearInterval(intervalRef.current)

    if (anim.speed > 0 && anim.frames > 1) {
      intervalRef.current = setInterval(() => {
        setFrame(f => (f + 1) % anim.frames)
      }, anim.speed)
    }

    return () => clearInterval(intervalRef.current)
  }, [anim.row, anim.speed, anim.frames])

  const bgX = -frame * FRAME_SIZE * scale
  const bgY = -anim.row * FRAME_SIZE * scale

  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${src})`,
        backgroundPosition: `${bgX}px ${bgY}px`,
        backgroundSize: `${13 * FRAME_SIZE * scale}px ${54 * FRAME_SIZE * scale}px`,
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
        filter: grayscale ? 'grayscale(100%)' : 'none',
        opacity: grayscale ? 0.6 : 1,
      }}
    />
  )
}
