# Zone 2: Desert Outpost - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Zone 2 (Desert Outpost) with new buildings, enemies, bosses, and building charge/ability system.

**Architecture:** Zone configuration is data-driven via CONFIG. Each zone has its own building definitions, enemy roster, and wave configuration. Building abilities use a kill-streak charge system with flag pickups. New enemy types extend the existing Enemy class.

**Tech Stack:** Vanilla JavaScript, Canvas 2D, existing game architecture (enemies.js, buildings.js, ui.js, game.js)

**Design Document:** `docs/plans/2026-01-18-zone2-desert-design.md`

---

## Phase 1: Zone Infrastructure

### Task 1.1: Add Zone Configuration to CONFIG

**Files:**
- Modify: `js/config.js`

**Step 1: Add zone configuration constants**

Add after line ~120 (after CITY_DESTRUCTION_THRESHOLD):

```javascript
// Zone Configuration
ZONES: {
    1: {
        name: 'New York',
        key: 'city',
        waves: 5,
        miniBossWaves: [2, 4],
        background: 'city'
    },
    2: {
        name: 'Desert Outpost',
        key: 'desert',
        waves: 5,
        miniBossWaves: [2, 4],
        background: 'desert'
    }
},
TOTAL_ZONES: 2,
```

**Step 2: Commit**

```bash
git add js/config.js
git commit -m "feat: add zone configuration to CONFIG"
```

---

### Task 1.2: Add Zone Tracking to Game State

**Files:**
- Modify: `js/game.js:18-26`

**Step 1: Add zone tracking to game object**

Update the game object:

```javascript
const game = {
    state: GameState.LOADING,
    lastTime: 0,
    deltaTime: 0,
    score: 0,
    nextBonusLifeAt: CONFIG.BONUS_LIFE_THRESHOLD,
    finalWave: 0,
    highScoreRank: 0,
    currentZone: 1,           // NEW: Current zone (1 or 2)
    zoneUnlocked: [true, false] // NEW: Zone unlock status [zone1, zone2]
};
```

**Step 2: Commit**

```bash
git add js/game.js
git commit -m "feat: add zone tracking to game state"
```

---

### Task 1.3: Update HUD Wave Display to Zone-Wave Format

**Files:**
- Modify: `js/ui.js:52-56` (top HUD wave display)
- Modify: `js/ui.js:82-91` (bottom HUD wave display)

**Step 1: Update top HUD wave format**

Change line 56 from:
```javascript
ctx.fillText(`${enemyManager.waveNumber}-1`, 338, hudY + 16);
```

To:
```javascript
ctx.fillText(`${game.currentZone}-${enemyManager.waveNumber}`, 338, hudY + 16);
```

**Step 2: Update bottom HUD wave format**

Change line 83 from:
```javascript
ctx.fillText(`WAVE ${enemyManager.waveNumber + 1} INCOMING...`, CONFIG.CANVAS_WIDTH / 2, bottomHudY + 16);
```

To:
```javascript
ctx.fillText(`WAVE ${game.currentZone}-${enemyManager.waveNumber + 1} INCOMING...`, CONFIG.CANVAS_WIDTH / 2, bottomHudY + 16);
```

Change line 87-91 from:
```javascript
let waveText = `WAVE ${enemyManager.waveNumber} - ${timeDisplay}`;
```

To:
```javascript
let waveText = `WAVE ${game.currentZone}-${enemyManager.waveNumber} - ${timeDisplay}`;
```

**Step 3: Commit**

```bash
git add js/ui.js
git commit -m "feat: update HUD to show zone-wave format"
```

---

### Task 1.4: Add Zone Splash Screen

**Files:**
- Modify: `js/ui.js` (add new function)
- Modify: `js/game.js` (call splash on zone start)

**Step 1: Add zone splash render function to ui.js**

Add after renderHUD function:

```javascript
// Zone splash screen overlay
let zoneSplashTimer = 0;
let zoneSplashText = '';

function showZoneSplash(zoneName) {
    zoneSplashText = `ENTERING ${zoneName.toUpperCase()}`;
    zoneSplashTimer = 3.0; // 3 seconds
}

function updateZoneSplash(deltaTime) {
    if (zoneSplashTimer > 0) {
        zoneSplashTimer -= deltaTime;
    }
}

function renderZoneSplash(ctx) {
    if (zoneSplashTimer <= 0) return;

    const alpha = Math.min(1, zoneSplashTimer / 0.5); // Fade out in last 0.5s

    ctx.save();
    ctx.globalAlpha = alpha * 0.7;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, CONFIG.CANVAS_HEIGHT / 2 - 50, CONFIG.CANVAS_WIDTH, 100);

    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(zoneSplashText, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 10);
    ctx.restore();
}
```

**Step 2: Integrate splash into game loop**

In `js/game.js`, in the update function, add:
```javascript
updateZoneSplash(deltaTime);
```

In the render function, add after rendering HUD:
```javascript
renderZoneSplash(ctx);
```

**Step 3: Trigger splash on zone start**

In initGame(), add after `game.currentZone = zoneNumber;`:
```javascript
const zoneName = CONFIG.ZONES[game.currentZone].name;
showZoneSplash(zoneName);
```

**Step 4: Commit**

```bash
git add js/ui.js js/game.js
git commit -m "feat: add zone splash screen on zone start"
```

---

## Phase 2: Stage Select Screen

### Task 2.1: Add STAGE_SELECT Game State

**Files:**
- Modify: `js/game.js:10-16`

**Step 1: Add new game state**

```javascript
const GameState = {
    LOADING: 'loading',
    TITLE: 'title',
    STAGE_SELECT: 'stageselect',  // NEW
    PLAYING: 'playing',
    GAME_OVER: 'gameover',
    VICTORY: 'victory'
};
```

**Step 2: Commit**

```bash
git add js/game.js
git commit -m "feat: add STAGE_SELECT game state"
```

---

### Task 2.2: Create Stage Select UI

**Files:**
- Create: `js/stageselect.js`

**Step 1: Create stage select manager**

