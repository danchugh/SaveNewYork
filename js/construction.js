// ============================================
// CONSTRUCTION CREW REPAIR SYSTEM
// Supports multiple concurrent repair jobs (one per building)
// ============================================

const ConstructionState = {
    INACTIVE: 'inactive',
    PENDING: 'pending',
    DRIVING_IN: 'driving_in',
    WORKERS_EXITING: 'workers_exiting',
    REPAIRING: 'repairing',
    WORKERS_ENTERING: 'workers_entering',
    DRIVING_OUT: 'driving_out'
};

// Factory function to create a new repair job
function createRepairJob(building) {
    const direction = Math.random() > 0.5 ? 1 : -1;
    const vehicleWidth = 80;
    const vehicleHeight = 40;

    return {
        state: ConstructionState.PENDING,
        targetBuilding: building,

        // Vehicle properties
        vehicleX: direction === 1 ? -vehicleWidth : CONFIG.CANVAS_WIDTH + vehicleWidth,
        vehicleY: CONFIG.STREET_Y - vehicleHeight + 5,
        vehicleDirection: direction,
        vehicleSpeed: 120,
        vehicleWidth: vehicleWidth,
        vehicleHeight: vehicleHeight,

        // Workers
        workers: [],
        workerCount: 3,

        // Repair tracking
        repairTimer: 0,
        repairDuration: 10,
        blocksRepaired: 0,
        maxBlocksToRepair: 10,

        // Scaffolding
        scaffoldingAlpha: 0,

        // Timers
        stateTimer: 0,
        exitEnterDuration: 1,
        pendingDelay: 1.0
    };
}

