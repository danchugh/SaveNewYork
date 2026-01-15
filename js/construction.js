// ============================================
// CONSTRUCTION CREW REPAIR SYSTEM
// ============================================

const ConstructionState = {
    INACTIVE: 'inactive',
    DRIVING_IN: 'driving_in',
    WORKERS_EXITING: 'workers_exiting',
    REPAIRING: 'repairing',
    WORKERS_ENTERING: 'workers_entering',
    DRIVING_OUT: 'driving_out'
};

const ConstructionManager = {
    state: ConstructionState.INACTIVE,
    targetBuilding: null,

    // Vehicle properties
    vehicleX: 0,
    vehicleY: 0,
    vehicleDirection: 1, // 1 = from left, -1 = from right
    vehicleSpeed: 120,
    vehicleWidth: 80,
    vehicleHeight: 40,

    // Workers
    workers: [],
    workerCount: 3,

    // Repair tracking
    repairTimer: 0,
    repairDuration: 10, // 10 seconds total
    blocksRepaired: 0,
    maxBlocksToRepair: 10,

    // Scaffolding
    scaffoldingAlpha: 0,

    // Timers for animations
    stateTimer: 0,
    exitEnterDuration: 1, // 1 second to exit/enter vehicle

    // Pending repair (triggered by rescue)
    pendingBuilding: null,
    pendingDelay: 0,

    reset() {
        this.state = ConstructionState.INACTIVE;
        this.targetBuilding = null;
        this.workers = [];
        this.pendingBuilding = null;
        this.pendingDelay = 0;
        this.blocksRepaired = 0;
    },

    triggerRepair(building) {
        // Only trigger if not already active
        if (this.state !== ConstructionState.INACTIVE) {
            console.log('Construction crew busy - rescue bonus only');
            return false;
        }

        // Queue the repair with 1 second delay
        this.pendingBuilding = building;
        this.pendingDelay = 1.0;
        return true;
    },

    startRepair() {
        this.targetBuilding = this.pendingBuilding;
        this.pendingBuilding = null;

        // Random direction
        this.vehicleDirection = Math.random() > 0.5 ? 1 : -1;

        // Start position off screen
        if (this.vehicleDirection === 1) {
            this.vehicleX = -this.vehicleWidth;
        } else {
            this.vehicleX = CONFIG.CANVAS_WIDTH + this.vehicleWidth;
        }

        this.vehicleY = CONFIG.STREET_Y - this.vehicleHeight + 5;

        // Initialize workers (hidden in vehicle initially)
        this.workers = [];
        for (let i = 0; i < this.workerCount; i++) {
            this.workers.push({
                x: 0,
                y: 0,
                targetX: 0,
                targetY: 0,
                hammerPhase: Math.random() * Math.PI * 2,
                visible: false
            });
        }

        this.blocksRepaired = 0;
        this.repairTimer = 0;
        this.scaffoldingAlpha = 0;
        this.stateTimer = 0;
        this.state = ConstructionState.DRIVING_IN;

        if (typeof SoundManager !== 'undefined') {
            SoundManager.constructionArrive();
        }

        console.log('Construction crew dispatched!');
    },

    update(deltaTime) {
        // Handle pending repair delay
        if (this.pendingBuilding && this.pendingDelay > 0) {
            this.pendingDelay -= deltaTime;
            if (this.pendingDelay <= 0) {
                this.startRepair();
            }
            return;
        }

        if (this.state === ConstructionState.INACTIVE) return;

        const buildingCenterX = this.targetBuilding.x + (this.targetBuilding.widthBlocks * CONFIG.BLOCK_SIZE) / 2;
        const stopX = buildingCenterX - this.vehicleWidth / 2;

        switch (this.state) {
            case ConstructionState.DRIVING_IN:
                // Drive towards building
                this.vehicleX += this.vehicleDirection * this.vehicleSpeed * deltaTime;

                // Check if reached destination
                if ((this.vehicleDirection === 1 && this.vehicleX >= stopX) ||
                    (this.vehicleDirection === -1 && this.vehicleX <= stopX)) {
                    this.vehicleX = stopX;
                    this.state = ConstructionState.WORKERS_EXITING;
                    this.stateTimer = 0;

                    // Set worker positions
                    for (let i = 0; i < this.workers.length; i++) {
                        const w = this.workers[i];
                        w.x = this.vehicleX + this.vehicleWidth / 2;
                        w.y = this.vehicleY + this.vehicleHeight - 10;
                        w.targetX = this.targetBuilding.x + 10 + i * 25;
                        w.targetY = CONFIG.STREET_Y - 15;
                        w.visible = true;
                    }
                }
                break;

            case ConstructionState.WORKERS_EXITING:
                this.stateTimer += deltaTime;

                // Move workers towards their positions
                for (const w of this.workers) {
                    const progress = Math.min(1, this.stateTimer / this.exitEnterDuration);
                    w.x = this.vehicleX + this.vehicleWidth / 2 + (w.targetX - this.vehicleX - this.vehicleWidth / 2) * progress;
                    w.y = this.vehicleY + this.vehicleHeight - 10 + (w.targetY - this.vehicleY - this.vehicleHeight + 10) * progress;
                }

                if (this.stateTimer >= this.exitEnterDuration) {
                    this.state = ConstructionState.REPAIRING;
                    this.repairTimer = 0;
                    this.scaffoldingAlpha = 1;
                }
                break;

            case ConstructionState.REPAIRING:
                this.repairTimer += deltaTime;

                // Update worker hammer animations
                for (const w of this.workers) {
                    w.hammerPhase += deltaTime * 10;
                }

                // Repair blocks periodically
                const repairInterval = this.repairDuration / this.maxBlocksToRepair;
                const blocksToHaveRepaired = Math.floor(this.repairTimer / repairInterval);

                while (this.blocksRepaired < blocksToHaveRepaired && this.blocksRepaired < this.maxBlocksToRepair) {
                    const repaired = this.repairOneBlock();
                    if (!repaired) {
                        // No more blocks to repair - building is fully repaired!
                        console.log('Building fully repaired! Packing up early.');
                        this.finishRepair();
                        return;
                    }
                }

                // Check if done (max blocks or time expired)
                if (this.repairTimer >= this.repairDuration || this.blocksRepaired >= this.maxBlocksToRepair) {
                    this.finishRepair();
                }
                break;

            case ConstructionState.WORKERS_ENTERING:
                this.stateTimer += deltaTime;

                // Move workers back to vehicle
                for (const w of this.workers) {
                    const progress = Math.min(1, this.stateTimer / this.exitEnterDuration);
                    w.x = w.targetX + (this.vehicleX + this.vehicleWidth / 2 - w.targetX) * progress;
                    w.y = w.targetY + (this.vehicleY + this.vehicleHeight - 10 - w.targetY) * progress;
                }

                if (this.stateTimer >= this.exitEnterDuration) {
                    this.state = ConstructionState.DRIVING_OUT;
                    // Flip direction so truck drives forward (out the other side)
                    this.vehicleDirection = -this.vehicleDirection;
                    for (const w of this.workers) {
                        w.visible = false;
                    }
                }
                break;

            case ConstructionState.DRIVING_OUT:
                // Drive away forward (direction was flipped, now use positive movement)
                this.vehicleX += this.vehicleDirection * this.vehicleSpeed * deltaTime;

                // Check if off screen
                if (this.vehicleX < -this.vehicleWidth || this.vehicleX > CONFIG.CANVAS_WIDTH + this.vehicleWidth) {
                    this.state = ConstructionState.INACTIVE;
                    this.targetBuilding = null;
                    console.log('Construction crew departed');
                }
                break;
        }
    },

    finishRepair() {
        this.state = ConstructionState.WORKERS_ENTERING;
        this.stateTimer = 0;
        this.scaffoldingAlpha = 0;

        if (typeof SoundManager !== 'undefined') {
            SoundManager.constructionComplete();
        }
    },

    repairOneBlock() {
        if (!this.targetBuilding) return false;

        const building = this.targetBuilding;

        // Find lowest empty block to repair (bottom-up)
        for (let row = building.heightBlocks - 1; row >= 0; row--) {
            for (let col = 0; col < building.widthBlocks; col++) {
                if (!building.blocks[row][col]) {
                    // Check if this block has support (on ground or on another block)
                    const hasSupport = row === building.heightBlocks - 1 ||
                        building.blocks[row + 1]?.[col];

                    if (hasSupport) {
                        // Repair this block!
                        building.blocks[row][col] = true;
                        this.blocksRepaired++;

                        // Visual effect
                        const pos = building.getBlockWorldPosition(row, col);
                        if (typeof EffectsManager !== 'undefined') {
                            EffectsManager.addSparks(pos.x + pos.width / 2, pos.y + pos.height / 2, '#fbbf24');
                            EffectsManager.addTextPopup(pos.x + pos.width / 2, pos.y, '+1 BLOCK', '#22d3ee');
                        }
                        if (typeof SoundManager !== 'undefined') {
                            SoundManager.blockRepaired();
                        }

                        return true; // Successfully repaired
                    }
                }
            }
        }

        return false; // No block found to repair
    },

    render(ctx) {
        if (this.state === ConstructionState.INACTIVE && !this.pendingBuilding) return;

        // Draw scaffolding on building during repair
        if (this.scaffoldingAlpha > 0 && this.targetBuilding) {
            ctx.save();
            ctx.globalAlpha = this.scaffoldingAlpha * 0.6;
            ctx.strokeStyle = '#78716c';
            ctx.lineWidth = 2;

            const b = this.targetBuilding;
            const bx = b.x;
            const by = b.y;
            const bw = b.widthBlocks * CONFIG.BLOCK_SIZE;
            const bh = b.heightBlocks * CONFIG.BLOCK_SIZE;

            // Vertical poles
            ctx.beginPath();
            ctx.moveTo(bx - 5, by + bh);
            ctx.lineTo(bx - 5, by);
            ctx.moveTo(bx + bw + 5, by + bh);
            ctx.lineTo(bx + bw + 5, by);
            ctx.stroke();

            // Horizontal beams
            for (let y = by; y < by + bh; y += 40) {
                ctx.beginPath();
                ctx.moveTo(bx - 8, y);
                ctx.lineTo(bx + bw + 8, y);
                ctx.stroke();
            }

            // Cross braces
            ctx.beginPath();
            for (let y = by; y < by + bh - 40; y += 80) {
                ctx.moveTo(bx - 5, y);
                ctx.lineTo(bx + bw + 5, y + 40);
                ctx.moveTo(bx + bw + 5, y);
                ctx.lineTo(bx - 5, y + 40);
            }
            ctx.stroke();

            ctx.restore();
        }

        // Draw vehicle
        if (this.state !== ConstructionState.INACTIVE) {
            ctx.save();
            ctx.translate(this.vehicleX, this.vehicleY);

            // Try sprite first
            const vehicleSprite = typeof AssetManager !== 'undefined' ? AssetManager.getImage('construction_vehicle') : null;
            if (vehicleSprite) {
                // Draw vehicle sprite (scaled to ~80x50)
                // Sprite faces left by default, so flip when driving right (+1)
                const vw = 80, vh = 50;
                ctx.save();
                if (this.vehicleDirection === 1) {
                    ctx.scale(-1, 1); // Flip horizontally when driving right
                    ctx.drawImage(vehicleSprite, -vw, 0, vw, vh);
                } else {
                    ctx.drawImage(vehicleSprite, 0, 0, vw, vh);
                }
                ctx.restore();
            } else {
                // Fallback: Procedural truck
                // Truck body (yellow/orange)
                ctx.fillStyle = '#f59e0b';
                ctx.fillRect(0, 10, this.vehicleWidth, this.vehicleHeight - 10);

                // Cab
                ctx.fillStyle = '#ea580c';
                const cabX = this.vehicleDirection === 1 ? this.vehicleWidth - 25 : 0;
                ctx.fillRect(cabX, 0, 25, this.vehicleHeight);

                // Windows
                ctx.fillStyle = '#7dd3fc';
                ctx.fillRect(cabX + 3, 5, 19, 12);

                // Wheels
                ctx.fillStyle = '#1f2937';
                ctx.beginPath();
                ctx.arc(15, this.vehicleHeight, 8, 0, Math.PI * 2);
                ctx.arc(this.vehicleWidth - 15, this.vehicleHeight, 8, 0, Math.PI * 2);
                ctx.fill();

                // Yellow stripe
                ctx.fillStyle = '#fbbf24';
                ctx.fillRect(5, 20, this.vehicleWidth - 35, 5);

                // "REPAIR" text
                ctx.fillStyle = '#000';
                ctx.font = 'bold 8px monospace';
                ctx.fillText('REPAIR', 15, 35);
            }
            ctx.restore(); // Restore for translate
        }

        // Draw workers
        for (const w of this.workers) {
            if (!w.visible) continue;

            ctx.save();
            ctx.translate(w.x, w.y);

            // Try sprite first
            const workerSprite = typeof AssetManager !== 'undefined' ? AssetManager.getImage('construction_worker') : null;
            if (workerSprite) {
                // Draw worker sprite (scaled to ~35x40 for better visibility)
                const ww = 35, wh = 40;
                ctx.drawImage(workerSprite, -ww / 2, -wh / 2, ww, wh);
            } else {
                // Fallback: Procedural worker
                // Hard hat (yellow)
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.ellipse(0, -8, 6, 3, 0, 0, Math.PI * 2);
                ctx.fill();

                // Head
                ctx.fillStyle = '#fcd34d';
                ctx.beginPath();
                ctx.arc(0, -4, 4, 0, Math.PI * 2);
                ctx.fill();

                // Body (orange vest)
                ctx.fillStyle = '#ea580c';
                ctx.fillRect(-4, 0, 8, 10);

                // Legs
                ctx.fillStyle = '#1e40af';
                ctx.fillRect(-4, 10, 3, 6);
                ctx.fillRect(1, 10, 3, 6);
            }

            // Hammering arm animation (during repair) - always drawn procedurally
            if (this.state === ConstructionState.REPAIRING) {
                const hammerAngle = Math.sin(w.hammerPhase) * 0.8;
                ctx.save();
                ctx.translate(4, 2);
                ctx.rotate(hammerAngle);

                // Arm
                ctx.strokeStyle = '#fcd34d';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(8, 0);
                ctx.stroke();

                // Hammer
                ctx.fillStyle = '#78716c';
                ctx.fillRect(6, -3, 4, 6);
                ctx.fillStyle = '#92400e';
                ctx.fillRect(8, -1, 3, 2);

                ctx.restore();
            }

            ctx.restore();
        }
    }
};
