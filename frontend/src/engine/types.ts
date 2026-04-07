import type { AgentName, AgentStatus } from '../types'

/** Tile coordinates on the 20x15 grid */
export interface TilePos {
  tx: number
  ty: number
}

/** Pixel coordinates on the 640x480 canvas */
export interface PixelPos {
  x: number
  y: number
}

/** Direction for sprite facing */
export type Direction = 'up' | 'down' | 'left' | 'right'

/** Character FSM states */
export type CharacterState =
  | 'IDLE_SIT'
  | 'SLEEPING'
  | 'STRETCHING'
  | 'COFFEE_RUN'
  | 'AT_COFFEE'
  | 'RETURN_DESK'
  | 'WORKING'
  | 'BLOCKED'

/** Spritesheet animation row mapping for LPC sheets */
export interface AnimRow {
  baseRow: number
  frames: number
  speed: number // ms per frame, 0 = static
}

/** A drawable entity in the scene */
export interface Drawable {
  x: number
  y: number
  z: number // y-sort priority; higher z draws later (on top)
  draw(ctx: CanvasRenderingContext2D, dt: number): void
}

/** Agent data passed into the engine from React */
export interface AgentData {
  name: AgentName
  status: AgentStatus
  displayName: string
  color: string
}

/** Tile type for the map */
export type TileType =
  | 'floor_wood'
  | 'floor_break'
  | 'floor_kitchen'
  | 'wall'
  | 'wall_base'
  | 'empty'

/** Game engine state */
export interface EngineState {
  running: boolean
  lastTime: number
  agents: Record<AgentName, AgentData>
}
