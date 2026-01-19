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
    SCORPION: 'scorpion'
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
        this.burstTimer = 4 + Math.random(); // 4-5 seconds
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
                this.gunshipAttackFrameTriggered = false;  // Track if bombs fired this attack
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
                this.health = 1;
                this.maxHealth = 1;
                this.width = 24;
                this.height = 24;
                this.spiralAngle = 0;
                this.spiralRadius = 30;
                this.targetBuilding = null;
                break;

            case EnemyType.SANDWORM:
                this.speed = 60;
                this.health = 2;
                this.maxHealth = 2;
                this.width = 30;
                this.height = 20;
                this.currentBuildingIndex = 0;
                this.isSurfacing = false;
                this.surfaceTimer = 0;
                this.hasAttacked = false;
                this.targetX = 0;
                this.y = CONFIG.STREET_Y - 10; // Just below ground level
                break;

            case EnemyType.SAND_CARRIER:
                this.speed = CONFIG.CARRIER_SPEED || 30;
                this.health = 3;
                this.maxHealth = 3;
                this.width = 96;
                this.height = 96;
                this.podDropTimer = 2;
                this.podDropInterval = 3;
                this.carrierMovingRight = Math.random() < 0.5;
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

    update(deltaTime) {
        if (this.state === EnemyState.DEAD) return;

        // Update animations for STANDARD, AGGRESSIVE, SPLITTER (carrier), and TANK (gunship) types
        if ((this.type === EnemyType.STANDARD || this.type === EnemyType.AGGRESSIVE || this.type === EnemyType.SPLITTER || this.type === EnemyType.TANK) && this.animations) {
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
            this.targetX = targetBuilding.x + (targetBuilding.widthBlocks * CONFIG.BLOCK_SIZE) / 2;
            const speedMod = this.bellSlowed ? 0.3 : 1.0;

            if (!this.isSurfacing) {
                const dx = this.targetX - this.x;
                if (Math.abs(dx) > 10) {
                    this.x += Math.sign(dx) * this.speed * speedMod * deltaTime;
                } else {
                    this.isSurfacing = true;
                    this.surfaceTimer = 1.5;
                    this.hasAttacked = false;
                }
            } else {
                this.surfaceTimer -= deltaTime;

                if (this.surfaceTimer <= 1.0 && !this.hasAttacked) {
                    this.hasAttacked = true;
                    const blocksToDestroy = 1 + Math.floor(Math.random() * 2);
                    for (let i = 0; i < blocksToDestroy; i++) {
                        const col = Math.floor(targetBuilding.widthBlocks / 2) + i - 1;
                        const row = targetBuilding.heightBlocks - 1;
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
                    this.currentBuildingIndex++;
                }
            }
            return;
        }

        // Sand Carrier: Flies across, drops burrowing pods
        if (this.type === EnemyType.SAND_CARRIER) {
            const speedMod = this.bellSlowed ? 0.3 : 1.0;

            // Horizontal movement
            if (this.carrierMovingRight) {
                this.x += this.speed * speedMod * deltaTime;
                if (this.x > CONFIG.CANVAS_WIDTH + 50) this.carrierMovingRight = false;
            } else {
                this.x -= this.speed * speedMod * deltaTime;
                if (this.x < -50) this.carrierMovingRight = true;
            }

            // Maintain altitude above buildings
            const targetAltitude = 150;
            if (this.y > targetAltitude) this.y -= 20 * deltaTime;
            if (this.y < targetAltitude) this.y += 20 * deltaTime;

            // Drop pods periodically
            this.podDropTimer -= deltaTime;
            if (this.podDropTimer <= 0) {
                this.podDropTimer = this.podDropInterval;
                const pod = new BurrowingPod(this.x, CONFIG.STREET_Y - 5);
                burrowingPods.push(pod);
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

        // Gunship (TANK) Logic - horizontal patrol with building bombardment
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

            // Move horizontally
            const direction = this.gunshipPatrolRight ? 1 : -1;
            const gunshipSpeedMod = this.bellSlowed ? 0.3 : 1.0;
            this.x += direction * this.speed * gunshipSpeedMod * deltaTime;

            // Bounce off screen edges
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

            // Update attack cooldown
            this.gunshipAttackCooldown -= deltaTime;

            // Check for attack (cooldown + building proximity)
            if (this.gunshipAttackCooldown <= 0 && this.state === EnemyState.FLYING) {
                // Check if there's a building below within attack range
                let nearBuilding = false;
                if (typeof buildingManager !== 'undefined') {
                    for (const building of buildingManager.buildings) {
                        // Check if gunship is horizontally over this building
                        if (this.x >= building.x - CONFIG.GUNSHIP_ATTACK_RANGE &&
                            this.x <= building.x + building.widthBlocks * CONFIG.BLOCK_SIZE + CONFIG.GUNSHIP_ATTACK_RANGE) {
                            // Check if building has blocks
                            let hasBlocks = false;
                            for (let row = 0; row < building.heightBlocks && !hasBlocks; row++) {
                                for (let col = 0; col < building.widthBlocks && !hasBlocks; col++) {
                                    if (building.blocks[row]?.[col]) {
                                        hasBlocks = true;
                                    }
                                }
                            }
                            if (hasBlocks) {
                                nearBuilding = true;
                                break;
                            }
                        }
                    }
                }

                if (nearBuilding) {
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

        // GUNSHIP (TANK): hovers in place, fires bombs at frame 4
        if (this.type === EnemyType.TANK) {
            // Hover with slight shake during attack
            this.x += (Math.random() - 0.5) * 1.5;
            this.y += (Math.random() - 0.5) * 1.5;

            if (this.animations && this.animations.attack) {
                const anim = this.animations.attack;

                // Check for attack frame to fire bombs (only once per attack)
                if (!this.gunshipAttackFrameTriggered && anim.currentFrame >= CONFIG.GUNSHIP_ATTACK_FRAME) {
                    this.gunshipAttackFrameTriggered = true;

                    // Fire 3 bomb projectiles in downward spread (-120, -90, -60 degrees)
                    // Angles: -120° = down-left, -90° = straight down, -60° = down-right
                    const bombAngles = [240, 270, 300];  // In degrees (pointing down)
                    if (typeof projectileManager !== 'undefined') {
                        for (let i = 0; i < CONFIG.GUNSHIP_PROJECTILE_COUNT; i++) {
                            const angle = bombAngles[i] || 270;
                            projectileManager.addBomb(
                                this.x,
                                this.y + 30,  // Fire from below gunship
                                angle,
                                CONFIG.GUNSHIP_BOMB_SPEED
                            );
                        }
                    }

                    // Muzzle flash effect
                    if (typeof EffectsManager !== 'undefined') {
                        EffectsManager.addExplosion(this.x, this.y + 35, 20, '#ff8800');
                        EffectsManager.addSparks(this.x, this.y + 30, '#ffaa00');
                    }

                    // Sound effect
                    if (typeof SoundManager !== 'undefined') {
                        SoundManager.shoot();
                    }

                    console.log('Gunship fired bombs');
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
        } else if (this.type !== EnemyType.SPLITTER) {
            // Slight bank based on velocity (skip for carrier - stays horizontal)
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
            const currentAnim = this.animations[this.currentAnimName];
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

        // Update burrowing pods
        burrowingPods.forEach(pod => pod.update(deltaTime));
        burrowingPods = burrowingPods.filter(pod => pod.active);

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
        // Render burrowing pods
        burrowingPods.forEach(pod => pod.render(ctx));
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
