# Zone 2 Vulture King Mini-Boss Revamp Plan

**Project:** Save New York (HTML5 Canvas Game)
**Location:** `C:\Projects\AntiGravity\SaveNewYork\`
**Current Version:** v1.0.81
**Goal:** Redesign Vulture King with new sprites, behavior phases, and fix 1-shot death bug

---

## Critical Bug Fix

### Problem: Vulture King Dies in 1 Shot Despite 15 HP

**Root Cause:** Zone 2 mini-bosses are stored in `enemyManager.enemies` array AND tracked separately in `enemyManager.zone2MiniBoss`. The collision code in `game.js` (lines 209-266) processes ALL enemies in the array and calls `enemy.die()` immediately instead of `enemy.takeDamage()`.

**Why Zone 1 mini-bosses work:** They have dedicated collision handling (lines 411-449) that calls `miniBoss.takeDamage()` properly.

**Fix Required:** Add Zone 2 mini-boss collision handling in `game.js` BEFORE the generic enemy collision loop, similar to Zone 1 mini-boss handling.

---

## New Sprite Sheets

| Asset Key | Filename | Frame Size |
|-----------|----------|------------|
| `z2_vulture_fly` | `192x192_z2Miniboss_Vulture_Fly.png` | 192x192 |
| `z2_vulture_attack` | `192x192_z2Miniboss_Vulture_Attack.png` | 192x192 |
| `z2_vulture_death` | `192x192_z2Miniboss_Vulture_Death.png` | 192x192 |

---

## New Behavior Flow

```
┌─────────────┐
│  CIRCLING   │ ← Start here, circle above battlefield
│  (3 sec)    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│PLAYER SWOOP │ ← Swoop at nearest player (attack animation)
│ (1 damage)  │   Deals 1 damage on contact
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ FLY AROUND  │ ← Free flight, repositioning (2-3 sec)
│  (2-3 sec)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│BUILDING DIVE│ ← Dive at building, destroy 10 blocks
│ (10 blocks) │   NEVER misses - targets center of building
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ RECOVERING  │ ← Rise up, drop debris on ANOTHER building
│ (2 sec)     │   Secondary damage (3 blocks on different building)
└──────┬──────┘
       │
       └──────→ Back to CIRCLING
```

---

## Implementation Details

### File 1: `js/assets.js`

**Add new asset registrations** (around line 85, with other Zone 2 assets):

```javascript
// Zone 2 Vulture King Mini-Boss (192x192 frames)
'z2_vulture_fly': 'assets/192x192_z2Miniboss_Vulture_Fly.png',
'z2_vulture_attack': 'assets/192x192_z2Miniboss_Vulture_Attack.png',
'z2_vulture_death': 'assets/192x192_z2Miniboss_Vulture_Death.png',
```

**Add to transparencyKeys array** (around line 25):

```javascript
'z2_vulture_fly', 'z2_vulture_attack', 'z2_vulture_death',
```

---

### File 2: `js/game.js`

**Add Zone 2 mini-boss collision handling** (insert BEFORE line 209 "Player projectiles vs enemies"):

```javascript
// Player projectiles vs Zone 2 mini-boss (VULTURE_KING, SANDSTORM_COLOSSUS)
if (enemyManager.zone2MiniBoss && enemyManager.zone2MiniBoss.active) {
    for (const proj of playerProjectiles) {
        if (!proj.active) continue;

        const miniBoss = enemyManager.zone2MiniBoss;
        const dist = Math.sqrt(
            Math.pow(proj.x - miniBoss.x, 2) +
            Math.pow(proj.y - miniBoss.y, 2)
        );

        if (dist < proj.radius + miniBoss.width / 2) {
            proj.active = false;
            const killed = miniBoss.takeDamage();
            addScore(Math.floor(75 * DayCycle.getScoreMultiplier()));

            if (killed) {
                addScore(Math.floor(2000 * DayCycle.getScoreMultiplier()));
            }
            break;
        }
    }
}

