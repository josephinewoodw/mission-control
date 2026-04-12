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
    // LDtk Tile_Floor layer data:
    //   Row 4 strip (cols 30-37): src(112,112) — tile at col 7, row 7
    //   Rows 6-15 break room (cols 28-39): src(96,0) — tile at col 6, row 0
    const tileImg = getTileImage(ELIZA_TILE_FLOOR_PATH)
    if (tileImg) {
      let srcX: number
      let srcY: number
      if (ty === 4) {
        // Row 4 strip uses a different tile variant
        srcX = 112
        srcY = 112
      } else {
        // Standard break room tile
        srcX = 96
        srcY = 0
      }
      ctx.drawImage(tileImg, srcX, srcY, 16, 16, x, y, TILE, TILE)
      return
    }
    // Fallback
    ctx.fillStyle = (tx + ty) % 2 === 0 ? '#c8bfaa' : '#a89880'
    ctx.fillRect(x, y, TILE, TILE)
    return
  }

  // Wood floor — use Wood Floor A tileset (160x192px, 10x12 grid at 16px)
  // LDtk Floor layer data: 8 unique tile types at src(0,32),(0,48),(0,64),(0,80),(16,32),(16,48),(16,64),(16,80)
  // That's 2 columns (x=0,16) × 4 rows (y=32,48,64,80) = rows 2-5 of the tileset
  const srcCol = (tx + ty) % 2             // alternates 0 or 1 → x = 0 or 16
  const srcRow = 2 + ((tx * 2 + ty) % 4)  // rows 2-5 → y = 32,48,64,80
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
 *
 * Source rects from LDtk Walls layer:
 *   Top wall (rows 0-5): srcX alternates 128/144 by column, srcY = row*16 + 192
 *     Row 0: srcY=192, Row 1: srcY=208, ..., Row 5: srcY=272
 *   Row 6 break room back wall (cols 28-34): srcX=128/144, srcY=272 (bottom wall row)
 *   Center divider (cols 26-27): same as outer wall for visual consistency
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
        // Use LDtk source rects: srcX alternates 128/144 per column, srcY advances by row
        // Top wall rows 0-5: srcY = row * 16 + 192 (rows 12-17 of tileset = 192-272px)
        // Row 6 back wall and any lower walls: use srcY=272 (bottom tile row)
        const srcX = (tx % 2 === 0) ? 128 : 144
        const clampedRow = Math.min(ty, 5)
        const srcY = clampedRow * 16 + 192  // 192, 208, 224, 240, 256, 272
        ctx.drawImage(wallImg, srcX, srcY, 16, 16, x, y, TILE, TILE)
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

  // First pass: draw pulsing halo rings around collaborating characters
  for (const char of characters) {
    if (!char.collaboratingWith) continue
    const haloAlpha = 0.18 + 0.12 * Math.sin(time / 500)
    const haloRadius = 20 + 3 * Math.sin(time / 700)
    const cx = char.x + halfSprite
    const cy = char.y + halfSprite
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, haloRadius, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(120, 200, 180, ${haloAlpha * 2})`
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx, cy, haloRadius + 4, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(120, 200, 180, ${haloAlpha})`
    ctx.lineWidth = 0.5
    ctx.stroke()
    ctx.restore()
  }

  // Second pass: draw curved arc between collaborating pairs
  for (const char of characters) {
    if (!char.collaboratingWith) continue
    const partner = characters.find(c => c.name === char.collaboratingWith)
    if (!partner) continue

    // Avoid drawing the same arc twice
    const key = [char.name, partner.name].sort().join('-')
    if (drawn.has(key)) continue
    drawn.add(key)

    const x1 = char.x + halfSprite
    const y1 = char.y + halfSprite
    const x2 = partner.x + halfSprite
    const y2 = partner.y + halfSprite

    // Control point: offset perpendicular to the line for a gentle arc
    const mx = (x1 + x2) / 2
    const my = (y1 + y2) / 2
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    // Perpendicular offset: 20% of the distance, alternating direction
    const perpScale = 0.2
    const cpx = mx - (dy / len) * len * perpScale
    const cpy = my + (dx / len) * len * perpScale

    // Animated pulse: alpha oscillates with time
    const pulse = 0.35 + 0.2 * Math.sin(time / 600)

    // Glow pass (wider, more transparent)
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.quadraticCurveTo(cpx, cpy, x2, y2)
    ctx.strokeStyle = `rgba(120, 200, 180, ${pulse * 0.4})`
    ctx.lineWidth = 4
    ctx.setLineDash([])
    ctx.stroke()
    ctx.restore()

    // Main dashed arc
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.quadraticCurveTo(cpx, cpy, x2, y2)
    ctx.strokeStyle = `rgba(120, 200, 180, ${pulse})`
    ctx.lineWidth = 1.5
    ctx.setLineDash([5, 7])
    ctx.lineDashOffset = -(time / 100) % 12
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()

    // Two traveling dots along the arc (bidirectional data flow)
    for (let i = 0; i < 2; i++) {
      // Each dot offset by 0.5 in t-space so they appear on opposite ends
      const t = ((time / 1200 + i * 0.5) % 1)
      // Quadratic bezier position
      const bx = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cpx + t * t * x2
      const by = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cpy + t * t * y2
      const dotAlpha = 0.6 + 0.3 * Math.sin(time / 300 + i * Math.PI)
      ctx.save()
      ctx.beginPath()
      ctx.arc(bx, by, 2, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(160, 230, 210, ${dotAlpha})`
      ctx.fill()
      ctx.restore()
    }
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
