// ============================================
// PLAYER SYSTEM - Supports 1-2 Players
// ============================================
const PlayerState = {
    DOCKED: 'docked',
    FLYING: 'flying',
    REFUELING: 'refueling',
    EXPLODING: 'exploding',
    DEAD: 'dead' // Out of lives
};

// Player color schemes
const PlayerColors = {
    1: {
        body: '#1e293b',        // Slate 800
        bodyHighlight: 'rgba(148, 163, 184, 0.3)',
        wings: '#334155',       // Slate 700
        cockpit: '#0ea5e9',     // Sky 500 (Blue)
        engine: '#3b82f6',
        engineCore: '#60a5fa',
        engineHot: '#bfdbfe',
        shield: '#00aaff'
    },
    2: {
        body: '#3b1e29',        // Dark magenta
        bodyHighlight: 'rgba(184, 148, 163, 0.3)',
        wings: '#553341',       // Darker magenta
        cockpit: '#e90ea5',     // Pink/Magenta
        engine: '#f63b82',
        engineCore: '#fa60a5',
        engineHot: '#febfdb',
        shield: '#ff00aa'
    }
};

class Player {
    constructor(playerId = 1) {
        this.id = playerId;
        this.colors = PlayerColors[playerId] || PlayerColors[1];
        this.score = 0;
        this.animTimer = 0;
        this.reset();
    }

    reset() {
        // Spawn at assigned pad based on player ID
        const pad = this.id === 1 ? CONFIG.REFUEL_PAD_LEFT : CONFIG.REFUEL_PAD_RIGHT;
        this.assignedPad = pad; // Remember which pad this player uses
        this.x = pad.x;
        this.y = pad.y - CONFIG.REFUEL_PAD_HEIGHT - 15;
        this.angle = -90;
        this.state = PlayerState.DOCKED;

        this.speed = CONFIG.PLAYER_SPEED;
        this.minSpeed = CONFIG.PLAYER_MIN_SPEED;
        this.maxSpeed = CONFIG.PLAYER_MAX_SPEED;
        this.currentSpeed = this.speed;
        this.acceleration = CONFIG.PLAYER_ACCELERATION;
        this.deceleration = CONFIG.PLAYER_DECELERATION;
        this.turnSpeed = CONFIG.PLAYER_TURN_SPEED;

        this.fuel = CONFIG.FUEL_MAX;
        this.lives = CONFIG.PLAYER_LIVES;

        this.refuelTimer = 0;
        this.explosionTimer = 0;
        this.fireCooldown = 0;
        this.fireRate = 0.15;
        this.launchGraceTimer = 0;

        this.width = 35;  // Wider hitbox to match 45x45 sprite
        this.height = 35; // Taller hitbox to match 45x45 sprite

        this.shield = false;
        this.invulnerable = false;
        this.invulnerabilityTimer = 0;
        this.bounceVx = 0;
        this.bounceVy = 0;

        this.targetingBoost = false;
        this.fireRateBoost = false;

        // Weapon mode: 'combat' (normal shots) or 'repair' (repair beam)
        this.weaponMode = 'combat';
    }

    // Get input state for this player from InputManager
    getInput(action) {
        return input.isPlayerActionDown(this.id, action);
    }

    getInputJustPressed(action) {
        return input.isPlayerActionJustPressed(this.id, action);
    }

