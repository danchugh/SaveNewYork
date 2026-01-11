const EnemyType = {
    STANDARD: 'standard',    // Normal building attacker
    AGGRESSIVE: 'aggressive' // Faster, more erratic, quicker attacks
};

const EnemyState = {
    FLYING: 'flying',
    ATTACKING: 'attacking',
    FALLING: 'falling',      // Red enemy falling after death
    DEAD: 'dead'
};

class Enemy {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.state = EnemyState.FLYING;

        this.width = 16;
        this.height = 16;

        // Type-based stats (reduced attack times for faster building damage)
        if (type === EnemyType.AGGRESSIVE) {
            this.speed = 90;
            this.attackTimeMin = 0.8;
            this.attackTimeMax = 2;
        } else {
            this.speed = 60;
            this.attackTimeMin = 1.5;
            this.attackTimeMax = 4;
        }

        // Erratic flight pattern variables
        this.flightPhase = Math.random() * Math.PI * 2;
        this.swoopAmplitude = 30 + Math.random() * 40;
        this.swoopFrequency = 2 + Math.random() * 3;
        this.directionChangeTimer = 0;
        this.directionChangeInterval = 0.3 + Math.random() * 0.5;

        // Current movement direction (normalized)
        this.velX = (Math.random() - 0.5) * 2;
        this.velY = (Math.random() - 0.5) * 2;
        this.normalizeVelocity();

        // Target for attacking
        this.targetBlock = null;
        this.attackTimer = 0;
        this.attackDuration = this.attackTimeMin +
            Math.random() * (this.attackTimeMax - this.attackTimeMin);

        // Pecking animation
        this.peckTimer = 0;
        this.peckOffset = 0;

        // Falling state (for dead red enemies)
        this.fallSpeed = 0;
        this.fallGravity = 600;

