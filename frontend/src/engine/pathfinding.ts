import { TILE, GRID_COLS, GRID_ROWS } from './constants'
import { isWalkable } from './tileMap'

interface Node {
  tx: number
  ty: number
  parent: Node | null
}

/**
 * BFS pathfinding on the tile grid.
 * Returns an array of pixel positions (center of each tile) from start to goal,
 * or null if no path exists.
 */
export function findPath(
  startX: number, startY: number,
  goalX: number, goalY: number,
): { x: number; y: number }[] | null {
  const startTx = Math.floor(startX / TILE)
  const startTy = Math.floor(startY / TILE)
  const goalTx = Math.floor(goalX / TILE)
  const goalTy = Math.floor(goalY / TILE)

  const stx = clamp(startTx, 0, GRID_COLS - 1)
  const sty = clamp(startTy, 0, GRID_ROWS - 1)
  const gtx = clamp(goalTx, 0, GRID_COLS - 1)
  const gty = clamp(goalTy, 0, GRID_ROWS - 1)

  if (stx === gtx && sty === gty) return []

  // BFS
  const visited = new Set<string>()
  const queue: Node[] = [{ tx: stx, ty: sty, parent: null }]
  visited.add(`${stx},${sty}`)

  const directions = [
    { dx: 0, dy: -1 }, // up
    { dx: 0, dy: 1 },  // down
    { dx: -1, dy: 0 }, // left
    { dx: 1, dy: 0 },  // right
  ]

  while (queue.length > 0) {
    const current = queue.shift()!

    if (current.tx === gtx && current.ty === gty) {
      // Reconstruct path
      const path: { x: number; y: number }[] = []
      let node: Node | null = current
      while (node) {
        path.unshift({
          x: node.tx * TILE + TILE / 2,
          y: node.ty * TILE + TILE / 2,
        })
        node = node.parent
      }
      // Remove start position (we're already there)
      path.shift()
      return path
    }

    for (const dir of directions) {
      const nx = current.tx + dir.dx
      const ny = current.ty + dir.dy
      const key = `${nx},${ny}`

      if (nx < 0 || nx >= GRID_COLS || ny < 0 || ny >= GRID_ROWS) continue
      if (visited.has(key)) continue

      // Allow walking to goal tile even if it's "blocked" (furniture)
      if (!(nx === gtx && ny === gty) && !isWalkable(nx, ny)) continue

      visited.add(key)
      queue.push({ tx: nx, ty: ny, parent: current })
    }
  }

  // No path found — return a direct line as fallback
  return [{ x: goalX, y: goalY }]
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}
