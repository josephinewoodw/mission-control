import { TILE, GRID_COLS, GRID_ROWS } from './constants'

/**
 * Tile types:
 * 0 = wall (not walkable)
 * 1 = floor (walkable) — Pixel Agents floor_1 drawn at 2x
 * 4 = furniture (not walkable, set by collision builder)
 * 255 = void (empty/transparent)
 */
export type TileType = 'floor_wood' | 'wall' | 'wall_base' | 'floor_break' | 'floor_kitchen' | 'empty'

/**
 * New 20x15 office layout designed for 32px LPC tiles.
 *
 * Legend:
 *   0 = wall
 *   1 = warm wood floor (floor_1.png at 2x scale)
 *   2 = break room floor (cooler tone — slightly blue-gray wood)
 *   3 = kitchenette tile floor (checkerboard pattern)
 *   255 = void
 *
 * Layout:
 *   Rows 0-2: walls (top, 3 rows thick)
 *   Row 3: wall base row (floor behind wall decorations — walkable)
 *   Rows 4-13: open office floor (work area left of col 12, break room right)
 *   Row 14: bottom wall
 *   Col 12: divider wall between work area and break room (gap at rows 7-8 for doorway)
 */

// prettier-ignore
const LAYOUT: number[][] = [
  // Row 0: top wall
  [0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0],
  // Row 1: wall
  [0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0],
  // Row 2: wall base (visible wall strip with decorations)
  [0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0],
  // Row 3: floor behind wall decorations — divider wall starts here
  [0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  3,  3,  3,  3,  3,  3,  0],
  // Row 4: desk row upper — kitchenette tile floor in break room
  [0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  3,  3,  3,  3,  3,  3,  0],
  // Row 5: desk row lower — kitchenette tile floor continues
  [0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  3,  3,  3,  3,  3,  3,  0],
  // Row 6: chair row — transition to lounge floor
  [0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  2,  2,  2,  2,  2,  2,  0],
  // Row 7: open floor / walkway — DOORWAY (col 12 is floor for passage)
  [0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  2,  2,  2,  2,  2,  2,  2,  0],
  // Row 8: corridor — DOORWAY (col 12 is floor for passage)
  [0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  2,  2,  2,  2,  2,  2,  2,  0],
  // Row 9: desk row lower pair
  [0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  2,  2,  2,  2,  2,  2,  0],
  // Row 10: desk row lower
  [0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  2,  2,  2,  2,  2,  2,  0],
  // Row 11: chair row
  [0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  2,  2,  2,  2,  2,  2,  0],
  // Row 12: open floor
  [0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  2,  2,  2,  2,  2,  2,  0],
  // Row 13: bottom floor
  [0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  2,  2,  2,  2,  2,  2,  0],
  // Row 14: bottom wall
  [0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0],
]

/** Furniture placement definitions for the new layout */
export interface FurniturePlacement {
  type: string     // Asset ID from spriteCache
  col: number      // Tile column
  row: number      // Tile row (footprint bottom-anchor row)
  mirrored?: boolean
}

/**
 * Hardcoded furniture layout for the 20x15 office.
 *
 * Upper work area (cols 2-10, rows 4-6):
 *   - Fern's desk at cols 2-4, row 4-5; chair at col 3, row 6
 *   - Timber's desk at cols 5-7, row 4-5; chair at col 6, row 6
 *   - Scout's desk at cols 8-10, row 4-5; chair at col 9, row 6
 *
 * Lower work area (cols 2-10, rows 9-11):
 *   - Reed's desk at cols 2-4, row 9-10; chair at col 3, row 11
 *   - Sentinel's desk at cols 5-7, row 9-10; chair at col 6, row 11
 *   - Tide's desk at cols 8-10, row 9-10; chair at col 9, row 11
 *
 * Break room (separate enclosed room, cols 13-18, rows 3-13):
 *   - Divider wall at col 12 with doorway at rows 7-8
 *   - Counter along back wall (cols 14-16, row 4) with coffee maker (col 15) + water cooler (col 16) side by side
 *   - Dining table at col 15, row 6 with chairs (kitchen area for coffee breaks)
 *   - Lounge area: sofa + coffee table (rows 9-11)
 *   - Plants for coziness (large plant near doorway, not blocking counter)
 *
 * Wall decorations (row 2-3):
 *   - Bookshelves, paintings, clock, TV, hanging plants
 */
