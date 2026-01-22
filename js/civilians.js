// ============================================
// CIVILIAN SYSTEM
// ============================================

const CivilianState = {
    WAITING: 'waiting',
    FALLING: 'falling',
    RESCUED: 'rescued'
};

class Civilian {
    constructor(building) {
        this.building = building;
        this.active = true;
        this.state = CivilianState.WAITING;

        // Find a valid column with blocks to spawn on
        const validColumns = [];
        for (let col = 0; col < building.widthBlocks; col++) {
            // Check if this column has any blocks
            for (let row = 0; row < building.heightBlocks; row++) {
                if (building.blocks[row][col]) {
                    validColumns.push(col);
                    break;
                }
            }
        }

        if (validColumns.length === 0) {
            // No valid columns, mark inactive
            this.active = false;
            this.x = 0;
            this.y = 0;
            this.localX = 0;
            return;
        }

        // Pick a random valid column
        const chosenCol = validColumns[Math.floor(Math.random() * validColumns.length)];
        this.localX = chosenCol * CONFIG.BLOCK_SIZE + CONFIG.BLOCK_SIZE / 2;
        this.updatePosition();

        // Falling physics
        this.fallSpeed = 0;
        this.fallGravity = 400;

        // Initialize animated sprites (lazy - created when first rendered)
        this.animations = null;

        // Animation state tracking
        this.currentAnimName = 'idle';  // 'idle', 'help', or 'fall'
        this.playerInRange = false;
        this.pendingIdleSwitch = false;  // Wait for help animation to finish before switching to idle
        this.lastFrame = 0;  // Track frame to detect animation cycle completion

        // Random animation offset so civilians don't all sync
        this.animOffset = Math.random() * 1000;
    }

    /**
     * Helper to create AnimatedSprite from a sprite sheet
     * @param {string} assetKey - Key for AssetManager
     * @param {number} fps - Frames per second
     * @param {number} scale - Render scale
     * @param {number} frameCountOverride - Optional: actual frame count if sheet has empty trailing frames
     * @returns {AnimatedSprite|null}
     */
    createAnimationFromSheet(assetKey, fps = 8, scale = 1.25, frameCountOverride = null) {
        const sheet = AssetManager.getImage(assetKey);
        if (!sheet || sheet.width <= 0 || sheet.height <= 0) {
            console.warn(`Civilian: ${assetKey} sprite not loaded or invalid`);
            return null;
        }

        // Frame dimensions from naming convention: 32x32_Name.png
        const frameWidth = 32;
        const frameHeight = 32;

        // Calculate frame layout from sheet dimensions
        const framesPerRow = Math.floor(sheet.width / frameWidth);
        const rowCount = Math.floor(sheet.height / frameHeight);
        // Use override if provided (for sheets with empty trailing frames)
        const frameCount = frameCountOverride !== null ? frameCountOverride : (framesPerRow * rowCount);

        if (frameCount <= 0) {
            console.warn(`Civilian: ${assetKey} has no valid frames`);
            return null;
        }

        console.log(`Civilian ${assetKey} loaded:`, {
            sheetSize: `${sheet.width}x${sheet.height}`,
            frames: frameCount,
            framesPerRow: framesPerRow
        });

        return new AnimatedSprite({
            sheet: sheet,
            frameWidth: frameWidth,
            frameHeight: frameHeight,
            frameCount: frameCount,
            framesPerRow: framesPerRow,
            fps: fps,
            mode: 'loop',
            scale: scale
        });
    }

    /**
     * Initialize animated sprites for civilian states
     */
    initAnimations() {
        if (this.animations) return; // Already initialized
        if (typeof AnimatedSprite === 'undefined' || typeof AssetManager === 'undefined') return;

        this.animations = {};

        // Load all civilian sprite sheets (32x32 frames)
        // Idle: 7x7 grid but last cell is empty, so use 48 frames
        this.animations.idle = this.createAnimationFromSheet('civilian_idle', 8, 1.25, 48);
        this.animations.help = this.createAnimationFromSheet('civilian_help', 8, 1.25);
        this.animations.fall = this.createAnimationFromSheet('civilian_fall', 12, 1.25);

        // Set initial animation
        this.currentAnimName = 'idle';
    }

    updatePosition() {
        // Find top block in our specific column
        const col = Math.floor(this.localX / CONFIG.BLOCK_SIZE);
        let topRow = -1;

        for (let row = 0; row < this.building.heightBlocks; row++) {
            if (this.building.blocks[row]?.[col]) {
                topRow = row;
                break;
            }
        }

        if (topRow === -1) {
            // No blocks in this column anymore
            return;
        }

        this.x = this.building.x + this.localX;
        this.y = this.building.y + topRow * CONFIG.BLOCK_SIZE - 15;
    }

