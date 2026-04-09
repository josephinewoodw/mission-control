import { CANVAS_W, CANVAS_H, TILE, COLORS, FRAME_SIZE, SPRITE_SIZE } from './constants'
import type { Character } from './character'
import type { AgentName } from '../types'
import { getTile, getLayoutMap } from './tileMap'
import { getSprite, getTileImage, getColorizedTile, getWallPiece } from './spriteCache'
import { drawFurniture, drawBreakRoom, drawWallDecorations } from './furniture'

// ── Floor tile paths for sprite lookup ───────────────────────────
const FLOOR_TILE_PATHS = Array.from({ length: 9 }, (_, i) => `/pixel-agents/floors/floor_${i}.png`)

/**
 * Default warm-wood HSL for floor colorization.
 * Gives a warm brown tone to the grayscale floor tiles.
 */
const FLOOR_HSL = { h: 30, s: 30, b: -10, c: 0 }

/** Floor colors by tile type */
const FLOOR_COLOR_WORK = '#4a3828'       // Warm wood for work area
const FLOOR_COLOR_BREAK = '#3a3a42'      // Cooler blue-gray tone for break room
const KITCHEN_TILE_LIGHT = '#c8bfaa'     // Light cream/beige tile
const KITCHEN_TILE_DARK = '#a89880'      // Darker warm tile for checkerboard

/** Draw the floor layer using Pixel Agents floor tiles at 2x scale (16px -> 32px) */
function drawFloor(ctx: CanvasRenderingContext2D) {
  const layout = getLayoutMap()
  const rows = layout.length
  const cols = rows > 0 ? layout[0].length : 0

  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      const tileVal = layout[ty]?.[tx]

      // Skip walls (handled separately) and void tiles
      if (tileVal === 0 || tileVal === 255 || tileVal === undefined) continue

      const x = tx * TILE
      const y = ty * TILE

      if (tileVal === 3) {
        // Kitchenette checkerboard tile floor
        const isLight = (tx + ty) % 2 === 0
        ctx.fillStyle = isLight ? KITCHEN_TILE_LIGHT : KITCHEN_TILE_DARK
        ctx.fillRect(x, y, TILE, TILE)
        // Grout lines for tile effect
        ctx.fillStyle = 'rgba(90,80,65,0.4)'
        ctx.fillRect(x, y + TILE - 1, TILE, 1)
        ctx.fillRect(x + TILE - 1, y, 1, TILE)
        // Subtle inner highlight for tile depth
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
        ctx.fillRect(x + 1, y + 1, TILE - 2, 1)
        ctx.fillRect(x + 1, y + 1, 1, TILE - 2)
      } else {
        // Different floor color for break room (tile value 2) vs work area (tile value 1)
        ctx.fillStyle = tileVal === 2 ? FLOOR_COLOR_BREAK : FLOOR_COLOR_WORK
        ctx.fillRect(x, y, TILE, TILE)
        // Subtle grid lines between tiles for depth
        ctx.fillStyle = tileVal === 2 ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.08)'
        ctx.fillRect(x, y + TILE - 1, TILE, 1) // horizontal line
        ctx.fillRect(x + TILE - 1, y, 1, TILE) // vertical line
      }
    }
  }
}

/**
 * Default wall HSL — darker brown for walls.
 */
const WALL_HSL = { h: 214, s: 30, b: -100, c: -55 }

/**
 * Draw walls using Pixel Agents wall sprites at 2x scale with auto-tiling.
 * 4-bit bitmask: N=1, E=2, S=4, W=8.
 */
function drawWalls(ctx: CanvasRenderingContext2D) {
  const layout = getLayoutMap()
  const rows = layout.length
  const cols = rows > 0 ? layout[0].length : 0

  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      const tileVal = layout[ty]?.[tx]
      if (tileVal !== 0) continue // Only wall tiles

      const x = tx * TILE
      const y = ty * TILE

      // Build 4-bit bitmask from cardinal neighbors
      let mask = 0
      if (ty > 0 && layout[ty - 1]?.[tx] === 0) mask |= 1 // N
      if (tx < cols - 1 && layout[ty]?.[tx + 1] === 0) mask |= 2 // E
      if (ty < rows - 1 && layout[ty + 1]?.[tx] === 0) mask |= 4 // S
      if (tx > 0 && layout[ty]?.[tx - 1] === 0) mask |= 8 // W

      const wallPiece = getWallPiece(mask, WALL_HSL.h, WALL_HSL.s, WALL_HSL.b, WALL_HSL.c)
      if (wallPiece) {
        // wallPiece is already 32x64 (scaled 2x in spriteCache)
        // Anchor at bottom of the tile cell
        const pieceH = wallPiece.height
        const drawY = y + TILE - pieceH
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(wallPiece, x, drawY, TILE, pieceH)
      } else {
        // Fallback: solid wall color
        ctx.fillStyle = COLORS.wallBase
        ctx.fillRect(x, y, TILE, TILE)
      }
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

  // Layer 1: Floor tiles (Pixel Agents at 2x scale)
  drawFloor(ctx)

  // Layer 2: Walls (Pixel Agents at 2x scale with auto-tiling)
  drawWalls(ctx)

  // Layer 3: Wall decorations (handled by furniture system)
  drawWallDecorations(ctx, time)

  // Layer 4: Furniture (LPC sprites at native 32px, y-sorted)
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
