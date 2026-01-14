# Save New York Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a single-level combat game where players pilot a jet to defend NYC from aliens.

**Architecture:** HTML5 Canvas game with modular JavaScript files. Game loop handles update/render cycle at 60 FPS. Entity-based design with Player, Enemies, Buildings, and Projectiles as core objects. State machine manages title/gameplay/gameover screens.

**Tech Stack:** HTML5 Canvas, Vanilla JavaScript (ES6+), CSS for layout

---

## Task 1: Project Setup & HTML Structure

**Files:**
- Create: `index.html`
- Create: `css/style.css`
- Create: `js/game.js`

**Step 1: Create index.html with canvas**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Save New York</title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div id="game-container">
        <canvas id="game-canvas" width="640" height="480"></canvas>
    </div>
    <script type="module" src="js/game.js"></script>
</body>
</html>
```

**Step 2: Create basic CSS**

```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    background-color: #1a1a2e;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    font-family: monospace;
}

#game-container {
    border: 4px solid #4ade80;
    box-shadow: 0 0 20px rgba(74, 222, 128, 0.3);
}

#game-canvas {
    display: block;
    background-color: #000;
}
```

**Step 3: Create game.js with canvas initialization**

```javascript
// Game constants
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;

// Get canvas and context
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Verify setup
console.log('Canvas initialized:', canvas.width, 'x', canvas.height);

// Draw test rectangle to verify canvas works
ctx.fillStyle = '#4ade80';
ctx.fillRect(100, 100, 50, 50);
console.log('Test rectangle drawn - setup complete!');
```

**Step 4: Test in browser**

Open `index.html` in browser.
Expected: Green rectangle visible at (100, 100), console shows initialization messages.

**Step 5: Commit**

```bash
git add index.html css/style.css js/game.js
git commit -m "feat: initial project setup with HTML5 canvas"
```

---

## Task 2: Game Loop Foundation

**Files:**
- Modify: `js/game.js`

**Step 1: Implement game loop structure**

Replace contents of `js/game.js`:

```javascript
// ============================================
// GAME CONSTANTS
// ============================================
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 480;
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;

// ============================================
// GAME STATE
// ============================================
const GameState = {
    TITLE: 'title',
    PLAYING: 'playing',
    GAME_OVER: 'gameover',
    VICTORY: 'victory'
};

const game = {
    state: GameState.TITLE,
    lastTime: 0,
    deltaTime: 0
};

// ============================================
// CANVAS SETUP
// ============================================
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// ============================================
// GAME LOOP
// ============================================
function update(deltaTime) {
    // Update game logic based on state
    switch (game.state) {
        case GameState.TITLE:
            // Title screen logic
            break;
        case GameState.PLAYING:
            // Main gameplay logic
            break;
        case GameState.GAME_OVER:
            // Game over logic
            break;
        case GameState.VICTORY:
            // Victory logic
            break;
    }
}

function render() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Render based on state
    switch (game.state) {
        case GameState.TITLE:
            renderTitle();
            break;
        case GameState.PLAYING:
            renderGame();
            break;
        case GameState.GAME_OVER:
            renderGameOver();
            break;
        case GameState.VICTORY:
            renderVictory();
            break;
    }
}

