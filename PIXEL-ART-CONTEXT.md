# Mission Control Pixel Art — Context for Timber

## What We're Building
A pixel art office scene for the Mission Control dashboard where 5 AI agents (Fern, Scout, Reed, Sentinel, Timber) are represented as animated LPC characters working in an office. Think Stardew Valley / retro RPG office.

## What Exists
- **Canvas 2D engine** at `frontend/src/engine/` — game loop, renderer, character FSM, pathfinding, sprite cache
- **LPC character spritesheets** at `frontend/public/assets/*-spritesheet.png` (fern, scout, reed, sentinel, timber) — 832x3456, 64x64 frames, rendered at SPRITE_SIZE=48
- **Pixel Agents tiles** at `frontend/public/pixel-agents/` — 16px floor/wall tiles with HSL colorization, indoor plant/furniture sprites
- **LPC office furniture** at `frontend/public/lpc-tiles/office/` — 32px native (desks, laptops, coffee maker, water cooler, TV, etc.)
- **LPC interior atlas** at `frontend/public/lpc-tiles/interior/interior.png` — bookshelves, tables, chairs
- **Layout** defined in `tileMap.ts` — 20x15 grid at 32px tiles (640x480 canvas)
- **Screenshot tool** — `npx playwright screenshot --viewport-size=1280,900 --wait-for-timeout=3000 http://localhost:PORT /tmp/mc-dashboard.png` then crop with `sips -c 520 700 --cropOffset 180 290 /tmp/mc-dashboard.png --out /tmp/mc-office-crop.png`

## Current State & Known Issues

### What's Working
- Canvas renders with floor, walls, furniture, and characters
- Characters animate (idle, walk, emote) and cycle through idle activities
- Characters pathfind to break room for coffee
- Working/blocked states driven by real agent events
- Warm wood floor (uniform, no checkerboard)
- Pixel Agents indoor plants look correct
- Bookshelves on walls look decent
- 4 workstations with desks and chairs

### Fixed (Apr 4)
1. ~~**Laptops render BEHIND desks**~~ — Fixed via z-sorting adjustments and position offset corrections
2. ~~**Wall decorations partially broken**~~ — Fixed: paintings, clock, hanging plants all rendering correctly now
3. ~~**Coffee maker not visible**~~ — Fixed: repositioned in break room kitchen layout
4. ~~**Break room needs cohesion**~~ — Fixed: separate room with wall divider, tile floor, lounge seating, arcade cabinet, kitchen counter layout
5. ~~**Timber not in the dashboard**~~ — Fixed: spritesheet loaded, character added, 5th workstation placed
6. ~~**Speech bubbles missing**~~ — Added: overlay bubbles showing high-level task descriptions for each agent

### Remaining Polish Items
- Wall decoration variety could be improved (limited source rects from interior atlas)
- Break room kitchen fine-tuning may be needed after more visual testing
- Speech bubble positioning may need adjustment for edge-of-screen agents

### Aesthetic Goals
- **Inspiration:** Pixel Agents VS Code extension, Stardew Valley interiors
- **Feel:** Warm, cozy, lived-in office. One cohesive room (not two separate rooms)
- **Color:** Warm wood floors and walls, not cold/sterile
- **Furniture:** Mix of Pixel Agents (plants, small items) and LPC (desks, laptops, office equipment). Both drawn at appropriate scales.
- **Characters:** LPC sprites at 48px (SPRITE_SIZE), visually prominent against 32px tile furniture
- **Floor:** Clean uniform warm wood with subtle grid lines. NO checkerboard.

## Architecture Quick Reference
- `constants.ts` — TILE=32, SPRITE_SIZE=48, GRID=20x15, DESK_POSITIONS, COFFEE_POS
- `tileMap.ts` — LAYOUT grid, FURNITURE_LAYOUT array, collision grid
- `spriteCache.ts` — All asset definitions (LPC_FURNITURE array), image loading, HSL colorization
- `furniture.ts` — drawFurnitureSprite(), z-sorting, surface item handling
- `renderer.ts` — Main render pipeline: floor → walls → wall decorations → furniture (y-sorted) → characters → overlays
- `character.ts` — FSM with IDLE_SIT/SLEEPING/STRETCHING/COFFEE_RUN/WORKING/BLOCKED states
- `OfficeScene.tsx` — Canvas component, uses useCanvasEngine hook

## Verification Workflow
After EVERY visual change:
1. Take screenshot: `npx playwright screenshot --viewport-size=1280,900 --wait-for-timeout=3000 http://localhost:PORT /tmp/mc-dashboard.png`
2. Crop office: `sips -c 520 700 --cropOffset 180 290 /tmp/mc-dashboard.png --out /tmp/mc-office-crop.png`
3. Read the crop to verify visually
4. Only commit when it looks right
5. Always push after committing

## Sprite Reference
- Pixel Agents plants: 16px native, draw at 2x (32px). Individual PNGs in `pixel-agents/furniture/PLANT/`, etc.
- LPC office items: 32px native, draw at 1x. Individual PNGs in `lpc-tiles/office/`
- LPC interior atlas: 32px grid, use sourceRect to extract. At `lpc-tiles/interior/interior.png`
- Floor tiles: 16px grayscale PNGs at `pixel-agents/floors/`, colorized with HSL at runtime
- Wall tiles: 16px at `pixel-agents/walls/wall_0.png`, 4x4 auto-tile grid, bitmask N=1/E=2/S=4/W=8

## Direction Offsets (LPC Spritesheets)
Base rows are the DOWN-facing rows: idle=32, walk=10, hurt=20, emote=36, run=40
- down: +0 (base row)
- left: -1
- up: -2  
- right: +1