const ConstructionManager = {
    // Array of active repair jobs
    activeJobs: [],

    reset() {
        this.activeJobs = [];
    },

    triggerRepair(building) {
        // Check if this building already has an active repair job
        const existingJob = this.activeJobs.find(job => job.targetBuilding === building);
        if (existingJob) {
            console.log('Building already being repaired - rescue bonus only');
            return false;
        }

        // Create new repair job for this building
        const job = createRepairJob(building);
        this.activeJobs.push(job);
        console.log(`Construction crew dispatched to building! (${this.activeJobs.length} active jobs)`);
        return true;
    },

    startRepair(job) {
        // Initialize workers (hidden in vehicle initially)
        job.workers = [];
        for (let i = 0; i < job.workerCount; i++) {
            job.workers.push({
                x: 0,
                y: 0,
                targetX: 0,
                targetY: 0,
                hammerPhase: Math.random() * Math.PI * 2,
                visible: false
            });
        }

        job.blocksRepaired = 0;
        job.repairTimer = 0;
        job.scaffoldingAlpha = 0;
        job.stateTimer = 0;
        job.state = ConstructionState.DRIVING_IN;

        if (typeof SoundManager !== 'undefined') {
            SoundManager.constructionArrive();
        }
    },

    update(deltaTime) {
        // Process all active jobs
        for (let i = this.activeJobs.length - 1; i >= 0; i--) {
            const job = this.activeJobs[i];
            this.updateJob(job, deltaTime);

            // Remove completed jobs
            if (job.state === ConstructionState.INACTIVE) {
                this.activeJobs.splice(i, 1);
                console.log(`Construction crew departed (${this.activeJobs.length} active jobs remaining)`);
            }
        }
    },

    updateJob(job, deltaTime) {
        // Handle pending delay
        if (job.state === ConstructionState.PENDING) {
            job.pendingDelay -= deltaTime;
            if (job.pendingDelay <= 0) {
                this.startRepair(job);
            }
            return;
        }

        if (job.state === ConstructionState.INACTIVE) return;

        const buildingCenterX = job.targetBuilding.x + (job.targetBuilding.widthBlocks * CONFIG.BLOCK_SIZE) / 2;
        const stopX = buildingCenterX - job.vehicleWidth / 2;

        switch (job.state) {
            case ConstructionState.DRIVING_IN:
                job.vehicleX += job.vehicleDirection * job.vehicleSpeed * deltaTime;

                if ((job.vehicleDirection === 1 && job.vehicleX >= stopX) ||
                    (job.vehicleDirection === -1 && job.vehicleX <= stopX)) {
                    job.vehicleX = stopX;
                    job.state = ConstructionState.WORKERS_EXITING;
                    job.stateTimer = 0;

                    for (let i = 0; i < job.workers.length; i++) {
                        const w = job.workers[i];
                        w.x = job.vehicleX + job.vehicleWidth / 2;
                        w.y = job.vehicleY + job.vehicleHeight - 10;
                        w.targetX = job.targetBuilding.x + 10 + i * 25;
                        w.targetY = CONFIG.STREET_Y - 15;
                        w.visible = true;
                    }
                }
                break;

            case ConstructionState.WORKERS_EXITING:
                job.stateTimer += deltaTime;

                for (const w of job.workers) {
                    const progress = Math.min(1, job.stateTimer / job.exitEnterDuration);
                    w.x = job.vehicleX + job.vehicleWidth / 2 + (w.targetX - job.vehicleX - job.vehicleWidth / 2) * progress;
                    w.y = job.vehicleY + job.vehicleHeight - 10 + (w.targetY - job.vehicleY - job.vehicleHeight + 10) * progress;
                }

                if (job.stateTimer >= job.exitEnterDuration) {
                    job.state = ConstructionState.REPAIRING;
                    job.repairTimer = 0;
                    job.scaffoldingAlpha = 1;
                }
                break;

            case ConstructionState.REPAIRING:
                job.repairTimer += deltaTime;

                for (const w of job.workers) {
                    w.hammerPhase += deltaTime * 10;
                }

                const repairInterval = job.repairDuration / job.maxBlocksToRepair;
                const blocksToHaveRepaired = Math.floor(job.repairTimer / repairInterval);

                while (job.blocksRepaired < blocksToHaveRepaired && job.blocksRepaired < job.maxBlocksToRepair) {
                    const repaired = this.repairOneBlock(job);
                    if (!repaired) {
                        console.log('Building fully repaired!');
                        this.finishRepair(job);
                        return;
                    }
                }

                if (job.repairTimer >= job.repairDuration || job.blocksRepaired >= job.maxBlocksToRepair) {
                    this.finishRepair(job);
                }
                break;

            case ConstructionState.WORKERS_ENTERING:
                job.stateTimer += deltaTime;

                for (const w of job.workers) {
                    const progress = Math.min(1, job.stateTimer / job.exitEnterDuration);
                    w.x = w.targetX + (job.vehicleX + job.vehicleWidth / 2 - w.targetX) * progress;
                    w.y = w.targetY + (job.vehicleY + job.vehicleHeight - 10 - w.targetY) * progress;
                }

                if (job.stateTimer >= job.exitEnterDuration) {
                    job.state = ConstructionState.DRIVING_OUT;
                    job.vehicleDirection = -job.vehicleDirection;
                    for (const w of job.workers) {
                        w.visible = false;
                    }
                }
                break;

            case ConstructionState.DRIVING_OUT:
                job.vehicleX += job.vehicleDirection * job.vehicleSpeed * deltaTime;

                if (job.vehicleX < -job.vehicleWidth || job.vehicleX > CONFIG.CANVAS_WIDTH + job.vehicleWidth) {
                    job.state = ConstructionState.INACTIVE;
                }
                break;
        }
    },

    finishRepair(job) {
        job.state = ConstructionState.WORKERS_ENTERING;
        job.stateTimer = 0;
        job.scaffoldingAlpha = 0;

        if (typeof SoundManager !== 'undefined') {
            SoundManager.constructionComplete();
        }
    },

    repairOneBlock(job) {
        if (!job.targetBuilding) return false;

        const building = job.targetBuilding;

        for (let row = building.heightBlocks - 1; row >= 0; row--) {
            for (let col = 0; col < building.widthBlocks; col++) {
                if (!building.blocks[row][col]) {
                    const hasSupport = row === building.heightBlocks - 1 ||
                        building.blocks[row + 1]?.[col];

                    if (hasSupport) {
                        building.blocks[row][col] = true;
                        job.blocksRepaired++;

                        const pos = building.getBlockWorldPosition(row, col);
                        if (typeof EffectsManager !== 'undefined') {
                            EffectsManager.addSparks(pos.x + pos.width / 2, pos.y + pos.height / 2, '#fbbf24');
                            EffectsManager.addTextPopup(pos.x + pos.width / 2, pos.y, '+1 BLOCK', '#22d3ee');
                        }
                        if (typeof SoundManager !== 'undefined') {
                            SoundManager.blockRepaired();
                        }

                        return true;
                    }
                }
            }
        }

        return false;
    },

    render(ctx) {
        // Render all active jobs
        for (const job of this.activeJobs) {
            this.renderJob(ctx, job);
        }
    },

    renderJob(ctx, job) {
        if (job.state === ConstructionState.INACTIVE || job.state === ConstructionState.PENDING) return;

        // Draw scaffolding on building during repair
        if (job.scaffoldingAlpha > 0 && job.targetBuilding) {
            ctx.save();
            ctx.globalAlpha = job.scaffoldingAlpha * 0.6;
            ctx.strokeStyle = '#78716c';
            ctx.lineWidth = 2;

            const b = job.targetBuilding;
            const bx = b.x;
            const by = b.y;
            const bw = b.widthBlocks * CONFIG.BLOCK_SIZE;
            const bh = b.heightBlocks * CONFIG.BLOCK_SIZE;

            ctx.beginPath();
            ctx.moveTo(bx - 5, by + bh);
            ctx.lineTo(bx - 5, by);
            ctx.moveTo(bx + bw + 5, by + bh);
            ctx.lineTo(bx + bw + 5, by);
            ctx.stroke();

            for (let y = by; y < by + bh; y += 40) {
                ctx.beginPath();
                ctx.moveTo(bx - 8, y);
                ctx.lineTo(bx + bw + 8, y);
                ctx.stroke();
            }

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
        ctx.save();
        ctx.translate(job.vehicleX, job.vehicleY);

        const vehicleSprite = typeof AssetManager !== 'undefined' ? AssetManager.getImage('construction_vehicle') : null;
        if (vehicleSprite) {
            const vw = 80, vh = 50;
            ctx.save();
            if (job.vehicleDirection === 1) {
                ctx.scale(-1, 1);
                ctx.drawImage(vehicleSprite, -vw, 0, vw, vh);
            } else {
                ctx.drawImage(vehicleSprite, 0, 0, vw, vh);
            }
            ctx.restore();
        } else {
            // Fallback: Procedural truck
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(0, 10, job.vehicleWidth, job.vehicleHeight - 10);

            ctx.fillStyle = '#ea580c';
            const cabX = job.vehicleDirection === 1 ? job.vehicleWidth - 25 : 0;
            ctx.fillRect(cabX, 0, 25, job.vehicleHeight);

            ctx.fillStyle = '#7dd3fc';
            ctx.fillRect(cabX + 3, 5, 19, 12);

            ctx.fillStyle = '#1f2937';
            ctx.beginPath();
            ctx.arc(15, job.vehicleHeight, 8, 0, Math.PI * 2);
            ctx.arc(job.vehicleWidth - 15, job.vehicleHeight, 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(5, 20, job.vehicleWidth - 35, 5);

            ctx.fillStyle = '#000';
            ctx.font = 'bold 8px monospace';
            ctx.fillText('REPAIR', 15, 35);
        }
        ctx.restore();

        // Draw workers
        for (const w of job.workers) {
            if (!w.visible) continue;

            ctx.save();
            ctx.translate(w.x, w.y);

            const workerSprite = typeof AssetManager !== 'undefined' ? AssetManager.getImage('construction_worker') : null;
            if (workerSprite) {
                const ww = 35, wh = 40;
                ctx.drawImage(workerSprite, -ww / 2, -wh / 2, ww, wh);
            } else {
                ctx.fillStyle = '#fbbf24';
                ctx.beginPath();
                ctx.ellipse(0, -8, 6, 3, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#fcd34d';
                ctx.beginPath();
                ctx.arc(0, -4, 4, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#ea580c';
                ctx.fillRect(-4, 0, 8, 10);

                ctx.fillStyle = '#1e40af';
                ctx.fillRect(-4, 10, 3, 6);
                ctx.fillRect(1, 10, 3, 6);
            }

            // Hammering arm animation during repair
            if (job.state === ConstructionState.REPAIRING) {
                const hammerAngle = Math.sin(w.hammerPhase) * 0.8;
                ctx.save();
                ctx.translate(4, 2);
                ctx.rotate(hammerAngle);

                ctx.strokeStyle = '#fcd34d';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(8, 0);
                ctx.stroke();

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