function renderTitle() {
    ctx.fillStyle = '#4ade80';
    ctx.font = '32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SAVE NEW YORK', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
    ctx.font = '16px monospace';
    ctx.fillText('Press ENTER to Start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
}

function renderGame() {
    // Placeholder - will render game elements
    ctx.fillStyle = '#4ade80';
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME PLAYING', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
}

function renderGameOver() {
    ctx.fillStyle = '#ef4444';
    ctx.font = '32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
}

function renderVictory() {
    ctx.fillStyle = '#fbbf24';
    ctx.font = '32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('VICTORY!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
}

function gameLoop(currentTime) {
    // Calculate delta time
    game.deltaTime = (currentTime - game.lastTime) / 1000; // Convert to seconds
    game.lastTime = currentTime;

    // Cap delta time to prevent huge jumps
    if (game.deltaTime > 0.1) game.deltaTime = 0.1;

    update(game.deltaTime);
    render();

    requestAnimationFrame(gameLoop);
}

// ============================================
// START GAME
// ============================================
console.log('Save New York - Game Initialized');
requestAnimationFrame(gameLoop);
```

**Step 2: Test in browser**

Refresh browser.
Expected: Title screen shows "SAVE NEW YORK" and "Press ENTER to Start".

**Step 3: Commit**

```bash
git add js/game.js
git commit -m "feat: add game loop with state management"
```

---

## Task 3: Input Handling

**Files:**
- Create: `js/input.js`
- Modify: `js/game.js`

**Step 1: Create input handler module**

```javascript
// ============================================
// INPUT HANDLER
// ============================================
const Keys = {
    UP: 'ArrowUp',
    DOWN: 'ArrowDown',
    LEFT: 'ArrowLeft',
    RIGHT: 'ArrowRight',
    SPACE: ' ',
    ENTER: 'Enter'
};

const input = {
    keys: {},
    justPressed: {},

    init() {
        window.addEventListener('keydown', (e) => {
            if (!this.keys[e.key]) {
                this.justPressed[e.key] = true;
            }
            this.keys[e.key] = true;

            // Prevent scrolling with arrow keys
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
    },

    isKeyDown(key) {
        return this.keys[key] === true;
    },

    isKeyJustPressed(key) {
        return this.justPressed[key] === true;
    },

    clearJustPressed() {
        this.justPressed = {};
    }
};

export { input, Keys };
```

**Step 2: Update game.js to use input**

Add at top of game.js after constants:

```javascript
import { input, Keys } from './input.js';
```

Add after canvas setup:

```javascript
// Initialize input
input.init();
```

Update the `update` function:

```javascript
function update(deltaTime) {
    switch (game.state) {
        case GameState.TITLE:
            if (input.isKeyJustPressed(Keys.ENTER)) {
                game.state = GameState.PLAYING;
                console.log('Game started!');
            }
            break;
        case GameState.PLAYING:
            // Main gameplay logic
            break;
        case GameState.GAME_OVER:
            if (input.isKeyJustPressed(Keys.ENTER)) {
                game.state = GameState.TITLE;
            }
            break;
        case GameState.VICTORY:
            if (input.isKeyJustPressed(Keys.ENTER)) {
                game.state = GameState.TITLE;
            }
            break;
    }

    // Clear just pressed at end of frame
    input.clearJustPressed();
}
```

**Step 3: Test in browser**

Refresh browser, press ENTER.
Expected: Screen changes from title to "GAME PLAYING" text.

**Step 4: Commit**

```bash
git add js/input.js js/game.js
git commit -m "feat: add keyboard input handling"
```

---

## Task 4: Play Area Layout (Sky, Buildings Zone, Street, Subway)

**Files:**
- Create: `js/config.js`
- Modify: `js/game.js`

**Step 1: Create config with layout constants**

```javascript
// ============================================
// GAME CONFIGURATION
// ============================================
export const CONFIG = {
    // Canvas
    CANVAS_WIDTH: 640,
    CANVAS_HEIGHT: 480,

    // Layout zones (Y coordinates)
    SKY_TOP: 30,           // Below HUD
    STREET_Y: 360,         // Street level
    SUBWAY_TOP: 380,       // Subway starts here
    SUBWAY_BOTTOM: 450,    // Above bottom HUD

    // Colors (modern pixel art palette)
    COLORS: {
        SKY: '#4a90d9',
        STREET: '#2d2d2d',
        SUBWAY_BG: '#1a1a1a',
        SUBWAY_TUNNEL: '#0d0d0d',
        BUILDING_LIGHT: '#c9b896',
        BUILDING_DARK: '#8b7355',
        BUILDING_WINDOW: '#2d4a6b',
        HUD_BG: '#1a472a',
        HUD_TEXT: '#4ade80',
        BORDER: '#4ade80'
    },

    // Buildings
    BUILDING_COUNT: 6,
    BLOCK_SIZE: 12,

    // Player
    PLAYER_SPEED: 150,
    PLAYER_TURN_SPEED: 180, // degrees per second
    PLAYER_LIVES: 5,
    FUEL_MAX: 60,           // seconds
    FUEL_DRAIN_RATE: 1,     // per second
    REFUEL_TIME: 5,         // seconds

    // Refuel pad positions
    REFUEL_PAD_LEFT: { x: 30, y: 360 },
    REFUEL_PAD_RIGHT: { x: 610, y: 360 },
    REFUEL_PAD_WIDTH: 40,
    REFUEL_PAD_HEIGHT: 20,

    // Enemies
    ENEMY_MELEE_DAMAGE_TIME_MIN: 3,
    ENEMY_MELEE_DAMAGE_TIME_MAX: 10,

    // Win/Lose
    CITY_DESTRUCTION_THRESHOLD: 0.8  // 80%
};
```

**Step 2: Update game.js to render play area**

Update imports at top:

```javascript
import { input, Keys } from './input.js';
import { CONFIG } from './config.js';
```

Replace canvas constants with CONFIG:

```javascript
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
canvas.width = CONFIG.CANVAS_WIDTH;
canvas.height = CONFIG.CANVAS_HEIGHT;
```

Update `renderGame` function:

```javascript
function renderGame() {
    // Draw sky
    ctx.fillStyle = CONFIG.COLORS.SKY;
    ctx.fillRect(0, CONFIG.SKY_TOP, CONFIG.CANVAS_WIDTH, CONFIG.STREET_Y - CONFIG.SKY_TOP);

    // Draw street
    ctx.fillStyle = CONFIG.COLORS.STREET;
    ctx.fillRect(0, CONFIG.STREET_Y, CONFIG.CANVAS_WIDTH, CONFIG.SUBWAY_TOP - CONFIG.STREET_Y);

    // Draw subway background
    ctx.fillStyle = CONFIG.COLORS.SUBWAY_BG;
    ctx.fillRect(0, CONFIG.SUBWAY_TOP, CONFIG.CANVAS_WIDTH, CONFIG.SUBWAY_BOTTOM - CONFIG.SUBWAY_TOP);

    // Draw subway tunnel (decorative arch)
    ctx.fillStyle = CONFIG.COLORS.SUBWAY_TUNNEL;
    ctx.beginPath();
    ctx.ellipse(CONFIG.CANVAS_WIDTH / 2, CONFIG.SUBWAY_BOTTOM, 280, 50, 0, Math.PI, 0);
    ctx.fill();

    // Draw refuel pads
    ctx.fillStyle = CONFIG.COLORS.HUD_TEXT;
    ctx.fillRect(
        CONFIG.REFUEL_PAD_LEFT.x - CONFIG.REFUEL_PAD_WIDTH / 2,
        CONFIG.REFUEL_PAD_LEFT.y - CONFIG.REFUEL_PAD_HEIGHT,
        CONFIG.REFUEL_PAD_WIDTH,
        CONFIG.REFUEL_PAD_HEIGHT
    );
    ctx.fillRect(
        CONFIG.REFUEL_PAD_RIGHT.x - CONFIG.REFUEL_PAD_WIDTH / 2,
        CONFIG.REFUEL_PAD_RIGHT.y - CONFIG.REFUEL_PAD_HEIGHT,
        CONFIG.REFUEL_PAD_WIDTH,
        CONFIG.REFUEL_PAD_HEIGHT
    );

    // Draw HUD background (top)
    ctx.fillStyle = CONFIG.COLORS.HUD_BG;
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.SKY_TOP);

    // Draw HUD background (bottom)
    ctx.fillRect(0, CONFIG.SUBWAY_BOTTOM, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT - CONFIG.SUBWAY_BOTTOM);

    // Draw border
    ctx.strokeStyle = CONFIG.COLORS.BORDER;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, CONFIG.CANVAS_WIDTH - 4, CONFIG.CANVAS_HEIGHT - 4);
}
```

**Step 3: Test in browser**

Press ENTER to start game.
Expected: Blue sky, gray street, dark subway area, green refuel pads on left and right, green border.

**Step 4: Commit**

```bash
git add js/config.js js/game.js
git commit -m "feat: add play area layout with zones"
```

---

## Task 5: Buildings - Block Grid Structure

**Files:**
- Create: `js/buildings.js`
- Modify: `js/game.js`

**Step 1: Create buildings module**

```javascript
import { CONFIG } from './config.js';

// Building definitions: [x position, width in blocks, height in blocks]
const BUILDING_DEFS = [
    { x: 60, width: 4, height: 12 },
    { x: 140, width: 5, height: 18 },
    { x: 230, width: 4, height: 14 },
    { x: 320, width: 6, height: 20 },
    { x: 430, width: 4, height: 15 },
    { x: 520, width: 5, height: 16 }
];

class Building {
    constructor(x, widthBlocks, heightBlocks) {
        this.x = x;
        this.widthBlocks = widthBlocks;
        this.heightBlocks = heightBlocks;
        this.blockSize = CONFIG.BLOCK_SIZE;

        // Calculate pixel dimensions
        this.width = widthBlocks * this.blockSize;
        this.height = heightBlocks * this.blockSize;
        this.y = CONFIG.STREET_Y - this.height;

        // Create block grid (true = block exists, false = destroyed)
        this.blocks = [];
        for (let row = 0; row < heightBlocks; row++) {
            this.blocks[row] = [];
            for (let col = 0; col < widthBlocks; col++) {
                this.blocks[row][col] = true;
            }
        }

        // Track original block count for destruction percentage
        this.originalBlockCount = widthBlocks * heightBlocks;
    }

    getBlockCount() {
        let count = 0;
        for (let row = 0; row < this.heightBlocks; row++) {
            for (let col = 0; col < this.widthBlocks; col++) {
                if (this.blocks[row][col]) count++;
            }
        }
        return count;
    }

    destroyBlock(row, col) {
        if (row >= 0 && row < this.heightBlocks &&
            col >= 0 && col < this.widthBlocks) {
            this.blocks[row][col] = false;
            return true;
        }
        return false;
    }

    isEdgeBlock(row, col) {
        // A block is an edge if it exists and has at least one exposed face
        if (!this.blocks[row]?.[col]) return false;

        // Check all 4 directions
        const above = row > 0 ? this.blocks[row - 1]?.[col] : false;
        const below = row < this.heightBlocks - 1 ? this.blocks[row + 1]?.[col] : false;
        const left = col > 0 ? this.blocks[row]?.[col - 1] : false;
        const right = col < this.widthBlocks - 1 ? this.blocks[row]?.[col + 1] : false;

        // Edge if any adjacent is empty/missing
        return !above || !below || !left || !right;
    }

    getEdgeBlocks() {
        const edges = [];
        for (let row = 0; row < this.heightBlocks; row++) {
            for (let col = 0; col < this.widthBlocks; col++) {
                if (this.isEdgeBlock(row, col)) {
                    edges.push({ row, col, building: this });
                }
            }
        }
        return edges;
    }

    getBlockWorldPosition(row, col) {
        return {
            x: this.x + col * this.blockSize,
            y: this.y + row * this.blockSize,
            width: this.blockSize,
            height: this.blockSize
        };
    }

    render(ctx) {
        for (let row = 0; row < this.heightBlocks; row++) {
            for (let col = 0; col < this.widthBlocks; col++) {
                if (this.blocks[row][col]) {
                    const pos = this.getBlockWorldPosition(row, col);

                    // Alternate colors for visual interest
                    const isLight = (row + col) % 2 === 0;
                    ctx.fillStyle = isLight ? CONFIG.COLORS.BUILDING_LIGHT : CONFIG.COLORS.BUILDING_DARK;
                    ctx.fillRect(pos.x, pos.y, pos.width, pos.height);

                    // Draw window on some blocks
                    if ((row + col) % 3 === 0) {
                        ctx.fillStyle = CONFIG.COLORS.BUILDING_WINDOW;
                        ctx.fillRect(pos.x + 2, pos.y + 2, pos.width - 4, pos.height - 4);
                    }

                    // Draw block outline
                    ctx.strokeStyle = '#00000033';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
                }
            }
        }
    }
}

class BuildingManager {
    constructor() {
        this.buildings = [];
        this.totalOriginalBlocks = 0;
    }

    init() {
        this.buildings = BUILDING_DEFS.map(def =>
            new Building(def.x, def.width, def.height)
        );
        this.totalOriginalBlocks = this.buildings.reduce(
            (sum, b) => sum + b.originalBlockCount, 0
        );
    }

    getTotalBlockCount() {
        return this.buildings.reduce((sum, b) => sum + b.getBlockCount(), 0);
    }

    getDestructionPercentage() {
        const remaining = this.getTotalBlockCount();
        return 1 - (remaining / this.totalOriginalBlocks);
    }

    getAllEdgeBlocks() {
        return this.buildings.flatMap(b => b.getEdgeBlocks());
    }

    render(ctx) {
        this.buildings.forEach(b => b.render(ctx));
    }
}

const buildingManager = new BuildingManager();

export { buildingManager, Building };
```

**Step 2: Update game.js to render buildings**

Add import:

```javascript
import { buildingManager } from './buildings.js';
```

Add initialization function and call it:

```javascript
function initGame() {
    buildingManager.init();
    console.log('Buildings initialized:', buildingManager.buildings.length);
    console.log('Total blocks:', buildingManager.totalOriginalBlocks);
}

// Initialize input and game
input.init();
initGame();
```

Update `renderGame` to include buildings (add after sky, before street):

```javascript
function renderGame() {
    // Draw sky
    ctx.fillStyle = CONFIG.COLORS.SKY;
    ctx.fillRect(0, CONFIG.SKY_TOP, CONFIG.CANVAS_WIDTH, CONFIG.STREET_Y - CONFIG.SKY_TOP);

    // Draw buildings
    buildingManager.render(ctx);

    // Draw street
    ctx.fillStyle = CONFIG.COLORS.STREET;
    ctx.fillRect(0, CONFIG.STREET_Y, CONFIG.CANVAS_WIDTH, CONFIG.SUBWAY_TOP - CONFIG.STREET_Y);

    // ... rest of render code
}
```

**Step 3: Test in browser**

Start game.
Expected: 6 buildings of varying heights with block pattern and windows visible.

**Step 4: Commit**

```bash
git add js/buildings.js js/game.js
git commit -m "feat: add destructible building block grid"
```

---

## Task 6: Player Jet - Basic Entity

**Files:**
- Create: `js/player.js`
- Modify: `js/game.js`

**Step 1: Create player module**

```javascript
import { CONFIG } from './config.js';
import { input, Keys } from './input.js';

const PlayerState = {
    DOCKED: 'docked',
    FLYING: 'flying',
    REFUELING: 'refueling',
    EXPLODING: 'exploding'
};

class Player {
    constructor() {
        this.reset();
    }

    reset() {
        // Spawn at left pad, pointing up
        this.x = CONFIG.REFUEL_PAD_LEFT.x;
        this.y = CONFIG.REFUEL_PAD_LEFT.y - CONFIG.REFUEL_PAD_HEIGHT - 10;
        this.angle = -90; // -90 = pointing up (0 = right)
        this.state = PlayerState.DOCKED;

        this.speed = CONFIG.PLAYER_SPEED;
        this.turnSpeed = CONFIG.PLAYER_TURN_SPEED;

        this.fuel = CONFIG.FUEL_MAX;
        this.lives = CONFIG.PLAYER_LIVES;

        this.refuelTimer = 0;
        this.explosionTimer = 0;

        // Jet dimensions
        this.width = 20;
        this.height = 12;
    }

    update(deltaTime) {
        switch (this.state) {
            case PlayerState.DOCKED:
                this.updateDocked();
                break;
            case PlayerState.FLYING:
                this.updateFlying(deltaTime);
                break;
            case PlayerState.REFUELING:
                this.updateRefueling(deltaTime);
                break;
            case PlayerState.EXPLODING:
                this.updateExploding(deltaTime);
                break;
        }
    }

    updateDocked() {
        // Wait for UP key to launch
        if (input.isKeyJustPressed(Keys.UP)) {
            this.state = PlayerState.FLYING;
            console.log('Launched!');
        }
    }

    updateFlying(deltaTime) {
        // Turn with left/right
        if (input.isKeyDown(Keys.LEFT)) {
            this.angle -= this.turnSpeed * deltaTime;
        }
        if (input.isKeyDown(Keys.RIGHT)) {
            this.angle += this.turnSpeed * deltaTime;
        }

        // Move forward in facing direction
        const radians = this.angle * (Math.PI / 180);
        this.x += Math.cos(radians) * this.speed * deltaTime;
        this.y += Math.sin(radians) * this.speed * deltaTime;

        // Drain fuel
        this.fuel -= CONFIG.FUEL_DRAIN_RATE * deltaTime;

        // Screen wrap
        if (this.x < 0) this.x = CONFIG.CANVAS_WIDTH;
        if (this.x > CONFIG.CANVAS_WIDTH) this.x = 0;
        if (this.y < CONFIG.SKY_TOP) this.y = CONFIG.SKY_TOP;
        if (this.y > CONFIG.STREET_Y) this.y = CONFIG.STREET_Y;

        // Check for refuel pad collision
        this.checkRefuelPads();

        // Check for out of fuel
        if (this.fuel <= 0) {
            this.die();
        }
    }

    updateRefueling(deltaTime) {
        this.refuelTimer += deltaTime;

        // Refuel progress
        const refuelProgress = this.refuelTimer / CONFIG.REFUEL_TIME;
        this.fuel = Math.min(CONFIG.FUEL_MAX, CONFIG.FUEL_MAX * refuelProgress);

        if (this.refuelTimer >= CONFIG.REFUEL_TIME) {
            this.fuel = CONFIG.FUEL_MAX;
            this.state = PlayerState.DOCKED;
            this.refuelTimer = 0;
            console.log('Refuel complete!');
        }
    }

    updateExploding(deltaTime) {
        this.explosionTimer += deltaTime;
        if (this.explosionTimer >= 1) {
            this.respawn();
        }
    }

    checkRefuelPads() {
        const leftPad = CONFIG.REFUEL_PAD_LEFT;
        const rightPad = CONFIG.REFUEL_PAD_RIGHT;
        const padW = CONFIG.REFUEL_PAD_WIDTH;
        const padH = CONFIG.REFUEL_PAD_HEIGHT;

        // Check left pad
        if (this.x > leftPad.x - padW/2 && this.x < leftPad.x + padW/2 &&
            this.y > leftPad.y - padH - 15 && this.y < leftPad.y) {
            this.dock(leftPad);
        }

        // Check right pad
        if (this.x > rightPad.x - padW/2 && this.x < rightPad.x + padW/2 &&
            this.y > rightPad.y - padH - 15 && this.y < rightPad.y) {
            this.dock(rightPad);
        }
    }

    dock(pad) {
        this.x = pad.x;
        this.y = pad.y - CONFIG.REFUEL_PAD_HEIGHT - 10;
        this.angle = -90; // Point up
        this.state = PlayerState.REFUELING;
        this.refuelTimer = 0;
        console.log('Docking and refueling...');
    }

    die() {
        this.lives--;
        this.state = PlayerState.EXPLODING;
        this.explosionTimer = 0;
        console.log('Player died! Lives remaining:', this.lives);
    }

    respawn() {
        if (this.lives > 0) {
            this.x = CONFIG.REFUEL_PAD_LEFT.x;
            this.y = CONFIG.REFUEL_PAD_LEFT.y - CONFIG.REFUEL_PAD_HEIGHT - 10;
            this.angle = -90;
            this.fuel = CONFIG.FUEL_MAX;
            this.state = PlayerState.DOCKED;
            this.explosionTimer = 0;
        }
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle * Math.PI / 180);

        if (this.state === PlayerState.EXPLODING) {
            // Draw explosion
            ctx.fillStyle = '#ff6b35';
            ctx.beginPath();
            ctx.arc(0, 0, 15 + this.explosionTimer * 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(0, 0, 8 + this.explosionTimer * 10, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Draw jet body
            ctx.fillStyle = '#e0e0e0';
            ctx.beginPath();
            ctx.moveTo(this.width / 2, 0);              // Nose
            ctx.lineTo(-this.width / 2, -this.height / 2); // Top wing
            ctx.lineTo(-this.width / 3, 0);             // Back indent
            ctx.lineTo(-this.width / 2, this.height / 2);  // Bottom wing
            ctx.closePath();
            ctx.fill();

            // Draw cockpit
            ctx.fillStyle = '#4a90d9';
            ctx.beginPath();
            ctx.ellipse(0, 0, 5, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Draw engine glow when flying
            if (this.state === PlayerState.FLYING) {
                ctx.fillStyle = '#ff6b35';
                ctx.beginPath();
                ctx.moveTo(-this.width / 2, -3);
                ctx.lineTo(-this.width / 2 - 8, 0);
                ctx.lineTo(-this.width / 2, 3);
                ctx.closePath();
                ctx.fill();
            }
        }

        ctx.restore();
    }
}

const player = new Player();

export { player, PlayerState };
```

**Step 2: Update game.js**

Add import:

```javascript
import { player } from './player.js';
```

Update `initGame`:

```javascript
function initGame() {
    buildingManager.init();
    player.reset();
    game.state = GameState.PLAYING;
}
```

Update title screen to call initGame on start:

```javascript
case GameState.TITLE:
    if (input.isKeyJustPressed(Keys.ENTER)) {
        initGame();
        console.log('Game started!');
    }
    break;
```

Add player update in PLAYING state:

```javascript
case GameState.PLAYING:
    player.update(game.deltaTime);
    break;
```

Add player render in `renderGame` (after buildings, before street):

```javascript
// Draw buildings
buildingManager.render(ctx);

// Draw player
player.render(ctx);

// Draw street...
```

**Step 3: Test in browser**

Start game, press UP to launch, use LEFT/RIGHT to turn.
Expected: Jet launches from left pad, flies with constant thrust, turns with arrow keys.

**Step 4: Commit**

```bash
git add js/player.js js/game.js
git commit -m "feat: add player jet with movement and fuel"
```

---

## Task 7: Player Projectiles

**Files:**
- Create: `js/projectiles.js`
- Modify: `js/player.js`
- Modify: `js/game.js`

**Step 1: Create projectiles module**

```javascript
import { CONFIG } from './config.js';

class Projectile {
    constructor(x, y, angle, speed, isPlayerProjectile = true) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.isPlayerProjectile = isPlayerProjectile;
        this.radius = 3;
        this.active = true;
    }

    update(deltaTime) {
        const radians = this.angle * (Math.PI / 180);
        this.x += Math.cos(radians) * this.speed * deltaTime;
        this.y += Math.sin(radians) * this.speed * deltaTime;

        // Deactivate if off screen
        if (this.x < 0 || this.x > CONFIG.CANVAS_WIDTH ||
            this.y < 0 || this.y > CONFIG.CANVAS_HEIGHT) {
            this.active = false;
        }
    }

    render(ctx) {
        ctx.fillStyle = this.isPlayerProjectile ? '#ffd700' : '#ff4444';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Glow effect
        ctx.fillStyle = this.isPlayerProjectile ? '#ffff0044' : '#ff000044';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

class ProjectileManager {
    constructor() {
        this.projectiles = [];
    }

    add(x, y, angle, speed, isPlayerProjectile = true) {
        this.projectiles.push(new Projectile(x, y, angle, speed, isPlayerProjectile));
    }

    update(deltaTime) {
        this.projectiles.forEach(p => p.update(deltaTime));
        // Remove inactive projectiles
        this.projectiles = this.projectiles.filter(p => p.active);
    }

    getPlayerProjectiles() {
        return this.projectiles.filter(p => p.isPlayerProjectile);
    }

    getEnemyProjectiles() {
        return this.projectiles.filter(p => !p.isPlayerProjectile);
    }

    render(ctx) {
        this.projectiles.forEach(p => p.render(ctx));
    }

    clear() {
        this.projectiles = [];
    }
}

const projectileManager = new ProjectileManager();

export { projectileManager, Projectile };
```

**Step 2: Update player.js to shoot**

Add import at top:

```javascript
import { projectileManager } from './projectiles.js';
```

Add fire cooldown properties in `reset()`:

```javascript
this.fireCooldown = 0;
this.fireRate = 0.2; // seconds between shots
```

Add shooting logic in `updateFlying`:

```javascript
updateFlying(deltaTime) {
    // Turn with left/right
    if (input.isKeyDown(Keys.LEFT)) {
        this.angle -= this.turnSpeed * deltaTime;
    }
    if (input.isKeyDown(Keys.RIGHT)) {
        this.angle += this.turnSpeed * deltaTime;
    }

    // Shoot with space
    this.fireCooldown -= deltaTime;
    if (input.isKeyDown(Keys.SPACE) && this.fireCooldown <= 0) {
        this.shoot();
        this.fireCooldown = this.fireRate;
    }

    // ... rest of updateFlying
}
```

Add shoot method:

```javascript
shoot() {
    const radians = this.angle * (Math.PI / 180);
    const bulletX = this.x + Math.cos(radians) * (this.width / 2 + 5);
    const bulletY = this.y + Math.sin(radians) * (this.width / 2 + 5);
    projectileManager.add(bulletX, bulletY, this.angle, 400, true);
}
```

**Step 3: Update game.js**

Add import:

```javascript
import { projectileManager } from './projectiles.js';
```

Update `initGame` to clear projectiles:

```javascript
function initGame() {
    buildingManager.init();
    player.reset();
    projectileManager.clear();
    game.state = GameState.PLAYING;
}
```

Add projectile update in PLAYING state:

```javascript
case GameState.PLAYING:
    player.update(game.deltaTime);
    projectileManager.update(game.deltaTime);
    break;
```

Add projectile render in `renderGame` (after player):

```javascript
// Draw player
player.render(ctx);

// Draw projectiles
projectileManager.render(ctx);
```

**Step 4: Test in browser**

Launch jet, press SPACE to shoot.
Expected: Yellow projectiles fire in facing direction.

**Step 5: Commit**

```bash
git add js/projectiles.js js/player.js js/game.js
git commit -m "feat: add player projectile shooting"
```

---

## Task 8: Collision Detection System

**Files:**
- Create: `js/collision.js`
- Modify: `js/game.js`

**Step 1: Create collision module**

```javascript
// AABB collision detection
function rectIntersects(r1, r2) {
    return r1.x < r2.x + r2.width &&
           r1.x + r1.width > r2.x &&
           r1.y < r2.y + r2.height &&
           r1.y + r1.height > r2.y;
}

// Circle-rect collision
function circleRectIntersects(circle, rect) {
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));

    const distanceX = circle.x - closestX;
    const distanceY = circle.y - closestY;
    const distanceSquared = distanceX * distanceX + distanceY * distanceY;

    return distanceSquared < circle.radius * circle.radius;
}

// Point in rect
function pointInRect(px, py, rect) {
    return px >= rect.x && px <= rect.x + rect.width &&
           py >= rect.y && py <= rect.y + rect.height;
}

// Get player bounding box
function getPlayerBounds(player) {
    return {
        x: player.x - player.width / 2,
        y: player.y - player.height / 2,
        width: player.width,
        height: player.height
    };
}

export { rectIntersects, circleRectIntersects, pointInRect, getPlayerBounds };
```

**Step 2: Update game.js to check collisions**

Add import:

```javascript
import { rectIntersects, circleRectIntersects, pointInRect, getPlayerBounds } from './collision.js';
```

Add collision checking function:

```javascript
function checkCollisions() {
    // Player projectiles vs buildings
    const playerProjectiles = projectileManager.getPlayerProjectiles();

    for (const proj of playerProjectiles) {
        if (!proj.active) continue;

        for (const building of buildingManager.buildings) {
            for (let row = 0; row < building.heightBlocks; row++) {
                for (let col = 0; col < building.widthBlocks; col++) {
                    if (!building.blocks[row][col]) continue;

                    const blockPos = building.getBlockWorldPosition(row, col);
                    if (circleRectIntersects(
                        { x: proj.x, y: proj.y, radius: proj.radius },
                        blockPos
                    )) {
                        building.destroyBlock(row, col);
                        proj.active = false;
                        break;
                    }
                }
                if (!proj.active) break;
            }
            if (!proj.active) break;
        }
    }

    // Player vs buildings (if flying)
    if (player.state === 'flying') {
        const playerBounds = getPlayerBounds(player);

        for (const building of buildingManager.buildings) {
            for (let row = 0; row < building.heightBlocks; row++) {
                for (let col = 0; col < building.widthBlocks; col++) {
                    if (!building.blocks[row][col]) continue;

                    const blockPos = building.getBlockWorldPosition(row, col);
                    if (rectIntersects(playerBounds, blockPos)) {
                        player.die();
                        return;
                    }
                }
            }
        }
    }

    // Check city destruction percentage
    if (buildingManager.getDestructionPercentage() >= CONFIG.CITY_DESTRUCTION_THRESHOLD) {
        game.state = GameState.GAME_OVER;
        console.log('City destroyed! Game Over!');
    }

    // Check player lives
    if (player.lives <= 0) {
        game.state = GameState.GAME_OVER;
        console.log('No lives remaining! Game Over!');
    }
}
```

Add collision check to update loop:

```javascript
case GameState.PLAYING:
    player.update(game.deltaTime);
    projectileManager.update(game.deltaTime);
    checkCollisions();
    break;
```

**Step 3: Test in browser**

Fly into a building. Shoot at buildings.
Expected: Player dies on building collision. Projectiles destroy building blocks.

**Step 4: Commit**

```bash
git add js/collision.js js/game.js
git commit -m "feat: add collision detection for player and projectiles"
```

---

## Task 9: Floor Collapse Mechanic

**Files:**
- Modify: `js/buildings.js`

**Step 1: Add collapse detection and execution**

Add method to Building class:

```javascript
checkAndCollapseFloors() {
    let collapsed = false;

    // Check each row from bottom to top
    for (let row = this.heightBlocks - 1; row >= 0; row--) {
        // Check if entire row is destroyed
        let rowDestroyed = true;
        for (let col = 0; col < this.widthBlocks; col++) {
            if (this.blocks[row][col]) {
                rowDestroyed = false;
                break;
            }
        }

        // If row is destroyed, collapse everything above
        if (rowDestroyed && row > 0) {
            // Check if there's anything above to collapse
            let hasBlocksAbove = false;
            for (let checkRow = 0; checkRow < row; checkRow++) {
                for (let col = 0; col < this.widthBlocks; col++) {
                    if (this.blocks[checkRow][col]) {
                        hasBlocksAbove = true;
                        break;
                    }
                }
                if (hasBlocksAbove) break;
            }

            if (hasBlocksAbove) {
                // Collapse: destroy all blocks above this row
                for (let collapseRow = 0; collapseRow < row; collapseRow++) {
                    for (let col = 0; col < this.widthBlocks; col++) {
                        this.blocks[collapseRow][col] = false;
                    }
                }
                collapsed = true;
                console.log('Floor collapsed at row', row);
            }
        }
    }

    return collapsed;
}
```

Update `destroyBlock` to trigger collapse check:

```javascript
destroyBlock(row, col) {
    if (row >= 0 && row < this.heightBlocks &&
        col >= 0 && col < this.widthBlocks &&
        this.blocks[row][col]) {
        this.blocks[row][col] = false;
        this.checkAndCollapseFloors();
        return true;
    }
    return false;
}
```

**Step 2: Test in browser**

Shoot out an entire floor of a building.
Expected: All blocks above the destroyed floor disappear (collapse).

**Step 3: Commit**

```bash
git add js/buildings.js
git commit -m "feat: add floor collapse mechanic"
```

---

## Task 10: Basic Enemies - Building Attackers

**Files:**
- Create: `js/enemies.js`
- Modify: `js/game.js`

**Step 1: Create enemies module**

```javascript
import { CONFIG } from './config.js';
import { buildingManager } from './buildings.js';

const EnemyType = {
    BUILDING_ATTACKER: 'attacker',
    PLAYER_CHASER: 'chaser'
};

const EnemyState = {
    WANDERING: 'wandering',
    ATTACKING: 'attacking',
    DEAD: 'dead'
};

class Enemy {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.state = EnemyState.WANDERING;

        this.width = 16;
        this.height = 16;
        this.speed = type === EnemyType.BUILDING_ATTACKER ? 60 : 90;

        // Wandering behavior
        this.wanderTarget = { x: this.x, y: this.y };
        this.wanderTimer = 0;
        this.wanderInterval = 0.5 + Math.random() * 1;

        // Attack behavior
        this.targetBlock = null;
        this.attackTimer = 0;
        this.attackDuration = CONFIG.ENEMY_MELEE_DAMAGE_TIME_MIN +
            Math.random() * (CONFIG.ENEMY_MELEE_DAMAGE_TIME_MAX - CONFIG.ENEMY_MELEE_DAMAGE_TIME_MIN);

        this.active = true;
    }

    update(deltaTime, playerX, playerY) {
        if (this.state === EnemyState.DEAD) return;

        if (this.type === EnemyType.BUILDING_ATTACKER) {
            this.updateBuildingAttacker(deltaTime);
        } else {
            this.updateChaser(deltaTime, playerX, playerY);
        }
    }

    updateBuildingAttacker(deltaTime) {
        if (this.state === EnemyState.WANDERING) {
            // Wander with bird-like movement
            this.wanderTimer += deltaTime;

            if (this.wanderTimer >= this.wanderInterval) {
                this.wanderTimer = 0;
                this.wanderInterval = 0.3 + Math.random() * 0.7;

                // Pick new wander target or decide to attack
                if (Math.random() < 0.3) {
                    // Try to find a building to attack
                    const edges = buildingManager.getAllEdgeBlocks();
                    if (edges.length > 0) {
                        const target = edges[Math.floor(Math.random() * edges.length)];
                        this.targetBlock = target;
                        const pos = target.building.getBlockWorldPosition(target.row, target.col);
                        this.wanderTarget = {
                            x: pos.x + pos.width / 2,
                            y: pos.y + pos.height / 2
                        };
                    }
                } else {
                    // Random wander
                    this.wanderTarget = {
                        x: this.x + (Math.random() - 0.5) * 100,
                        y: this.y + (Math.random() - 0.5) * 60
                    };
                }

                // Clamp to play area
                this.wanderTarget.x = Math.max(50, Math.min(CONFIG.CANVAS_WIDTH - 50, this.wanderTarget.x));
                this.wanderTarget.y = Math.max(CONFIG.SKY_TOP + 20, Math.min(CONFIG.STREET_Y - 20, this.wanderTarget.y));
            }

            // Move toward wander target
            const dx = this.wanderTarget.x - this.x;
            const dy = this.wanderTarget.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 5) {
                this.x += (dx / dist) * this.speed * deltaTime;
                this.y += (dy / dist) * this.speed * deltaTime;
            }

            // Check if reached target block
            if (this.targetBlock && dist < 10) {
                this.state = EnemyState.ATTACKING;
                this.attackTimer = 0;
            }
        } else if (this.state === EnemyState.ATTACKING) {
            this.attackTimer += deltaTime;

            // Check if block still exists
            if (this.targetBlock && !this.targetBlock.building.blocks[this.targetBlock.row]?.[this.targetBlock.col]) {
                // Block was destroyed by something else
                this.state = EnemyState.WANDERING;
                this.targetBlock = null;
                return;
            }

            if (this.attackTimer >= this.attackDuration) {
                // Destroy the block
                if (this.targetBlock) {
                    this.targetBlock.building.destroyBlock(this.targetBlock.row, this.targetBlock.col);
                    console.log('Enemy destroyed block!');
                }

                // Reset and pick new random duration
                this.state = EnemyState.WANDERING;
                this.targetBlock = null;
                this.attackDuration = CONFIG.ENEMY_MELEE_DAMAGE_TIME_MIN +
                    Math.random() * (CONFIG.ENEMY_MELEE_DAMAGE_TIME_MAX - CONFIG.ENEMY_MELEE_DAMAGE_TIME_MIN);
            }
        }
    }

    updateChaser(deltaTime, playerX, playerY) {
        // Chase the player
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 5) {
            // Add some wobble to movement
            const wobbleX = Math.sin(Date.now() / 200) * 20;
            const wobbleY = Math.cos(Date.now() / 300) * 15;

            this.x += ((dx / dist) * this.speed + wobbleX * 0.3) * deltaTime;
            this.y += ((dy / dist) * this.speed + wobbleY * 0.3) * deltaTime;
        }

        // Clamp to play area
        this.x = Math.max(20, Math.min(CONFIG.CANVAS_WIDTH - 20, this.x));
        this.y = Math.max(CONFIG.SKY_TOP + 10, Math.min(CONFIG.STREET_Y - 10, this.y));
    }

    die() {
        this.state = EnemyState.DEAD;
        this.active = false;
    }

    render(ctx) {
        if (this.state === EnemyState.DEAD) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Different colors for different types
        const color = this.type === EnemyType.BUILDING_ATTACKER ? '#9333ea' : '#dc2626';

        // Draw body
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw wings (flapping animation)
        const wingFlap = Math.sin(Date.now() / 100) * 5;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(-5, 0);
        ctx.lineTo(-15, -8 + wingFlap);
        ctx.lineTo(-10, 0);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.lineTo(15, -8 - wingFlap);
        ctx.lineTo(10, 0);
        ctx.closePath();
        ctx.fill();

        // Draw eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-3, -2, 3, 0, Math.PI * 2);
        ctx.arc(3, -2, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-3, -2, 1.5, 0, Math.PI * 2);
        ctx.arc(3, -2, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Show attack progress if attacking
        if (this.state === EnemyState.ATTACKING) {
            const progress = this.attackTimer / this.attackDuration;
            ctx.fillStyle = '#ff000088';
            ctx.fillRect(-10, 12, 20 * progress, 3);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(-10, 12, 20, 3);
        }

        ctx.restore();
    }
}

