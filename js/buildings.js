// Building definitions: [x position, width in blocks, height in blocks]
// Greater spacing and height variance for larger screen (960x720)
// Heights adjusted to leave more sky area (max ~60% of play area)
const BUILDING_DEFS = [
    { x: 100, width: 5, height: 12 },   // Short
    { x: 240, width: 6, height: 28 },   // Tall
    { x: 400, width: 5, height: 16 },   // Medium-short
    { x: 540, width: 7, height: 32 },   // Tallest (Empire State style)
    { x: 700, width: 5, height: 20 },   // Medium
    { x: 780, width: 5, height: 14 }    // Short (moved left to clear right spawn pad)
];

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
        // Render blocks
        for (let row = 0; row < this.heightBlocks; row++) {
            for (let col = 0; col < this.widthBlocks; col++) {
                if (this.blocks[row][col]) {
                    const pos = this.getBlockWorldPosition(row, col);

                    // Alternate colors for visual interest (using DayCycle colors)
                    const isLight = (row + col) % 2 === 0;
                    ctx.fillStyle = isLight ? DayCycle.getBuildingLightColor() : DayCycle.getBuildingDarkColor();
                    ctx.fillRect(pos.x, pos.y, pos.width, pos.height);

                    // Draw window on some blocks (using DayCycle window color)
                    if ((row + col) % 3 === 0) {
                        ctx.fillStyle = DayCycle.getWindowColor();
                        ctx.fillRect(pos.x + 2, pos.y + 2, pos.width - 4, pos.height - 4);
                    }

                    // Draw block outline
                    ctx.strokeStyle = '#00000033';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(pos.x, pos.y, pos.width, pos.height);
                }
            }
        }

        // Render debris particles
        this.debris.forEach(d => d.render(ctx));
    }
}

class BuildingManager {
    constructor() {
        this.buildings = [];
        this.totalOriginalBlocks = 0;
    }

    init() {
        this.buildings = BUILDING_DEFS.map(def =>
            new Building(def.x, def.width, def.height)
        );
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
}

const buildingManager = new BuildingManager();