```javascript
// Stage Select Screen
const StageSelect = {
    selectedZone: 1,

    init() {
        this.selectedZone = 1;
    },

    update(deltaTime) {
        // Handle input
        if (input.isKeyPressed('ArrowUp') || input.isKeyPressed('KeyW')) {
            this.selectedZone = Math.max(1, this.selectedZone - 1);
        }
        if (input.isKeyPressed('ArrowDown') || input.isKeyPressed('KeyS')) {
            this.selectedZone = Math.min(CONFIG.TOTAL_ZONES, this.selectedZone + 1);
        }

        // Check if zone is unlocked before allowing selection
        if (input.isKeyPressed('Enter') || input.isKeyPressed('Space')) {
            if (game.zoneUnlocked[this.selectedZone - 1]) {
                game.currentZone = this.selectedZone;
                initGame(1, this.selectedZone);
            }
        }

        // Back to title
        if (input.isKeyPressed('Escape')) {
            game.state = GameState.TITLE;
        }
    },

    render(ctx) {
        // Background
        ctx.fillStyle = '#0a0a15';
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SELECT ZONE', CONFIG.CANVAS_WIDTH / 2, 120);

        // Zone options
        const startY = 220;
        const spacing = 80;

        for (let i = 1; i <= CONFIG.TOTAL_ZONES; i++) {
            const zone = CONFIG.ZONES[i];
            const y = startY + (i - 1) * spacing;
            const isSelected = this.selectedZone === i;
            const isUnlocked = game.zoneUnlocked[i - 1];

            // Selection indicator
            if (isSelected) {
                ctx.fillStyle = '#ffcc00';
                ctx.fillText('>', CONFIG.CANVAS_WIDTH / 2 - 150, y);
            }

            // Zone name
            ctx.fillStyle = isUnlocked ? (isSelected ? '#ffcc00' : '#ffffff') : '#666666';
            ctx.font = isSelected ? 'bold 28px monospace' : '24px monospace';
            ctx.fillText(`ZONE ${i}: ${zone.name}`, CONFIG.CANVAS_WIDTH / 2, y);

            // Lock indicator
            if (!isUnlocked) {
                ctx.fillStyle = '#ff4444';
                ctx.font = '16px monospace';
                ctx.fillText('[LOCKED - Complete Zone 1]', CONFIG.CANVAS_WIDTH / 2, y + 25);
            }
        }

        // Instructions
        ctx.fillStyle = '#888888';
        ctx.font = '14px monospace';
        ctx.fillText('UP/DOWN to select, ENTER to start, ESC for title', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT - 50);
    }
};
```

**Step 2: Commit**

```bash
git add js/stageselect.js
git commit -m "feat: create stage select screen"
```

---

### Task 2.3: Integrate Stage Select into Game Loop

**Files:**
- Modify: `js/game.js` (update/render functions)
- Modify: `index.html` (add script)

**Step 1: Add script to index.html**

Add before game.js:
```html
<script src="js/stageselect.js"></script>
```

**Step 2: Update game loop to handle STAGE_SELECT state**

In the main update function, add case:
```javascript
case GameState.STAGE_SELECT:
    StageSelect.update(deltaTime);
    break;
```

In the main render function, add case:
```javascript
case GameState.STAGE_SELECT:
    StageSelect.render(ctx);
    break;
```

**Step 3: Modify title screen to go to stage select**

Change the transition from TITLE to PLAYING to go through STAGE_SELECT instead.

**Step 4: Commit**

```bash
git add js/game.js index.html
git commit -m "feat: integrate stage select into game loop"
```

---

### Task 2.4: Unlock Zone 2 on Zone 1 Victory

**Files:**
- Modify: `js/game.js` (victory handling)

**Step 1: Add zone unlock on boss defeat**

In the victory handling code (when boss is defeated), add:
```javascript
// Unlock next zone
if (game.currentZone < CONFIG.TOTAL_ZONES) {
    game.zoneUnlocked[game.currentZone] = true;
    console.log(`Zone ${game.currentZone + 1} unlocked!`);
}
```

**Step 2: Persist unlock status to localStorage**

```javascript
function saveZoneProgress() {
    localStorage.setItem('zoneUnlocked', JSON.stringify(game.zoneUnlocked));
}

function loadZoneProgress() {
    const saved = localStorage.getItem('zoneUnlocked');
    if (saved) {
        game.zoneUnlocked = JSON.parse(saved);
    }
}
```

Call `loadZoneProgress()` on game init and `saveZoneProgress()` when unlocking.

**Step 3: Commit**

```bash
git add js/game.js
git commit -m "feat: unlock zone 2 on zone 1 victory with persistence"
```

---

### Task 2.5: Update initGame to Accept Zone Parameter

**Files:**
- Modify: `js/game.js:80-100`

**Step 1: Add zone parameter to initGame**

```javascript
function initGame(playerCount = 1, zoneNumber = 1) {
    numPlayers = playerCount;
    game.currentZone = zoneNumber;

    buildingManager.init(zoneNumber);  // Pass zone to building init
    playerManager.init(numPlayers);
    player = playerManager.getPlayer(1);
    projectileManager.clear();
    enemyManager.reset();
    enemyManager.setZone(zoneNumber);  // Tell enemy manager which zone
    enemyManager.startWave(1);
    // ... rest of init

    // Show zone splash
    const zoneName = CONFIG.ZONES[zoneNumber].name;
    showZoneSplash(zoneName);

    game.score = 0;
    game.nextBonusLifeAt = CONFIG.BONUS_LIFE_THRESHOLD;
    game.state = GameState.PLAYING;
}
```

**Step 2: Commit**

```bash
git add js/game.js
git commit -m "feat: update initGame to accept zone parameter"
```

---

## Phase 3: Zone 2 Buildings

### Task 3.1: Create Zone-Specific Building Definitions

**Files:**
- Modify: `js/buildings.js:1-10`

**Step 1: Convert BUILDING_DEFS to zone-indexed object**

Replace:
```javascript
const BUILDING_DEFS = [
    { x: 100, width: 5, height: 14 },
    // ...
];
```

With:
```javascript
const BUILDING_DEFS = {
    1: [ // Zone 1: New York City
        { x: 100, width: 5, height: 14, name: 'building' },
        { x: 240, width: 6, height: 22, name: 'building' },
        { x: 400, width: 5, height: 16, name: 'building' },
        { x: 540, width: 7, height: 25, name: 'building' },
        { x: 700, width: 5, height: 18, name: 'building' },
        { x: 820, width: 5, height: 10, name: 'building' }
    ],
    2: [ // Zone 2: Desert Outpost
        { x: 80,  width: 4, height: 8,  name: 'bunker',        abilityKills: 5,  ability: 'aa_battery' },
        { x: 220, width: 5, height: 12, name: 'barracks',      abilityKills: 6,  ability: 'infantry' },
        { x: 380, width: 4, height: 18, name: 'radar_tower',   abilityKills: 10, ability: 'airstrike' },
        { x: 520, width: 5, height: 20, name: 'church',        abilityKills: 12, ability: 'bell_slow' },
        { x: 660, width: 5, height: 14, name: 'control_tower', abilityKills: 8,  ability: 'targeting_boost' },
        { x: 820, width: 4, height: 10, name: 'ammo_depot',    abilityKills: 5,  ability: 'artillery' }
    ]
};
```

**Step 2: Commit**

```bash
git add js/buildings.js
git commit -m "feat: add zone-specific building definitions"
```

---

### Task 3.2: Update BuildingManager to Use Zone Definitions

**Files:**
- Modify: `js/buildings.js` (BuildingManager class)

**Step 1: Update BuildingManager.init to accept zone**