export const FURNITURE_LAYOUT: FurniturePlacement[] = [
  // ── Fern's workstation (upper left) ──
  { type: 'DESK_FRONT', col: 2, row: 5 },         // Desk
  { type: 'PC_FRONT_ON', col: 3, row: 5 },         // Laptop ON desk (same row)
  { type: 'CUSHIONED_BENCH', col: 3, row: 6 },     // Chair

  // ── Timber's workstation (upper center) ──
  { type: 'DESK_FRONT', col: 5, row: 5 },
  { type: 'PC_FRONT_ON', col: 6, row: 5 },         // Laptop ON desk (same row)
  { type: 'CUSHIONED_BENCH', col: 6, row: 6 },

  // ── Scout's workstation (upper right) ──
  { type: 'DESK_FRONT', col: 8, row: 5 },
  { type: 'PC_FRONT_ON', col: 9, row: 5 },         // Laptop ON desk (same row)
  { type: 'CUSHIONED_CHAIR', col: 9, row: 6 },

  // ── Reed's workstation (lower left) ──
  { type: 'DESK_FRONT', col: 2, row: 10 },
  { type: 'PC_FRONT_ON', col: 3, row: 10 },        // Laptop ON desk (same row)
  { type: 'CUSHIONED_BENCH', col: 3, row: 11 },

  // ── Sentinel's workstation (lower center) ──
  { type: 'DESK_FRONT', col: 5, row: 10 },
  { type: 'PC_FRONT_ON', col: 6, row: 10 },        // Laptop ON desk (same row)
  { type: 'CUSHIONED_BENCH', col: 6, row: 11 },

  // ── Tide's workstation (lower right) ──
  { type: 'DESK_FRONT', col: 8, row: 10 },
  { type: 'PC_FRONT_ON', col: 9, row: 10 },        // Laptop ON desk (same row)
  { type: 'CUSHIONED_CHAIR', col: 9, row: 11 },

  // ── Break room (enclosed room, cols 13-18, rows 3-13) ──
  // Kitchenette counter flush against back wall (row 3)
  { type: 'SMALL_TABLE_FRONT', col: 14, row: 3 },   // Counter left
  { type: 'SMALL_TABLE_FRONT', col: 15, row: 3 },   // Counter center
  { type: 'SMALL_TABLE_FRONT', col: 16, row: 3 },   // Counter center-right
  { type: 'SMALL_TABLE_FRONT', col: 17, row: 3 },   // Counter right
  { type: 'SINK', col: 14, row: 3 },                // Sink ON counter (left)
  { type: 'COFFEE_MAKER', col: 15, row: 3 },        // Coffee maker ON counter (center)
  { type: 'WATER_COOLER', col: 17, row: 3 },        // Water cooler ON counter (right end)

  // Dining table in kitchen area (tile floor, rows 5-6)
  { type: 'SMALL_TABLE_FRONT', col: 15, row: 6 },   // Dining table
  { type: 'CUSHIONED_BENCH', col: 14, row: 6 },     // Chair left of table
  { type: 'CUSHIONED_CHAIR', col: 16, row: 6 },     // Chair right of table
  { type: 'ROTARY_PHONE', col: 15, row: 6 },        // Phone on dining table

  // Lounge area — couch + armchair facing each other around coffee table
  { type: 'RUG', col: 14, row: 9 },                 // Large rug under lounge seating
  { type: 'SOFA_FRONT', col: 15, row: 11 },         // Couch on south side facing up
  { type: 'COFFEE_TABLE', col: 15, row: 10 },       // Coffee table in the middle
  { type: 'CUSHIONED_CHAIR', col: 14, row: 9 },     // Armchair left, facing right
  { type: 'SOFA_SIDE', col: 17, row: 10 },          // Side sofa (right arm) facing left

  // Arcade cabinet in corner
  { type: 'ARCADE_CABINET', col: 18, row: 7 },      // Arcade game in upper-right corner

  // Misc
  { type: 'BIN', col: 13, row: 13 },                // Bin near door

  // ── Plants ──
  { type: 'PLANT', col: 1, row: 4 },                // Plant near Fern's area (left wall)
  { type: 'PLANT_2', col: 18, row: 4 },             // Plant far right (break room corner)
  { type: 'LARGE_PLANT', col: 17, row: 13 },        // Large plant in break room lounge corner (moved from counter)
  { type: 'CACTUS', col: 11, row: 4 },              // Cactus in work area
  { type: 'PLANT', col: 18, row: 12 },              // Plant in break room far corner
  { type: 'PLANT_2', col: 13, row: 10 },            // Plant by lounge area
  { type: 'PLANT_3', col: 14, row: 12 },            // Plant by sofa

  // ── Wall decorations — work area (on the wall, row 2) ──
  { type: 'DOUBLE_BOOKSHELF', col: 1, row: 2 },     // Bookshelf left wall
  { type: 'BOOKSHELF', col: 3, row: 2 },             // Bookshelf near Fern
  { type: 'SMALL_PAINTING', col: 5, row: 2 },        // Portrait
  { type: 'CLOCK', col: 6, row: 2 },                 // Clock on wall
  { type: 'PORTRAIT_3', col: 7, row: 2 },            // New portrait variant between desks
  { type: 'LARGE_PAINTING', col: 8, row: 2 },        // TV widescreen (3 tiles: col 8-10)
  { type: 'HANGING_PLANT', col: 4, row: 2 },         // Hanging plant left wall
  { type: 'BOOKSHELF', col: 11, row: 2 },            // Single bookshelf right side (after TV)

  // ── Wall decorations — break room (on the wall, row 2) ──
  { type: 'HANGING_PLANT', col: 18, row: 2 },        // Hanging plant break room right
  { type: 'WALL_CLOCK_2', col: 14, row: 2 },          // Decorative clock in break room
  { type: 'SMALL_PAINTING_2', col: 16, row: 2 },     // Portrait in break room
  { type: 'PORTRAIT_4', col: 17, row: 2 },           // Another portrait for variety

  // ── Desk accessories (lived-in touches) ──
  { type: 'COFFEE', col: 2, row: 5 },               // Coffee cup on Fern's desk
  { type: 'POT', col: 8, row: 5 },                  // Small pot on Scout's desk

  // ── Copy machine & mailboxes ──
  { type: 'COPY_MACHINE', col: 1, row: 13 },         // Copy machine in lower-left corner
  { type: 'MAILBOXES', col: 11, row: 13 },           // Mailboxes near right wall
]

// ── Layout data ────────────────────────────────────────────────

let layoutLoaded = false

/**
 * Load the layout. In the new design this is synchronous (hardcoded),
 * but we keep the async signature for API compatibility.
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
      // Walls (0) and void (255) are not walkable; floor (1), break room (2), kitchen tile (3) are walkable
      collisionGrid[r][c] = tile === 0 || tile === 255
    }
  }

  // Mark furniture tiles as blocked
  const blockingTypes = new Set([
    'DESK_FRONT', 'DESK_SIDE', 'TABLE_FRONT', 'SMALL_TABLE_FRONT', 'SMALL_TABLE_SIDE',
    'DOUBLE_BOOKSHELF', 'BOOKSHELF', 'COFFEE_TABLE',
    'SOFA_FRONT', 'SOFA_BACK', 'SOFA_SIDE',
    'COPY_MACHINE', 'MAILBOXES', 'ARCADE_CABINET',
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
  if (val === 2) return 'floor_break'
  if (val === 3) return 'floor_kitchen'
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
