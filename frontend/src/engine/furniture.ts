import { TILE } from './constants'
import { getTileImage, getFurnitureAsset } from './spriteCache'
import { FURNITURE_LAYOUT } from './tileMap'
import type { FurniturePlacement } from './tileMap'

/**
 * A placed furniture item in the office scene.
 */
export interface PlacedFurniture {
  type: string         // Furniture asset ID
  col: number          // Tile column position
  row: number          // Tile row position
  mirrored?: boolean   // Draw horizontally flipped
  zY: number           // Y-sort value for draw order
}

/**
 * Build furniture layout from the hardcoded FURNITURE_LAYOUT.
 */
export function buildFurnitureLayout(): PlacedFurniture[] {
  const items: PlacedFurniture[] = []

  for (const item of FURNITURE_LAYOUT) {
    const asset = getFurnitureAsset(item.type)
    const footprintH = asset?.footprintH ?? 1

    // Floor-level items (rugs) render below everything else
    const isFloorLevel = item.type === 'RUG'
    // Surface items (laptops, coffee cups) need to draw ON TOP of the surface
    // they sit on, so boost their zY to sort after the desk/table at the same row
    const isSurfaceItem = asset?.canPlaceOnSurfaces ?? false
    const surfaceBoost = isSurfaceItem ? TILE + 1 : 0
    items.push({
      type: item.type,
      col: item.col,
      row: item.row,
      mirrored: item.mirrored ?? false,
      zY: isFloorLevel ? -1 : (item.row + footprintH) * TILE + surfaceBoost,
    })
  }

  return items
}

/** Cached layout */
let cachedLayout: PlacedFurniture[] | null = null

export function getFurnitureLayout(): PlacedFurniture[] {
  if (!cachedLayout) {
    cachedLayout = buildFurnitureLayout()
  }
  return cachedLayout
}

/** Clear cached layout (call after layout is loaded/changed) */
export function clearFurnitureCache() {
  cachedLayout = null
}

/**
 * Draw a single furniture sprite at its tile position.
 * LPC sprites are drawn at native 32px resolution — no scaling needed.
 */
