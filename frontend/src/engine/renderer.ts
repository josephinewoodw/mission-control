import { CANVAS_W, CANVAS_H, TILE, COLORS, FRAME_SIZE, SPRITE_SIZE } from './constants'
import type { Character } from './character'
import type { AgentName } from '../types'
import { getLayoutMap } from './tileMap'
import { getSprite, getTileImage } from './spriteCache'
import { drawFurniture, drawBreakRoom, drawWallDecorations } from './furniture'

// ── Eliza tileset paths ───────────────────────────────────────────
const ELIZA_WOOD_FLOOR_PATH   = '/eliza/structure/floor/Wood Floor A.png'
const ELIZA_TILE_FLOOR_PATH   = '/eliza/structure/floor/Tile B.png'
const ELIZA_WALL_PATH         = '/eliza/structure/walls/Brick Wall A.png'
const ELIZA_PAINTED_WALL_PATH = '/eliza/structure/walls/Painted Walls.png'

/**
 * Eliza Wood Floor A tileset: 160x192px, 10x12 grid of 16px tiles.
 * We use tiles from row 2-5 (warm wood planks).
 * Each call picks a tile based on (tx+ty) % to create a natural pattern.
 */
function drawElizaFloorTile(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  tx: number,
  ty: number,
  x: number,
  y: number,
  tileType: 1 | 2,
) {
  ctx.imageSmoothingEnabled = false

  if (tileType === 2) {
    // Tile floor (break room) — use Tile B tileset
    const tileImg = getTileImage(ELIZA_TILE_FLOOR_PATH)
    if (tileImg) {
      // Tile B is 128x128, 8x8 grid of 16px tiles — use a natural pattern
      const srcCol = ((tx * 3 + ty * 7) % 5)
      const srcRow = 4 + ((tx + ty * 2) % 3)
      ctx.drawImage(tileImg, srcCol * 16, srcRow * 16, 16, 16, x, y, TILE, TILE)
      return
    }
    // Fallback
    ctx.fillStyle = (tx + ty) % 2 === 0 ? '#c8bfaa' : '#a89880'
    ctx.fillRect(x, y, TILE, TILE)
    return
  }

  // Wood floor — use Wood Floor A tileset
  // The tileset has multiple wood plank variants to create visual variety
  // Use columns 0-3 (natural wood grain rows) cycling through patterns
  const srcCol = ((tx * 2 + ty) % 5)
  const srcRow = 2 + ((tx + ty * 3) % 4)
  ctx.drawImage(img, srcCol * 16, srcRow * 16, 16, 16, x, y, TILE, TILE)
}

/** Draw the floor layer using Eliza tileset assets at 1:1 scale (TILE=16) */
function drawFloor(ctx: CanvasRenderingContext2D) {
  const layout = getLayoutMap()
  const rows = layout.length
  const cols = rows > 0 ? layout[0].length : 0

  const woodImg = getTileImage(ELIZA_WOOD_FLOOR_PATH)

  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      const tileVal = layout[ty]?.[tx]

      // Skip walls and void tiles
      if (tileVal === 0 || tileVal === 255 || tileVal === undefined) continue

      const x = tx * TILE
      const y = ty * TILE

      if (woodImg) {
        drawElizaFloorTile(ctx, woodImg, tx, ty, x, y, tileVal === 2 ? 2 : 1)
      } else {
        // Fallback solid color
        ctx.fillStyle = tileVal === 2 ? '#3a4a55' : '#4a3828'
        ctx.fillRect(x, y, TILE, TILE)
      }
    }
  }
}

/**
 * Draw walls using Eliza Brick Wall A tileset.
 * The tileset is 192x288px, 12x18 grid of 16px tiles.
 * We sample rows 12-17 (cols 8-9) which appear to be standard brick wall tiles.
 */
