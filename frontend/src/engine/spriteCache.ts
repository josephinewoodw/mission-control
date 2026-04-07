import type { AgentName } from '../types'

// ── Character spritesheets (LPC 64x64) ──────────────────────────

const SPRITESHEET_PATHS: Record<AgentName, string> = {
  fern:     '/assets/fern-spritesheet.png',
  scout:    '/assets/scout-spritesheet.png',
  reed:     '/assets/reed-spritesheet.png',
  sentinel: '/assets/sentinel-spritesheet.png',
  timber:   '/assets/timber-spritesheet.png',
  tide:     '/assets/tide-spritesheet.png',
}

const cache = new Map<string, HTMLImageElement>()
let loaded = false
let loadPromise: Promise<void> | null = null

/** Load a single image and resolve when ready */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const existing = cache.get(src)
    if (existing && existing.complete) {
      resolve(existing)
      return
    }
    const img = new Image()
    img.onload = () => {
      cache.set(src, img)
      resolve(img)
    }
    img.onerror = () => reject(new Error(`Failed to load: ${src}`))
    img.src = src
  })
}

/** Preload all 4 agent spritesheets. Returns a promise that resolves when all are ready. */
export function preloadSprites(): Promise<void> {
  if (loaded) return Promise.resolve()
  if (loadPromise) return loadPromise

  const agents: AgentName[] = ['fern', 'scout', 'reed', 'sentinel', 'timber', 'tide']
  loadPromise = Promise.all(agents.map(name => loadImage(SPRITESHEET_PATHS[name])))
    .then(() => { loaded = true })

  return loadPromise
}

/** Get a cached spritesheet image. Returns undefined if not yet loaded. */
export function getSprite(agent: AgentName): HTMLImageElement | undefined {
  return cache.get(SPRITESHEET_PATHS[agent])
}

/** Check if all sprites are loaded */
export function spritesReady(): boolean {
  return loaded
}

// ── Tile & furniture image loading ───────────────────────────────

const tileImageCache = new Map<string, HTMLImageElement>()
let tilesLoaded = false
let tileLoadPromise: Promise<void> | null = null

/** Load a single tile/furniture image (uses its own cache separate from spritesheets) */
function loadTileImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const existing = tileImageCache.get(src)
    if (existing && existing.complete) {
      resolve(existing)
      return
    }
    const img = new Image()
    img.onload = () => {
      tileImageCache.set(src, img)
      resolve(img)
    }
    img.onerror = () => {
      console.warn(`Failed to load tile image: ${src}`)
      reject(new Error(`Failed to load: ${src}`))
    }
    img.src = src
  })
}

/** Get a cached tile image */
export function getTileImage(src: string): HTMLImageElement | undefined {
  return tileImageCache.get(src)
}

// Floor tile paths (floor_0.png through floor_8.png — 16px source, drawn at 2x = 32px)
const FLOOR_TILE_PATHS = Array.from({ length: 9 }, (_, i) => `/pixel-agents/floors/floor_${i}.png`)

// Wall tile path (16x32 pieces, drawn at 2x = 32x64)
const WALL_TILE_PATH = '/pixel-agents/walls/wall_0.png'

/** Furniture manifest info */
export interface FurnitureAssetInfo {
  id: string
  name: string
  category: string
  width: number   // pixel width of drawn sprite (native LPC 32px scale)
  height: number  // pixel height of drawn sprite
  footprintW: number  // tiles wide (at 32px per tile)
  footprintH: number  // tiles tall
  backgroundTiles: number  // how many tiles extend above the footprint
  imagePath: string
  canPlaceOnWalls?: boolean
  canPlaceOnSurfaces?: boolean
  orientation?: string
  mirrorSide?: boolean
  /** Source rectangle for atlas-based sprites (sx, sy, sw, sh in the source image) */
  sourceRect?: { sx: number; sy: number; sw: number; sh: number }
}

const furnitureAssets = new Map<string, FurnitureAssetInfo>()

/** Get a loaded furniture asset definition */
export function getFurnitureAsset(id: string): FurnitureAssetInfo | undefined {
  return furnitureAssets.get(id)
}

/** Get all loaded furniture assets */
export function getAllFurnitureAssets(): Map<string, FurnitureAssetInfo> {
  return furnitureAssets
}