class EnemyManager {
    constructor() {
        this.enemies = [];
        this.waveNumber = 0;
        this.enemiesRemainingInWave = 0;
        this.spawnTimer = 0;
        this.spawnInterval = 2;
        this.waveComplete = false;
        this.bossSpawned = false;
    }

    reset() {
        this.enemies = [];
        this.waveNumber = 0;
        this.enemiesRemainingInWave = 0;
        this.spawnTimer = 0;
        this.waveComplete = false;
        this.bossSpawned = false;
    }

    startWave(waveNum) {
        this.waveNumber = waveNum;
        this.waveComplete = false;

        // Calculate enemies for this wave
        const baseEnemies = 5;
        const enemyCount = baseEnemies + (waveNum - 1) * 3;
        this.enemiesRemainingInWave = enemyCount;

        // Ratio of chasers increases with wave
        this.chaserRatio = Math.min(0.6, 0.2 + (waveNum - 1) * 0.1);

        console.log(`Wave ${waveNum} started! ${enemyCount} enemies incoming.`);
    }

    spawnEnemy() {
        if (this.enemiesRemainingInWave <= 0) return;

        // Determine enemy type
        const isChaser = Math.random() < this.chaserRatio;
        const type = isChaser ? EnemyType.PLAYER_CHASER : EnemyType.BUILDING_ATTACKER;

        // Spawn from screen edge
        const side = Math.floor(Math.random() * 3); // 0=top, 1=left, 2=right
        let x, y;

        switch (side) {
            case 0: // Top
                x = 50 + Math.random() * (CONFIG.CANVAS_WIDTH - 100);
                y = CONFIG.SKY_TOP;
                break;
            case 1: // Left
                x = 0;
                y = CONFIG.SKY_TOP + Math.random() * (CONFIG.STREET_Y - CONFIG.SKY_TOP - 50);
                break;
            case 2: // Right
                x = CONFIG.CANVAS_WIDTH;
                y = CONFIG.SKY_TOP + Math.random() * (CONFIG.STREET_Y - CONFIG.SKY_TOP - 50);
                break;
        }

        this.enemies.push(new Enemy(x, y, type));
        this.enemiesRemainingInWave--;
    }

