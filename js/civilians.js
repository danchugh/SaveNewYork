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
        this.y = this.building.y + topRow * CONFIG.BLOCK_SIZE - 8;
    }

    update(deltaTime) {
        if (this.state === CivilianState.FALLING) {
            // Falling animation
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
            const expectedY = this.building.y + currentTopRow * CONFIG.BLOCK_SIZE - 8;

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

        ctx.save();
        ctx.translate(this.x, this.y);

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

    update(deltaTime) {
        // Spawn civilians periodically
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval &&
            this.civilians.filter(c => c.active && c.state === CivilianState.WAITING).length < this.maxCivilians) {
            this.spawnCivilian();
            this.spawnTimer = 0;
        }

        // Update civilians
        this.civilians.forEach(c => c.update(deltaTime));

        // Remove inactive civilians
        this.civilians = this.civilians.filter(c => c.active);
    }

    spawnCivilian() {
        // Pick a random building that has blocks
        const validBuildings = buildingManager.buildings.filter(b => b.getBlockCount() > 0);
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

            if (dist < 25) {
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