Find the init method and update:
```javascript
init(zoneNumber = 1) {
    this.buildings = [];
    this.currentZone = zoneNumber;
    const defs = BUILDING_DEFS[zoneNumber] || BUILDING_DEFS[1];

    for (const def of defs) {
        const building = new Building(def.x, def.width, def.height);
        building.name = def.name || 'building';
        building.abilityKills = def.abilityKills || 0;
        building.ability = def.ability || null;
        building.chargeKills = 0;  // Current kill charge
        building.isCharged = false;
        this.buildings.push(building);
    }
}
```

**Step 2: Commit**

```bash
git add js/buildings.js
git commit -m "feat: update BuildingManager to use zone-specific definitions"
```

---

### Task 3.3: Add Building Charge Properties to Building Class

**Files:**
- Modify: `js/buildings.js` (Building class constructor)

**Step 1: Add charge-related properties**

In Building constructor, add:
```javascript
// Zone 2 ability charge system
this.name = 'building';
this.ability = null;
this.abilityKills = 0;
this.chargeKills = 0;
this.isCharged = false;
this.chargeDisabled = false; // True if > 60% destroyed
```

**Step 2: Add method to check charge eligibility**

```javascript
canCharge() {
    if (!this.ability) return false;
    if (this.chargeDisabled) return false;

    const destructionPercent = 1 - (this.getBlockCount() / this.originalBlockCount);
    if (destructionPercent >= 0.6) {
        this.chargeDisabled = true;
        this.isCharged = false;
        return false;
    }
    return true;
}

getChargeDiscount() {
    const destructionPercent = 1 - (this.getBlockCount() / this.originalBlockCount);
    // 50% destruction = 50% discount
    return Math.min(0.5, destructionPercent);
}

getEffectiveAbilityKills() {
    const discount = this.getChargeDiscount();
    return Math.ceil(this.abilityKills * (1 - discount));
}

addKillCharge() {
    if (!this.canCharge()) return;
    if (this.isCharged) return;

    this.chargeKills++;
    if (this.chargeKills >= this.getEffectiveAbilityKills()) {
        this.isCharged = true;
        console.log(`${this.name} is fully charged!`);
    }
}

resetCharge() {
    this.chargeKills = 0;
    this.isCharged = false;
}
```

**Step 3: Commit**

```bash
git add js/buildings.js
git commit -m "feat: add building charge system properties and methods"
```

---

### Task 3.4: Add Kill Credit Attribution to Buildings

**Files:**
- Modify: `js/enemies.js` (die method)
- Modify: `js/buildings.js` (add helper)

**Step 1: Add method to find nearest building**

In BuildingManager, add:
```javascript
getNearestBuilding(x, y) {
    let nearest = null;
    let nearestDist = Infinity;

    for (const building of this.buildings) {
        // Calculate distance to building's bottom-center
        const bx = building.x + (building.widthBlocks * building.blockSize) / 2;
        const by = building.y + building.height; // Bottom

        const dist = Math.sqrt((x - bx) ** 2 + (y - by) ** 2);
        if (dist < nearestDist) {
            nearestDist = dist;
            nearest = building;
        }
    }
    return nearest;
}
```

**Step 2: Credit kills to nearest building**

In enemy die() method, when enemy is killed (not despawned), add:
```javascript
// Credit kill to nearest building for charge system (Zone 2)
if (game.currentZone === 2 && typeof buildingManager !== 'undefined') {
    const nearestBuilding = buildingManager.getNearestBuilding(this.x, this.y);
    if (nearestBuilding) {
        nearestBuilding.addKillCharge();
    }
}
```

**Step 3: Commit**

```bash
git add js/enemies.js js/buildings.js
git commit -m "feat: credit enemy kills to nearest building for charge system"
```

---

### Task 3.5: Render Charge Flag on Buildings

**Files:**
- Modify: `js/buildings.js` (Building render method)

**Step 1: Add flag rendering**

In Building render method, add after drawing the building:
```javascript
// Render charge flag if building is charged (Zone 2)
if (this.isCharged && this.ability) {
    this.renderChargeFlag(ctx);
}

// Render charge progress bar (Zone 2)
if (this.ability && !this.isCharged && !this.chargeDisabled && this.chargeKills > 0) {
    this.renderChargeProgress(ctx);
}
```

**Step 2: Add flag render method**

```javascript
renderChargeFlag(ctx) {
    const flagX = this.x + (this.widthBlocks * this.blockSize) / 2;
    const flagY = this.y - 20;

    // Flag pole
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(flagX, this.y);
    ctx.lineTo(flagX, flagY);
    ctx.stroke();

    // Glowing flag
    const time = Date.now() / 200;
    const glow = 0.7 + Math.sin(time) * 0.3;

    ctx.fillStyle = `rgba(255, 204, 0, ${glow})`;
    ctx.beginPath();
    ctx.moveTo(flagX, flagY);
    ctx.lineTo(flagX + 20, flagY + 8);
    ctx.lineTo(flagX, flagY + 16);
    ctx.closePath();
    ctx.fill();

    // Glow effect
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ffcc00';
    ctx.fill();
    ctx.shadowBlur = 0;
}

renderChargeProgress(ctx) {
    const barWidth = this.widthBlocks * this.blockSize - 4;
    const barHeight = 4;
    const barX = this.x + 2;
    const barY = this.y - 10;

    const progress = this.chargeKills / this.getEffectiveAbilityKills();

    // Background
    ctx.fillStyle = '#333333';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Progress
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(barX, barY, barWidth * progress, barHeight);
}
```

**Step 3: Commit**

```bash
git add js/buildings.js
git commit -m "feat: render charge flag and progress bar on buildings"
```

---

### Task 3.6: Create Flag Pickup Collision

**Files:**
- Modify: `js/game.js` (collision detection)
- Create: `js/abilities.js` (ability system)

**Step 1: Create abilities manager**

```javascript
// Building Defense Abilities System
const AbilityManager = {
    activeAbilities: [],

    reset() {
        this.activeAbilities = [];
    },

    triggerAbility(building, player) {
        if (!building.isCharged || !building.ability) return;

        console.log(`Triggering ${building.ability} from ${building.name}`);

        switch (building.ability) {
            case 'aa_battery':
                this.spawnAABattery(building);
                break;
            case 'infantry':
                this.spawnInfantry(building);
                break;
            case 'airstrike':
                this.triggerAirstrike();
                break;
            case 'bell_slow':
                this.triggerBellSlow();
                break;
            case 'targeting_boost':
                this.triggerTargetingBoost(player);
                break;
            case 'artillery':
                this.triggerArtillery();
                break;
        }

        building.resetCharge();
    },

    update(deltaTime) {
        // Update active abilities
        for (let i = this.activeAbilities.length - 1; i >= 0; i--) {
            const ability = this.activeAbilities[i];
            ability.duration -= deltaTime;

            if (ability.update) ability.update(deltaTime);

            if (ability.duration <= 0) {
                if (ability.onEnd) ability.onEnd();
                this.activeAbilities.splice(i, 1);
            }
        }
    },

    render(ctx) {
        for (const ability of this.activeAbilities) {
            if (ability.render) ability.render(ctx);
        }
    },

    // Ability implementations (stubs - will be detailed in Phase 5)
    spawnAABattery(building) { /* TODO */ },
    spawnInfantry(building) { /* TODO */ },
    triggerAirstrike() { /* TODO */ },
    triggerBellSlow() { /* TODO */ },
    triggerTargetingBoost(player) { /* TODO */ },
    triggerArtillery() { /* TODO */ }
};
```