    update(deltaTime, playerX, playerY) {
        // Spawn enemies
        if (this.enemiesRemainingInWave > 0) {
            this.spawnTimer += deltaTime;
            if (this.spawnTimer >= this.spawnInterval) {
                this.spawnEnemy();
                this.spawnTimer = 0;
                // Faster spawning in later waves
                this.spawnInterval = Math.max(0.5, 2 - this.waveNumber * 0.2);
            }
        }

        // Update enemies
        this.enemies.forEach(e => e.update(deltaTime, playerX, playerY));

        // Remove dead enemies
        this.enemies = this.enemies.filter(e => e.active);

        // Check wave completion
        if (this.enemiesRemainingInWave <= 0 && this.enemies.length === 0 && !this.waveComplete) {
            this.waveComplete = true;
            console.log(`Wave ${this.waveNumber} complete!`);
        }
    }

    render(ctx) {
        this.enemies.forEach(e => e.render(ctx));
    }
}

const enemyManager = new EnemyManager();

export { enemyManager, Enemy, EnemyType, EnemyState };
```

**Step 2: Update game.js**

Add import:

```javascript
import { enemyManager } from './enemies.js';
```

Update `initGame`:

```javascript
function initGame() {
    buildingManager.init();
    player.reset();
    projectileManager.clear();
    enemyManager.reset();
    enemyManager.startWave(1);
    game.state = GameState.PLAYING;
}
```

Add enemy update in PLAYING state:

```javascript
case GameState.PLAYING:
    player.update(game.deltaTime);
    projectileManager.update(game.deltaTime);
    enemyManager.update(game.deltaTime, player.x, player.y);
    checkCollisions();
    break;
