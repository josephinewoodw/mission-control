import type { AgentName, AgentStatus } from '../types'
import type { CharacterState, Direction } from './types'
import { ANIM_ROWS, DIR_OFFSETS, SPRITE_SIZE, DESK_POSITIONS, COFFEE_POS, IDLE_MIN_MS, IDLE_MAX_MS, TILE } from './constants'
import { drawCharacterSprite } from './renderer'
import { findPath } from './pathfinding'

/** Random number in range [min, max] */
function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

/** Pick a random idle duration */
function idleDuration(): number {
  return randRange(IDLE_MIN_MS, IDLE_MAX_MS)
}

/**
 * Character class with FSM for idle behaviors.
 *
 * States:
 * - IDLE_SIT: sitting at desk, idle animation
 * - SLEEPING: at desk, static + zzz
 * - STRETCHING: at desk, emote animation
 * - COFFEE_RUN: walking to break room
 * - AT_COFFEE: standing at coffee machine
 * - RETURN_DESK: walking back to desk
 * - WORKING: at desk, walk animation (typing), green status
 * - BLOCKED: at desk, hurt animation, red status
 */
export class Character {
  name: AgentName
  displayName: string
  color: string

  // Position (pixel coords — top-left of sprite)
  x: number
  y: number

  // Home desk position
  homeX: number
  homeY: number

  // FSM
  state: CharacterState = 'IDLE_SIT'
  agentStatus: AgentStatus = 'offline'

  // Animation
  private animRow: number = ANIM_ROWS.idle.baseRow
  private animFrames: number = ANIM_ROWS.idle.frames
  private animSpeed: number = ANIM_ROWS.idle.speed
  private frame: number = 0
  private frameTimer: number = 0
  private direction: Direction = 'down'

  // State timer
  private stateTimer: number = 0
  private stateDuration: number = 0

  // Pathfinding
  private path: { x: number; y: number }[] = []
  private pathIndex: number = 0
  private walkSpeed: number = 80 // pixels per second (scaled up for 32px tiles)

  // Idle activity rotation
  private idleActivities: CharacterState[] = ['IDLE_SIT', 'SLEEPING', 'IDLE_SIT', 'STRETCHING', 'IDLE_SIT', 'COFFEE_RUN']
  private idleIndex: number

  // Grayscale for offline
  private grayscale: boolean = false

  // High-level task description (shown in speech bubble)
  highLevelTask: string = 'Standing by...'

  // Collaboration: name of agent this one is working with, null if not collaborating
  collaboratingWith: AgentName | null = null

  constructor(name: AgentName, displayName: string, color: string) {
    this.name = name
    this.displayName = displayName
    this.color = color

    const home = DESK_POSITIONS[name]
    this.homeX = home.x
    this.homeY = home.y
    this.x = home.x
    this.y = home.y

    // Randomize starting activity index so agents aren't in sync
    this.idleIndex = Math.floor(Math.random() * this.idleActivities.length)
    this.enterState('IDLE_SIT')
  }

  /** Update agent status from React data */
  setAgentStatus(status: AgentStatus) {
    const prevStatus = this.agentStatus
    this.agentStatus = status
    this.grayscale = status === 'offline'

    if (status === 'working' && prevStatus !== 'working') {
      this.enterState('WORKING')
    } else if (status === 'blocked' && prevStatus !== 'blocked') {
      this.enterState('BLOCKED')
    } else if ((status === 'idle' || status === 'offline') && (prevStatus === 'working' || prevStatus === 'blocked')) {
      this.enterState('IDLE_SIT')
    }
  }

  /** Enter a new state */
  private enterState(newState: CharacterState) {
    this.state = newState
    this.stateTimer = 0

    // Small offset to put character in chair position (slightly below desk)
    const chairOffset = Math.floor(TILE * 0.15)

    switch (newState) {
      case 'IDLE_SIT':
        this.setAnim('idle', 'down')
        this.stateDuration = idleDuration()
        this.x = this.homeX
        this.y = this.homeY + chairOffset
        break

      case 'SLEEPING':
        this.setAnim('static', 'down')
        this.stateDuration = randRange(15000, 25000)
        this.x = this.homeX
        this.y = this.homeY + chairOffset
        break

      case 'STRETCHING':
        this.setAnim('emote', 'down')
        this.stateDuration = randRange(4000, 7000)
        this.x = this.homeX
        this.y = this.homeY
        break

      case 'COFFEE_RUN': {
        const half = Math.floor(SPRITE_SIZE / 2)
        this.path = findPath(this.x + half, this.y + half, COFFEE_POS.x, COFFEE_POS.y) || []
        this.pathIndex = 0
        this.setAnim('walk', 'down')
        this.stateDuration = Infinity
        break
      }

      case 'AT_COFFEE':
        this.setAnim('idle', 'down')
        this.stateDuration = randRange(5000, 10000)
        break

      case 'RETURN_DESK': {
        const half = Math.floor(SPRITE_SIZE / 2)
        this.path = findPath(this.x + half, this.y + half, this.homeX + half, this.homeY + half) || []
        this.pathIndex = 0
        this.setAnim('walk', 'down')
        this.stateDuration = Infinity
        break
      }

      case 'WORKING':
        this.setAnim('walk', 'down') // typing animation
        this.stateDuration = Infinity
        this.x = this.homeX
        this.y = this.homeY + chairOffset
        break

      case 'BLOCKED':
        this.setAnim('hurt', 'down')
        this.stateDuration = Infinity
        this.x = this.homeX
        this.y = this.homeY + chairOffset
        break
    }
  }

