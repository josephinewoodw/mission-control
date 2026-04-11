import { TILE, GRID_COLS, GRID_ROWS } from './constants'

/**
 * Tile types:
 * 0   = wall (not walkable)
 * 1   = wood floor (walkable) — Eliza Wood Floor A
 * 2   = tile floor (walkable) — Eliza Tile B (break room / kitchen)
 * 255 = void (empty/transparent)
 *
 * Layout derived from LDtk file (mc-office.ldtk):
 *   40x30 grid at 16px tiles = 640x480 canvas
 *   Rows 0-5:  top wall zone
 *   Row 4:     partial tile floor in break room right side (cols 30-37)
 *   Rows 6-15: upper office floor (left=wood cols 0-25, right=tile cols 28-39)
 *   Rows 16-19: corridor — full-width wood floor, no divider
 *   Rows 20-29: lower office floor (left=wood cols 0-25, right=wood cols 28-39)
 *   Cols 26-27: vertical room divider wall (rows 0-15 and 20-29, gap at 16-19)
 */
export type TileType = 'floor_wood' | 'floor_tile' | 'wall' | 'empty'

// prettier-ignore
const LAYOUT: number[][] = [
  //  0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20  21  22  23  24  25  26  27  28  29  30  31  32  33  34  35  36  37  38  39
  [  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0],  // Row 0
  [  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0],  // Row 1
  [  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0],  // Row 2
  [  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0],  // Row 3
  [  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  2,  2,  2,  2,  2,  2,  2,  2,  0,  0],  // Row 4
  [  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0],  // Row 5
  [  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2],  // Row 6
  [  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2],  // Row 7
  [  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2],  // Row 8
  [  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2],  // Row 9
  [  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2],  // Row 10
  [  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2],  // Row 11
  [  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2],  // Row 12
  [  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2],  // Row 13
  [  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2],  // Row 14
  [  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2],  // Row 15
  [  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1],  // Row 16 (corridor)
  [  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1],  // Row 17 (corridor)
  [  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1],  // Row 18 (corridor)
  [  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1],  // Row 19 (corridor)
  [  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1],  // Row 20
  [  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1],  // Row 21
  [  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1],  // Row 22
  [  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1],  // Row 23
  [  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1],  // Row 24
  [  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1],  // Row 25
  [  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1],  // Row 26
  [  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1],  // Row 27
  [  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1],  // Row 28
  [  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1],  // Row 29
]

/** Furniture placement definitions for the LDtk-derived layout */
export interface FurniturePlacement {
  type: string     // Asset ID from spriteCache
  col: number      // Tile column (in 16px grid)
  row: number      // Tile row (footprint bottom-anchor row)
  mirrored?: boolean
}

/**
 * Furniture layout derived from mc-office.ldtk entity positions.
 *
 * LDtk grid is 16px tiles, matching our new TILE=16 grid.
 * Entity positions are in 16px tile grid coordinates.
 *
 * Upper section (rows 6-15):
 *   - Fern's desk:    Desk_2 at col 4,  row 8  | Chair at col 4,  row 7
 *   - Timber's desk:  Desk_2 at col 12, row 8  | Chair at col 12, row 7
 *   - Scout's desk:   Desk_2 at col 20, row 8  | Chair at col 20, row 7
 *   - Bookshelves at col 2 and col 6, row 5
 *   - TV at col 12, row 2
 *   - Mailboxes at col 18, row 3
 *
 * Break room / right side (cols 28-39):
 *   - Countertops + coffee maker + water cooler at rows 3-4
 *   - Fridge at col 37
 *   - Tables + stools at rows 9-12
 *   - Copy machine at col 36, row 15
 *
 * Lower section (rows 20-29):
 *   - Reed's desk:     Desk_2 at col 4,  row 27 | Chair at col 3,  row 26
 *   - Sentinel's desk: Desk_2 at col 12, row 27 | Chair at col 12, row 25
 *   - Tide's desk:     Desk_2 at col 20, row 27 | Chair at col 21, row 25
 */