```

Add enemy render in `renderGame`:

```javascript
// Draw enemies
enemyManager.render(ctx);

// Draw player
player.render(ctx);
```

**Step 3: Add enemy collision detection**

Add to `checkCollisions` function:

```javascript
// Player projectiles vs enemies
for (const proj of playerProjectiles) {
    if (!proj.active) continue;

    for (const enemy of enemyManager.enemies) {
        if (!enemy.active) continue;

        const dist = Math.sqrt(
            Math.pow(proj.x - enemy.x, 2) +
            Math.pow(proj.y - enemy.y, 2)
        );

        if (dist < proj.radius + enemy.width / 2) {
            enemy.die();
            proj.active = false;
            game.score = (game.score || 0) + 100;
            break;
        }
    }
}

// Player vs enemies
if (player.state === 'flying') {
    const playerBounds = getPlayerBounds(player);

    for (const enemy of enemyManager.enemies) {
        if (!enemy.active) continue;

        const enemyBounds = {
            x: enemy.x - enemy.width / 2,
            y: enemy.y - enemy.height / 2,
            width: enemy.width,
            height: enemy.height
        };

        if (rectIntersects(playerBounds, enemyBounds)) {
            player.die();
            break;
        }
    }
}
```

**Step 4: Test in browser**

Start game, launch jet.
Expected: Enemies spawn and wander/chase. Shooting enemies destroys them. Collision with enemies kills player.

**Step 5: Commit**

```bash
git add js/enemies.js js/game.js
git commit -m "feat: add enemy types with wandering and chasing AI"
```

---

## Task 11: Wave System & Boss

**Files:**
- Modify: `js/enemies.js`
- Modify: `js/game.js`

**Step 1: Add Boss class to enemies.js**

Add after Enemy class:

```javascript
class Boss {
    constructor() {
        this.x = CONFIG.CANVAS_WIDTH / 2;
        this.y = CONFIG.SKY_TOP + 60;
        this.width = 60;
        this.height = 40;
        this.health = 20;
        this.maxHealth = 20;
        this.speed = 40;

        this.active = true;
        this.direction = 1;

        this.fireTimer = 0;
        this.fireInterval = 2.5;
    }