  /** Set animation row and direction */
  private setAnim(anim: keyof typeof ANIM_ROWS, dir: Direction) {
    const def = ANIM_ROWS[anim]
    this.animRow = def.baseRow + DIR_OFFSETS[dir]
    this.animFrames = def.frames
    this.animSpeed = def.speed
    this.direction = dir
    this.frame = 0
    this.frameTimer = 0
  }

  /** Main update, called every frame */
  update(dt: number, time: number) {
    // Update animation frame
    if (this.animSpeed > 0 && this.animFrames > 1) {
      this.frameTimer += dt
      if (this.frameTimer >= this.animSpeed) {
        this.frameTimer -= this.animSpeed
        this.frame = (this.frame + 1) % this.animFrames
      }
    }

    // State timer
    this.stateTimer += dt

    // State-specific logic
    switch (this.state) {
      case 'IDLE_SIT':
      case 'SLEEPING':
      case 'STRETCHING':
        if (this.stateTimer >= this.stateDuration) {
          this.nextIdleActivity()
        }
        break

      case 'COFFEE_RUN':
        if (this.followPath(dt)) {
          this.enterState('AT_COFFEE')
        }
        break

      case 'AT_COFFEE':
        if (this.stateTimer >= this.stateDuration) {
          this.enterState('RETURN_DESK')
        }
        break

      case 'RETURN_DESK':
        if (this.followPath(dt)) {
          this.nextIdleActivity()
        }
        break

      case 'WORKING':
      case 'BLOCKED':
        break
    }
  }

  /** Follow the current path, returns true when path is complete */
  private followPath(dt: number): boolean {
    if (this.pathIndex >= this.path.length) return true

    const half = Math.floor(SPRITE_SIZE / 2)
    const target = this.path[this.pathIndex]
    const targetX = target.x - half
    const targetY = target.y - half

    const dx = targetX - this.x
    const dy = targetY - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < 3) {
      this.x = targetX
      this.y = targetY
      this.pathIndex++

      if (this.pathIndex < this.path.length) {
        this.updateFacing(this.path[this.pathIndex].x - half, this.path[this.pathIndex].y - half)
      }
      return this.pathIndex >= this.path.length
    }

    const moveAmount = this.walkSpeed * (dt / 1000)
    const ratio = Math.min(moveAmount / dist, 1)
    this.x += dx * ratio
    this.y += dy * ratio

    this.updateFacing(targetX, targetY)

    return false
  }

  /** Update sprite direction based on movement target */
  private updateFacing(targetX: number, targetY: number) {
    const dx = targetX - this.x
    const dy = targetY - this.y

    let dir: Direction
    if (Math.abs(dx) > Math.abs(dy)) {
      dir = dx > 0 ? 'right' : 'left'
    } else {
      dir = dy > 0 ? 'down' : 'up'
    }

    if (dir !== this.direction) {
      const animKey = this.state === 'COFFEE_RUN' || this.state === 'RETURN_DESK' ? 'walk' : 'idle'
      this.setAnim(animKey, dir)
    }
  }

  /** Advance to next idle activity in the rotation */
  private nextIdleActivity() {
    if (this.agentStatus === 'working') {
      this.enterState('WORKING')
      return
    }
    if (this.agentStatus === 'blocked') {
      this.enterState('BLOCKED')
      return
    }

    this.idleIndex = (this.idleIndex + 1) % this.idleActivities.length
    this.enterState(this.idleActivities[this.idleIndex])
  }

  /** Draw this character on the canvas */
  draw(ctx: CanvasRenderingContext2D, time: number) {
    drawCharacterSprite(
      ctx,
      this.name,
      this.animRow,
      this.frame,
      Math.round(this.x),
      Math.round(this.y),
      this.grayscale,
    )
  }
}