**Step 2: Add flag collision check in game.js**

In collision detection section:
```javascript
// Check player collision with charged building flags (Zone 2)
if (game.currentZone === 2) {
    for (const building of buildingManager.buildings) {
        if (building.isCharged) {
            const flagX = building.x + (building.widthBlocks * building.blockSize) / 2;
            const flagY = building.y - 20;

            // Check collision with flag area
            const dx = player.x - flagX;
            const dy = player.y - flagY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 30) {
                AbilityManager.triggerAbility(building, player);
            }
        }
    }
}
```

**Step 3: Commit**

```bash
git add js/abilities.js js/game.js
git commit -m "feat: add flag pickup collision and ability trigger system"
```

---

## Phase 4: Enhanced Returning Enemies

### Task 4.1: Add Zone-Specific Enemy Stats

**Files:**
- Modify: `js/config.js`

**Step 1: Add zone enemy stat modifiers**

```javascript
// Zone-specific enemy stat modifiers
ZONE_ENEMY_STATS: {
    1: {
        STANDARD: { speed: 60, health: 1 },
        AGGRESSIVE: { speed: 100, health: 1, shotCount: 3 }
    },
    2: {
        STANDARD: { speed: 75, health: 2 },      // +25% speed, +1 HP
        AGGRESSIVE: { speed: 100, health: 1, shotCount: 4, erratic: true }  // 4-shot, erratic
    }
},
```

**Step 2: Commit**

```bash
git add js/config.js
git commit -m "feat: add zone-specific enemy stat modifiers"
```

---

### Task 4.2: Apply Zone Stats in Enemy Constructor

**Files:**
- Modify: `js/enemies.js` (configureStats method)

**Step 1: Update configureStats to use zone modifiers**

```javascript
configureStats(type) {
    const zoneStats = CONFIG.ZONE_ENEMY_STATS[game.currentZone] || CONFIG.ZONE_ENEMY_STATS[1];

    switch (type) {
        case EnemyType.STANDARD:
            const stdStats = zoneStats.STANDARD || { speed: 60, health: 1 };
            this.speed = stdStats.speed;
            this.health = stdStats.health;
            this.width = 30; this.height = 20;
            this.attackTimeMin = 1.0; this.attackTimeMax = 3.0;
            break;

        case EnemyType.AGGRESSIVE:
            const aggStats = zoneStats.AGGRESSIVE || { speed: 100, health: 1, shotCount: 3 };
            this.speed = aggStats.speed;
            this.health = aggStats.health;
            this.shotCount = aggStats.shotCount;
            this.erraticMovement = aggStats.erratic || false;
            this.width = 35; this.height = 25;
            this.attackTimeMin = 0.5; this.attackTimeMax = 1.5;
            break;
        // ... rest of cases
    }
}
```

**Step 2: Commit**

```bash
git add js/enemies.js
git commit -m "feat: apply zone-specific stats in enemy constructor"
```

---

### Task 4.3: Implement Erratic Movement for Zone 2 Aggressive Drones

**Files:**
- Modify: `js/enemies.js` (updateFlying for AGGRESSIVE)

**Step 1: Add erratic movement modifier**

In the AGGRESSIVE drone flying update, add:
```javascript
if (this.erraticMovement) {
    // More frequent direction changes
    this.directionChangeInterval = 0.1 + Math.random() * 0.2;

    // Add random jitter to position
    this.x += (Math.random() - 0.5) * 3;
    this.y += (Math.random() - 0.5) * 2;
}
```

**Step 2: Commit**

```bash
git add js/enemies.js
git commit -m "feat: add erratic movement for zone 2 aggressive drones"
```

---

## Phase 5: Building Defense Abilities (Detailed Implementation)

### Task 5.1: Implement AA Battery Ability

**Files:**
- Modify: `js/abilities.js`

**Step 1: Implement AA Battery spawn**

```javascript
spawnAABattery(building) {
    const turret = {
        x: building.x + (building.widthBlocks * building.blockSize) / 2,
        y: building.y - 10,
        duration: 20,
        fireRate: 0.5,
        fireTimer: 0,
        target: null,

        update(deltaTime) {
            this.fireTimer -= deltaTime;

            // Find nearest enemy
            if (typeof enemyManager !== 'undefined') {
                let nearest = null;
                let nearestDist = 300; // Max range

                for (const enemy of enemyManager.enemies) {
                    if (!enemy.active || enemy.state === EnemyState.DYING) continue;
                    const dist = Math.sqrt((enemy.x - this.x) ** 2 + (enemy.y - this.y) ** 2);
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearest = enemy;
                    }
                }
                this.target = nearest;
            }

            // Fire at target
            if (this.target && this.fireTimer <= 0) {
                this.fireTimer = this.fireRate;
                const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x) * 180 / Math.PI;
                projectileManager.add(this.x, this.y, angle, 400, true, 0); // Player projectile
                if (typeof SoundManager !== 'undefined') SoundManager.shoot();
            }
        },

        render(ctx) {
            // Draw turret base
            ctx.fillStyle = '#4a5568';
            ctx.fillRect(this.x - 12, this.y - 5, 24, 10);

            // Draw barrel pointing at target
            ctx.strokeStyle = '#718096';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);

            if (this.target) {
                const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
                ctx.lineTo(this.x + Math.cos(angle) * 15, this.y + Math.sin(angle) * 15);
            } else {
                ctx.lineTo(this.x, this.y - 15);
            }
            ctx.stroke();
        }
    };

    this.activeAbilities.push(turret);
    if (typeof EffectsManager !== 'undefined') {
        EffectsManager.addTextPopup(building.x + 30, building.y - 30, 'AA BATTERY!', '#00ff88');
    }
}
```

**Step 2: Commit**

```bash
git add js/abilities.js
git commit -m "feat: implement AA battery building ability"
```

---

### Task 5.2: Implement Infantry Squad Ability

**Files:**
- Modify: `js/abilities.js`

**Step 1: Implement infantry spawn**

