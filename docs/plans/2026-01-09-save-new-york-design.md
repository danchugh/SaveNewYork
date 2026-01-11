# Save New York - Game Design Document

## Overview

A single-level, single-player combat game inspired by the Commodore 64 classic "Save New York". Built as a web browser game using HTML5 Canvas and JavaScript.

**Core Loop:** Pilot a jet through a New York cityscape, destroy alien invaders, protect the buildings, and defeat the boss.

## Win/Lose Conditions

| Condition | Trigger |
|-----------|---------|
| **Win** | Defeat the boss alien |
| **Lose** | 80%+ total building destruction |
| **Lose** | All 5 lives depleted |

## Play Area

- **Static screen** (no scrolling)
- **Top ~75%:** Sky and 6 buildings of varying heights - active combat zone
- **Bottom ~25%:** Subway tunnel system (visible but inactive for v1)
- **Spawn/Refuel pads:** Left edge and right edge at street level

![Reference: Original game layout with buildings, sky, and tunnel]

## Player Mechanics

### Jet Movement
- Constant forward thrust in facing direction (cannot stop mid-flight)
- Turn with **LEFT/RIGHT** arrow keys
- Fire with **SPACE** key
- Projectiles fire in the direction the jet is facing

### Takeoff & Landing
1. Game starts with jet at one of two spawn points (left or right edge at street level)
2. Jet begins stationary, nose pointed straight up
3. Press **UP** key to launch and begin flight
4. While in flight, jet cannot stop

### Refueling Pads
- Two locations: left edge and right edge at street level
- Flying into a refuel pad:
  - Locks jet in place
  - Points nose straight up
  - Begins **5-second uninterruptible refueling**
  - After complete, press **UP** to launch
- Strategic choice: disengage to refuel vs. risk running dry

### Fuel
- Fuel depletes continuously while flying
- Fuel runs out = jet crashes (lose 1 life)
- Full tank: ~60 seconds of flight time

### Lives
- Player starts with **5 lives**
- Lose 1 life from:
  - Enemy projectile hit
  - Enemy collision (melee)
  - Building collision
  - Running out of fuel
- On death: jet explodes, respawns at a spawn point

## Enemies

### Enemy Type 1: Building Attackers
- **Primary behavior:** Target and destroy buildings
- **Movement:** Wandering, to-and-fro pattern (like a bird unsure where to land)
- Eventually settle on an **edge block** of a building
- **Damage:** Must touch block for **3-10 seconds** to destroy it
- After destroying a block: fly off, wander, randomly choose different spot
- **Health:** 1 hit to destroy

### Enemy Type 2: Player Chasers
- **Primary behavior:** Hunt the player's jet
- Actively follow and pursue the player
- If they collide with buildings while chasing, may attach and damage
- **Damage:** Same rules - **3-10 seconds** sustained contact to destroy block
- **Health:** 1 hit to destroy

### Edge Block Targeting
- Enemies can only attach to exposed block faces
- As buildings are damaged, new edges become exposed
- Enemies adapt to current building shape

### Enemy Spawning (Waves)
- Enemies spawn from screen edges (top and sides)
- **Wave 1:** ~5 enemies, mostly building attackers
- Waves escalate: more enemies, higher ratio of chasers
- **Final wave:** ~12-15 enemies (mixed types)
- Short pause between waves
- **3-5 waves** before boss appears

### Boss Alien
- Appears after clearing enemy waves
- **Large, slow-moving** target
- **Health:** 15-20 hits to defeat
- **Attack:** Fires spreads of 3-5 projectiles every 2-3 seconds
- Boss projectiles cause **instant block damage** on impact

## Destructible Buildings

### Structure
- 6 buildings of varying heights across the cityscape
- Each building is a **grid of blocks**
- Blocks are the atomic unit of destruction

### Damage Sources
| Source | Damage Type |
|--------|-------------|
| Player projectiles | Instant block destruction (friendly fire!) |
| Boss projectiles | Instant block destruction |
| Enemy melee (Type 1 & 2) | 3-10 seconds sustained contact |

### Floor Collapse Mechanic
- If an entire horizontal row (floor) of blocks is destroyed...
- All blocks above that floor **collapse downward**
- Collapsed blocks are destroyed on impact
- Creates chain-reaction potential

### Destruction Tracking
- Game tracks total blocks remaining vs. original total
- **80%+ destruction = Game Over**
- UI shows city destruction percentage

### Strategic Implications
- Player must be careful with shots (friendly fire destroys blocks)
- Targeting enemies on buildings risks collateral damage
- Lower floors are high priority (collapse risk)

## Civilians (Bonus)

- Civilians appear standing on building rooftops
- Spawn periodically throughout the game
- If rooftop is destroyed, civilians fall and are lost
- **Rescue:** Fly close to a civilian to save them
- **Reward:** Bonus points (no gameplay penalty for missing)

## UI & HUD

### Top HUD
- **FUEL:** Current fuel level
- **SCORE:** Current points
- **LIVES:** Remaining lives (5 max)
- **CITY:** Destruction percentage (0% → 80% threshold)

### Additional UI
- Wave indicator (e.g., "WAVE 3")
- Boss health bar (when boss appears)
- Refueling progress bar (when docked)

### Game States
1. **Title Screen** → Press key to start
2. **Gameplay** → Main game loop
3. **Game Over** → City destroyed or lives depleted
4. **Victory** → Boss defeated

## Controls Summary

| Key | Action |
|-----|--------|
| UP | Launch from pad / Takeoff after refuel |
| LEFT | Turn counter-clockwise |
| RIGHT | Turn clockwise |
| SPACE | Fire projectile |

## Technical Implementation

### Technology
- HTML5 Canvas for rendering
- Vanilla JavaScript (no frameworks)
- Target: 60 FPS

### File Structure
```
/save-new-york
  index.html
  css/
    style.css
  js/
    game.js         - Main game loop, state management
    player.js       - Jet movement, shooting, fuel
    enemies.js      - Enemy spawning, AI behaviors
    buildings.js    - Block grid, destruction, collapse
    collision.js    - Hit detection
    ui.js           - HUD rendering, menus
    sprites.js      - Image/sprite management
  assets/
    sprites/
    sounds/
```

### Visual Style
- Modern pixel art (retro-inspired but polished)
- More colors and smoother animations than C64 original
- Clean, readable sprites

## Balance Values (Starting Point)

| Element | Value |
|---------|-------|
| Player lives | 5 |
| Fuel duration | ~60 seconds |
| Refuel time | 5 seconds |
| Enemy melee damage time | 3-10 seconds |
| Waves before boss | 3-5 |
| Boss health | 15-20 hits |
| City destruction threshold | 80% |

*Values subject to tuning during playtesting.*

## Future Expansion (Out of Scope for v1)

- Subway tunnel gameplay
- Multiple levels
- Power-ups
- Sound effects and music
- High score persistence
- Mobile touch controls