    update(deltaTime) {
        this.animTimer += deltaTime;

        if (this.state === PlayerState.DEAD) return;

        if (this.invulnerable) {
            this.invulnerabilityTimer -= deltaTime;
            if (this.invulnerabilityTimer <= 0) {
                this.invulnerable = false;
                this.invulnerabilityTimer = 0;
            }
        }

        if (this.bounceVx !== 0 || this.bounceVy !== 0) {
            this.x += this.bounceVx * deltaTime;
            this.y += this.bounceVy * deltaTime;
            this.bounceVx *= 0.9;
            this.bounceVy *= 0.9;
            if (Math.abs(this.bounceVx) < 1) this.bounceVx = 0;
            if (Math.abs(this.bounceVy) < 1) this.bounceVy = 0;
        }

        // Check for weapon mode toggle (A key for P1, Q key for P2)
        if (this.getInputJustPressed(Actions.MODE_SWITCH) && this.state === PlayerState.FLYING) {
            this.weaponMode = this.weaponMode === 'combat' ? 'repair' : 'combat';
            console.log(`P${this.id} weapon mode: ${this.weaponMode}`);
            // Play mode switch sound
            if (typeof SoundManager !== 'undefined' && SoundManager.modeSwitch) {
                SoundManager.modeSwitch();
            }
        }

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
        // Launch on UP
        if (this.getInputJustPressed(Actions.UP)) {
            this.state = PlayerState.FLYING;
            this.currentSpeed = this.speed;
            this.launchGraceTimer = 0.5;
            console.log(`Player ${this.id} launched!`);
            if (typeof EffectsManager !== 'undefined') {
                EffectsManager.addExplosion(this.x, this.y + 10, 10, '#ffffff');
            }
        }

        // Switch pads on LEFT/RIGHT (teleport to opposite pad if unoccupied)
        if (this.getInputJustPressed(Actions.LEFT) || this.getInputJustPressed(Actions.RIGHT)) {
            // Determine which pad we're on and which to switch to
            const leftPad = CONFIG.REFUEL_PAD_LEFT;
            const rightPad = CONFIG.REFUEL_PAD_RIGHT;
            const onLeftPad = Math.abs(this.x - leftPad.x) < 50;
            const targetPad = onLeftPad ? rightPad : leftPad;

            // Check if target pad is occupied by another player
            let padOccupied = false;
            if (typeof playerManager !== 'undefined') {
                for (const p of playerManager.players) {
                    if (p !== this && (p.state === PlayerState.DOCKED || p.state === PlayerState.REFUELING)) {
                        const onTarget = Math.abs(p.x - targetPad.x) < 50;
                        if (onTarget) {
                            padOccupied = true;
                            break;
                        }
                    }
                }
            }

            if (!padOccupied) {
                // Teleport to the other pad
                this.x = targetPad.x;
                this.y = targetPad.y - CONFIG.REFUEL_PAD_HEIGHT - 15;
                this.assignedPad = targetPad;
                console.log(`Player ${this.id} switched to ${onLeftPad ? 'right' : 'left'} pad`);

                // Small visual effect
                if (typeof EffectsManager !== 'undefined') {
                    EffectsManager.addExplosion(this.x, this.y, 8, '#00ffff');
                }
            }
        }
    }

    updateFlying(deltaTime) {
        if (this.launchGraceTimer > 0) {
            this.launchGraceTimer -= deltaTime;
        }

        // Turn
        if (this.getInput(Actions.LEFT)) {
            this.angle -= this.turnSpeed * deltaTime;
        }
        if (this.getInput(Actions.RIGHT)) {
            this.angle += this.turnSpeed * deltaTime;
        }

        while (this.angle < 0) this.angle += 360;
        while (this.angle >= 360) this.angle -= 360;

        // Thrust
        if (this.getInput(Actions.UP)) {
            this.currentSpeed += this.acceleration * deltaTime;
        } else if (this.getInput(Actions.DOWN)) {
            this.currentSpeed -= this.deceleration * deltaTime;
        }

        this.currentSpeed = Math.max(this.minSpeed, Math.min(this.maxSpeed, this.currentSpeed));

        // Shoot
        this.fireCooldown -= deltaTime;
        if (this.getInput(Actions.FIRE) && this.fireCooldown <= 0) {
            this.shoot();
            // Apply fire rate boost if active
            const effectiveFireRate = this.fireRateBoost ? this.fireRate * 0.5 : this.fireRate;
            this.fireCooldown = effectiveFireRate;
        }

        // Movement
        const radians = this.angle * (Math.PI / 180);
        this.x += Math.cos(radians) * this.currentSpeed * deltaTime;
        this.y += Math.sin(radians) * this.currentSpeed * deltaTime;

        // Wind
        if (typeof WeatherManager !== 'undefined') {
            this.x += WeatherManager.getWindEffect() * deltaTime;
        }

        // Fuel
        this.fuel -= CONFIG.FUEL_DRAIN_RATE * deltaTime;

        // Screen bounds
        const WRAP_MARGIN = 40;
        const KILL_MARGIN = 100;

        if (this.x < -KILL_MARGIN || this.x > CONFIG.CANVAS_WIDTH + KILL_MARGIN) {
            this.die();
            return;
        }

        if (this.x < -WRAP_MARGIN) this.x = CONFIG.CANVAS_WIDTH + WRAP_MARGIN;
        if (this.x > CONFIG.CANVAS_WIDTH + WRAP_MARGIN) this.x = -WRAP_MARGIN;

        if (this.y < CONFIG.SKY_TOP + 10) this.y = CONFIG.SKY_TOP + 10;
        if (this.y > CONFIG.STREET_Y - 10) this.y = CONFIG.STREET_Y - 10;

        // Refuel pads (exclusive)
        if (this.launchGraceTimer <= 0) {
            this.checkRefuelPads();
        }

        if (this.fuel <= 0) {
            this.die();
        }
    }

