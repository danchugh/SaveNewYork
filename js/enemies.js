const EnemyType = {
    STANDARD: 'standard',    // Scout Drone
    AGGRESSIVE: 'aggressive', // Hunter Chopper
    TANK: 'tank',            // Heavy Gunship
    SPLITTER: 'splitter',    // Carrier
    BOMBER: 'bomber',        // Kamikaze Missile
    // Zone 2 enemies
    DUST_DEVIL: 'dust_devil',
    SANDWORM: 'sandworm',
    SAND_CARRIER: 'sand_carrier',
    SCORPION: 'scorpion',
    VULTURE_KING: 'vulture_king',
    SANDSTORM_COLOSSUS: 'sandstorm_colossus',
    SIEGE_CRAWLER: 'siege_crawler'
};

const EnemyState = {
    FLYING: 'flying',
    ATTACKING: 'attacking',
    FALLING: 'falling',
    DYING: 'dying',      // Death animation playing (frozen, no collision)
    DEAD: 'dead'
};

// Global counter for carrier-spawned drones (don't count toward wave completion)
let carrierSpawnedDroneCount = 0;

// Global array for burrowing pods (Sand Carrier)
let burrowingPods = [];

class BurrowingPod {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.burstTimer = 1.5 + Math.random(); // 1.5-2.5 seconds (reduced from 4-5)
        this.active = true;
    }

    update(deltaTime) {
        if (!this.active) return;
        this.burstTimer -= deltaTime;

        if (this.burstTimer <= 0) {
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
        const pulse = 0.5 + Math.sin(Date.now() / 200) * 0.3;
        ctx.fillStyle = `rgba(139, 90, 43, ${pulse})`;
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        if (this.burstTimer < 1) {
            ctx.strokeStyle = '#ff4444';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
}

// Global array for falling pods (Sand Carrier drops)
let fallingPods = [];

class FallingPod {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.active = true;
        this.fallSpeed = CONFIG.SAND_CARRIER_POD_FALL_SPEED || 120;
        this.width = 16;
        this.height = 16;
        this.rotation = 0;
    }

    update(deltaTime) {
        if (!this.active) return;

        // Fall with gravity
        this.y += this.fallSpeed * deltaTime;

        // Spin while falling
        this.rotation += deltaTime * 10;

        // Check if hit ground
        if (this.y >= CONFIG.STREET_Y - 5) {
            this.explode();
        }
    }

    explode() {
        if (!this.active) return;
        this.active = false;

        // Explosion effect
        if (typeof EffectsManager !== 'undefined') {
            EffectsManager.addExplosion(this.x, this.y, 25, '#cc8844');
        }

        // Play sound
        if (typeof SoundManager !== 'undefined') {
            SoundManager.fallingCrash();
        }

        // Spawn Zone 2 aggressive drone
        if (typeof enemyManager !== 'undefined') {
            const drone = new Enemy(this.x, this.y - 20, EnemyType.AGGRESSIVE);
            drone.isCarrierSpawned = true;
            enemyManager.enemies.push(drone);
        }
    }

    // Called when colliding with building - damages blocks then spawns drone
    explodeOnBuilding(building, row, col) {
        if (!this.active) return;
        this.active = false;

        // Explosion effect
        if (typeof EffectsManager !== 'undefined') {
            EffectsManager.addExplosion(this.x, this.y, 25, '#cc8844');
        }

        // Play sound
        if (typeof SoundManager !== 'undefined') {
            SoundManager.fallingCrash();
        }

        // Destroy blocks (3 damage)
        let destroyed = 0;
        const damage = CONFIG.SAND_CARRIER_POD_DAMAGE || 3;
        for (let dr = -1; dr <= 1 && destroyed < damage; dr++) {
            for (let dc = -1; dc <= 1 && destroyed < damage; dc++) {
                const tr = row + dr;
                const tc = col + dc;
                if (tr >= 0 && tr < building.heightBlocks &&
                    tc >= 0 && tc < building.widthBlocks &&
                    building.blocks[tr][tc]) {
                    building.destroyBlock(tr, tc);
                    destroyed++;
                }
            }
        }

        // Track blocks destroyed for Sand Carrier
        if (this.ownerCarrier) {
            this.ownerCarrier.blocksDestroyedAtTarget += destroyed;
        }

        // Spawn Zone 2 aggressive drone
        if (typeof enemyManager !== 'undefined') {
            const drone = new Enemy(this.x, this.y - 20, EnemyType.AGGRESSIVE);
            drone.isCarrierSpawned = true;
            enemyManager.enemies.push(drone);
        }
    }

    // Called when hitting player
    explodeOnPlayer() {
        if (!this.active) return;
        this.active = false;

        // Explosion effect
        if (typeof EffectsManager !== 'undefined') {
            EffectsManager.addExplosion(this.x, this.y, 25, '#cc8844');
        }

        // Play sound
        if (typeof SoundManager !== 'undefined') {
            SoundManager.fallingCrash();
        }

        // Spawn Zone 2 aggressive drone
        if (typeof enemyManager !== 'undefined') {
            const drone = new Enemy(this.x, this.y - 20, EnemyType.AGGRESSIVE);
            drone.isCarrierSpawned = true;
            enemyManager.enemies.push(drone);
        }
    }

    render(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Draw pod as a glowing orb
        ctx.fillStyle = '#aa6633';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        // Inner glow
        ctx.fillStyle = '#ffaa66';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing outline
        const pulse = 0.5 + Math.sin(Date.now() / 100) * 0.5;
        ctx.strokeStyle = `rgba(255, 100, 50, ${pulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }
}

// Global array for dust devils (Zone 2 environmental hazards)
let dustDevils = [];

class DustDevil {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.active = true;

        // Sprite frame dimensions (each frame is 64x64)
        this.frameWidth = 64;
        this.frameHeight = 64;
        this.width = 64;
        this.height = 64;

        // Animation
        this.animFrame = 0;
        this.animTimer = 0;
        this.animFPS = 10;
        this.frameCount = 1; // Will be calculated from sprite sheet

        // Fade system
        this.opacity = 0;
        this.targetOpacity = 1;
        this.fadeSpeed = 1 / CONFIG.DUST_DEVIL_FADE_DURATION;

        // Lifetime
        this.lifetime = CONFIG.DUST_DEVIL_LIFETIME;
        this.despawning = false;

        // Movement
        this.velX = (Math.random() - 0.5) * 2;
        this.velY = (Math.random() - 0.5) * 2;
        this.directionChangeTimer = 0;

        // Captured entities: {entity, type, timer, spinAngle, collidedWith}
        this.capturedEntities = [];

        // Visual
        this.rotation = 0;
        this.spinSoundTimer = 0;
    }

    update(deltaTime) {
        // Handle fade in/out
        if (this.despawning) {
            this.opacity -= this.fadeSpeed * deltaTime;
            if (this.opacity <= 0) {
                this.opacity = 0;
                this.active = false;
                return;
            }
        } else {
            if (this.opacity < this.targetOpacity) {
                this.opacity += this.fadeSpeed * deltaTime;
                if (this.opacity >= this.targetOpacity) {
                    this.opacity = this.targetOpacity;
                }
            }
        }

        // Countdown lifetime
        this.lifetime -= deltaTime;
        if (this.lifetime <= 0 && !this.despawning) {
            this.startDespawn();
        }

        // Update movement with bias toward player/enemies
        this.updateMovement(deltaTime);

        // Check suction radius (only when not despawning)
        if (!this.despawning) {
            this.checkSuction();
        }

        // Update captured entities
        this.updateCaptured(deltaTime);

        // Visual rotation
        this.rotation += deltaTime * 5;

        // Update animation frame
        this.animTimer += deltaTime;
        if (this.animTimer >= 1 / this.animFPS) {
            this.animTimer = 0;
            this.animFrame++;
            if (this.animFrame >= this.frameCount) {
                this.animFrame = 0;
            }
        }

        // Play periodic spin sound when entities are captured
        if (this.capturedEntities.length > 0) {
            this.spinSoundTimer -= deltaTime;
            if (this.spinSoundTimer <= 0) {
                if (typeof SoundManager !== 'undefined' && SoundManager.dustDevilSpin) {
                    SoundManager.dustDevilSpin();
                }
                this.spinSoundTimer = 0.5;
            }
        }
    }

    updateMovement(deltaTime) {
        // Direction change timer
        this.directionChangeTimer -= deltaTime;
        if (this.directionChangeTimer <= 0) {
            this.directionChangeTimer = 2 + Math.random() * 3;

            // Base random movement
            let targetVelX = (Math.random() - 0.5) * 2;
            let targetVelY = (Math.random() - 0.5) * 2;

            // Bias toward nearest player
            if (typeof playerManager !== 'undefined') {
                const players = playerManager.getActivePlayers();
                let nearestPlayer = null;
                let nearestDist = Infinity;

                for (const p of players) {
                    if (p.state === 'flying' && !p.dustDevilCaptured) {
                        const dist = Math.sqrt((p.x - this.x) ** 2 + (p.y - this.y) ** 2);
                        if (dist < nearestDist) {
                            nearestDist = dist;
                            nearestPlayer = p;
                        }
                    }
                }

                if (nearestPlayer && nearestDist < 400) {
                    const dx = nearestPlayer.x - this.x;
                    const dy = nearestPlayer.y - this.y;
                    const mag = Math.sqrt(dx * dx + dy * dy);
                    if (mag > 0) {
                        targetVelX += (dx / mag) * CONFIG.DUST_DEVIL_PLAYER_BIAS;
                        targetVelY += (dy / mag) * CONFIG.DUST_DEVIL_PLAYER_BIAS;
                    }
                }
            }

            // Bias toward nearest enemy (to suck them in too)
            if (typeof enemyManager !== 'undefined') {
                let nearestEnemy = null;
                let nearestEnemyDist = Infinity;

                for (const e of enemyManager.enemies) {
                    if (e.active && e.type !== EnemyType.DUST_DEVIL && !e.dustDevilCaptured) {
                        const dist = Math.sqrt((e.x - this.x) ** 2 + (e.y - this.y) ** 2);
                        if (dist < nearestEnemyDist) {
                            nearestEnemyDist = dist;
                            nearestEnemy = e;
                        }
                    }
                }

                if (nearestEnemy && nearestEnemyDist < 300) {
                    const dx = nearestEnemy.x - this.x;
                    const dy = nearestEnemy.y - this.y;
                    const mag = Math.sqrt(dx * dx + dy * dy);
                    if (mag > 0) {
                        targetVelX += (dx / mag) * CONFIG.DUST_DEVIL_ENEMY_BIAS;
                        targetVelY += (dy / mag) * CONFIG.DUST_DEVIL_ENEMY_BIAS;
                    }
                }
            }

            // Normalize
            const mag = Math.sqrt(targetVelX * targetVelX + targetVelY * targetVelY);
            if (mag > 0) {
                this.velX = targetVelX / mag;
                this.velY = targetVelY / mag;
            }
        }

        // Apply movement
        this.x += this.velX * CONFIG.DUST_DEVIL_SPEED * deltaTime;
        this.y += this.velY * CONFIG.DUST_DEVIL_SPEED * deltaTime;

        // Keep within bounds
        const margin = 50;
        if (this.x < margin) {
            this.x = margin;
            this.velX = Math.abs(this.velX);
        }
        if (this.x > CONFIG.CANVAS_WIDTH - margin) {
            this.x = CONFIG.CANVAS_WIDTH - margin;
            this.velX = -Math.abs(this.velX);
        }
        if (this.y < CONFIG.SKY_TOP + margin) {
            this.y = CONFIG.SKY_TOP + margin;
            this.velY = Math.abs(this.velY);
        }
        if (this.y > CONFIG.STREET_Y - margin - this.height / 2) {
            this.y = CONFIG.STREET_Y - margin - this.height / 2;
            this.velY = -Math.abs(this.velY);
        }
    }

    checkSuction() {
        const suctionRadius = CONFIG.DUST_DEVIL_SUCTION_RADIUS;

        // Check players
        if (typeof playerManager !== 'undefined') {
            for (const p of playerManager.getActivePlayers()) {
                if (p.state !== 'flying' || p.dustDevilCaptured) continue;
                // Skip if player has throw immunity
                if (p.dustDevilThrowImmunity > 0) continue;

                const dist = Math.sqrt((p.x - this.x) ** 2 + (p.y - this.y) ** 2);
                if (dist < suctionRadius) {
                    this.captureEntity(p, 'player');
                }
            }
        }

        // Check enemies (except dust devils)
        if (typeof enemyManager !== 'undefined') {
            for (const e of enemyManager.enemies) {
                if (!e.active || e.type === EnemyType.DUST_DEVIL || e.dustDevilCaptured) continue;
                if (e.state === EnemyState.DYING || e.state === EnemyState.DEAD) continue;
                // Skip if enemy has throw immunity
                if (e.dustDevilThrowImmunity > 0) continue;

                const dist = Math.sqrt((e.x - this.x) ** 2 + (e.y - this.y) ** 2);
                if (dist < suctionRadius) {
                    this.captureEntity(e, 'enemy');
                }
            }
        }
    }

    captureEntity(entity, type) {
        // Mark as captured
        entity.dustDevilCaptured = true;
        entity.dustDevilCapturedBy = this;

        // For enemies, freeze behavior
        if (type === 'enemy') {
            entity.bellSlowed = true;
        }

        // Add to captured list
        this.capturedEntities.push({
            entity: entity,
            type: type,
            timer: CONFIG.DUST_DEVIL_CAPTURE_DURATION,
            spinAngle: Math.random() * Math.PI * 2,
            collidedWith: new Set()
        });

        // Play suction sound
        if (typeof SoundManager !== 'undefined' && SoundManager.dustDevilSuction) {
            SoundManager.dustDevilSuction();
        }
    }

    updateCaptured(deltaTime) {
        // Process each captured entity
        for (let i = this.capturedEntities.length - 1; i >= 0; i--) {
            const captured = this.capturedEntities[i];
            const entity = captured.entity;

            // Check if entity died while captured
            if (captured.type === 'enemy' && (!entity.active || entity.state === EnemyState.DEAD)) {
                this.capturedEntities.splice(i, 1);
                continue;
            }

            // Update spin angle
            captured.spinAngle += deltaTime * 8;

            // Position entity at dust devil center (spinning)
            const orbitRadius = 15;
            entity.x = this.x + Math.cos(captured.spinAngle) * orbitRadius;
            entity.y = this.y + Math.sin(captured.spinAngle) * orbitRadius;

            // Check collision between captured entities
            for (let j = 0; j < this.capturedEntities.length; j++) {
                if (i === j) continue;
                const other = this.capturedEntities[j];

                // Only deal collision damage once per pair
                const pairKey = i < j ? `${i}-${j}` : `${j}-${i}`;
                if (captured.collidedWith.has(pairKey)) continue;

                // Different types colliding - deal damage
                if (captured.type !== other.type) {
                    captured.collidedWith.add(pairKey);
                    other.collidedWith.add(pairKey);

                    // Enemy takes damage when colliding with player
                    if (captured.type === 'enemy' && other.type === 'player') {
                        entity.die();
                    } else if (captured.type === 'player' && other.type === 'enemy') {
                        other.entity.die();
                    }
                }
            }

            // Countdown timer
            captured.timer -= deltaTime;
            if (captured.timer <= 0) {
                this.throwEntity(captured);
                this.capturedEntities.splice(i, 1);
            }
        }
    }

    throwEntity(captured) {
        const entity = captured.entity;

        // Random throw direction
        const angle = Math.random() * Math.PI * 2;
        const velocity = CONFIG.DUST_DEVIL_THROW_VELOCITY;

        entity.bounceVx = Math.cos(angle) * velocity;
        entity.bounceVy = Math.sin(angle) * velocity;

        // Mark as thrown and set immunity
        entity.dustDevilThrown = true;
        entity.dustDevilCaptured = false;
        entity.dustDevilCapturedBy = null;
        entity.dustDevilThrowImmunity = CONFIG.DUST_DEVIL_THROW_IMMUNITY;

        // Clear enemy frozen state
        if (captured.type === 'enemy') {
            entity.bellSlowed = false;
        }

        // Play throw sound
        if (typeof SoundManager !== 'undefined' && SoundManager.dustDevilThrow) {
            SoundManager.dustDevilThrow();
        }
    }

    startDespawn() {
        if (this.despawning) return;
        this.despawning = true;

        // Throw any remaining captured entities immediately
        for (const captured of this.capturedEntities) {
            this.throwEntity(captured);
        }
        this.capturedEntities = [];
    }

    render(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.globalAlpha = this.opacity;

        // Draw dust devil sprite
        const sprite = typeof AssetManager !== 'undefined' ? AssetManager.getImage('zone2_dust_devil') : null;

        ctx.translate(this.x, this.y);

        if (sprite && sprite.width > 0 && sprite.height > 0) {
            // Calculate frame count from sprite sheet dimensions
            // Frames can be arranged horizontally (columns) and/or vertically (rows)
            const framesPerRow = Math.max(1, Math.floor(sprite.width / this.frameWidth));
            const numRows = Math.max(1, Math.floor(sprite.height / this.frameHeight));
            this.frameCount = framesPerRow * numRows;

            // Calculate source rectangle for current frame
            const col = this.animFrame % framesPerRow;
            const row = Math.floor(this.animFrame / framesPerRow);
            const srcX = col * this.frameWidth;
            const srcY = row * this.frameHeight;

            // Apply subtle rotation for swirling effect
            ctx.rotate(Math.sin(this.rotation) * 0.1);

            // Draw the current frame from sprite sheet
            ctx.drawImage(
                sprite,
                srcX, srcY, this.frameWidth, this.frameHeight,  // Source rectangle
                -this.width / 2, -this.height / 2, this.width, this.height  // Destination
            );
        } else {
            // Fallback: draw a simple tornado shape
            ctx.fillStyle = `rgba(210, 180, 140, ${this.opacity})`;
            ctx.beginPath();
            // Wide top, narrow bottom
            ctx.moveTo(-25, -40);
            ctx.lineTo(25, -40);
            ctx.lineTo(10, 40);
            ctx.lineTo(-10, 40);
            ctx.closePath();
            ctx.fill();

            // Swirl lines
            ctx.strokeStyle = `rgba(180, 150, 100, ${this.opacity})`;
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                const yOffset = -30 + i * 25;
                const width = 20 - i * 5;
                ctx.beginPath();
                ctx.arc(0, yOffset, width, 0, Math.PI, false);
                ctx.stroke();
            }
        }

        ctx.restore();

        // Draw captured entities (scaled down and spinning)
        for (const captured of this.capturedEntities) {
            const entity = captured.entity;
            ctx.save();
            ctx.globalAlpha = this.opacity * 0.8;
            ctx.translate(entity.x, entity.y);
            ctx.rotate(captured.spinAngle * 2);
            ctx.scale(0.5, 0.5);

            if (captured.type === 'player') {
                // Draw actual player sprite
                const spriteKey = entity.id === 1 ? 'player_p1' : 'player_p2';
                const sprite = typeof AssetManager !== 'undefined' ? AssetManager.getImage(spriteKey) : null;

                if (sprite) {
                    const spriteWidth = 45;
                    const spriteHeight = 45;
                    ctx.drawImage(sprite, -spriteWidth / 2, -spriteHeight / 2, spriteWidth, spriteHeight);
                } else {
                    // Fallback to colored circle
                    ctx.fillStyle = entity.colors ? entity.colors.cockpit : '#00aaff';
                    ctx.beginPath();
                    ctx.arc(0, 0, 20, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else {
                // Draw enemy - try to use their animation sprite
                if (entity.animations && entity.animations.fly && entity.animations.fly.render) {
                    entity.animations.fly.render(ctx, 0, 0);
                } else {
                    // Fallback to colored rectangle based on enemy type
                    ctx.fillStyle = entity.type === EnemyType.AGGRESSIVE ? '#ff4444' : '#ff6600';
                    ctx.fillRect(-entity.width / 2, -entity.height / 2, entity.width, entity.height);
                }
            }

            ctx.restore();
        }
    }
}

class Enemy {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.state = EnemyState.FLYING;

        // Base size, overridden below
        this.width = 24;
        this.height = 24;
        this.health = 1;
        this.blocksToDestroy = 1;
        this.rotation = 0; // For banking/turning visual

        // Bomber-specific
        this.divingAtPlayer = false;
        this.diveTimer = 0;

        // Stats & Configuration
        this.configureStats(type);

        // Movement vars
        this.flightPhase = Math.random() * Math.PI * 2;
        this.swoopAmplitude = 20 + Math.random() * 30;
        this.swoopFrequency = 2 + Math.random() * 3;
        this.directionChangeTimer = 0;
        this.directionChangeInterval = 0.5 + Math.random() * 1.0;

        // Initial Velocity
        this.velX = (Math.random() - 0.5) * 2;
        this.velY = (Math.random() - 0.5) * 0.5;
        this.normalizeVelocity();

        // Attack vars
        this.targetBlock = null;
        this.attackTimer = 0;
        this.attackDuration = this.attackTimeMin + Math.random() * (this.attackTimeMax - this.attackTimeMin);

        // Collision damage cooldown (3 seconds between collision damage)
        this.collisionDamageCooldown = 0;

        // Falling physics
        this.fallSpeed = 0;
        this.fallGravity = 500;
        this.fallRotationSpeed = (Math.random() - 0.5) * 10;

        // Animation system (for drones with sprite sheets)
        this.animations = null;
        this.currentAnimName = 'fly';
        this.facingRight = true;  // For horizontal flip based on movement

        // Attack collision data (for AOE damage at end of attack animation)
        this.attackCollision = null;  // { building, row, col }

        // Aggressive drone ranged attack system
        this.rangedAttackCooldown = 5 + Math.random() * 5; // Start with 5-10 second delay
        this.projectilesToFire = 0;      // Counter for sequential projectiles
        this.projectileFireTimer = 0;    // Timer between sequential fires
        this.attackVelX = 0;             // Stored velocity direction for projectiles
        this.attackVelY = 0;

        // Carrier-specific properties
        this.carrierMovingRight = false;  // Direction carrier is flying
        this.carrierAttackCooldown = CONFIG.CARRIER_ATTACK_COOLDOWN_MIN +
            Math.random() * (CONFIG.CARRIER_ATTACK_COOLDOWN_MAX - CONFIG.CARRIER_ATTACK_COOLDOWN_MIN);
        this.carrierAttackFrameTriggered = false;  // Track if drones spawned this attack
        this.isCarrierSpawned = false;    // Flag for drones spawned by carriers (don't count for wave)

        // Dust Devil capture state
        this.dustDevilCaptured = false;
        this.dustDevilCapturedBy = null;
        this.dustDevilThrown = false;
        this.dustDevilThrowImmunity = 0;  // Immunity timer after being thrown
        this.bounceVx = 0;
        this.bounceVy = 0;

        this.active = true;
    }

    configureStats(type) {
        // Get zone-specific stats (default to zone 1 if not available)
        const currentZone = (typeof game !== 'undefined' && game.currentZone) ? game.currentZone : 1;
        const zoneStats = CONFIG.ZONE_ENEMY_STATS[currentZone] || CONFIG.ZONE_ENEMY_STATS[1];

        switch (type) {
            case EnemyType.STANDARD: // Scout Drone
                const stdStats = zoneStats.STANDARD || { speed: 60, health: 1 };
                this.speed = stdStats.speed;
                this.health = stdStats.health;
                this.maxHealth = stdStats.health;
                this.width = 30; this.height = 20; // +25% from 24x16
                this.attackTimeMin = 1.0; this.attackTimeMax = 3.0;
                break;

            case EnemyType.AGGRESSIVE: // Hunter Chopper (Red)
                const aggStats = zoneStats.AGGRESSIVE || { speed: 100, health: 1, shotCount: 3 };
                this.speed = aggStats.speed;
                this.health = aggStats.health;
                this.maxHealth = aggStats.health;
                this.shotCount = aggStats.shotCount || 3;
                this.erraticMovement = aggStats.erratic || false;
                this.width = 35; this.height = 25; // +25% from 28x20
                this.attackTimeMin = 0.5; this.attackTimeMax = 1.5;
                break;

            case EnemyType.TANK: // Heavy Gunship (96x96 sprite)
                this.speed = CONFIG.GUNSHIP_SPEED;
                this.health = CONFIG.GUNSHIP_HEALTH;
                this.width = 96; this.height = 96;
                this.blocksToDestroy = CONFIG.GUNSHIP_BOMB_DAMAGE;
                this.attackTimeMin = CONFIG.GUNSHIP_ATTACK_COOLDOWN_MIN;
                this.attackTimeMax = CONFIG.GUNSHIP_ATTACK_COOLDOWN_MAX;
                // Gunship-specific properties
                this.gunshipPatrolRight = Math.random() < 0.5;  // Direction of patrol
                this.gunshipAttackCooldown = CONFIG.GUNSHIP_ATTACK_COOLDOWN_MIN +
                    Math.random() * (CONFIG.GUNSHIP_ATTACK_COOLDOWN_MAX - CONFIG.GUNSHIP_ATTACK_COOLDOWN_MIN);
                this.gunshipAttackFrameTriggered = false;  // Track if missiles fired this attack
                this.gunshipPostAttackTimer = 0;  // Timer for post-attack fly time before next attack
                this.currentAnimName = 'fly';
                this.facingRight = this.gunshipPatrolRight;
                break;

            case EnemyType.SPLITTER: // Carrier (96x96 sprite)
                this.speed = CONFIG.CARRIER_SPEED;
                this.health = 3;  // Takes 3 hits to kill
                this.width = 96; this.height = 96;
                this.attackTimeMin = CONFIG.CARRIER_ATTACK_COOLDOWN_MIN;
                this.attackTimeMax = CONFIG.CARRIER_ATTACK_COOLDOWN_MAX;
                break;

            case EnemyType.BOMBER: // Missile (Orange)
                this.speed = 120;
                this.width = 31; this.height = 16; // +56% total from original 20x10
                this.attackTimeMin = 999; this.attackTimeMax = 999;
                this.diveTimer = 2 + Math.random() * 4;
                break;

            case EnemyType.DUST_DEVIL:
                this.speed = 80;
                this.health = 2;  // Increased from 1
                this.maxHealth = 2;
                this.width = 24;
                this.height = 24;
                this.spiralAngle = 0;
                this.spiralRadius = 30;
                this.targetBuilding = null;
                break;

            case EnemyType.SANDWORM:
                this.speed = 60;
                this.health = 4;  // Increased from 2
                this.maxHealth = 4;
                this.width = 30;
                this.height = 20;
                // New flying/burrowing behavior
                this.sandwormMode = 'flying'; // 'flying', 'burrowing', 'surfacing', 'leaving'
                this.flyTimer = CONFIG.SANDWORM_FLY_DURATION || 2.5;  // Reduced from 5
                this.attackCount = 0;
                this.maxAttacks = CONFIG.SANDWORM_MAX_ATTACKS || 4;
                this.targetBuilding = null;
                this.isSurfacing = false;
                this.surfaceTimer = 0;
                this.hasAttacked = false;
                this.flyDirection = Math.random() < 0.5 ? 1 : -1;
                // Start in the sky
                this.y = CONFIG.SKY_TOP + 100 + Math.random() * 100;
                break;

            case EnemyType.SAND_CARRIER:
                this.speed = CONFIG.SAND_CARRIER_SPEED || 25;
                this.health = CONFIG.SAND_CARRIER_HP || 7;
                this.maxHealth = this.health;
                this.width = 96;
                this.height = 96;
                // Sand Barge behavior
                this.targetBuilding = null;
                this.blocksDestroyedAtTarget = 0;
                this.attackCooldown = CONFIG.SAND_CARRIER_ARRIVAL_DELAY || 1.0;
                this.isAttacking = false;
                this.attackAnimFrame = 0;
                this.attackAnimTimer = 0;
                this.podsSpawnedThisAttack = false;
                this.hoveringAboveTarget = false;
                this.carrierMovingRight = true;  // For sprite facing
                break;

            case EnemyType.SCORPION:
                // Stats from plan
                this.health = 6;
                this.maxHealth = 6;
                this.width = 64;  // Landscape orientation sprite
                this.height = 43;

                // State machine
                this.scorpionState = 'SPAWNING'; // SPAWNING, CRAWLING_TO_BUILDING, CLIMBING, ROOFTOP_CRAWL, CLAW_ATTACK, RANGED_ATTACK

                // Spawn configuration
                this.spawnSide = Math.random() < 0.5 ? 'left' : 'right';
                this.x = this.spawnSide === 'left' ? -this.width : CONFIG.CANVAS_WIDTH + this.width;
                this.y = CONFIG.STREET_Y - this.height / 2;

                // Building targeting
                this.targetBuilding = null;
                this.climbSide = null; // 'left' or 'right' - side of building to climb

                // Climbing state
                this.climbAnimPhase = 'intro'; // 'intro' or 'loop'
                this.climbFrame = 0;
                this.climbY = 0; // Y position on building during climb
                this.climbDamageTimer = 2; // Deal 1 block damage every 2 seconds while climbing

                // Rooftop behavior
                this.rooftopDirection = 1; // 1 or -1 for pacing direction
                this.rooftopX = 0; // X position relative to building

                // Attack timers
                this.attackTimer = 4; // Countdown to next ranged attack
                this.projectilesFired = 0; // Counter for sequential fire
                this.projectileDelay = 0; // Timer between shots
                this.targetCivilian = null; // Civilian being chased

                // Animation
                this.currentAnimName = 'crawl';
                this.animations = null;
                this.facingRight = this.spawnSide === 'left'; // Face direction of movement

                // Speed variation (0.85 to 1.15)
                this.speedModifier = 0.85 + Math.random() * 0.3;

                // Sound timers
                this.scuttleSoundTimer = 0.5 + Math.random() * 0.3;

                // Fall properties (used when building destroyed beneath)
                this.fallSpeed = 0;
                this.fallGravity = 800;
                this.rotation = 0;
                break;

            case EnemyType.VULTURE_KING:
                this.speed = 120;
                this.health = 15;
                this.maxHealth = 15;
                this.width = 80;   // Larger for 192px sprite
                this.height = 80;
                this.isBoss = true;

                // Phase management: circling, playerSwoop, flyAround, windUp, buildingDive, recovering
                this.bossPhase = 'circling';

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

                // Wind-up properties (visual warning before dive)
                this.windUpTimer = 0;
                this.windUpDuration = 0.5; // 0.5 second warning

                // Building dive properties
                this.targetBuilding = null;

                // Debris properties (for visible falling debris)
                this.hasDebris = false;
                this.debrisReleased = false; // True when debris is falling (no longer carried)
                this.debrisX = 0;
                this.debrisY = 0;
                this.debrisFallSpeed = 100; // Slower fall (was 200)
                this.debrisTargetBuilding = null;
                // Pre-calculate debris shape for consistency
                this.debrisShape = [];
                for (let i = 0; i < 5; i++) {
                    this.debrisShape.push({
                        x: (Math.random() - 0.5) * 30,
                        y: (Math.random() - 0.5) * 20,
                        r: 8 + Math.random() * 8,
                        color: Math.random() > 0.5 ? '#8B7355' : '#6B5344'
                    });
                }

                // Recovery properties
                this.recoveryTimer = 0;

                // Animation state
                this.currentAnimName = 'fly';
                this.animations = null;
                this.facingRight = true;
                this.deathAnimStartTime = null;
                this.attackAnimStartTime = null;

                // Wing flap sound timer
                this.wingFlapTimer = 0;
                break;

            case EnemyType.SANDSTORM_COLOSSUS:
                this.speed = 25;
                this.health = 16;
                this.maxHealth = 16;
                this.width = 128;
                this.height = 96;
                this.isBoss = true;
                this.movingRight = Math.random() < 0.5;
                this.droneSpawnTimer = 0;
                this.droneSpawnInterval = 3.5;
                this.sandstormAlpha = 0;
                break;

            case EnemyType.SIEGE_CRAWLER:
                this.speed = 15;
                this.health = 15; // Core HP (only damageable when shield down)
                this.maxHealth = 15;
                this.width = 160;
                this.height = 120;
                this.isBoss = true;
                this.y = CONFIG.STREET_Y - 60;

                // Destructible weapon systems
                this.weapons = {
                    missilePods: { hp: 4, maxHp: 4, active: true },
                    droneBay: { hp: 8, maxHp: 8, active: true },
                    mortarCannon: { hp: 10, maxHp: 10, active: true },
                    shieldGenerator: { hp: 6, maxHp: 6, active: true }
                };
                this.coreExposed = false;
                this.targetBuilding = null;
                this.attackTimers = { missile: 2, drone: 4, mortar: 5 };
                break;
        }
    }

    normalizeVelocity() {
        const mag = Math.sqrt(this.velX * this.velX + this.velY * this.velY);
        if (mag > 0) {
            this.velX /= mag;
            this.velY /= mag;
        }
    }

    /**
     * Initialize animated sprites for STANDARD drones
     */
    initDroneAnimations() {
        if (this.animations) return; // Already initialized
        if (this.type !== EnemyType.STANDARD) return; // Only for standard drones
        if (typeof AnimatedSprite === 'undefined' || typeof AssetManager === 'undefined') return;

        this.animations = {};
        const frameSize = 64;
        const scale = 1.0;  // 64px frames displayed at native size

        // Helper to create animation from sheet with valid frame detection
        const createAnim = (assetKey, fps, mode) => {
            const sheet = AssetManager.getImage(assetKey);
            if (!sheet || sheet.width <= 0 || sheet.height <= 0) return null;

            // Use countValidFrames to detect empty frames in the sprite sheet
            let frameInfo;
            if (typeof countValidFrames === 'function') {
                frameInfo = countValidFrames(sheet, frameSize, frameSize);
            } else {
                // Fallback if function not available
                const framesPerRow = Math.floor(sheet.width / frameSize);
                const rowCount = Math.floor(sheet.height / frameSize);
                frameInfo = {
                    frameCount: framesPerRow * rowCount,
                    framesPerRow: framesPerRow,
                    validFrameIndices: null
                };
            }

            if (frameInfo.frameCount <= 0) return null;

            console.log(`Drone ${assetKey}:`, {
                sheetSize: `${sheet.width}x${sheet.height}`,
                validFrames: frameInfo.frameCount,
                framesPerRow: frameInfo.framesPerRow
            });

            return new AnimatedSprite({
                sheet: sheet,
                frameWidth: frameSize,
                frameHeight: frameSize,
                frameCount: frameInfo.frameCount,
                framesPerRow: frameInfo.framesPerRow,
                validFrameIndices: frameInfo.validFrameIndices,
                fps: fps,
                mode: mode,
                scale: scale
            });
        };

        // Create animations
        this.animations.fly = createAnim('drone_fly', 8, 'loop');
        this.animations.attack = createAnim('drone_attack', 10, 'once');
        this.animations.death = createAnim('drone_death', 10, 'once');

        console.log('Drone animations initialized:', {
            fly: this.animations.fly ? 'loaded' : 'failed',
            attack: this.animations.attack ? 'loaded' : 'failed',
            death: this.animations.death ? 'loaded' : 'failed'
        });
    }

    /**
     * Initialize animated sprites for AGGRESSIVE drones
     */
    initAggressiveAnimations() {
        if (this.animations) return; // Already initialized
        if (this.type !== EnemyType.AGGRESSIVE) return; // Only for aggressive drones
        if (typeof AnimatedSprite === 'undefined' || typeof AssetManager === 'undefined') return;

        this.animations = {};
        const frameSize = 64;
        const scale = 1.0;

        // Helper to create animation from sheet with valid frame detection
        const createAnim = (assetKey, fps, mode) => {
            const sheet = AssetManager.getImage(assetKey);
            if (!sheet || sheet.width <= 0 || sheet.height <= 0) return null;

            // Use countValidFrames to detect empty frames in the sprite sheet
            let frameInfo;
            if (typeof countValidFrames === 'function') {
                frameInfo = countValidFrames(sheet, frameSize, frameSize);
            } else {
                const framesPerRow = Math.floor(sheet.width / frameSize);
                const rowCount = Math.floor(sheet.height / frameSize);
                frameInfo = {
                    frameCount: framesPerRow * rowCount,
                    framesPerRow: framesPerRow,
                    validFrameIndices: null
                };
            }

            if (frameInfo.frameCount <= 0) return null;

            console.log(`Aggressive drone ${assetKey}:`, {
                sheetSize: `${sheet.width}x${sheet.height}`,
                validFrames: frameInfo.frameCount,
                framesPerRow: frameInfo.framesPerRow
            });

            return new AnimatedSprite({
                sheet: sheet,
                frameWidth: frameSize,
                frameHeight: frameSize,
                frameCount: frameInfo.frameCount,
                framesPerRow: frameInfo.framesPerRow,
                validFrameIndices: frameInfo.validFrameIndices,
                fps: fps,
                mode: mode,
                scale: scale
            });
        };

        // Create animations
        this.animations.fly = createAnim('drone_aggressive_fly', 8, 'loop');
        this.animations.attack = createAnim('drone_aggressive_attack', 10, 'once');
        this.animations.death = createAnim('drone_aggressive_death', 10, 'once');

        console.log('Aggressive drone animations initialized:', {
            fly: this.animations.fly ? 'loaded' : 'failed',
            attack: this.animations.attack ? 'loaded' : 'failed',
            death: this.animations.death ? 'loaded' : 'failed'
        });
    }

    /**
     * Initialize animated sprites for CARRIER (SPLITTER type)
     */
    initCarrierAnimations() {
        if (this.animations) return; // Already initialized
        if (this.type !== EnemyType.SPLITTER) return; // Only for carriers
        if (typeof AnimatedSprite === 'undefined' || typeof AssetManager === 'undefined') return;

        this.animations = {};
        const frameSize = 96;  // 96x96 frames for carrier
        const scale = 1.0;

        // Helper to create animation from sheet with valid frame detection
        const createAnim = (assetKey, fps, mode) => {
            const sheet = AssetManager.getImage(assetKey);
            if (!sheet || sheet.width <= 0 || sheet.height <= 0) return null;

            // Use countValidFrames to detect empty frames in the sprite sheet
            let frameInfo;
            if (typeof countValidFrames === 'function') {
                frameInfo = countValidFrames(sheet, frameSize, frameSize);
            } else {
                const framesPerRow = Math.floor(sheet.width / frameSize);
                const rowCount = Math.floor(sheet.height / frameSize);
                frameInfo = {
                    frameCount: framesPerRow * rowCount,
                    framesPerRow: framesPerRow,
                    validFrameIndices: null
                };
            }

            if (frameInfo.frameCount <= 0) return null;

            console.log(`Carrier ${assetKey}:`, {
                sheetSize: `${sheet.width}x${sheet.height}`,
                validFrames: frameInfo.frameCount,
                framesPerRow: frameInfo.framesPerRow
            });

            return new AnimatedSprite({
                sheet: sheet,
                frameWidth: frameSize,
                frameHeight: frameSize,
                frameCount: frameInfo.frameCount,
                framesPerRow: frameInfo.framesPerRow,
                validFrameIndices: frameInfo.validFrameIndices,
                fps: fps,
                mode: mode,
                scale: scale
            });
        };

        // Create animations
        this.animations.fly = createAnim('carrier_fly', 8, 'loop');
        this.animations.attack = createAnim('carrier_attack', 10, 'once');
        this.animations.death = createAnim('carrier_death', 10, 'once');

        console.log('Carrier animations initialized:', {
            fly: this.animations.fly ? 'loaded' : 'failed',
            attack: this.animations.attack ? 'loaded' : 'failed',
            death: this.animations.death ? 'loaded' : 'failed'
        });
    }

    /**
     * Initialize animated sprites for GUNSHIP (TANK type)
     */
    initGunshipAnimations() {
        if (this.animations) return; // Already initialized
        if (this.type !== EnemyType.TANK) return; // Only for gunships
        if (typeof AnimatedSprite === 'undefined' || typeof AssetManager === 'undefined') return;

        this.animations = {};
        const frameSize = 96;  // 96x96 frames for gunship
        const scale = 1.0;

        // Helper to create animation from sheet with valid frame detection
        const createAnim = (assetKey, fps, mode) => {
            const sheet = AssetManager.getImage(assetKey);
            if (!sheet || sheet.width <= 0 || sheet.height <= 0) return null;

            // Use countValidFrames to detect empty frames in the sprite sheet
            let frameInfo;
            if (typeof countValidFrames === 'function') {
                frameInfo = countValidFrames(sheet, frameSize, frameSize);
            } else {
                const framesPerRow = Math.floor(sheet.width / frameSize);
                const rowCount = Math.floor(sheet.height / frameSize);
                frameInfo = {
                    frameCount: framesPerRow * rowCount,
                    framesPerRow: framesPerRow,
                    validFrameIndices: null
                };
            }

            if (frameInfo.frameCount <= 0) return null;

            console.log(`Gunship ${assetKey}:`, {
                sheetSize: `${sheet.width}x${sheet.height}`,
                validFrames: frameInfo.frameCount,
                framesPerRow: frameInfo.framesPerRow
            });

            return new AnimatedSprite({
                sheet: sheet,
                frameWidth: frameSize,
                frameHeight: frameSize,
                frameCount: frameInfo.frameCount,
                framesPerRow: frameInfo.framesPerRow,
                validFrameIndices: frameInfo.validFrameIndices,
                fps: fps,
                mode: mode,
                scale: scale
            });
        };

        // Create animations
        this.animations.fly = createAnim('gunship_fly', 10, 'loop');
        this.animations.attack = createAnim('gunship_attack', 12, 'once');
        this.animations.death = createAnim('gunship_death', 12, 'once');

        console.log('Gunship animations initialized:', {
            fly: this.animations.fly ? 'loaded' : 'failed',
            attack: this.animations.attack ? 'loaded' : 'failed',
            death: this.animations.death ? 'loaded' : 'failed'
        });
    }

    /**
     * Initialize animated sprites for SCORPION
     * Frame size: 64w x 43h (landscape orientation)
     * Climb animation has special handling: frames 1-12 intro, frames 13-18 loop
     */
    initScorpionAnimations() {
        if (this.animations) return; // Already initialized
        if (this.type !== EnemyType.SCORPION) return;
        if (typeof AnimatedSprite === 'undefined' || typeof AssetManager === 'undefined') return;

        this.animations = {};
        const frameWidth = 64;
        const frameHeight = 43;
        const scale = 1.0;

        // Helper to create animation from sheet
        const createAnim = (assetKey, fps, mode, frameCountOverride = null) => {
            const sheet = AssetManager.getImage(assetKey);
            if (!sheet || sheet.width <= 0 || sheet.height <= 0) return null;

            const framesPerRow = Math.floor(sheet.width / frameWidth);
            const rowCount = Math.floor(sheet.height / frameHeight);
            const totalFrames = frameCountOverride !== null ? frameCountOverride : (framesPerRow * rowCount);

            if (totalFrames <= 0) return null;

            console.log(`Scorpion ${assetKey}:`, {
                sheetSize: `${sheet.width}x${sheet.height}`,
                frameSize: `${frameWidth}x${frameHeight}`,
                framesPerRow: framesPerRow,
                totalFrames: totalFrames
            });

            return new AnimatedSprite({
                sheet: sheet,
                frameWidth: frameWidth,
                frameHeight: frameHeight,
                frameCount: totalFrames,
                framesPerRow: framesPerRow,
                fps: fps,
                mode: mode,
                scale: scale
            });
        };

        // Create animations
        this.animations.crawl = createAnim('z2_scorpion_crawl', 10, 'loop');
        this.animations.claw = createAnim('z2_scorpion_claw', 12, 'once');
        this.animations.attack = createAnim('z2_scorpion_attack', 10, 'once');
        this.animations.death = createAnim('z2_scorpion_death', 10, 'once');

        // Climb animation needs special handling for intro (frames 1-12) and loop (frames 13-18)
        // We'll create two separate animations for this
        const climbSheet = AssetManager.getImage('z2_scorpion_climb');
        if (climbSheet && climbSheet.width > 0) {
            const framesPerRow = Math.floor(climbSheet.width / frameWidth);
            // Intro: first 12 frames (indices 0-11)
            this.animations.climb_intro = new AnimatedSprite({
                sheet: climbSheet,
                frameWidth: frameWidth,
                frameHeight: frameHeight,
                frameCount: 12,
                framesPerRow: framesPerRow,
                validFrameIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
                fps: 10,
                mode: 'once',
                scale: scale
            });
            // Loop: frames 13-18 (indices 12-17, 6 frames)
            // Use validFrameIndices to specify which frames to use
            this.animations.climb_loop = new AnimatedSprite({
                sheet: climbSheet,
                frameWidth: frameWidth,
                frameHeight: frameHeight,
                frameCount: 6,
                framesPerRow: framesPerRow,
                validFrameIndices: [12, 13, 14, 15, 16, 17],
                fps: 10,
                mode: 'loop',
                scale: scale
            });
        }

        console.log('Scorpion animations initialized:', {
            crawl: this.animations.crawl ? 'loaded' : 'failed',
            claw: this.animations.claw ? 'loaded' : 'failed',
            attack: this.animations.attack ? 'loaded' : 'failed',
            death: this.animations.death ? 'loaded' : 'failed',
            climb_intro: this.animations.climb_intro ? 'loaded' : 'failed',
            climb_loop: this.animations.climb_loop ? 'loaded' : 'failed'
        });
    }

    update(deltaTime) {
        if (this.state === EnemyState.DEAD) return;

        // If captured by dust devil, position is controlled by the dust devil
        if (this.dustDevilCaptured) {
            return;
        }

        // Count down dust devil throw immunity
        if (this.dustDevilThrowImmunity > 0) {
            this.dustDevilThrowImmunity -= deltaTime;
        }

        // Handle throw physics from dust devil
        if (this.bounceVx !== 0 || this.bounceVy !== 0) {
            this.x += this.bounceVx * deltaTime;
            this.y += this.bounceVy * deltaTime;
            this.bounceVx *= 0.95;
            this.bounceVy *= 0.95;

            // Check if thrown off-screen (left, right, or top) - dies with no points
            if (this.dustDevilThrown) {
                if (this.x < 0 || this.x > CONFIG.CANVAS_WIDTH || this.y < 0) {
                    this.active = false;
                    this.state = EnemyState.DEAD;
                    console.log('Enemy thrown off-screen by dust devil - no points');
                    return;
                }
            }

            const velocity = Math.sqrt(this.bounceVx ** 2 + this.bounceVy ** 2);
            if (velocity < 50) {
                this.bounceVx = 0;
                this.bounceVy = 0;
                this.dustDevilThrown = false;
            }

            // Skip normal movement while being thrown
            if (this.dustDevilThrown) return;
        }

        // Update animations for STANDARD, AGGRESSIVE, SPLITTER (carrier), TANK (gunship), and SCORPION types
        if ((this.type === EnemyType.STANDARD || this.type === EnemyType.AGGRESSIVE || this.type === EnemyType.SPLITTER || this.type === EnemyType.TANK || this.type === EnemyType.SCORPION) && this.animations) {
            const currentAnim = this.animations[this.currentAnimName];
            if (currentAnim) {
                currentAnim.update(deltaTime);
            }
        }

        if (this.state === EnemyState.FLYING) {
            this.updateFlying(deltaTime);
        } else if (this.state === EnemyState.ATTACKING) {
            this.updateAttacking(deltaTime);
        } else if (this.state === EnemyState.FALLING) {
            this.updateFalling(deltaTime);
        } else if (this.state === EnemyState.DYING) {
            this.updateDying(deltaTime);
        }

        // Banking visual based on X velocity (skip for dying drones)
        if (this.state !== EnemyState.DYING) {
            const targetRot = this.velX * 0.5;
            this.rotation += (targetRot - this.rotation) * deltaTime * 5;
        }
    }

    updateFlying(deltaTime) {
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
                const targetX = this.targetBuilding.x + (this.targetBuilding.widthBlocks * CONFIG.BLOCK_SIZE) / 2;
                const targetY = this.targetBuilding.y;

                // Move toward target with spiral
                const dx = targetX - this.x;
                const dy = targetY - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                this.spiralAngle += deltaTime * 5;
                const spiralX = Math.cos(this.spiralAngle) * this.spiralRadius;
                const spiralY = Math.sin(this.spiralAngle) * this.spiralRadius;

                const speedMod = this.bellSlowed ? 0.3 : 1.0;

                if (dist > 20) {
                    this.x += ((dx / dist) * this.speed * speedMod + spiralX) * deltaTime;
                    this.y += ((dy / dist) * this.speed * speedMod + spiralY) * deltaTime;
                } else {
                    // Hit building - destroy a block
                    const col = Math.floor(this.targetBuilding.widthBlocks / 2);
                    this.targetBuilding.destroyBlock(0, col);
                    if (typeof EffectsManager !== 'undefined') {
                        EffectsManager.addExplosion(this.x, this.y, 20, '#cc9944');
                    }
                    this.die(true); // Die without score (kamikaze)
                }
            }
            return;
        }

        // Sandworm: New behavior - fly around, burrow, attack, emerge, repeat (max 4 attacks)
        if (this.type === EnemyType.SANDWORM) {
            if (typeof buildingManager === 'undefined') return;
            const speedMod = this.bellSlowed ? 0.3 : 1.0;

            switch (this.sandwormMode) {
                case 'flying':
                    // Fly around the map
                    this.x += this.flyDirection * this.speed * 1.5 * speedMod * deltaTime;

                    // Slight vertical bobbing
                    this.y += Math.sin(Date.now() / 500) * 0.5;

                    // Bounce off screen edges
                    if (this.x < 50) {
                        this.x = 50;
                        this.flyDirection = 1;
                    } else if (this.x > CONFIG.CANVAS_WIDTH - 50) {
                        this.x = CONFIG.CANVAS_WIDTH - 50;
                        this.flyDirection = -1;
                    }

                    // Count down fly timer
                    this.flyTimer -= deltaTime;
                    if (this.flyTimer <= 0) {
                        // Pick a random building to attack
                        const buildings = buildingManager.buildings.filter(b => b.getBlockCount() > 0);
                        if (buildings.length > 0 && this.attackCount < this.maxAttacks) {
                            this.targetBuilding = buildings[Math.floor(Math.random() * buildings.length)];
                            this.sandwormMode = 'burrowing';
                            // Dive down toward ground
                        } else {
                            // No buildings or max attacks reached - leave
                            this.sandwormMode = 'leaving';
                        }
                    }
                    break;

                case 'burrowing':
                    // Dive down to ground level
                    this.y += 200 * speedMod * deltaTime;

                    if (this.y >= CONFIG.STREET_Y - 10) {
                        this.y = CONFIG.STREET_Y - 10;
                        // Now travel underground toward target
                        this.sandwormMode = 'underground';
                    }
                    break;

                case 'underground':
                    // Travel underground toward target building (dust trail rendered)
                    if (this.targetBuilding) {
                        const targetX = this.targetBuilding.x + (this.targetBuilding.widthBlocks * CONFIG.BLOCK_SIZE) / 2;
                        const dx = targetX - this.x;

                        if (Math.abs(dx) > 10) {
                            this.x += Math.sign(dx) * this.speed * speedMod * deltaTime;
                        } else {
                            // Arrived - surface and attack
                            this.sandwormMode = 'surfacing';
                            this.surfaceTimer = 1.5;
                            this.hasAttacked = false;
                        }
                    }
                    break;

                case 'surfacing':
                    // Surface and attack the building
                    this.surfaceTimer -= deltaTime;

                    if (this.surfaceTimer <= 1.0 && !this.hasAttacked) {
                        this.hasAttacked = true;
                        this.attackCount++;

                        // Destroy foundation blocks
                        const blocksToDestroy = 1 + Math.floor(Math.random() * 2);
                        for (let i = 0; i < blocksToDestroy; i++) {
                            const col = Math.floor(this.targetBuilding.widthBlocks / 2) + i - 1;
                            const row = this.targetBuilding.heightBlocks - 1;
                            if (col >= 0 && col < this.targetBuilding.widthBlocks) {
                                this.targetBuilding.destroyBlock(row, col);
                            }
                        }
                        if (typeof EffectsManager !== 'undefined') {
                            EffectsManager.addExplosion(this.x, CONFIG.STREET_Y - 20, 25, '#cc9944');
                        }
                    }

                    if (this.surfaceTimer <= 0) {
                        // Check if we should attack more or leave
                        if (this.attackCount >= this.maxAttacks) {
                            this.sandwormMode = 'leaving';
                        } else {
                            // Go back to flying
                            this.sandwormMode = 'emerging';
                        }
                    }
                    break;

                case 'emerging':
                    // Fly back up into the sky
                    this.y -= 150 * speedMod * deltaTime;

                    if (this.y <= CONFIG.SKY_TOP + 100) {
                        this.y = CONFIG.SKY_TOP + 100;
                        this.sandwormMode = 'flying';
                        this.flyTimer = CONFIG.SANDWORM_FLY_DURATION || 2.5;  // Reduced from 5
                        this.targetBuilding = null;
                    }
                    break;

                case 'leaving':
                    // Fly off screen
                    this.x += this.flyDirection * this.speed * 2 * speedMod * deltaTime;
                    this.y -= 50 * deltaTime; // Rise as it leaves

                    if (this.x < -50 || this.x > CONFIG.CANVAS_WIDTH + 50) {
                        this.active = false;
                        this.state = EnemyState.DEAD;
                    }
                    break;
            }
            return;
        }

        // Sand Carrier: Flies across, drops burrowing pods
        if (this.type === EnemyType.SAND_CARRIER) {
            const speedMod = this.bellSlowed ? 0.3 : 1.0;

            // Find target building if none
            if (!this.targetBuilding || !this.targetBuilding.getBlockCount || this.targetBuilding.getBlockCount() === 0) {
                this.targetBuilding = this.findBestTargetBuilding();
                this.blocksDestroyedAtTarget = 0;
                this.hoveringAboveTarget = false;
                this.isAttacking = false;
                this.attackAnimFrame = 0;
                this.attackCooldown = CONFIG.SAND_CARRIER_ARRIVAL_DELAY || 1.0;
            }

            // Check if should move to next target (destroyed enough blocks)
            if (this.blocksDestroyedAtTarget >= (CONFIG.SAND_CARRIER_BLOCKS_TO_MOVE || 15)) {
                this.targetBuilding = this.findClosestBuilding();
                this.blocksDestroyedAtTarget = 0;
                this.hoveringAboveTarget = false;
                this.isAttacking = false;
                this.attackAnimFrame = 0;
                this.attackCooldown = CONFIG.SAND_CARRIER_ARRIVAL_DELAY || 1.0;
            }

            if (this.targetBuilding) {
                // Calculate target position (centered above building)
                const buildingCenterX = this.targetBuilding.x + (this.targetBuilding.widthBlocks * CONFIG.BLOCK_SIZE) / 2;
                const hoverHeight = CONFIG.SAND_CARRIER_HOVER_HEIGHT || 80;
                let targetY = this.targetBuilding.y - hoverHeight;

                // Check for other sand carriers at this building
                if (typeof enemyManager !== 'undefined') {
                    for (const other of enemyManager.enemies) {
                        if (other !== this && other.type === EnemyType.SAND_CARRIER && other.active) {
                            if (other.targetBuilding === this.targetBuilding) {
                                // Another carrier at same building - go higher
                                targetY -= (CONFIG.SAND_CARRIER_ELEVATION_OFFSET || 60);
                                break;
                            }
                        }
                    }
                }

                // Move toward target position
                const dx = buildingCenterX - this.x;
                const dy = targetY - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 10) {
                    // Still moving to target
                    this.hoveringAboveTarget = false;
                    this.x += (dx / dist) * this.speed * speedMod * deltaTime;
                    this.y += (dy / dist) * this.speed * speedMod * deltaTime;
                    // Update facing direction
                    this.carrierMovingRight = dx > 0;
                } else {
                    // Hovering above target
                    this.hoveringAboveTarget = true;
                    this.x = buildingCenterX;
                    this.y = targetY;
                }

                // Attack logic (only when hovering)
                if (this.hoveringAboveTarget) {
                    if (this.isAttacking) {
                        // Update attack animation
                        this.attackAnimTimer += deltaTime;
                        const frameTime = 0.125;  // 8 FPS
                        if (this.attackAnimTimer >= frameTime) {
                            this.attackAnimTimer -= frameTime;
                            this.attackAnimFrame++;

                            // Spawn pods at frame 8
                            if (this.attackAnimFrame === (CONFIG.SAND_CARRIER_POD_SPAWN_FRAME || 8) && !this.podsSpawnedThisAttack) {
                                this.podsSpawnedThisAttack = true;
                                const spread = CONFIG.SAND_CARRIER_POD_SPREAD || 20;
                                // Spawn pair of pods
                                const podLeft = new FallingPod(this.x - spread, this.y + 30);
                                podLeft.ownerCarrier = this;
                                const podRight = new FallingPod(this.x + spread, this.y + 30);
                                podRight.ownerCarrier = this;
                                fallingPods.push(podLeft);
                                fallingPods.push(podRight);
                            }

                            // Check if attack animation complete (assume ~16 frames)
                            if (this.attackAnimFrame >= 16) {
                                this.isAttacking = false;
                                this.attackAnimFrame = 0;
                                this.attackCooldown = CONFIG.SAND_CARRIER_ATTACK_INTERVAL || 3.5;
                            }
                        }
                    } else {
                        // Cooldown between attacks
                        this.attackCooldown -= deltaTime;
                        if (this.attackCooldown <= 0) {
                            this.isAttacking = true;
                            this.attackAnimFrame = 0;
                            this.attackAnimTimer = 0;
                            this.podsSpawnedThisAttack = false;
                        }
                    }
                }
            }
            return;
        }

        // Scorpion: State machine with ground movement, climbing, rooftop behavior
        if (this.type === EnemyType.SCORPION) {
            this.updateScorpion(deltaTime);
            return;
        }

        // Vulture King Mini-Boss - New 6-phase behavior
        if (this.type === EnemyType.VULTURE_KING) {
            const speedMod = this.bellSlowed ? 0.3 : 1.0;

            // Get player position for swoop targeting
            const playerX = (typeof player !== 'undefined') ? player.x : CONFIG.CANVAS_WIDTH / 2;
            const playerY = (typeof player !== 'undefined') ? player.y : 300;

            // Wing flap sound timer
            this.wingFlapTimer -= deltaTime;
            if (this.wingFlapTimer <= 0 && this.bossPhase !== 'buildingDive') {
                this.wingFlapTimer = 0.8 + Math.random() * 0.4; // Every 0.8-1.2 seconds
                if (typeof SoundManager !== 'undefined' && SoundManager.vultureWingFlap) {
                    SoundManager.vultureWingFlap();
                }
            }

            // Update debris physics (falls independently of vulture phase, BUT only after release)
            // Debris falls straight down from where it was dropped
            if (this.hasDebris && this.debrisReleased) {
                this.debrisY += this.debrisFallSpeed * deltaTime;

                // Find which building (if any) the debris is actually over
                let hitBuilding = null;
                if (typeof buildingManager !== 'undefined') {
                    for (const building of buildingManager.buildings) {
                        const buildingLeft = building.x;
                        const buildingRight = building.x + building.widthBlocks * CONFIG.BLOCK_SIZE;
                        // Check if debris X is within this building's horizontal bounds
                        if (this.debrisX >= buildingLeft && this.debrisX <= buildingRight) {
                            // Check if debris Y has reached the building top
                            if (this.debrisY >= building.y && building.getBlockCount() > 0) {
                                hitBuilding = building;
                                break;
                            }
                        }
                    }
                }

                // Check if debris hit a building OR fell past all buildings (hit ground)
                if (hitBuilding) {
                    // Debris impact - destroy 10 blocks on the building it actually hit
                    let blocksDestroyed = 0;
                    const maxAttempts = 50;
                    let attempts = 0;

                    while (blocksDestroyed < 10 && attempts < maxAttempts) {
                        const col = Math.floor(Math.random() * hitBuilding.widthBlocks);
                        const row = Math.floor(Math.random() * Math.min(5, hitBuilding.heightBlocks));

                        if (hitBuilding.blocks[row] && hitBuilding.blocks[row][col]) {
                            hitBuilding.destroyBlock(row, col);
                            blocksDestroyed++;
                        }
                        attempts++;
                    }

                    // Impact effects
                    if (typeof EffectsManager !== 'undefined') {
                        EffectsManager.addExplosion(this.debrisX, hitBuilding.y, 45, '#8B7355');
                        EffectsManager.addExplosion(this.debrisX, hitBuilding.y - 20, 30, '#996633');
                        EffectsManager.shake(15);
                    }
                    if (typeof SoundManager !== 'undefined') {
                        SoundManager.buildingCollapse();
                    }

                    this.hasDebris = false;
                    this.debrisTargetBuilding = null;
                } else if (this.debrisY >= CONFIG.STREET_Y) {
                    // Debris hit the ground - no building damage, just remove it
                    this.hasDebris = false;
                    this.debrisTargetBuilding = null;
                    // Small ground impact effect
                    if (typeof EffectsManager !== 'undefined') {
                        EffectsManager.addExplosion(this.debrisX, CONFIG.STREET_Y, 25, '#8B7355');
                    }
                }
            }



            // ========== PHASE: CIRCLING ==========
            if (this.bossPhase === 'circling') {
                this.currentAnimName = 'fly';

                // Calculate target position on circle
                this.circleAngle += deltaTime * 1.5 * speedMod;
                const targetX = this.circleCenter.x + Math.cos(this.circleAngle) * this.circleRadius;
                const targetY = this.circleCenter.y + Math.sin(this.circleAngle) * this.circleRadius * 0.3;

                // Smoothly lerp to circle position (prevents teleporting)
                const lerpSpeed = 3 * deltaTime;
                this.x += (targetX - this.x) * Math.min(lerpSpeed, 1);
                this.y += (targetY - this.y) * Math.min(lerpSpeed, 1);

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
                    this.attackAnimStartTime = null; // Reset attack animation

                    // Screech sound
                    if (typeof SoundManager !== 'undefined' && SoundManager.vultureScreech) {
                        SoundManager.vultureScreech();
                    }
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
                    this.attackAnimStartTime = null; // Reset for when we go back to attack
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
                            this.bossPhase = 'windUp';
                            this.windUpTimer = this.windUpDuration;
                            this.attackAnimStartTime = null; // Reset attack animation
                            this.hasHitBuilding = false; // Reset for dive

                            // Screech before dive
                            if (typeof SoundManager !== 'undefined' && SoundManager.vultureScreech) {
                                SoundManager.vultureScreech();
                            }
                        }
                    }
                }
            }

            // ========== PHASE: WIND_UP (0.5s visual warning) ==========
            else if (this.bossPhase === 'windUp') {
                this.currentAnimName = 'attack';

                if (this.targetBuilding) {
                    // Circle tightly above target building as warning
                    const buildingCenterX = this.targetBuilding.x + (this.targetBuilding.widthBlocks * CONFIG.BLOCK_SIZE) / 2;
                    const buildingAboveY = this.targetBuilding.y - 100;

                    // Calculate target position on small circle above building
                    this.circleAngle += deltaTime * 8 * speedMod;
                    const targetX = buildingCenterX + Math.cos(this.circleAngle) * 50;
                    const targetY = buildingAboveY + Math.sin(this.circleAngle) * 20;

                    // Smoothly lerp toward circle position (prevents teleporting)
                    const lerpSpeed = 5 * deltaTime;
                    this.x += (targetX - this.x) * Math.min(lerpSpeed, 1);
                    this.y += (targetY - this.y) * Math.min(lerpSpeed, 1);

                    // Face direction of movement
                    this.facingRight = Math.cos(this.circleAngle) > 0;

                    this.windUpTimer -= deltaTime;
                    if (this.windUpTimer <= 0) {
                        this.bossPhase = 'buildingDive';
                        this.attackAnimStartTime = null; // Reset attack animation for dive

                        // Dive sound
                        if (typeof SoundManager !== 'undefined' && SoundManager.vultureDive) {
                            SoundManager.vultureDive();
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
                        // Dive toward building at double speed
                        this.x += (dx / dist) * this.speed * 2.5 * speedMod * deltaTime;
                        this.y += (dy / dist) * this.speed * 2.5 * speedMod * deltaTime;
                    } else if (!this.hasHitBuilding) {
                        // HIT BUILDING - Destroy 10 blocks (GUARANTEED)
                        // Mark as hit to prevent double damage
                        this.hasHitBuilding = true;
                        let blocksDestroyed = 0;
                        const maxAttempts = 50;
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
                            SoundManager.buildingCollapse();
                        }

                        // Pick up debris and start recovering
                        // Find a different building for debris target
                        if (typeof buildingManager !== 'undefined') {
                            const otherBuildings = buildingManager.buildings.filter(
                                b => b !== this.targetBuilding && b.getBlockCount() > 0
                            );
                            if (otherBuildings.length > 0) {
                                this.debrisTargetBuilding = otherBuildings[Math.floor(Math.random() * otherBuildings.length)];
                                this.debrisX = this.x; // Start from vulture's current position
                                this.debrisY = this.y;
                                this.hasDebris = true;
                                this.debrisReleased = false; // Not yet released
                            }
                        }

                        this.bossPhase = 'recovering';
                        this.recoveryTimer = 2.5;
                    }
                }
            }

            // ========== PHASE: RECOVERING ==========
            else if (this.bossPhase === 'recovering') {
                this.currentAnimName = 'fly';

                const skyAltitude = CONFIG.SKY_TOP + 80; // Target altitude before moving horizontally

                // First: Rise up into the sky
                if (this.y > skyAltitude) {
                    this.y -= 80 * speedMod * deltaTime; // Rise faster
                    // Update debris position while rising
                    if (this.hasDebris && !this.debrisReleased) {
                        this.debrisX = this.x;
                        this.debrisY = this.y + 25;
                    }
                }
                // Then: Move horizontally toward debris target building
                else if (this.hasDebris && this.debrisTargetBuilding && !this.debrisReleased) {
                    // Keep at sky altitude
                    this.y = skyAltitude;

                    const targetX = this.debrisTargetBuilding.x + (this.debrisTargetBuilding.widthBlocks * CONFIG.BLOCK_SIZE) / 2;
                    const dx = targetX - this.x;

                    // Move toward target building
                    if (Math.abs(dx) > 10) {
                        this.x += Math.sign(dx) * 150 * speedMod * deltaTime;
                        this.facingRight = dx > 0;
                    }

                    // Update debris position to follow vulture while carried
                    this.debrisX = this.x;
                    this.debrisY = this.y + 25;

                    // Drop debris when directly above target building
                    if (Math.abs(dx) <= 10) {
                        // Release debris - it will now fall straight down
                        this.debrisReleased = true;
                        // Play falling sound
                        if (typeof SoundManager !== 'undefined' && SoundManager.vultureDebrisFall) {
                            SoundManager.vultureDebrisFall();
                        }
                    }
                }

                // Keep in bounds
                if (this.y < CONFIG.SKY_TOP + 50) {
                    this.y = CONFIG.SKY_TOP + 50;
                }

                this.recoveryTimer -= deltaTime;
                // Only return to circling after debris is dropped (or if no debris)
                const canExitRecovery = !this.hasDebris || this.debrisReleased;
                if (this.recoveryTimer <= 0 && canExitRecovery) {
                    // Return to circling
                    this.bossPhase = 'circling';
                    this.circleTimer = 3 + Math.random() * 2; // 3-5 seconds before next attack cycle
                    this.targetBuilding = null;

                    // Smooth circle transition setup - center the circle at screen center
                    this.circleCenter = { x: CONFIG.CANVAS_WIDTH / 2, y: 180 };
                    // Calculate starting angle based on vulture's actual position relative to circle center
                    this.circleAngle = Math.atan2(this.y - this.circleCenter.y, this.x - this.circleCenter.x);
                }
            }

            return;
        }

        // Sandstorm Colossus Mini-Boss
        if (this.type === EnemyType.SANDSTORM_COLOSSUS) {
            const speedMod = this.bellSlowed ? 0.3 : 1.0;

            // Slow horizontal movement
            if (this.movingRight) {
                this.x += this.speed * speedMod * deltaTime;
                if (this.x > CONFIG.CANVAS_WIDTH + 100) this.movingRight = false;
            } else {
                this.x -= this.speed * speedMod * deltaTime;
                if (this.x < -100) this.movingRight = true;
            }

            // Maintain altitude
            const targetY = 180;
            if (this.y < targetY) this.y += 10 * deltaTime;
            if (this.y > targetY) this.y -= 10 * deltaTime;

            // Sandstorm effect intensity
            this.sandstormAlpha = Math.min(0.4, this.sandstormAlpha + deltaTime * 0.1);

            // Spawn drones periodically
            this.droneSpawnTimer -= deltaTime;
            if (this.droneSpawnTimer <= 0) {
                this.droneSpawnTimer = this.droneSpawnInterval;
                if (typeof enemyManager !== 'undefined') {
                    const spawnX = this.x + (Math.random() - 0.5) * 60;
                    const spawnY = this.y + 40;
                    const drone = new Enemy(spawnX, spawnY, EnemyType.STANDARD);
                    enemyManager.enemies.push(drone);
                }
            }
            return;
        }

        // Siege Crawler Final Boss
        if (this.type === EnemyType.SIEGE_CRAWLER) {
            const speedMod = this.bellSlowed ? 0.3 : 1.0;

            // Check if shield is down - expose core
            this.coreExposed = !this.weapons.shieldGenerator.active;

            // Find nearest building target
            if (!this.targetBuilding && typeof buildingManager !== 'undefined') {
                const buildings = buildingManager.buildings.filter(b => b.getBlockCount() > 0);
                if (buildings.length > 0) {
                    let nearest = buildings[0];
                    let nearestDist = Math.abs(this.x - nearest.x);
                    for (const b of buildings) {
                        const dist = Math.abs(this.x - b.x);
                        if (dist < nearestDist) {
                            nearestDist = dist;
                            nearest = b;
                        }
                    }
                    this.targetBuilding = nearest;
                }
            }

            // Advance toward building
            if (this.targetBuilding) {
                const targetX = this.targetBuilding.x + (this.targetBuilding.widthBlocks * CONFIG.BLOCK_SIZE) / 2;
                const dx = targetX - this.x;

                if (Math.abs(dx) > 30) {
                    this.x += Math.sign(dx) * this.speed * speedMod * deltaTime;
                } else {
                    // Reached building - massive damage
                    for (let i = 0; i < 15; i++) {
                        const col = Math.floor(Math.random() * this.targetBuilding.widthBlocks);
                        const row = Math.floor(Math.random() * this.targetBuilding.heightBlocks);
                        this.targetBuilding.destroyBlock(row, col);
                    }
                    if (typeof EffectsManager !== 'undefined') {
                        EffectsManager.shake(15);
                        EffectsManager.addExplosion(this.x, this.y - 30, 50, '#ff4400');
                    }
                    this.targetBuilding = null; // Find next target
                }
            }

            // Weapon attacks
            if (this.weapons.missilePods.active) {
                this.attackTimers.missile -= deltaTime;
                if (this.attackTimers.missile <= 0) {
                    this.attackTimers.missile = 3;
                    if (typeof player !== 'undefined' && typeof projectileManager !== 'undefined') {
                        const angle = Math.atan2(player.y - this.y, player.x - this.x) * 180 / Math.PI;
                        projectileManager.add(this.x - 40, this.y - 30, angle, 180, false);
                        projectileManager.add(this.x + 40, this.y - 30, angle, 180, false);
                    }
                }
            }

            if (this.weapons.droneBay.active) {
                this.attackTimers.drone -= deltaTime;
                if (this.attackTimers.drone <= 0) {
                    this.attackTimers.drone = 5;
                    if (typeof enemyManager !== 'undefined') {
                        const drone = new Enemy(this.x, this.y - 50, EnemyType.STANDARD);
                        enemyManager.enemies.push(drone);
                    }
                }
            }

            if (this.weapons.mortarCannon.active && this.targetBuilding) {
                this.attackTimers.mortar -= deltaTime;
                if (this.attackTimers.mortar <= 0) {
                    this.attackTimers.mortar = 4;
                    const targetX = this.targetBuilding.x + (this.targetBuilding.widthBlocks * CONFIG.BLOCK_SIZE) / 2;
                    if (typeof projectileManager !== 'undefined') {
                        projectileManager.addBomb(this.x, this.y - 40, -60, 100);
                    }
                }
            }
            return;
        }

        // Bomber Logic
        if (this.type === EnemyType.BOMBER) {
            if (!this.divingAtPlayer) {
                this.diveTimer -= deltaTime;
                if (this.diveTimer <= 0) {
                    this.divingAtPlayer = true;
                    // Play specific bomber sound
                    if (typeof SoundManager !== 'undefined') SoundManager.bomberDive();
                }
            } else {
                // Check if player is docked/refueling - explode harmlessly
                if (player.state !== 'flying') {
                    // Player not in air, crash into ground
                    this.die(true);
                    return;
                }

                // Dive towards player
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    this.velX = dx / dist;
                    this.velY = dy / dist;
                }
                const bomberSpeedMod = this.bellSlowed ? 0.3 : 1.0;
                const diveSpeed = this.speed * 2.5 * bomberSpeedMod;
                this.x += this.velX * diveSpeed * deltaTime;
                this.y += this.velY * diveSpeed * deltaTime;

                // Rotation aligns with movement
                this.rotation = Math.atan2(this.velY, this.velX);

                // Crash check
                if (this.y > CONFIG.STREET_Y) {
                    this.die(true); // Crash
                }
                return;
            }
        }

        // Carrier (SPLITTER) Logic - flies straight across screen at high altitude
        if (this.type === EnemyType.SPLITTER) {
            // Track facing direction for carrier
            this.facingRight = this.carrierMovingRight;

            // Calculate minimum altitude (tallest building + buffer)
            let maxBuildingTop = CONFIG.SKY_TOP + 100;
            if (typeof buildingManager !== 'undefined') {
                for (const building of buildingManager.buildings) {
                    if (building.y < maxBuildingTop) {
                        maxBuildingTop = building.y;
                    }
                }
            }
            const minAltitude = maxBuildingTop - CONFIG.CARRIER_ALTITUDE_BUFFER;

            // Clamp Y to never go below minimum altitude
            if (this.y > minAltitude) {
                this.y = minAltitude;
            }

            // Move straight across screen
            const direction = this.carrierMovingRight ? 1 : -1;
            const carrierSpeedMod = this.bellSlowed ? 0.3 : 1.0;
            this.x += direction * this.speed * carrierSpeedMod * deltaTime;

            // Update attack cooldown
            this.carrierAttackCooldown -= deltaTime;

            // Check for attack (play attack animation, spawn drones at frame 28)
            if (this.carrierAttackCooldown <= 0 && this.state === EnemyState.FLYING) {
                // Check global drone limit before attacking
                if (carrierSpawnedDroneCount < CONFIG.CARRIER_MAX_SPAWNED_DRONES) {
                    this.state = EnemyState.ATTACKING;
                    this.currentAnimName = 'attack';
                    this.carrierAttackFrameTriggered = false;
                    if (this.animations && this.animations.attack) {
                        this.animations.attack.reset();
                    }
                    // Reset cooldown
                    this.carrierAttackCooldown = CONFIG.CARRIER_ATTACK_COOLDOWN_MIN +
                        Math.random() * (CONFIG.CARRIER_ATTACK_COOLDOWN_MAX - CONFIG.CARRIER_ATTACK_COOLDOWN_MIN);
                }
            }

            // Check for despawn (completely off-screen)
            const offScreenLeft = this.x < -this.width;
            const offScreenRight = this.x > CONFIG.CANVAS_WIDTH + this.width;
            if ((this.carrierMovingRight && offScreenRight) || (!this.carrierMovingRight && offScreenLeft)) {
                // Silent despawn - counts toward wave, no points
                this.state = EnemyState.DEAD;
                this.active = false;
                console.log('Carrier despawned off-screen');
            }
            return;
        }

        // Gunship (TANK) Logic - continuous fly-by with missile barrage
        if (this.type === EnemyType.TANK) {
            // Track facing direction for gunship
            this.facingRight = this.gunshipPatrolRight;

            // Calculate patrol altitude (above tallest building)
            let maxBuildingTop = CONFIG.SKY_TOP + 100;
            if (typeof buildingManager !== 'undefined') {
                for (const building of buildingManager.buildings) {
                    if (building.y < maxBuildingTop) {
                        maxBuildingTop = building.y;
                    }
                }
            }
            const patrolAltitude = maxBuildingTop - CONFIG.GUNSHIP_PATROL_ALTITUDE_OFFSET;

            // Smooth altitude adjustment
            if (Math.abs(this.y - patrolAltitude) > 5) {
                this.y += (patrolAltitude - this.y) * deltaTime * 2;
            } else {
                this.y = patrolAltitude;
            }

            // Move horizontally (continuous flight)
            const direction = this.gunshipPatrolRight ? 1 : -1;
            const gunshipSpeedMod = this.bellSlowed ? 0.3 : 1.0;
            this.x += direction * this.speed * gunshipSpeedMod * deltaTime;

            // Bounce off screen edges (turn around)
            if (this.x < 50) {
                this.x = 50;
                this.gunshipPatrolRight = true;
                this.facingRight = true;
            }
            if (this.x > CONFIG.CANVAS_WIDTH - 50) {
                this.x = CONFIG.CANVAS_WIDTH - 50;
                this.gunshipPatrolRight = false;
                this.facingRight = false;
            }

            // Update post-attack fly timer if active
            if (this.gunshipPostAttackTimer > 0) {
                this.gunshipPostAttackTimer -= deltaTime;
            }

            // Update attack cooldown
            this.gunshipAttackCooldown -= deltaTime;

            // Check for attack (cooldown only, no building proximity needed)
            // Also ensure post-attack fly time has elapsed
            if (this.gunshipAttackCooldown <= 0 &&
                this.gunshipPostAttackTimer <= 0 &&
                this.state === EnemyState.FLYING) {
                this.state = EnemyState.ATTACKING;
                this.currentAnimName = 'attack';
                this.gunshipAttackFrameTriggered = false;
                if (this.animations && this.animations.attack) {
                    this.animations.attack.reset();
                }
                // Reset cooldown
                this.gunshipAttackCooldown = CONFIG.GUNSHIP_ATTACK_COOLDOWN_MIN +
                    Math.random() * (CONFIG.GUNSHIP_ATTACK_COOLDOWN_MAX - CONFIG.GUNSHIP_ATTACK_COOLDOWN_MIN);
            }
            return;
        }

        // Standard Flight
        this.flightPhase += deltaTime * this.swoopFrequency;

        // Collision damage cooldown
        if (this.collisionDamageCooldown > 0) {
            this.collisionDamageCooldown -= deltaTime;
        }

        // Track facing direction for STANDARD and AGGRESSIVE drones
        if (this.type === EnemyType.STANDARD || this.type === EnemyType.AGGRESSIVE) {
            this.facingRight = this.velX >= 0;
        }

        // AGGRESSIVE drone ranged attack cooldown
        if (this.type === EnemyType.AGGRESSIVE) {
            this.rangedAttackCooldown -= deltaTime;

            // Random chance to attack (20% per second), min 5s, max 20s between attacks
            if (this.rangedAttackCooldown <= 0 && Math.random() < 0.2 * deltaTime) {
                // Trigger ranged attack - switch to ATTACKING state
                this.state = EnemyState.ATTACKING;
                this.currentAnimName = 'attack';
                if (this.animations && this.animations.attack) {
                    this.animations.attack.reset();
                }
                // Store velocity direction for projectiles (horizontal or diagonal down, never up)
                this.attackVelX = this.velX;
                this.attackVelY = Math.max(0, this.velY); // Clamp to 0 or positive (down)
                // If both are near zero, default to facing direction
                if (Math.abs(this.attackVelX) < 0.1 && Math.abs(this.attackVelY) < 0.1) {
                    this.attackVelX = this.facingRight ? 1 : -1;
                    this.attackVelY = 0.3; // Slight downward angle
                }
                this.projectilesToFire = 3;
                this.projectileFireTimer = 0;
                // Reset cooldown (5-20 seconds)
                this.rangedAttackCooldown = 5 + Math.random() * 15;
                return; // Stop moving for attack animation
            }
        }

        // Change direction - roaming behavior
        this.directionChangeTimer += deltaTime;
        if (this.directionChangeTimer >= this.directionChangeInterval) {
            this.directionChangeTimer = 0;
            this.directionChangeInterval = 0.3 + Math.random() * 0.5;

            if (this.type === EnemyType.STANDARD) {
                // STANDARD drones: roaming behavior
                const rand = Math.random();
                if (rand < 0.1) {
                    // 10% chance to reverse direction
                    this.velX = -this.velX;
                } else if (rand < 0.4) {
                    // 30% chance to seek building target
                    this.seekGenericTarget();
                } else {
                    // 60% chance to wander freely
                    this.velX += (Math.random() - 0.5) * 2;
                    this.velY += (Math.random() - 0.5) * 1;
                    this.normalizeVelocity();
                }

                // Altitude preference: 70% chance to prefer lower altitude
                if (Math.random() < 0.7 && this.y < 300) {
                    this.velY = Math.abs(this.velY) * 0.5 + 0.3; // Bias downward
                    this.normalizeVelocity();
                }
            } else if (this.type === EnemyType.AGGRESSIVE) {
                // AGGRESSIVE drones: similar roaming to STANDARD
                const rand = Math.random();
                if (rand < 0.1) {
                    // 10% chance to reverse direction
                    this.velX = -this.velX;
                } else if (rand < 0.4) {
                    // 30% chance to seek building target
                    this.seekGenericTarget();
                } else {
                    // 60% chance to wander freely
                    this.velX += (Math.random() - 0.5) * 2;
                    this.velY += (Math.random() - 0.5) * 1;
                    this.normalizeVelocity();
                }

                // Altitude preference: 40% chance to prefer lower altitude (less than standard)
                if (Math.random() < 0.4 && this.y < 300) {
                    this.velY = Math.abs(this.velY) * 0.5 + 0.3; // Bias downward
                    this.normalizeVelocity();
                }
            } else if (this.type !== EnemyType.BOMBER) {
                // Other types: 80% seek building, 20% wander
                if (Math.random() < 0.8) {
                    this.seekGenericTarget();
                } else {
                    this.velX += (Math.random() - 0.5) * 2;
                    this.velY += (Math.random() - 0.5) * 1;
                    this.normalizeVelocity();
                }
            }
        }

        // Apply movement
        const speedMod = this.bellSlowed ? 0.3 : 1.0;
        const speed = this.speed * speedMod;
        const newX = this.x + this.velX * speed * deltaTime;
        const newY = this.y + this.velY * speed * deltaTime + Math.sin(this.flightPhase) * 20 * deltaTime;

        // Check building collision BEFORE moving
        const collisionResult = this.checkBuildingCollisionDamage(newX, newY);
        if (collisionResult.hit) {
            if (this.type === EnemyType.STANDARD && collisionResult.didDamage) {
                // STANDARD drone: switch to ATTACKING state for attack animation
                this.state = EnemyState.ATTACKING;
                this.currentAnimName = 'attack';
                if (this.animations && this.animations.attack) {
                    this.animations.attack.reset();
                }
                // Store collision data for AOE damage at end of animation
                this.attackCollision = {
                    building: collisionResult.building,
                    row: collisionResult.row,
                    col: collisionResult.col
                };
                return; // Don't move, stay in place for attack animation
            } else {
                // Other types or cooldown active: bounce off building
                this.velX = -this.velX + (Math.random() - 0.5) * 0.5;
                this.velY = -this.velY + (Math.random() - 0.5) * 0.5;
                this.normalizeVelocity();
            }
        } else {
            this.x = newX;
            this.y = newY;
        }

        // Add erratic movement for Zone 2 aggressive drones
        if (this.type === EnemyType.AGGRESSIVE && this.erraticMovement) {
            // More frequent direction changes
            if (!this.erraticTimer) this.erraticTimer = 0;
            this.erraticTimer -= deltaTime;

            if (this.erraticTimer <= 0) {
                this.erraticTimer = 0.1 + Math.random() * 0.2; // Change direction every 0.1-0.3 seconds
                this.erraticAngle = (Math.random() - 0.5) * Math.PI; // Random angle adjustment
            }

            // Add random jitter to position
            this.x += (Math.random() - 0.5) * 3;
            this.y += (Math.random() - 0.5) * 2;
        }

        // Screen bounds
        if (this.x < 20) { this.x = 20; this.velX = Math.abs(this.velX); }
        if (this.x > CONFIG.CANVAS_WIDTH - 20) { this.x = CONFIG.CANVAS_WIDTH - 20; this.velX = -Math.abs(this.velX); }
        if (this.y < CONFIG.SKY_TOP) { this.y = CONFIG.SKY_TOP; this.velY = Math.abs(this.velY); }
        if (this.y > CONFIG.STREET_Y - 50) { this.y = CONFIG.STREET_Y - 50; this.velY = -Math.abs(this.velY); }

        // Start Attack Check
        if (this.targetBlock && this.targetBlock.building) {
            const pos = this.targetBlock.building.getBlockWorldPosition(this.targetBlock.row, this.targetBlock.col);
            const dist = Math.abs(this.x - (pos.x + pos.width / 2)) + Math.abs(this.y - (pos.y + pos.height / 2));

            if (dist < 20) {
                if (this.targetBlock.building.blocks[this.targetBlock.row]?.[this.targetBlock.col]) {
                    this.state = EnemyState.ATTACKING;
                    this.attackTimer = 0;
                } else {
                    this.targetBlock = null;
                }
            }
        }
    }

    seekGenericTarget() {
        if (!buildingManager) return;
        const edges = buildingManager.getAllEdgeBlocks();
        if (edges.length > 0) {
            const t = edges[Math.floor(Math.random() * edges.length)];
            if (t) {
                this.targetBlock = t;
                const pos = t.building.getBlockWorldPosition(t.row, t.col);
                const tx = pos.x + pos.width / 2;
                const ty = pos.y + pos.height / 2;
                this.velX = tx - this.x;
                this.velY = ty - this.y;
                this.normalizeVelocity();
            }
        }
    }

    /**
     * Helper: Check if a building is already occupied by a living scorpion
     */
    isBuildingOccupiedByScorpion(building) {
        if (typeof enemyManager === 'undefined') return false;
        for (const enemy of enemyManager.enemies) {
            if (enemy === this) continue; // Skip self
            if (!enemy.active || enemy.state === EnemyState.DEAD) continue;
            if (enemy.type !== EnemyType.SCORPION) continue;
            if (enemy.targetBuilding === building) {
                // Check if scorpion is climbing or on rooftop
                if (enemy.scorpionState === 'CLIMBING' ||
                    enemy.scorpionState === 'ROOFTOP_CRAWL' ||
                    enemy.scorpionState === 'CLAW_ATTACK' ||
                    enemy.scorpionState === 'RANGED_ATTACK') {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Scorpion state machine update
     */
    updateScorpion(deltaTime) {
        const speedMod = this.bellSlowed ? 0.3 : 1.0;

        // Scuttle sound timer (during crawl/climb states)
        if (this.scorpionState === 'CRAWLING_TO_BUILDING' || this.scorpionState === 'CLIMBING' || this.scorpionState === 'ROOFTOP_CRAWL') {
            this.scuttleSoundTimer -= deltaTime;
            if (this.scuttleSoundTimer <= 0) {
                this.scuttleSoundTimer = 0.5 + Math.random() * 0.3;
                if (typeof SoundManager !== 'undefined' && SoundManager.scorpionScuttle) {
                    SoundManager.scorpionScuttle();
                }
            }
        }

        switch (this.scorpionState) {
            case 'SPAWNING':
                // Immediately transition to crawling
                this.scorpionState = 'CRAWLING_TO_BUILDING';
                this.currentAnimName = 'crawl';
                // Select target building
                this.selectTargetBuilding();
                break;

            case 'CRAWLING_TO_BUILDING':
                this.updateScorpionCrawling(deltaTime, speedMod);
                break;

            case 'CLIMBING':
                this.updateScorpionClimbing(deltaTime, speedMod);
                break;

            case 'ROOFTOP_CRAWL':
                this.updateScorpionRooftop(deltaTime, speedMod);
                break;

            case 'CLAW_ATTACK':
                this.updateScorpionClawAttack(deltaTime, speedMod);
                break;

            case 'RANGED_ATTACK':
                this.updateScorpionRangedAttack(deltaTime, speedMod);
                break;

            case 'FALLING':
                this.updateScorpionFalling(deltaTime);
                break;
        }
    }

    /**
     * Select a target building for the scorpion
     * 70% prefer buildings with civilians, 30% any building
     */
    selectTargetBuilding() {
        if (typeof buildingManager === 'undefined') return;

        const buildings = buildingManager.buildings.filter(b =>
            b.getBlockCount() > 0 && !this.isBuildingOccupiedByScorpion(b)
        );
        if (buildings.length === 0) return;

        // Check for buildings with civilians
        let buildingsWithCivilians = [];
        if (typeof civilianManager !== 'undefined') {
            for (const building of buildings) {
                const hasCivilian = civilianManager.civilians.some(c =>
                    c.active && c.building === building && c.state === 'waiting'
                );
                if (hasCivilian) {
                    buildingsWithCivilians.push(building);
                }
            }
        }

        // 70% chance to prefer civilian buildings if any exist
        if (buildingsWithCivilians.length > 0 && Math.random() < 0.7) {
            this.targetBuilding = buildingsWithCivilians[Math.floor(Math.random() * buildingsWithCivilians.length)];
        } else {
            this.targetBuilding = buildings[Math.floor(Math.random() * buildings.length)];
        }

        // Determine which side to approach from based on spawn side
        const buildingCenterX = this.targetBuilding.x + (this.targetBuilding.widthBlocks * CONFIG.BLOCK_SIZE) / 2;
        this.climbSide = this.x < buildingCenterX ? 'left' : 'right';
    }

    /**
     * Scorpion crawling on ground toward building
     */
    updateScorpionCrawling(deltaTime, speedMod) {
        if (!this.targetBuilding) {
            this.selectTargetBuilding();
            if (!this.targetBuilding) return;
        }

        const groundSpeed = 50 * speedMod; // 50 px/s
        const building = this.targetBuilding;

        // Determine target X position (edge of building based on approach side)
        let targetX;
        if (this.climbSide === 'left') {
            targetX = building.x + this.width / 2;
        } else {
            targetX = building.x + building.widthBlocks * CONFIG.BLOCK_SIZE - this.width / 2;
        }

        // Move toward target
        const dx = targetX - this.x;
        this.facingRight = dx > 0;

        if (Math.abs(dx) > 5) {
            this.x += Math.sign(dx) * groundSpeed * deltaTime;
        } else {
            // Arrived at building - start climbing
            this.x = targetX;
            this.scorpionState = 'CLIMBING';
            this.climbAnimPhase = 'intro';
            this.currentAnimName = 'climb_intro';
            if (this.animations && this.animations.climb_intro) {
                this.animations.climb_intro.reset();
            }
            // Start at bottom of building
            this.climbY = CONFIG.STREET_Y;
        }

        // Stay on ground
        this.y = CONFIG.STREET_Y - this.height / 2;
    }

    /**
     * Scorpion climbing up building wall
     */
    updateScorpionClimbing(deltaTime, speedMod) {
        if (!this.targetBuilding) return;

        const climbSpeed = 40 * speedMod * this.speedModifier; // 40 px/s base with variation
        const building = this.targetBuilding;

        // Check if building blocks beneath scorpion are destroyed - fall and die
        if (!this.checkBuildingSupportBeneath()) {
            this.scorpionState = 'FALLING';
            this.currentAnimName = 'death';
            if (this.animations && this.animations.death) {
                this.animations.death.reset();
            }
            this.fallSpeed = 0;
            this.fallGravity = 800;
            return;
        }

        // Handle intro animation transition to loop
        if (this.climbAnimPhase === 'intro') {
            if (this.animations && this.animations.climb_intro && this.animations.climb_intro.isComplete) {
                this.climbAnimPhase = 'loop';
                this.currentAnimName = 'climb_loop';
                if (this.animations.climb_loop) {
                    this.animations.climb_loop.reset();
                }
            }
        }

        // Deal block damage every 2 seconds while climbing
        this.climbDamageTimer -= deltaTime * speedMod;
        if (this.climbDamageTimer <= 0) {
            this.climbDamageTimer = 2; // Reset timer
            this.damageClimbingBlock(building);
        }

        // Move up
        this.climbY -= climbSpeed * deltaTime;

        // Position scorpion on building edge
        if (this.climbSide === 'left') {
            this.x = building.x + this.width / 2;
        } else {
            this.x = building.x + building.widthBlocks * CONFIG.BLOCK_SIZE - this.width / 2;
        }
        this.y = this.climbY - this.height / 2;

        // Check if reached rooftop
        if (this.climbY <= building.y) {
            this.scorpionState = 'ROOFTOP_CRAWL';
            this.currentAnimName = 'crawl';
            this.y = building.y - this.height / 2;
            this.rooftopX = this.climbSide === 'left' ? 0 : (building.widthBlocks * CONFIG.BLOCK_SIZE - this.width);
            this.rooftopDirection = this.climbSide === 'left' ? 1 : -1;
            this.attackTimer = 4; // Reset attack timer
        }
    }

    /**
     * Check if building has blocks beneath the scorpion to support it
     */
    checkBuildingSupportBeneath() {
        if (!this.targetBuilding) return false;
        const building = this.targetBuilding;

        // Get the row the scorpion is currently at
        const row = Math.floor((this.climbY - building.y) / CONFIG.BLOCK_SIZE);
        if (row < 0 || row >= building.heightBlocks) return true; // Above or at rooftop is fine

        // Check if there's a block at the scorpion's position on the climb side
        const col = this.climbSide === 'left' ? 0 : building.widthBlocks - 1;

        if (building.blocks && building.blocks[row] && building.blocks[row][col]) {
            return true; // Block exists, scorpion is supported
        }

        // Also check adjacent column in case building is narrow
        const adjCol = this.climbSide === 'left' ? 1 : building.widthBlocks - 2;
        if (adjCol >= 0 && adjCol < building.widthBlocks) {
            if (building.blocks && building.blocks[row] && building.blocks[row][adjCol]) {
                return true;
            }
        }

        return false; // No support, scorpion falls
    }

    /**
     * Damage a block on the building the scorpion is climbing
     */
    damageClimbingBlock(building) {
        if (!building || !building.blocks) return;

        // Get the row the scorpion is currently at
        const row = Math.floor((this.climbY - building.y) / CONFIG.BLOCK_SIZE);
        if (row < 0 || row >= building.heightBlocks) return;

        // Damage block on the climb side
        const col = this.climbSide === 'left' ? 0 : building.widthBlocks - 1;

        if (building.blocks[row] && building.blocks[row][col]) {
            building.destroyBlock(row, col);
            if (typeof EffectsManager !== 'undefined') {
                const blockX = building.x + col * CONFIG.BLOCK_SIZE + CONFIG.BLOCK_SIZE / 2;
                const blockY = building.y + row * CONFIG.BLOCK_SIZE + CONFIG.BLOCK_SIZE / 2;
                EffectsManager.addExplosion(blockX, blockY, 10, '#ff6600');
            }
        }
    }

    /**
     * Scorpion falling after building support destroyed
     */
    updateScorpionFalling(deltaTime) {
        // Update death animation
        if (this.animations && this.animations.death) {
            this.animations.death.update(deltaTime);
        }

        // Apply gravity
        this.fallSpeed += this.fallGravity * deltaTime;
        this.y += this.fallSpeed * deltaTime;

        // Add slight rotation while falling
        this.rotation += deltaTime * 3;

        // Check if hit ground
        if (this.y >= CONFIG.STREET_Y - this.height / 2) {
            this.y = CONFIG.STREET_Y - this.height / 2;
            // Die on impact
            this.state = EnemyState.DEAD;
            this.active = false;

            // Death effects
            if (typeof EffectsManager !== 'undefined') {
                EffectsManager.addAnimatedExplosion(this.x, this.y, 'enemy', 25);
                EffectsManager.addExplosion(this.x, this.y, 30, '#ff6600');
            }
            if (typeof SoundManager !== 'undefined') {
                SoundManager.enemyDeath();
            }
        }
    }

    /**
     * Check if building has blocks to support scorpion on rooftop
     */
    checkRooftopSupport() {
        if (!this.targetBuilding) return false;
        const building = this.targetBuilding;

        // Check if the building has any blocks left in the top row
        if (!building.blocks || building.blocks.length === 0) return false;

        // Check for blocks in the top row beneath the scorpion's position
        const scorpionCol = Math.floor(this.rooftopX / CONFIG.BLOCK_SIZE);
        const topRow = 0; // Top row of the building

        // Check a few columns around the scorpion's position
        for (let col = Math.max(0, scorpionCol - 1); col <= Math.min(building.widthBlocks - 1, scorpionCol + 1); col++) {
            if (building.blocks[topRow] && building.blocks[topRow][col]) {
                return true; // Found support
            }
        }

        // Also check if there are any blocks in the building at all
        return building.getBlockCount() > 0;
    }

    /**
     * Scorpion pacing on rooftop
     */
    updateScorpionRooftop(deltaTime, speedMod) {
        if (!this.targetBuilding) return;

        const building = this.targetBuilding;

        // Check if building has been destroyed beneath - fall and die
        if (!this.checkRooftopSupport()) {
            this.scorpionState = 'FALLING';
            this.currentAnimName = 'death';
            if (this.animations && this.animations.death) {
                this.animations.death.reset();
            }
            this.fallSpeed = 0;
            this.fallGravity = 800;
            this.rotation = 0;
            return;
        }

        const rooftopSpeed = 30 * speedMod; // 30 px/s
        const margin = 10;
        const minX = margin;
        const maxX = building.widthBlocks * CONFIG.BLOCK_SIZE - margin - this.width;

        // Pace back and forth
        this.rooftopX += this.rooftopDirection * rooftopSpeed * deltaTime;
        this.facingRight = this.rooftopDirection > 0;

        // Bounce at edges
        if (this.rooftopX <= minX) {
            this.rooftopX = minX;
            this.rooftopDirection = 1;
        } else if (this.rooftopX >= maxX) {
            this.rooftopX = maxX;
            this.rooftopDirection = -1;
        }

        // Update world position
        this.x = building.x + this.rooftopX + this.width / 2;
        this.y = building.y - this.height / 2;

        // Check for civilians on this building
        if (typeof civilianManager !== 'undefined') {
            for (const civilian of civilianManager.civilians) {
                if (civilian.active && civilian.building === building && civilian.state === 'waiting') {
                    // Found a civilian - switch to claw attack
                    this.targetCivilian = civilian;
                    this.scorpionState = 'CLAW_ATTACK';
                    this.currentAnimName = 'claw';
                    if (this.animations && this.animations.claw) {
                        this.animations.claw.reset();
                    }
                    return;
                }
            }
        }

        // Attack timer countdown
        this.attackTimer -= deltaTime;
        if (this.attackTimer <= 0) {
            // Transition to ranged attack
            this.scorpionState = 'RANGED_ATTACK';
            this.currentAnimName = 'attack';
            if (this.animations && this.animations.attack) {
                this.animations.attack.reset();
            }
            this.projectilesFired = 0;
            this.projectileDelay = 0;
            // Play hiss sound
            if (typeof SoundManager !== 'undefined' && SoundManager.scorpionHiss) {
                SoundManager.scorpionHiss();
            }
        }
    }

    /**
     * Scorpion chasing and attacking civilian
     */
    updateScorpionClawAttack(deltaTime, speedMod) {
        if (!this.targetBuilding) return;

        const building = this.targetBuilding;

        // Check if building has been destroyed beneath - fall and die
        if (!this.checkRooftopSupport()) {
            this.scorpionState = 'FALLING';
            this.currentAnimName = 'death';
            if (this.animations && this.animations.death) {
                this.animations.death.reset();
            }
            this.fallSpeed = 0;
            this.fallGravity = 800;
            this.rotation = 0;
            return;
        }

        const chaseSpeed = 60 * speedMod; // 60 px/s

        // Check if civilian is still valid
        if (!this.targetCivilian || !this.targetCivilian.active || this.targetCivilian.state !== 'waiting') {
            this.targetCivilian = null;
            this.scorpionState = 'ROOFTOP_CRAWL';
            this.currentAnimName = 'crawl';
            return;
        }

        // Move toward civilian
        const civilianX = this.targetCivilian.x;
        const dx = civilianX - this.x;
        this.facingRight = dx > 0;

        if (Math.abs(dx) > 10) {
            this.x += Math.sign(dx) * chaseSpeed * deltaTime;
            // Clamp to building bounds
            this.x = Math.max(building.x + this.width / 2, Math.min(building.x + building.widthBlocks * CONFIG.BLOCK_SIZE - this.width / 2, this.x));
        }

        // Check collision with civilian (distance-based)
        const dist = Math.abs(this.x - civilianX);
        if (dist < 25) {
            // Hit civilian - make them fall
            if (typeof CivilianState !== 'undefined') {
                this.targetCivilian.state = CivilianState.FALLING;
            } else {
                this.targetCivilian.state = 'falling';
            }
            this.targetCivilian = null;
            // Return to rooftop crawl after claw animation completes
            if (this.animations && this.animations.claw && this.animations.claw.isComplete) {
                this.scorpionState = 'ROOFTOP_CRAWL';
                this.currentAnimName = 'crawl';
                this.attackTimer = 4;
            }
        }

        // Check if claw animation completed
        if (this.animations && this.animations.claw && this.animations.claw.isComplete) {
            this.scorpionState = 'ROOFTOP_CRAWL';
            this.currentAnimName = 'crawl';
            this.attackTimer = 4;
        }

        // Update rooftopX based on current position
        this.rooftopX = this.x - building.x - this.width / 2;
    }

    /**
     * Scorpion ranged attack - fire 2 projectiles at player
     */
    updateScorpionRangedAttack(deltaTime, speedMod) {
        // Check if building has been destroyed beneath - fall and die
        if (!this.checkRooftopSupport()) {
            this.scorpionState = 'FALLING';
            this.currentAnimName = 'death';
            if (this.animations && this.animations.death) {
                this.animations.death.reset();
            }
            this.fallSpeed = 0;
            this.fallGravity = 800;
            this.rotation = 0;
            return;
        }

        // Face toward player
        if (typeof player !== 'undefined') {
            this.facingRight = player.x > this.x;
        }

        // Check if attack animation completed
        const anim = this.animations ? this.animations.attack : null;
        const animComplete = anim ? anim.isComplete : true;

        // Count down projectile delay
        if (this.projectileDelay > 0) {
            this.projectileDelay -= deltaTime;
        }

        // Fire projectiles after animation completes
        if (animComplete && this.projectilesFired < 2 && this.projectileDelay <= 0) {
            // Fire projectile at player
            if (typeof player !== 'undefined' && typeof projectileManager !== 'undefined') {
                const angle = Math.atan2(player.y - this.y, player.x - this.x) * 180 / Math.PI;
                projectileManager.add(this.x, this.y, angle, 200, false); // speed 200, enemy projectile
            }
            this.projectilesFired++;
            if (this.projectilesFired < 2) {
                this.projectileDelay = 0.2; // 0.2s delay before second shot
            }
        }

        // Return to rooftop crawl after firing both projectiles (with small delay)
        if (this.projectilesFired >= 2) {
            this.projectileDelay -= deltaTime;
            if (this.projectileDelay <= -0.3) { // Wait 0.3s after second shot
                this.scorpionState = 'ROOFTOP_CRAWL';
                this.currentAnimName = 'crawl';
                this.attackTimer = 4; // Reset for next attack cycle
            }
        }
    }

    updateAttacking(deltaTime) {
        // STANDARD drones: animation-based attack
        if (this.type === EnemyType.STANDARD) {
            // Stay frozen in place (no movement)
            // Check if attack animation completed by detecting frame reset
            if (this.animations && this.animations.attack) {
                const anim = this.animations.attack;
                const prevFrame = anim.currentFrame;
                anim.update(deltaTime);

                // Animation completed when it resets to frame 0 (once mode stops at last frame)
                // For 'once' mode, check if we're at the last frame
                if (anim.currentFrame === anim.frameCount - 1 ||
                    (prevFrame > 0 && anim.currentFrame === 0)) {
                    // Attack animation complete - deal 3x3 AOE damage
                    if (this.attackCollision) {
                        const { building, row, col } = this.attackCollision;

                        // 3x3 AOE damage centered on collision point
                        for (let dr = -1; dr <= 1; dr++) {
                            for (let dc = -1; dc <= 1; dc++) {
                                const nr = row + dr;
                                const nc = col + dc;
                                if (nr >= 0 && nr < building.heightBlocks &&
                                    nc >= 0 && nc < building.widthBlocks &&
                                    building.blocks[nr]?.[nc]) {
                                    building.destroyBlock(nr, nc);
                                }
                            }
                        }

                        // Visual feedback
                        if (typeof EffectsManager !== 'undefined') {
                            const pos = building.getBlockWorldPosition(row, col);
                            EffectsManager.addExplosion(pos.x + CONFIG.BLOCK_SIZE / 2, pos.y + CONFIG.BLOCK_SIZE / 2, 25, '#ff8800');
                        }

                        this.attackCollision = null;
                    }

                    // Return to flying state
                    this.state = EnemyState.FLYING;
                    this.currentAnimName = 'fly';
                    if (this.animations.fly) {
                        this.animations.fly.reset();
                    }
                    this.velY = -0.8; // Fly up
                    this.velX = (Math.random() - 0.5) * 0.5;
                    this.normalizeVelocity();
                }
            }
            return;
        }

        // AGGRESSIVE drones: animation-based ranged attack
        if (this.type === EnemyType.AGGRESSIVE) {
            // Stay frozen in place (no movement)
            if (this.animations && this.animations.attack) {
                const anim = this.animations.attack;

                // Check if attack animation completed
                if (anim.isComplete || anim.currentFrame === anim.frameCount - 1) {
                    // Animation complete - fire 3 sequential projectiles
                    this.projectileFireTimer += deltaTime;

                    // Fire a projectile every 0.15 seconds
                    if (this.projectilesToFire > 0 && this.projectileFireTimer >= 0.15) {
                        this.projectileFireTimer = 0;
                        this.projectilesToFire--;

                        // Fire projectile in stored velocity direction
                        if (typeof projectileManager !== 'undefined') {
                            const angle = Math.atan2(this.attackVelY, this.attackVelX) * 180 / Math.PI;
                            projectileManager.add(this.x, this.y, angle, 200, false); // Enemy projectile
                        }

                        // Sound effect
                        if (typeof SoundManager !== 'undefined') {
                            SoundManager.shoot();
                        }
                    }

                    // All projectiles fired - return to flying
                    if (this.projectilesToFire <= 0) {
                        this.state = EnemyState.FLYING;
                        this.currentAnimName = 'fly';
                        if (this.animations.fly) {
                            this.animations.fly.reset();
                        }
                    }
                }
            } else {
                // No animation, just return to flying
                this.state = EnemyState.FLYING;
                this.currentAnimName = 'fly';
            }
            return;
        }

        // CARRIER (SPLITTER): continues moving, spawns drones at frame 28
        if (this.type === EnemyType.SPLITTER) {
            // Keep moving during attack (same as flying behavior)
            const direction = this.carrierMovingRight ? 1 : -1;
            this.x += direction * this.speed * deltaTime;

            // Calculate minimum altitude and clamp
            let maxBuildingTop = CONFIG.SKY_TOP + 100;
            if (typeof buildingManager !== 'undefined') {
                for (const building of buildingManager.buildings) {
                    if (building.y < maxBuildingTop) {
                        maxBuildingTop = building.y;
                    }
                }
            }
            const minAltitude = maxBuildingTop - CONFIG.CARRIER_ALTITUDE_BUFFER;
            if (this.y > minAltitude) {
                this.y = minAltitude;
            }

            if (this.animations && this.animations.attack) {
                const anim = this.animations.attack;

                // Check for frame 28 to spawn drones (only once per attack)
                if (!this.carrierAttackFrameTriggered && anim.currentFrame >= CONFIG.CARRIER_SPAWN_FRAME) {
                    this.carrierAttackFrameTriggered = true;

                    // Spawn 2 drones if under global limit
                    const dronesToSpawn = Math.min(2, CONFIG.CARRIER_MAX_SPAWNED_DRONES - carrierSpawnedDroneCount);
                    for (let i = 0; i < dronesToSpawn; i++) {
                        // Spawn drone at carrier position, slightly offset
                        const droneX = this.x + (i === 0 ? -30 : 30);
                        const droneY = this.y + 40;

                        // Determine drone type based on config
                        let droneType = EnemyType.STANDARD;
                        if (CONFIG.CARRIER_SPAWN_DRONE_TYPE === 'aggressive') {
                            droneType = EnemyType.AGGRESSIVE;
                        } else if (CONFIG.CARRIER_SPAWN_DRONE_TYPE === 'random') {
                            droneType = Math.random() < 0.5 ? EnemyType.STANDARD : EnemyType.AGGRESSIVE;
                        }

                        // Create the drone
                        if (typeof enemyManager !== 'undefined') {
                            const drone = new Enemy(droneX, droneY, droneType);
                            drone.wasActive = true;
                            drone.isCarrierSpawned = true;  // Mark as carrier-spawned
                            drone.velY = 0.5;  // Start moving downward
                            drone.velX = (Math.random() - 0.5) * 0.5;
                            drone.normalizeVelocity();
                            enemyManager.enemies.push(drone);
                            carrierSpawnedDroneCount++;
                        }
                    }

                    // Visual feedback
                    if (typeof EffectsManager !== 'undefined') {
                        EffectsManager.addExplosion(this.x, this.y + 30, 15, '#00ffff');
                    }
                    console.log(`Carrier spawned ${dronesToSpawn} drones (global count: ${carrierSpawnedDroneCount})`);
                }

                // Check if animation complete - return to flying
                if (anim.isComplete || anim.currentFrame === anim.frameCount - 1) {
                    this.state = EnemyState.FLYING;
                    this.currentAnimName = 'fly';
                    if (this.animations.fly) {
                        this.animations.fly.reset();
                    }
                }
            } else {
                // No animation, just return to flying
                this.state = EnemyState.FLYING;
                this.currentAnimName = 'fly';
            }

            // Check for despawn even during attack
            const offScreenLeft = this.x < -this.width;
            const offScreenRight = this.x > CONFIG.CANVAS_WIDTH + this.width;
            if ((this.carrierMovingRight && offScreenRight) || (!this.carrierMovingRight && offScreenLeft)) {
                this.state = EnemyState.DEAD;
                this.active = false;
                console.log('Carrier despawned off-screen during attack');
            }
            return;
        }

        // GUNSHIP (TANK): continues flying during attack, fires missiles at end of animation
        if (this.type === EnemyType.TANK) {
            // Keep flying during attack (no hover)
            this.facingRight = this.gunshipPatrolRight;

            // Calculate patrol altitude (same as FLYING state)
            let maxBuildingTop = CONFIG.SKY_TOP + 100;
            if (typeof buildingManager !== 'undefined') {
                for (const building of buildingManager.buildings) {
                    if (building.y < maxBuildingTop) {
                        maxBuildingTop = building.y;
                    }
                }
            }
            const patrolAltitude = maxBuildingTop - CONFIG.GUNSHIP_PATROL_ALTITUDE_OFFSET;

            // Smooth altitude adjustment
            if (Math.abs(this.y - patrolAltitude) > 5) {
                this.y += (patrolAltitude - this.y) * deltaTime * 2;
            } else {
                this.y = patrolAltitude;
            }

            // Keep moving horizontally during attack
            const direction = this.gunshipPatrolRight ? 1 : -1;
            const gunshipSpeedMod = this.bellSlowed ? 0.3 : 1.0;
            this.x += direction * this.speed * gunshipSpeedMod * deltaTime;

            // Turn around at edges
            if (this.x < 50) {
                this.x = 50;
                this.gunshipPatrolRight = true;
                this.facingRight = true;
            }
            if (this.x > CONFIG.CANVAS_WIDTH - 50) {
                this.x = CONFIG.CANVAS_WIDTH - 50;
                this.gunshipPatrolRight = false;
                this.facingRight = false;
            }

            if (this.animations && this.animations.attack) {
                const anim = this.animations.attack;

                // Fire missiles at END of animation (not frame 4)
                if (!this.gunshipAttackFrameTriggered && (anim.isComplete || anim.currentFrame === anim.frameCount - 1)) {
                    this.gunshipAttackFrameTriggered = true;

                    // Fire 6-8 missiles in a downward spread (45-135 degrees)
                    // Canvas: 0°=right, 90°=down, 180°=left
                    const missileCount = CONFIG.GUNSHIP_MISSILES_PER_BARRAGE ||
                        (6 + Math.floor(Math.random() * 3));
                    const angleStart = 45;   // Down-right
                    const angleEnd = 135;    // Down-left
                    const angleStep = (angleEnd - angleStart) / (missileCount - 1);

                    if (typeof projectileManager !== 'undefined') {
                        for (let i = 0; i < missileCount; i++) {
                            // Add slight randomness to angle
                            const angle = angleStart + (angleStep * i) + (Math.random() - 0.5) * 10;
                            projectileManager.addMissile(
                                this.x + (Math.random() - 0.5) * 20,  // Slight spread on origin
                                this.y + 30,  // Fire from below gunship
                                angle,
                                CONFIG.MISSILE_SPEED
                            );
                        }
                    }

                    // Bigger muzzle flash effect for missile barrage
                    if (typeof EffectsManager !== 'undefined') {
                        EffectsManager.addExplosion(this.x, this.y + 35, 35, '#ff4400');
                        EffectsManager.addSparks(this.x - 15, this.y + 30, '#ffaa00');
                        EffectsManager.addSparks(this.x + 15, this.y + 30, '#ffaa00');
                        EffectsManager.shake(3);
                    }

                    // Sound effect
                    if (typeof SoundManager !== 'undefined') {
                        SoundManager.shoot();
                    }

                    console.log(`Gunship fired ${missileCount} missiles`);

                    // Return to flying and set post-attack timer
                    this.state = EnemyState.FLYING;
                    this.currentAnimName = 'fly';
                    this.gunshipPostAttackTimer = CONFIG.GUNSHIP_POST_ATTACK_FLY_TIME || 3;
                    if (this.animations.fly) {
                        this.animations.fly.reset();
                    }
                }
            } else {
                // No animation, just return to flying with post-attack timer
                this.state = EnemyState.FLYING;
                this.currentAnimName = 'fly';
                this.gunshipPostAttackTimer = CONFIG.GUNSHIP_POST_ATTACK_FLY_TIME || 3;
            }
            return;
        }

        // Other enemy types: timer-based attack
        this.attackTimer += deltaTime;

        // Slight hover shake
        this.x += (Math.random() - 0.5) * 2;
        this.y += (Math.random() - 0.5) * 2;

        if (this.attackTimer >= this.attackDuration) {
            // Destroy!
            if (this.targetBlock && this.targetBlock.building) {
                this.targetBlock.building.destroyBlock(this.targetBlock.row, this.targetBlock.col);

                // Tank splash damage
                if (this.type === EnemyType.TANK) {
                    // Destroy neighbors
                    const b = this.targetBlock.building;
                    const r = this.targetBlock.row;
                    const c = this.targetBlock.col;
                    // Simple cross pattern
                    if (b.blocks[r + 1]?.[c]) b.destroyBlock(r + 1, c);
                    if (b.blocks[r][c + 1]) b.destroyBlock(r, c + 1);
                }

                // Particles
                if (typeof EffectsManager !== 'undefined') {
                    EffectsManager.addExplosion(this.x, this.y + 10, 15, '#ff8800');
                }
            }

            this.state = EnemyState.FLYING;
            this.targetBlock = null;
            this.velY = -0.8; // Fly up
            this.velX = (Math.random() - 0.5) * 0.5;
            this.normalizeVelocity();
        }
    }

    updateFalling(deltaTime) {
        // Update death animation for AGGRESSIVE drones while falling
        if (this.type === EnemyType.AGGRESSIVE && this.animations && this.animations.death) {
            if (this.currentAnimName !== 'death') {
                this.currentAnimName = 'death';
                this.animations.death.reset();
            }
            // Animation plays once (don't loop)
            if (!this.animations.death.isComplete) {
                this.animations.death.update(deltaTime);
            }
        }

        // Update death animation for CARRIER (SPLITTER) while falling
        if (this.type === EnemyType.SPLITTER && this.animations && this.animations.death) {
            if (this.currentAnimName !== 'death') {
                this.currentAnimName = 'death';
                this.animations.death.reset();
            }
            // Animation plays once (don't loop)
            if (!this.animations.death.isComplete) {
                this.animations.death.update(deltaTime);
            }
        }

        this.fallSpeed += this.fallGravity * deltaTime;
        this.y += this.fallSpeed * deltaTime;
        this.x += this.velX * 30 * deltaTime; // Drifting
        this.rotation += this.fallRotationSpeed * deltaTime;

        // Check building collision while falling
        if (buildingManager) {
            for (const building of buildingManager.buildings) {
                // Optimized collision check (simple bbox)
                if (this.x > building.x && this.x < building.x + building.widthBlocks * 20 &&
                    this.y > building.y) {
                    // Check specific blocks
                    const col = Math.floor((this.x - building.x) / 20);
                    const row = Math.floor((this.y - building.y) / 20);
                    if (row >= 0 && row < building.heightBlocks && col >= 0 && col < building.widthBlocks) {
                        if (building.blocks[row][col]) {
                            // Determine damage based on enemy type
                            let blocksToDestroy;
                            let explosionSize;
                            let shakeAmount;

                            if (this.type === EnemyType.SPLITTER) {
                                // Carrier crash: 6-10 blocks damage (CONFIG values)
                                blocksToDestroy = CONFIG.CARRIER_DEATH_DAMAGE_MIN +
                                    Math.floor(Math.random() * (CONFIG.CARRIER_DEATH_DAMAGE_MAX - CONFIG.CARRIER_DEATH_DAMAGE_MIN + 1));
                                explosionSize = 50;
                                shakeAmount = 15;
                            } else {
                                // Other enemies: 3-5 blocks
                                blocksToDestroy = 3 + Math.floor(Math.random() * 3);
                                explosionSize = 30;
                                shakeAmount = 8;
                            }

                            let destroyed = 0;

                            // Destroy blocks in a splash pattern around impact point
                            // Use larger radius for carrier
                            const maxRadius = this.type === EnemyType.SPLITTER ? 2 : 1;
                            for (let dr = -maxRadius; dr <= maxRadius && destroyed < blocksToDestroy; dr++) {
                                for (let dc = -maxRadius; dc <= maxRadius && destroyed < blocksToDestroy; dc++) {
                                    const nr = row + dr;
                                    const nc = col + dc;
                                    if (nr >= 0 && nr < building.heightBlocks &&
                                        nc >= 0 && nc < building.widthBlocks &&
                                        building.blocks[nr][nc]) {
                                        building.destroyBlock(nr, nc);
                                        destroyed++;
                                    }
                                }
                            }

                            // Visual feedback
                            if (typeof EffectsManager !== 'undefined') {
                                const pos = building.getBlockWorldPosition(row, col);
                                EffectsManager.addExplosion(pos.x + 10, pos.y + 10, explosionSize, '#ff4400');
                                EffectsManager.shake(shakeAmount);

                                // Carrier gets additional fire/smoke/debris explosions
                                if (this.type === EnemyType.SPLITTER) {
                                    // Multiple offset explosions for bigger impact
                                    EffectsManager.addAnimatedExplosion(pos.x - 30, pos.y - 20, 'enemy', 40);
                                    EffectsManager.addAnimatedExplosion(pos.x + 40, pos.y + 10, 'enemy', 35);
                                    EffectsManager.addExplosion(pos.x + 20, pos.y - 30, 40, '#ff6600'); // Fire
                                    EffectsManager.addExplosion(pos.x - 20, pos.y + 20, 35, '#444444'); // Smoke
                                    EffectsManager.addSparks(pos.x, pos.y, '#ffaa00'); // Sparks
                                }
                            }

                            this.die(true);
                            if (typeof SoundManager !== 'undefined') SoundManager.fallingCrash();
                            return;
                        }
                    }
                }
            }
        }

        // Neutral falling damage: carrier and aggressive drone can damage other enemies while falling
        if ((this.type === EnemyType.SPLITTER || this.type === EnemyType.AGGRESSIVE) &&
            typeof enemyManager !== 'undefined') {
            const collisionRadius = this.type === EnemyType.SPLITTER ? 48 : 24; // Carrier is larger
            for (const other of enemyManager.enemies) {
                // Skip self, inactive enemies, and other falling enemies
                if (other === this || !other.active || other.state === EnemyState.FALLING) continue;

                // Simple distance-based collision
                const dx = other.x - this.x;
                const dy = other.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const otherRadius = other.type === EnemyType.SPLITTER ? 48 :
                    other.type === EnemyType.TANK ? 30 : 20;

                if (dist < collisionRadius + otherRadius) {
                    // Deal 1 damage to the other enemy (die() handles health decrement)
                    other.die();

                    // Explosion at collision point
                    if (typeof EffectsManager !== 'undefined') {
                        const impactX = (this.x + other.x) / 2;
                        const impactY = (this.y + other.y) / 2;
                        EffectsManager.addExplosion(impactX, impactY, 30, '#ff6600');
                        EffectsManager.addSparks(impactX, impactY, '#ffaa00');
                        EffectsManager.shake(8);
                    }
                    if (typeof SoundManager !== 'undefined') SoundManager.fallingCrash();

                    // Destroy this falling enemy
                    this.die(true);
                    return;
                }
            }
        }

        if (this.y > CONFIG.STREET_Y) {
            // Ground impact explosion
            if (typeof EffectsManager !== 'undefined') {
                if (this.type === EnemyType.SPLITTER) {
                    // Carrier gets massive ground explosion with fire/smoke/debris
                    EffectsManager.addExplosion(this.x, CONFIG.STREET_Y - 20, 60, '#ff4400');
                    EffectsManager.addAnimatedExplosion(this.x - 40, CONFIG.STREET_Y - 15, 'enemy', 45);
                    EffectsManager.addAnimatedExplosion(this.x + 40, CONFIG.STREET_Y - 10, 'enemy', 40);
                    EffectsManager.addExplosion(this.x + 25, CONFIG.STREET_Y - 30, 45, '#ff6600'); // Fire
                    EffectsManager.addExplosion(this.x - 25, CONFIG.STREET_Y - 25, 40, '#444444'); // Smoke
                    EffectsManager.addSparks(this.x, CONFIG.STREET_Y - 20, '#ffaa00'); // Sparks
                    EffectsManager.shake(20);
                }
            }
            if (typeof SoundManager !== 'undefined') SoundManager.fallingCrash();
            this.die(true); // Crash
        }
    }

    updateDying(deltaTime) {
        // GUNSHIP (TANK): full explosion in place after death animation
        if (this.type === EnemyType.TANK) {
            if (this.animations && this.animations.death) {
                const anim = this.animations.death;
                const prevFrame = anim.currentFrame;
                anim.update(deltaTime);

                // Animation completed when we reach the last frame (once mode)
                if (anim.currentFrame === anim.frameCount - 1 ||
                    (prevFrame > 0 && anim.currentFrame === 0)) {
                    // Death animation complete - large explosion effects
                    this.state = EnemyState.DEAD;
                    this.active = false;

                    // Large explosion effect for gunship
                    if (typeof EffectsManager !== 'undefined') {
                        EffectsManager.addAnimatedExplosion(this.x, this.y, 'enemy', 50);
                        EffectsManager.addAnimatedExplosion(this.x - 30, this.y - 20, 'enemy', 35);
                        EffectsManager.addAnimatedExplosion(this.x + 25, this.y + 15, 'enemy', 30);
                        EffectsManager.addExplosion(this.x, this.y, 60, '#ff6600'); // Fire
                        EffectsManager.addExplosion(this.x + 20, this.y - 10, 40, '#444444'); // Smoke
                        EffectsManager.addSparks(this.x, this.y, '#ffaa00'); // Sparks
                        EffectsManager.shake(12);
                    }
                    if (typeof SoundManager !== 'undefined') {
                        SoundManager.enemyDeath();
                    }
                }
            } else {
                // Fallback: no animation, just die with explosions
                this.state = EnemyState.DEAD;
                this.active = false;
                if (typeof EffectsManager !== 'undefined') {
                    EffectsManager.addAnimatedExplosion(this.x, this.y, 'enemy', 50);
                    EffectsManager.shake(10);
                }
                if (typeof SoundManager !== 'undefined') {
                    SoundManager.enemyDeath();
                }
            }
            return;
        }

        // SCORPION: play death animation then explode
        if (this.type === EnemyType.SCORPION) {
            if (this.animations && this.animations.death) {
                const anim = this.animations.death;
                const prevFrame = anim.currentFrame;
                anim.update(deltaTime);

                // Animation completed when we reach the last frame (once mode)
                if (anim.currentFrame === anim.frameCount - 1 ||
                    (prevFrame > 0 && anim.currentFrame === 0)) {
                    // Death animation complete - explode and remove
                    this.state = EnemyState.DEAD;
                    this.active = false;

                    // Explosion effect
                    if (typeof EffectsManager !== 'undefined') {
                        EffectsManager.addAnimatedExplosion(this.x, this.y, 'enemy', 25);
                        EffectsManager.addExplosion(this.x, this.y, 30, '#ff6600');
                    }
                }
            } else {
                // Fallback: no animation, just die immediately
                this.state = EnemyState.DEAD;
                this.active = false;
                if (typeof EffectsManager !== 'undefined') {
                    EffectsManager.addAnimatedExplosion(this.x, this.y, 'enemy', 25);
                }
            }
            return;
        }

        // STANDARD drones: play death animation then explode
        // Position is frozen (no movement)
        // No collision detection (can't be hit again)

        if (this.animations && this.animations.death) {
            const anim = this.animations.death;
            const prevFrame = anim.currentFrame;
            anim.update(deltaTime);

            // Animation completed when we reach the last frame (once mode)
            if (anim.currentFrame === anim.frameCount - 1 ||
                (prevFrame > 0 && anim.currentFrame === 0)) {
                // Death animation complete - explode and remove
                this.state = EnemyState.DEAD;
                this.active = false;

                // Explosion effect
                if (typeof EffectsManager !== 'undefined') {
                    EffectsManager.addAnimatedExplosion(this.x, this.y, 'enemy', 15);
                }
                if (typeof SoundManager !== 'undefined') {
                    SoundManager.enemyDeath();
                }
            }
        } else {
            // Fallback: no animation, just die immediately
            this.state = EnemyState.DEAD;
            this.active = false;
        }
    }

    checkBuildingCollision(x, y) {
        if (!buildingManager) return false;
        // Check if position collides with any building block
        for (const building of buildingManager.buildings) {
            // Quick AABB
            if (x < building.x || x > building.x + building.widthBlocks * 20 ||
                y < building.y) continue;

            for (let row = 0; row < building.heightBlocks; row++) {
                for (let col = 0; col < building.widthBlocks; col++) {
                    if (!building.blocks[row][col]) continue;

                    const pos = building.getBlockWorldPosition(row, col);
                    if (x > pos.x && x < pos.x + pos.width &&
                        y > pos.y && y < pos.y + pos.height) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // Check collision AND damage buildings (with cooldown)
    // For STANDARD drones, damage is deferred to attack animation completion
    checkBuildingCollisionDamage(x, y) {
        if (!buildingManager) return { hit: false, didDamage: false };

        const halfW = this.width / 2;
        const halfH = this.height / 2;

        for (const building of buildingManager.buildings) {
            // Quick AABB bounds check
            if (x + halfW < building.x || x - halfW > building.x + building.widthBlocks * CONFIG.BLOCK_SIZE ||
                y + halfH < building.y || y - halfH > building.y + building.heightBlocks * CONFIG.BLOCK_SIZE) {
                continue;
            }

            // Check individual blocks
            for (let row = 0; row < building.heightBlocks; row++) {
                for (let col = 0; col < building.widthBlocks; col++) {
                    if (!building.blocks[row][col]) continue;

                    const pos = building.getBlockWorldPosition(row, col);

                    // AABB collision
                    if (x + halfW > pos.x && x - halfW < pos.x + pos.width &&
                        y + halfH > pos.y && y - halfH < pos.y + pos.height) {

                        // Collision detected! Can we do damage?
                        if (this.collisionDamageCooldown <= 0) {
                            // STANDARD drones: defer damage to attack animation completion
                            if (this.type === EnemyType.STANDARD) {
                                this.collisionDamageCooldown = 3.0; // 3 second cooldown
                                return { hit: true, didDamage: true, building, row, col };
                            }

                            // Other types: immediate damage
                            building.destroyBlock(row, col);
                            this.collisionDamageCooldown = 3.0; // 3 second cooldown

                            // Visual feedback
                            if (typeof EffectsManager !== 'undefined') {
                                EffectsManager.addExplosion(pos.x + pos.width / 2, pos.y + pos.height / 2, 12, '#ff8800');
                            }
                            return { hit: true, didDamage: true, building, row, col };
                        }

                        // Cooldown active, no damage
                        return { hit: true, didDamage: false, building, row, col };
                    }
                }
            }
        }
        return { hit: false, didDamage: false };
    }

    // Find building with most blocks remaining (for Sand Carrier targeting)
    findBestTargetBuilding() {
        if (typeof buildingManager === 'undefined') return null;

        const buildings = buildingManager.buildings.filter(b => b.getBlockCount() > 0);
        if (buildings.length === 0) return null;

        // Check which buildings are already targeted by other sand carriers
        const targetedBuildings = new Set();
        if (typeof enemyManager !== 'undefined') {
            for (const other of enemyManager.enemies) {
                if (other !== this && other.type === EnemyType.SAND_CARRIER && other.active && other.targetBuilding) {
                    targetedBuildings.add(other.targetBuilding);
                }
            }
        }

        // Sort by block count (most first)
        buildings.sort((a, b) => b.getBlockCount() - a.getBlockCount());

        // Pick first non-targeted building, or first building with elevation offset
        for (const building of buildings) {
            if (!targetedBuildings.has(building)) {
                return building;
            }
        }

        // All buildings targeted - return most intact (will use elevation offset)
        return buildings[0];
    }

    // Find closest building to current position (for Sand Carrier retargeting)
    findClosestBuilding() {
        if (typeof buildingManager === 'undefined') return null;

        const buildings = buildingManager.buildings.filter(b => b.getBlockCount() > 0 && b !== this.targetBuilding);
        if (buildings.length === 0) {
            // No other buildings - stay at current or find any
            const any = buildingManager.buildings.filter(b => b.getBlockCount() > 0);
            return any.length > 0 ? any[0] : null;
        }

        let closest = null;
        let closestDist = Infinity;

        for (const building of buildings) {
            const bx = building.x + (building.widthBlocks * CONFIG.BLOCK_SIZE) / 2;
            const dist = Math.abs(bx - this.x);
            if (dist < closestDist) {
                closestDist = dist;
                closest = building;
            }
        }

        return closest;
    }

    die(forceImmediate = false) {
        // Decrement carrier-spawned drone count if this was spawned by a carrier
        if (this.isCarrierSpawned) {
            carrierSpawnedDroneCount = Math.max(0, carrierSpawnedDroneCount - 1);
            console.log(`Carrier-spawned drone died (global count: ${carrierSpawnedDroneCount})`);
        }

        // Handle Death Logic
        if (!forceImmediate && this.type === EnemyType.AGGRESSIVE && this.state !== EnemyState.FALLING) {
            // Aggressive ones fall first
            this.state = EnemyState.FALLING;
            this.fallSpeed = -100; // Hop up first
            if (typeof SoundManager !== 'undefined') SoundManager.enemyFalling();
            return;
        }

        // STANDARD drones: play death animation before dying
        if (!forceImmediate && this.type === EnemyType.STANDARD && this.state !== EnemyState.DYING && this.animations) {
            this.state = EnemyState.DYING;
            this.currentAnimName = 'death';
            if (this.animations.death) {
                this.animations.death.reset();
            }
            return;
        }

        // CARRIER (SPLITTER): takes multiple hits, then falls with death animation
        if (this.type === EnemyType.SPLITTER) {
            if (this.health > 1 && !forceImmediate) {
                this.health--;
                if (typeof SoundManager !== 'undefined') SoundManager.tankHit();
                if (typeof EffectsManager !== 'undefined') EffectsManager.addExplosion(this.x, this.y, 15, '#ffffff');
                return; // Survives
            }
            // Final hit - fall with death animation
            if (this.state !== EnemyState.FALLING) {
                this.state = EnemyState.FALLING;
                this.currentAnimName = 'death';
                if (this.animations && this.animations.death) {
                    this.animations.death.reset();
                }
                this.fallSpeed = -50; // Small hop up
                if (typeof SoundManager !== 'undefined') SoundManager.enemyFalling();
                return;
            }
        }

        // SAND_CARRIER: takes multiple hits, then falls with death animation
        if (this.type === EnemyType.SAND_CARRIER) {
            if (this.health > 1 && !forceImmediate) {
                this.health--;
                if (typeof SoundManager !== 'undefined') SoundManager.tankHit();
                if (typeof EffectsManager !== 'undefined') EffectsManager.addExplosion(this.x, this.y, 15, '#ffffff');
                return; // Survives
            }
            // Final hit - fall with death animation
            if (this.state !== EnemyState.FALLING) {
                this.state = EnemyState.FALLING;
                this.fallSpeed = -50;
                if (typeof SoundManager !== 'undefined') SoundManager.enemyFalling();
                return;
            }
        }

        // SCORPION: takes 6 hits, dies with death animation
        // If climbing, detach from wall and fall to ground first
        if (this.type === EnemyType.SCORPION) {
            if (this.health > 1 && !forceImmediate) {
                this.health--;
                if (typeof SoundManager !== 'undefined') SoundManager.tankHit();
                if (typeof EffectsManager !== 'undefined') EffectsManager.addExplosion(this.x, this.y, 15, '#ffffff');
                return; // Survives
            }
            // Final hit - play death animation
            if (this.state !== EnemyState.DYING && !forceImmediate) {
                // If climbing, detach and fall to ground first
                if (this.scorpionState === 'CLIMBING') {
                    this.y = CONFIG.STREET_Y - this.height / 2;
                    this.scorpionState = 'DEAD';
                }
                this.state = EnemyState.DYING;
                this.currentAnimName = 'death';
                if (this.animations && this.animations.death) {
                    this.animations.death.reset();
                }
                if (typeof SoundManager !== 'undefined') SoundManager.enemyDeath();
                if (typeof EffectsManager !== 'undefined') EffectsManager.addExplosion(this.x, this.y, 25, '#ff6600');
                return;
            }
        }

        // VULTURE_KING: Zone 2 mini-boss, takes 15 hits
        if (this.type === EnemyType.VULTURE_KING) {
            if (this.health > 1 && !forceImmediate) {
                this.health--;
                if (typeof SoundManager !== 'undefined') SoundManager.miniBossHit();
                if (typeof EffectsManager !== 'undefined') EffectsManager.addExplosion(this.x, this.y, 20, '#ffffff');
                return; // Survives
            }
            // Final hit - play death animation
            if (this.state !== EnemyState.DYING && !forceImmediate) {
                this.state = EnemyState.DYING;
                this.currentAnimName = 'death';
                this.deathAnimStartTime = null; // Reset for fresh death animation
                if (typeof SoundManager !== 'undefined') SoundManager.miniBossDefeat();
                if (typeof EffectsManager !== 'undefined') {
                    EffectsManager.addExplosion(this.x, this.y, 50, '#ff6600');
                    EffectsManager.shake(15);
                }
                return;
            }
        }

        // GUNSHIP (TANK): takes multiple hits, then plays death animation in place (no falling)
        if (this.type === EnemyType.TANK) {
            if (this.health > 1 && !forceImmediate) {
                this.health--;
                if (typeof SoundManager !== 'undefined') SoundManager.tankHit();
                // Flash white on hit
                if (typeof EffectsManager !== 'undefined') EffectsManager.addExplosion(this.x, this.y, 15, '#ffffff');
                return; // Survives
            }
            // Final hit - play death animation in place (not falling)
            if (this.state !== EnemyState.DYING && !forceImmediate) {
                this.state = EnemyState.DYING;
                this.currentAnimName = 'death';
                if (this.animations && this.animations.death) {
                    this.animations.death.reset();
                }
                if (typeof SoundManager !== 'undefined') SoundManager.enemyFalling();
                return;
            }
        }

        // SIEGE CRAWLER: weapon targeting - damage weapons first, then core when exposed
        if (this.type === EnemyType.SIEGE_CRAWLER) {
            if (!this.coreExposed) {
                // Damage a random active weapon system
                const activeWeapons = Object.entries(this.weapons).filter(([k, v]) => v.active);
                if (activeWeapons.length > 0) {
                    const [weaponName, weapon] = activeWeapons[Math.floor(Math.random() * activeWeapons.length)];
                    weapon.hp -= 1;
                    if (weapon.hp <= 0) {
                        weapon.active = false;
                        if (typeof EffectsManager !== 'undefined') {
                            EffectsManager.addExplosion(this.x, this.y - 20, 35, '#ff6600');
                            EffectsManager.addTextPopup(this.x, this.y - 50, `${weaponName.toUpperCase()} DESTROYED!`, '#ff4444');
                        }
                    } else {
                        if (typeof SoundManager !== 'undefined') SoundManager.tankHit();
                        if (typeof EffectsManager !== 'undefined') EffectsManager.addExplosion(this.x, this.y, 15, '#ffffff');
                    }
                    return; // Don't damage core while shielded
                }
            }
            // Core is exposed - take damage
            if (this.health > 1 && !forceImmediate) {
                this.health--;
                if (typeof SoundManager !== 'undefined') SoundManager.tankHit();
                if (typeof EffectsManager !== 'undefined') EffectsManager.addExplosion(this.x, this.y, 20, '#ff4444');
                return; // Survives
            }
            // Final hit - die with massive explosion
        }

        // Final Death
        this.state = EnemyState.DEAD;
        this.active = false;

        // Credit kill to nearest building for charge system (Zone 2)
        if (typeof game !== 'undefined' && game.currentZone === 2 && typeof buildingManager !== 'undefined') {
            const nearestBuilding = buildingManager.getNearestBuilding(this.x, this.y);
            if (nearestBuilding) {
                nearestBuilding.addKillCharge();
            }
        }

        // Explosion Juice
        if (typeof EffectsManager !== 'undefined') {
            // Smaller explosions for regular enemies, bigger for tanks
            let size = 15; // Default small
            if (this.type === EnemyType.TANK) size = 50;
            else if (this.type === EnemyType.BOMBER) size = 35;

            // Use animated explosion with metal debris
            EffectsManager.addAnimatedExplosion(this.x, this.y, 'enemy', size);

            // Screen Shake for big ones only
            if (this.type === EnemyType.TANK || this.type === EnemyType.BOMBER) {
                EffectsManager.shake(5);
            }
        }


        if (typeof SoundManager !== 'undefined') SoundManager.enemyDeath(); // Or crash sound
    }

    spawnSplitEnemies() {
        // Spawn 2 Standards
        if (typeof enemyManager !== 'undefined') {
            enemyManager.spawnSpecific(this.x - 20, this.y, EnemyType.STANDARD);
            enemyManager.spawnSpecific(this.x + 20, this.y, EnemyType.STANDARD);
        }
    }

    render(ctx) {
        if (this.state === EnemyState.DEAD) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.state === EnemyState.FALLING || this.type === EnemyType.BOMBER) {
            ctx.rotate(this.rotation);
        } else if (this.type !== EnemyType.SPLITTER && this.type !== EnemyType.SIEGE_CRAWLER && this.type !== EnemyType.VULTURE_KING && this.type !== EnemyType.SCORPION) {
            // Slight bank based on velocity (skip for carrier, ground units, vulture, and scorpion - stays horizontal)
            ctx.rotate(this.velX * 0.2);
        }

        switch (this.type) {
            case EnemyType.STANDARD: this.renderDrone(ctx); break;
            case EnemyType.AGGRESSIVE: this.renderInterceptor(ctx); break;
            case EnemyType.TANK: this.renderGunship(ctx); break;
            case EnemyType.SPLITTER: this.renderCarrier(ctx); break;
            case EnemyType.BOMBER: this.renderMissile(ctx); break;
            case EnemyType.DUST_DEVIL: this.renderDustDevil(ctx); break;
            case EnemyType.SANDWORM: this.renderSandworm(ctx); break;
            case EnemyType.SAND_CARRIER: this.renderSandCarrier(ctx); break;
            case EnemyType.SCORPION: this.renderScorpion(ctx); break;
            case EnemyType.VULTURE_KING: this.renderVultureKing(ctx); break;
            case EnemyType.SANDSTORM_COLOSSUS: this.renderSandstormColossus(ctx); break;
            case EnemyType.SIEGE_CRAWLER: this.renderSiegeCrawler(ctx); break;
        }

        ctx.restore();
    }

    // --- RENDER HELPERS ---

    renderDrone(ctx) { // Standard
        // Lazy initialize animations if needed
        if (!this.animations) {
            this.initDroneAnimations();
        }

        // Try animated sprite first
        if (this.animations) {
            const currentAnim = this.animations[this.currentAnimName];
            if (currentAnim) {
                ctx.save();

                // Apply horizontal flip if facing left
                if (!this.facingRight) {
                    ctx.scale(-1, 1);
                }

                // Apply tilt based on vertical velocity (±20° max)
                const tilt = Math.max(-0.35, Math.min(0.35, this.velY * 0.015));
                ctx.rotate(tilt);

                // Render the animation at center
                currentAnim.render(ctx, 0, 0);

                ctx.restore();
                return;
            }
        }

        // Fallback: Try static sprite
        const sprite = typeof AssetManager !== 'undefined' ? AssetManager.getImage('enemy_drone') : null;
        if (sprite) {
            // Draw solid (no additive blending) at +25% size: 40x40 from 32x32
            ctx.drawImage(sprite, -20, -20, 40, 40);
            return;
        }

        // Fallback: Metallic Sphere body with sheen
        const gradient = ctx.createRadialGradient(-3, -3, 0, 0, 0, 12);
        gradient.addColorStop(0, '#64748b');
        gradient.addColorStop(0.5, '#475569');
        gradient.addColorStop(1, '#334155');
        ctx.fillStyle = gradient;
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();

        // Metallic highlight
        ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.beginPath(); ctx.arc(-3, -3, 4, 0, Math.PI * 2); ctx.fill();

        // Center Eye with glow
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#a855f7';
        ctx.fillStyle = '#a855f7';
        ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        // Eye inner core
        ctx.fillStyle = '#e879f9';
        ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-1, -1, 1, 0, Math.PI * 2); ctx.fill();

        // Antenna
        ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, -16); ctx.stroke();

        // Thruster with glow
        const thrust = 14 + Math.random() * 4;
        ctx.fillStyle = '#1d4ed8';
        ctx.beginPath(); ctx.moveTo(-4, 8); ctx.lineTo(0, thrust); ctx.lineTo(4, 8); ctx.fill();
        ctx.fillStyle = '#60a5fa';
        ctx.beginPath(); ctx.moveTo(-2, 8); ctx.lineTo(0, thrust - 3); ctx.lineTo(2, 8); ctx.fill();
    }

    renderInterceptor(ctx) { // Aggressive
        // Lazy initialize animations if needed
        if (!this.animations) {
            this.initAggressiveAnimations();
        }

        // Try animated sprite first
        if (this.animations) {
            let currentAnim = this.animations[this.currentAnimName];

            // If attack animation is complete, use fly animation as fallback to prevent disappearing
            if (this.currentAnimName === 'attack' && currentAnim && currentAnim.isComplete) {
                currentAnim = this.animations.fly;
            }

            if (currentAnim) {
                ctx.save();

                // Apply horizontal flip if facing left (skip during falling - use rotation instead)
                if (this.state !== EnemyState.FALLING && !this.facingRight) {
                    ctx.scale(-1, 1);
                }

                // Apply tilt based on vertical velocity (skip during falling)
                if (this.state !== EnemyState.FALLING) {
                    const tilt = Math.max(-0.35, Math.min(0.35, this.velY * 0.015));
                    ctx.rotate(tilt);
                }

                // Render the animation at center
                currentAnim.render(ctx, 0, 0);

                ctx.restore();
                return;
            }
        }

        // Fallback: Try static sprite
        const sprite = typeof AssetManager !== 'undefined' ? AssetManager.getImage('enemy_interceptor') : null;
        if (sprite) {
            // Draw solid at +25% size: 50x40 from 40x32
            ctx.drawImage(sprite, -25, -20, 50, 40);
            return;
        }

        // Fallback: Sharp triangular shape
        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        ctx.moveTo(0, 10);
        ctx.lineTo(-12, -8);
        ctx.lineTo(0, -2);
        ctx.lineTo(12, -8);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-4, -4, 8, 4);

        const thrust = Math.random() * 5;
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-8, -8, 4, -4 - thrust);
        ctx.fillRect(4, -8, 4, -4 - thrust);
    }

    renderGunship(ctx) { // Tank (96x96 animated sprite)
        // Lazy initialize animations if needed
        if (!this.animations) {
            this.initGunshipAnimations();
        }

        // Try animated sprite first
        if (this.animations) {
            const currentAnim = this.animations[this.currentAnimName];
            if (currentAnim) {
                ctx.save();

                // Apply horizontal flip based on facing direction (skip during dying)
                // Sprites face RIGHT by default, so flip when facing left
                if (this.state !== EnemyState.DYING && !this.facingRight) {
                    ctx.scale(-1, 1);
                }

                // Apply slight nose-down tilt (about 10 degrees)
                const noseTilt = 0.17;  // ~10 degrees in radians
                ctx.rotate(noseTilt);

                // Render the animation at center
                currentAnim.render(ctx, 0, 0);

                // Draw health bar above gunship (only when not dying)
                if (this.state !== EnemyState.DYING && this.health > 0) {
                    // Undo rotation and flip for health bar to render level
                    ctx.rotate(-noseTilt);
                    if (!this.facingRight) {
                        ctx.scale(-1, 1);
                    }
                    for (let i = 0; i < this.health; i++) {
                        ctx.fillStyle = '#4ade80';
                        ctx.fillRect(-20 + i * 12, -55, 8, 5);
                    }
                }

                ctx.restore();
                return;
            }
        }

        // Fallback: Try static sprite
        const sprite = typeof AssetManager !== 'undefined' ? AssetManager.getImage('enemy_gunship') : null;
        if (sprite) {
            // Draw solid at 96x96 size
            ctx.drawImage(sprite, -48, -48, 96, 96);

            // Draw health bar
            if (this.health > 0) {
                for (let i = 0; i < this.health; i++) {
                    ctx.fillStyle = '#4ade80';
                    ctx.fillRect(-20 + i * 12, -55, 8, 5);
                }
            }
            return;
        }

        // Fallback: Bulky Rectangle (original geometry)
        ctx.fillStyle = '#064e3b';
        ctx.fillRect(-40, -30, 80, 60);

        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.strokeRect(-38, -28, 76, 56);
        ctx.strokeRect(-20, -10, 40, 20);

        ctx.fillStyle = '#111';
        ctx.fillRect(-44, 10, -8, 16);
        ctx.fillRect(44, 10, 8, 16);

        if (this.health > 0) {
            for (let i = 0; i < this.health; i++) {
                ctx.fillStyle = '#4ade80';
                ctx.fillRect(-20 + i * 12, -40, 8, 5);
            }
        }
    }

    renderCarrier(ctx) { // Splitter (96x96 sprite)
        // Lazy initialize animations if needed
        if (!this.animations) {
            this.initCarrierAnimations();
        }

        // Try animated sprite first
        if (this.animations) {
            const currentAnim = this.animations[this.currentAnimName];
            if (currentAnim) {
                ctx.save();

                // Apply horizontal flip based on movement direction (skip during falling)
                if (this.state !== EnemyState.FALLING && !this.facingRight) {
                    ctx.scale(-1, 1);
                }

                // Render the animation at center
                currentAnim.render(ctx, 0, 0);

                // Draw health bar above carrier (only when not falling)
                if (this.state !== EnemyState.FALLING && this.health > 0) {
                    // Need to unflip for health bar to render correctly
                    if (!this.facingRight) {
                        ctx.scale(-1, 1);
                    }
                    for (let i = 0; i < this.health; i++) {
                        ctx.fillStyle = '#4ade80';
                        ctx.fillRect(-20 + i * 14, -55, 10, 5);
                    }
                }

                ctx.restore();
                return;
            }
        }

        // Fallback: Try static sprite
        const sprite = typeof AssetManager !== 'undefined' ? AssetManager.getImage('enemy_carrier') : null;
        if (sprite) {
            // Draw solid at 96x96 size
            ctx.drawImage(sprite, -48, -48, 96, 96);

            // Draw health bar
            if (this.health > 0) {
                for (let i = 0; i < this.health; i++) {
                    ctx.fillStyle = '#4ade80';
                    ctx.fillRect(-20 + i * 14, -55, 10, 5);
                }
            }
            return;
        }

        // Fallback: Cyan angular shape
        ctx.fillStyle = '#0e7490';
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(30, 0);
        ctx.lineTo(0, 20);
        ctx.lineTo(-30, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#06b6d4';
        ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(20, 0); ctx.stroke();

        // Draw health bar
        if (this.health > 0) {
            for (let i = 0; i < this.health; i++) {
                ctx.fillStyle = '#4ade80';
                ctx.fillRect(-20 + i * 14, -35, 10, 5);
            }
        }
    }

    renderMissile(ctx) { // Bomber
        // Try sprite first
        const sprite = typeof AssetManager !== 'undefined' ? AssetManager.getImage('enemy_missile') : null;
        if (sprite) {
            // Draw solid at +56% size: 50x50 from original 32x32
            ctx.drawImage(sprite, -25, -25, 50, 50);
            return;
        }

        // Fallback: Missile shape
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.moveTo(0, 10);
        ctx.lineTo(6, -8);
        ctx.lineTo(-6, -8);
        ctx.closePath();
        ctx.fill();

        // Fins
        ctx.fillStyle = '#7c2d12';
        ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(10, -10); ctx.lineTo(-10, -10); ctx.fill();

        // Flame
        ctx.fillStyle = Math.random() > 0.5 ? '#ffff00' : '#ff0000';
        ctx.beginPath(); ctx.moveTo(-4, -10); ctx.lineTo(0, -20 - Math.random() * 10); ctx.lineTo(4, -10); ctx.fill();
    }

    renderDustDevil(ctx) {
        // Sprite: 4-frame horizontal strip per 2D game skill (64x64 per frame)
        const sprite = typeof AssetManager !== 'undefined' ? AssetManager.getImage('zone2_dust_devil') : null;

        if (sprite && sprite.width > 0) {
            // 4 frames in horizontal row, 12 FPS animation
            const frameCount = 4;
            const frameWidth = sprite.width / frameCount;
            const frameHeight = sprite.height;
            const frameIndex = Math.floor(Date.now() / 83) % frameCount; // ~12 FPS

            // Scale to enemy size (24px hitbox, display at 40px)
            const displaySize = 40;

            ctx.save();
            ctx.rotate(Date.now() / 500); // Slow rotation for spinning effect
            ctx.drawImage(
                sprite,
                frameIndex * frameWidth, 0, frameWidth, frameHeight,
                -displaySize / 2, -displaySize / 2, displaySize, displaySize
            );
            ctx.restore();
            return;
        }

        // Procedural fallback
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

        ctx.fillStyle = '#a08060';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    renderSandworm(ctx) {
        // Sprite: 4-frame horizontal strip per 2D game skill (64x64 per frame)
        const sprite = typeof AssetManager !== 'undefined' ? AssetManager.getImage('zone2_sandworm') : null;

        if (sprite && sprite.width > 0) {
            // 4 frames in horizontal row, 12 FPS animation
            const frameCount = 4;
            const frameWidth = sprite.width / frameCount;
            const frameHeight = sprite.height;
            const frameIndex = Math.floor(Date.now() / 83) % frameCount; // ~12 FPS

            // Scale to enemy size (display at 64px)
            const displaySize = 64;

            ctx.drawImage(
                sprite,
                frameIndex * frameWidth, 0, frameWidth, frameHeight,
                -displaySize / 2, -displaySize / 2, displaySize, displaySize
            );
            return;
        }

        // Procedural fallback
        // Note: ctx already translated to (this.x, this.y) by render()
        if (!this.isSurfacing) {
            // Burrowing - sand trail
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

    renderSandCarrier(ctx) {
        // State-based sprite rendering for Zone 2 Sand Carrier
        // Sprites: 128x128 frames, 8 FPS (125ms per frame)
        const FPS_INTERVAL = 125; // 8 FPS

        // Determine current state and select appropriate sprite
        let spriteKey = 'z2_carrier_fly';  // Default state
        let isDying = this.health <= 0;

        // Attack state: when actively attacking
        if (this.isAttacking && !isDying) {
            spriteKey = 'z2_carrier_attack';
        }

        // Death state overrides all others
        if (isDying) {
            spriteKey = 'z2_carrier_death';
        }

        const sprite = typeof AssetManager !== 'undefined' ? AssetManager.getImage(spriteKey) : null;

        if (sprite && sprite.width > 0) {
            // Dynamic frame size from filename convention (128x128)
            const frameSize = 128;

            // Calculate grid dimensions from sprite dimensions
            const cols = Math.floor(sprite.width / frameSize);
            const rows = Math.floor(sprite.height / frameSize);
            const totalFrames = Math.max(1, cols * rows);

            // Calculate frame index based on animation state
            let frameIndex;
            if (isDying) {
                // Death: play once, hold last frame
                if (!this.deathAnimStartTime) {
                    this.deathAnimStartTime = Date.now();
                }
                const elapsed = Date.now() - this.deathAnimStartTime;
                frameIndex = Math.min(Math.floor(elapsed / FPS_INTERVAL), totalFrames - 1);
            } else if (this.isAttacking) {
                // Attack: use internal attack frame counter
                frameIndex = Math.min(this.attackAnimFrame, totalFrames - 1);
            } else {
                // Fly: loop animation
                frameIndex = Math.floor(Date.now() / FPS_INTERVAL) % totalFrames;
            }

            // Convert to row/col position in sprite sheet
            const col = frameIndex % cols;
            const row = Math.floor(frameIndex / cols);

            // Display size (match hitbox size 96x96)
            const displaySize = 128;

            ctx.save();
            if (!this.carrierMovingRight) ctx.scale(-1, 1);
            ctx.drawImage(
                sprite,
                col * frameSize, row * frameSize, frameSize, frameSize,
                -displaySize / 2, -displaySize / 2, displaySize, displaySize
            );

            // Health bar (unflip if needed)
            if (this.health > 0) {
                if (!this.carrierMovingRight) ctx.scale(-1, 1);
                for (let i = 0; i < this.health; i++) {
                    ctx.fillStyle = '#4ade80';
                    ctx.fillRect(-20 + i * 14, -55, 10, 5);
                }
            }
            ctx.restore();
            return;
        }

        // Procedural fallback
        // Note: ctx already translated to (this.x, this.y) by render()
        ctx.save();
        if (!this.carrierMovingRight) ctx.scale(-1, 1);

        // Large carrier body (procedural)
        ctx.fillStyle = '#5c4a3d';
        ctx.beginPath();
        ctx.ellipse(0, 0, 45, 25, 0, 0, Math.PI * 2);
        ctx.fill();

        // Sand/dust texture
        ctx.fillStyle = '#8b7355';
        ctx.beginPath();
        ctx.ellipse(0, -5, 35, 15, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pod bay
        ctx.fillStyle = '#3d3020';
        ctx.fillRect(-20, 15, 40, 10);

        // Wings
        ctx.fillStyle = '#4a3d30';
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.lineTo(-50, -15);
        ctx.lineTo(-45, 5);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(30, 0);
        ctx.lineTo(50, -15);
        ctx.lineTo(45, 5);
        ctx.closePath();
        ctx.fill();

        // Health bar (unflip if needed for correct rendering)
        if (this.health > 0) {
            if (!this.carrierMovingRight) {
                ctx.scale(-1, 1);
            }
            for (let i = 0; i < this.health; i++) {
                ctx.fillStyle = '#4ade80';
                ctx.fillRect(-20 + i * 14, -35, 10, 5);
            }
        }

        ctx.restore();
    }

    renderScorpion(ctx) {
        // Lazy initialize animations if needed
        if (!this.animations) {
            this.initScorpionAnimations();
        }

        // Try animated sprite first
        if (this.animations) {
            const currentAnim = this.animations[this.currentAnimName];
            if (currentAnim) {
                ctx.save();

                // Apply horizontal flip if facing left
                // Sprites face RIGHT by default
                if (!this.facingRight) {
                    ctx.scale(-1, 1);
                }

                // For climbing state, rotate 90 degrees to face upward along wall
                if (this.scorpionState === 'CLIMBING') {
                    // Rotate to face up the wall
                    // If on left side of building, rotate -90 degrees (face right/up)
                    // If on right side, rotate 90 degrees (face left/up)
                    if (this.climbSide === 'left') {
                        ctx.rotate(-Math.PI / 2); // -90 degrees
                    } else {
                        ctx.rotate(Math.PI / 2); // 90 degrees
                    }
                    // Undo the flip since rotation handles orientation
                    if (!this.facingRight) {
                        ctx.scale(-1, 1);
                    }
                }

                // For falling state, apply tumble rotation
                if (this.scorpionState === 'FALLING') {
                    ctx.rotate(this.rotation || 0);
                }

                // Render the animation at center
                currentAnim.render(ctx, 0, 0);

                ctx.restore();

                // Draw health bar (not rotated)
                this.renderHealthBar(ctx);
                return;
            }
        }

        // Procedural fallback
        // Note: ctx already translated to (this.x, this.y) by render()
        ctx.save();

        // Apply flip for facing direction
        if (!this.facingRight) {
            ctx.scale(-1, 1);
        }

        // Rotate for climbing
        if (this.scorpionState === 'CLIMBING') {
            if (this.climbSide === 'left') {
                ctx.rotate(-Math.PI / 2);
            } else {
                ctx.rotate(Math.PI / 2);
            }
            if (!this.facingRight) {
                ctx.scale(-1, 1);
            }
        }

        // Rotate for falling
        if (this.scorpionState === 'FALLING') {
            ctx.rotate(this.rotation || 0);
        }

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

        ctx.restore();

        // Health bar
        this.renderHealthBar(ctx);
    }

    renderVultureKing(ctx) {
        // RENDER DEBRIS (Carried or Falling)
        if (this.hasDebris && this.debrisTargetBuilding) {

            // 1. CARRIED DEBRIS (Not yet released)
            if (!this.debrisReleased) {
                ctx.save();
                // Check facing to position correctly under "feet"
                const carryOffsetX = this.facingRight ? 5 : -5;
                const carryOffsetY = 25;

                // Draw boulder being carried
                this.debrisShape.forEach(p => {
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(carryOffsetX + p.x, carryOffsetY + p.y, p.r, 0, Math.PI * 2);
                    ctx.fill();
                });

                ctx.restore();
            }
            // 2. FALLING DEBRIS (After release - falls straight down)
            else {
                ctx.save();
                // Debris is in world coordinates, so we need to undo the translate to (this.x, this.y)
                ctx.translate(-this.x, -this.y);

                const debrisX = this.debrisX;
                const debrisY = this.debrisY;

                // --- TRAILING PARTICLES ---
                const time = Date.now();
                if (time % 40 < 20) { // Add some intermittency
                    ctx.fillStyle = Math.random() > 0.5 ? '#8B7355' : '#888888';
                    const pX = debrisX + (Math.random() - 0.5) * 20;
                    const pY = debrisY - 20 - Math.random() * 30;
                    ctx.beginPath();
                    ctx.arc(pX, pY, 2 + Math.random() * 3, 0, Math.PI * 2);
                    ctx.fill();
                }

                // --- FALLING BOULDER CLUSTER ---
                this.debrisShape.forEach(p => {
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(debrisX + p.x, debrisY + p.y, p.r, 0, Math.PI * 2);
                    ctx.fill();
                });

                // Dust trail
                ctx.fillStyle = 'rgba(180, 160, 130, 0.4)';
                ctx.beginPath();
                ctx.ellipse(debrisX, debrisY - 30, 30, 40, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }
        }

        // RENDER SPEED LINES during swoop attacks
        if (this.bossPhase === 'playerSwoop' || this.bossPhase === 'buildingDive') {
            ctx.save();

            // Calculate movement direction for speed lines
            let moveAngle;
            if (this.bossPhase === 'playerSwoop') {
                moveAngle = Math.atan2(this.swoopTargetY - this.y, this.swoopTargetX - this.x);
            } else {
                // Building dive - generally downward
                moveAngle = Math.PI / 2; // Pointing down
            }

            // Draw 5-7 speed lines trailing behind vulture
            const lineCount = 5 + Math.floor(Math.random() * 3);
            for (let i = 0; i < lineCount; i++) {
                // Lines trail BEHIND the vulture (opposite of movement direction)
                const trailAngle = moveAngle + Math.PI + (Math.random() - 0.5) * 0.6;
                const startDist = 30 + Math.random() * 20;
                const lineLength = 40 + Math.random() * 60;

                const startX = Math.cos(trailAngle) * startDist;
                const startY = Math.sin(trailAngle) * startDist;
                const endX = startX + Math.cos(trailAngle) * lineLength;
                const endY = startY + Math.sin(trailAngle) * lineLength;

                // Animated offset for streaming effect
                const timeOffset = (Date.now() / 50 + i * 20) % 100;
                const alpha = 0.3 + Math.sin(timeOffset * 0.1) * 0.2;

                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.lineWidth = 2 + Math.random();
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }

            ctx.restore();
        }

        // Get appropriate sprite based on animation state
        let spriteKey;
        if (this.state === EnemyState.DYING || this.state === EnemyState.DEAD) {
            spriteKey = 'z2_vulture_death';
        } else if (this.currentAnimName === 'attack') {
            spriteKey = 'z2_vulture_attack';
        } else {
            spriteKey = 'z2_vulture_fly';
        }

        const sprite = typeof AssetManager !== 'undefined' ? AssetManager.getImage(spriteKey) : null;

        if (sprite && sprite.width > 0) {
            // 192x192 sprite sheets - calculate frame layout
            const frameSize = 192;
            const cols = Math.floor(sprite.width / frameSize);
            const rows = Math.floor(sprite.height / frameSize);

            // Use explicit frame counts to avoid empty frame flicker
            // Fly: typically 8 frames, Attack: typically 8 frames, Death: typically 8 frames
            let actualFrameCount;
            if (spriteKey === 'z2_vulture_fly') {
                actualFrameCount = Math.min(cols * rows, 8); // Cap at 8 frames for fly
            } else if (spriteKey === 'z2_vulture_attack') {
                actualFrameCount = Math.min(cols * rows, 8); // Cap at 8 frames for attack
            } else {
                actualFrameCount = Math.min(cols * rows, 8); // Cap at 8 frames for death
            }

            // Animation timing
            let frameDelay;
            if (spriteKey === 'z2_vulture_death') {
                frameDelay = 120; // Slower death animation
            } else if (spriteKey === 'z2_vulture_attack') {
                frameDelay = 100; // Attack (10 FPS)
            } else {
                frameDelay = 100; // Fly (10 FPS)
            }

            // Calculate frame
            let frameIndex;

            if (spriteKey === 'z2_vulture_death') {
                // One-shot death animation - freeze on last frame
                if (!this.deathAnimStartTime) {
                    this.deathAnimStartTime = Date.now();
                }
                frameIndex = Math.min(
                    Math.floor((Date.now() - this.deathAnimStartTime) / frameDelay),
                    actualFrameCount - 1
                );
            } else if (spriteKey === 'z2_vulture_attack') {
                // One-shot attack animation - freeze on last frame
                if (!this.attackAnimStartTime) {
                    this.attackAnimStartTime = Date.now();
                }
                frameIndex = Math.min(
                    Math.floor((Date.now() - this.attackAnimStartTime) / frameDelay),
                    actualFrameCount - 1
                );
            } else {
                // Fly animation - loops normally
                // Reset attack anim timer when switching to fly
                this.attackAnimStartTime = null;
                frameIndex = Math.floor(Date.now() / frameDelay) % actualFrameCount;
            }

            const row = Math.floor(frameIndex / cols);
            const col = frameIndex % cols;

            // Display larger for mini-boss visibility (80x80 minimum)
            const displaySize = Math.max(this.width, 80);

            ctx.save();

            // Flip sprite based on facing direction
            if (!this.facingRight) {
                ctx.scale(-1, 1);
            }

            ctx.drawImage(
                sprite,
                col * frameSize + 1, row * frameSize + 1, frameSize - 2, frameSize - 2,
                -displaySize / 2, -displaySize / 2, displaySize, displaySize
            );

            ctx.restore();

            // Health bar (larger for boss)
            this.renderHealthBar(ctx, 70);
            return;
        }

        // Procedural fallback if no sprites
        ctx.save();

        // Flip for facing direction
        if (!this.facingRight) {
            ctx.scale(-1, 1);
        }

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

        ctx.restore();

        // Health bar (larger for boss)
        this.renderHealthBar(ctx, 70);
    }

    renderSandstormColossus(ctx) {
        // Render sandstorm overlay first (behind everything)
        if (this.sandstormAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = this.sandstormAlpha;
            ctx.fillStyle = '#c4a35a';
            ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

            // Swirling dust particles
            const time = Date.now() / 500;
            for (let i = 0; i < 20; i++) {
                const px = (Math.sin(time + i * 0.5) * 0.5 + 0.5) * CONFIG.CANVAS_WIDTH;
                const py = (Math.cos(time * 0.7 + i * 0.3) * 0.5 + 0.5) * CONFIG.CANVAS_HEIGHT;
                ctx.globalAlpha = this.sandstormAlpha * 0.5;
                ctx.beginPath();
                ctx.arc(px, py, 10 + Math.sin(time + i) * 5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        if (!this.movingRight) ctx.scale(-1, 1);

        // Massive carrier body
        ctx.fillStyle = '#5a4a3a';
        ctx.beginPath();
        ctx.ellipse(0, 0, 60, 35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Sand armor plating
        ctx.fillStyle = '#8b7355';
        ctx.beginPath();
        ctx.ellipse(0, -10, 50, 25, 0, 0, Math.PI * 2);
        ctx.fill();

        // Drone bay (glowing)
        const glow = 0.5 + Math.sin(Date.now() / 200) * 0.3;
        ctx.fillStyle = `rgba(255, 100, 50, ${glow})`;
        ctx.fillRect(-30, 20, 60, 15);

        // Wing-like protrusions
        ctx.fillStyle = '#4a3a2a';
        ctx.beginPath();
        ctx.moveTo(-40, 0);
        ctx.lineTo(-70, -25);
        ctx.lineTo(-65, 15);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(40, 0);
        ctx.lineTo(70, -25);
        ctx.lineTo(65, 15);
        ctx.closePath();
        ctx.fill();

        // Eye/sensor
        ctx.fillStyle = '#ff4400';
        ctx.beginPath();
        ctx.arc(-20, -20, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Health bar (large for boss)
        this.renderHealthBar(ctx, 100);
    }

    renderSiegeCrawler(ctx) {
        // Note: ctx already translated to (this.x, this.y) by render()

        // Treads
        ctx.fillStyle = '#333333';
        ctx.fillRect(-70, 30, 60, 20);
        ctx.fillRect(10, 30, 60, 20);

        // Main body
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(-60, -20, 120, 50);

        // Armor plating
        ctx.fillStyle = '#5a5a5a';
        ctx.fillRect(-50, -30, 100, 15);

        // Weapon systems (color-coded by status)
        // Missile Pods (left/right)
        ctx.fillStyle = this.weapons.missilePods.active ? '#666666' : '#333333';
        ctx.fillRect(-55, -25, 20, 25);
        ctx.fillRect(35, -25, 20, 25);

        // Drone Bay (center top)
        ctx.fillStyle = this.weapons.droneBay.active ? '#556655' : '#333333';
        ctx.fillRect(-20, -40, 40, 15);

        // Mortar Cannon (center)
        ctx.fillStyle = this.weapons.mortarCannon.active ? '#665555' : '#333333';
        ctx.beginPath();
        ctx.arc(0, -15, 15, 0, Math.PI * 2);
        ctx.fill();

        // Shield Generator (back)
        ctx.fillStyle = this.weapons.shieldGenerator.active ? '#4488ff' : '#333333';
        ctx.fillRect(-15, 5, 30, 20);
        if (this.weapons.shieldGenerator.active) {
            // Shield effect
            ctx.strokeStyle = `rgba(68, 136, 255, ${0.3 + Math.sin(Date.now() / 200) * 0.2})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(0, 0, 75, 55, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Core (glows when exposed)
        if (this.coreExposed) {
            const pulse = 0.5 + Math.sin(Date.now() / 150) * 0.3;
            ctx.fillStyle = `rgba(255, 50, 50, ${pulse})`;
            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, Math.PI * 2);
            ctx.fill();
        }

        // Health bar showing total weapon HP + core (relative to translated origin)
        const totalMaxHp = 4 + 8 + 10 + 6 + 15; // 43 total
        const currentHp =
            (this.weapons.missilePods.active ? this.weapons.missilePods.hp : 0) +
            (this.weapons.droneBay.active ? this.weapons.droneBay.hp : 0) +
            (this.weapons.mortarCannon.active ? this.weapons.mortarCannon.hp : 0) +
            (this.weapons.shieldGenerator.active ? this.weapons.shieldGenerator.hp : 0) +
            this.health;

        const barWidth = 120;
        const barHeight = 8;
        const barX = -barWidth / 2;
        const barY = -70;

        ctx.fillStyle = '#333333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = this.coreExposed ? '#ff4444' : '#44ff44';
        ctx.fillRect(barX, barY, barWidth * (currentHp / totalMaxHp), barHeight);
    }

    renderHealthBar(ctx, width = 40) {
        // Draw health bar above enemy
        if (this.health > 0 && this.maxHealth > 1) {
            const barWidth = width;
            const barHeight = 4;
            const barY = -this.height / 2 - 10;

            // Background
            ctx.fillStyle = '#333333';
            ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);

            // Health fill
            const healthPct = this.health / this.maxHealth;
            ctx.fillStyle = healthPct > 0.5 ? '#4ade80' : (healthPct > 0.25 ? '#fbbf24' : '#ef4444');
            ctx.fillRect(-barWidth / 2, barY, barWidth * healthPct, barHeight);

            // Border
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.strokeRect(-barWidth / 2, barY, barWidth, barHeight);
        }
    }
}