```javascript
spawnInfantry(building) {
    const soldierCount = 3 + Math.floor(Math.random() * 2); // 3-4 soldiers

    for (let i = 0; i < soldierCount; i++) {
        const soldier = {
            x: building.x + 10 + i * 15,
            y: building.y - 5,
            duration: 17 + Math.random() * 3, // 15-20 seconds
            fireRate: 1.0,
            fireTimer: Math.random(),

            update(deltaTime) {
                this.fireTimer -= deltaTime;

                if (this.fireTimer <= 0) {
                    this.fireTimer = this.fireRate;

                    // Fire at random angle upward
                    const angle = -90 + (Math.random() - 0.5) * 60; // -120 to -60 degrees
                    projectileManager.add(this.x, this.y, angle, 250, true, 0);
                }
            },

            render(ctx) {
                // Simple soldier sprite
                ctx.fillStyle = '#2d5016';
                ctx.fillRect(this.x - 3, this.y - 8, 6, 8);
                ctx.fillStyle = '#f5deb3';
                ctx.beginPath();
                ctx.arc(this.x, this.y - 10, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        };

        this.activeAbilities.push(soldier);
    }

    if (typeof EffectsManager !== 'undefined') {
        EffectsManager.addTextPopup(building.x + 30, building.y - 30, 'INFANTRY!', '#00ff88');
    }
}
```

**Step 2: Commit**

```bash
git add js/abilities.js
git commit -m "feat: implement infantry squad building ability"
```

---

### Task 5.3: Implement Airstrike Ability

**Files:**
- Modify: `js/abilities.js`

**Step 1: Implement airstrike**

```javascript
triggerAirstrike() {
    const jet = {
        x: -100,
        y: 150 + Math.random() * 100,
        duration: 3,
        speed: 600,
        hasFired: false,

        update(deltaTime) {
            this.x += this.speed * deltaTime;

            // Fire at all airborne enemies when crossing screen center
            if (!this.hasFired && this.x > CONFIG.CANVAS_WIDTH / 2) {
                this.hasFired = true;

                if (typeof enemyManager !== 'undefined') {
                    for (const enemy of enemyManager.enemies) {
                        if (!enemy.active) continue;
                        // Damage all flying enemies
                        if (enemy.state === EnemyState.FLYING || enemy.state === EnemyState.ATTACKING) {
                            enemy.die();
                            addScore(100);
                        }
                    }
                }

                if (typeof EffectsManager !== 'undefined') {
                    EffectsManager.shake(10);
                    // Explosion trail across screen
                    for (let x = 100; x < CONFIG.CANVAS_WIDTH - 100; x += 80) {
                        EffectsManager.addExplosion(x, this.y, 30, '#ff6600');
                    }
                }
                if (typeof SoundManager !== 'undefined') SoundManager.explosion();
            }
        },

        render(ctx) {
            // Simple jet shape
            ctx.save();
            ctx.translate(this.x, this.y);

            ctx.fillStyle = '#4a5568';
            ctx.beginPath();
            ctx.moveTo(30, 0);
            ctx.lineTo(-20, -10);
            ctx.lineTo(-30, -5);
            ctx.lineTo(-30, 5);
            ctx.lineTo(-20, 10);
            ctx.closePath();
            ctx.fill();

            // Afterburner
            ctx.fillStyle = '#ff8800';
            ctx.beginPath();
            ctx.moveTo(-30, -3);
            ctx.lineTo(-50 - Math.random() * 10, 0);
            ctx.lineTo(-30, 3);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        }
    };

    this.activeAbilities.push(jet);
    if (typeof EffectsManager !== 'undefined') {
        EffectsManager.addTextPopup(CONFIG.CANVAS_WIDTH / 2, 100, 'AIRSTRIKE INCOMING!', '#ff4444');
    }
}
```

**Step 2: Commit**

```bash
git add js/abilities.js
git commit -m "feat: implement airstrike building ability"
```

---

### Task 5.4: Implement Bell Tower Slow Ability

**Files:**
- Modify: `js/abilities.js`
- Modify: `js/enemies.js` (add slow modifier)
- Modify: `js/projectiles.js` (add slow modifier)

**Step 1: Implement bell slow trigger**

```javascript
triggerBellSlow() {
    const bellEffect = {
        duration: 9, // 8-10 seconds
        slowFactor: 0.3, // 30% speed

        update(deltaTime) {
            // Apply slow to all enemies
            if (typeof enemyManager !== 'undefined') {
                for (const enemy of enemyManager.enemies) {
                    enemy.bellSlowed = true;
                }
            }
            // Apply slow to enemy projectiles
            if (typeof projectileManager !== 'undefined') {
                for (const proj of projectileManager.projectiles) {
                    if (!proj.isPlayerProjectile) {
                        proj.bellSlowed = true;
                    }
                }
            }
        },

        onEnd() {
            // Remove slow from all enemies
            if (typeof enemyManager !== 'undefined') {
                for (const enemy of enemyManager.enemies) {
                    enemy.bellSlowed = false;
                }
            }
            if (typeof projectileManager !== 'undefined') {
                for (const proj of projectileManager.projectiles) {
                    proj.bellSlowed = false;
                }
            }
        },

        render(ctx) {
            // Screen-wide blue tint
            ctx.fillStyle = 'rgba(100, 150, 255, 0.1)';
            ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        }
    };

    this.activeAbilities.push(bellEffect);
    if (typeof EffectsManager !== 'undefined') {
        EffectsManager.addTextPopup(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2, 'TIME SLOW!', '#4488ff');
        EffectsManager.shake(5);
    }
}
```

**Step 2: Apply slow modifier in enemy update**

In Enemy update methods, multiply speed by slow factor:
```javascript
const speedMod = this.bellSlowed ? 0.3 : 1.0;
this.x += this.velX * this.speed * speedMod * deltaTime;
```

**Step 3: Apply slow modifier in projectile update**

In Projectile update:
```javascript
const speedMod = this.bellSlowed ? 0.3 : 1.0;
this.x += Math.cos(radians) * this.speed * speedMod * deltaTime;
this.y += Math.sin(radians) * this.speed * speedMod * deltaTime;
```

**Step 4: Commit**

```bash
git add js/abilities.js js/enemies.js js/projectiles.js
git commit -m "feat: implement bell tower slow ability"
```

---

### Task 5.5: Implement Targeting Boost Ability

**Files:**
- Modify: `js/abilities.js`
- Modify: `js/player.js` (add boost flags)

**Step 1: Implement targeting boost**

```javascript
triggerTargetingBoost(player) {
    const boost = {
        duration: 10,
        player: player,

        update(deltaTime) {
            if (this.player) {
                this.player.targetingBoost = true;
                this.player.fireRateBoost = true;
            }
        },

        onEnd() {
            if (this.player) {
                this.player.targetingBoost = false;
                this.player.fireRateBoost = false;
            }
        },

        render(ctx) {
            // Glow around player
            if (this.player) {
                ctx.save();
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = '#00ff88';
                ctx.beginPath();
                ctx.arc(this.player.x, this.player.y, 40, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
    };

    this.activeAbilities.push(boost);
    if (typeof EffectsManager !== 'undefined') {
        EffectsManager.addTextPopup(player.x, player.y - 30, 'TARGETING BOOST!', '#00ff88');
    }
}
```