    updateRefueling(deltaTime) {
        this.refuelTimer += deltaTime;
        const refuelProgress = this.refuelTimer / CONFIG.REFUEL_TIME;
        this.fuel = Math.min(CONFIG.FUEL_MAX, CONFIG.FUEL_MAX * refuelProgress);

        if (this.refuelTimer >= CONFIG.REFUEL_TIME) {
            this.fuel = CONFIG.FUEL_MAX;
            this.state = PlayerState.DOCKED;
            this.refuelTimer = 0;
            SoundManager.refuelComplete();
            // Play takeoff sound after brief delay
            setTimeout(() => SoundManager.takeoff(), 200);
        }
    }

    updateExploding(deltaTime) {
        this.explosionTimer += deltaTime;
        if (this.explosionTimer >= 1.5) {
            this.respawn();
        }
    }

    checkRefuelPads() {
        const pads = [CONFIG.REFUEL_PAD_LEFT, CONFIG.REFUEL_PAD_RIGHT];
        const padW = CONFIG.REFUEL_PAD_WIDTH;
        const padH = CONFIG.REFUEL_PAD_HEIGHT;

        for (const pad of pads) {
            if (this.x > pad.x - padW / 2 && this.x < pad.x + padW / 2 &&
                this.y > pad.y - padH - 20 && this.y < pad.y) {

                // Check if another player is using this pad
                const padOccupied = playerManager.isRefuelPadOccupied(pad, this.id);
                if (!padOccupied) {
                    this.dock(pad);
                }
                break;
            }
        }
    }

    dock(pad) {
        this.x = pad.x;
        this.y = pad.y - CONFIG.REFUEL_PAD_HEIGHT - 15;
        this.angle = -90;
        this.currentSpeed = this.speed;
        this.state = PlayerState.REFUELING;
        this.refuelTimer = 0;
        SoundManager.refuelStart();
        console.log(`Player ${this.id} docking...`);
    }

    shoot() {
        const radians = this.angle * (Math.PI / 180);
        const bulletX = this.x + Math.cos(radians) * (this.width / 2 + 5);
        const bulletY = this.y + Math.sin(radians) * (this.width / 2 + 5);

        if (this.weaponMode === 'repair') {
            // Repair beam mode - requires materials
            const playerIndex = this.id - 1;
            const materials = game.materials[playerIndex] || 0;

            if (materials > 0) {
                // Consume 1 material
                game.materials[playerIndex] = materials - 1;

                // Fire repair beam projectile (true = player owned, 'repair' type)
                projectileManager.add(bulletX, bulletY, this.angle, 400, true, this.id, 'repair');

                if (typeof EffectsManager !== 'undefined') {
                    // Green/blue welding spark muzzle flash
                    EffectsManager.addMuzzleFlash(bulletX, bulletY, this.angle, '#4ade80');
                }
                SoundManager.shoot(); // TODO: Add distinct repair beam sound
            } else {
                // No materials - play empty click sound
                // TODO: Add empty click sound
                console.log(`P${this.id} out of materials!`);
            }
        } else {
            // Combat mode - normal shot
            projectileManager.add(bulletX, bulletY, this.angle, 500, true, this.id);

            if (typeof EffectsManager !== 'undefined') {
                EffectsManager.addMuzzleFlash(bulletX, bulletY, this.angle);
            }
            SoundManager.shoot();
        }
    }