    update(deltaTime, playerX, playerY, projectileManager) {
        // Move side to side
        this.x += this.direction * this.speed * deltaTime;

        if (this.x > CONFIG.CANVAS_WIDTH - 80) {
            this.direction = -1;
        } else if (this.x < 80) {
            this.direction = 1;
        }

        // Slowly drift toward player Y
        const dy = playerY - this.y;
        this.y += Math.sign(dy) * 20 * deltaTime;
        this.y = Math.max(CONFIG.SKY_TOP + 40, Math.min(CONFIG.STREET_Y - 100, this.y));

        // Fire projectiles
        this.fireTimer += deltaTime;
        if (this.fireTimer >= this.fireInterval) {
            this.fireTimer = 0;
            this.fireSpread(playerX, playerY, projectileManager);
        }
    }

    fireSpread(playerX, playerY, projectileManager) {
        const baseAngle = Math.atan2(playerY - this.y, playerX - this.x) * 180 / Math.PI;
        const spreadCount = 5;
        const spreadAngle = 15;

        for (let i = 0; i < spreadCount; i++) {
            const angle = baseAngle + (i - Math.floor(spreadCount / 2)) * spreadAngle;
            projectileManager.add(this.x, this.y + 20, angle, 200, false);
        }
    }

    takeDamage() {
        this.health--;
        if (this.health <= 0) {
            this.active = false;
            return true; // Boss defeated
        }
        return false;
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Body
        ctx.fillStyle = '#7c3aed';
        ctx.beginPath();
        ctx.ellipse(0, 0, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Spikes
        ctx.fillStyle = '#a855f7';
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * 25, Math.sin(angle) * 15);
            ctx.lineTo(Math.cos(angle) * 40, Math.sin(angle) * 25);
            ctx.lineTo(Math.cos(angle + 0.2) * 25, Math.sin(angle + 0.2) * 15);
            ctx.closePath();
            ctx.fill();
        }

        // Face
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(-10, -5, 6, 0, Math.PI * 2);
        ctx.arc(10, -5, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(-10, -5, 3, 0, Math.PI * 2);
        ctx.arc(10, -5, 3, 0, Math.PI * 2);
        ctx.fill();

        // Mouth
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 8, 12, 0.2, Math.PI - 0.2);
        ctx.stroke();

        ctx.restore();

        // Health bar
        const barWidth = 80;
        const barHeight = 8;
        const barX = this.x - barWidth / 2;
        const barY = this.y - 35;

        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(barX, barY, barWidth * (this.health / this.maxHealth), barHeight);

        ctx.strokeStyle = '#fff';
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
}
```

Update EnemyManager to handle waves and boss:

```javascript
class EnemyManager {
    constructor() {
        this.enemies = [];
        this.boss = null;
        this.waveNumber = 0;
        this.maxWaves = 4;
        this.enemiesRemainingInWave = 0;
        this.spawnTimer = 0;
        this.spawnInterval = 2;
        this.waveComplete = false;
        this.bossDefeated = false;
        this.betweenWaves = false;
        this.waveBreakTimer = 0;
    }

    reset() {
        this.enemies = [];
        this.boss = null;
        this.waveNumber = 0;
        this.enemiesRemainingInWave = 0;
        this.spawnTimer = 0;
        this.waveComplete = false;
        this.bossDefeated = false;
        this.betweenWaves = false;
        this.waveBreakTimer = 0;
    }

    // ... keep existing startWave and spawnEnemy methods ...

    spawnBoss() {
        this.boss = new Boss();
        console.log('BOSS SPAWNED!');
    }

    update(deltaTime, playerX, playerY, projectileManager) {
        // Handle wave breaks
        if (this.betweenWaves) {
            this.waveBreakTimer += deltaTime;
            if (this.waveBreakTimer >= 3) {
                this.betweenWaves = false;
                if (this.waveNumber >= this.maxWaves) {
                    this.spawnBoss();
                } else {
                    this.startWave(this.waveNumber + 1);
                }
            }
            return;
        }

        // Update boss if present
        if (this.boss && this.boss.active) {
            this.boss.update(deltaTime, playerX, playerY, projectileManager);
        }

        // Spawn enemies
        if (this.enemiesRemainingInWave > 0 && !this.boss) {
            this.spawnTimer += deltaTime;
            if (this.spawnTimer >= this.spawnInterval) {
                this.spawnEnemy();
                this.spawnTimer = 0;
                this.spawnInterval = Math.max(0.5, 2 - this.waveNumber * 0.2);
            }
        }

        // Update enemies
        this.enemies.forEach(e => e.update(deltaTime, playerX, playerY));

        // Remove dead enemies
        this.enemies = this.enemies.filter(e => e.active);

        // Check wave completion
        if (!this.boss && this.enemiesRemainingInWave <= 0 && this.enemies.length === 0 && !this.waveComplete) {
            this.waveComplete = true;
            this.betweenWaves = true;
            this.waveBreakTimer = 0;
            console.log(`Wave ${this.waveNumber} complete!`);
        }
    }

    render(ctx) {
        this.enemies.forEach(e => e.render(ctx));
        if (this.boss && this.boss.active) {
            this.boss.render(ctx);
        }
    }
}
```

Update export:

```javascript
export { enemyManager, Enemy, Boss, EnemyType, EnemyState };
```

**Step 2: Update game.js collision for boss**

Add boss collision check in `checkCollisions`:

```javascript
// Player projectiles vs boss
if (enemyManager.boss && enemyManager.boss.active) {
    for (const proj of playerProjectiles) {
        if (!proj.active) continue;

        const boss = enemyManager.boss;
        const dist = Math.sqrt(
            Math.pow(proj.x - boss.x, 2) +
            Math.pow(proj.y - boss.y, 2)
        );

        if (dist < proj.radius + boss.width / 2) {
            proj.active = false;
            const defeated = boss.takeDamage();
            game.score = (game.score || 0) + 50;

            if (defeated) {
                game.state = GameState.VICTORY;
                console.log('BOSS DEFEATED! VICTORY!');
            }
            break;
        }
    }

    // Player vs boss
    if (player.state === 'flying') {
        const playerBounds = getPlayerBounds(player);
        const boss = enemyManager.boss;
        const bossBounds = {
            x: boss.x - boss.width / 2,
            y: boss.y - boss.height / 2,
            width: boss.width,
            height: boss.height
        };

        if (rectIntersects(playerBounds, bossBounds)) {
            player.die();
        }
    }
}