**Step 2: Apply boost in player shooting code**

Modify fire rate check and add slight homing to player projectiles when boosted.

**Step 3: Commit**

```bash
git add js/abilities.js js/player.js
git commit -m "feat: implement targeting boost building ability"
```

---

### Task 5.6: Implement Artillery Barrage Ability

**Files:**
- Modify: `js/abilities.js`

**Step 1: Implement artillery barrage**

```javascript
triggerArtillery() {
    const shellCount = 3 + Math.floor(Math.random() * 2); // 3-4 shells

    // Find enemy clusters
    const targets = [];
    if (typeof enemyManager !== 'undefined') {
        for (const enemy of enemyManager.enemies) {
            if (enemy.active && enemy.state !== EnemyState.DYING) {
                targets.push({ x: enemy.x, y: enemy.y });
            }
        }
    }

    // Fire shells at random targets or positions
    for (let i = 0; i < shellCount; i++) {
        const delay = i * 0.3;

        setTimeout(() => {
            let targetX, targetY;

            if (targets.length > 0) {
                const target = targets[Math.floor(Math.random() * targets.length)];
                targetX = target.x + (Math.random() - 0.5) * 50;
                targetY = target.y + (Math.random() - 0.5) * 50;
            } else {
                targetX = 100 + Math.random() * (CONFIG.CANVAS_WIDTH - 200);
                targetY = 100 + Math.random() * 300;
            }

            // Create explosion at target
            if (typeof EffectsManager !== 'undefined') {
                EffectsManager.addExplosion(targetX, targetY, 40, '#ff6600');
                EffectsManager.addAnimatedExplosion(targetX, targetY, 'enemy', 35);
                EffectsManager.shake(5);
            }

            // Damage enemies in radius
            if (typeof enemyManager !== 'undefined') {
                for (const enemy of enemyManager.enemies) {
                    if (!enemy.active) continue;
                    const dist = Math.sqrt((enemy.x - targetX) ** 2 + (enemy.y - targetY) ** 2);
                    if (dist < 60) {
                        enemy.die();
                        addScore(100);
                    }
                }
            }

            if (typeof SoundManager !== 'undefined') SoundManager.explosion();
        }, delay * 1000);
    }

    if (typeof EffectsManager !== 'undefined') {
        EffectsManager.addTextPopup(CONFIG.CANVAS_WIDTH / 2, 80, 'ARTILLERY BARRAGE!', '#ff8800');
    }
}
```

**Step 2: Commit**

```bash
git add js/abilities.js
git commit -m "feat: implement artillery barrage building ability"
```

---

## Phase 6: New Desert Enemies

*Note: Each enemy type is a substantial implementation. Tasks are grouped by enemy.*

### Task 6.1: Add New Enemy Types to EnemyType Enum

**Files:**
- Modify: `js/enemies.js:1-7`

**Step 1: Add new enemy types**

```javascript
const EnemyType = {
    STANDARD: 'standard',
    AGGRESSIVE: 'aggressive',
    TANK: 'tank',
    SPLITTER: 'splitter',
    BOMBER: 'bomber',
    // Zone 2 enemies
    DUST_DEVIL: 'dust_devil',
    SANDWORM: 'sandworm',
    SAND_CARRIER: 'sand_carrier',
    SCORPION: 'scorpion'
};
```

**Step 2: Commit**

```bash
git add js/enemies.js
git commit -m "feat: add zone 2 enemy types to enum"
```

---

### Task 6.2: Implement Dust Devil Enemy

**Files:**
- Modify: `js/enemies.js` (configureStats, updateFlying, render)

**Step 1: Add Dust Devil stats**

```javascript
case EnemyType.DUST_DEVIL:
    this.speed = 80;
    this.health = 1;
    this.width = 24; this.height = 24;
    this.spiralAngle = 0;
    this.spiralRadius = 30;
    this.targetBuilding = null;
    break;
```

**Step 2: Add Dust Devil flying behavior**

```javascript
// Dust Devil: Spiral toward building target
if (this.type === EnemyType.DUST_DEVIL) {
    // Pick target building if none
    if (!this.targetBuilding && typeof buildingManager !== 'undefined') {
        const buildings = buildingManager.buildings.filter(b => b.getBlockCount() > 0);
        if (buildings.length > 0) {
            this.targetBuilding = buildings[Math.floor(Math.random() * buildings.length)];
        }
    }

    if (this.targetBuilding) {
        const targetX = this.targetBuilding.x + this.targetBuilding.width / 2;
        const targetY = this.targetBuilding.y;

        // Move toward target with spiral
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        this.spiralAngle += deltaTime * 5;
        const spiralX = Math.cos(this.spiralAngle) * this.spiralRadius;
        const spiralY = Math.sin(this.spiralAngle) * this.spiralRadius;

        if (dist > 20) {
            this.x += (dx / dist) * this.speed * deltaTime + spiralX * deltaTime;
            this.y += (dy / dist) * this.speed * deltaTime + spiralY * deltaTime;
        } else {
            // Hit building
            this.targetBuilding.destroyBlock(0, Math.floor(this.targetBuilding.widthBlocks / 2));
            if (typeof EffectsManager !== 'undefined') {
                EffectsManager.addExplosion(this.x, this.y, 20, '#cc9944');
            }
            this.die(true);
        }
    }
    return;
}
```

**Step 3: Add Dust Devil render**

```javascript
renderDustDevil(ctx) {
    // Spinning dust/sand effect
    const time = Date.now() / 100;

    ctx.save();
    ctx.rotate(time);

    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + time;
        const dist = 8 + Math.sin(time + i) * 3;
        const px = Math.cos(angle) * dist;
        const py = Math.sin(angle) * dist;

        ctx.fillStyle = `rgba(194, 154, 108, ${0.6 + Math.sin(time + i) * 0.3})`;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // Core
    ctx.fillStyle = '#a08060';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}
```

**Step 4: Commit**

```bash
git add js/enemies.js
git commit -m "feat: implement Dust Devil enemy with spiral attack"
```

---

### Task 6.3: Implement Sandworm Enemy

**Files:**
- Modify: `js/enemies.js`

**Step 1: Add Sandworm stats**

```javascript
case EnemyType.SANDWORM:
    this.speed = 60;
    this.health = 2;
    this.width = 30; this.height = 20;
    this.currentBuildingIndex = 0;
    this.isSurfacing = false;
    this.surfaceTimer = 0;
    this.targetX = 0;
    this.y = CONFIG.STREET_Y - 10; // Just below ground
    break;
```

**Step 2: Add Sandworm behavior**