class Boss {
    constructor() {
        this.x = CONFIG.CANVAS_WIDTH / 2;
        this.y = CONFIG.SKY_TOP + 100;
        this.width = 120; // Much bigger
        this.height = 80;
        this.health = 40;
        this.maxHealth = 40;
        this.speed = 30;

        this.active = true;
        this.direction = 1;
        this.phase = 0; // 0: Hover, 1: Strafe
        this.timer = 0;
        this.shootTimer = 0;
        this.shootInterval = 1.8;

        // Animation
        this.swoopPhase = 0;
        this.engineFlicker = 0;
        this.damageFlash = 0;
    }

    update(deltaTime, playerX, playerY, projectileManager) {
        this.timer += deltaTime;
        this.engineFlicker += deltaTime * 15;
        if (this.damageFlash > 0) this.damageFlash -= deltaTime * 5;

        // Movement Logic: Hover and Strafe
        this.swoopPhase += deltaTime;
        this.x += this.direction * this.speed * deltaTime;
        this.y = CONFIG.SKY_TOP + 100 + Math.sin(this.swoopPhase) * 30;

        if (this.x > CONFIG.CANVAS_WIDTH - 100) this.direction = -1;
        if (this.x < 100) this.direction = 1;

        // Shooting
        this.shootTimer += deltaTime;
        if (this.shootTimer > this.shootInterval) {
            this.shootTimer = 0;
            this.fire(projectileManager, playerX, playerY);
        }
    }