function drawWalls(ctx: CanvasRenderingContext2D) {
  const layout = getLayoutMap()
  const rows = layout.length
  const cols = rows > 0 ? layout[0].length : 0

  const wallImg = getTileImage(ELIZA_WALL_PATH)

  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      const tileVal = layout[ty]?.[tx]
      if (tileVal !== 0) continue // Only wall tiles

      const x = tx * TILE
      const y = ty * TILE

      if (wallImg) {
        ctx.imageSmoothingEnabled = false
        // Use a natural brick pattern — vary slightly by position
        const srcCol = 8 + (tx % 2)
        const srcRow = 12 + (ty % 6)
        ctx.drawImage(wallImg, srcCol * 16, srcRow * 16, 16, 16, x, y, TILE, TILE)
      } else {
        // Fallback: solid wall color
        ctx.fillStyle = COLORS.wallBase
        ctx.fillRect(x, y, TILE, TILE)
      }
    }
  }
}

/**
 * Draw the Painted Walls overlay layer on top of brick walls.
 * The Painted Walls tileset (1536x512) uses tiles at:
 *   sx alternates 32/48 (2 tile variants), sy steps by 16 rows (256-336 = rows 16-21).
 * This covers the left wall zone (cols 0-25, rows 0-5 in 16px grid).
 * Data is from the LDtk Painted_Walls layer — 156 tiles covering x=0-400, y=0-80.
 */
function drawPaintedWalls(ctx: CanvasRenderingContext2D) {
  const paintedImg = getTileImage(ELIZA_PAINTED_WALL_PATH)
  if (!paintedImg) return

  ctx.imageSmoothingEnabled = false
  // The Painted_Walls layer covers rows 0-5 (y=0-95px), cols 0-25 (x=0-415px)
  // Pattern: alternating sx=32/48 per tile column, sy advances with row (256,272,288,304,320,336)
  const rows = 6
  const cols = 26
  for (let r = 0; r < rows; r++) {
    const sy = 256 + r * 16  // 256, 272, 288, 304, 320, 336
    for (let c = 0; c < cols; c++) {
      const sx = c % 2 === 0 ? 32 : 48  // alternating tile variant
      const x = c * TILE
      const y = r * TILE
      ctx.drawImage(paintedImg, sx, sy, 16, 16, x, y, TILE, TILE)
    }
  }
}

/** Draw a single character sprite from the LPC spritesheet */
export function drawCharacterSprite(
  ctx: CanvasRenderingContext2D,
  agentName: string,
  row: number,
  frame: number,
  x: number,
  y: number,
  grayscale: boolean = false,
) {
  const sprite = getSprite(agentName as AgentName)
  if (!sprite) return

  const sx = frame * FRAME_SIZE
  const sy = row * FRAME_SIZE

  if (grayscale) {
    ctx.save()
    ctx.filter = 'grayscale(100%)'
    ctx.globalAlpha = 0.6
  }

  ctx.drawImage(
    sprite,
    sx, sy, FRAME_SIZE, FRAME_SIZE,
    x, y, SPRITE_SIZE, SPRITE_SIZE,
  )

  if (grayscale) {
    ctx.restore()
  }
}

/** Draw characters sorted by y position for proper overlap */
function drawCharacters(ctx: CanvasRenderingContext2D, characters: Character[], time: number) {
  const sorted = [...characters].sort((a, b) => a.y - b.y)
  for (const char of sorted) {
    char.draw(ctx, time)
  }
}

