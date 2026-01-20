// Building definitions: [x position, width in blocks, height in blocks]
// Zone-indexed object for different environments
const BUILDING_DEFS = {
    1: [ // Zone 1: New York City
        { x: 100, width: 5, height: 14, name: 'building' },   // Medium
        { x: 240, width: 6, height: 22, name: 'building' },   // Tall
        { x: 400, width: 5, height: 16, name: 'building' },   // Medium
        { x: 540, width: 7, height: 25, name: 'building' },   // Tallest
        { x: 700, width: 5, height: 18, name: 'building' },   // Medium-tall
        { x: 820, width: 5, height: 10, name: 'building' }    // Short (near right spawn)
    ],
    2: [ // Zone 2: Desert Outpost
        { x: 80, width: 4, height: 8, name: 'bunker', abilityKills: 5, ability: 'aa_battery' },
        { x: 220, width: 5, height: 12, name: 'barracks', abilityKills: 6, ability: 'infantry' },
        { x: 380, width: 4, height: 18, name: 'radar_tower', abilityKills: 10, ability: 'airstrike' },
        { x: 520, width: 5, height: 20, name: 'church', abilityKills: 12, ability: 'bell_slow' },
        { x: 660, width: 5, height: 14, name: 'control_tower', abilityKills: 8, ability: 'targeting_boost' },
        { x: 820, width: 4, height: 10, name: 'ammo_depot', abilityKills: 5, ability: 'artillery' }
    ]
};

// Debris particle for collapse animation
class Debris {
    constructor(x, y, width, height, color) {
        this.x = x;
        this.y = y;
        this.width = width * (0.3 + Math.random() * 0.7);
        this.height = height * (0.3 + Math.random() * 0.7);
        this.color = color;
        this.vx = (Math.random() - 0.5) * 100;
        this.vy = -50 - Math.random() * 100;
        this.gravity = 400;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 10;
        this.life = 1.5 + Math.random() * 0.5;
        this.maxLife = this.life;
        this.active = true;
    }

    update(deltaTime) {
        if (!this.active) return;

        this.vy += this.gravity * deltaTime;
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        this.rotation += this.rotationSpeed * deltaTime;
        this.life -= deltaTime;

        // Deactivate when hits ground or life expires
        if (this.y > CONFIG.STREET_Y || this.life <= 0) {
            this.active = false;
        }
    }

    render(ctx) {
        if (!this.active) return;

        const alpha = Math.max(0, this.life / this.maxLife);
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
    }
}

class Building {
    constructor(x, widthBlocks, heightBlocks) {
        this.x = x;
        this.widthBlocks = widthBlocks;
        this.heightBlocks = heightBlocks;
        this.blockSize = CONFIG.BLOCK_SIZE;

        // Calculate pixel dimensions
        this.width = widthBlocks * this.blockSize;
        this.height = heightBlocks * this.blockSize;
        this.y = CONFIG.STREET_Y - this.height;

        // Create block grid (true = block exists, false = destroyed)
        this.blocks = [];
        for (let row = 0; row < heightBlocks; row++) {
            this.blocks[row] = [];
            for (let col = 0; col < widthBlocks; col++) {
                this.blocks[row][col] = true;
            }
        }

        // Track original block count for destruction percentage
        this.originalBlockCount = widthBlocks * heightBlocks;

        // Debris particles for collapse animation
        this.debris = [];

        // Zone 2 ability charge system
        this.name = 'building';
        this.ability = null;
        this.abilityKills = 0;
        this.chargeKills = 0;
        this.isCharged = false;
        this.chargeDisabled = false; // True if > 60% destroyed

        // Zone-specific rendering (set by BuildingManager)
        this.zone = 1;
    }

    getBlockCount() {
        let count = 0;
        for (let row = 0; row < this.heightBlocks; row++) {
            for (let col = 0; col < this.widthBlocks; col++) {
                if (this.blocks[row][col]) count++;
            }
        }
        return count;
    }

    canCharge() {
        if (!this.ability) return false;
        if (this.chargeDisabled) return false;

        const destructionPercent = 1 - (this.getBlockCount() / this.originalBlockCount);
        if (destructionPercent >= 0.6) {
            this.chargeDisabled = true;
            this.isCharged = false;
            return false;
        }
        return true;
    }