export function drawFurnitureSprite(
  ctx: CanvasRenderingContext2D,
  item: PlacedFurniture,
) {
  const asset = getFurnitureAsset(item.type)
  if (!asset) {
    // Fallback: draw a small brown rectangle
    ctx.fillStyle = '#6b4f32'
    ctx.fillRect(item.col * TILE, item.row * TILE, TILE, TILE)
    return
  }

  // Special case: arcade cabinet drawn procedurally
  if (item.type === 'ARCADE_CABINET') {
    const x = item.col * TILE
    const footprintBottom = (item.row + 1) * TILE
    const y = footprintBottom - 64 // 2 tiles tall

    // Cabinet body — dark charcoal
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(x + 2, y + 4, 28, 58)

    // Cabinet side bevel (left + right edges darker)
    ctx.fillStyle = '#0f0f1a'
    ctx.fillRect(x + 2, y + 4, 3, 58)
    ctx.fillRect(x + 27, y + 4, 3, 58)

    // Top marquee area — bright colored banner
    ctx.fillStyle = '#e63946'
    ctx.fillRect(x + 5, y + 5, 22, 8)
    // Marquee text dots (pixel art "GAME")
    ctx.fillStyle = '#ffdd57'
    ctx.fillRect(x + 8, y + 7, 2, 4)
    ctx.fillRect(x + 12, y + 7, 2, 4)
    ctx.fillRect(x + 16, y + 7, 2, 4)
    ctx.fillRect(x + 20, y + 7, 2, 4)

    // Screen bezel
    ctx.fillStyle = '#2d2d44'
    ctx.fillRect(x + 5, y + 15, 22, 22)

    // Screen — glowing blue-green
    ctx.fillStyle = '#0a2e3d'
    ctx.fillRect(x + 7, y + 17, 18, 18)

    // Screen pixel art pattern — simple space invader shape
    ctx.fillStyle = '#39ff14'
    // Row 1
    ctx.fillRect(x + 11, y + 20, 2, 2)
    ctx.fillRect(x + 19, y + 20, 2, 2)
    // Row 2
    ctx.fillRect(x + 13, y + 22, 2, 2)
    ctx.fillRect(x + 17, y + 22, 2, 2)
    // Row 3 — full bar
    ctx.fillRect(x + 11, y + 24, 10, 2)
    // Row 4 — wings
    ctx.fillRect(x + 9, y + 26, 4, 2)
    ctx.fillRect(x + 19, y + 26, 4, 2)
    ctx.fillRect(x + 13, y + 26, 6, 2)
    // Row 5 — full bar with gaps
    ctx.fillRect(x + 9, y + 28, 14, 2)
    // Row 6 — feet
    ctx.fillRect(x + 11, y + 30, 2, 2)
    ctx.fillRect(x + 19, y + 30, 2, 2)

    // Screen glow effect
    ctx.fillStyle = 'rgba(57, 255, 20, 0.06)'
    ctx.fillRect(x + 3, y + 14, 26, 26)

    // Control panel
    ctx.fillStyle = '#2a2a3e'
    ctx.fillRect(x + 5, y + 39, 22, 10)

    // Joystick
    ctx.fillStyle = '#555'
    ctx.fillRect(x + 10, y + 41, 3, 3)
    ctx.fillStyle = '#e63946'
    ctx.fillRect(x + 10, y + 39, 3, 2)

    // Buttons
    ctx.fillStyle = '#ff6b6b'
    ctx.fillRect(x + 18, y + 41, 3, 3)
    ctx.fillStyle = '#4ecdc4'
    ctx.fillRect(x + 22, y + 41, 3, 3)

    // Base/stand — slightly wider
    ctx.fillStyle = '#111122'
    ctx.fillRect(x + 4, y + 51, 24, 11)
    // Base front panel detail
    ctx.fillStyle = '#1a1a30'
    ctx.fillRect(x + 6, y + 53, 20, 7)

    // Coin slot
    ctx.fillStyle = '#ffdd57'
    ctx.fillRect(x + 14, y + 55, 4, 2)

    return
  }

  // Special case: rug is drawn as a colored overlay, no sprite needed
  if (item.type === 'RUG') {
    const rx = item.col * TILE
    const ry = item.row * TILE
    const rw = asset.footprintW * TILE
    const rh = asset.footprintH * TILE
    // Visible rug with warm red-brown tones and decorative border
    ctx.fillStyle = 'rgba(120, 50, 30, 0.5)'
    ctx.fillRect(rx + 2, ry + 2, rw - 4, rh - 4)
    // Inner pattern
    ctx.fillStyle = 'rgba(140, 70, 40, 0.4)'
    ctx.fillRect(rx + 6, ry + 6, rw - 12, rh - 12)
    // Border
    ctx.strokeStyle = 'rgba(160, 90, 50, 0.7)'
    ctx.lineWidth = 2
    ctx.strokeRect(rx + 3, ry + 3, rw - 6, rh - 6)
    // Inner border
    ctx.strokeStyle = 'rgba(180, 120, 70, 0.4)'
    ctx.lineWidth = 1
    ctx.strokeRect(rx + 7, ry + 7, rw - 14, rh - 14)
    return
  }

  const img = getTileImage(asset.imagePath)
  if (!img) {
    // Image not loaded yet — draw placeholder
    ctx.fillStyle = '#6b4f32'
    ctx.fillRect(item.col * TILE, item.row * TILE, asset.footprintW * TILE, asset.footprintH * TILE)
    return
  }

  // Ensure crisp pixel art scaling (especially for Pixel Agents 16px sprites at 2x)
  ctx.imageSmoothingEnabled = false

  const x = item.col * TILE
  // Sprites extend upward from their footprint bottom, anchored at bottom of footprint
  const footprintBottom = (item.row + asset.footprintH) * TILE
  let y = footprintBottom - asset.height

  // Items that sit on surfaces (laptops, coffee cups) get a Y offset
  // to visually appear on top of the desk/table surface.
  if (asset.canPlaceOnSurfaces) {
    y -= Math.floor(TILE * 0.35)
  }

  const sr = asset.sourceRect

  if (item.mirrored) {
    ctx.save()
    ctx.translate(x + asset.width, y)
    ctx.scale(-1, 1)
    if (sr) {
      ctx.drawImage(img, sr.sx, sr.sy, sr.sw, sr.sh, 0, 0, asset.width, asset.height)
    } else {
      ctx.drawImage(img, 0, 0, asset.width, asset.height)
    }
    ctx.restore()
  } else {
    if (sr) {
      ctx.drawImage(img, sr.sx, sr.sy, sr.sw, sr.sh, x, y, asset.width, asset.height)
    } else {
      ctx.drawImage(img, x, y, asset.width, asset.height)
    }
  }
}

/** Draw all furniture sprites (y-sorted) */
export function drawFurniture(ctx: CanvasRenderingContext2D) {
  const layout = getFurnitureLayout()

  // Sort by zY for correct overlap
  const sorted = [...layout].sort((a, b) => a.zY - b.zY)

  for (const item of sorted) {
    drawFurnitureSprite(ctx, item)
  }
}

/** Draw break room elements — now handled by drawFurniture via the layout */
export function drawBreakRoom(_ctx: CanvasRenderingContext2D) {
  // Break room items are part of the unified furniture layout
}

/** Draw wall decorations — now handled by drawFurniture via the layout */
export function drawWallDecorations(_ctx: CanvasRenderingContext2D, _time: number) {
  // Wall items are part of the unified furniture layout
}