    fire(projectileManager, px, py) {
        // Multi-shot pattern
        const spread = 3;
        for (let i = 0; i < spread; i++) {
            const angle = Math.atan2(py - this.y, px - this.x) + (i - 1) * 0.2;
            projectileManager.add(this.x, this.y + 40, angle * 180 / Math.PI, 250, false);
        }
        if (typeof SoundManager !== 'undefined') SoundManager.shoot();
    }

    takeDamage() {
        this.health--;
        this.damageFlash = 1;
        if (typeof EffectsManager !== 'undefined') {
            EffectsManager.addExplosion(this.x + (Math.random() - 0.5) * 40, this.y + (Math.random() - 0.5) * 40, 20, '#ff0000');
        }
        if (this.health <= 0) {
            this.active = false;
            // Big Boom
            if (typeof EffectsManager !== 'undefined') {
                for (let i = 0; i < 10; i++) {
                    setTimeout(() => EffectsManager.addExplosion(this.x + (Math.random() - 0.5) * 100, this.y + (Math.random() - 0.5) * 60, 60, '#ff4400'), i * 100);
                }
                EffectsManager.shake(20);
                EffectsManager.hitStop(CONFIG.HIT_STOP_BOSS);
            }
            return true;
        }
        return false;
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Try sprite first
        const sprite = typeof AssetManager !== 'undefined' ? AssetManager.getImage('boss_main') : null;
        if (sprite) {
            // Additive blend for black background transparency
            ctx.globalCompositeOperation = 'lighter';
            ctx.drawImage(sprite, -80, -60, 160, 120);
            ctx.globalCompositeOperation = 'source-over';

            // Damage flash overlay
            if (this.damageFlash > 0) {
                ctx.fillStyle = `rgba(255, 255, 255, ${this.damageFlash * 0.5})`;
                ctx.fillRect(-80, -60, 160, 120);
            }

            // Health Bar (always draw on top)
            const hpPct = this.health / this.maxHealth;
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(-50, -75, 100, 10);
            ctx.strokeStyle = '#4b5563';
            ctx.strokeRect(-50, -75, 100, 10);
            const hpColor = hpPct < 0.3 ? '#ef4444' : hpPct < 0.6 ? '#f59e0b' : '#22c55e';
            ctx.fillStyle = hpColor;
            ctx.fillRect(-48, -73, 96 * hpPct, 6);

            ctx.restore();
            return;
        }

        // Fallback: Code-drawn boss
        const flashColor = this.damageFlash > 0 ? '#fff' : null;

        const bodyGradient = ctx.createLinearGradient(0, -50, 0, 50);
        bodyGradient.addColorStop(0, flashColor || '#374151');
        bodyGradient.addColorStop(0.5, flashColor || '#1f2937');
        bodyGradient.addColorStop(1, flashColor || '#111827');
        ctx.fillStyle = bodyGradient;

        ctx.beginPath();
        ctx.moveTo(0, 50);
        ctx.lineTo(-70, 10);
        ctx.lineTo(-80, -20);
        ctx.lineTo(-50, -50);
        ctx.lineTo(50, -50);
        ctx.lineTo(80, -20);
        ctx.lineTo(70, 10);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#4b5563';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-60, -10);
        ctx.lineTo(60, -10);
        ctx.moveTo(-50, 10);
        ctx.lineTo(50, 10);
        ctx.stroke();

        ctx.fillStyle = flashColor || '#1e293b';
        ctx.fillRect(-85, -30, 15, 40);
        ctx.fillRect(70, -30, 15, 40);

        ctx.fillStyle = flashColor || '#0f172a';
        ctx.fillRect(-75, 0, 20, 25);
        ctx.fillRect(55, 0, 20, 25);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-72, 20, 14, 5);
        ctx.fillRect(58, 20, 14, 5);