```javascript
// Sandworm: Travels underground, surfaces at buildings
if (this.type === EnemyType.SANDWORM) {
    if (typeof buildingManager === 'undefined') return;

    const buildings = buildingManager.buildings;
    if (this.currentBuildingIndex >= buildings.length) {
        // Visited all buildings, despawn (no score)
        this.active = false;
        this.state = EnemyState.DEAD;
        return;
    }

    const targetBuilding = buildings[this.currentBuildingIndex];
    this.targetX = targetBuilding.x + targetBuilding.width / 2;

    if (!this.isSurfacing) {
        // Move toward target building
        const dx = this.targetX - this.x;
        if (Math.abs(dx) > 10) {
            this.x += Math.sign(dx) * this.speed * deltaTime;
        } else {
            // Start surfacing
            this.isSurfacing = true;
            this.surfaceTimer = 1.5; // Surface for 1.5 seconds
        }
    } else {
        this.surfaceTimer -= deltaTime;

        if (this.surfaceTimer <= 1.0 && !this.hasAttacked) {
            this.hasAttacked = true;
            // Destroy 1-2 foundation blocks
            const blocksToDestroy = 1 + Math.floor(Math.random() * 2);
            for (let i = 0; i < blocksToDestroy; i++) {
                const col = Math.floor(targetBuilding.widthBlocks / 2) + i - 1;
                const row = targetBuilding.heightBlocks - 1; // Bottom row
                if (col >= 0 && col < targetBuilding.widthBlocks) {
                    targetBuilding.destroyBlock(row, col);
                }
            }
            if (typeof EffectsManager !== 'undefined') {
                EffectsManager.addExplosion(this.x, CONFIG.STREET_Y - 20, 25, '#cc9944');
            }
        }

        if (this.surfaceTimer <= 0) {
            this.isSurfacing = false;
            this.hasAttacked = false;
            this.currentBuildingIndex++;
        }
    }
    return;
}
```

**Step 3: Add Sandworm render**

```javascript
renderSandworm(ctx) {
    // Sand trail when burrowing
    if (!this.isSurfacing) {
        // Trail of disturbed sand
        ctx.fillStyle = '#d4a574';
        for (let i = 0; i < 5; i++) {
            const tx = -i * 15 - Math.random() * 5;
            ctx.beginPath();
            ctx.arc(tx, 5, 6 - i, 0, Math.PI * 2);
            ctx.fill();
        }

        // Bulge
        ctx.fillStyle = '#c49464';
        ctx.beginPath();
        ctx.ellipse(0, 0, 15, 8, 0, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Surfaced worm
        ctx.fillStyle = '#8b6914';
        ctx.beginPath();
        ctx.moveTo(0, -30);
        ctx.bezierCurveTo(15, -20, 15, 10, 0, 20);
        ctx.bezierCurveTo(-15, 10, -15, -20, 0, -30);
        ctx.fill();

        // Mouth
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(0, -25, 8, 0, Math.PI * 2);
        ctx.fill();
    }
}
```

**Step 4: Commit**

```bash
git add js/enemies.js
git commit -m "feat: implement Sandworm enemy with burrowing attack"
```

---

### Task 6.4: Implement Sandstorm Carrier Enemy

**Files:**
- Modify: `js/enemies.js`

**Step 1: Add Sand Carrier stats**

```javascript
case EnemyType.SAND_CARRIER:
    this.speed = CONFIG.CARRIER_SPEED;
    this.health = 3;
    this.width = 96; this.height = 96;
    this.podDropTimer = 2;
    this.podDropInterval = 3;
    this.carrierMovingRight = Math.random() < 0.5;
    break;
```

**Step 2: Add pod class and behavior**

```javascript
// Global array for burrowing pods
let burrowingPods = [];

class BurrowingPod {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.burstTimer = 4.5; // 4-5 seconds
        this.active = true;
    }

    update(deltaTime) {
        this.burstTimer -= deltaTime;

        if (this.burstTimer <= 0 && this.active) {
            this.active = false;
            // Spawn drone
            if (typeof enemyManager !== 'undefined') {
                const drone = new Enemy(this.x, this.y - 30, EnemyType.STANDARD);
                drone.velY = -0.5;
                enemyManager.enemies.push(drone);
            }
            if (typeof EffectsManager !== 'undefined') {
                EffectsManager.addExplosion(this.x, this.y, 20, '#cc9944');
            }
        }
    }

    render(ctx) {
        if (!this.active) return;

        // Pulsing buried pod
        const pulse = 0.5 + Math.sin(Date.now() / 200) * 0.3;
        ctx.fillStyle = `rgba(139, 90, 43, ${pulse})`;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Warning when about to burst
        if (this.burstTimer < 1) {
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
}
```

**Step 3: Add Sand Carrier flying behavior**

Similar to regular Carrier but drops pods instead of spawning drones directly.

**Step 4: Commit**

```bash
git add js/enemies.js
git commit -m "feat: implement Sandstorm Carrier with burrowing pods"
```

---

### Task 6.5: Implement Scorpion Tank Enemy

**Files:**
- Modify: `js/enemies.js`

**Step 1: Add Scorpion stats**

```javascript
case EnemyType.SCORPION:
    this.speed = 20;
    this.health = 6;
    this.width = 48; this.height = 32;
    this.climbingBuilding = null;
    this.climbRow = 0;
    this.climbTimer = 0;
    this.attackTimer = 0;
    this.onRooftop = false;
    this.rooftopTimer = 0;
    break;
```

**Step 2: Add Scorpion behavior**

```javascript
// Scorpion: Climbs buildings, destroys blocks, fires stingers
if (this.type === EnemyType.SCORPION) {
    if (!this.climbingBuilding) {
        // Find a building to climb
        if (typeof buildingManager !== 'undefined') {
            const buildings = buildingManager.buildings.filter(b => b.getBlockCount() > 0);
            if (buildings.length > 0) {
                this.climbingBuilding = buildings[Math.floor(Math.random() * buildings.length)];
                this.x = this.climbingBuilding.x + this.climbingBuilding.width / 2;
                this.y = CONFIG.STREET_Y;
                this.climbRow = this.climbingBuilding.heightBlocks - 1;
            }
        }
        return;
    }

    const building = this.climbingBuilding;

    if (!this.onRooftop) {
        // Climbing
        this.climbTimer += deltaTime;

        if (this.climbTimer >= 2.0) {
            this.climbTimer = 0;
            // Destroy block at current position
            const col = Math.floor(building.widthBlocks / 2);
            if (building.blocks[this.climbRow] && building.blocks[this.climbRow][col]) {
                building.destroyBlock(this.climbRow, col);
            }
            this.climbRow--;
            this.y = building.y + this.climbRow * building.blockSize;

            if (this.climbRow < 0) {
                this.onRooftop = true;
                this.rooftopTimer = 2.0;
            }
        }

        // Fire stinger at player
        this.attackTimer -= deltaTime;
        if (this.attackTimer <= 0) {
            this.attackTimer = 2.0;
            if (typeof player !== 'undefined') {
                const angle = Math.atan2(player.y - this.y, player.x - this.x) * 180 / Math.PI;
                projectileManager.add(this.x, this.y, angle, 200, false);
            }
        }
    } else {
        // On rooftop - fire burst then leap
        this.rooftopTimer -= deltaTime;

        if (this.rooftopTimer > 1.5) {
            // Rapid fire burst
            this.attackTimer -= deltaTime;
            if (this.attackTimer <= 0) {
                this.attackTimer = 0.2;
                if (typeof player !== 'undefined') {
                    const angle = Math.atan2(player.y - this.y, player.x - this.x) * 180 / Math.PI;
                    projectileManager.add(this.x, this.y, angle, 250, false);
                }
            }
        }

        if (this.rooftopTimer <= 0) {
            // Leap to next building
            this.onRooftop = false;
            this.climbingBuilding = null; // Will pick new building next frame
        }
    }
    return;
}
```