// ── LPC furniture definitions (native 32px scale) ──────────────
// All LPC tiles are on a 32px grid. At TILE=32 they draw at native resolution.
// Each asset specifies:
//   - imagePath: the source PNG
//   - sourceRect: region within the image to sample
//   - width/height: the DRAWN size in pixels (native, no scaling)
//   - footprintW/H: tiles occupied on the 32px grid

const LPC_FURNITURE: FurnitureAssetInfo[] = [
  // ── Desks (Ornate Desk — 96x64 front-facing at row 1 of sheet) ──
  {
    id: 'DESK_FRONT', name: 'Ornate Desk', category: 'desk',
    width: 96, height: 64, footprintW: 3, footprintH: 2, backgroundTiles: 0,
    imagePath: '/lpc-tiles/office/Desk, Ornate.png',
    sourceRect: { sx: 0, sy: 64, sw: 96, sh: 64 },
  },
  // ── Laptop (32x32 each variant in 128x128 sheet) ──
  {
    id: 'PC_FRONT_OFF', name: 'Laptop Closed', category: 'electronics',
    width: 32, height: 32, footprintW: 1, footprintH: 1, backgroundTiles: 0,
    imagePath: '/lpc-tiles/office/Laptop.png',
    sourceRect: { sx: 0, sy: 96, sw: 32, sh: 32 },
    canPlaceOnSurfaces: true,
  },
  {
    id: 'PC_FRONT_ON', name: 'Laptop Open', category: 'electronics',
    width: 32, height: 32, footprintW: 1, footprintH: 1, backgroundTiles: 0,
    imagePath: '/lpc-tiles/office/Laptop.png',
    sourceRect: { sx: 0, sy: 0, sw: 32, sh: 32 },
    canPlaceOnSurfaces: true,
  },
  {
    id: 'PC_SIDE', name: 'Laptop Side', category: 'electronics',
    width: 32, height: 32, footprintW: 1, footprintH: 1, backgroundTiles: 0,
    imagePath: '/lpc-tiles/office/Laptop.png',
    sourceRect: { sx: 32, sy: 0, sw: 32, sh: 32 },
    canPlaceOnSurfaces: true,
  },
  // ── Chairs (Card Table — 32x32 each in row 0) ──
  {
    id: 'CUSHIONED_BENCH', name: 'Office Chair', category: 'seating',
    width: 32, height: 32, footprintW: 1, footprintH: 1, backgroundTiles: 0,
    imagePath: '/lpc-tiles/office/Card Table.png',
    sourceRect: { sx: 0, sy: 0, sw: 32, sh: 32 },
  },
  {
    id: 'CUSHIONED_CHAIR', name: 'Office Chair 2', category: 'seating',
    width: 32, height: 32, footprintW: 1, footprintH: 1, backgroundTiles: 0,
    imagePath: '/lpc-tiles/office/Card Table.png',
    sourceRect: { sx: 32, sy: 0, sw: 32, sh: 32 },
  },
  {
    id: 'WOODEN_CHAIR_SIDE', name: 'Side Chair', category: 'seating',
    width: 32, height: 32, footprintW: 1, footprintH: 1, backgroundTiles: 0,
    imagePath: '/lpc-tiles/office/Card Table.png',
    sourceRect: { sx: 64, sy: 0, sw: 32, sh: 32 },
  },
  // ── Bookshelves (interior.png atlas — 64x96 for double, 32x96 for single) ──
  {
    id: 'DOUBLE_BOOKSHELF', name: 'Bookshelf', category: 'storage',
    width: 64, height: 96, footprintW: 2, footprintH: 2, backgroundTiles: 1,
    imagePath: '/lpc-tiles/interior/interior.png',
    sourceRect: { sx: 0, sy: 160, sw: 64, sh: 96 },
    canPlaceOnWalls: true,
  },
  {
    id: 'BOOKSHELF', name: 'Small Bookshelf', category: 'storage',
    width: 32, height: 96, footprintW: 1, footprintH: 2, backgroundTiles: 1,
    imagePath: '/lpc-tiles/interior/interior.png',
    sourceRect: { sx: 64, sy: 160, sw: 32, sh: 96 },
    canPlaceOnWalls: true,
  },
  // ── Sofa (Card Table variants) ──
  {
    id: 'SOFA_SIDE', name: 'Sofa Side', category: 'seating',
    width: 32, height: 64, footprintW: 1, footprintH: 2, backgroundTiles: 0,
    imagePath: '/lpc-tiles/office/Card Table.png',
    sourceRect: { sx: 0, sy: 64, sw: 32, sh: 64 },
  },
  {
    id: 'SOFA_FRONT', name: 'Sofa Front', category: 'seating',
    width: 64, height: 32, footprintW: 2, footprintH: 1, backgroundTiles: 0,
    imagePath: '/lpc-tiles/office/Card Table.png',
    sourceRect: { sx: 0, sy: 128, sw: 64, sh: 32 },
  },
  {
    id: 'SOFA_BACK', name: 'Sofa Back', category: 'seating',
    width: 64, height: 32, footprintW: 2, footprintH: 1, backgroundTiles: 0,
    imagePath: '/lpc-tiles/office/Card Table.png',
    sourceRect: { sx: 64, sy: 128, sw: 64, sh: 32 },
  },
  // ── Plants (Pixel Agents indoor plants — 16px native, drawn at 2x = 32px) ──
  {
    id: 'PLANT', name: 'Potted Plant', category: 'decor',
    width: 32, height: 64, footprintW: 1, footprintH: 1, backgroundTiles: 1,
    imagePath: '/pixel-agents/furniture/PLANT/PLANT.png',
  },
  {
    id: 'PLANT_2', name: 'Potted Plant 2', category: 'decor',
    width: 32, height: 64, footprintW: 1, footprintH: 1, backgroundTiles: 1,
    imagePath: '/pixel-agents/furniture/PLANT_2/PLANT_2.png',
  },
  {
    id: 'PLANT_3', name: 'Potted Plant 3', category: 'decor',
    width: 32, height: 64, footprintW: 1, footprintH: 1, backgroundTiles: 1,
    imagePath: '/pixel-agents/furniture/PLANT/PLANT.png',
  },
  {
    id: 'LARGE_PLANT', name: 'Large Plant', category: 'decor',
    width: 64, height: 96, footprintW: 2, footprintH: 1, backgroundTiles: 2,
    imagePath: '/pixel-agents/furniture/LARGE_PLANT/LARGE_PLANT.png',
  },
  {
    id: 'CACTUS', name: 'Cactus', category: 'decor',
    width: 32, height: 64, footprintW: 1, footprintH: 1, backgroundTiles: 1,
    imagePath: '/pixel-agents/furniture/CACTUS/CACTUS.png',
  },
  {
    id: 'HANGING_PLANT', name: 'Hanging Plant', category: 'decor',
    width: 32, height: 64, footprintW: 1, footprintH: 1, backgroundTiles: 1,
    imagePath: '/pixel-agents/furniture/HANGING_PLANT/HANGING_PLANT.png',
    canPlaceOnWalls: true,
  },
  // ── Coffee Cup (32x32 single sprite) ──
  {
    id: 'COFFEE', name: 'Coffee Cup', category: 'decor',
    width: 32, height: 32, footprintW: 1, footprintH: 1, backgroundTiles: 0,
    imagePath: '/lpc-tiles/office/Coffee Cup.png',
    sourceRect: { sx: 0, sy: 0, sw: 32, sh: 32 },
    canPlaceOnSurfaces: true,
  },
  // ── Coffee Table (interior.png — 64x32) ──
  {
    id: 'COFFEE_TABLE', name: 'Coffee Table', category: 'furniture',
    width: 64, height: 32, footprintW: 2, footprintH: 1, backgroundTiles: 0,
    imagePath: '/lpc-tiles/interior/interior.png',
    sourceRect: { sx: 128, sy: 288, sw: 64, sh: 32 },
  },
  // ── Tables (interior.png) ──
  {
    id: 'TABLE_FRONT', name: 'Table', category: 'furniture',
    width: 64, height: 64, footprintW: 2, footprintH: 2, backgroundTiles: 0,
    imagePath: '/lpc-tiles/interior/interior.png',
    sourceRect: { sx: 128, sy: 288, sw: 64, sh: 64 },
  },
  {
    id: 'SMALL_TABLE_FRONT', name: 'Small Table', category: 'furniture',
    width: 32, height: 32, footprintW: 1, footprintH: 1, backgroundTiles: 0,
    imagePath: '/lpc-tiles/interior/interior.png',
    sourceRect: { sx: 128, sy: 288, sw: 32, sh: 32 },
  },
  {
    id: 'SMALL_TABLE_SIDE', name: 'Small Table Side', category: 'furniture',
    width: 32, height: 32, footprintW: 1, footprintH: 1, backgroundTiles: 0,
    imagePath: '/lpc-tiles/interior/interior.png',
    sourceRect: { sx: 160, sy: 288, sw: 32, sh: 32 },
  },
  // ── Bin (32x32) ──
  {
    id: 'BIN', name: 'Bin', category: 'decor',
    width: 32, height: 32, footprintW: 1, footprintH: 1, backgroundTiles: 0,
    imagePath: '/lpc-tiles/office/Bins.png',
    sourceRect: { sx: 0, sy: 0, sw: 32, sh: 32 },
  },
  // ── Wall decorations ──
  {
    id: 'RUG', name: 'Area Rug', category: 'decor',
    width: 96, height: 64, footprintW: 3, footprintH: 2, backgroundTiles: 0,
    imagePath: '',  // Rendered as a colored overlay — no atlas sprite needed
  },
  {
    id: 'SMALL_PAINTING', name: 'Office Portrait', category: 'decor',
    width: 32, height: 32, footprintW: 1, footprintH: 1, backgroundTiles: 0,
    imagePath: '/lpc-tiles/office/Office Portraits.png',
    sourceRect: { sx: 0, sy: 32, sw: 32, sh: 32 },
    canPlaceOnWalls: true,
  },
  {
    id: 'SMALL_PAINTING_2', name: 'Office Portrait 2', category: 'decor',
    width: 32, height: 32, footprintW: 1, footprintH: 1, backgroundTiles: 0,
    imagePath: '/lpc-tiles/office/Office Portraits.png',
    sourceRect: { sx: 32, sy: 32, sw: 32, sh: 32 },
    canPlaceOnWalls: true,
  },
  {
    id: 'LARGE_PAINTING', name: 'TV Widescreen', category: 'electronics',
    width: 96, height: 64, footprintW: 3, footprintH: 1, backgroundTiles: 1,
    imagePath: '/lpc-tiles/office/TV, Widescreen.png',
    sourceRect: { sx: 96, sy: 0, sw: 96, sh: 64 },
    canPlaceOnWalls: true,
  },
  {
    id: 'CLOCK', name: 'Clock', category: 'decor',
    width: 32, height: 64, footprintW: 1, footprintH: 1, backgroundTiles: 1,
    imagePath: '/lpc-tiles/interior/interior.png',
    sourceRect: { sx: 32, sy: 320, sw: 32, sh: 64 },
    canPlaceOnWalls: true,
  },
  // ── New LPC additions ──
  {
    id: 'COFFEE_MAKER', name: 'Coffee Maker', category: 'appliance',
    width: 32, height: 64, footprintW: 1, footprintH: 1, backgroundTiles: 1,
    imagePath: '/lpc-tiles/office/Coffee Maker.png',
    sourceRect: { sx: 0, sy: 0, sw: 32, sh: 64 },
    canPlaceOnSurfaces: true,
  },
  {
    id: 'WATER_COOLER', name: 'Water Cooler', category: 'appliance',
    width: 32, height: 64, footprintW: 1, footprintH: 1, backgroundTiles: 1,
    imagePath: '/lpc-tiles/office/Water Cooler.png',
    sourceRect: { sx: 0, sy: 0, sw: 32, sh: 64 },
    canPlaceOnSurfaces: true,
  },
  {
    id: 'COPY_MACHINE', name: 'Copy Machine', category: 'appliance',
    width: 64, height: 64, footprintW: 2, footprintH: 2, backgroundTiles: 0,
    imagePath: '/lpc-tiles/office/Copy Machine.png',
    sourceRect: { sx: 0, sy: 0, sw: 64, sh: 64 },
  },
  {
    id: 'MAILBOXES', name: 'Mailboxes', category: 'storage',
    width: 32, height: 32, footprintW: 1, footprintH: 1, backgroundTiles: 0,
    imagePath: '/lpc-tiles/office/Mailboxes.png',
    sourceRect: { sx: 0, sy: 0, sw: 32, sh: 32 },
  },
  // ── Arcade Cabinet (drawn with fillRect — no sprite needed) ──
  {
    id: 'ARCADE_CABINET', name: 'Arcade Cabinet', category: 'decor',
    width: 32, height: 64, footprintW: 1, footprintH: 1, backgroundTiles: 1,
    imagePath: '',  // Rendered procedurally with fillRect
  },
  // ── Additional wall decorations ──
  {
    id: 'PORTRAIT_3', name: 'Office Portrait 3', category: 'decor',
    width: 32, height: 32, footprintW: 1, footprintH: 1, backgroundTiles: 0,
    imagePath: '/lpc-tiles/office/Office Portraits.png',
    sourceRect: { sx: 0, sy: 0, sw: 32, sh: 32 },
    canPlaceOnWalls: true,
  },
  {
    id: 'PORTRAIT_4', name: 'Office Portrait 4', category: 'decor',
    width: 32, height: 32, footprintW: 1, footprintH: 1, backgroundTiles: 0,
    imagePath: '/lpc-tiles/office/Office Portraits.png',
    sourceRect: { sx: 32, sy: 64, sw: 32, sh: 32 },
    canPlaceOnWalls: true,
  },
  {
    id: 'WHITEBOARD', name: 'Whiteboard', category: 'decor',
    width: 64, height: 64, footprintW: 2, footprintH: 1, backgroundTiles: 1,
    imagePath: '/pixel-agents/furniture/WHITEBOARD/WHITEBOARD.png',
    canPlaceOnWalls: true,
  },
  {
    id: 'WALL_CLOCK_2', name: 'Wall Clock 2', category: 'decor',
    width: 32, height: 64, footprintW: 1, footprintH: 1, backgroundTiles: 1,
    imagePath: '/lpc-tiles/interior/interior.png',
    sourceRect: { sx: 64, sy: 320, sw: 32, sh: 64 },
    canPlaceOnWalls: true,
  },
  // ── Small desk items ──
  {
    id: 'POT', name: 'Small Pot', category: 'decor',
    width: 32, height: 32, footprintW: 1, footprintH: 1, backgroundTiles: 0,
    imagePath: '/pixel-agents/furniture/POT/POT.png',
    canPlaceOnSurfaces: true,
  },
  // ── Kitchen additions ──
  {
    id: 'SINK', name: 'Sink', category: 'appliance',
    width: 32, height: 64, footprintW: 1, footprintH: 1, backgroundTiles: 1,
    imagePath: '/lpc-tiles/office/Sink.png',
    sourceRect: { sx: 0, sy: 0, sw: 32, sh: 64 },
    canPlaceOnSurfaces: true,
  },
  {
    id: 'ROTARY_PHONE', name: 'Rotary Phone', category: 'electronics',
    width: 32, height: 32, footprintW: 1, footprintH: 1, backgroundTiles: 0,
    imagePath: '/lpc-tiles/office/Rotary Phones.png',
    sourceRect: { sx: 0, sy: 0, sw: 32, sh: 32 },
    canPlaceOnSurfaces: true,
  },
]

