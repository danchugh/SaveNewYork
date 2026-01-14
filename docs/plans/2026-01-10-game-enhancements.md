# Save New York Game Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add mini-bosses, day/night cycle, new enemy types, and persistent high score table to enhance gameplay variety and replayability.

**Architecture:** Extend the existing EnemyManager to spawn mini-bosses between waves. Add a DayCycle manager that tracks time and adjusts colors. Create new Enemy subclasses with unique behaviors. Add HighScoreManager using localStorage for persistence.

**Tech Stack:** Vanilla JavaScript, HTML5 Canvas, Web Audio API, localStorage

---

## Task 1: Add High Score Manager with localStorage Persistence

**Files:**
- Create: `js/highscore.js`
- Modify: `index.html` (add script tag)
- Modify: `js/game.js` (integrate high score checking)

**Context:** The high score system stores top 10 scores in localStorage. Scores are checked at game over and victory. The title screen displays the high score table.

**Step 1: Create the HighScoreManager**

Create `js/highscore.js`:

```javascript
// ============================================
// HIGH SCORE MANAGER (localStorage)
// ============================================

const HighScoreManager = {
    STORAGE_KEY: 'saveNewYork_highScores',
    MAX_SCORES: 10,

    // Get all high scores from localStorage
    getScores() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.warn('Failed to load high scores:', e);
            return [];
        }
    },

    // Save scores to localStorage
    saveScores(scores) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(scores));
        } catch (e) {
            console.warn('Failed to save high scores:', e);
        }
    },

    // Check if a score qualifies for the high score table
    isHighScore(score) {
        const scores = this.getScores();
        if (scores.length < this.MAX_SCORES) return true;
        return score > scores[scores.length - 1].score;
    },

    // Add a new high score (returns rank 1-10, or 0 if not a high score)
    addScore(score, wave) {
        if (score <= 0) return 0;

        const scores = this.getScores();
        const newEntry = {
            score: score,
            wave: wave,
            date: new Date().toISOString().split('T')[0] // YYYY-MM-DD
        };

        scores.push(newEntry);
        scores.sort((a, b) => b.score - a.score);

        // Keep only top MAX_SCORES
        const trimmed = scores.slice(0, this.MAX_SCORES);
        this.saveScores(trimmed);

        // Find rank of new score
        const rank = trimmed.findIndex(s =>
            s.score === newEntry.score && s.date === newEntry.date
        );
        return rank >= 0 ? rank + 1 : 0;
    },

    // Get the highest score (for display)
    getHighestScore() {
        const scores = this.getScores();
        return scores.length > 0 ? scores[0].score : 0;
    },

    // Clear all scores (for testing)
    clearScores() {
        localStorage.removeItem(this.STORAGE_KEY);
    }
};
```

**Step 2: Add script tag to index.html**

In `index.html`, add after config.js and before sound.js:

```html
<script src="js/highscore.js"></script>
```

**Step 3: Track wave number in game state**

In `js/game.js`, modify the game object (around line 17):

```javascript
const game = {
    state: GameState.TITLE,
    lastTime: 0,
    deltaTime: 0,
    score: 0,
    finalWave: 0  // Track wave reached for high score
};
```

**Step 4: Save wave on game end**

In `js/game.js`, in the checkCollisions function, before setting GAME_OVER state, save the wave:

```javascript
// Check city destruction percentage
if (buildingManager.getDestructionPercentage() >= CONFIG.CITY_DESTRUCTION_THRESHOLD) {
    game.finalWave = enemyManager.waveNumber;
    game.state = GameState.GAME_OVER;
    // ... rest of code
}

// Check player lives
if (player.lives <= 0) {
    game.finalWave = enemyManager.waveNumber;
    game.state = GameState.GAME_OVER;
    // ... rest of code
}
```

And for victory (after boss defeated):

```javascript
if (defeated) {
    game.finalWave = enemyManager.waveNumber;
    game.state = GameState.VICTORY;
    // ... rest of code
}
```

**Step 5: Check and display high score on game over/victory**