        const eyeGlow = 0.7 + Math.sin(this.engineFlicker) * 0.3;
        const eyeGrad = ctx.createRadialGradient(0, 5, 0, 0, 5, 25);
        eyeGrad.addColorStop(0, `rgba(255, 50, 50, ${eyeGlow})`);
        eyeGrad.addColorStop(0.5, `rgba(200, 0, 0, ${eyeGlow * 0.8})`);
        eyeGrad.addColorStop(1, 'rgba(100, 0, 0, 0)');
        ctx.fillStyle = eyeGrad;
        ctx.beginPath();
        ctx.arc(0, 5, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(0, 5, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, 5, 5, 0, Math.PI * 2);
        ctx.fill();

        const thrust1 = 15 + Math.sin(this.engineFlicker) * 8;
        const thrust2 = 12 + Math.cos(this.engineFlicker * 1.3) * 6;

        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(-65, -25);
        ctx.lineTo(-55, -25 - thrust1);
        ctx.lineTo(-45, -25);
        ctx.fill();
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(-60, -25);
        ctx.lineTo(-55, -25 - thrust1 * 0.7);
        ctx.lineTo(-50, -25);
        ctx.fill();

        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(45, -25);
        ctx.lineTo(55, -25 - thrust2);
        ctx.lineTo(65, -25);
        ctx.fill();
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(50, -25);
        ctx.lineTo(55, -25 - thrust2 * 0.7);
        ctx.lineTo(60, -25);
        ctx.fill();

        ctx.fillStyle = '#6b7280';
        ctx.fillRect(-3, -55, 6, 8);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, -58, 4, 0, Math.PI * 2);
        ctx.fill();