// Player collision with Zone 2 mini-boss
if (enemyManager.zone2MiniBoss && enemyManager.zone2MiniBoss.active && player.state === 'flying') {
    const miniBoss = enemyManager.zone2MiniBoss;
    const dist = Math.sqrt(
        Math.pow(player.x - miniBoss.x, 2) +
        Math.pow(player.y - miniBoss.y, 2)
    );

    if (dist < player.width / 2 + miniBoss.width / 2) {
        player.takeDamage(1);
    }
}
```

**Also:** Skip zone2MiniBoss in the generic enemy loop to prevent double-processing. In the enemy loop (around line 215), add check:

```javascript
for (const enemy of enemyManager.enemies) {
    if (!enemy.active) continue;
    // Skip zone2MiniBoss - handled separately above
    if (enemy === enemyManager.zone2MiniBoss) continue;
    // ... rest of collision code
}
```

---

### File 3: `js/enemies.js`

#### 3.1 Update VULTURE_KING Initialization (around line 869)

Replace current initialization with:

```javascript
case EnemyType.VULTURE_KING:
    this.speed = 120;
    this.health = 15;
    this.maxHealth = 15;
    this.width = 80;   // Larger for 192px sprite
    this.height = 80;
    this.isBoss = true;

    // Phase management
    this.bossPhase = 'circling'; // circling, playerSwoop, flyAround, buildingDive, recovering

    // Circling properties
    this.circleAngle = 0;
    this.circleRadius = 200;
    this.circleCenter = { x: CONFIG.CANVAS_WIDTH / 2, y: 180 };
    this.circleTimer = 3; // Time in circling before first attack

    // Player swoop properties
    this.swoopTargetX = 0;
    this.swoopTargetY = 0;
    this.swoopSpeed = 350; // Fast swoop
    this.hasHitPlayer = false;

    // Fly around properties
    this.flyAroundTimer = 0;
    this.flyAroundDuration = 2 + Math.random(); // 2-3 seconds
    this.flyDirection = { x: 1, y: 0 };

    // Building dive properties
    this.targetBuilding = null;
    this.hasDebris = false;

    // Recovery properties
    this.recoveryTimer = 0;

    // Animation state
    this.currentAnimName = 'fly';
    this.animations = null;
    this.facingRight = true;
    this.deathAnimStartTime = null;
    break;