// Enemy projectiles vs player
const enemyProjectiles = projectileManager.getEnemyProjectiles();
if (player.state === 'flying') {
    const playerBounds = getPlayerBounds(player);

    for (const proj of enemyProjectiles) {
        if (!proj.active) continue;

        if (circleRectIntersects(
            { x: proj.x, y: proj.y, radius: proj.radius },
            playerBounds
        )) {
            player.die();
            proj.active = false;
            break;
        }
    }
}

// Enemy projectiles vs buildings
for (const proj of enemyProjectiles) {
    if (!proj.active) continue;

    for (const building of buildingManager.buildings) {
        for (let row = 0; row < building.heightBlocks; row++) {
            for (let col = 0; col < building.widthBlocks; col++) {
                if (!building.blocks[row][col]) continue;

                const blockPos = building.getBlockWorldPosition(row, col);
                if (circleRectIntersects(
                    { x: proj.x, y: proj.y, radius: proj.radius },
                    blockPos
                )) {
                    building.destroyBlock(row, col);
                    proj.active = false;
                    break;
                }
            }
            if (!proj.active) break;
        }
        if (!proj.active) break;
    }
}
```

Update enemy manager update call to pass projectileManager:

```javascript
enemyManager.update(game.deltaTime, player.x, player.y, projectileManager);
```

**Step 3: Test in browser**

Play through waves until boss spawns.
Expected: Boss appears after wave 4, fires spread projectiles, can be damaged and defeated.

**Step 4: Commit**

```bash
git add js/enemies.js js/game.js
git commit -m "feat: add wave system and boss battle"
```

---

## Task 12: HUD Display

**Files:**
- Create: `js/ui.js`
- Modify: `js/game.js`

**Step 1: Create UI module**

```javascript
import { CONFIG } from './config.js';

function renderHUD(ctx, player, buildingManager, enemyManager, score) {
    const hudY = 8;
    const bottomHudY = CONFIG.SUBWAY_BOTTOM + 8;

    ctx.font = '14px monospace';
    ctx.textAlign = 'left';

    // Top HUD - Left side
    ctx.fillStyle = CONFIG.COLORS.HUD_TEXT;
    ctx.fillText(`FUEL: ${Math.ceil(player.fuel)}`, 15, hudY + 14);

    // Top HUD - Center
    ctx.textAlign = 'center';
    ctx.fillText(`SCORE: ${score || 0}`, CONFIG.CANVAS_WIDTH / 2, hudY + 14);

    // Top HUD - Right side
    ctx.textAlign = 'right';
    ctx.fillText(`LIVES: ${player.lives}`, CONFIG.CANVAS_WIDTH - 15, hudY + 14);

    // Bottom HUD - City destruction
    ctx.textAlign = 'left';
    const destruction = Math.floor(buildingManager.getDestructionPercentage() * 100);
    const cityColor = destruction > 60 ? '#ef4444' : destruction > 30 ? '#fbbf24' : CONFIG.COLORS.HUD_TEXT;
    ctx.fillStyle = cityColor;
    ctx.fillText(`CITY: ${destruction}%`, 15, bottomHudY + 14);

    // Bottom HUD - Wave indicator
    ctx.textAlign = 'center';
    ctx.fillStyle = CONFIG.COLORS.HUD_TEXT;
    if (enemyManager.boss && enemyManager.boss.active) {
        ctx.fillStyle = '#ef4444';
        ctx.fillText('!! BOSS !!', CONFIG.CANVAS_WIDTH / 2, bottomHudY + 14);
    } else if (enemyManager.betweenWaves) {
        ctx.fillText(`WAVE ${enemyManager.waveNumber + 1} INCOMING`, CONFIG.CANVAS_WIDTH / 2, bottomHudY + 14);
    } else {
        ctx.fillText(`WAVE ${enemyManager.waveNumber}`, CONFIG.CANVAS_WIDTH / 2, bottomHudY + 14);
    }

    // Fuel bar
    const fuelBarWidth = 80;
    const fuelBarHeight = 6;
    const fuelBarX = 70;
    const fuelBarY = hudY + 18;

    ctx.fillStyle = '#333';
    ctx.fillRect(fuelBarX, fuelBarY, fuelBarWidth, fuelBarHeight);

    const fuelPercent = player.fuel / CONFIG.FUEL_MAX;
    const fuelColor = fuelPercent > 0.3 ? '#4ade80' : fuelPercent > 0.1 ? '#fbbf24' : '#ef4444';
    ctx.fillStyle = fuelColor;
    ctx.fillRect(fuelBarX, fuelBarY, fuelBarWidth * fuelPercent, fuelBarHeight);

    // Refuel indicator
    if (player.state === 'refueling') {
        const refuelProgress = player.refuelTimer / CONFIG.REFUEL_TIME;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#4ade80';
        ctx.fillText(`REFUELING... ${Math.floor(refuelProgress * 100)}%`, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2);
    }
}

export { renderHUD };
```

**Step 2: Update game.js to use HUD**

Add import:

```javascript
import { renderHUD } from './ui.js';
```

Add score to game object:

```javascript
const game = {
    state: GameState.TITLE,
    lastTime: 0,
    deltaTime: 0,
    score: 0
};
```

Update `initGame`:

```javascript
function initGame() {
    buildingManager.init();
    player.reset();
    projectileManager.clear();
    enemyManager.reset();
    enemyManager.startWave(1);
    game.score = 0;
    game.state = GameState.PLAYING;
}
```

Add HUD render at end of `renderGame`:

```javascript
// Draw HUD
renderHUD(ctx, player, buildingManager, enemyManager, game.score);
```

Update score increments in collision checks (replace `game.score = (game.score || 0) + X` with just `game.score += X`).

**Step 3: Test in browser**

Play game.
Expected: HUD shows fuel bar, score, lives, city destruction percentage, and wave number.

**Step 4: Commit**

```bash
git add js/ui.js js/game.js
git commit -m "feat: add HUD with fuel, score, lives, and wave display"
```

---

## Task 13: Civilians (Bonus Points)

**Files:**
- Create: `js/civilians.js`
- Modify: `js/game.js`

**Step 1: Create civilians module**

```javascript
import { CONFIG } from './config.js';
import { buildingManager } from './buildings.js';

class Civilian {
    constructor(building) {
        this.building = building;
        this.active = true;
        this.rescued = false;

        // Position on rooftop
        this.localX = Math.random() * (building.width - 8) + 4;
        this.updatePosition();
    }

    updatePosition() {
        // Find top of building (first row with blocks)
        let topRow = 0;
        for (let row = 0; row < this.building.heightBlocks; row++) {
            for (let col = 0; col < this.building.widthBlocks; col++) {
                if (this.building.blocks[row][col]) {
                    topRow = row;
                    break;
                }
            }
            if (this.building.blocks[topRow]?.some(b => b)) break;
        }

        this.x = this.building.x + this.localX;
        this.y = this.building.y + topRow * CONFIG.BLOCK_SIZE - 8;
    }

    update() {
        // Check if still on a valid block
        const col = Math.floor(this.localX / CONFIG.BLOCK_SIZE);
        let hasGround = false;

        for (let row = 0; row < this.building.heightBlocks; row++) {
            if (this.building.blocks[row]?.[col]) {
                hasGround = true;
                break;
            }
        }

        if (!hasGround) {
            this.active = false; // Fell
        } else {
            this.updatePosition();
        }
    }

    render(ctx) {
        if (!this.active || this.rescued) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // Body
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-3, 0, 6, 8);

        // Head
        ctx.fillStyle = '#fcd34d';
        ctx.beginPath();
        ctx.arc(0, -2, 4, 0, Math.PI * 2);
        ctx.fill();

        // Arms waving
        const wave = Math.sin(Date.now() / 200) * 0.5;
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-3, 2);
        ctx.lineTo(-7, -2 + wave * 4);
        ctx.moveTo(3, 2);
        ctx.lineTo(7, -2 - wave * 4);
        ctx.stroke();

        ctx.restore();
    }
}

class CivilianManager {
    constructor() {
        this.civilians = [];
        this.spawnTimer = 0;
        this.spawnInterval = 8;
        this.maxCivilians = 5;
    }

    reset() {
        this.civilians = [];
        this.spawnTimer = 0;
    }

    update(deltaTime) {
        // Spawn civilians periodically
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval && this.civilians.filter(c => c.active && !c.rescued).length < this.maxCivilians) {
            this.spawnCivilian();
            this.spawnTimer = 0;
        }