export const FURNITURE_LAYOUT: FurniturePlacement[] = [
  // ── Upper section: Fern's workstation ──
  { type: 'ELIZA_DESK',   col: 4,  row: 8  },   // 3-tile wide desk
  { type: 'ELIZA_CHAIR',  col: 4,  row: 7  },
  { type: 'ELIZA_LAPTOP', col: 5,  row: 8  },   // Laptop on desk
  { type: 'ELIZA_PAPER',  col: 4,  row: 8  },   // Papers
  { type: 'ELIZA_MUG',    col: 3,  row: 8  },   // Coffee mug

  // ── Upper section: Timber's workstation ──
  { type: 'ELIZA_DESK',      col: 12, row: 8  },
  { type: 'ELIZA_CHAIR',     col: 12, row: 7  },
  { type: 'ELIZA_MONITOR',   col: 12, row: 8  },  // Monitor on desk
  { type: 'ELIZA_PAPER',     col: 14, row: 8  },
  { type: 'ELIZA_MUG',       col: 11, row: 8  },

  // ── Upper section: Scout's workstation ──
  { type: 'ELIZA_DESK',    col: 20, row: 8  },
  { type: 'ELIZA_CHAIR',   col: 20, row: 7  },
  { type: 'ELIZA_MONITOR3', col: 20, row: 8  },  // Triple monitor
  { type: 'ELIZA_BOOK',    col: 22, row: 7  },   // Book on desk

  // ── Wall items — upper section ──
  { type: 'ELIZA_BOOKSHELF', col: 2,  row: 5  },  // Bookshelves
  { type: 'ELIZA_BOOKSHELF', col: 6,  row: 5  },
  { type: 'ELIZA_TV',        col: 12, row: 2  },  // TV on wall
  { type: 'ELIZA_MAILBOXES', col: 18, row: 3  },  // Mailboxes
  { type: 'ELIZA_DESK_LAMP', col: 10, row: 7  },  // Desk lamp between desks
  { type: 'ELIZA_TABLE_LAMP',col: 7,  row: 7  },  // Table lamp
  { type: 'ELIZA_CURTAINS',  col: 1,  row: 2  },  // Curtains left
  { type: 'ELIZA_CURTAINS',  col: 4,  row: 2  },  // Curtains center
  { type: 'ELIZA_CURTAINS',  col: 21, row: 2  },  // Curtains right
  { type: 'ELIZA_CURTAINS',  col: 24, row: 2  },  // Curtains far right

  // ── Corridor (rows 16-19) ──
  { type: 'ELIZA_FLOOR_LAMP', col: 24, row: 8  },  // Floor lamp near divider
  { type: 'ELIZA_PLANTER',   col: 16, row: 19 },   // Planter in corridor

  // ── Break room (right side, cols 28-39) ──
  // Kitchen counter back wall (row 4)
  { type: 'ELIZA_COUNTERTOP', col: 28, row: 4  },
  { type: 'ELIZA_COUNTERTOP', col: 31, row: 4  },
  { type: 'ELIZA_COUNTERTOP', col: 34, row: 4  },
  { type: 'ELIZA_COFFEEMAKER', col: 28, row: 3 },  // Coffee maker on counter
  { type: 'ELIZA_WATERCOOLER', col: 27, row: 3 },  // Water cooler
  { type: 'ELIZA_FRIDGE',     col: 37, row: 3  },  // Fridge
  // Upper cabinets on wall
  { type: 'ELIZA_CABINET',    col: 29, row: 2  },
  { type: 'ELIZA_CABINET',    col: 30, row: 2  },
  { type: 'ELIZA_CABINET',    col: 32, row: 2  },
  { type: 'ELIZA_CABINET',    col: 34, row: 2  },
  { type: 'ELIZA_CABINET',    col: 36, row: 2  },
  { type: 'ELIZA_SINK',       col: 33, row: 4  },  // Sink on counter
  // Kitchen table with stools (rows 9-12)
  { type: 'ELIZA_TABLE',      col: 34, row: 9  },
  { type: 'ELIZA_TABLE',      col: 34, row: 10 },
  { type: 'ELIZA_STOOL',      col: 31, row: 9  },
  { type: 'ELIZA_STOOL',      col: 31, row: 11 },
  { type: 'ELIZA_STOOL',      col: 37, row: 9  },
  { type: 'ELIZA_STOOL',      col: 37, row: 10 },
  { type: 'ELIZA_STOOL',      col: 33, row: 12 },
  { type: 'ELIZA_STOOL',      col: 35, row: 12 },
  { type: 'ELIZA_KITCHEN_CLUTTER', col: 35, row: 4 },  // Kitchen clutter
  { type: 'ELIZA_RUNNER',    col: 33, row: 7  },   // Runner rug
  // Copy machine
  { type: 'ELIZA_COPY_MACHINE', col: 36, row: 15 },

  // ── Lower section: Reed's workstation ──
  { type: 'ELIZA_DESK',    col: 4,  row: 27 },
  { type: 'ELIZA_CHAIR',   col: 3,  row: 26 },
  { type: 'ELIZA_MONITOR3',col: 3,  row: 26 },   // Triple monitor
  { type: 'ELIZA_PAPER',   col: 6,  row: 26 },
  { type: 'ELIZA_MUG',     col: 3,  row: 26 },

  // ── Lower section: Sentinel's workstation ──
  { type: 'ELIZA_DESK',    col: 12, row: 27 },
  { type: 'ELIZA_CHAIR',   col: 12, row: 25 },
  { type: 'ELIZA_LAPTOP',  col: 12, row: 17 },   // Laptop on lower desk (row 17 = corridor area desk)
  { type: 'ELIZA_TABLE_LAMP', col: 14, row: 17 }, // Lamp

  // ── Lower section: Tide's workstation ──
  { type: 'ELIZA_DESK',    col: 20, row: 27 },
  { type: 'ELIZA_CHAIR',   col: 21, row: 25 },
  { type: 'ELIZA_MONITOR3', col: 21, row: 26 }, // Monitor
  { type: 'ELIZA_PHONE',   col: 5,  row: 25 },  // Phone on desk

  // ── Corridor / shared area desks (rows 16-19) ──
  { type: 'ELIZA_CHAIR',   col: 12, row: 16 },   // Extra chair
  { type: 'ELIZA_DESK',    col: 12, row: 18 },   // Meeting/solo desk in corridor
  { type: 'ELIZA_BOOK',    col: 10, row: 17 },   // Book on desk

  // ── Misc items ──
  { type: 'ELIZA_CABINET_SMALL', col: 3,  row: 3  },  // Small cabinet / printer area
  { type: 'ELIZA_PRINTER', col: 5,  row: 3  },   // Printer on top
]

