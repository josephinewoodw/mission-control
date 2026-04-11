/** Canvas dimensions — native pixel resolution at 16px tiles */
/** 40 cols x 30 rows = 640x480 */
export const CANVAS_W = 640
export const CANVAS_H = 480

/** Tile size in pixels (Eliza/LDtk native 16px) */
export const TILE = 16

/** Grid dimensions */
export const GRID_COLS = 40
export const GRID_ROWS = 30

/** Sprite frame size from LPC spritesheets (source) */
export const FRAME_SIZE = 64

/**
 * Rendered sprite size — kept at 48px for character visibility.
 * With TILE=16, characters are 3 tiles tall (good proportions).
 */
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
 * Layout (40x30 grid at 16px tiles, from LDtk):
 *   Rows 0-5: top wall
 *   Row 6: first floor row
 *   Upper desk area (rows 6-15): chairs at row 7
 *   Corridor (rows 16-19): open floor, no divider
 *   Lower desk area (rows 20-29): chairs at rows 25-26
 *
 * Chair tile positions (from LDtk entity data):
 *   fern:     col 4,  row 7
 *   timber:   col 12, row 7
 *   scout:    col 20, row 7
 *   reed:     col 3,  row 26
 *   sentinel: col 12, row 25
 *   tide:     col 21, row 25
 *
 * Formula: sprite center aligns with tile center.
 *   tile center = col * TILE + TILE/2
 *   sprite top-left = center - SPRITE_SIZE/2
 */
const half = Math.floor(SPRITE_SIZE / 2)
const tileCenter = TILE / 2
export const DESK_POSITIONS: Record<string, { x: number; y: number }> = {
  fern:     { x: 4  * TILE + tileCenter - half, y: 7  * TILE + tileCenter - half },
  timber:   { x: 12 * TILE + tileCenter - half, y: 7  * TILE + tileCenter - half },
  scout:    { x: 20 * TILE + tileCenter - half, y: 7  * TILE + tileCenter - half },
  reed:     { x: 3  * TILE + tileCenter - half, y: 26 * TILE + tileCenter - half },
  sentinel: { x: 12 * TILE + tileCenter - half, y: 25 * TILE + tileCenter - half },
  tide:     { x: 21 * TILE + tileCenter - half, y: 25 * TILE + tileCenter - half },
}

/** Break room coffee area — in front of coffee maker at col 28, row 5 (below counter) */
export const COFFEE_POS = { x: 28 * TILE + tileCenter, y: 7 * TILE + tileCenter }

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