    update(deltaTime, playerX, playerY) {
        // Update current animation
        if (this.animations) {
            const currentAnim = this.animations[this.currentAnimName];
            if (currentAnim) {
                // Track frame before update to detect cycle completion
                const prevFrame = currentAnim.currentFrame;
                currentAnim.update(deltaTime);

                // Check if animation cycled back to start (for pending idle switch)
                if (this.pendingIdleSwitch && currentAnim.currentFrame < prevFrame) {
                    // Animation completed a cycle, switch back to idle
                    this.pendingIdleSwitch = false;
                    if (this.animations.idle) {
                        this.currentAnimName = 'idle';
                        this.animations.idle.reset();
                        // Update idle animation immediately so it's ready for render
                        this.animations.idle.update(0);
                    }
                }
            }
        }

        if (this.state === CivilianState.FALLING) {
            // Switch to fall animation
            if (this.currentAnimName !== 'fall') {
                this.currentAnimName = 'fall';
                if (this.animations && this.animations.fall) {
                    this.animations.fall.reset();
                }
            }

            // Falling physics
            this.fallSpeed += this.fallGravity * deltaTime;
            this.y += this.fallSpeed * deltaTime;

            // Hit the ground
            if (this.y > CONFIG.STREET_Y) {
                this.active = false;
                // Sad splat effect
                if (typeof EffectsManager !== 'undefined') {
                    EffectsManager.addExplosion(this.x, CONFIG.STREET_Y, 8, '#ff0000');
                }
            }
            return;
        }

        if (this.state === CivilianState.WAITING) {
            // Check player proximity for animation switching
            if (playerX !== undefined && playerY !== undefined) {
                const dist = Math.sqrt(
                    Math.pow(playerX - this.x, 2) +
                    Math.pow(playerY - this.y, 2)
                );

                const wasInRange = this.playerInRange;
                this.playerInRange = dist < 96;

                // Player just entered range - switch to help animation
                if (this.playerInRange && !wasInRange) {
                    this.currentAnimName = 'help';
                    this.pendingIdleSwitch = false;
                    if (this.animations && this.animations.help) {
                        this.animations.help.reset();
                    }
                }
                // Player just left range - mark to switch back after animation completes
                else if (!this.playerInRange && wasInRange && this.currentAnimName === 'help') {
                    this.pendingIdleSwitch = true;
                }
            }

            // Find which column and row we're on
            const col = Math.floor(this.localX / CONFIG.BLOCK_SIZE);

            // Find the current top block we're standing on
            let currentTopRow = -1;
            for (let row = 0; row < this.building.heightBlocks; row++) {
                if (this.building.blocks[row]?.[col]) {
                    currentTopRow = row;
                    break;
                }
            }

            // If no blocks at all in our column, fall!
            if (currentTopRow === -1) {
                this.state = CivilianState.FALLING;
                this.fallSpeed = 0;
                if (typeof SoundManager !== 'undefined') {
                    SoundManager.civilianScream();
                }
                return;
            }

            // Check if the block we were standing on is still there
            // Compare expected Y position with current
            const expectedY = this.building.y + currentTopRow * CONFIG.BLOCK_SIZE - 15;

            // If we're higher than expected (our block got destroyed), fall!
            if (this.y < expectedY - 5) {
                this.state = CivilianState.FALLING;
                this.fallSpeed = 0;
                if (typeof SoundManager !== 'undefined') {
                    SoundManager.civilianScream();
                }
                return;
            }

            // Update to current top position
            this.x = this.building.x + this.localX;
            this.y = expectedY;
        }
    }