    die() {
        this.lives--;
        this.state = PlayerState.EXPLODING;
        this.explosionTimer = 0;
        SoundManager.playerDeath();

        if (typeof EffectsManager !== 'undefined') {
            // DRAMATIC PLAYER DEATH - combine procedural + animated for maximum impact

            // Main procedural explosions (visible fireball)
            EffectsManager.addExplosion(this.x, this.y, 50, '#ffffff');
            EffectsManager.addExplosion(this.x, this.y, 70, '#ffaa00');

            // Animated debris particles on top
            EffectsManager.addAnimatedExplosion(this.x, this.y, 'player', 60);

            // Cascading secondary explosions for dramatic effect
            setTimeout(() => {
                EffectsManager.addExplosion(this.x + 15, this.y - 10, 40, '#ff4400');
                EffectsManager.addAnimatedExplosion(this.x + 15, this.y - 10, 'player', 35);
            }, 80);
            setTimeout(() => {
                EffectsManager.addExplosion(this.x - 15, this.y + 10, 40, '#ff0000');
                EffectsManager.addAnimatedExplosion(this.x - 15, this.y + 10, 'player', 35);
            }, 160);
            setTimeout(() => {
                EffectsManager.addExplosion(this.x, this.y - 15, 30, '#ffcc00');
            }, 240);

            EffectsManager.shake(20);
            EffectsManager.hitStop(0.25);
        }

        console.log(`Player ${this.id} died! Lives: ${this.lives}`);
    }

    activateShield() {
        if (this.shield) return false;
        this.shield = true;
        SoundManager.shieldCollect();
        return true;
    }

    takeDamage(bounceX = 0, bounceY = 0) {
        if (this.invulnerable) return false;

        if (this.shield) {
            this.shield = false;
            this.invulnerable = true;
            this.invulnerabilityTimer = 1.5;
            this.bounceVx = bounceX * 200;
            this.bounceVy = bounceY * 200;

            SoundManager.shieldBreak();
            if (typeof EffectsManager !== 'undefined') {
                EffectsManager.addExplosion(this.x, this.y, 35, this.colors.shield);
                EffectsManager.addExplosion(this.x, this.y, 25, '#ffffff');
                EffectsManager.shake(8);
            }
            return false;
        }

        this.die();
        return true;
    }

    respawn() {
        if (this.lives > 0) {
            // Respawn at assigned pad
            this.x = this.assignedPad.x;
            this.y = this.assignedPad.y - CONFIG.REFUEL_PAD_HEIGHT - 15;
            this.angle = -90;
            this.currentSpeed = this.speed;
            this.fuel = CONFIG.FUEL_MAX;
            this.state = PlayerState.DOCKED;
            this.explosionTimer = 0;
            // Play takeoff sound on respawn
            if (typeof SoundManager !== 'undefined') {
                setTimeout(() => SoundManager.takeoff(), 300);
            }
        } else {
            this.state = PlayerState.DEAD;
            console.log(`Player ${this.id} is out of lives!`);
        }
    }

    addScore(points) {
        if (points <= 0) return;
        this.score += points;

        // Bonus life check (per player)
        // This can be implemented with a nextBonusAt tracker per player
    }

