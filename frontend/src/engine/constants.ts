/** Canvas dimensions — native pixel resolution at 32px tiles */
/** 20 cols x 15 rows = 640x480 */
export const CANVAS_W = 640
export const CANVAS_H = 480

/** Tile size in pixels (LPC native) */
export const TILE = 32

/** Grid dimensions */
export const GRID_COLS = 20
export const GRID_ROWS = 15

/** Sprite frame size from LPC spritesheets (source) */
export const FRAME_SIZE = 64

/** Rendered sprite size — 1.5 tiles tall for LPC characters at 32px tile scale */
export const SPRITE_SIZE = 48

/** Spritesheet layout: 13 columns, 54 rows */
export const SHEET_COLS = 13
export const SHEET_ROWS = 54

/** LPC animation row mappings (base row, add 0-3 for up/left/down/right) */
export const ANIM_ROWS = {
  idle:    { baseRow: 32, frames: 3, speed: 600 },
  walk:    { baseRow: 10, frames: 9, speed: 150 },
  hurt:    { baseRow: 20, frames: 6, speed: 400 },
  emote:   { baseRow: 36, frames: 3, speed: 500 },
  run:     { baseRow: 40, frames: 8, speed: 120 },
  static:  { baseRow: 32, frames: 1, speed: 0 },
} as const

/**
 * Direction offsets for spritesheet rows.
 * LPC standard: up=+0, left=+1, down=+2, right=+3
 * BUT our verified rows (idle=32, walk=10, hurt=20, emote=36) are already the DOWN-facing rows.
 * So baseRow IS the down row, and offsets are relative to that:
 *   down=0, left=-1, up=-2, right=+1
 */
export const DIR_OFFSETS = {
  up: -2,
  left: -1,
  down: 0,
  right: 1,
} as const

/** Idle activity timing range (ms) */
export const IDLE_MIN_MS = 20_000
export const IDLE_MAX_MS = 35_000

/**
 * Agent desk positions (pixel coords of sprite anchor, top-left of sprite).
 * Characters sit in chairs in front of their desks.
 *
 * Layout (20x15 grid at 32px):
 *   Row 0-2: walls
 *   Row 3: wall decorations
 *   Row 4-5: desks for Fern (cols 2-4), Timber (cols 5-7), Scout (cols 8-10)
 *   Row 6-7: chairs for Fern (col 3), Timber (col 6), Scout (col 9)
 *   Row 8: corridor
 *   Row 9-10: desks for Reed (cols 2-4), Sentinel (cols 5-7), and Tide (cols 8-10)
 *   Row 11-12: chairs for Reed (col 3), Sentinel (col 6), and Tide (col 9)
 *   Row 13: bottom area
 *   Row 14: bottom wall
 *
 * Chair positions (where characters sit):
 *   Fern:     col 3, row 6
 *   Timber:   col 6, row 6
 *   Scout:    col 9, row 6
 *   Reed:     col 3, row 11
 *   Sentinel: col 6, row 11
 *   Tide:     col 9, row 11
 *
 * Formula: sprite center aligns with tile center.
 *   tile center = col * TILE + TILE/2
 *   sprite top-left = center - SPRITE_SIZE/2
 */
const half = Math.floor(SPRITE_SIZE / 2)
const tileCenter = TILE / 2
export const DESK_POSITIONS: Record<string, { x: number; y: number }> = {
  fern:     { x: 3 * TILE + tileCenter - half, y: 6 * TILE + tileCenter - half },
  timber:   { x: 6 * TILE + tileCenter - half, y: 6 * TILE + tileCenter - half },
  scout:    { x: 9 * TILE + tileCenter - half, y: 6 * TILE + tileCenter - half },
  reed:     { x: 3 * TILE + tileCenter - half, y: 11 * TILE + tileCenter - half },
  sentinel: { x: 6 * TILE + tileCenter - half, y: 11 * TILE + tileCenter - half },
  tide:     { x: 9 * TILE + tileCenter - half, y: 11 * TILE + tileCenter - half },
}

/** Break room coffee area — in front of counter, near coffee maker at col 15, row 4 */
export const COFFEE_POS = { x: 15 * TILE + tileCenter, y: 6 * TILE + tileCenter }

/** Max delta time clamp (ms) — prevents huge jumps after tab switch */
export const MAX_DT = 100

/** Colors (fallback only — most rendering uses sprites now) */
export const COLORS = {
  floorWood1: '#3a2e20',
  floorWood2: '#382b1e',
  floorBreak: '#362c1e',
  wall1: '#54422e',
  wall2: '#4a3828',
  wall3: '#54422e',
  wallBase: '#3a2818',
  wallBaseHighlight: '#5a4a3a',
  statusWorking: '#4a9e4a',
  statusBlocked: '#e74c3c',
  statusIdle: '#888',
  statusOffline: '#444',
  watermark: 'rgba(168,216,168,0.15)',
} as const