    render(ctx) {
        if (!this.active) return;

        // Lazy initialize animations
        if (!this.animations) {
            this.initAnimations();
        }

        ctx.save();
        ctx.translate(this.x, this.y);

        // Try to use AnimatedSprite for current animation
        if (this.animations) {
            const currentAnim = this.animations[this.currentAnimName];
            if (currentAnim) {
                // AnimatedSprite.render expects center position, we're already translated
                currentAnim.render(ctx, 0, 0);
                ctx.restore();
                return;
            }
        }

        // Fallback: Try static sprite
        const sprite = typeof AssetManager !== 'undefined' ? AssetManager.getImage('civilian') : null;
        if (sprite) {
            const size = 32;
            if (this.state === CivilianState.FALLING) {
                const tumble = (Date.now() / 100) % (Math.PI * 2);
                ctx.rotate(tumble);
            } else {
                const bob = Math.sin(Date.now() / 300) * 2;
                ctx.translate(0, bob);
            }
            ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
            ctx.restore();
            return;
        }

        // Fallback to procedural drawing
        if (this.state === CivilianState.FALLING) {
            // Falling animation - arms flailing wildly
            const flail = Math.sin(Date.now() / 50) * 1.5;

            // Body
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(-3, 0, 6, 8);

            // Head (mouth open screaming)
            ctx.fillStyle = '#fcd34d';
            ctx.beginPath();
            ctx.arc(0, -2, 4, 0, Math.PI * 2);
            ctx.fill();

            // Open mouth
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.ellipse(0, -1, 2, 1.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Flailing arms
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-3, 2);
            ctx.lineTo(-8 + flail * 3, -4 + Math.abs(flail) * 2);
            ctx.moveTo(3, 2);
            ctx.lineTo(8 - flail * 3, -4 + Math.abs(flail) * 2);
            ctx.stroke();

            // Legs kicking
            ctx.beginPath();
            ctx.moveTo(-2, 8);
            ctx.lineTo(-4 + flail * 2, 14);
            ctx.moveTo(2, 8);
            ctx.lineTo(4 - flail * 2, 14);
            ctx.stroke();
        } else {
            // Normal waiting animation
            // Body
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(-3, 0, 6, 8);

            // Head
            ctx.fillStyle = '#fcd34d';
            ctx.beginPath();
            ctx.arc(0, -2, 4, 0, Math.PI * 2);
            ctx.fill();

            // Arms waving for help
            const wave = Math.sin(Date.now() / 200) * 0.5;
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-3, 2);
            ctx.lineTo(-7, -2 + wave * 4);
            ctx.moveTo(3, 2);
            ctx.lineTo(7, -2 - wave * 4);
            ctx.stroke();
        }

        ctx.restore();
    }
}

class CivilianManager {
    constructor() {
        this.civilians = [];
        this.spawnTimer = 0;
        this.spawnInterval = 15;
        this.maxCivilians = 3;
    }

    reset() {
        this.civilians = [];
        this.spawnTimer = 0;
    }

    update(deltaTime, playerX, playerY) {
        // Spawn civilians periodically
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval &&
            this.civilians.filter(c => c.active && c.state === CivilianState.WAITING).length < this.maxCivilians) {
            this.spawnCivilian();
            this.spawnTimer = 0;
        }

        // Update civilians with player position for proximity detection
        this.civilians.forEach(c => c.update(deltaTime, playerX, playerY));

        // Remove inactive civilians
        this.civilians = this.civilians.filter(c => c.active);
    }

    spawnCivilian() {
        // Get buildings that already have a civilian
        const occupiedBuildings = new Set(
            this.civilians.filter(c => c.active).map(c => c.building)
        );

        // Pick a random building that has blocks AND doesn't already have a civilian
        const validBuildings = buildingManager.buildings.filter(
            b => b.getBlockCount() > 0 && !occupiedBuildings.has(b)
        );
        if (validBuildings.length === 0) return;

        const building = validBuildings[Math.floor(Math.random() * validBuildings.length)];
        this.civilians.push(new Civilian(building));
    }

    checkRescue(playerX, playerY, playerState) {
        if (playerState !== 'flying') return { count: 0, building: null };

        let rescued = 0;
        let rescuedBuilding = null;

        for (const civilian of this.civilians) {
            if (!civilian.active || civilian.state !== CivilianState.WAITING) continue;

            const dist = Math.sqrt(
                Math.pow(playerX - civilian.x, 2) +
                Math.pow(playerY - civilian.y, 2)
            );

            if (dist < (CONFIG.CIVILIAN_RESCUE_RADIUS || 50)) {
                civilian.state = CivilianState.RESCUED;
                civilian.active = false;
                rescuedBuilding = civilian.building;
                rescued++;

                // Celebration effects
                if (typeof EffectsManager !== 'undefined') {
                    EffectsManager.addSparkles(civilian.x, civilian.y);
                    EffectsManager.addTextPopup(civilian.x, civilian.y - 20, '+500 RESCUE', '#4ade80');
                }
                if (typeof SoundManager !== 'undefined') {
                    SoundManager.civilianRescued();
                }

                console.log('Civilian rescued!');
            }
        }

        return { count: rescued, building: rescuedBuilding };
    }

    render(ctx) {
        this.civilians.forEach(c => c.render(ctx));
    }
}

const civilianManager = new CivilianManager();