In `js/game.js`, modify renderGameOver() to show high score status:

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
    ctx.font = '64px monospace';
    ctx.fillText('GAME OVER', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 - 80);

    // Check for high score
    const rank = HighScoreManager.addScore(game.score, game.finalWave);
    if (rank > 0) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = '24px monospace';
        ctx.fillText(`NEW HIGH SCORE! RANK #${rank}`, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 - 30);
    }

    // Final score
    ctx.fillStyle = '#fff';
    ctx.font = '28px monospace';
    ctx.fillText(`Final Score: ${game.score}`, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 10);

    // City destruction
    const destruction = Math.floor(buildingManager.getDestructionPercentage() * 100);
    ctx.fillText(`City Destroyed: ${destruction}%`, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 50);

    // Restart prompt
    ctx.fillStyle = '#4ade80';
    ctx.font = '20px monospace';
    ctx.fillText('Press ENTER to try again', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 110);
}
```

**Step 6: Display high score table on title screen**

In `js/game.js`, modify renderTitle() to show high scores:

```javascript
function renderTitle() {
    // ... existing title screen code up to controls ...

    // High Score Table (after controls, before start prompt)
    const scores = HighScoreManager.getScores();
    if (scores.length > 0) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = '18px monospace';
        ctx.fillText('HIGH SCORES', CONFIG.CANVAS_WIDTH / 2, 500);

        ctx.font = '14px monospace';
        ctx.fillStyle = '#94a3b8';
        const displayScores = scores.slice(0, 5); // Show top 5 on title
        displayScores.forEach((s, i) => {
            const text = `${i + 1}. ${s.score.toString().padStart(6, ' ')} - Wave ${s.wave}`;
            ctx.fillText(text, CONFIG.CANVAS_WIDTH / 2, 525 + i * 18);
        });
    }

    // Start prompt (blinking) - move down if scores shown
    const promptY = scores.length > 0 ? 640 : 580;
    if (Math.floor(Date.now() / 500) % 2 === 0) {
        ctx.fillStyle = '#4ade80';
        ctx.font = '24px monospace';
        ctx.fillText('Press ENTER to Start', CONFIG.CANVAS_WIDTH / 2, promptY);
    }

    // ... rest of existing code ...
}
```

**Step 7: Test the high score system**

Open the game in browser, play until game over, verify:
- Score is saved to localStorage
- High score notification appears if qualified
- Scores display on title screen
- Scores persist after page refresh

**Step 8: Commit**

```bash
git add js/highscore.js index.html js/game.js
git commit -m "feat: add high score table with localStorage persistence"
```

---

## Task 2: Add Day/Night Cycle System

**Files:**
- Create: `js/daycycle.js`
- Modify: `index.html` (add script tag)
- Modify: `js/config.js` (add night colors)
- Modify: `js/game.js` (integrate cycle, update colors)

**Context:** The day/night cycle progresses through waves. Each wave, the time of day shifts. Night waves are darker, enemies are harder to see but worth more points. Dawn and dusk provide transitional lighting.

**Step 1: Add night color palette to config**

In `js/config.js`, extend the COLORS object:

```javascript
COLORS: {
    // Day colors (existing)
    SKY: '#4a90d9',
    STREET: '#2d2d2d',
    SUBWAY_BG: '#1a1a1a',
    SUBWAY_TUNNEL: '#0d0d0d',
    BUILDING_LIGHT: '#c9b896',
    BUILDING_DARK: '#8b7355',
    BUILDING_WINDOW: '#2d4a6b',
    HUD_BG: '#1a472a',
    HUD_TEXT: '#4ade80',
    BORDER: '#4ade80',

    // Night colors (new)
    SKY_NIGHT: '#1a1a2e',
    STREET_NIGHT: '#1a1a1a',
    BUILDING_LIGHT_NIGHT: '#4a4a5a',
    BUILDING_DARK_NIGHT: '#3a3a4a',
    BUILDING_WINDOW_NIGHT: '#fbbf24', // Windows glow at night

    // Dusk colors (new)
    SKY_DUSK: '#c2410c',
    BUILDING_LIGHT_DUSK: '#d97706',
    BUILDING_DARK_DUSK: '#92400e',

    // Dawn colors (new)
    SKY_DAWN: '#f472b6',
    BUILDING_LIGHT_DAWN: '#e9d5ff',
    BUILDING_DARK_DAWN: '#c4b5fd'
},
```

**Step 2: Create the DayCycle manager**

Create `js/daycycle.js`:

```javascript
// ============================================
// DAY/NIGHT CYCLE MANAGER
// ============================================

const TimeOfDay = {
    DAWN: 'dawn',
    DAY: 'day',
    DUSK: 'dusk',
    NIGHT: 'night'
};