        const hpPct = this.health / this.maxHealth;
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(-50, -75, 100, 10);
        ctx.strokeStyle = '#4b5563';
        ctx.strokeRect(-50, -75, 100, 10);
        const hpColor = hpPct < 0.3 ? '#ef4444' : hpPct < 0.6 ? '#f59e0b' : '#22c55e';
        ctx.fillStyle = hpColor;
        ctx.fillRect(-48, -73, 96 * hpPct, 6);

        ctx.restore();
    }
}

class MiniBoss {
    constructor(type) {
        this.type = type; // 'charger' or 'gunner'
        this.x = CONFIG.CANVAS_WIDTH / 2;
        this.y = CONFIG.SKY_TOP + 100;
        this.width = 70;
        this.height = 50;
        this.health = 10;
        this.maxHealth = 10;
        this.active = true;

        this.swoopPhase = 0;
        this.engineFlicker = 0;
        this.damageFlash = 0;

        // Dive attack properties
        this.isDiving = false;
        this.isRecovering = false;
        this.recoveryTimer = 0;
        this.trackingStrength = 1.0; // Starts at full, reduced after dive
        this.diveTimer = 0;
        this.diveCooldown = 0;
        this.diveTargetX = 0;
        this.diveTargetY = 0;
        this.diveSpeed = 400;
        this.baseY = CONFIG.SKY_TOP + 100;
        this.recoveryDuration = 0.5;
        this.returnBlend = 1.0; // 1.0 = fully blended to normal, 0.0 = still at recovery position

        // Type-specific
        if (type === 'charger') {
            this.diveCooldownMax = 4; // Dive every 4 seconds
        } else {
            this.diveCooldownMax = 6;
            this.shootTimer = 0;
        }
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Rotation during dive
        if (this.isDiving) {
            const angle = Math.atan2(this.diveTargetY - this.y, this.diveTargetX - this.x);
            ctx.rotate(angle + Math.PI / 2);
        }

        const flashColor = this.damageFlash > 0 ? '#fff' : null;

        // Try sprite first
        let sprite = null;
        if (this.type === 'charger') {
            sprite = typeof AssetManager !== 'undefined' ? AssetManager.getImage('miniboss_charger') : null;
        } else {
            sprite = typeof AssetManager !== 'undefined' ? AssetManager.getImage('miniboss_gunner') : null;
        }

        if (sprite) {
            // Additive blend for black background transparency
            ctx.globalCompositeOperation = 'lighter';
            // Charger is 70x50, Gunner is 70x50. Drawing centered.
            ctx.drawImage(sprite, -35, -25, 70, 50);
            ctx.globalCompositeOperation = 'source-over';

            // Damage flash overlay
            if (this.damageFlash > 0) {
                ctx.fillStyle = `rgba(255, 255, 255, ${this.damageFlash * 0.5})`;
                ctx.fillRect(-35, -25, 70, 50);
            }

            ctx.restore();

            // Health bar (drawn without rotation, in world space relative to boss)
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(-25, -40, 50, 6);
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(-24, -39, 48 * (this.health / this.maxHealth), 4);
            ctx.restore();
            return;
        }

        if (this.type === 'charger') {
            // === CONTRA STYLE CHARGER - Armored Attack Drone ===

            // Main body - angular aggressive shape
            const bodyGrad = ctx.createLinearGradient(0, -30, 0, 30);
            bodyGrad.addColorStop(0, flashColor || '#991b1b');
            bodyGrad.addColorStop(0.5, flashColor || '#7f1d1d');
            bodyGrad.addColorStop(1, flashColor || '#450a0a');
            ctx.fillStyle = bodyGrad;

            // Armored shell
            ctx.beginPath();
            ctx.moveTo(0, 35);  // Nose
            ctx.lineTo(-25, 10);
            ctx.lineTo(-35, -15);
            ctx.lineTo(-25, -30);
            ctx.lineTo(25, -30);
            ctx.lineTo(35, -15);
            ctx.lineTo(25, 10);
            ctx.closePath();
            ctx.fill();

            // Inner Tech details
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(-15, -15, 30, 20);

            // Glowing Core
            const coreGlow = 0.5 + Math.sin(this.engineFlicker * 1.5) * 0.5;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#f97316';
            ctx.fillStyle = `rgba(249, 115, 22, ${coreGlow})`;
            ctx.beginPath();
            ctx.arc(0, -5, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, -5, 4, 0, Math.PI * 2);
            ctx.fill();

            // Metal plating lines
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, 35); ctx.lineTo(0, -5);
            ctx.moveTo(-25, 10); ctx.lineTo(-15, -5);
            ctx.moveTo(25, 10); ctx.lineTo(15, -5);
            ctx.stroke();

            // Engine Trail (Animated)
            const thrust = 10 + Math.random() * 10;
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.moveTo(-20, -30);
            ctx.lineTo(0, -30 - thrust);
            ctx.lineTo(20, -30);
            ctx.fill();

        } else {
            // === CONTRA STYLE GUNNER - Hover Tank ===

            // Hover Platform base
            ctx.fillStyle = flashColor || '#0f172a';
            ctx.beginPath();
            ctx.ellipse(0, 5, 40, 15, 0, 0, Math.PI * 2);
            ctx.fill();

            // Main Turret Body
            const turretGrad = ctx.createRadialGradient(-10, -10, 5, 0, 0, 40);
            turretGrad.addColorStop(0, flashColor || '#0ea5e9'); // Sky blue
            turretGrad.addColorStop(1, flashColor || '#0369a1'); // Darker blue
            ctx.fillStyle = turretGrad;
            ctx.beginPath();
            ctx.arc(0, 0, 25, 0, Math.PI * 2);
            ctx.fill();

            // Cannons (Rotatable ideally, but fixed forward/down for now)
            ctx.fillStyle = '#334155';
            // Left cannon
            ctx.fillRect(-35, -5, 20, 10);
            ctx.fillStyle = '#0ea5e9';
            ctx.fillRect(-37, -3, 5, 6); // Tip

            // Right cannon
            ctx.fillStyle = '#334155';
            ctx.fillRect(15, -5, 20, 10);
            ctx.fillStyle = '#0ea5e9';
            ctx.fillRect(32, -3, 5, 6); // Tip

            // Top heavy cannon
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(-5, -35, 10, 25);

            // Rotor blades (helicopter style)
            const rotorAngle = this.engineFlicker * 2;
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 2;

            // Left rotor
            ctx.save();
            ctx.translate(-45, -10);
            ctx.rotate(rotorAngle);
            ctx.beginPath();
            ctx.moveTo(-15, 0);
            ctx.lineTo(15, 0);
            ctx.moveTo(0, -15);
            ctx.lineTo(0, 15);
            ctx.stroke();
            ctx.restore();

            // Right rotor
            ctx.save();
            ctx.translate(45, -10);
            ctx.rotate(-rotorAngle);
            ctx.beginPath();
            ctx.moveTo(-15, 0);
            ctx.lineTo(15, 0);
            ctx.moveTo(0, -15);
            ctx.lineTo(0, 15);
            ctx.stroke();
            ctx.restore();

            // Rotor housings
            ctx.fillStyle = flashColor || '#581c87';
            ctx.beginPath();
            ctx.arc(-45, -10, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(45, -10, 10, 0, Math.PI * 2);
            ctx.fill();

            // Sensor array
            ctx.fillStyle = '#a855f7';
            ctx.beginPath();
            ctx.arc(0, -5, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, -5, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // Health bar (drawn without rotation)
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(-25, -50, 50, 6);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-24, -49, 48 * (this.health / this.maxHealth), 4);
        ctx.restore();
    }

    update(dt, px, py, pm) {
        this.swoopPhase += dt;
        this.engineFlicker += dt * 10;
        if (this.damageFlash > 0) this.damageFlash -= dt * 5;

        // Dive cooldown
        if (this.diveCooldown > 0) {
            this.diveCooldown -= dt;
        }

        if (this.isDiving) {
            // Move towards dive target
            const dx = this.diveTargetX - this.x;
            const dy = this.diveTargetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 20) {
                // Hit target - check building collision
                this.checkBuildingCollision();
                this.isDiving = false;
                this.isRecovering = true;
                this.recoveryTimer = 0;
                this.diveCooldown = this.diveCooldownMax;
            } else {
                this.x += (dx / dist) * this.diveSpeed * dt;
                this.y += (dy / dist) * this.diveSpeed * dt;
            }
        } else if (this.isRecovering) {
            // Recovery period - smoothly return toward base altitude
            this.recoveryTimer += dt;

            // Calculate target Y for both recovery and eventual normal movement
            const normalY = this.type === 'charger'
                ? this.baseY + Math.sin(this.swoopPhase) * 40
                : this.baseY + 50 + Math.sin(this.swoopPhase * 2) * 30;

            // Smoothly interpolate Y toward target (easing in)
            const recoveryProgress = Math.min(1, this.recoveryTimer / this.recoveryDuration);
            const lerpSpeed = 2 + recoveryProgress * 4; // Starts slow, speeds up
            this.y += (normalY - this.y) * dt * lerpSpeed;

            // Gentle drift toward center
            const centerX = CONFIG.CANVAS_WIDTH / 2;
            this.x += (centerX - this.x) * dt * (0.3 + recoveryProgress * 0.5);

            // Only end recovery when we're close to target Y AND time has elapsed
            const distToTarget = Math.abs(this.y - normalY);
            if (this.recoveryTimer >= this.recoveryDuration && distToTarget < 15) {
                this.isRecovering = false;
                this.returnBlend = 0.0; // Start blending from current position
                this.trackingStrength = 0.1; // Start with very low tracking after recovery
            }
        } else {
            // Gradually increase tracking strength after recovery
            if (this.trackingStrength < 1.0) {
                this.trackingStrength = Math.min(1.0, this.trackingStrength + dt * 0.5);
            }

            // Gradually increase return blend (smooth transition to normal movement)
            if (this.returnBlend < 1.0) {
                this.returnBlend = Math.min(1.0, this.returnBlend + dt * 2.0);
            }

            // Normal movement with adjusted tracking strength
            this.x += (px - this.x) * dt * 0.2 * this.trackingStrength;

            // Calculate target Y from sine wave
            const targetY = this.type === 'charger'
                ? this.baseY + Math.sin(this.swoopPhase) * 40
                : this.baseY + 50 + Math.sin(this.swoopPhase * 2) * 30;

            // Smoothly interpolate Y instead of setting it directly
            // When returnBlend is low, interpolation is slow; when high, it's faster
            const yLerpSpeed = 3 + this.returnBlend * 5;
            this.y += (targetY - this.y) * dt * yLerpSpeed;

            if (this.type !== 'charger') {
                // Gunner shoots
                this.shootTimer += dt;
                if (this.shootTimer > 2) {
                    this.shootTimer = 0;
                    const angle = Math.atan2(py - this.y, px - this.x);
                    pm.add(this.x, this.y + 30, angle * 180 / Math.PI, 200, false);
                    if (typeof SoundManager !== 'undefined') SoundManager.shoot();
                }
            }

            // Initiate dive attack
            if (this.diveCooldown <= 0 && Math.random() < dt * 0.3) {
                this.startDiveAttack();
            }
        }
    }