/** Preload all tile images (floors, walls, furniture). Call after preloadSprites. */
export function preloadTileAssets(): Promise<void> {
  if (tilesLoaded) return Promise.resolve()
  if (tileLoadPromise) return tileLoadPromise

  tileLoadPromise = (async () => {
    // Load floor tiles (16px source PNGs — drawn at 2x in renderer)
    const floorPromises = FLOOR_TILE_PATHS.map(p => loadTileImage(p).catch(() => null))

    // Load wall tile
    const wallPromise = loadTileImage(WALL_TILE_PATH).catch(() => null)

    // Register LPC furniture assets and load their images
    const lpcImagePaths = new Set<string>()
    for (const asset of LPC_FURNITURE) {
      furnitureAssets.set(asset.id, asset)
      lpcImagePaths.add(asset.imagePath)
    }
    const lpcPromises = [...lpcImagePaths].map(p => loadTileImage(p).catch(() => null))

    await Promise.all([...floorPromises, wallPromise, ...lpcPromises])
    tilesLoaded = true
  })()

  return tileLoadPromise
}

/** Check if tile assets are loaded */
export function tileAssetsReady(): boolean {
  return tilesLoaded
}

// ── HSL colorization for grayscale tile images ───────────────────

const colorizeCanvasCache = new Map<string, HTMLCanvasElement>()