/** Draw collaboration connection lines between agent pairs (drawn below characters) */
function drawCollaborationLines(ctx: CanvasRenderingContext2D, characters: Character[], time: number) {
  const halfSprite = Math.floor(SPRITE_SIZE / 2)
  const drawn = new Set<string>()

  for (const char of characters) {
    if (!char.collaboratingWith) continue
    const partner = characters.find(c => c.name === char.collaboratingWith)
    if (!partner) continue

    // Avoid drawing the same line twice
    const key = [char.name, partner.name].sort().join('-')
    if (drawn.has(key)) continue
    drawn.add(key)

    const x1 = char.x + halfSprite
    const y1 = char.y + halfSprite
    const x2 = partner.x + halfSprite
    const y2 = partner.y + halfSprite

    // Animated pulse: alpha oscillates with time
    const pulse = 0.3 + 0.2 * Math.sin(time / 600)

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = `rgba(120, 200, 180, ${pulse})`
    ctx.lineWidth = 1
    ctx.setLineDash([4, 6])
    ctx.lineDashOffset = -(time / 120) % 10
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()

    // Animated midpoint dot
    const mx = (x1 + x2) / 2
    const my = (y1 + y2) / 2
    const dotAlpha = 0.5 + 0.3 * Math.sin(time / 400)
    ctx.save()
    ctx.beginPath()
    ctx.arc(mx, my, 2.5, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(120, 200, 180, ${dotAlpha})`
    ctx.fill()
    ctx.restore()
  }
}

/** Draw overlays: speech bubbles, zzz, coffee emoji, name labels, status dots */
function drawOverlays(ctx: CanvasRenderingContext2D, characters: Character[], time: number) {
  const halfSprite = Math.floor(SPRITE_SIZE / 2)

  for (const char of characters) {
    const cx = char.x + halfSprite
    const cy = char.y

    // ── Speech bubble showing high-level task (or collaboration) ──
    const rawTask = char.highLevelTask || 'Standing by...'
    const isCollaborating = !!char.collaboratingWith && char.agentStatus === 'working'
    const collaboratorDisplayName = isCollaborating
      ? char.collaboratingWith!.charAt(0).toUpperCase() + char.collaboratingWith!.slice(1)
      : null
    const taskText = char.agentStatus === 'offline' ? 'Offline' :
      char.agentStatus === 'blocked' ? 'Waiting...' :
      char.state === 'SLEEPING' ? 'Napping...' :
      char.state === 'COFFEE_RUN' || char.state === 'AT_COFFEE' ? 'Coffee break' :
      char.state === 'STRETCHING' ? 'Stretching' :
      isCollaborating ? `With ${collaboratorDisplayName}...` :
      (rawTask.length > 25 ? rawTask.slice(0, 24) + '\u2026' : rawTask)
    if (taskText) {
      ctx.font = '7px monospace'
      ctx.textAlign = 'center'
      const textWidth = ctx.measureText(taskText).width
      const padX = 4
      const padY = 3
      const bubbleW = textWidth + padX * 2
      const bubbleH = 11
      // Clamp bubble X to stay within canvas bounds (2px margin)
      const margin = 2
      let bubbleX = cx - bubbleW / 2
      if (bubbleX < margin) bubbleX = margin
      if (bubbleX + bubbleW > CANVAS_W - margin) bubbleX = CANVAS_W - margin - bubbleW
      // Clamp bubble Y to not go above canvas
      let bubbleY = char.y - bubbleH - 4
      if (bubbleY < margin) bubbleY = margin
      // Recalculate text center based on clamped bubble position
      const bubbleCx = bubbleX + bubbleW / 2

      // Collaboration glow behind bubble
      if (isCollaborating) {
        const glowPulse = 0.35 + 0.2 * Math.sin(time / 500)
        ctx.save()
        ctx.shadowColor = `rgba(120, 200, 180, ${glowPulse})`
        ctx.shadowBlur = 6
        ctx.fillStyle = 'transparent'
        ctx.beginPath()
        const gr = 3
        ctx.moveTo(bubbleX + gr, bubbleY)
        ctx.lineTo(bubbleX + bubbleW - gr, bubbleY)
        ctx.arcTo(bubbleX + bubbleW, bubbleY, bubbleX + bubbleW, bubbleY + gr, gr)
        ctx.lineTo(bubbleX + bubbleW, bubbleY + bubbleH - gr)
        ctx.arcTo(bubbleX + bubbleW, bubbleY + bubbleH, bubbleX + bubbleW - gr, bubbleY + bubbleH, gr)
        ctx.lineTo(bubbleX + gr, bubbleY + bubbleH)
        ctx.arcTo(bubbleX, bubbleY + bubbleH, bubbleX, bubbleY + bubbleH - gr, gr)
        ctx.lineTo(bubbleX, bubbleY + gr)
        ctx.arcTo(bubbleX, bubbleY, bubbleX + gr, bubbleY, gr)
        ctx.closePath()
        ctx.fillStyle = 'rgba(20, 40, 38, 0.92)'
        ctx.fill()
        ctx.restore()
      }

      // Bubble background
      ctx.fillStyle = isCollaborating ? 'rgba(18, 38, 35, 0.92)' : 'rgba(20, 20, 35, 0.85)'
      ctx.beginPath()
      const r = 3
      ctx.moveTo(bubbleX + r, bubbleY)
      ctx.lineTo(bubbleX + bubbleW - r, bubbleY)
      ctx.arcTo(bubbleX + bubbleW, bubbleY, bubbleX + bubbleW, bubbleY + r, r)
      ctx.lineTo(bubbleX + bubbleW, bubbleY + bubbleH - r)
      ctx.arcTo(bubbleX + bubbleW, bubbleY + bubbleH, bubbleX + bubbleW - r, bubbleY + bubbleH, r)
      ctx.lineTo(bubbleX + r, bubbleY + bubbleH)
      ctx.arcTo(bubbleX, bubbleY + bubbleH, bubbleX, bubbleY + bubbleH - r, r)
      ctx.lineTo(bubbleX, bubbleY + r)
      ctx.arcTo(bubbleX, bubbleY, bubbleX + r, bubbleY, r)
      ctx.closePath()
      ctx.fill()

      // Tail triangle — points toward character center, clamped to bubble width
      const tailX = Math.max(bubbleX + 6, Math.min(cx, bubbleX + bubbleW - 6))
      ctx.beginPath()
      ctx.moveTo(tailX - 3, bubbleY + bubbleH)
      ctx.lineTo(tailX, bubbleY + bubbleH + 3)
      ctx.lineTo(tailX + 3, bubbleY + bubbleH)
      ctx.closePath()
      ctx.fill()

      // Border — teal for collaboration, default otherwise
      ctx.strokeStyle = isCollaborating
        ? `rgba(120, 200, 180, ${0.5 + 0.3 * Math.sin(time / 500)})`
        : 'rgba(255, 255, 255, 0.2)'
      ctx.lineWidth = isCollaborating ? 0.8 : 0.5
      ctx.beginPath()
      ctx.moveTo(bubbleX + r, bubbleY)
      ctx.lineTo(bubbleX + bubbleW - r, bubbleY)
      ctx.arcTo(bubbleX + bubbleW, bubbleY, bubbleX + bubbleW, bubbleY + r, r)
      ctx.lineTo(bubbleX + bubbleW, bubbleY + bubbleH - r)
      ctx.arcTo(bubbleX + bubbleW, bubbleY + bubbleH, bubbleX + bubbleW - r, bubbleY + bubbleH, r)
      ctx.lineTo(bubbleX + r, bubbleY + bubbleH)
      ctx.arcTo(bubbleX, bubbleY + bubbleH, bubbleX, bubbleY + bubbleH - r, r)
      ctx.lineTo(bubbleX, bubbleY + r)
      ctx.arcTo(bubbleX, bubbleY, bubbleX + r, bubbleY, r)
      ctx.closePath()
      ctx.stroke()

      // Text — teal for collaboration, default otherwise
      ctx.fillStyle = isCollaborating ? '#78c8b4' : '#e0e0e0'
      ctx.shadowColor = 'rgba(0,0,0,0.5)'
      ctx.shadowBlur = 1
      ctx.fillText(taskText, bubbleCx, bubbleY + bubbleH - padY)
      ctx.shadowBlur = 0
    }

    // Zzz overlay for sleeping
    if (char.state === 'SLEEPING') {
      const bobY = Math.sin(time / 1000) * 3
      ctx.font = '14px serif'
      ctx.fillStyle = '#aac'
      ctx.shadowColor = 'rgba(0,0,0,0.8)'
      ctx.shadowBlur = 2
      ctx.fillText('\u{1F4A4}', char.x + SPRITE_SIZE + 2, cy - 2 + bobY)
      ctx.shadowBlur = 0
    }

    // Coffee overlay
    if (char.state === 'AT_COFFEE' || char.state === 'COFFEE_RUN') {
      const bobY = Math.sin(time / 1200) * 3
      ctx.font = '12px serif'
      ctx.fillText('\u2615', char.x + SPRITE_SIZE + 2, cy + bobY)
    }

    // Name label
    ctx.font = 'bold 10px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = char.color
    ctx.shadowColor = 'rgba(0,0,0,0.9)'
    ctx.shadowBlur = 3
    ctx.fillText(char.displayName, cx, char.y + SPRITE_SIZE + 12)
    ctx.shadowBlur = 0

    // Status dot
    const dotX = cx + ctx.measureText(char.displayName).width / 2 + 5
    const dotY = char.y + SPRITE_SIZE + 8
    const statusColor =
      char.agentStatus === 'working' ? COLORS.statusWorking :
      char.agentStatus === 'blocked' ? COLORS.statusBlocked :
      char.agentStatus === 'idle' ? COLORS.statusIdle :
      COLORS.statusOffline

    ctx.beginPath()
    ctx.arc(dotX, dotY, 3, 0, Math.PI * 2)
    ctx.fillStyle = statusColor
    ctx.fill()

    // Glow for working/blocked
    if (char.agentStatus === 'working' || char.agentStatus === 'blocked') {
      ctx.beginPath()
      ctx.arc(dotX, dotY, 5, 0, Math.PI * 2)
      ctx.fillStyle = char.agentStatus === 'working'
        ? 'rgba(74,158,74,0.3)'
        : 'rgba(231,76,60,0.3)'
      ctx.fill()
    }
  }
  ctx.textAlign = 'left'
}

/** Draw watermark */
function drawWatermark(ctx: CanvasRenderingContext2D) {
  ctx.font = '10px monospace'
  ctx.fillStyle = COLORS.watermark
  ctx.textAlign = 'right'
  ctx.letterSpacing = '2px'
  ctx.fillText('MISSION CONTROL', CANVAS_W - 14, CANVAS_H - 10)
  ctx.textAlign = 'left'
  ctx.letterSpacing = '0px'
}

/** Main render function — draws everything in layer order */
export function render(
  ctx: CanvasRenderingContext2D,
  characters: Character[],
  time: number,
) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

  // Layer 1: Floor tiles (Eliza Wood Floor A + Tile B at 1:1 TILE=16 scale)
  drawFloor(ctx)

  // Layer 2: Walls (Eliza Brick Wall A at 1:1 scale)
  drawWalls(ctx)

  // Layer 2.5: Painted wall overlay (Eliza Painted Walls on top of brick — left wall zone)
  drawPaintedWalls(ctx)

  // Layer 3: Wall decorations (handled by furniture system)
  drawWallDecorations(ctx, time)

  // Layer 4: Furniture (Eliza + LPC sprites, y-sorted)
  drawFurniture(ctx)
  drawBreakRoom(ctx)

  // Layer 5: Characters (LPC sprites at SPRITE_SIZE=48)
  drawCharacters(ctx, characters, time)

  // Layer 5.5: Collaboration lines (drawn above characters, below overlays)
  drawCollaborationLines(ctx, characters, time)

  // Layer 6: Overlays (names, status, emoji)
  drawOverlays(ctx, characters, time)

  // Layer 7: Watermark
  drawWatermark(ctx)
}
