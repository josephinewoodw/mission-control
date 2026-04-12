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
  [  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0],  // Row 4
  [  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0],  // Row 5
  [  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  0,  0,  0,  0,  0,  0,  0,  0,  0,  2,  2,  2,  2,  2],  // Row 6
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
  /** Optional: override pixel X coordinate directly (from LDtk entity px[0]) */
  pxX?: number
  /** Optional: override pixel Y coordinate directly (from LDtk entity px[1]) */
  pxY?: number
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
  // LDtk: Desk_2 px(72,140) grid[4,8], Chair px(72,120) grid[4,7]
  // Monitor_right_ px(81,122) grid[5,7], Papers px(38,128) grid[2,8]
  // Coffee_Mug px(54,129) grid[3,8], Table_Lamp px(112,120) grid[7,7]
  // Desk_lamp px(171,120) grid[10,7]
  { type: 'ELIZA_DESK',    col: 4,  row: 8  },   // Desk: grid-based Y ok
  { type: 'ELIZA_CHAIR',   col: 4,  row: 7  },
  { type: 'ELIZA_MONITOR', col: 5,  row: 7,  pxX: 81,  pxY: 122 },
  { type: 'ELIZA_PAPER',   col: 2,  row: 8,  pxX: 38,  pxY: 128 },
  { type: 'ELIZA_MUG',     col: 3,  row: 8,  pxX: 54,  pxY: 129 },
  { type: 'ELIZA_TABLE_LAMP', col: 7, row: 7, pxX: 112, pxY: 120 },
  { type: 'ELIZA_DESK_LAMP', col: 10, row: 7, pxX: 171, pxY: 120 },

  // ── Upper section: Timber's workstation ──
  // LDtk: Desk_2 px(200,140) grid[12,8], Chair px(200,116) grid[12,7]
  // Laptop px(200,128) grid[12,8], Papers px(225,129) grid[14,8]
  // Coffee_Mug px(182,130) grid[11,8]
  { type: 'ELIZA_DESK',    col: 12, row: 8  },
  { type: 'ELIZA_CHAIR',   col: 12, row: 7  },
  { type: 'ELIZA_LAPTOP',  col: 12, row: 8,  pxX: 200, pxY: 128 },
  { type: 'ELIZA_PAPER',   col: 14, row: 8,  pxX: 225, pxY: 129 },
  { type: 'ELIZA_MUG',     col: 11, row: 8,  pxX: 182, pxY: 130 },

  // ── Upper section: Scout's workstation ──
  // LDtk: Desk_2 px(328,140) grid[20,8], Chair px(328,118) grid[20,7]
  // Monitors_3 px(329,128) grid[20,8], Book px(356,122) grid[22,7]
  // Books px(240,122) grid[15,7]
  { type: 'ELIZA_DESK',    col: 20, row: 8  },
  { type: 'ELIZA_CHAIR',   col: 20, row: 7  },
  { type: 'ELIZA_MONITOR3', col: 20, row: 8, pxX: 329, pxY: 128 },
  { type: 'ELIZA_BOOK',    col: 22, row: 7,  pxX: 356, pxY: 122 },
  { type: 'ELIZA_BOOK',    col: 15, row: 7,  pxX: 240, pxY: 122 },

  // ── Wall items — upper section ──
  { type: 'ELIZA_BOOKSHELF', col: 2,  row: 5  },  // Bookshelves (grid [2,5])
  { type: 'ELIZA_BOOKSHELF', col: 6,  row: 5  },  // Bookshelves (grid [6,5])
  { type: 'ELIZA_TV',        col: 12, row: 2  },  // TV on wall (grid [12,2])
  { type: 'ELIZA_MAILBOXES', col: 18, row: 3  },  // Mailboxes (grid [18,3])
  { type: 'ELIZA_CURTAINS',  col: 1,  row: 2  },  // Curtains (grid [1,2])
  { type: 'ELIZA_CURTAINS',  col: 4,  row: 2  },  // Curtains (grid [4,2])
  { type: 'ELIZA_CURTAINS',  col: 21, row: 2  },  // Curtains (grid [21,2])
  { type: 'ELIZA_CURTAINS',  col: 24, row: 2  },  // Curtains (grid [24,2])

  // ── Corridor (rows 16-19) ──
  { type: 'ELIZA_FLOOR_LAMP', col: 24, row: 8  },  // Floor lamp (grid [24,8])
  { type: 'ELIZA_PLANTER',   col: 16, row: 19 },   // Planter (grid [16,19])

  // ── Break room (right side, cols 28-39) ──
  // Kitchen counter back wall (row 4) — use px positions from LDtk
  // Countertops px(456,78) grid[28,4], px(502,78) grid[31,4], px(550,78) grid[34,4]
  { type: 'ELIZA_COUNTERTOP', col: 28, row: 4, pxX: 456, pxY: 78 },
  { type: 'ELIZA_COUNTERTOP', col: 31, row: 4, pxX: 502, pxY: 78 },
  { type: 'ELIZA_COUNTERTOP', col: 34, row: 4, pxX: 550, pxY: 78 },
  // Coffeemaker px(461,59) grid[28,3], Watercooler px(440,50) grid[27,3]
  { type: 'ELIZA_COFFEEMAKER', col: 28, row: 3, pxX: 461, pxY: 59 },
  { type: 'ELIZA_WATERCOOLER', col: 27, row: 3, pxX: 440, pxY: 50 },
  // Fridge px(607,48) grid[37,3]
  { type: 'ELIZA_FRIDGE',     col: 37, row: 3, pxX: 607, pxY: 48 },
  // Upper cabinets — px positions from LDtk
  // Cabinets at grid[29,2] px(464,40), [30,2] px(495,40), [32,2] px(527,40), [34,2] px(559,40), [36,2] px(591,40)
  { type: 'ELIZA_CABINET',    col: 29, row: 2, pxX: 464, pxY: 40 },
  { type: 'ELIZA_CABINET',    col: 30, row: 2, pxX: 495, pxY: 40 },
  { type: 'ELIZA_CABINET',    col: 32, row: 2, pxX: 527, pxY: 40 },
  { type: 'ELIZA_CABINET',    col: 34, row: 2, pxX: 559, pxY: 40 },
  { type: 'ELIZA_CABINET',    col: 36, row: 2, pxX: 591, pxY: 40 },
  // Sink px(536,77) grid[33,4]
  { type: 'ELIZA_SINK',       col: 33, row: 4, pxX: 536, pxY: 77 },
  // KitchenClutter px(574,71) grid[35,4]
  { type: 'ELIZA_KITCHEN_CLUTTER', col: 35, row: 4, pxX: 574, pxY: 71 },
  // Kitchen table with stools (rows 9-12)
  // Table px(545,157) grid[34,9], px(545,175) grid[34,10]
  { type: 'ELIZA_TABLE',      col: 34, row: 9,  pxX: 545, pxY: 157 },
  { type: 'ELIZA_TABLE',      col: 34, row: 10, pxX: 545, pxY: 175 },
  // Stools px positions from LDtk
  { type: 'ELIZA_STOOL',      col: 31, row: 9,  pxX: 496, pxY: 155 },
  { type: 'ELIZA_STOOL',      col: 31, row: 11, pxX: 496, pxY: 176 },
  { type: 'ELIZA_STOOL',      col: 37, row: 9,  pxX: 593, pxY: 155 },
  { type: 'ELIZA_STOOL',      col: 37, row: 10, pxX: 593, pxY: 174 },
  { type: 'ELIZA_STOOL',      col: 33, row: 12, pxX: 528, pxY: 195 },
  { type: 'ELIZA_STOOL',      col: 35, row: 12, pxX: 561, pxY: 196 },
  // Runner rug px(536,121) grid[33,7]
  { type: 'ELIZA_RUNNER',    col: 33, row: 7, pxX: 536, pxY: 121 },
  // Copy machine px(576,240) grid[36,15]
  { type: 'ELIZA_COPY_MACHINE', col: 36, row: 15, pxX: 576, pxY: 240 },

  // ── Lower section: Reed's workstation ──
  // LDtk: Desk_2 px(72,440) grid[4,27], Chair px(52,417) grid[3,26]
  // Monitors_3 px(53,430) grid[3,26], Papers px(106,428) grid[6,26]
  // Coffee_Mug px(54,424) grid[3,26]
  { type: 'ELIZA_DESK',    col: 4,  row: 27 },
  { type: 'ELIZA_CHAIR',   col: 3,  row: 26 },
  { type: 'ELIZA_MONITOR3',col: 3,  row: 26, pxX: 53,  pxY: 430 },
  { type: 'ELIZA_PAPER',   col: 6,  row: 26, pxX: 106, pxY: 428 },
  { type: 'ELIZA_MUG',     col: 3,  row: 26, pxX: 54,  pxY: 424 },

  // ── Lower section: Sentinel's workstation ──
  // LDtk: Desk_2 px(200,440) grid[12,27], Chair px(200,415) grid[12,25]
  // Laptop px(200,281) grid[12,17], Table_Lamp px(232,274) grid[14,17]
  // Coffee_Mug px(218,278) grid[13,17], Book px(173,272) grid[10,17]
  { type: 'ELIZA_DESK',    col: 12, row: 27 },
  { type: 'ELIZA_CHAIR',   col: 12, row: 25 },
  { type: 'ELIZA_LAPTOP',  col: 12, row: 17, pxX: 200, pxY: 281 },
  { type: 'ELIZA_TABLE_LAMP', col: 14, row: 17, pxX: 232, pxY: 274 },
  { type: 'ELIZA_MUG',     col: 13, row: 17, pxX: 218, pxY: 278 },
  { type: 'ELIZA_BOOK',    col: 10, row: 17, pxX: 173, pxY: 272 },

  // ── Lower section: Tide's workstation ──
  // LDtk: Desk_2 px(328,440) grid[20,27], Chair px(344,413) grid[21,25]
  // Monitors_3 px(344,429) grid[21,26], Phone px(80,411) grid[5,25]
  // Coffee_Mug px(314,425) grid[19,26], Money px(288,408) grid[18,25]
  { type: 'ELIZA_DESK',    col: 20, row: 27 },
  { type: 'ELIZA_CHAIR',   col: 21, row: 25 },
  { type: 'ELIZA_MONITOR3', col: 21, row: 26, pxX: 344, pxY: 429 },
  { type: 'ELIZA_PHONE',   col: 5,  row: 25, pxX: 80,  pxY: 411 },
  { type: 'ELIZA_MUG',     col: 19, row: 26, pxX: 314, pxY: 425 },

  // ── Corridor / shared area desks (rows 16-19) ──
  // LDtk: Chair px(200,268) grid[12,16], Desk_2 px(200,293) grid[12,18]
  // Laptop px(200,281) is on corridor desk but assigned to Sentinel above
  { type: 'ELIZA_CHAIR',   col: 12, row: 16 },   // Chair (grid [12,16])
  { type: 'ELIZA_DESK',    col: 12, row: 18 },   // Corridor desk (grid [12,18])

  // ── Misc items ──
  // Entity2 at grid[3,3] px(56,59) — small cabinet/printer area (Entity2 type not defined, skip)
  // Printer px(83,60) grid[5,3]
  { type: 'ELIZA_PRINTER', col: 5,  row: 3, pxX: 83, pxY: 60 },
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