    getChargeDiscount() {
        const destructionPercent = 1 - (this.getBlockCount() / this.originalBlockCount);
        // 50% destruction = 50% discount
        return Math.min(0.5, destructionPercent);
    }

    getEffectiveAbilityKills() {
        const discount = this.getChargeDiscount();
        return Math.ceil(this.abilityKills * (1 - discount));
    }

    addKillCharge() {
        if (!this.canCharge()) return;
        if (this.isCharged) return;

        this.chargeKills++;
        if (this.chargeKills >= this.getEffectiveAbilityKills()) {
            this.isCharged = true;
            console.log(`${this.name} is fully charged!`);
        }
    }

    resetCharge() {
        this.chargeKills = 0;
        this.isCharged = false;
    }

    destroyBlock(row, col) {
        if (row >= 0 && row < this.heightBlocks &&
            col >= 0 && col < this.widthBlocks &&
            this.blocks[row][col]) {
            this.blocks[row][col] = false;
            SoundManager.blockDestroyed();
            this.checkAndCollapseStructure();
            return true;
        }
        return false;
    }

    // Spawn debris particles for a collapsing block
    spawnDebris(row, col) {
        const pos = this.getBlockWorldPosition(row, col);
        const isLight = (row + col) % 2 === 0;
        const color = isLight ? CONFIG.COLORS.BUILDING_LIGHT : CONFIG.COLORS.BUILDING_DARK;

        // Spawn 3-5 debris particles per block
        const count = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
            this.debris.push(new Debris(
                pos.x + pos.width / 2 + (Math.random() - 0.5) * pos.width,
                pos.y + pos.height / 2,
                this.blockSize,
                this.blockSize,
                color
            ));
        }
    }

    checkAndCollapseStructure() {
        // First check for complete floor destruction
        this.checkFloorCollapse();

        // Then check for unsupported blocks (structural integrity)
        this.checkStructuralIntegrity();
    }

    checkFloorCollapse() {
        // Check each row from bottom to top
        for (let row = this.heightBlocks - 1; row >= 0; row--) {
            // Check if entire row is destroyed
            let rowDestroyed = true;
            for (let col = 0; col < this.widthBlocks; col++) {
                if (this.blocks[row][col]) {
                    rowDestroyed = false;
                    break;
                }
            }

            // If row is destroyed, collapse everything above
            if (rowDestroyed && row > 0) {
                let hasBlocksAbove = false;
                for (let checkRow = 0; checkRow < row; checkRow++) {
                    for (let col = 0; col < this.widthBlocks; col++) {
                        if (this.blocks[checkRow][col]) {
                            hasBlocksAbove = true;
                            break;
                        }
                    }
                    if (hasBlocksAbove) break;
                }

                if (hasBlocksAbove) {
                    // Collapse with animation: destroy all blocks above this row
                    for (let collapseRow = 0; collapseRow < row; collapseRow++) {
                        for (let col = 0; col < this.widthBlocks; col++) {
                            if (this.blocks[collapseRow][col]) {
                                this.spawnDebris(collapseRow, col);
                                this.blocks[collapseRow][col] = false;
                            }
                        }
                    }
                    SoundManager.buildingCollapse();
                    console.log('Floor collapsed at row', row);
                }
            }
        }
    }

    checkStructuralIntegrity() {
        // Use flood fill from bottom row to find all supported blocks
        const supported = [];
        for (let row = 0; row < this.heightBlocks; row++) {
            supported[row] = [];
            for (let col = 0; col < this.widthBlocks; col++) {
                supported[row][col] = false;
            }
        }

        // Bottom row blocks are always supported (on ground)
        const queue = [];
        const bottomRow = this.heightBlocks - 1;
        for (let col = 0; col < this.widthBlocks; col++) {
            if (this.blocks[bottomRow][col]) {
                supported[bottomRow][col] = true;
                queue.push({ row: bottomRow, col: col });
            }
        }

        // Flood fill to find all connected blocks
        while (queue.length > 0) {
            const { row, col } = queue.shift();

            // Check all 4 neighbors
            const neighbors = [
                { row: row - 1, col: col }, // above
                { row: row + 1, col: col }, // below
                { row: row, col: col - 1 }, // left
                { row: row, col: col + 1 }  // right
            ];

            for (const n of neighbors) {
                if (n.row >= 0 && n.row < this.heightBlocks &&
                    n.col >= 0 && n.col < this.widthBlocks &&
                    this.blocks[n.row][n.col] &&
                    !supported[n.row][n.col]) {
                    supported[n.row][n.col] = true;
                    queue.push(n);
                }
            }
        }

        // Destroy any unsupported blocks with debris animation
        let collapsed = false;
        for (let row = 0; row < this.heightBlocks; row++) {
            for (let col = 0; col < this.widthBlocks; col++) {
                if (this.blocks[row][col] && !supported[row][col]) {
                    this.spawnDebris(row, col);
                    this.blocks[row][col] = false;
                    collapsed = true;
                }
            }
        }

        if (collapsed) {
            SoundManager.buildingCollapse();
            console.log('Unsupported blocks collapsed!');
        }
    }

    isEdgeBlock(row, col) {
        // A block is an edge if it exists and has at least one exposed face
        if (!this.blocks[row]?.[col]) return false;

        // Check all 4 directions
        const above = row > 0 ? this.blocks[row - 1]?.[col] : false;
        const below = row < this.heightBlocks - 1 ? this.blocks[row + 1]?.[col] : false;
        const left = col > 0 ? this.blocks[row]?.[col - 1] : false;
        const right = col < this.widthBlocks - 1 ? this.blocks[row]?.[col + 1] : false;

        // Edge if any adjacent is empty/missing
        return !above || !below || !left || !right;
    }

    getEdgeBlocks() {
        const edges = [];
        for (let row = 0; row < this.heightBlocks; row++) {
            for (let col = 0; col < this.widthBlocks; col++) {
                if (this.isEdgeBlock(row, col)) {
                    edges.push({ row, col, building: this });
                }
            }
        }
        return edges;
    }

    getBlockWorldPosition(row, col) {
        return {
            x: this.x + col * this.blockSize,
            y: this.y + row * this.blockSize,
            width: this.blockSize,
            height: this.blockSize
        };
    }

    update(deltaTime) {
        // Update debris particles
        this.debris.forEach(d => d.update(deltaTime));
        // Remove inactive debris
        this.debris = this.debris.filter(d => d.active);
    }

    render(ctx) {
        const isNight = typeof DayCycle !== 'undefined' && DayCycle.currentTime === 'night';
        const isDusk = typeof DayCycle !== 'undefined' && DayCycle.currentTime === 'dusk';

        // Try to get building tileset
        const tileset = typeof AssetManager !== 'undefined' ? AssetManager.getImage('building_tileset') : null;

        // Dynamically calculate tile size from actual image dimensions (4x4 grid)
        const tilesPerRow = 4;
        const tileSize = tileset ? Math.floor(tileset.width / tilesPerRow) : 16;

        // Render blocks - use zone-specific rendering
        for (let row = 0; row < this.heightBlocks; row++) {
            for (let col = 0; col < this.widthBlocks; col++) {
                if (this.blocks[row][col]) {
                    const pos = this.getBlockWorldPosition(row, col);
                    const isTopRow = row === 0;
                    const isBottomRow = row === this.heightBlocks - 1;
                    const isLeftEdge = col === 0 || !this.blocks[row][col - 1];
                    const isRightEdge = col === this.widthBlocks - 1 || !this.blocks[row][col + 1];
                    const blockSeed = (this.x * 17 + row * 7 + col * 13) % 100;

                    // Zone-specific rendering
                    if (this.zone === 2) {
                        this.renderMilitaryBlock(ctx, pos, row, col, isTopRow, isBottomRow, isLeftEdge, isRightEdge, blockSeed, isNight, isDusk);
                    } else {
                        this.renderCityBlock(ctx, pos, row, col, isTopRow, isBottomRow, isLeftEdge, isRightEdge, blockSeed, isNight, isDusk);
                    }
                }
            }
        }

        // Render debris particles
        this.debris.forEach(d => d.render(ctx));

        // Render charge flag if building is charged (Zone 2)
        if (this.isCharged && this.ability) {
            this.renderChargeFlag(ctx);
        }

        // Render charge progress bar (Zone 2)
        if (this.ability && !this.isCharged && !this.chargeDisabled && this.chargeKills > 0) {
            this.renderChargeProgress(ctx);
        }
    }

    // Zone 1: City-style building blocks
    renderCityBlock(ctx, pos, row, col, isTopRow, isBottomRow, isLeftEdge, isRightEdge, blockSeed, isNight, isDusk) {
        const isWindowLit = (isNight || isDusk) && blockSeed < 45;

        // Base building colors - Lighter steel/concrete palette for contrast
        const baseHue = (this.x * 7) % 20 + 210; // Cool steel blue range (210-230)
        const baseSat = 10 + (this.x % 15);      // Low saturation concrete
        const baseLit = isNight ? 35 : (isDusk ? 45 : 55);

        // Create gradient for depth
        const gradient = ctx.createLinearGradient(pos.x, pos.y, pos.x + pos.width, pos.y);
        gradient.addColorStop(0, `hsl(${baseHue}, ${baseSat}%, ${baseLit + 10}%)`);
        gradient.addColorStop(0.5, `hsl(${baseHue}, ${baseSat}%, ${baseLit}%)`);
        gradient.addColorStop(1, `hsl(${baseHue}, ${baseSat}%, ${baseLit - 10}%)`);

        ctx.fillStyle = gradient;
        ctx.fillRect(pos.x, pos.y, pos.width, pos.height);

        // Left edge highlight
        if (isLeftEdge) {
            ctx.fillStyle = `hsla(${baseHue}, ${baseSat}%, ${baseLit + 20}%, 0.4)`;
            ctx.fillRect(pos.x, pos.y, 2, pos.height);
        }

        // Right edge shadow
        if (isRightEdge) {
            ctx.fillStyle = `hsla(${baseHue}, ${baseSat}%, ${baseLit - 15}%, 0.6)`;
            ctx.fillRect(pos.x + pos.width - 2, pos.y, 2, pos.height);
        }

        // Horizontal floor line
        ctx.fillStyle = `hsla(0, 0%, 0%, 0.3)`;
        ctx.fillRect(pos.x, pos.y + pos.height - 1, pos.width, 1);

        // Rooftop
        if (isTopRow) {
            ctx.fillStyle = `hsl(${baseHue}, ${baseSat - 5}%, ${baseLit - 8}%)`;
            ctx.fillRect(pos.x - 1, pos.y, pos.width + 2, 4);
            ctx.fillStyle = `hsla(${baseHue}, ${baseSat}%, ${baseLit + 15}%, 0.5)`;
            ctx.fillRect(pos.x, pos.y, pos.width, 1);

            const roofStyle = (this.x + col) % 5;
            if (roofStyle === 0 && col % 2 === 0) {
                ctx.fillStyle = '#444';
                ctx.fillRect(pos.x + pos.width / 2 - 1, pos.y - 10, 2, 10);
                if (isNight || isDusk) {
                    ctx.fillStyle = '#ff3333';
                    ctx.beginPath();
                    ctx.arc(pos.x + pos.width / 2, pos.y - 11, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (roofStyle === 2 && col === 0) {
                ctx.fillStyle = '#555';
                ctx.fillRect(pos.x + 2, pos.y - 6, 8, 6);
                ctx.fillStyle = '#333';
                ctx.fillRect(pos.x + 3, pos.y - 5, 6, 4);
            }
        }

        // Ground floor
        if (isBottomRow) {
            ctx.fillStyle = `hsl(${baseHue}, ${baseSat}%, ${baseLit - 8}%)`;
            ctx.fillRect(pos.x, pos.y, pos.width, pos.height);

            const isCenterish = Math.abs(col - this.widthBlocks / 2) < 1;
            if (isCenterish && this.widthBlocks > 2) {
                const doorW = Math.min(12, pos.width - 4);
                const doorH = pos.height - 4;
                const doorX = pos.x + (pos.width - doorW) / 2;
                const doorY = pos.y + 2;

                ctx.fillStyle = '#2a1810';
                ctx.fillRect(doorX, doorY, doorW, doorH);
                ctx.strokeStyle = '#1a0a05';
                ctx.lineWidth = 1;
                ctx.strokeRect(doorX, doorY, doorW, doorH);
                ctx.fillStyle = '#444';
                ctx.fillRect(doorX - 1, doorY, 1, doorH);
                ctx.fillRect(doorX + doorW, doorY, 1, doorH);
                ctx.fillRect(doorX - 1, doorY - 1, doorW + 2, 2);
            } else {
                const winW = pos.width - 6;
                const winH = pos.height - 6;
                const winX = pos.x + 3;
                const winY = pos.y + 3;

                if (isWindowLit) {
                    ctx.fillStyle = '#FFDD44';
                    ctx.fillRect(winX, winY, winW, winH);
                    ctx.fillStyle = '#FFEE88';
                    ctx.fillRect(winX + 1, winY + 1, winW - 2, winH - 2);
                } else {
                    ctx.fillStyle = '#0a0a15';
                    ctx.fillRect(winX, winY, winW, winH);
                }
                ctx.strokeStyle = '#222';
                ctx.lineWidth = 1;
                ctx.strokeRect(winX, winY, winW, winH);
            }
        }

        // Windows (middle floors)
        if (!isTopRow && !isBottomRow) {
            const winsPerBlock = pos.width > 20 ? 2 : 1;
            const winWidth = 6;
            const winHeight = 10;
            const spacing = pos.width / (winsPerBlock + 1);

            for (let w = 0; w < winsPerBlock; w++) {
                const winX = pos.x + spacing * (w + 1) - winWidth / 2;
                const winY = pos.y + (pos.height - winHeight) / 2;
                const thisWinLit = (isNight || isDusk) && ((blockSeed + w * 37) % 100) < 50;

                if (thisWinLit) {
                    ctx.fillStyle = '#FFDD33';
                    ctx.fillRect(winX, winY, winWidth, winHeight);
                    ctx.fillStyle = '#FFEE88';
                    ctx.fillRect(winX + 1, winY + 1, winWidth - 2, winHeight - 2);
                    ctx.save();
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.globalAlpha = isNight ? 0.25 : 0.1;
                    ctx.fillStyle = '#FFCC44';
                    ctx.fillRect(winX - 2, winY - 2, winWidth + 4, winHeight + 4);
                    ctx.restore();
                } else {
                    ctx.fillStyle = '#0a0a18';
                    ctx.fillRect(winX, winY, winWidth, winHeight);
                    ctx.fillStyle = 'rgba(100, 120, 150, 0.2)';
                    ctx.fillRect(winX, winY, 2, winHeight / 2);
                }

                ctx.strokeStyle = '#222';
                ctx.lineWidth = 1;
                ctx.strokeRect(winX, winY, winWidth, winHeight);
                ctx.fillStyle = '#333';
                ctx.fillRect(winX + winWidth / 2 - 0.5, winY, 1, winHeight);
                ctx.fillRect(winX, winY + winHeight / 2 - 0.5, winWidth, 1);
            }
        }

        // Block outline
        ctx.strokeStyle = `hsla(0, 0%, 0%, ${isNight ? 0.4 : 0.2})`;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
    }

    // Zone 2: Military outpost building blocks
    renderMilitaryBlock(ctx, pos, row, col, isTopRow, isBottomRow, isLeftEdge, isRightEdge, blockSeed, isNight, isDusk) {
        const isWindowLit = (isNight || isDusk) && blockSeed < 30; // Fewer lit windows

        // Military color palette - tan/khaki/olive
        const buildingType = this.name || 'bunker';
        let baseHue, baseSat, baseLit;

        if (buildingType === 'bunker' || buildingType === 'ammo_depot') {
            // Olive/military green
            baseHue = 85;
            baseSat = 25;
            baseLit = isNight ? 25 : (isDusk ? 35 : 40);
        } else if (buildingType === 'radar_tower' || buildingType === 'control_tower') {
            // Light tan/beige
            baseHue = 40;
            baseSat = 35;
            baseLit = isNight ? 30 : (isDusk ? 45 : 55);
        } else {
            // Standard desert tan
            baseHue = 35;
            baseSat = 40;
            baseLit = isNight ? 28 : (isDusk ? 40 : 50);
        }

        // Create gradient for depth
        const gradient = ctx.createLinearGradient(pos.x, pos.y, pos.x + pos.width, pos.y);
        gradient.addColorStop(0, `hsl(${baseHue}, ${baseSat}%, ${baseLit + 8}%)`);
        gradient.addColorStop(0.5, `hsl(${baseHue}, ${baseSat}%, ${baseLit}%)`);
        gradient.addColorStop(1, `hsl(${baseHue}, ${baseSat}%, ${baseLit - 8}%)`);

        ctx.fillStyle = gradient;
        ctx.fillRect(pos.x, pos.y, pos.width, pos.height);

        // Left edge highlight
        if (isLeftEdge) {
            ctx.fillStyle = `hsla(${baseHue}, ${baseSat}%, ${baseLit + 15}%, 0.5)`;
            ctx.fillRect(pos.x, pos.y, 2, pos.height);
        }

        // Right edge shadow
        if (isRightEdge) {
            ctx.fillStyle = `hsla(${baseHue}, ${baseSat - 10}%, ${baseLit - 12}%, 0.6)`;
            ctx.fillRect(pos.x + pos.width - 2, pos.y, 2, pos.height);
        }

        // Reinforced concrete lines
        ctx.fillStyle = `hsla(0, 0%, 0%, 0.25)`;
        ctx.fillRect(pos.x, pos.y + pos.height - 1, pos.width, 1);

        // Rooftop - military style
        if (isTopRow) {
            // Flat military rooftop
            ctx.fillStyle = `hsl(${baseHue}, ${baseSat - 10}%, ${baseLit - 10}%)`;
            ctx.fillRect(pos.x - 1, pos.y, pos.width + 2, 3);

            // Rooftop equipment based on building type
            if (buildingType === 'radar_tower' && col === Math.floor(this.widthBlocks / 2)) {
                // Radar dish
                ctx.fillStyle = '#555';
                ctx.beginPath();
                ctx.ellipse(pos.x + pos.width / 2, pos.y - 8, 12, 6, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#444';
                ctx.fillRect(pos.x + pos.width / 2 - 1, pos.y - 15, 2, 8);
                // Blinking light
                if ((Date.now() / 500) % 2 < 1) {
                    ctx.fillStyle = '#00ff00';
                    ctx.beginPath();
                    ctx.arc(pos.x + pos.width / 2, pos.y - 16, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (buildingType === 'bunker' && col % 2 === 0) {
                // Sandbags
                ctx.fillStyle = '#8B7355';
                for (let i = 0; i < 3; i++) {
                    ctx.beginPath();
                    ctx.ellipse(pos.x + 4 + i * 6, pos.y - 3, 4, 3, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (buildingType === 'control_tower' && col === 0) {
                // Radio antenna
                ctx.strokeStyle = '#555';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(pos.x + 5, pos.y);
                ctx.lineTo(pos.x + 5, pos.y - 20);
                ctx.stroke();
                // Red warning light
                ctx.fillStyle = (isNight || isDusk) ? '#ff0000' : '#880000';
                ctx.beginPath();
                ctx.arc(pos.x + 5, pos.y - 21, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Ground floor - military style
        if (isBottomRow) {
            ctx.fillStyle = `hsl(${baseHue}, ${baseSat}%, ${baseLit - 6}%)`;
            ctx.fillRect(pos.x, pos.y, pos.width, pos.height);

            const isCenterish = Math.abs(col - this.widthBlocks / 2) < 1;
            if (isCenterish && this.widthBlocks > 2) {
                // Garage/blast door
                const doorW = Math.min(14, pos.width - 2);
                const doorH = pos.height - 2;
                const doorX = pos.x + (pos.width - doorW) / 2;
                const doorY = pos.y + 1;

                ctx.fillStyle = '#3a3a3a';
                ctx.fillRect(doorX, doorY, doorW, doorH);

                // Horizontal door segments
                ctx.fillStyle = '#2a2a2a';
                for (let i = 1; i < 4; i++) {
                    ctx.fillRect(doorX, doorY + (doorH / 4) * i - 1, doorW, 2);
                }

                // Door frame
                ctx.strokeStyle = '#4a4a4a';
                ctx.lineWidth = 2;
                ctx.strokeRect(doorX, doorY, doorW, doorH);
            }
        }

        // Windows - bunker slit style (fewer, smaller)
        if (!isTopRow && !isBottomRow && row % 3 === 1) {
            // Bunker slits - horizontal narrow windows
            const slitWidth = pos.width - 8;
            const slitHeight = 4;
            const slitX = pos.x + 4;
            const slitY = pos.y + (pos.height - slitHeight) / 2;

            if (isWindowLit) {
                ctx.fillStyle = '#88aa66'; // Green-tinted light
                ctx.fillRect(slitX, slitY, slitWidth, slitHeight);
            } else {
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(slitX, slitY, slitWidth, slitHeight);
            }

            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.strokeRect(slitX, slitY, slitWidth, slitHeight);
        }

        // Block outline
        ctx.strokeStyle = `hsla(30, 20%, 20%, ${isNight ? 0.5 : 0.3})`;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
    }

    renderChargeFlag(ctx) {
        const flagX = this.x + (this.widthBlocks * this.blockSize) / 2;
        const flagY = this.y - 20;

        // Flag pole
        ctx.strokeStyle = '#888888';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(flagX, this.y);
        ctx.lineTo(flagX, flagY);
        ctx.stroke();

        // Glowing flag
        const time = Date.now() / 200;
        const glow = 0.7 + Math.sin(time) * 0.3;

        ctx.fillStyle = `rgba(255, 204, 0, ${glow})`;
        ctx.beginPath();
        ctx.moveTo(flagX, flagY);
        ctx.lineTo(flagX + 20, flagY + 8);
        ctx.lineTo(flagX, flagY + 16);
        ctx.closePath();
        ctx.fill();

        // Glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffcc00';
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    renderChargeProgress(ctx) {
        const barWidth = this.widthBlocks * this.blockSize - 4;
        const barHeight = 4;
        const barX = this.x + 2;
        const barY = this.y - 10;

        const progress = this.chargeKills / this.getEffectiveAbilityKills();

        // Background
        ctx.fillStyle = '#333333';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Progress
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(barX, barY, barWidth * progress, barHeight);
    }
}

class BuildingManager {
    constructor() {
        this.buildings = [];
        this.totalOriginalBlocks = 0;
    }

    init(zoneNumber = 1) {
        this.buildings = [];
        this.currentZone = zoneNumber;
        const defs = BUILDING_DEFS[zoneNumber] || BUILDING_DEFS[1];

        for (const def of defs) {
            const building = new Building(def.x, def.width, def.height);
            building.name = def.name || 'building';
            building.abilityKills = def.abilityKills || 0;
            building.ability = def.ability || null;
            building.chargeKills = 0;  // Current kill charge
            building.isCharged = false;
            building.zone = zoneNumber; // Zone-specific rendering
            this.buildings.push(building);
        }

        this.totalOriginalBlocks = this.buildings.reduce(
            (sum, b) => sum + b.originalBlockCount, 0
        );
    }

    update(deltaTime) {
        this.buildings.forEach(b => b.update(deltaTime));
    }

    getTotalBlockCount() {
        return this.buildings.reduce((sum, b) => sum + b.getBlockCount(), 0);
    }

    getDestructionPercentage() {
        const remaining = this.getTotalBlockCount();
        return 1 - (remaining / this.totalOriginalBlocks);
    }

    getAllEdgeBlocks() {
        return this.buildings.flatMap(b => b.getEdgeBlocks());
    }

    render(ctx) {
        this.buildings.forEach(b => b.render(ctx));
    }

    getNearestBuilding(x, y) {
        let nearest = null;
        let nearestDist = Infinity;

        for (const building of this.buildings) {
            // Calculate distance to building's bottom-center
            const bx = building.x + (building.widthBlocks * building.blockSize) / 2;
            const by = building.y + building.heightBlocks * building.blockSize; // Bottom

            const dist = Math.sqrt((x - bx) ** 2 + (y - by) ** 2);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = building;
            }
        }
        return nearest;
    }
}

const buildingManager = new BuildingManager();