    startDiveAttack() {
        this.isDiving = true;
        // Target a random building
        if (typeof buildingManager !== 'undefined' && buildingManager.buildings.length > 0) {
            const building = buildingManager.buildings[Math.floor(Math.random() * buildingManager.buildings.length)];
            this.diveTargetX = building.x + building.width / 2;
            this.diveTargetY = building.y + 30; // Aim at top of building
        } else {
            this.diveTargetX = this.x + (Math.random() - 0.5) * 200;
            this.diveTargetY = CONFIG.STREET_Y - 50;
        }

        if (typeof SoundManager !== 'undefined') SoundManager.bomberDive();
    }

    checkBuildingCollision() {
        if (typeof buildingManager === 'undefined') return;

        for (const building of buildingManager.buildings) {
            // Check if mini-boss is over this building
            if (this.x > building.x && this.x < building.x + building.width) {
                // Destroy up to 6 floors from the top
                let destroyed = 0;
                for (let row = 0; row < building.heightBlocks && destroyed < 6; row++) {
                    for (let col = 0; col < building.widthBlocks && destroyed < 6; col++) {
                        if (building.blocks[row][col]) {
                            building.destroyBlock(row, col);
                            destroyed++;
                        }
                    }
                }

                if (destroyed > 0) {
                    // Impact effect
                    if (typeof EffectsManager !== 'undefined') {
                        EffectsManager.addExplosion(this.x, this.y + 20, 40, '#ff6600');
                        EffectsManager.shake(10);
                    }
                    console.log(`Mini-boss dive attack destroyed ${destroyed} blocks!`);
                }
                break;
            }
        }
    }

