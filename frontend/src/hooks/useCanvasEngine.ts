import { useEffect, useRef, useCallback } from 'react'
import type { AgentState, AgentName } from '../types'
import { AGENTS } from '../data/agents'
import { createGameLoop, Character, preloadSprites, preloadTileAssets, loadLayout, clearFurnitureCache, CANVAS_W, CANVAS_H } from '../engine'
import type { GameLoop } from '../engine'

interface UseCanvasEngineOptions {
  agents: Record<string, AgentState>
}

/**
 * Hook that manages the Canvas 2D game engine lifecycle.
 * Creates characters, syncs agent data, and manages the RAF loop.
 */
export function useCanvasEngine({ agents }: UseCanvasEngineOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const loopRef = useRef<GameLoop | null>(null)
  const charsRef = useRef<Map<AgentName, Character>>(new Map())
  const initRef = useRef(false)
  // Keep a ref to the latest agents so initEngine can sync after async sprite loading
  const agentsRef = useRef(agents)
  agentsRef.current = agents

  // Sync characters from an agents snapshot — called both after init and on each agents update
  const syncCharacters = useCallback((agentsSnapshot: Record<string, AgentState>) => {
    for (const [name, char] of charsRef.current) {
      const agentState = agentsSnapshot[name]
      if (agentState) {
        char.setAgentStatus(agentState.status)
        char.highLevelTask = agentState.highLevelTask || 'Standing by...'
        char.collaboratingWith = agentState.collaboratingWith ?? null
      }
    }
  }, [])

  // Initialize engine when canvas is mounted
  const initEngine = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas || initRef.current) return

    // Load layout (synchronous for hardcoded layout, but keeps async API)
    await loadLayout()

    // Load sprites and tile assets
    await Promise.all([preloadSprites(), preloadTileAssets()])

    // Clear furniture cache so it rebuilds from new layout
    clearFurnitureCache()

    // Set canvas to native pixel resolution (640x480)
    canvas.width = CANVAS_W
    canvas.height = CANVAS_H

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Disable image smoothing for crisp pixel art
    ctx.imageSmoothingEnabled = false

    // Create characters
    const agentNames: AgentName[] = ['fern', 'scout', 'reed', 'sentinel', 'timber', 'tide']
    for (const name of agentNames) {
      const info = AGENTS[name]
      const char = new Character(name, info.displayName, info.color)
      charsRef.current.set(name, char)
    }

    // Create and start game loop
    const loop = createGameLoop(ctx)
    loop.setCharacters(Array.from(charsRef.current.values()))
    loop.start()
    loopRef.current = loop
    initRef.current = true

    // Sync agent state immediately after init — tasks and events may have loaded
    // during the async sprite-loading phase, so we read the latest agents snapshot
    // from the ref to avoid a stale closure.
    syncCharacters(agentsRef.current)
  }, [syncCharacters])

  // Initialize on mount
  useEffect(() => {
    initEngine()

    return () => {
      if (loopRef.current) {
        loopRef.current.stop()
        loopRef.current = null
      }
      initRef.current = false
      charsRef.current.clear()
    }
  }, [initEngine])

  // Sync agent status data into characters whenever agents state changes
  useEffect(() => {
    syncCharacters(agents)
  }, [agents, syncCharacters])

  return { canvasRef }
}