export function getColorizedTile(
  img: HTMLImageElement,
  h: number, s: number, b: number, c: number,
  cacheKey: string,
): HTMLCanvasElement {
  const cached = colorizeCanvasCache.get(cacheKey)
  if (cached) return cached

  const w = img.naturalWidth
  const hh = img.naturalHeight
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = hh
  const ctx = canvas.getContext('2d')!

  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, w, hh)
  const data = imageData.data

  const satFrac = s / 100

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const bv = data[i + 2]
    const a = data[i + 3]
    if (a === 0) continue

    let lightness = (0.299 * r + 0.587 * g + 0.114 * bv) / 255

    if (c !== 0) {
      const factor = (100 + c) / 100
      lightness = 0.5 + (lightness - 0.5) * factor
    }

    if (b !== 0) {
      lightness = lightness + b / 200
    }

    lightness = Math.max(0, Math.min(1, lightness))

    const [nr, ng, nb] = hslToRgb(h, satFrac, lightness)
    data[i] = nr
    data[i + 1] = ng
    data[i + 2] = nb
  }

  ctx.putImageData(imageData, 0, 0)
  colorizeCanvasCache.set(cacheKey, canvas)
  return canvas
}

/** Convert HSL to RGB (h: 0-360, s: 0-1, l: 0-1) -> [r, g, b] 0-255 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const hp = h / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  let r1 = 0, g1 = 0, b1 = 0

  if (hp < 1)      { r1 = c; g1 = x; b1 = 0 }
  else if (hp < 2) { r1 = x; g1 = c; b1 = 0 }
  else if (hp < 3) { r1 = 0; g1 = c; b1 = x }
  else if (hp < 4) { r1 = 0; g1 = x; b1 = c }
  else if (hp < 5) { r1 = x; g1 = 0; b1 = c }
  else             { r1 = c; g1 = 0; b1 = x }

  const m = l - c / 2
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round((v + m) * 255)))
  return [clamp(r1), clamp(g1), clamp(b1)]
}

// ── Wall auto-tiling ─────────────────────────────────────────────

/**
 * Extract a single wall tile piece from the wall_0.png grid.
 * The image is 64x128 = a 4x4 grid of 16x32 tiles.
 * Bitmask 0-15 maps left-to-right, top-to-bottom (bitmask N=1, E=2, S=4, W=8).
 */