**Step 3: Add Scorpion render**

```javascript
renderScorpion(ctx) {
    // Body
    ctx.fillStyle = '#5c3d2e';
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Claws
    ctx.fillStyle = '#4a2f23';
    ctx.beginPath();
    ctx.ellipse(-18, -8, 8, 5, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-18, 8, 8, 5, 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Tail (stinger)
    ctx.strokeStyle = '#5c3d2e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.quadraticCurveTo(30, -20, 25, -35);
    ctx.stroke();

    // Stinger tip
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(25, -35, 4, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.strokeStyle = '#4a2f23';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
        const legX = -5 + i * 8;
        ctx.beginPath();
        ctx.moveTo(legX, 10);
        ctx.lineTo(legX + 5, 20);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(legX, -10);
        ctx.lineTo(legX + 5, -20);
        ctx.stroke();
    }
}
```

**Step 4: Commit**

```bash
git add js/enemies.js
git commit -m "feat: implement Scorpion Tank enemy with climbing behavior"
```

---

## Phase 7: Mini-Bosses (Summary)

### Task 7.1: Implement Vulture King Mini-Boss

- Circling phase at high altitude
- Dive attack targeting buildings
- Debris grab and drop mechanic
- Vulnerability window after dive
- HP: 10-12

### Task 7.2: Implement Sandstorm Colossus Mini-Boss

- Slow cross-screen movement
- Sandstorm visibility overlay
- Continuous drone spawning
- No direct attack
- HP: 15-18

---

## Phase 8: Final Boss (Summary)

### Task 8.1: Implement Siege Crawler Boss

- Advancing ground mech
- Four destructible weapon systems
- Shield Generator protects core
- Building damage on contact
- Total HP: 43 (4+8+10+6+15)

---

## Phase 9: Environmental Effects

### Task 9.1: Implement Heat Shimmer Effect

**Files:**
- Create: `js/heatshimmer.js`

**Step 1: Create heat shimmer overlay**

```javascript
const HeatShimmer = {
    active: false,
    timer: 0,
    interval: 35, // 30-45 seconds
    duration: 8,
    intensity: 0,

    update(deltaTime) {
        // Only active during day in Zone 2
        if (game.currentZone !== 2) return;
        if (typeof DayCycle !== 'undefined' && DayCycle.currentPeriod !== 'day') {
            this.active = false;
            return;
        }

        this.timer += deltaTime;

        if (!this.active && this.timer >= this.interval) {
            this.active = true;
            this.timer = 0;
            this.intensity = 0;
        }

        if (this.active) {
            if (this.timer < 1) {
                this.intensity = this.timer; // Fade in
            } else if (this.timer > this.duration - 1) {
                this.intensity = this.duration - this.timer; // Fade out
            } else {
                this.intensity = 1;
            }

            if (this.timer >= this.duration) {
                this.active = false;
                this.timer = 0;
                this.interval = 30 + Math.random() * 15;
            }
        }
    },

    render(ctx) {
        if (!this.active || this.intensity <= 0) return;

        // Wavy distortion effect using canvas displacement
        const time = Date.now() / 1000;
        ctx.save();

        // Simple wave overlay
        for (let y = 0; y < CONFIG.CANVAS_HEIGHT; y += 20) {
            const offset = Math.sin(time * 2 + y * 0.05) * 2 * this.intensity;
            ctx.drawImage(canvas, 0, y, CONFIG.CANVAS_WIDTH, 20, offset, y, CONFIG.CANVAS_WIDTH, 20);
        }

        ctx.restore();
    },

    reset() {
        this.active = false;
        this.timer = 0;
    }
};
```

**Step 2: Commit**

```bash
git add js/heatshimmer.js
git commit -m "feat: implement heat shimmer environmental effect"
```

---

## Phase 10: Zone 2 Wave Configuration

### Task 10.1: Add Zone 2 Enemy Spawn Weights

**Files:**
- Modify: `js/enemies.js` (EnemyManager)

**Step 1: Add zone-specific spawn configuration**

```javascript
getSpawnWeights(waveNumber) {
    if (game.currentZone === 2) {
        return this.getZone2SpawnWeights(waveNumber);
    }
    return this.getZone1SpawnWeights(waveNumber);
}

getZone2SpawnWeights(waveNumber) {
    const weights = {};

    weights[EnemyType.STANDARD] = 40;

    if (waveNumber >= 2) weights[EnemyType.AGGRESSIVE] = 20;
    if (waveNumber >= 3) {
        weights[EnemyType.DUST_DEVIL] = 15;
        weights[EnemyType.SANDWORM] = 10;
    }
    if (waveNumber >= 4) weights[EnemyType.SAND_CARRIER] = 10;
    if (waveNumber >= 5) weights[EnemyType.SCORPION] = 5;

    return weights;
}
```

**Step 2: Commit**

```bash
git add js/enemies.js
git commit -m "feat: add zone 2 enemy spawn weights by wave"
```

---

## Verification Checklist

After completing all tasks, verify:

1. [ ] Zone select screen shows Zone 1 unlocked, Zone 2 locked
2. [ ] Completing Zone 1 unlocks Zone 2
3. [ ] HUD shows zone-wave format (1-3, 2-5)
4. [ ] Zone splash displays on zone start
5. [ ] Zone 2 buildings have correct layout
6. [ ] Kill-streak charges nearest building
7. [ ] Charged flag appears and is collectible
8. [ ] All 6 building abilities trigger correctly
9. [ ] Enhanced Standard drone has +25% speed, 2 HP
10. [ ] Enhanced Aggressive drone fires 4 shots, moves erratically
11. [ ] Dust Devil spirals toward buildings
12. [ ] Sandworm burrows, surfaces at buildings, despawns correctly
13. [ ] Sand Carrier drops pods that spawn drones
14. [ ] Scorpion climbs buildings, fires stingers
15. [ ] Vulture King circles and dive-bombs buildings
16. [ ] Sandstorm Colossus creates visibility reduction + spawns drones
17. [ ] Siege Crawler advances, weapon systems are destructible
18. [ ] Heat shimmer only appears during day cycle in Zone 2

---

*Plan complete. Ready for implementation.*