    takeDamage() {
        this.health--;
        this.damageFlash = 1;
        if (typeof EffectsManager !== 'undefined') {
            EffectsManager.addExplosion(this.x + (Math.random() - 0.5) * 30, this.y + (Math.random() - 0.5) * 30, 15, '#ffcc00');
        }
        if (this.health <= 0) {
            this.active = false;
            if (typeof EffectsManager !== 'undefined') {
                for (let i = 0; i < 5; i++) {
                    setTimeout(() => EffectsManager.addExplosion(this.x + (Math.random() - 0.5) * 50, this.y + (Math.random() - 0.5) * 40, 35, '#ff4400'), i * 80);
                }
                EffectsManager.shake(15);
            }
            return true;
        }
        return false;
    }
}

class EnemyManager {
    constructor() {
        this.enemies = [];
        this.boss = null;
        this.miniBoss = null;
        this.pendingMiniBoss = null;
        this.waveNumber = 0;
        this.maxWaves = 5;  // 5 waves before final boss
        this.enemiesRemainingInWave = 0;
        this.spawnTimer = 0;
        this.spawnInterval = 2;
        this.waveComplete = false;
        this.bossDefeated = false;
        this.betweenWaves = false;
        this.waveBreakTimer = 0;

        // Progressive difficulty
        this.maxConcurrentEnemies = 1;
        this.aggressiveRatio = 0;
        this.availableTypes = [EnemyType.STANDARD];

        // Zone tracking
        this.currentZone = 1;

        // Dust Devil spawning (Zone 2 environmental hazard)
        this.dustDevilSpawnTimer = 0;
        this.dustDevilSpawnCount = 0;
        this.dustDevilMaxThisWave = 0;
    }

