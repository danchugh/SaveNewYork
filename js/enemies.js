const EnemyType = {
    STANDARD: 'standard',    // Normal building attacker (purple)
    AGGRESSIVE: 'aggressive', // Faster, more erratic, quicker attacks (red)
    TANK: 'tank',            // Slow, tough, destroys more blocks (green)
    SPLITTER: 'splitter',    // Splits into 2 when killed (cyan)
    BOMBER: 'bomber'         // Kamikaze dive at player (orange)
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
        this.health = 1;
        this.blocksToDestroy = 1;

        // Bomber-specific properties
        this.divingAtPlayer = false;
        this.diveTimer = 0;

        // Type-based stats (reduced attack times for faster building damage)
        if (type === EnemyType.AGGRESSIVE) {
            this.speed = 90;
            this.attackTimeMin = 0.8;
            this.attackTimeMax = 2;
        } else if (type === EnemyType.TANK) {
            this.speed = 40;
            this.health = 3;
            this.width = 24;
            this.height = 24;
            this.blocksToDestroy = 2;
            this.attackTimeMin = 0.5;
            this.attackTimeMax = 1.5;
        } else if (type === EnemyType.SPLITTER) {
            this.speed = 70;
            this.attackTimeMin = 2;
            this.attackTimeMax = 5;
        } else if (type === EnemyType.BOMBER) {
            this.speed = 100;
            this.attackTimeMin = 999;
            this.attackTimeMax = 999;
            this.diveTimer = 3 + Math.random() * 4; // 3-7 seconds before diving
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
        // Bomber diving behavior
        if (this.type === EnemyType.BOMBER) {
            if (!this.divingAtPlayer) {
                // Count down to dive
                this.diveTimer -= deltaTime;
                if (this.diveTimer <= 0) {
                    this.divingAtPlayer = true;
                    SoundManager.bomberDive();
                }
            }

            if (this.divingAtPlayer) {
                // Dive toward player at 2x speed
                const dx = player.x - this.x;
                const dy = player.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    this.x += (dx / dist) * this.speed * 2 * deltaTime;
                    this.y += (dy / dist) * this.speed * 2 * deltaTime;
                }

                // Check if hit ground
                if (this.y > CONFIG.STREET_Y) {
                    this.state = EnemyState.DEAD;
                    this.active = false;
                    SoundManager.bomberCrash();
                }
                return; // Skip normal flying behavior when diving
            }
        }

        // Update flight phase for swooping motion
        this.flightPhase += deltaTime * this.swoopFrequency;

        // Random direction changes (bat-like erratic movement)
        this.directionChangeTimer += deltaTime;
        if (this.directionChangeTimer >= this.directionChangeInterval) {
            this.directionChangeTimer = 0;
            this.directionChangeInterval = 0.2 + Math.random() * 0.6;

            // Decide behavior: random wander or seek building (bombers don't seek buildings)
            if (Math.random() < 0.4 && this.type !== EnemyType.BOMBER) {
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
                const building = this.targetBlock.building;
                const row = this.targetBlock.row;
                const col = this.targetBlock.col;
                building.destroyBlock(row, col);

                // Tank destroys multiple blocks
                if (this.blocksToDestroy > 1) {
                    // Try to destroy an adjacent block
                    const adjacentOffsets = [
                        { r: 0, c: -1 }, { r: 0, c: 1 },
                        { r: -1, c: 0 }, { r: 1, c: 0 }
                    ];
                    for (const offset of adjacentOffsets) {
                        const adjRow = row + offset.r;
                        const adjCol = col + offset.c;
                        if (adjRow >= 0 && adjRow < building.heightBlocks &&
                            adjCol >= 0 && adjCol < building.widthBlocks &&
                            building.blocks[adjRow]?.[adjCol]) {
                            building.destroyBlock(adjRow, adjCol);
                            break; // Only destroy one extra block
                        }
                    }
                }
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
        if (this.type === EnemyType.SPLITTER) {
            // Splitter dies and spawns 2 standard enemies
            this.state = EnemyState.DEAD;
            this.active = false;
            this.spawnSplitEnemies();
            SoundManager.enemySplit();
        } else if (this.type === EnemyType.TANK) {
            // Tank takes multiple hits
            this.health--;
            if (this.health <= 0) {
                this.state = EnemyState.DEAD;
                this.active = false;
                SoundManager.tankDeath();
            } else {
                SoundManager.tankHit();
            }
        } else if (this.type === EnemyType.AGGRESSIVE) {
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

    spawnSplitEnemies() {
        const offset = 20;
        enemyManager.enemies.push(new Enemy(this.x - offset, this.y, EnemyType.STANDARD));
        enemyManager.enemies.push(new Enemy(this.x + offset, this.y, EnemyType.STANDARD));
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
        let color;
        switch (this.type) {
            case EnemyType.AGGRESSIVE:
                color = '#dc2626'; // Red
                break;
            case EnemyType.TANK:
                color = '#16a34a'; // Green
                break;
            case EnemyType.SPLITTER:
                color = '#06b6d4'; // Cyan
                break;
            case EnemyType.BOMBER:
                color = '#f97316'; // Orange
                break;
            default:
                color = '#9333ea'; // Purple (standard)
        }
        if (this.state === EnemyState.FALLING) {
            color = '#7f1d1d'; // Dark red when falling
        }

        // Bomber flame trail when diving
        if (this.type === EnemyType.BOMBER && this.divingAtPlayer) {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.moveTo(0, -this.height / 2);
            ctx.lineTo(-6, -this.height - 8 - Math.random() * 6);
            ctx.lineTo(0, -this.height - 4);
            ctx.lineTo(6, -this.height - 8 - Math.random() * 6);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.moveTo(0, -this.height / 2);
            ctx.lineTo(-3, -this.height - 4 - Math.random() * 4);
            ctx.lineTo(0, -this.height);
            ctx.lineTo(3, -this.height - 4 - Math.random() * 4);
            ctx.closePath();
            ctx.fill();
        }

        // Draw body (bat-like oval, larger for tank)
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.width / 2, this.height / 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Tank armor plates (stroke around body)
        if (this.type === EnemyType.TANK) {
            ctx.strokeStyle = '#15803d';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(0, 0, this.width / 2, this.height / 2.5, 0, 0, Math.PI * 2);
            ctx.stroke();
            // Additional armor lines
            ctx.beginPath();
            ctx.moveTo(-this.width / 3, -this.height / 4);
            ctx.lineTo(this.width / 3, -this.height / 4);
            ctx.stroke();
        }

        // Draw wings (flapping animation - faster when aggressive)
        let flapSpeed = 100;
        if (this.type === EnemyType.AGGRESSIVE) flapSpeed = 80;
        if (this.type === EnemyType.BOMBER && this.divingAtPlayer) flapSpeed = 50;
        const wingFlap = Math.sin(Date.now() / flapSpeed) * 8;

        const wingScale = this.type === EnemyType.TANK ? 1.5 : 1.0;

        ctx.fillStyle = color;
        // Left wing
        ctx.beginPath();
        ctx.moveTo(-4 * wingScale, 0);
        ctx.quadraticCurveTo(-12 * wingScale, -10 + wingFlap, -18 * wingScale, -5 + wingFlap);
        ctx.quadraticCurveTo(-14 * wingScale, 2, -8 * wingScale, 3);
        ctx.closePath();
        ctx.fill();

        // Right wing
        ctx.beginPath();
        ctx.moveTo(4 * wingScale, 0);
        ctx.quadraticCurveTo(12 * wingScale, -10 - wingFlap, 18 * wingScale, -5 - wingFlap);
        ctx.quadraticCurveTo(14 * wingScale, 2, 8 * wingScale, 3);
        ctx.closePath();
        ctx.fill();

        // Splitter sparkle effect
        if (this.type === EnemyType.SPLITTER) {
            const sparkleTime = Date.now() / 100;
            ctx.fillStyle = '#fff';
            for (let i = 0; i < 3; i++) {
                const angle = sparkleTime + i * 2.1;
                const sx = Math.cos(angle) * 10;
                const sy = Math.sin(angle) * 8;
                ctx.beginPath();
                ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

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
            // Normal beady eyes (adjusted for tank size)
            const eyeScale = this.type === EnemyType.TANK ? 1.3 : 1.0;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(-3 * eyeScale, -2 * eyeScale, 2.5 * eyeScale, 0, Math.PI * 2);
            ctx.arc(3 * eyeScale, -2 * eyeScale, 2.5 * eyeScale, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(-3 * eyeScale, -2 * eyeScale, 1.2 * eyeScale, 0, Math.PI * 2);
            ctx.arc(3 * eyeScale, -2 * eyeScale, 1.2 * eyeScale, 0, Math.PI * 2);
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

        // Tank health indicator dots above
        if (this.type === EnemyType.TANK && this.health > 0) {
            const dotSpacing = 8;
            const startX = -((this.health - 1) * dotSpacing) / 2;
            for (let i = 0; i < this.health; i++) {
                ctx.fillStyle = '#4ade80';
                ctx.beginPath();
                ctx.arc(startX + i * dotSpacing, -this.height / 2 - 8, 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#166534';
                ctx.lineWidth = 1;
                ctx.stroke();
            }
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
            this.speed = 120;
            this.chargeTimer = 0;
            this.chargeInterval = 3;
            this.isCharging = false;
            this.chargeTarget = null;
        } else {
            // gunner
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
        if (this.isCharging && this.chargeTarget) {
            // Move toward target building at 2x speed
            const targetX = this.chargeTarget.x + this.chargeTarget.width / 2;
            const targetY = this.chargeTarget.y;
            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 20) {
                this.x += (dx / dist) * this.speed * 2 * deltaTime;
                this.y += (dy / dist) * this.speed * 2 * deltaTime;
            } else {
                // Reached target - destroy top blocks in each column
                SoundManager.miniBossRam();
                const building = this.chargeTarget.building;
                for (let col = 0; col < building.widthBlocks; col++) {
                    // Find and destroy the top block in this column
                    for (let row = 0; row < building.heightBlocks; row++) {
                        if (building.blocks[row] && building.blocks[row][col]) {
                            building.destroyBlock(row, col);
                            break;
                        }
                    }
                }
                this.isCharging = false;
                this.chargeTarget = null;
                this.chargeTimer = 0;
            }
        } else {
            // Normal swoop movement - figure-8 pattern
            this.swoopPhase += deltaTime * 2;
            const swoopX = Math.sin(this.swoopPhase) * 100 * deltaTime;
            const swoopY = Math.sin(this.swoopPhase * 2) * 50 * deltaTime;

            this.x += this.direction * this.speed * deltaTime + swoopX;
            this.y += swoopY;

            // Bounce off screen edges
            if (this.x > CONFIG.CANVAS_WIDTH - 80) {
                this.x = CONFIG.CANVAS_WIDTH - 80;
                this.direction = -1;
            } else if (this.x < 80) {
                this.x = 80;
                this.direction = 1;
            }

            // Keep in vertical bounds
            if (this.y < CONFIG.SKY_TOP + 50) {
                this.y = CONFIG.SKY_TOP + 50;
            } else if (this.y > CONFIG.STREET_Y - 80) {
                this.y = CONFIG.STREET_Y - 80;
            }

            // Charge timer
            this.chargeTimer += deltaTime;
            if (this.chargeTimer >= this.chargeInterval) {
                // Pick random building to charge at
                const buildings = buildingManager.buildings.filter(b => b.getBlockCount() > 0);
                if (buildings.length > 0) {
                    const targetBuilding = buildings[Math.floor(Math.random() * buildings.length)];
                    // Find top of building
                    let topRow = targetBuilding.heightBlocks;
                    for (let row = 0; row < targetBuilding.heightBlocks; row++) {
                        for (let col = 0; col < targetBuilding.widthBlocks; col++) {
                            if (targetBuilding.blocks[row] && targetBuilding.blocks[row][col]) {
                                topRow = Math.min(topRow, row);
                                break;
                            }
                        }
                    }
                    const pos = targetBuilding.getBlockWorldPosition(topRow, Math.floor(targetBuilding.widthBlocks / 2));
                    this.chargeTarget = {
                        building: targetBuilding,
                        x: pos.x,
                        y: pos.y,
                        width: pos.width
                    };
                    this.isCharging = true;
                    SoundManager.miniBossCharge();
                }
            }
        }
    }

    updateGunner(deltaTime, playerX, playerY, projectileManager) {
        // Circular swoop pattern
        this.swoopPhase += deltaTime * 1.5;
        const centerX = CONFIG.CANVAS_WIDTH / 2;
        const centerY = CONFIG.SKY_TOP + 120;
        const radiusX = 200;
        const radiusY = 60;

        this.x = centerX + Math.cos(this.swoopPhase) * radiusX;
        this.y = centerY + Math.sin(this.swoopPhase) * radiusY;

        // Burst fire at player
        if (this.burstCooldown > 0) {
            this.burstCooldown -= deltaTime;
        } else {
            this.fireTimer += deltaTime;
            if (this.fireTimer >= this.fireInterval) {
                this.fireTimer = 0;
                this.burstCount++;

                // Fire at player
                const angle = Math.atan2(playerY - this.y, playerX - this.x) * 180 / Math.PI;
                projectileManager.add(this.x, this.y + 15, angle, 180, false);
                SoundManager.miniBossShoot();

                if (this.burstCount >= this.maxBurst) {
                    this.burstCount = 0;
                    this.burstCooldown = 2; // 2 second cooldown after burst
                }
            }
        }
    }

    takeDamage() {
        this.health--;
        if (this.health <= 0) {
            this.active = false;
            SoundManager.miniBossDefeat();
            return true; // Mini-boss defeated
        }
        SoundManager.miniBossHit();
        return false;
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Body color based on type
        const bodyColor = this.type === 'charger' ? '#dc2626' : '#7c3aed';
        const wingColor = this.type === 'charger' ? '#ef4444' : '#a855f7';

        // Wing flapping animation
        const wingFlap = Math.sin(Date.now() / 100) * 10;

        // Left wing
        ctx.fillStyle = wingColor;
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.quadraticCurveTo(-25, -15 + wingFlap, -35, -8 + wingFlap);
        ctx.quadraticCurveTo(-28, 3, -15, 5);
        ctx.closePath();
        ctx.fill();

        // Right wing
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.quadraticCurveTo(25, -15 - wingFlap, 35, -8 - wingFlap);
        ctx.quadraticCurveTo(28, 3, 15, 5);
        ctx.closePath();
        ctx.fill();

        // Body (ellipse)
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(-8, -5, 5, 0, Math.PI * 2);
        ctx.arc(8, -5, 5, 0, Math.PI * 2);
        ctx.fill();

        // Pupils (charger=black, gunner=red)
        ctx.fillStyle = this.type === 'charger' ? '#000' : '#ef4444';
        ctx.beginPath();
        ctx.arc(-8, -5, 2.5, 0, Math.PI * 2);
        ctx.arc(8, -5, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Type-specific features
        if (this.type === 'charger') {
            // Horns
            ctx.fillStyle = '#991b1b';
            ctx.beginPath();
            ctx.moveTo(-10, -12);
            ctx.lineTo(-15, -25);
            ctx.lineTo(-5, -15);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(10, -12);
            ctx.lineTo(15, -25);
            ctx.lineTo(5, -15);
            ctx.closePath();
            ctx.fill();
        } else {
            // Gunner cannon below body
            ctx.fillStyle = '#4b5563';
            ctx.fillRect(-6, 10, 12, 10);
            ctx.fillStyle = '#374151';
            ctx.beginPath();
            ctx.arc(0, 20, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // Health bar above
        const barWidth = 60;
        const barHeight = 6;
        const barX = this.x - barWidth / 2;
        const barY = this.y - 30;

        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        ctx.fillStyle = '#fbbf24'; // Yellow fill
        ctx.fillRect(barX, barY, barWidth * (this.health / this.maxHealth), barHeight);

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // "MINI-BOSS" label
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('MINI-BOSS', this.x, barY - 4);
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

        console.log(`Wave ${waveNum} started! ${this.enemiesRemainingInWave} enemies, max ${this.maxConcurrentEnemies} at once. Types: ${this.availableTypes.join(', ')}`);
    }

    pickEnemyType() {
        // Weighted random selection based on available types
        // Weights: STANDARD=50%, AGGRESSIVE=20%, SPLITTER=15%, BOMBER=10%, TANK=5%
        const weights = {
            [EnemyType.STANDARD]: 50,
            [EnemyType.AGGRESSIVE]: 20,
            [EnemyType.SPLITTER]: 15,
            [EnemyType.BOMBER]: 10,
            [EnemyType.TANK]: 5
        };

        // Calculate total weight of available types
        let totalWeight = 0;
        for (const type of this.availableTypes) {
            totalWeight += weights[type];
        }

        // Random selection
        let random = Math.random() * totalWeight;
        for (const type of this.availableTypes) {
            random -= weights[type];
            if (random <= 0) {
                return type;
            }
        }

        return EnemyType.STANDARD; // Fallback
    }

    spawnEnemy() {
        if (this.enemiesRemainingInWave <= 0) return;
        if (this.enemies.length >= this.maxConcurrentEnemies) return;

        // Determine enemy type using weighted random selection
        const type = this.pickEnemyType();

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
                if (this.pendingMiniBoss) {
                    this.miniBoss = new MiniBoss(this.pendingMiniBoss);
                    this.pendingMiniBoss = null;
                    SoundManager.miniBossAppear();
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
        if (this.miniBoss && this.miniBoss.active) {
            this.miniBoss.update(deltaTime, playerX, playerY, projectileManager);
        }

        // Check mini-boss defeat
        if (this.miniBoss && !this.miniBoss.active) {
            this.miniBoss = null;
            this.betweenWaves = true;
            this.waveBreakTimer = 0;
            console.log('Mini-boss defeated! Next wave incoming...');
        }

        // Update boss if present
        if (this.boss && this.boss.active) {
            this.boss.update(deltaTime, playerX, playerY, projectileManager);
        }

        // Spawn enemies (respecting max concurrent limit) - don't spawn during mini-boss
        if (this.enemiesRemainingInWave > 0 && !this.boss && !this.miniBoss) {
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

        // Check wave completion - don't trigger if mini-boss is active
        if (!this.boss && !this.miniBoss && this.enemiesRemainingInWave <= 0 && this.enemies.length === 0 && !this.waveComplete) {
            this.waveComplete = true;
            this.betweenWaves = true;
            this.waveBreakTimer = 0;
            DayCycle.advance();
            console.log(`Wave ${this.waveNumber} complete!`);

            // Schedule mini-boss after waves 2 and 4
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
}

const enemyManager = new EnemyManager();
