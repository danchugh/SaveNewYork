const EnemyType = {
    STANDARD: 'standard',    // Scout Drone
    AGGRESSIVE: 'aggressive', // Hunter Chopper
    TANK: 'tank',            // Heavy Gunship
    SPLITTER: 'splitter',    // Carrier
    BOMBER: 'bomber'         // Kamikaze Missile
};

const EnemyState = {
    FLYING: 'flying',
    ATTACKING: 'attacking',
    FALLING: 'falling',
    DEAD: 'dead'
};

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

        this.active = true;
    }

    configureStats(type) {
        switch (type) {
            case EnemyType.STANDARD: // Scout Drone
                this.speed = 60;
                this.width = 30; this.height = 20; // +25% from 24x16
                this.attackTimeMin = 1.0; this.attackTimeMax = 3.0;
                break;

            case EnemyType.AGGRESSIVE: // Hunter Chopper (Red)
                this.speed = 100;
                this.width = 35; this.height = 25; // +25% from 28x20
                this.attackTimeMin = 0.5; this.attackTimeMax = 1.5;
                break;

            case EnemyType.TANK: // Heavy Gunship (Green)
                this.speed = 35;
                this.health = 4;
                this.width = 50; this.height = 38; // +25% from 40x30
                this.blocksToDestroy = 3; // Huge damage
                this.attackTimeMin = 0.5; this.attackTimeMax = 1.0;
                break;

            case EnemyType.SPLITTER: // Carrier (Cyan)
                this.speed = 50;
                this.width = 40; this.height = 30; // +25% from 32x24
                this.attackTimeMin = 2.0; this.attackTimeMax = 4.0;
                break;

            case EnemyType.BOMBER: // Missile (Orange)
                this.speed = 120;
                this.width = 25; this.height = 13; // +25% from 20x10
                this.attackTimeMin = 999; this.attackTimeMax = 999;
                this.diveTimer = 2 + Math.random() * 4;
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

    update(deltaTime) {
        if (this.state === EnemyState.DEAD) return;

        if (this.state === EnemyState.FLYING) {
            this.updateFlying(deltaTime);
        } else if (this.state === EnemyState.ATTACKING) {
            this.updateAttacking(deltaTime);
        } else if (this.state === EnemyState.FALLING) {
            this.updateFalling(deltaTime);
        }

        // Banking visual based on X velocity
        const targetRot = this.velX * 0.5;
        this.rotation += (targetRot - this.rotation) * deltaTime * 5;
    }

    updateFlying(deltaTime) {
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
                const diveSpeed = this.speed * 2.5;
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

        // Standard Flight
        this.flightPhase += deltaTime * this.swoopFrequency;

        // Collision damage cooldown
        if (this.collisionDamageCooldown > 0) {
            this.collisionDamageCooldown -= deltaTime;
        }

        // Change direction - more aggressive building seeking
        this.directionChangeTimer += deltaTime;
        if (this.directionChangeTimer >= this.directionChangeInterval) {
            this.directionChangeTimer = 0;
            this.directionChangeInterval = 0.3 + Math.random() * 0.5; // Faster decisions

            // 80% chance to seek building, 20% random wander
            if (this.type !== EnemyType.BOMBER && Math.random() < 0.8) {
                this.seekGenericTarget();
            } else {
                // Random wander
                this.velX += (Math.random() - 0.5) * 2;
                this.velY += (Math.random() - 0.5) * 1;
                this.normalizeVelocity();
            }
        }

        // Apply movement
        const speed = this.speed;
        const newX = this.x + this.velX * speed * deltaTime;
        const newY = this.y + this.velY * speed * deltaTime + Math.sin(this.flightPhase) * 20 * deltaTime;

        // Check building collision BEFORE moving
        const collisionResult = this.checkBuildingCollisionDamage(newX, newY);
        if (collisionResult.hit) {
            // Bounce off building
            this.velX = -this.velX + (Math.random() - 0.5) * 0.5;
            this.velY = -this.velY + (Math.random() - 0.5) * 0.5;
            this.normalizeVelocity();
        } else {
            this.x = newX;
            this.y = newY;
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

    updateAttacking(deltaTime) {
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
                            // Crash! Destroy 3-5 blocks for aggressive enemies
                            const blocksToDestroy = 3 + Math.floor(Math.random() * 3); // 3-5 blocks
                            let destroyed = 0;

                            // Destroy blocks in a splash pattern around impact point
                            for (let dr = -1; dr <= 1 && destroyed < blocksToDestroy; dr++) {
                                for (let dc = -1; dc <= 1 && destroyed < blocksToDestroy; dc++) {
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
                                EffectsManager.addExplosion(pos.x + 10, pos.y + 10, 30, '#ff4400');
                                EffectsManager.shake(8);
                            }

                            this.die(true);
                            if (typeof SoundManager !== 'undefined') SoundManager.fallingCrash();
                            return;
                        }
                    }
                }
            }
        }

        if (this.y > CONFIG.STREET_Y) {
            this.die(true); // Crash
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
    checkBuildingCollisionDamage(x, y) {
        if (!buildingManager) return { hit: false };

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
                            building.destroyBlock(row, col);
                            this.collisionDamageCooldown = 3.0; // 3 second cooldown

                            // Visual feedback
                            if (typeof EffectsManager !== 'undefined') {
                                EffectsManager.addExplosion(pos.x + pos.width / 2, pos.y + pos.height / 2, 12, '#ff8800');
                            }
                        }

                        return { hit: true, building, row, col };
                    }
                }
            }
        }
        return { hit: false };
    }

    die(forceImmediate = false) {
        // Handle Death Logic
        if (!forceImmediate && this.type === EnemyType.AGGRESSIVE && this.state !== EnemyState.FALLING) {
            // Aggressive ones fall first
            this.state = EnemyState.FALLING;
            this.fallSpeed = -100; // Hop up first
            if (typeof SoundManager !== 'undefined') SoundManager.enemyFalling();
            return;
        }

        if (this.type === EnemyType.SPLITTER && this.state !== EnemyState.DEAD) {
            // Split
            this.spawnSplitEnemies();
            if (typeof SoundManager !== 'undefined') SoundManager.enemySplit();
        } else if (this.type === EnemyType.TANK && this.health > 1 && !forceImmediate) {
            this.health--;
            if (typeof SoundManager !== 'undefined') SoundManager.tankHit();
            // Flash
            if (typeof EffectsManager !== 'undefined') EffectsManager.addExplosion(this.x, this.y, 10, '#ffffff');
            return; // Survives
        }

        // Final Death
        this.state = EnemyState.DEAD;
        this.active = false;

        // Explosion Juice
        if (typeof EffectsManager !== 'undefined') {
            // Smaller explosions for regular enemies, bigger for tanks
            let size = 15; // Default small
            if (this.type === EnemyType.TANK) size = 50;
            else if (this.type === EnemyType.BOMBER) size = 35;

            const color = (this.type === EnemyType.AGGRESSIVE || this.type === EnemyType.BOMBER) ? '#ff4400' : '#aa00ff';
            EffectsManager.addExplosion(this.x, this.y, size, color);

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
        } else {
            // Slight bank based on velocity
            ctx.rotate(this.velX * 0.2);
        }

        switch (this.type) {
            case EnemyType.STANDARD: this.renderDrone(ctx); break;
            case EnemyType.AGGRESSIVE: this.renderInterceptor(ctx); break;
            case EnemyType.TANK: this.renderGunship(ctx); break;
            case EnemyType.SPLITTER: this.renderCarrier(ctx); break;
            case EnemyType.BOMBER: this.renderMissile(ctx); break;
        }

        ctx.restore();
    }

    // --- RENDER HELPERS ---

    renderDrone(ctx) { // Standard
        // Try sprite first
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
        // Try sprite first
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

    renderGunship(ctx) { // Tank
        // Try sprite first
        const sprite = typeof AssetManager !== 'undefined' ? AssetManager.getImage('enemy_gunship') : null;
        if (sprite) {
            // Draw solid at +25% size: 70x60 from 56x48
            ctx.drawImage(sprite, -35, -30, 70, 60);
            // Still draw health bar on top
            if (this.health > 0) {
                for (let i = 0; i < this.health; i++) {
                    ctx.fillStyle = '#4ade80';
                    ctx.fillRect(-15 + i * 8, -38, 6, 4);
                }
            }
            return;
        }

        // Fallback: Bulky Rectangle
        ctx.fillStyle = '#064e3b';
        ctx.fillRect(-20, -15, 40, 30);

        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.strokeRect(-18, -13, 36, 26);
        ctx.strokeRect(-10, -5, 20, 10);

        ctx.fillStyle = '#111';
        ctx.fillRect(-22, 5, -4, 8);
        ctx.fillRect(22, 5, 4, 8);

        if (this.health > 0) {
            for (let i = 0; i < this.health; i++) {
                ctx.fillStyle = '#4ade80';
                ctx.fillRect(-15 + i * 8, -22, 6, 4);
            }
        }
    }

    renderCarrier(ctx) { // Splitter
        // Try sprite first
        const sprite = typeof AssetManager !== 'undefined' ? AssetManager.getImage('enemy_carrier') : null;
        if (sprite) {
            // Draw solid at +25% size: 80x50 from 64x40
            ctx.drawImage(sprite, -40, -25, 80, 50);
            return;
        }

        // Fallback: Cyan angular shape
        ctx.fillStyle = '#0e7490';
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(16, 0);
        ctx.lineTo(0, 12);
        ctx.lineTo(-16, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#06b6d4';
        ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.stroke();
    }

    renderMissile(ctx) { // Bomber
        // Try sprite first
        const sprite = typeof AssetManager !== 'undefined' ? AssetManager.getImage('enemy_missile') : null;
        if (sprite) {
            // Draw solid at +25% size: 40x40 from 32x32
            ctx.drawImage(sprite, -20, -20, 40, 40);
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
        this.shootInterval = 1.0;

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
    }

    reset() {
        this.enemies = [];
        this.boss = null;
        this.miniBoss = null;
        this.pendingMiniBoss = null;
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

        // Enemy kill tracking for powerup drops
        this.enemiesKilledThisWave = 0;
        this.totalEnemiesInWave = 0;
    }

    startWave(waveNum) {
        this.waveNumber = waveNum;
        this.waveComplete = false;

        // Progressive type unlocking
        this.availableTypes = [EnemyType.STANDARD];
        if (waveNum >= 2) this.availableTypes.push(EnemyType.AGGRESSIVE);
        if (waveNum >= 3) this.availableTypes.push(EnemyType.SPLITTER);
        if (waveNum >= 4) this.availableTypes.push(EnemyType.BOMBER);
        if (waveNum >= 5) this.availableTypes.push(EnemyType.TANK);

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
    }

    pickEnemyType() {
        const weights = {
            [EnemyType.STANDARD]: 50,
            [EnemyType.AGGRESSIVE]: 20,
            [EnemyType.SPLITTER]: 15,
            [EnemyType.BOMBER]: 10,
            [EnemyType.TANK]: 5
        };

        // Filter valid
        let totalWeight = 0;
        for (const type of this.availableTypes) {
            totalWeight += weights[type];
        }

        let random = Math.random() * totalWeight;
        for (const type of this.availableTypes) {
            random -= weights[type];
            if (random <= 0) return type;
        }

        return EnemyType.STANDARD;
    }

    spawnEnemy() {
        if (this.enemiesRemainingInWave <= 0) return;
        if (this.enemies.length >= this.maxConcurrentEnemies) return;

        const type = this.pickEnemyType();
        const side = Math.floor(Math.random() * 3);
        let x, y;

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

        const enemy = new Enemy(x, y, type);
        enemy.wasActive = true; // For death tracking
        this.enemies.push(enemy);
        this.enemiesRemainingInWave--;
    }

    spawnSpecific(x, y, type) {
        if (this.enemies.length >= this.maxConcurrentEnemies + 4) return;
        const enemy = new Enemy(x, y, type);
        enemy.wasActive = true;
        this.enemies.push(enemy);
    }

    spawnBoss() {
        this.boss = new Boss();
        console.log('BOSS SPAWNED!');
    }

    update(deltaTime, playerX, playerY, projectileManager) {
        // Handle wave breaks
        if (this.betweenWaves) {
            this.waveBreakTimer += deltaTime;
            if (this.waveBreakTimer >= 2) {
                this.betweenWaves = false;
                if (this.pendingMiniBoss) {
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
                }
                this.miniBoss = null;
                this.betweenWaves = true;
                this.waveBreakTimer = 0;
            }
        }

        // Update boss if present
        if (this.boss && this.boss.active) {
            this.boss.update(deltaTime, playerX, playerY, projectileManager);
        }

        // Spawn enemies
        if (this.enemiesRemainingInWave > 0 && !this.boss && !this.miniBoss) {
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

        // Check wave progress for parachute drops
        if (this.totalEnemiesInWave > 0 && typeof PowerupManager !== 'undefined') {
            const waveProgress = this.enemiesKilledThisWave / this.totalEnemiesInWave;
            PowerupManager.checkWaveProgress(waveProgress);
        }

        // Check wave completion
        if (!this.boss && !this.miniBoss && this.enemiesRemainingInWave <= 0 && this.enemies.length === 0 && !this.waveComplete) {
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
    }

    getUpcomingBoss() {
        if (this.boss || this.miniBoss) return null;
        if (this.waveNumber === 1) return 'charger';
        if (this.waveNumber === 3) return 'gunner';
        if (this.waveNumber >= 5) return 'boss';
        return null;
    }
}

const enemyManager = new EnemyManager();