    reset() {
        this.enemies = [];
        this.boss = null;
        this.miniBoss = null;
        this.pendingMiniBoss = null;
        this.pendingZone2MiniBoss = null; // Zone 2 mini-boss tracking
        this.zone2MiniBoss = null;
        this.zone2Boss = null;
        this.waveNumber = 0;
        this.enemiesRemainingInWave = 0;
        this.spawnTimer = 0;
        this.waveComplete = false;
        this.bossDefeated = false;
        this.betweenWaves = false;
        this.waveBreakTimer = 0;
        this.maxConcurrentEnemies = 1;
        this.aggressiveRatio = 0;
        this.availableTypes = [EnemyType.STANDARD];
        this.currentZone = 1;

        // Enemy kill tracking for powerup drops
        this.enemiesKilledThisWave = 0;
        this.totalEnemiesInWave = 0;

        // Reset dust devils
        dustDevils = [];
        this.dustDevilSpawnTimer = 0;
        this.dustDevilSpawnCount = 0;
        this.dustDevilMaxThisWave = 0;

        // Reset falling pods
        fallingPods = [];
    }

    startWave(waveNum) {
        this.waveNumber = waveNum;
        this.waveComplete = false;

        // Progressive type unlocking
        this.availableTypes = [EnemyType.STANDARD];
        if (waveNum >= 2) this.availableTypes.push(EnemyType.AGGRESSIVE);
        if (waveNum >= 3) {
            this.availableTypes.push(EnemyType.SPLITTER);
            // Unlock TANK (Gunship) earlier - now at Wave 3! (Was Wave 5)
            this.availableTypes.push(EnemyType.TANK);
        }
        if (waveNum >= 4) this.availableTypes.push(EnemyType.BOMBER);

        // Shorter waves - faster paced gameplay
        switch (waveNum) {
            case 1:
                this.maxConcurrentEnemies = 2;
                this.enemiesRemainingInWave = 6;
                break;
            case 2:
                this.maxConcurrentEnemies = 3;
                this.enemiesRemainingInWave = 8;
                break;
            case 3:
                this.maxConcurrentEnemies = 4;
                this.enemiesRemainingInWave = 12;
                break;
            case 4:
                this.maxConcurrentEnemies = 5;
                this.enemiesRemainingInWave = 15;
                break;
            default:
                this.maxConcurrentEnemies = 6;
                this.enemiesRemainingInWave = 20 + (waveNum - 4) * 5;
        }

        console.log(`Wave ${waveNum} started! ${this.enemiesRemainingInWave} enemies.`);

        // Track total enemies for powerup wave progress
        this.totalEnemiesInWave = this.enemiesRemainingInWave;
        this.enemiesKilledThisWave = 0;

        // Start random weather for this wave
        if (typeof WeatherManager !== 'undefined') WeatherManager.startRandomWeather();
        // if (typeof VolcanoManager !== 'undefined') VolcanoManager.checkEruption(waveNum);  // TEMPORARILY DISABLED

        // Initialize powerup spawning for this wave
        if (typeof PowerupManager !== 'undefined') PowerupManager.startWave(this.enemiesRemainingInWave);

        // Initialize artillery event for wave 4+
        if (typeof ArtilleryManager !== 'undefined') ArtilleryManager.startWave(waveNum);

        // Initialize dust devil spawning for Zone 2, wave 2+
        const zone = (typeof game !== 'undefined' && game.currentZone) ? game.currentZone : 1;
        if (zone === 2 && waveNum >= 2) {
            this.dustDevilMaxThisWave = CONFIG.DUST_DEVIL_SPAWN_MIN +
                Math.floor(Math.random() * (CONFIG.DUST_DEVIL_SPAWN_MAX - CONFIG.DUST_DEVIL_SPAWN_MIN + 1));
            this.dustDevilSpawnCount = 0;
            this.dustDevilSpawnTimer = 3 + Math.random() * 5;
            console.log(`Dust Devils initialized - zone: ${zone}, wave: ${waveNum}, max: ${this.dustDevilMaxThisWave}, timer: ${this.dustDevilSpawnTimer.toFixed(1)}s`);
        } else {
            console.log(`Dust Devils NOT initialized - zone: ${zone}, wave: ${waveNum}`);
        }
    }

    pickEnemyType() {
        // Use zone-aware weighted random type selection
        return this.getWeightedRandomType(this.waveNumber);
    }

    spawnEnemy() {
        if (this.enemiesRemainingInWave <= 0) return;
        if (this.enemies.length >= this.maxConcurrentEnemies) return;

        const type = this.pickEnemyType();
        let x, y;
        let carrierFromLeft = false;

        // Carriers always spawn from left or right side
        if (type === EnemyType.SPLITTER) {
            carrierFromLeft = Math.random() < 0.5;

            // Calculate spawn altitude (above tallest building)
            let maxBuildingTop = CONFIG.SKY_TOP + 100;
            if (typeof buildingManager !== 'undefined') {
                for (const building of buildingManager.buildings) {
                    if (building.y < maxBuildingTop) {
                        maxBuildingTop = building.y;
                    }
                }
            }
            y = maxBuildingTop - CONFIG.CARRIER_ALTITUDE_BUFFER;

            if (carrierFromLeft) {
                x = -48; // Start just off-screen left
            } else {
                x = CONFIG.CANVAS_WIDTH + 48; // Start just off-screen right
            }
        } else {
            // Other enemies use normal spawn logic
            const side = Math.floor(Math.random() * 3);

            switch (side) {
                case 0: // Top
                    x = 80 + Math.random() * (CONFIG.CANVAS_WIDTH - 160);
                    y = CONFIG.SKY_TOP;
                    break;
                case 1: // Left
                    x = 0;
                    y = CONFIG.SKY_TOP + 30 + Math.random() * 100;
                    break;
                case 2: // Right
                    x = CONFIG.CANVAS_WIDTH;
                    y = CONFIG.SKY_TOP + 30 + Math.random() * 100;
                    break;
            }
        }

        const enemy = new Enemy(x, y, type);
        enemy.wasActive = true; // For death tracking

        // Set carrier direction based on spawn side
        if (type === EnemyType.SPLITTER) {
            enemy.carrierMovingRight = carrierFromLeft; // If from left, move right
            enemy.facingRight = carrierFromLeft;
        }

        this.enemies.push(enemy);
        this.enemiesRemainingInWave--;
    }

    spawnSpecific(x, y, type) {
        if (this.enemies.length >= this.maxConcurrentEnemies + 4) return;
        const enemy = new Enemy(x, y, type);
        enemy.wasActive = true;
        this.enemies.push(enemy);
    }

    spawnDustDevil() {
        const x = 100 + Math.random() * (CONFIG.CANVAS_WIDTH - 200);
        const y = CONFIG.SKY_TOP + 50 + Math.random() * 200;
        dustDevils.push(new DustDevil(x, y));
        console.log(`Dust Devil spawned at (${Math.round(x)}, ${Math.round(y)})`);
    }

    spawnBoss() {
        const zone = (typeof game !== 'undefined' && game.currentZone) ? game.currentZone : 1;

        if (zone === 2) {
            // Zone 2 final boss: Siege Crawler (spawns as special Enemy type)
            const siegeCrawler = new Enemy(CONFIG.CANVAS_WIDTH + 100, CONFIG.STREET_Y - 60, EnemyType.SIEGE_CRAWLER);
            siegeCrawler.isBoss = true;
            this.enemies.push(siegeCrawler);
            // Store reference for boss tracking
            this.zone2Boss = siegeCrawler;
            console.log('ZONE 2 BOSS SPAWNED: SIEGE CRAWLER!');
        } else {
            // Zone 1 final boss
            this.boss = new Boss();
            console.log('BOSS SPAWNED!');
        }
    }

    update(deltaTime, playerX, playerY, projectileManager) {
        // Handle wave breaks - no dust devils should be present
        if (this.betweenWaves) {
            // Clear any remaining dust devils immediately
            dustDevils = [];

            this.waveBreakTimer += deltaTime;
            const waveBreakDuration = (typeof CONFIG !== 'undefined' && CONFIG.WAVE_COUNTDOWN_DURATION) || 5;
            if (this.waveBreakTimer >= waveBreakDuration) {
                this.betweenWaves = false;

                // Zone 2 mini-bosses spawn as Enemy types
                if (this.pendingZone2MiniBoss) {
                    const miniBossEnemy = new Enemy(CONFIG.CANVAS_WIDTH / 2, CONFIG.SKY_TOP + 100, this.pendingZone2MiniBoss);
                    miniBossEnemy.isBoss = true;
                    this.enemies.push(miniBossEnemy);
                    this.zone2MiniBoss = miniBossEnemy; // Track for defeat detection
                    this.pendingZone2MiniBoss = null;
                    if (typeof SoundManager !== 'undefined') SoundManager.miniBossAppear();
                    console.log(`ZONE 2 MINI-BOSS SPAWNED: ${miniBossEnemy.type.toUpperCase()}`);
                } else if (this.pendingMiniBoss) {
                    this.miniBoss = new MiniBoss(this.pendingMiniBoss);
                    this.pendingMiniBoss = null;
                    if (typeof SoundManager !== 'undefined') SoundManager.miniBossAppear();
                    console.log(`MINI-BOSS SPAWNED: ${this.miniBoss.type.toUpperCase()}`);
                } else if (this.waveNumber >= this.maxWaves) {
                    this.spawnBoss();
                } else {
                    this.startWave(this.waveNumber + 1);
                }
            }
            return;
        }

        // Update mini-boss if present
        if (this.miniBoss) {
            if (this.miniBoss.active) {
                this.miniBoss.update(deltaTime, playerX, playerY, projectileManager);
            }
            // Check if mini-boss was defeated (active set to false by takeDamage)
            if (!this.miniBoss.active) {
                console.log('Mini-boss defeated! Starting wave break...');
                // Drop guaranteed shield powerup
                if (typeof PowerupManager !== 'undefined') {
                    PowerupManager.spawnBossDrop(this.miniBoss.x, this.miniBoss.y);
                    // 2nd mini-boss (wave 4) also drops Full Repair powerup
                    if (this.waveNumber === 4) {
                        PowerupManager.spawnFullRepairDrop(this.miniBoss.x, this.miniBoss.y + 30);
                    }
                }
                this.miniBoss = null;
                this.betweenWaves = true;
                this.waveBreakTimer = 0;
            }
        }

        // Update Zone 2 mini-boss if present (spawned as Enemy type with isBoss flag)
        if (this.zone2MiniBoss) {
            // Check if zone2MiniBoss was defeated (active becomes false)
            if (!this.zone2MiniBoss.active) {
                console.log('Zone 2 Mini-boss defeated! Starting wave break...');
                // Drop guaranteed shield powerup
                if (typeof PowerupManager !== 'undefined') {
                    PowerupManager.spawnBossDrop(this.zone2MiniBoss.x, this.zone2MiniBoss.y);
                    // 2nd mini-boss (wave 4) also drops Full Repair powerup
                    if (this.waveNumber === 4) {
                        PowerupManager.spawnFullRepairDrop(this.zone2MiniBoss.x, this.zone2MiniBoss.y + 30);
                    }
                }
                this.zone2MiniBoss = null;
                this.betweenWaves = true;
                this.waveBreakTimer = 0;
            }
        }

        // Update boss if present
        if (this.boss && this.boss.active) {
            this.boss.update(deltaTime, playerX, playerY, projectileManager);
        }

        // Spawn enemies
        if (this.enemiesRemainingInWave > 0 && !this.boss && !this.miniBoss && !this.zone2MiniBoss) {
            this.spawnTimer += deltaTime;
            const spawnRate = Math.max(0.8, 1.8 - this.waveNumber * 0.2);
            if (this.spawnTimer >= spawnRate) {
                this.spawnEnemy();
                this.spawnTimer = 0;
            }
        }

        // Update enemies
        this.enemies.forEach(e => e.update(deltaTime));

        // Track enemy deaths for powerup drops
        this.enemies.forEach((e, index) => {
            if (!e.active && e.wasActive) {
                // Enemy just died - check for powerup drop
                if (typeof PowerupManager !== 'undefined') {
                    PowerupManager.onEnemyKilled(this.enemiesKilledThisWave, e.x, e.y);
                }
                this.enemiesKilledThisWave++;
            }
            e.wasActive = e.active;
        });

        this.enemies = this.enemies.filter(e => e.active);

        // Update burrowing pods
        burrowingPods.forEach(pod => pod.update(deltaTime));
        burrowingPods = burrowingPods.filter(pod => pod.active);

        // Update falling pods (Sand Carrier drops)
        fallingPods.forEach(pod => pod.update(deltaTime));
        fallingPods = fallingPods.filter(pod => pod.active);

        // Update dust devils (Zone 2 environmental hazards)
        dustDevils.forEach(dd => dd.update(deltaTime));
        dustDevils = dustDevils.filter(dd => dd.active);

        // Spawn dust devils (Zone 2 only, wave 2+)
        const zone = (typeof game !== 'undefined' && game.currentZone) ? game.currentZone : 1;
        if (zone === 2 && !this.boss && !this.miniBoss && !this.zone2MiniBoss) {
            this.dustDevilSpawnTimer -= deltaTime;

            if (this.dustDevilSpawnTimer <= 0 &&
                dustDevils.length < CONFIG.DUST_DEVIL_MAX_ACTIVE &&
                this.dustDevilSpawnCount < this.dustDevilMaxThisWave) {
                this.spawnDustDevil();
                this.dustDevilSpawnCount++;
                this.dustDevilSpawnTimer = 8 + Math.random() * 12;
                console.log(`Dust Devil spawned! Count: ${this.dustDevilSpawnCount}/${this.dustDevilMaxThisWave}`);
            }

            // Despawn dust devils if last enemy is gone
            if (this.enemiesRemainingInWave <= 0 && this.enemies.length === 0) {
                dustDevils.forEach(dd => {
                    if (!dd.despawning) dd.startDespawn();
                });
            }
        }

        // Check wave progress for parachute drops
        if (this.totalEnemiesInWave > 0 && typeof PowerupManager !== 'undefined') {
            const waveProgress = this.enemiesKilledThisWave / this.totalEnemiesInWave;
            PowerupManager.checkWaveProgress(waveProgress);
        }

        // Check wave completion
        if (!this.boss && !this.miniBoss && !this.zone2MiniBoss && this.enemiesRemainingInWave <= 0 && this.enemies.length === 0 && !this.waveComplete) {
            this.waveComplete = true;
            this.betweenWaves = true;
            this.waveBreakTimer = 0;
            if (typeof DayCycle !== 'undefined') DayCycle.advance();
            if (typeof WeatherManager !== 'undefined') WeatherManager.fadeOut();
            console.log(`Wave ${this.waveNumber} complete!`);

            if (this.waveNumber === 2) {
                this.pendingMiniBoss = 'charger';
            } else if (this.waveNumber === 4) {
                this.pendingMiniBoss = 'gunner';
            }

            // Zone 2 uses different mini-bosses (Enemy types with isBoss flag)
            const zone = (typeof game !== 'undefined' && game.currentZone) ? game.currentZone : 1;
            if (zone === 2) {
                if (this.waveNumber === 2) {
                    // Vulture King mini-boss for Zone 2
                    this.pendingMiniBoss = null;
                    this.pendingZone2MiniBoss = EnemyType.VULTURE_KING;
                } else if (this.waveNumber === 4) {
                    // Sandstorm Colossus mini-boss for Zone 2
                    this.pendingMiniBoss = null;
                    this.pendingZone2MiniBoss = EnemyType.SANDSTORM_COLOSSUS;
                }
            }
        }
    }

    render(ctx) {
        this.enemies.forEach(e => e.render(ctx));
        if (this.miniBoss && this.miniBoss.active) {
            this.miniBoss.render(ctx);
        }
        if (this.boss && this.boss.active) {
            this.boss.render(ctx);
        }
        // Render burrowing pods
        burrowingPods.forEach(pod => pod.render(ctx));

        // Render falling pods
        fallingPods.forEach(pod => pod.render(ctx));

        // Render dust devils
        dustDevils.forEach(dd => dd.render(ctx));
    }

    getUpcomingBoss() {
        if (this.boss || this.miniBoss) return null;
        if (this.waveNumber === 1) return 'charger';
        if (this.waveNumber === 3) return 'gunner';
        if (this.waveNumber >= 5) return 'boss';
        return null;
    }

    // Zone management
    setZone(zoneNumber) {
        this.currentZone = zoneNumber;
        console.log(`EnemyManager: Zone set to ${zoneNumber}`);
    }

    // Get spawn weights based on current zone
    getSpawnWeights(waveNumber) {
        // Check game's currentZone first, then fall back to local currentZone
        const zone = (typeof game !== 'undefined' && game.currentZone) ? game.currentZone : this.currentZone;
        if (zone === 2) {
            return this.getZone2SpawnWeights(waveNumber);
        }
        return this.getZone1SpawnWeights(waveNumber);
    }

    // Zone 1 spawn weights (preserves existing behavior)
    getZone1SpawnWeights(waveNumber) {
        const weights = {};
        weights[EnemyType.STANDARD] = 50;
        if (waveNumber >= 2) weights[EnemyType.AGGRESSIVE] = 20;
        if (waveNumber >= 3) {
            weights[EnemyType.SPLITTER] = 15;
            // Introduce Gunships earlier with decent frequency
            weights[EnemyType.TANK] = 10;
        }
        if (waveNumber >= 4) {
            weights[EnemyType.BOMBER] = 10;
            // Increase Gunship frequency
            weights[EnemyType.TANK] = 15;
        }
        if (waveNumber >= 5) {
            weights[EnemyType.TANK] = 20; // Very frequent in final waves
        }
        return weights;
    }

    // Zone 2 spawn weights (desert enemies) - rebalanced for more Zone 2 variety
    getZone2SpawnWeights(waveNumber) {
        const weights = {};

        // Wave 1: Mostly standard but some variety
        weights[EnemyType.STANDARD] = 25;  // Reduced from 40

        // Wave 2+: Add Aggressive (Dust Devils spawn as environmental hazards separately)
        if (waveNumber >= 2) {
            weights[EnemyType.AGGRESSIVE] = 15;
        }

        // Wave 3+: Add Sandworm and Scorpion
        if (waveNumber >= 3) {
            weights[EnemyType.SANDWORM] = 20;  // Increased from 10
            weights[EnemyType.SCORPION] = 15;  // Moved from wave 5, increased from 5
        }

        // Wave 4+: Add Sand Carrier
        if (waveNumber >= 4) weights[EnemyType.SAND_CARRIER] = 15;  // Increased from 10

        return weights;
    }

    // Get weighted random enemy type based on zone and wave
    getWeightedRandomType(waveNumber) {
        const weights = this.getSpawnWeights(waveNumber);
        const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;

        for (const [type, weight] of Object.entries(weights)) {
            random -= weight;
            if (random <= 0) {
                return type;
            }
        }
        return EnemyType.STANDARD; // Fallback
    }
}

const enemyManager = new EnemyManager();