const DayCycle = {
    currentTime: TimeOfDay.DAY,
    cycleOrder: [TimeOfDay.DAY, TimeOfDay.DUSK, TimeOfDay.NIGHT, TimeOfDay.DAWN],
    cycleIndex: 0,

    // Score multiplier for current time
    getScoreMultiplier() {
        switch (this.currentTime) {
            case TimeOfDay.NIGHT: return 1.5;  // 50% bonus at night
            case TimeOfDay.DUSK: return 1.25;  // 25% bonus at dusk
            case TimeOfDay.DAWN: return 1.25;  // 25% bonus at dawn
            default: return 1.0;
        }
    },

    // Get display name for HUD
    getDisplayName() {
        switch (this.currentTime) {
            case TimeOfDay.DAWN: return 'DAWN';
            case TimeOfDay.DAY: return 'DAY';
            case TimeOfDay.DUSK: return 'DUSK';
            case TimeOfDay.NIGHT: return 'NIGHT';
        }
    },

    // Advance to next time of day (call between waves)
    advance() {
        this.cycleIndex = (this.cycleIndex + 1) % this.cycleOrder.length;
        this.currentTime = this.cycleOrder[this.cycleIndex];
        console.log(`Time changed to: ${this.currentTime}`);
    },

    // Reset to day
    reset() {
        this.cycleIndex = 0;
        this.currentTime = TimeOfDay.DAY;
    },

    // Get interpolated sky color
    getSkyColor() {
        switch (this.currentTime) {
            case TimeOfDay.NIGHT: return CONFIG.COLORS.SKY_NIGHT;
            case TimeOfDay.DUSK: return CONFIG.COLORS.SKY_DUSK;
            case TimeOfDay.DAWN: return CONFIG.COLORS.SKY_DAWN;
            default: return CONFIG.COLORS.SKY;
        }
    },

    // Get building light color
    getBuildingLightColor() {
        switch (this.currentTime) {
            case TimeOfDay.NIGHT: return CONFIG.COLORS.BUILDING_LIGHT_NIGHT;
            case TimeOfDay.DUSK: return CONFIG.COLORS.BUILDING_LIGHT_DUSK;
            case TimeOfDay.DAWN: return CONFIG.COLORS.BUILDING_LIGHT_DAWN;
            default: return CONFIG.COLORS.BUILDING_LIGHT;
        }
    },

    // Get building dark color
    getBuildingDarkColor() {
        switch (this.currentTime) {
            case TimeOfDay.NIGHT: return CONFIG.COLORS.BUILDING_DARK_NIGHT;
            case TimeOfDay.DUSK: return CONFIG.COLORS.BUILDING_DARK_DUSK;
            case TimeOfDay.DAWN: return CONFIG.COLORS.BUILDING_DARK_DAWN;
            default: return CONFIG.COLORS.BUILDING_DARK;
        }
    },

    // Get window color (glows at night)
    getWindowColor() {
        if (this.currentTime === TimeOfDay.NIGHT) {
            return CONFIG.COLORS.BUILDING_WINDOW_NIGHT;
        }
        return CONFIG.COLORS.BUILDING_WINDOW;
    },

    // Get street color
    getStreetColor() {
        if (this.currentTime === TimeOfDay.NIGHT) {
            return CONFIG.COLORS.STREET_NIGHT;
        }
        return CONFIG.COLORS.STREET;
    },

    // Apply darkness overlay alpha (for enemy visibility reduction)
    getDarknessAlpha() {
        switch (this.currentTime) {
            case TimeOfDay.NIGHT: return 0.3;  // Enemies 30% darker
            case TimeOfDay.DUSK: return 0.15;
            case TimeOfDay.DAWN: return 0.1;
            default: return 0;
        }
    }
};
```

**Step 3: Add script tag to index.html**

In `index.html`, add after highscore.js:

```html
<script src="js/daycycle.js"></script>
```

**Step 4: Integrate DayCycle into game initialization**

In `js/game.js`, modify initGame():

```javascript
function initGame() {
    buildingManager.init();
    player.reset();
    projectileManager.clear();
    enemyManager.reset();
    enemyManager.startWave(1);
    civilianManager.reset();
    DayCycle.reset();  // Add this line
    game.score = 0;
    game.finalWave = 0;
    game.state = GameState.PLAYING;
}
```

**Step 5: Advance cycle between waves**

In `js/enemies.js`, in the EnemyManager.update() method, when wave completes:

```javascript
// Check wave completion
if (!this.boss && this.enemiesRemainingInWave <= 0 && this.enemies.length === 0 && !this.waveComplete) {
    this.waveComplete = true;
    this.betweenWaves = true;
    this.waveBreakTimer = 0;
    DayCycle.advance();  // Add this line
    console.log(`Wave ${this.waveNumber} complete!`);
}
```

**Step 6: Update renderGame() to use DayCycle colors**

In `js/game.js`, modify renderGame():

```javascript
function renderGame() {
    // Draw sky with time-of-day color
    ctx.fillStyle = DayCycle.getSkyColor();
    ctx.fillRect(0, CONFIG.SKY_TOP, CONFIG.CANVAS_WIDTH, CONFIG.STREET_Y - CONFIG.SKY_TOP);

    // ... buildings, civilians, enemies, player, projectiles ...

    // Draw street with time-of-day color
    ctx.fillStyle = DayCycle.getStreetColor();
    ctx.fillRect(0, CONFIG.STREET_Y, CONFIG.CANVAS_WIDTH, CONFIG.SUBWAY_TOP - CONFIG.STREET_Y);

    // ... rest of existing code ...
}
```

**Step 7: Update building rendering for day/night colors**

In `js/buildings.js`, modify the Building.render() method to use DayCycle colors:

```javascript
render(ctx) {
    // Render blocks
    for (let row = 0; row < this.heightBlocks; row++) {
        for (let col = 0; col < this.widthBlocks; col++) {
            if (this.blocks[row][col]) {
                const pos = this.getBlockWorldPosition(row, col);

                // Alternate colors for visual interest - use DayCycle colors
                const isLight = (row + col) % 2 === 0;
                ctx.fillStyle = isLight ? DayCycle.getBuildingLightColor() : DayCycle.getBuildingDarkColor();
                ctx.fillRect(pos.x, pos.y, pos.width, pos.height);

                // Draw window on some blocks - use DayCycle window color
                if ((row + col) % 3 === 0) {
                    ctx.fillStyle = DayCycle.getWindowColor();
                    ctx.fillRect(pos.x + 2, pos.y + 2, pos.width - 4, pos.height - 4);
                }

                // Draw block outline
                ctx.strokeStyle = '#00000033';
                ctx.lineWidth = 1;
                ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
            }
        }
    }

    // Render debris particles
    this.debris.forEach(d => d.render(ctx));
}
```

**Step 8: Apply score multiplier**

In `js/game.js`, in checkCollisions(), when adding score for enemy kills:

```javascript
// Player projectiles vs enemies
for (const proj of playerProjectiles) {
    // ... existing collision check ...
    if (dist < proj.radius + enemy.width / 2) {
        enemy.die();
        proj.active = false;
        game.score += Math.floor(100 * DayCycle.getScoreMultiplier());
        break;
    }
}
```

**Step 9: Add time of day to HUD**

In `js/ui.js`, add to renderHUD():

```javascript
// Time of day indicator (top center-right area)
ctx.textAlign = 'left';
ctx.fillStyle = DayCycle.currentTime === 'night' ? '#fbbf24' : CONFIG.COLORS.HUD_TEXT;
ctx.fillText(`${DayCycle.getDisplayName()} ${DayCycle.getScoreMultiplier() > 1 ? `(x${DayCycle.getScoreMultiplier()})` : ''}`, 220, hudY + 18);
```

**Step 10: Add darkness overlay to enemies (optional visual effect)**

In `js/enemies.js`, in Enemy.render(), add darkness overlay:

```javascript
render(ctx) {
    if (this.state === EnemyState.DEAD) return;

    ctx.save();

    // Apply darkness based on time of day
    const darkness = DayCycle.getDarknessAlpha();

    // ... existing render code ...

    // After drawing enemy, apply darkness overlay
    if (darkness > 0 && this.state !== EnemyState.FALLING) {
        ctx.globalAlpha = darkness;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(0, 0, this.width / 2 + 2, this.height / 2 + 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    ctx.restore();
}
```

**Step 11: Test the day/night cycle**

Play through multiple waves and verify:
- Sky color changes each wave
- Building colors change appropriately
- Windows glow at night
- Score multiplier applies correctly
- HUD shows current time of day

**Step 12: Commit**

```bash
git add js/daycycle.js js/config.js js/game.js js/buildings.js js/enemies.js js/ui.js index.html
git commit -m "feat: add day/night cycle with visual changes and score multiplier"
```

---

## Task 3: Add New Enemy Types

**Files:**
- Modify: `js/enemies.js` (add new enemy types)
- Modify: `js/sound.js` (add new enemy sounds)

**Context:** Add 3 new enemy types with unique behaviors:
1. **TANK** - Slow, takes 3 hits to kill, destroys 2 blocks at once
2. **SPLITTER** - When killed, splits into 2 smaller standard enemies
3. **BOMBER** - Doesn't attack buildings, but dives at player kamikaze-style

**Step 1: Extend EnemyType enum**

In `js/enemies.js`, modify EnemyType:

```javascript
const EnemyType = {
    STANDARD: 'standard',    // Normal building attacker (purple)
    AGGRESSIVE: 'aggressive', // Faster, more erratic, quicker attacks (red)
    TANK: 'tank',            // Slow, tough, destroys more blocks (green)
    SPLITTER: 'splitter',    // Splits into 2 when killed (cyan)
    BOMBER: 'bomber'         // Kamikaze dive at player (orange)
};
```

**Step 2: Add health property to Enemy class**

In `js/enemies.js`, modify Enemy constructor to add health:

```javascript
constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.state = EnemyState.FLYING;

    this.width = 16;
    this.height = 16;
    this.health = 1;  // Default health

    // Type-based stats
    if (type === EnemyType.AGGRESSIVE) {
        this.speed = 90;
        this.attackTimeMin = 0.8;
        this.attackTimeMax = 2;
    } else if (type === EnemyType.TANK) {
        this.speed = 40;
        this.attackTimeMin = 0.5;
        this.attackTimeMax = 1.5;
        this.health = 3;
        this.width = 24;
        this.height = 24;
        this.blocksToDestroy = 2;  // Destroys 2 blocks per attack
    } else if (type === EnemyType.SPLITTER) {
        this.speed = 70;
        this.attackTimeMin = 2;
        this.attackTimeMax = 5;
    } else if (type === EnemyType.BOMBER) {
        this.speed = 100;
        this.attackTimeMin = 999;  // Never attacks buildings
        this.attackTimeMax = 999;
        this.divingAtPlayer = false;
        this.diveTimer = 3 + Math.random() * 4;  // Wait before diving
    } else {
        this.speed = 60;
        this.attackTimeMin = 1.5;
        this.attackTimeMax = 4;
    }

    // ... rest of constructor ...
}
```

**Step 3: Modify Enemy.die() to handle new types**

```javascript
die() {
    if (this.type === EnemyType.AGGRESSIVE) {
        this.state = EnemyState.FALLING;
        this.fallSpeed = 0;
        SoundManager.enemyFalling();
    } else if (this.type === EnemyType.SPLITTER) {
        // Spawn 2 smaller standard enemies
        this.state = EnemyState.DEAD;
        this.active = false;
        this.spawnSplitEnemies();
        SoundManager.enemySplit();
    } else if (this.type === EnemyType.TANK) {
        this.health--;
        if (this.health <= 0) {
            this.state = EnemyState.DEAD;
            this.active = false;
            SoundManager.tankDeath();
        } else {
            SoundManager.tankHit();
        }
    } else {
        this.state = EnemyState.DEAD;
        this.active = false;
        SoundManager.enemyDeath();
    }
}

spawnSplitEnemies() {
    // Spawn 2 standard enemies at current position
    const offset = 20;
    enemyManager.enemies.push(new Enemy(this.x - offset, this.y, EnemyType.STANDARD));
    enemyManager.enemies.push(new Enemy(this.x + offset, this.y, EnemyType.STANDARD));
}
```

**Step 4: Add bomber diving behavior**

Add to Enemy.updateFlying():

```javascript
updateFlying(deltaTime) {
    // Bomber special behavior
    if (this.type === EnemyType.BOMBER) {
        this.diveTimer -= deltaTime;
        if (this.diveTimer <= 0 && !this.divingAtPlayer) {
            this.divingAtPlayer = true;
            SoundManager.bomberDive();
        }

        if (this.divingAtPlayer) {
            // Dive toward player
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
                this.velX = dx / dist;
                this.velY = dy / dist;
            }
            this.x += this.velX * this.speed * 2 * deltaTime;
            this.y += this.velY * this.speed * 2 * deltaTime;

            // Check if hit ground (missed player)
            if (this.y > CONFIG.STREET_Y) {
                this.state = EnemyState.DEAD;
                this.active = false;
                SoundManager.bomberCrash();
            }
            return;  // Skip normal movement
        }
    }

    // ... rest of existing updateFlying code ...
}
```

**Step 5: Modify tank to destroy multiple blocks**

In Enemy.updateAttacking():

```javascript
if (this.attackTimer >= this.attackDuration) {
    // Destroy the block(s)
    if (this.targetBlock) {
        const blocksToDestroy = this.blocksToDestroy || 1;
        this.targetBlock.building.destroyBlock(this.targetBlock.row, this.targetBlock.col);

        // Tank destroys adjacent blocks too
        if (blocksToDestroy > 1) {
            const building = this.targetBlock.building;
            const row = this.targetBlock.row;
            const col = this.targetBlock.col;

            // Destroy one adjacent block
            const adjacent = [
                { r: row - 1, c: col },
                { r: row + 1, c: col },
                { r: row, c: col - 1 },
                { r: row, c: col + 1 }
            ];
            for (const adj of adjacent) {
                if (building.blocks[adj.r]?.[adj.c]) {
                    building.destroyBlock(adj.r, adj.c);
                    break;
                }
            }
        }
    }
    // ... rest of existing code ...
}
```

**Step 6: Update enemy rendering for new types**

Add color and visual variations in Enemy.render():

```javascript
render(ctx) {
    if (this.state === EnemyState.DEAD) return;

    ctx.save();

    // ... existing transform code ...

    // Color based on type
    let color;
    switch (this.type) {
        case EnemyType.AGGRESSIVE: color = '#dc2626'; break;  // Red
        case EnemyType.TANK: color = '#16a34a'; break;        // Green
        case EnemyType.SPLITTER: color = '#06b6d4'; break;    // Cyan
        case EnemyType.BOMBER: color = '#f97316'; break;      // Orange
        default: color = '#9333ea';                            // Purple
    }

    if (this.state === EnemyState.FALLING) {
        color = '#7f1d1d';
    }

    // Draw body - larger for tank
    const bodyWidth = this.width / 2;
    const bodyHeight = this.height / 2.5;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, bodyWidth, bodyHeight, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tank has armor plates
    if (this.type === EnemyType.TANK) {
        ctx.strokeStyle = '#166534';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 0, bodyWidth - 2, bodyHeight - 2, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Health indicator
        for (let i = 0; i < this.health; i++) {
            ctx.fillStyle = '#4ade80';
            ctx.beginPath();
            ctx.arc(-6 + i * 6, -bodyHeight - 4, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Bomber has flame trail when diving
    if (this.type === EnemyType.BOMBER && this.divingAtPlayer) {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(0, bodyHeight);
        ctx.lineTo(-5, bodyHeight + 15);
        ctx.lineTo(5, bodyHeight + 15);
        ctx.closePath();
        ctx.fill();
    }

    // Splitter has sparkle effect
    if (this.type === EnemyType.SPLITTER) {
        const sparkle = Math.sin(Date.now() / 100) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(6, 182, 212, ${sparkle * 0.5})`;
        ctx.beginPath();
        ctx.arc(0, 0, bodyWidth + 3, 0, Math.PI * 2);
        ctx.fill();
    }

    // ... rest of existing render code (wings, eyes, beak) ...

    ctx.restore();
}
```

**Step 7: Add new enemy sounds**

In `js/sound.js`, add new sound methods:

```javascript
enemySplit() {
    // Sparkly split sound
    this.playTone(800, 0.1, 'sine', 0.3);
    setTimeout(() => this.playTone(1000, 0.1, 'sine', 0.3), 50);
    setTimeout(() => this.playTone(600, 0.1, 'sine', 0.25), 100);
},

tankHit() {
    // Metallic clang
    this.playTone(200, 0.1, 'square', 0.4);
    this.playNoise(0.05, 0.3);
},

tankDeath() {
    // Heavy explosion
    this.playNoise(0.4, 0.7);
    this.playTone(80, 0.3, 'sawtooth', 0.5);
    setTimeout(() => this.playNoise(0.3, 0.5), 150);
},

bomberDive() {
    // Screaming dive sound
    if (!this.enabled || !this.ctx) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.5);

    gain.gain.setValueAtTime(0.2 * this.masterVolume, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.3 * this.masterVolume, this.ctx.currentTime + 0.5);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.5);
},

bomberCrash() {
    // Ground impact
    this.playNoise(0.3, 0.5);
    this.playTone(50, 0.2, 'sawtooth', 0.5);
}
```

**Step 8: Update wave spawning to include new types**

In `js/enemies.js`, modify EnemyManager.startWave() and spawnEnemy():

```javascript
startWave(waveNum) {
    this.waveNumber = waveNum;
    this.waveComplete = false;

    // Progressive enemy type unlocking
    this.availableTypes = [EnemyType.STANDARD];

    if (waveNum >= 2) this.availableTypes.push(EnemyType.AGGRESSIVE);
    if (waveNum >= 3) this.availableTypes.push(EnemyType.SPLITTER);
    if (waveNum >= 4) this.availableTypes.push(EnemyType.BOMBER);
    if (waveNum >= 5) this.availableTypes.push(EnemyType.TANK);

    // Wave difficulty settings
    switch (waveNum) {
        case 1:
            this.maxConcurrentEnemies = 1;
            this.enemiesRemainingInWave = 5;
            break;
        case 2:
            this.maxConcurrentEnemies = 2;
            this.enemiesRemainingInWave = 7;
            break;
        case 3:
            this.maxConcurrentEnemies = 2;
            this.enemiesRemainingInWave = 9;
            break;
        case 4:
            this.maxConcurrentEnemies = 3;
            this.enemiesRemainingInWave = 12;
            break;
        default:
            this.maxConcurrentEnemies = 3;
            this.enemiesRemainingInWave = 12 + (waveNum - 4) * 3;
    }

    console.log(`Wave ${waveNum} started! Enemy types: ${this.availableTypes.join(', ')}`);
}

spawnEnemy() {
    if (this.enemiesRemainingInWave <= 0) return;
    if (this.enemies.length >= this.maxConcurrentEnemies) return;

    // Random type from available types (weighted)
    let type;
    const roll = Math.random();
    if (roll < 0.5) {
        type = EnemyType.STANDARD;
    } else if (this.availableTypes.includes(EnemyType.TANK) && roll < 0.55) {
        type = EnemyType.TANK;  // 5% chance
    } else if (this.availableTypes.includes(EnemyType.BOMBER) && roll < 0.65) {
        type = EnemyType.BOMBER;  // 10% chance
    } else if (this.availableTypes.includes(EnemyType.SPLITTER) && roll < 0.8) {
        type = EnemyType.SPLITTER;  // 15% chance
    } else if (this.availableTypes.includes(EnemyType.AGGRESSIVE)) {
        type = EnemyType.AGGRESSIVE;  // 20% chance
    } else {
        type = EnemyType.STANDARD;
    }

    // Spawn from screen edge
    // ... existing spawn position code ...

    this.enemies.push(new Enemy(x, y, type));
    this.enemiesRemainingInWave--;
}
```

**Step 9: Update collision to handle tank health**

In `js/game.js`, modify player projectile vs enemy collision:

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
            const wasAlive = enemy.health > 0;
            enemy.die();
            proj.active = false;

            // Score based on enemy type and whether it died
            let baseScore = 100;
            if (enemy.type === EnemyType.TANK) baseScore = 50;  // Per hit
            if (enemy.type === EnemyType.BOMBER) baseScore = 150;
            if (enemy.type === EnemyType.SPLITTER) baseScore = 75;

            // Only full score if enemy is now dead
            if (!enemy.active || enemy.health <= 0) {
                if (enemy.type === EnemyType.TANK) baseScore = 300;  // Bonus for killing tank
            }

            game.score += Math.floor(baseScore * DayCycle.getScoreMultiplier());
            break;
        }
    }
}
```

**Step 10: Test new enemy types**

Play through waves and verify:
- Standard and aggressive work as before
- Tanks take 3 hits with visual health indicator
- Splitters split into 2 standard enemies
- Bombers dive at player after delay
- Correct sounds play for each type
- Scoring works correctly

**Step 11: Commit**

```bash
git add js/enemies.js js/sound.js js/game.js
git commit -m "feat: add new enemy types (tank, splitter, bomber)"
```

---

## Task 4: Add Mini-Boss System

**Files:**
- Modify: `js/enemies.js` (add MiniBoss class, spawn logic)
- Modify: `js/sound.js` (add mini-boss sounds)
- Modify: `js/game.js` (add mini-boss collision handling)

**Context:** Mini-bosses appear after waves 2 and 4. They're smaller than the final boss but tougher than regular enemies with unique attack patterns.

**Step 1: Create MiniBoss class**

In `js/enemies.js`, add after the Boss class:

```javascript
class MiniBoss {
    constructor(type) {
        this.type = type;  // 'charger' or 'gunner'
        this.x = CONFIG.CANVAS_WIDTH / 2;
        this.y = CONFIG.SKY_TOP + 80;
        this.width = 40;
        this.height = 30;
        this.health = 8;
        this.maxHealth = 8;
        this.active = true;

        if (type === 'charger') {
            // Charger: Fast horizontal sweeps, rams buildings
            this.speed = 120;
            this.chargeTimer = 0;
            this.chargeInterval = 3;
            this.isCharging = false;
            this.chargeTarget = null;
        } else {
            // Gunner: Stationary periods with rapid fire
            this.speed = 60;
            this.fireTimer = 0;
            this.fireInterval = 0.3;
            this.burstCount = 0;
            this.maxBurst = 5;
            this.burstCooldown = 0;
        }

        this.direction = 1;
        this.swoopPhase = Math.random() * Math.PI * 2;
    }

    update(deltaTime, playerX, playerY, projectileManager) {
        if (this.type === 'charger') {
            this.updateCharger(deltaTime);
        } else {
            this.updateGunner(deltaTime, playerX, playerY, projectileManager);
        }
    }

    updateCharger(deltaTime) {
        this.swoopPhase += deltaTime * 3;

        if (this.isCharging) {
            // Charge toward target building
            if (this.chargeTarget) {
                const targetX = this.chargeTarget.x + this.chargeTarget.width / 2;
                const dx = targetX - this.x;
                this.x += Math.sign(dx) * this.speed * 2 * deltaTime;

                // Check if reached target
                if (Math.abs(dx) < 20) {
                    // Ram the building - destroy top blocks
                    const building = this.chargeTarget;
                    for (let col = 0; col < building.widthBlocks; col++) {
                        for (let row = 0; row < building.heightBlocks; row++) {
                            if (building.blocks[row][col]) {
                                building.spawnDebris(row, col);
                                building.destroyBlock(row, col);
                                break;  // Only top block per column
                            }
                        }
                    }
                    SoundManager.miniBossRam();
                    this.isCharging = false;
                    this.chargeTimer = 0;
                }
            }
        } else {
            // Normal movement
            const swoopY = Math.sin(this.swoopPhase) * 30;
            this.x += this.direction * this.speed * deltaTime;
            this.y = CONFIG.SKY_TOP + 80 + swoopY;

            if (this.x > CONFIG.CANVAS_WIDTH - 80) this.direction = -1;
            if (this.x < 80) this.direction = 1;

            // Charge timer
            this.chargeTimer += deltaTime;
            if (this.chargeTimer >= this.chargeInterval) {
                // Pick a building to charge
                const buildings = buildingManager.buildings.filter(b => b.getBlockCount() > 0);
                if (buildings.length > 0) {
                    this.chargeTarget = buildings[Math.floor(Math.random() * buildings.length)];
                    this.isCharging = true;
                    SoundManager.miniBossCharge();
                }
            }
        }
    }

    updateGunner(deltaTime, playerX, playerY, projectileManager) {
        this.swoopPhase += deltaTime * 2;

        // Movement
        const swoopX = Math.sin(this.swoopPhase) * 100;
        const swoopY = Math.cos(this.swoopPhase * 0.7) * 40;
        this.x = CONFIG.CANVAS_WIDTH / 2 + swoopX;
        this.y = CONFIG.SKY_TOP + 100 + swoopY;

        // Burst fire at player
        if (this.burstCooldown > 0) {
            this.burstCooldown -= deltaTime;
        } else {
            this.fireTimer += deltaTime;
            if (this.fireTimer >= this.fireInterval && this.burstCount < this.maxBurst) {
                this.fireTimer = 0;
                this.burstCount++;

                const angle = Math.atan2(playerY - this.y, playerX - this.x) * 180 / Math.PI;
                projectileManager.add(this.x, this.y + 15, angle, 250, false);
                SoundManager.miniBossShoot();

                if (this.burstCount >= this.maxBurst) {
                    this.burstCount = 0;
                    this.burstCooldown = 2;  // 2 second cooldown between bursts
                }
            }
        }
    }

    takeDamage() {
        this.health--;
        SoundManager.miniBossHit();
        if (this.health <= 0) {
            this.active = false;
            SoundManager.miniBossDefeat();
            return true;
        }
        return false;
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Body color based on type
        const bodyColor = this.type === 'charger' ? '#dc2626' : '#7c3aed';
        const wingColor = this.type === 'charger' ? '#ef4444' : '#a855f7';

        // Body
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wings
        const wingFlap = Math.sin(Date.now() / 120) * 8;
        ctx.fillStyle = wingColor;

        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.quadraticCurveTo(-30, -15 + wingFlap, -40, -5 + wingFlap);
        ctx.quadraticCurveTo(-32, 4, -15, 6);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.quadraticCurveTo(30, -15 - wingFlap, 40, -5 - wingFlap);
        ctx.quadraticCurveTo(32, 4, 15, 6);
        ctx.closePath();
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-8, -5, 5, 0, Math.PI * 2);
        ctx.arc(8, -5, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.type === 'charger' ? '#000' : '#ef4444';
        ctx.beginPath();
        ctx.arc(-8, -5, 2.5, 0, Math.PI * 2);
        ctx.arc(8, -5, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Charger has horns
        if (this.type === 'charger') {
            ctx.fillStyle = '#991b1b';
            ctx.beginPath();
            ctx.moveTo(-12, -10);
            ctx.lineTo(-15, -22);
            ctx.lineTo(-8, -12);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(12, -10);
            ctx.lineTo(15, -22);
            ctx.lineTo(8, -12);
            ctx.closePath();
            ctx.fill();
        }

        // Gunner has cannon
        if (this.type === 'gunner') {
            ctx.fillStyle = '#4c1d95';
            ctx.fillRect(-5, 10, 10, 12);
            ctx.fillStyle = '#1e1b4b';
            ctx.beginPath();
            ctx.arc(0, 22, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // Health bar
        const barWidth = 60;
        const barHeight = 6;
        const barX = this.x - barWidth / 2;
        const barY = this.y - 30;

        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(barX, barY, barWidth * (this.health / this.maxHealth), barHeight);

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // Label
        ctx.fillStyle = '#fbbf24';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('MINI-BOSS', this.x, barY - 4);
    }
}
```

**Step 2: Add mini-boss tracking to EnemyManager**

In `js/enemies.js`, modify EnemyManager:

```javascript
constructor() {
    this.enemies = [];
    this.boss = null;
    this.miniBoss = null;  // Add this
    this.waveNumber = 0;
    // ... rest of constructor ...
}

reset() {
    this.enemies = [];
    this.boss = null;
    this.miniBoss = null;  // Add this
    // ... rest of reset ...
}
```

**Step 3: Spawn mini-boss after specific waves**

In `js/enemies.js`, modify the wave completion logic in update():

```javascript
// Check wave completion
if (!this.boss && !this.miniBoss && this.enemiesRemainingInWave <= 0 && this.enemies.length === 0 && !this.waveComplete) {
    this.waveComplete = true;
    this.betweenWaves = true;
    this.waveBreakTimer = 0;
    DayCycle.advance();

    // Spawn mini-boss after waves 2 and 4
    if (this.waveNumber === 2) {
        this.pendingMiniBoss = 'charger';
    } else if (this.waveNumber === 4) {
        this.pendingMiniBoss = 'gunner';
    }

    console.log(`Wave ${this.waveNumber} complete!`);
}
```

And in the wave break handling:

```javascript
if (this.betweenWaves) {
    this.waveBreakTimer += deltaTime;
    if (this.waveBreakTimer >= 2) {
        this.betweenWaves = false;

        // Check for pending mini-boss
        if (this.pendingMiniBoss) {
            this.miniBoss = new MiniBoss(this.pendingMiniBoss);
            this.pendingMiniBoss = null;
            SoundManager.miniBossAppear();
            console.log('MINI-BOSS SPAWNED!');
        } else if (this.waveNumber >= this.maxWaves) {
            this.spawnBoss();
        } else {
            this.startWave(this.waveNumber + 1);
        }
    }
    return;
}

// Update mini-boss if present
if (this.miniBoss && this.miniBoss.active) {
    this.miniBoss.update(deltaTime, playerX, playerY, projectileManager);
}
```

**Step 4: Handle mini-boss defeat**

Add to EnemyManager.update() after mini-boss update:

```javascript
// Check mini-boss defeat
if (this.miniBoss && !this.miniBoss.active) {
    this.miniBoss = null;
    this.betweenWaves = true;
    this.waveBreakTimer = 0;
    console.log('Mini-boss defeated! Next wave starting...');
}
```

**Step 5: Render mini-boss**

In EnemyManager.render():

```javascript
render(ctx) {
    this.enemies.forEach(e => e.render(ctx));
    if (this.miniBoss && this.miniBoss.active) {
        this.miniBoss.render(ctx);
    }
    if (this.boss && this.boss.active) {
        this.boss.render(ctx);
    }
}
```

**Step 6: Add mini-boss collision detection**

In `js/game.js`, add after boss collision section:

```javascript
// Player projectiles vs mini-boss
if (enemyManager.miniBoss && enemyManager.miniBoss.active) {
    for (const proj of playerProjectiles) {
        if (!proj.active) continue;

        const miniBoss = enemyManager.miniBoss;
        const dist = Math.sqrt(
            Math.pow(proj.x - miniBoss.x, 2) +
            Math.pow(proj.y - miniBoss.y, 2)
        );

        if (dist < proj.radius + miniBoss.width / 2) {
            proj.active = false;
            miniBoss.takeDamage();
            game.score += Math.floor(75 * DayCycle.getScoreMultiplier());
            break;
        }
    }

    // Player vs mini-boss
    if (player.state === 'flying') {
        const playerBounds = getPlayerBounds(player);
        const miniBoss = enemyManager.miniBoss;
        const miniBossBounds = {
            x: miniBoss.x - miniBoss.width / 2,
            y: miniBoss.y - miniBoss.height / 2,
            width: miniBoss.width,
            height: miniBoss.height
        };

        if (rectIntersects(playerBounds, miniBossBounds)) {
            player.die();
        }
    }
}
```

**Step 7: Add mini-boss sounds**

In `js/sound.js`:

```javascript
miniBossAppear() {
    // Ominous rising tone
    this.playTone(150, 0.3, 'sawtooth', 0.4);
    setTimeout(() => this.playTone(200, 0.3, 'sawtooth', 0.4), 200);
    setTimeout(() => this.playTone(250, 0.4, 'sawtooth', 0.5), 400);
},

miniBossHit() {
    this.playTone(150, 0.1, 'square', 0.4);
    this.playNoise(0.08, 0.4);
},

miniBossDefeat() {
    this.playNoise(0.5, 0.6);
    this.playTone(300, 0.2, 'square', 0.5);
    setTimeout(() => this.playTone(400, 0.2, 'square', 0.5), 150);
    setTimeout(() => this.playTone(500, 0.3, 'square', 0.6), 300);
},

miniBossCharge() {
    // Angry growl
    this.playTone(80, 0.3, 'sawtooth', 0.5);
    this.playNoise(0.2, 0.3);
},

miniBossRam() {
    // Heavy impact
    this.playNoise(0.4, 0.7);
    this.playTone(50, 0.3, 'sawtooth', 0.6);
},

miniBossShoot() {
    this.playTone(500, 0.05, 'square', 0.3);
    this.playTone(400, 0.05, 'square', 0.25);
}
```

**Step 8: Update HUD for mini-boss**

In `js/ui.js`, modify the wave indicator section:

```javascript
// Bottom HUD - Wave indicator
ctx.textAlign = 'center';
ctx.fillStyle = CONFIG.COLORS.HUD_TEXT;
if (enemyManager.boss && enemyManager.boss.active) {
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('!! BOSS BATTLE !!', CONFIG.CANVAS_WIDTH / 2, bottomHudY + 16);
} else if (enemyManager.miniBoss && enemyManager.miniBoss.active) {
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 18px monospace';
    const type = enemyManager.miniBoss.type.toUpperCase();
    ctx.fillText(`!! MINI-BOSS: ${type} !!`, CONFIG.CANVAS_WIDTH / 2, bottomHudY + 16);
} else if (enemyManager.betweenWaves) {
    ctx.fillText(`WAVE ${enemyManager.waveNumber + 1} INCOMING...`, CONFIG.CANVAS_WIDTH / 2, bottomHudY + 16);
} else {
    ctx.fillText(`WAVE ${enemyManager.waveNumber}`, CONFIG.CANVAS_WIDTH / 2, bottomHudY + 16);
}
```

**Step 9: Test mini-boss system**

Play through waves 2 and 4 to verify:
- Charger mini-boss appears after wave 2
- Charger rams buildings and destroys blocks
- Gunner mini-boss appears after wave 4
- Gunner fires bursts at player
- Both have health bars and take damage
- Defeating mini-boss advances to next wave
- Score is awarded correctly

**Step 10: Commit**

```bash
git add js/enemies.js js/sound.js js/game.js js/ui.js
git commit -m "feat: add mini-boss system with charger and gunner types"
```

---

## Summary

This implementation plan adds four major features:

1. **High Score Table** - Persistent localStorage-based scoring with top 10 display
2. **Day/Night Cycle** - Visual variety with 4 time periods and score multipliers
3. **New Enemy Types** - Tank, Splitter, and Bomber with unique behaviors
4. **Mini-Boss System** - Charger and Gunner mini-bosses after waves 2 and 4

Total new files: 2 (`highscore.js`, `daycycle.js`)
Modified files: 6 (`config.js`, `enemies.js`, `game.js`, `sound.js`, `ui.js`, `buildings.js`, `index.html`)

Estimated commits: 4 (one per feature)