        // Update civilians
        this.civilians.forEach(c => c.update());

        // Remove inactive civilians
        this.civilians = this.civilians.filter(c => c.active);
    }

    spawnCivilian() {
        // Pick a random building that has blocks
        const validBuildings = buildingManager.buildings.filter(b => b.getBlockCount() > 0);
        if (validBuildings.length === 0) return;

        const building = validBuildings[Math.floor(Math.random() * validBuildings.length)];
        this.civilians.push(new Civilian(building));
    }

    checkRescue(playerX, playerY, playerState) {
        if (playerState !== 'flying') return 0;

        let rescued = 0;
        for (const civilian of this.civilians) {
            if (!civilian.active || civilian.rescued) continue;

            const dist = Math.sqrt(
                Math.pow(playerX - civilian.x, 2) +
                Math.pow(playerY - civilian.y, 2)
            );

            if (dist < 25) {
                civilian.rescued = true;
                civilian.active = false;
                rescued++;
                console.log('Civilian rescued!');
            }
        }
        return rescued;
    }

    render(ctx) {
        this.civilians.forEach(c => c.render(ctx));
    }
}

const civilianManager = new CivilianManager();

export { civilianManager };
```

**Step 2: Update game.js**

Add import:

```javascript
import { civilianManager } from './civilians.js';
```

Update `initGame`:

```javascript
function initGame() {
    buildingManager.init();
    player.reset();
    projectileManager.clear();
    enemyManager.reset();
    enemyManager.startWave(1);
    civilianManager.reset();
    game.score = 0;
    game.state = GameState.PLAYING;
}
```

Add civilian update and rescue check in PLAYING state:

```javascript
case GameState.PLAYING:
    player.update(game.deltaTime);
    projectileManager.update(game.deltaTime);
    enemyManager.update(game.deltaTime, player.x, player.y, projectileManager);
    civilianManager.update(game.deltaTime);

    // Check civilian rescue
    const rescued = civilianManager.checkRescue(player.x, player.y, player.state);
    game.score += rescued * 500;

    checkCollisions();
    break;
```

Add civilian render in `renderGame` (after buildings, before enemies):

```javascript
// Draw buildings
buildingManager.render(ctx);

// Draw civilians
civilianManager.render(ctx);

// Draw enemies
enemyManager.render(ctx);
```

**Step 3: Test in browser**

Play game.
Expected: Civilians appear on rooftops, wave arms. Flying close rescues them for 500 points.

**Step 4: Commit**

```bash
git add js/civilians.js js/game.js
git commit -m "feat: add civilians with rooftop rescue bonus"
```

---

## Task 14: Game Over & Victory Screens

**Files:**
- Modify: `js/game.js`

**Step 1: Update render functions**

Update `renderGameOver`:

```javascript
function renderGameOver() {
    // Draw the game state in background
    renderGame();

    // Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    ctx.textAlign = 'center';

    // Game Over text
    ctx.fillStyle = '#ef4444';
    ctx.font = '48px monospace';
    ctx.fillText('GAME OVER', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 - 40);

    // Final score
    ctx.fillStyle = '#fff';
    ctx.font = '24px monospace';
    ctx.fillText(`Final Score: ${game.score}`, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 10);

    // City destruction
    const destruction = Math.floor(buildingManager.getDestructionPercentage() * 100);
    ctx.fillText(`City Destroyed: ${destruction}%`, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 40);

    // Restart prompt
    ctx.fillStyle = '#4ade80';
    ctx.font = '16px monospace';
    ctx.fillText('Press ENTER to try again', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 90);
}
```

Update `renderVictory`:

```javascript
function renderVictory() {
    // Draw the game state in background
    renderGame();

    // Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    ctx.textAlign = 'center';

    // Victory text
    ctx.fillStyle = '#fbbf24';
    ctx.font = '48px monospace';
    ctx.fillText('VICTORY!', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 - 60);

    ctx.fillStyle = '#4ade80';
    ctx.font = '24px monospace';
    ctx.fillText('NEW YORK IS SAVED!', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 - 20);

    // Final score
    ctx.fillStyle = '#fff';
    ctx.fillText(`Final Score: ${game.score}`, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 20);

    // Stats
    const destruction = Math.floor(buildingManager.getDestructionPercentage() * 100);
    ctx.font = '16px monospace';
    ctx.fillText(`City Damage: ${destruction}%`, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 50);
    ctx.fillText(`Lives Remaining: ${player.lives}`, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 70);

    // Restart prompt
    ctx.fillStyle = '#4ade80';
    ctx.fillText('Press ENTER to play again', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 110);
}
```

**Step 2: Test in browser**

Die or win the game.
Expected: Appropriate end screen with stats and restart option.

**Step 3: Commit**

```bash
git add js/game.js
git commit -m "feat: add game over and victory screens with stats"
```

---

## Task 15: Title Screen Polish

**Files:**
- Modify: `js/game.js`

**Step 1: Update renderTitle**

```javascript
function renderTitle() {
    // Draw city background
    ctx.fillStyle = CONFIG.COLORS.SKY;
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // Silhouette buildings
    ctx.fillStyle = '#1a1a2e';
    const silhouettes = [
        { x: 50, w: 60, h: 200 },
        { x: 130, w: 80, h: 280 },
        { x: 230, w: 50, h: 220 },
        { x: 300, w: 90, h: 320 },
        { x: 420, w: 70, h: 240 },
        { x: 520, w: 80, h: 260 }
    ];
    silhouettes.forEach(s => {
        ctx.fillRect(s.x, CONFIG.CANVAS_HEIGHT - s.h, s.w, s.h);
    });

    // Title
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 56px monospace';
    ctx.fillText('SAVE', CONFIG.CANVAS_WIDTH / 2, 140);
    ctx.fillStyle = '#4ade80';
    ctx.fillText('NEW YORK', CONFIG.CANVAS_WIDTH / 2, 200);

    // Subtitle
    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.fillText('Defend the city from alien invasion!', CONFIG.CANVAS_WIDTH / 2, 250);

    // Controls
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px monospace';
    ctx.fillText('ARROW KEYS - Steer', CONFIG.CANVAS_WIDTH / 2, 320);
    ctx.fillText('UP - Launch / Takeoff', CONFIG.CANVAS_WIDTH / 2, 340);
    ctx.fillText('SPACE - Fire', CONFIG.CANVAS_WIDTH / 2, 360);

    // Start prompt (blinking)
    if (Math.floor(Date.now() / 500) % 2 === 0) {
        ctx.fillStyle = '#4ade80';
        ctx.font = '20px monospace';
        ctx.fillText('Press ENTER to Start', CONFIG.CANVAS_WIDTH / 2, 420);
    }

    // Border
    ctx.strokeStyle = CONFIG.COLORS.BORDER;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, CONFIG.CANVAS_WIDTH - 4, CONFIG.CANVAS_HEIGHT - 4);
}
```

**Step 2: Test in browser**

Load game.
Expected: Polished title screen with city silhouette, controls, and blinking start prompt.

**Step 3: Commit**

```bash
git add js/game.js
git commit -m "feat: polish title screen with city silhouette and controls"
```

---

## Task 16: Final Integration & Testing

**Files:**
- All files (review and test)

**Step 1: Full playtest checklist**

Test the following:
- [ ] Title screen displays and ENTER starts game
- [ ] Jet starts docked, UP launches
- [ ] Jet turns with LEFT/RIGHT, constant forward motion
- [ ] SPACE fires projectiles
- [ ] Fuel depletes, empty fuel = death
- [ ] Refuel pads dock and refuel over 5 seconds
- [ ] Buildings take damage from projectiles
- [ ] Floor collapse works when row destroyed
- [ ] Enemies spawn in waves
- [ ] Building attackers wander and damage blocks
- [ ] Chasers follow player
- [ ] Boss appears after wave 4
- [ ] Boss fires spreads, takes damage, defeat = victory
- [ ] Civilians spawn on rooftops
- [ ] Flying near civilians rescues them
- [ ] 80% city destruction = game over
- [ ] 0 lives = game over
- [ ] Game over screen shows stats
- [ ] Victory screen shows stats
- [ ] ENTER restarts from end screens

**Step 2: Fix any issues found**

Address bugs discovered during testing.

**Step 3: Final commit**

```bash
git add .
git commit -m "feat: complete Save New York v1.0 implementation"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Project setup | index.html, style.css, game.js |
| 2 | Game loop | game.js |
| 3 | Input handling | input.js |
| 4 | Play area layout | config.js, game.js |
| 5 | Building blocks | buildings.js |
| 6 | Player jet | player.js |
| 7 | Projectiles | projectiles.js |
| 8 | Collision detection | collision.js |
| 9 | Floor collapse | buildings.js |
| 10 | Enemies | enemies.js |
| 11 | Waves & boss | enemies.js |
| 12 | HUD | ui.js |
| 13 | Civilians | civilians.js |
| 14 | End screens | game.js |
| 15 | Title polish | game.js |
| 16 | Final testing | All |