```

#### 3.2 Update VULTURE_KING Update Logic (around line 1603)

Replace the entire VULTURE_KING update block with:

```javascript
// Vulture King Mini-Boss - New behavior
if (this.type === EnemyType.VULTURE_KING) {
    const speedMod = this.bellSlowed ? 0.3 : 1.0;

    // Get player position for swoop targeting
    const playerX = (typeof player !== 'undefined') ? player.x : CONFIG.CANVAS_WIDTH / 2;
    const playerY = (typeof player !== 'undefined') ? player.y : 300;

    // ========== PHASE: CIRCLING ==========
    if (this.bossPhase === 'circling') {
        this.currentAnimName = 'fly';

        // Circle high above battlefield
        this.circleAngle += deltaTime * 1.5 * speedMod;
        this.x = this.circleCenter.x + Math.cos(this.circleAngle) * this.circleRadius;
        this.y = this.circleCenter.y + Math.sin(this.circleAngle) * this.circleRadius * 0.3;

        // Face direction of movement
        this.facingRight = Math.cos(this.circleAngle) > 0;

        this.circleTimer -= deltaTime;
        if (this.circleTimer <= 0) {
            // Start player swoop
            this.bossPhase = 'playerSwoop';
            this.swoopTargetX = playerX;
            this.swoopTargetY = playerY;
            this.hasHitPlayer = false;
            this.currentAnimName = 'attack';
        }
    }

    // ========== PHASE: PLAYER SWOOP ==========
    else if (this.bossPhase === 'playerSwoop') {
        this.currentAnimName = 'attack';

        const dx = this.swoopTargetX - this.x;
        const dy = this.swoopTargetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Face swoop direction
        this.facingRight = dx > 0;

        if (dist > 20) {
            // Move toward target
            this.x += (dx / dist) * this.swoopSpeed * speedMod * deltaTime;
            this.y += (dy / dist) * this.swoopSpeed * speedMod * deltaTime;

            // Check player collision during swoop
            if (!this.hasHitPlayer && typeof player !== 'undefined' && player.state === 'flying') {
                const playerDist = Math.sqrt(
                    Math.pow(player.x - this.x, 2) + Math.pow(player.y - this.y, 2)
                );
                if (playerDist < this.width / 2 + player.width / 2) {
                    player.takeDamage(1);
                    this.hasHitPlayer = true;
                    if (typeof EffectsManager !== 'undefined') {
                        EffectsManager.addExplosion(this.x, this.y, 15, '#ff6600');
                    }
                }
            }
        } else {
            // Reached target, transition to fly around
            this.bossPhase = 'flyAround';
            this.flyAroundTimer = 2 + Math.random(); // 2-3 seconds
            this.flyDirection = {
                x: (Math.random() - 0.5) * 2,
                y: (Math.random() - 0.5)
            };
            this.currentAnimName = 'fly';
        }
    }

    // ========== PHASE: FLY AROUND ==========
    else if (this.bossPhase === 'flyAround') {
        this.currentAnimName = 'fly';

        // Random flight pattern
        this.x += this.flyDirection.x * this.speed * speedMod * deltaTime;
        this.y += this.flyDirection.y * this.speed * 0.5 * speedMod * deltaTime;

        // Face movement direction
        this.facingRight = this.flyDirection.x > 0;

        // Bounce off screen edges
        if (this.x < 50 || this.x > CONFIG.CANVAS_WIDTH - 50) {
            this.flyDirection.x *= -1;
        }
        if (this.y < CONFIG.SKY_TOP + 50 || this.y > CONFIG.STREET_Y - 150) {
            this.flyDirection.y *= -1;
        }

        // Keep in bounds
        this.x = Math.max(50, Math.min(CONFIG.CANVAS_WIDTH - 50, this.x));
        this.y = Math.max(CONFIG.SKY_TOP + 50, Math.min(CONFIG.STREET_Y - 150, this.y));

        this.flyAroundTimer -= deltaTime;
        if (this.flyAroundTimer <= 0) {
            // Pick building target for dive
            if (typeof buildingManager !== 'undefined') {
                const buildings = buildingManager.buildings.filter(b => b.getBlockCount() > 0);
                if (buildings.length > 0) {
                    this.targetBuilding = buildings[Math.floor(Math.random() * buildings.length)];
                    this.bossPhase = 'buildingDive';
                    this.currentAnimName = 'attack';
                }
            }
        }
    }

    // ========== PHASE: BUILDING DIVE ==========
    else if (this.bossPhase === 'buildingDive') {
        this.currentAnimName = 'attack';

        if (this.targetBuilding) {
            // Target CENTER of building (never miss)
            const targetX = this.targetBuilding.x + (this.targetBuilding.widthBlocks * CONFIG.BLOCK_SIZE) / 2;
            const targetY = this.targetBuilding.y + 20; // Slightly into building

            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            this.facingRight = dx > 0;

            if (dist > 25) {
                // Dive toward building
                this.x += (dx / dist) * this.speed * 2 * speedMod * deltaTime;
                this.y += (dy / dist) * this.speed * 2 * speedMod * deltaTime;
            } else {
                // HIT BUILDING - Destroy 10 blocks (GUARANTEED)
                let blocksDestroyed = 0;
                const maxAttempts = 50; // Prevent infinite loop
                let attempts = 0;

                while (blocksDestroyed < 10 && attempts < maxAttempts) {
                    const col = Math.floor(Math.random() * this.targetBuilding.widthBlocks);
                    const row = Math.floor(Math.random() * Math.min(8, this.targetBuilding.heightBlocks));

                    if (this.targetBuilding.blocks[row] && this.targetBuilding.blocks[row][col]) {
                        this.targetBuilding.destroyBlock(row, col);
                        blocksDestroyed++;
                    }
                    attempts++;
                }

                // Effects
                if (typeof EffectsManager !== 'undefined') {
                    EffectsManager.addExplosion(this.x, this.y, 40, '#cc9944');
                    EffectsManager.shake(12);
                }
                if (typeof SoundManager !== 'undefined') {
                    SoundManager.explosion();
                }

                this.hasDebris = true;
                this.bossPhase = 'recovering';
                this.recoveryTimer = 2.0;
            }
        }
    }

    // ========== PHASE: RECOVERING ==========
    else if (this.bossPhase === 'recovering') {
        this.currentAnimName = 'fly';

        // Rise up
        this.y -= 50 * speedMod * deltaTime;

        // Drop debris on another building at 1 second remaining
        if (this.hasDebris && this.recoveryTimer < 1.0) {
            this.hasDebris = false;
            if (typeof buildingManager !== 'undefined') {
                const buildings = buildingManager.buildings.filter(
                    b => b !== this.targetBuilding && b.getBlockCount() > 0
                );
                if (buildings.length > 0) {
                    const dropTarget = buildings[Math.floor(Math.random() * buildings.length)];
                    // Destroy 3 blocks from debris drop
                    for (let i = 0; i < 3; i++) {
                        const col = Math.floor(Math.random() * dropTarget.widthBlocks);
                        dropTarget.destroyBlock(0, col);
                    }
                    if (typeof EffectsManager !== 'undefined') {
                        const dropX = dropTarget.x + (dropTarget.widthBlocks * CONFIG.BLOCK_SIZE) / 2;
                        EffectsManager.addExplosion(dropX, dropTarget.y, 25, '#996633');
                    }
                }
            }
        }

        this.recoveryTimer -= deltaTime;
        if (this.recoveryTimer <= 0) {
            // Return to circling
            this.bossPhase = 'circling';
            this.circleTimer = 3 + Math.random() * 2; // 3-5 seconds before next attack cycle
            this.targetBuilding = null;
            this.circleCenter = { x: this.x, y: 180 }; // Re-center circle on current position
        }
    }

    return;
}
```

#### 3.3 Add Animation Initialization Method (after line 2900, near other init methods)

```javascript
initVultureKingAnimations() {
    if (this.animations) return;
    if (typeof AnimatedSprite === 'undefined' || typeof AssetManager === 'undefined') return;

    this.animations = {};
    const frameSize = 192;

    const createAnim = (assetKey, fps, mode) => {
        const sheet = AssetManager.getImage(assetKey);
        if (!sheet || sheet.width <= 0) return null;

        const framesPerRow = Math.floor(sheet.width / frameSize);
        const rowCount = Math.floor(sheet.height / frameSize);
        const frameCount = framesPerRow * rowCount;

        return new AnimatedSprite({
            sheet: sheet,
            frameWidth: frameSize,
            frameHeight: frameSize,
            frameCount: frameCount,
            framesPerRow: framesPerRow,
            fps: fps,
            mode: mode,
            scale: 1.0
        });
    };

    this.animations.fly = createAnim('z2_vulture_fly', 10, 'loop');
    this.animations.attack = createAnim('z2_vulture_attack', 12, 'loop');
    this.animations.death = createAnim('z2_vulture_death', 10, 'once');
}
```

#### 3.4 Update renderVultureKing Method (around line 3659)

Replace entire method with:

```javascript
renderVultureKing(ctx) {
    // Lazy init animations
    if (!this.animations) {
        this.initVultureKingAnimations();
    }

    // Use AnimatedSprite system
    if (this.animations) {
        // Select animation based on state
        let animName = this.currentAnimName || 'fly';
        if (this.health <= 0) {
            animName = 'death';
            if (!this.deathAnimStartTime) {
                this.deathAnimStartTime = Date.now();
                if (this.animations.death) this.animations.death.reset();
            }
        }

        const currentAnim = this.animations[animName];
        if (currentAnim) {
            ctx.save();

            // Horizontal flip based on facing direction
            if (!this.facingRight) {
                ctx.scale(-1, 1);
            }

            // Tilt during dives
            if (this.bossPhase === 'playerSwoop' || this.bossPhase === 'buildingDive') {
                const tiltAngle = this.facingRight ? 0.3 : -0.3;
                ctx.rotate(tiltAngle);
            }

            currentAnim.update(1/60); // Assume ~60fps
            currentAnim.render(ctx, 0, 0);

            ctx.restore();

            // Health bar (larger for boss)
            this.renderHealthBar(ctx, 80);
            return;
        }
    }

    // Fallback to procedural (existing code)
    ctx.save();
    const flapAngle = Math.sin(Date.now() / 100) * 0.3;

    // Wings
    ctx.fillStyle = '#2d1f1a';
    ctx.save();
    ctx.rotate(-flapAngle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-50, -20);
    ctx.lineTo(-45, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.rotate(flapAngle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(50, -20);
    ctx.lineTo(45, 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Body
    ctx.fillStyle = '#3d2a20';
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#8b0000';
    ctx.beginPath();
    ctx.arc(-15, -10, 12, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.moveTo(-25, -10);
    ctx.lineTo(-35, -8);
    ctx.lineTo(-25, -5);
    ctx.closePath();
    ctx.fill();

    // Debris if carrying
    if (this.hasDebris) {
        ctx.fillStyle = '#666666';
        ctx.fillRect(-10, 15, 20, 10);
    }

    ctx.restore();

    // Health bar
    this.renderHealthBar(ctx, 80);
}
```

---

### File 4: `index.html`

**Update version query strings:**

```html
<script src="js/config.js?v=30"></script>
<script src="js/assets.js?v=16"></script>
<script src="js/enemies.js?v=22"></script>
<script src="js/game.js?v=20"></script>
```

---

### File 5: `js/config.js`

**Update version:**

```javascript
VERSION: 'v1.0.82',
```

---

## Files Summary

| File | Changes |
|------|---------|
| `js/assets.js` | Add 3 new sprite sheet registrations + transparency keys |
| `js/game.js` | Add Zone 2 mini-boss collision handling (BUG FIX) |
| `js/enemies.js` | Update VULTURE_KING init, update logic, animation init, render method |
| `js/config.js` | Bump version |
| `index.html` | Bump version query strings |

---

## Verification Steps

1. **Hard refresh** browser (Ctrl+Shift+R)
2. **Play to Wave 2 in Zone 2** - Vulture King should spawn after wave
3. **Test HP**: Shoot Vulture - should take 15 hits to kill (not 1!)
4. **Test circling**: Should circle for ~3 seconds initially
5. **Test player swoop**: Should dive at player, deal 1 damage on contact
6. **Test fly around**: Should fly randomly for 2-3 seconds
7. **Test building dive**: Should dive at building and destroy ~10 blocks
8. **Test debris drop**: Should drop debris on different building during recovery
9. **Test animations**: Fly animation during circling/fly, Attack animation during swoops
10. **Test death**: Death animation should play when killed

---

## Console Test Commands

```javascript
// Skip to Zone 2
game.currentZone = 2;

// Spawn Vulture King manually for testing
const vulture = new Enemy(500, 200, EnemyType.VULTURE_KING);
enemyManager.enemies.push(vulture);
enemyManager.zone2MiniBoss = vulture;

// Check vulture health
enemyManager.zone2MiniBoss.health  // Should be 15

// Force phase change for testing
enemyManager.zone2MiniBoss.bossPhase = 'playerSwoop';
enemyManager.zone2MiniBoss.bossPhase = 'buildingDive';
```