// ── Layout data ────────────────────────────────────────────────

let layoutLoaded = false

/**
 * Load the layout. Synchronous (hardcoded from LDtk), async signature for API compatibility.
 */
export async function loadLayout(): Promise<void> {
  if (layoutLoaded) return
  layoutLoaded = true
}

/** Get the layout tile map (numeric values) */
export function getLayoutMap(): number[][] {
  return LAYOUT
}

/** Get layout dimensions */
export function getLayoutDimensions(): { cols: number; rows: number } {
  return { cols: GRID_COLS, rows: GRID_ROWS }
}

// ── Collision grid ──────────────────────────────────────────────────

let collisionGrid: boolean[][] = []
let collisionBuilt = false

/** Build collision grid from the hardcoded layout + furniture */
export function buildCollisionGrid() {
  collisionGrid = []
  for (let r = 0; r < GRID_ROWS; r++) {
    collisionGrid[r] = []
    for (let c = 0; c < GRID_COLS; c++) {
      const tile = LAYOUT[r]?.[c] ?? 255
      // Walls (0) are not walkable; floor (1,2) is walkable
      collisionGrid[r][c] = tile === 0 || tile === 255
    }
  }

  // Mark blocking furniture tiles
  const blockingTypes = new Set([
    'ELIZA_DESK', 'ELIZA_BOOKSHELF', 'ELIZA_CABINET', 'ELIZA_CABINET_SMALL',
    'ELIZA_TABLE', 'ELIZA_COPY_MACHINE', 'ELIZA_FRIDGE',
    'ELIZA_COUNTERTOP', 'ELIZA_TV',
  ])

  for (const item of FURNITURE_LAYOUT) {
    if (blockingTypes.has(item.type)) {
      const r = item.row
      const c = item.col
      if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) {
        collisionGrid[r][c] = true
      }
    }
  }

  collisionBuilt = true
}

/** Get tile type at grid coordinates */
export function getTile(tx: number, ty: number): TileType {
  if (tx < 0 || tx >= GRID_COLS || ty < 0 || ty >= GRID_ROWS) return 'empty'
  const val = LAYOUT[ty]?.[tx]
  if (val === undefined) return 'empty'
  if (val === 0) return 'wall'
  if (val === 255) return 'empty'
  if (val === 2) return 'floor_tile'
  return 'floor_wood'
}

/** Check if a tile is walkable */
export function isWalkable(tx: number, ty: number): boolean {
  if (tx < 0 || tx >= GRID_COLS || ty < 0 || ty >= GRID_ROWS) return false
  if (!collisionBuilt) buildCollisionGrid()
  return !collisionGrid[ty]?.[tx]
}

/** Convert pixel coords to tile coords */
export function pixelToTile(px: number, py: number): { tx: number; ty: number } {
  return {
    tx: Math.floor(px / TILE),
    ty: Math.floor(py / TILE),
  }
}

/** Convert tile coords to pixel coords (top-left of tile) */
export function tileToPixel(tx: number, ty: number): { x: number; y: number } {
  return {
    x: tx * TILE,
    y: ty * TILE,
  }
}

/** Export collision grid for pathfinding */
export function getCollisionGrid(): boolean[][] {
  if (!collisionBuilt) buildCollisionGrid()
  return collisionGrid
}