const wallPieceCache = new Map<string, HTMLCanvasElement>()

export function getWallPiece(bitmask: number, h: number, s: number, b: number, c: number): HTMLCanvasElement | null {
  const wallImg = tileImageCache.get(WALL_TILE_PATH)
  if (!wallImg) return null

  const cacheKey = `wall-${bitmask}-${h}-${s}-${b}-${c}`
  const cached = wallPieceCache.get(cacheKey)
  if (cached) return cached

  // Source: 4x4 grid of 16x32 pieces
  const pieceW = 16
  const pieceH = 32
  const gridCols = 4
  const gridCol = bitmask % gridCols
  const gridRow = Math.floor(bitmask / gridCols)
  const sx = gridCol * pieceW
  const sy = gridRow * pieceH

  // Draw at 2x scale (32x64) to match 32px tile grid
  const canvas = document.createElement('canvas')
  canvas.width = pieceW * 2
  canvas.height = pieceH * 2
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(wallImg, sx, sy, pieceW, pieceH, 0, 0, pieceW * 2, pieceH * 2)

  // Colorize
  const imageData = ctx.getImageData(0, 0, pieceW * 2, pieceH * 2)
  const data = imageData.data
  const satFrac = s / 100

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]
    if (a === 0) continue

    const r = data[i]
    const g = data[i + 1]
    const bv = data[i + 2]

    let lightness = (0.299 * r + 0.587 * g + 0.114 * bv) / 255

    if (c !== 0) {
      const factor = (100 + c) / 100
      lightness = 0.5 + (lightness - 0.5) * factor
    }
    if (b !== 0) {
      lightness = lightness + b / 200
    }
    lightness = Math.max(0, Math.min(1, lightness))

    const [nr, ng, nb] = hslToRgb(h, satFrac, lightness)
    data[i] = nr
    data[i + 1] = ng
    data[i + 2] = nb
  }

  ctx.putImageData(imageData, 0, 0)
  wallPieceCache.set(cacheKey, canvas)
  return canvas
}
