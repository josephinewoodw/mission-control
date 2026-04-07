import type { AgentState } from '../types'
import { useCanvasEngine } from '../hooks/useCanvasEngine'

interface OfficeSceneProps {
  agents: Record<string, AgentState>
}

/**
 * Office scene renders at native 32px tile resolution (640x480 for 20x15 grid),
 * then CSS scales it to fill the available space while maintaining 4:3 aspect ratio.
 * Uses object-fit: contain behavior via width/height: 100% + aspect-ratio.
 */
export function OfficeScene({ agents }: OfficeSceneProps) {
  const { canvasRef } = useCanvasEngine({ agents })

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        maxWidth: 960,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto',
      }}
    >
      <canvas
        ref={canvasRef}
        className="rounded-2xl border border-border"
        style={{
          // Fill container height, let width follow aspect ratio
          // This keeps canvas within viewport without overflowing
          maxWidth: '100%',
          maxHeight: '100%',
          // Use aspect-ratio so the canvas scales correctly in both dimensions
          aspectRatio: '4 / 3',
          width: 'auto',
          height: '100%',
          imageRendering: 'pixelated',
          display: 'block',
        }}
      />
    </div>
  )
}