        this.active = true;
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
    }

    updateFlying(deltaTime) {
        // Update flight phase for swooping motion
        this.flightPhase += deltaTime * this.swoopFrequency;

        // Random direction changes (bat-like erratic movement)
        this.directionChangeTimer += deltaTime;
        if (this.directionChangeTimer >= this.directionChangeInterval) {
            this.directionChangeTimer = 0;
            this.directionChangeInterval = 0.2 + Math.random() * 0.6;

            // Decide behavior: random wander or seek building
            if (Math.random() < 0.4) {
                // Seek a building edge block
                const edges = buildingManager.getAllEdgeBlocks();
                if (edges.length > 0) {
                    const target = edges[Math.floor(Math.random() * edges.length)];
                    this.targetBlock = target;
                    const pos = target.building.getBlockWorldPosition(target.row, target.col);
                    const targetX = pos.x + pos.width / 2;
                    const targetY = pos.y + pos.height / 2;

                    // Set velocity toward target with some randomness
                    this.velX = (targetX - this.x) + (Math.random() - 0.5) * 100;
                    this.velY = (targetY - this.y) + (Math.random() - 0.5) * 60;
                    this.normalizeVelocity();
                }
            } else {
                // Random direction change (erratic movement)
                this.velX += (Math.random() - 0.5) * 1.5;
                this.velY += (Math.random() - 0.5) * 1.0;
                this.normalizeVelocity();
            }
        }

        // Calculate swooping offset (sinusoidal vertical wobble)
        const swoopOffset = Math.sin(this.flightPhase) * this.swoopAmplitude * deltaTime;

        // Apply movement with swoop
        const speedMultiplier = this.type === EnemyType.AGGRESSIVE ? 1.3 : 1.0;
        const newX = this.x + this.velX * this.speed * speedMultiplier * deltaTime;
        const newY = this.y + this.velY * this.speed * speedMultiplier * deltaTime + swoopOffset;

        // Check building collision before moving
        if (!this.checkBuildingCollision(newX, newY)) {
            this.x = newX;
            this.y = newY;
        } else {
            // Bounce off building
            this.velX = -this.velX + (Math.random() - 0.5) * 0.5;
            this.velY = -this.velY + (Math.random() - 0.5) * 0.5;
            this.normalizeVelocity();
        }

        // Bounce off screen edges (stay in play area)
        if (this.x < 40) {
            this.x = 40;
            this.velX = Math.abs(this.velX);
        }
        if (this.x > CONFIG.CANVAS_WIDTH - 40) {
            this.x = CONFIG.CANVAS_WIDTH - 40;
            this.velX = -Math.abs(this.velX);
        }
        if (this.y < CONFIG.SKY_TOP + 30) {
            this.y = CONFIG.SKY_TOP + 30;
            this.velY = Math.abs(this.velY);
        }
        if (this.y > CONFIG.STREET_Y - 40) {
            this.y = CONFIG.STREET_Y - 40;
            this.velY = -Math.abs(this.velY);
        }

        // Check if close to target block to start attacking
        if (this.targetBlock) {
            const pos = this.targetBlock.building.getBlockWorldPosition(
                this.targetBlock.row,
                this.targetBlock.col
            );
            const targetX = pos.x + pos.width / 2;
            const targetY = pos.y + pos.height / 2;
            const dist = Math.sqrt(
                Math.pow(targetX - this.x, 2) + Math.pow(targetY - this.y, 2)
            );

            if (dist < 15) {
                // Check if block still exists
                if (this.targetBlock.building.blocks[this.targetBlock.row]?.[this.targetBlock.col]) {
                    // Snap to block and start attacking
                    this.x = targetX;
                    this.y = targetY;
                    this.state = EnemyState.ATTACKING;
                    this.attackTimer = 0;
                    this.attackDuration = this.attackTimeMin +
                        Math.random() * (this.attackTimeMax - this.attackTimeMin);
                } else {
                    // Block was destroyed, find new target
                    this.targetBlock = null;
                }
            }
        }
    }

    updateAttacking(deltaTime) {
        this.attackTimer += deltaTime;

        // Pecking animation
        this.peckTimer += deltaTime * 15;
        this.peckOffset = Math.sin(this.peckTimer) * 3;

        // Check if block still exists
        if (this.targetBlock && !this.targetBlock.building.blocks[this.targetBlock.row]?.[this.targetBlock.col]) {
            // Block was destroyed by something else
            this.state = EnemyState.FLYING;
            this.targetBlock = null;
            return;
        }

        if (this.attackTimer >= this.attackDuration) {
            // Destroy the block
            if (this.targetBlock) {
                this.targetBlock.building.destroyBlock(this.targetBlock.row, this.targetBlock.col);
            }

            // Fly off to find new target
            this.state = EnemyState.FLYING;
            this.targetBlock = null;

            // Random direction after attack
            this.velX = (Math.random() - 0.5) * 2;
            this.velY = -Math.abs(Math.random() * 0.5 + 0.5); // Tend to fly upward
            this.normalizeVelocity();
        }
    }

    checkBuildingCollision(x, y) {
        // Check if position collides with any building block
        for (const building of buildingManager.buildings) {
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

    updateFalling(deltaTime) {
        // Apply gravity
        this.fallSpeed += this.fallGravity * deltaTime;
        this.y += this.fallSpeed * deltaTime;

        // Check for building collision while falling
        for (const building of buildingManager.buildings) {
            for (let row = 0; row < building.heightBlocks; row++) {
                for (let col = 0; col < building.widthBlocks; col++) {
                    if (!building.blocks[row][col]) continue;

                    const pos = building.getBlockWorldPosition(row, col);
                    if (this.x > pos.x - this.width/2 && this.x < pos.x + pos.width + this.width/2 &&
                        this.y > pos.y - this.height/2 && this.y < pos.y + pos.height + this.height/2) {
                        // Hit a building! Cause damage
                        this.causeFallingDamage(building, row, col);
                        this.state = EnemyState.DEAD;
                        this.active = false;
                        SoundManager.fallingCrash();
                        return;
                    }
                }
            }
        }

        // Hit the ground
        if (this.y > CONFIG.STREET_Y) {
            this.state = EnemyState.DEAD;
            this.active = false;
        }
    }

    causeFallingDamage(building, hitRow, hitCol) {
        // Destroy 2-4 blocks around impact point
        const damageCount = 2 + Math.floor(Math.random() * 3);
        let destroyed = 0;

        // Start from hit block and spread outward
        const toDestroy = [{ row: hitRow, col: hitCol }];
        const checked = new Set();

        while (toDestroy.length > 0 && destroyed < damageCount) {
            const { row, col } = toDestroy.shift();
            const key = `${row},${col}`;

            if (checked.has(key)) continue;
            checked.add(key);

            if (row >= 0 && row < building.heightBlocks &&
                col >= 0 && col < building.widthBlocks &&
                building.blocks[row][col]) {
                // Spawn debris for impact effect before destroying
                building.spawnDebris(row, col);
                building.destroyBlock(row, col);
                destroyed++;

                // Add neighbors to check
                toDestroy.push({ row: row - 1, col: col });
                toDestroy.push({ row: row + 1, col: col });
                toDestroy.push({ row: row, col: col - 1 });
                toDestroy.push({ row: row, col: col + 1 });
            }
        }

        console.log(`Falling enemy caused ${destroyed} blocks of damage!`);
    }

    die() {
        if (this.type === EnemyType.AGGRESSIVE) {
            // Red enemies fall instead of dying instantly
            this.state = EnemyState.FALLING;
            this.fallSpeed = 0;
            SoundManager.enemyFalling();
        } else {
            this.state = EnemyState.DEAD;
            this.active = false;
            SoundManager.enemyDeath();
        }
    }

    render(ctx) {
        if (this.state === EnemyState.DEAD) return;

        ctx.save();

        // Falling enemies rotate as they fall
        if (this.state === EnemyState.FALLING) {
            ctx.translate(this.x, this.y);
            ctx.rotate(this.fallSpeed * 0.01); // Spin based on fall speed
        } else {
            ctx.translate(this.x, this.y + (this.state === EnemyState.ATTACKING ? this.peckOffset : 0));
        }

        // Color based on type (darker when falling/dead)
        let color = this.type === EnemyType.AGGRESSIVE ? '#dc2626' : '#9333ea';
        if (this.state === EnemyState.FALLING) {
            color = '#7f1d1d'; // Dark red when falling
        }

        // Draw body (bat-like oval)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.width / 2, this.height / 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw wings (flapping animation - faster when aggressive)
        const flapSpeed = this.type === EnemyType.AGGRESSIVE ? 80 : 100;
        const wingFlap = Math.sin(Date.now() / flapSpeed) * 8;

        ctx.fillStyle = color;
        // Left wing
        ctx.beginPath();
        ctx.moveTo(-4, 0);
        ctx.quadraticCurveTo(-12, -10 + wingFlap, -18, -5 + wingFlap);
        ctx.quadraticCurveTo(-14, 2, -8, 3);
        ctx.closePath();
        ctx.fill();

        // Right wing
        ctx.beginPath();
        ctx.moveTo(4, 0);
        ctx.quadraticCurveTo(12, -10 - wingFlap, 18, -5 - wingFlap);
        ctx.quadraticCurveTo(14, 2, 8, 3);
        ctx.closePath();
        ctx.fill();

        // Draw eyes
        if (this.state === EnemyState.FALLING) {
            // X eyes when dead/falling
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            // Left X
            ctx.beginPath();
            ctx.moveTo(-5, -4);
            ctx.lineTo(-1, 0);
            ctx.moveTo(-5, 0);
            ctx.lineTo(-1, -4);
            ctx.stroke();
            // Right X
            ctx.beginPath();
            ctx.moveTo(1, -4);
            ctx.lineTo(5, 0);
            ctx.moveTo(1, 0);
            ctx.lineTo(5, -4);
            ctx.stroke();
        } else {
            // Normal beady eyes
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(-3, -2, 2.5, 0, Math.PI * 2);
            ctx.arc(3, -2, 2.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(-3, -2, 1.2, 0, Math.PI * 2);
            ctx.arc(3, -2, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw beak/mouth (tongue out when falling)
        ctx.fillStyle = '#ffa500';
        ctx.beginPath();
        ctx.moveTo(0, 1);
        ctx.lineTo(-2, 4);
        ctx.lineTo(2, 4);
        ctx.closePath();
        ctx.fill();

        if (this.state === EnemyState.FALLING) {
            // Tongue sticking out
            ctx.fillStyle = '#ff6b6b';
            ctx.beginPath();
            ctx.ellipse(0, 6, 2, 3, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Show attack progress if attacking
        if (this.state === EnemyState.ATTACKING) {
            const progress = this.attackTimer / this.attackDuration;
            ctx.fillStyle = '#ff000088';
            ctx.fillRect(-10, 12, 20 * progress, 3);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.strokeRect(-10, 12, 20, 3);
        }

        ctx.restore();
    }
}

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

        // Erratic movement for boss too
        this.swoopPhase = 0;
    }

    update(deltaTime, playerX, playerY, projectileManager) {
        // Erratic side-to-side with swoop
        this.swoopPhase += deltaTime * 2;
        const swoopOffset = Math.sin(this.swoopPhase) * 30 * deltaTime;

        this.x += this.direction * this.speed * deltaTime + swoopOffset;

        if (this.x > CONFIG.CANVAS_WIDTH - 100) {
            this.direction = -1;
        } else if (this.x < 100) {
            this.direction = 1;
        }

        // Slowly drift in Y with some wobble
        const targetY = CONFIG.SKY_TOP + 60 + Math.sin(this.swoopPhase * 0.5) * 40;
        this.y += (targetY - this.y) * deltaTime;
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

        // Body (large bat-like)
        ctx.fillStyle = '#7c3aed';
        ctx.beginPath();
        ctx.ellipse(0, 0, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Large wings
        const wingFlap = Math.sin(Date.now() / 150) * 10;
        ctx.fillStyle = '#a855f7';

        // Left wing
        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.quadraticCurveTo(-40, -20 + wingFlap, -55, -10 + wingFlap);
        ctx.quadraticCurveTo(-45, 5, -25, 8);
        ctx.closePath();
        ctx.fill();

        // Right wing
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.quadraticCurveTo(40, -20 - wingFlap, 55, -10 - wingFlap);
        ctx.quadraticCurveTo(45, 5, 25, 8);
        ctx.closePath();
        ctx.fill();

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

        // Fangs
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(-5, 8);
        ctx.lineTo(-3, 16);
        ctx.lineTo(-1, 8);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(5, 8);
        ctx.lineTo(3, 16);
        ctx.lineTo(1, 8);
        ctx.closePath();
        ctx.fill();

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

class EnemyManager {
    constructor() {
        this.enemies = [];
        this.boss = null;
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
        this.maxConcurrentEnemies = 1;
        this.aggressiveRatio = 0;
    }

    startWave(waveNum) {
        this.waveNumber = waveNum;
        this.waveComplete = false;

        // Shorter waves - faster paced gameplay
        switch (waveNum) {
            case 1:
                this.maxConcurrentEnemies = 1;
                this.aggressiveRatio = 0;  // No red enemies in wave 1
                this.enemiesRemainingInWave = 5;
                break;
            case 2:
                this.maxConcurrentEnemies = 2;
                this.aggressiveRatio = 0.2;
                this.enemiesRemainingInWave = 7;
                break;
            case 3:
                this.maxConcurrentEnemies = 2;
                this.aggressiveRatio = 0.35;
                this.enemiesRemainingInWave = 9;
                break;
            case 4:
                this.maxConcurrentEnemies = 3;
                this.aggressiveRatio = 0.5;
                this.enemiesRemainingInWave = 12;
                break;
            default:
                this.maxConcurrentEnemies = 3;
                this.aggressiveRatio = 0.6;
                this.enemiesRemainingInWave = 12 + (waveNum - 4) * 3;
        }

        console.log(`Wave ${waveNum} started! ${this.enemiesRemainingInWave} enemies, max ${this.maxConcurrentEnemies} at once.`);
    }

    spawnEnemy() {
        if (this.enemiesRemainingInWave <= 0) return;
        if (this.enemies.length >= this.maxConcurrentEnemies) return;

        // Determine enemy type based on wave difficulty
        const isAggressive = Math.random() < this.aggressiveRatio;
        const type = isAggressive ? EnemyType.AGGRESSIVE : EnemyType.STANDARD;

        // Spawn from screen edge (left, right, or top like original)
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

        this.enemies.push(new Enemy(x, y, type));
        this.enemiesRemainingInWave--;
    }

    spawnBoss() {
        this.boss = new Boss();
        console.log('BOSS SPAWNED!');
    }

    update(deltaTime, playerX, playerY, projectileManager) {
        // Handle wave breaks (shorter break between waves)
        if (this.betweenWaves) {
            this.waveBreakTimer += deltaTime;
            if (this.waveBreakTimer >= 2) {
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

        // Spawn enemies (respecting max concurrent limit)
        if (this.enemiesRemainingInWave > 0 && !this.boss) {
            this.spawnTimer += deltaTime;
            // Faster spawn rate for quicker waves
            const spawnRate = Math.max(0.8, 1.8 - this.waveNumber * 0.2);
            if (this.spawnTimer >= spawnRate) {
                this.spawnEnemy();
                this.spawnTimer = 0;
            }
        }

        // Update enemies (no player position needed - they don't chase)
        this.enemies.forEach(e => e.update(deltaTime));

        // Remove dead enemies
        this.enemies = this.enemies.filter(e => e.active);

        // Check wave completion
        if (!this.boss && this.enemiesRemainingInWave <= 0 && this.enemies.length === 0 && !this.waveComplete) {
            this.waveComplete = true;
            this.betweenWaves = true;
            this.waveBreakTimer = 0;
            DayCycle.advance();
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

const enemyManager = new EnemyManager();