    render(ctx) {
        if (this.state === PlayerState.EXPLODING || this.state === PlayerState.DEAD) return;

        const c = this.colors;
        const spriteKey = this.id === 1 ? 'player_p1' : 'player_p2';
        const sprite = AssetManager.getImage(spriteKey);

        // Shadow beneath player
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(this.x, CONFIG.STREET_Y - 5, 20, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle * Math.PI / 180);

        // Apply sprite-specific rotation offset FIRST (before engine effects)
        // P1 sprite has nose pointing left (needs +180°)
        // P2 sprite has nose pointing up (needs +90°)
        const spriteRotation = this.id === 1 ? Math.PI : Math.PI / 2;
        ctx.rotate(spriteRotation);

        // Engine glow (behind sprite) - position adjusted for sprite rotation
        if (this.state === PlayerState.FLYING) {
            // P1 is rotated 180° so "behind" is at +X, P2 is rotated 90° so "behind" is at +Y
            // Position at edge of sprite (sprite is 45x45, half = 22)
            const thrustOffsetX = this.id === 1 ? 20 : 0;
            const thrustOffsetY = this.id === 1 ? 0 : 20;

            const glowSize = 30 + Math.random() * 12;
            const gradient = ctx.createRadialGradient(thrustOffsetX, thrustOffsetY, 2, thrustOffsetX, thrustOffsetY, glowSize);
            gradient.addColorStop(0, this.id === 1 ? 'rgba(59, 130, 246, 0.8)' : 'rgba(236, 72, 153, 0.8)');
            gradient.addColorStop(0.5, this.id === 1 ? 'rgba(59, 130, 246, 0.3)' : 'rgba(236, 72, 153, 0.3)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(thrustOffsetX, thrustOffsetY, glowSize, 0, Math.PI * 2);
            ctx.fill();

            // Animated thrust flames
            const thrust = 15 + Math.random() * 10;
            ctx.fillStyle = this.id === 1 ? '#60a5fa' : '#f472b6';
            ctx.beginPath();
            if (this.id === 1) {
                // P1: flames extend to the right (+X) from sprite edge
                ctx.moveTo(20, -6);
                ctx.lineTo(20 + thrust, 0);
                ctx.lineTo(20, 6);
            } else {
                // P2: flames extend downward (+Y) from sprite edge
                ctx.moveTo(-6, 20);
                ctx.lineTo(0, 20 + thrust);
                ctx.lineTo(6, 20);
            }
            ctx.fill();

            ctx.fillStyle = this.id === 1 ? '#bfdbfe' : '#fbcfe8';
            ctx.beginPath();
            if (this.id === 1) {
                ctx.moveTo(20, -3);
                ctx.lineTo(20 + thrust * 0.6, 0);
                ctx.lineTo(20, 3);
            } else {
                ctx.moveTo(-3, 20);
                ctx.lineTo(0, 20 + thrust * 0.6);
                ctx.lineTo(3, 20);
            }
            ctx.fill();
        }

        // Draw sprite or fallback to code
        if (sprite) {
            const spriteWidth = 45;
            const spriteHeight = 45;
            ctx.drawImage(sprite, -spriteWidth / 2, -spriteHeight / 2, spriteWidth, spriteHeight);
        } else {
            // Fallback: draw simple placeholder
            ctx.fillStyle = c.body;
            ctx.beginPath();
            ctx.moveTo(15, 0);
            ctx.lineTo(-5, -6);
            ctx.lineTo(-12, -10);
            ctx.lineTo(-15, 0);
            ctx.lineTo(-12, 10);
            ctx.lineTo(-5, 6);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = c.cockpit;
            ctx.beginPath();
            ctx.ellipse(2, 0, 5, 3, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // Shield bubble (world coords)
        if (this.shield) {
            const pulse = Math.sin(this.animTimer * 4) * 0.1 + 0.9;
            const radius = 35 * pulse;

            ctx.save();
            ctx.shadowBlur = 15;
            ctx.shadowColor = c.shield;
            ctx.strokeStyle = c.shield;
            ctx.globalAlpha = 0.6;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.globalAlpha = 0.15;
            ctx.fillStyle = c.shield;
            ctx.fill();
            ctx.restore();
        }

        // Invulnerability flicker
        if (this.invulnerable && Math.floor(this.animTimer * 15) % 2 === 0) {
            ctx.save();
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 30, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

// ============================================
// PLAYER MANAGER - Handles 1 or 2 players
// ============================================
const playerManager = {
    players: [],
    numPlayers: 1, // Default to 1 player

    init(numPlayers = 1) {
        this.numPlayers = Math.min(2, Math.max(1, numPlayers));
        this.players = [];

        for (let i = 1; i <= this.numPlayers; i++) {
            this.players.push(new Player(i));
        }

        console.log(`PlayerManager: Initialized with ${this.numPlayers} player(s)`);
    },

    reset() {
        this.players.forEach(p => p.reset());
    },

    update(deltaTime) {
        this.players.forEach(p => p.update(deltaTime));
    },

    render(ctx) {
        this.players.forEach(p => p.render(ctx));
    },

    // Check if a refuel pad is occupied by another player
    isRefuelPadOccupied(pad, excludePlayerId) {
        for (const p of this.players) {
            if (p.id === excludePlayerId) continue;
            if (p.state === PlayerState.DOCKED || p.state === PlayerState.REFUELING) {
                // Check if this player is at this pad
                const atPad = Math.abs(p.x - pad.x) < 10;
                if (atPad) return true;
            }
        }
        return false;
    },

    // Get all active (non-dead) players
    getActivePlayers() {
        return this.players.filter(p => p.state !== PlayerState.DEAD);
    },

    // Check if all players are dead (game over condition)
    allPlayersDead() {
        return this.players.every(p => p.lives <= 0);
    },

    // Get player by ID
    getPlayer(id) {
        return this.players.find(p => p.id === id);
    },

    // Get combined score (for high score)
    getTotalScore() {
        return this.players.reduce((sum, p) => sum + p.score, 0);
    }
};

// Legacy compatibility - create default player reference
// This will be updated by game.js during init
let player = null;
