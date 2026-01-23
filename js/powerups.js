// ============================================
// POWERUP SYSTEM
// ============================================

const PowerupType = {
    SHIELD: 'shield',
    FULL_REPAIR: 'full_repair'
};

// ============================================
// MATERIAL DROP CLASS
// Collectible materials for Repair Beam ammo
// ============================================
class MaterialDrop {
    constructor(x, y, amount = 1) {
        this.x = x;
        this.y = y;
        this.amount = amount;
        this.active = true;
        this.animTimer = 0;

        // Physics
        this.vy = 60 + Math.random() * 40;  // Variable fall speed
        this.vx = (Math.random() - 0.5) * 30; // Slight horizontal drift
        this.gravity = 120;

        // Dimensions
        this.width = 16;
        this.height = 16;
    }

    update(deltaTime) {
        if (!this.active) return;

        this.animTimer += deltaTime;

        // Apply gravity
        this.vy += this.gravity * deltaTime;
        this.y += this.vy * deltaTime;
        this.x += this.vx * deltaTime;

        // Friction on horizontal
        this.vx *= 0.98;

        // Check ground collision - despawn
        if (this.y >= CONFIG.STREET_Y) {
            this.active = false;
            return;
        }

        // Check building collision - despawn
        if (typeof buildingManager !== 'undefined') {
            for (const building of buildingManager.buildings) {
                // Simple box check against building bounds
                const bRight = building.x + building.width;
                const bTop = building.y;
                const bBottom = building.y + building.height;

                if (this.x >= building.x && this.x <= bRight &&
                    this.y >= bTop && this.y <= bBottom) {
                    this.active = false;
                    return;
                }
            }
        }
    }

    checkCollision(player) {
        if (!this.active) return false;
        if (player.state === 'exploding') return false;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        return dist < 35; // Pickup radius
    }

    collect(playerIndex) {
        if (!this.active) return false;

        // Add materials to player's pool (capped at MAX)
        const current = game.materials[playerIndex] || 0;
        const max = CONFIG.MAX_MATERIALS || 50;

        if (current < max) {
            game.materials[playerIndex] = Math.min(current + this.amount, max);
            this.active = false;
            return true;
        }

        // Still consume the drop even if at max (per requirements)
        this.active = false;
        return false;
    }

    render(ctx) {
        if (!this.active) return;

        ctx.save();

        // Pulse effect
        const pulse = Math.sin(this.animTimer * 6) * 0.2 + 1;
        const size = 8 * pulse;

        // Glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fbbf24';

        // Draw hexagon (material icon)
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            const px = this.x + size * Math.cos(angle);
            const py = this.y + size * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Inner highlight
        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 2;
            const px = this.x + (size * 0.5) * Math.cos(angle);
            const py = this.y + (size * 0.5) * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Amount indicator (if > 1)
        if (this.amount > 1) {
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 8px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`+${this.amount}`, this.x, this.y + 14);
        }

        ctx.restore();
    }
}

class Powerup {
    constructor(x, y, type = PowerupType.SHIELD, hasParachute = true) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.active = true;
        this.hasParachute = hasParachute;
        this.animTimer = 0;

        // Movement
        this.vy = hasParachute ? 30 : 80; // Slow if parachute, faster if enemy drop
        this.vx = 0;

        // Dimensions
        this.width = 24;
        this.height = 24;
    }

    update(deltaTime) {
        if (!this.active) return;

        this.animTimer += deltaTime;

        // Fall down
        this.y += this.vy * deltaTime;

        // Slight horizontal sway for parachute
        if (this.hasParachute) {
            this.vx = Math.sin(this.animTimer * 2) * 15;
            this.x += this.vx * deltaTime;
        }

        // Deactivate if falls below street
        if (this.y > CONFIG.STREET_Y + 50) {
            this.active = false;
        }
    }

    checkCollision(player) {
        if (!this.active) return false;
        if (player.state === 'exploding') return false;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        return dist < 30; // Pickup radius
    }

    render(ctx) {
        if (!this.active) return;

        ctx.save();

        // Draw parachute if has one
        if (this.hasParachute) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.moveTo(this.x - 15, this.y - 20);
            ctx.quadraticCurveTo(this.x, this.y - 35, this.x + 15, this.y - 20);
            ctx.lineTo(this.x, this.y - 8);
            ctx.closePath();
            ctx.fill();

            // Parachute strings
            ctx.strokeStyle = 'rgba(200, 200, 200, 0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(this.x - 12, this.y - 20);
            ctx.lineTo(this.x, this.y - 5);
            ctx.moveTo(this.x + 12, this.y - 20);
            ctx.lineTo(this.x, this.y - 5);
            ctx.stroke();
        }

        // Shield powerup orb
        const pulse = Math.sin(this.animTimer * 5) * 0.15 + 1;
        const radius = 10 * pulse;

        // Outer glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00aaff';

        // Different visuals for different powerup types
        if (this.type === PowerupType.FULL_REPAIR) {
            // Full Repair - Large green orb with building icon
            ctx.shadowColor = '#4ade80';
            ctx.shadowBlur = 20;

            // Green orb (larger than shield)
            const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, radius * 1.5);
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.3, '#86efac');
            gradient.addColorStop(0.7, '#4ade80');
            gradient.addColorStop(1, '#166534');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, radius * 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Building icon (simple rectangle stack)
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(this.x - 4, this.y - 6, 8, 12);
            ctx.fillStyle = '#166534';
            ctx.fillRect(this.x - 3, this.y - 5, 2, 2);
            ctx.fillRect(this.x + 1, this.y - 5, 2, 2);
            ctx.fillRect(this.x - 3, this.y - 1, 2, 2);
            ctx.fillRect(this.x + 1, this.y - 1, 2, 2);
        } else {
            // Shield powerup - Blue orb
            const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, radius);
            gradient.addColorStop(0, '#ffffff');
            gradient.addColorStop(0.3, '#66ddff');
            gradient.addColorStop(0.7, '#0088ff');
            gradient.addColorStop(1, '#004499');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
            ctx.fill();

            // "S" letter or shield icon
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 10px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('S', this.x, this.y + 1);
        }

        ctx.restore();
    }
}

const PowerupManager = {
    powerups: [],
    materialDrops: [],  // NEW: Material drops array
    waveShieldSpawned: false,
    scheduledParachuteDrop: null,
    enemyDropIndex: -1,

    reset() {
        this.powerups = [];
        this.materialDrops = [];  // NEW: Reset materials
        this.waveShieldSpawned = false;
        this.scheduledParachuteDrop = null;
        this.enemyDropIndex = -1;
    },

    startWave(enemyCount) {
        this.waveShieldSpawned = false;
        this.scheduledParachuteDrop = null;
        this.enemyDropIndex = -1;

        // Randomly choose spawn type: parachute (50%) or enemy drop (50%)
        if (Math.random() < 0.5) {
            // Schedule parachute drop at 25-75% wave progress
            this.scheduledParachuteDrop = {
                progress: 0.25 + Math.random() * 0.5,
                triggered: false
            };
        } else {
            // Choose random enemy index to drop shield
            this.enemyDropIndex = Math.floor(Math.random() * enemyCount);
        }
    },

    checkWaveProgress(waveProgress) {
        // Check if it's time for parachute drop
        if (this.scheduledParachuteDrop &&
            !this.scheduledParachuteDrop.triggered &&
            waveProgress >= this.scheduledParachuteDrop.progress &&
            !this.waveShieldSpawned) {

            this.spawnParachuteDrop();
            this.scheduledParachuteDrop.triggered = true;
            this.waveShieldSpawned = true;
        }
    },

    spawnParachuteDrop() {
        const x = 100 + Math.random() * (CONFIG.CANVAS_WIDTH - 200);
        const y = CONFIG.SKY_TOP - 20;
        this.powerups.push(new Powerup(x, y, PowerupType.SHIELD, true));
        console.log('Shield parachute spawned!');
    },

    spawnEnemyDrop(x, y) {
        // Spawn without parachute (faster fall)
        this.powerups.push(new Powerup(x, y, PowerupType.SHIELD, false));
        this.waveShieldSpawned = true;
        console.log('Shield dropped from enemy!');
    },

    spawnBossDrop(x, y) {
        // Boss always drops - doesn't count toward wave limit
        this.powerups.push(new Powerup(x, y, PowerupType.SHIELD, false));
        console.log('Shield dropped from boss!');
    },

    // NEW: Spawn material drop based on enemy type
    spawnMaterialDrop(x, y, enemyType) {
        const rates = CONFIG.MATERIAL_DROP_RATES || {};
        const dropInfo = rates[enemyType];

        if (!dropInfo) return;

        // Check drop chance
        if (Math.random() < dropInfo.chance) {
            this.materialDrops.push(new MaterialDrop(x, y, dropInfo.amount));
            console.log(`Material dropped: +${dropInfo.amount} from ${enemyType}`);
        }
    },

    // NEW: Spawn guaranteed material drop (for mini-bosses)
    spawnGuaranteedMaterial(x, y, amount) {
        this.materialDrops.push(new MaterialDrop(x, y, amount));
        console.log(`Guaranteed material drop: +${amount}`);
    },

    // NEW: Spawn Full Building Repair powerup (from 2nd mini-boss only)
    spawnFullRepairDrop(x, y) {
        this.powerups.push(new Powerup(x, y, PowerupType.FULL_REPAIR, false));
        console.log('Full Building Repair powerup dropped!');
    },

    onEnemyKilled(enemyIndex, x, y) {
        // Check if this enemy should drop the shield
        if (this.enemyDropIndex === enemyIndex && !this.waveShieldSpawned) {
            this.spawnEnemyDrop(x, y);
        }
    },

    update(deltaTime) {
        // Update all powerups
        this.powerups.forEach(p => p.update(deltaTime));

        // NEW: Update all material drops
        this.materialDrops.forEach(m => m.update(deltaTime));

        // Check collision with all active players
        if (typeof playerManager !== 'undefined') {
            for (const pl of playerManager.getActivePlayers()) {
                // Powerup collision
                this.powerups.forEach(p => {
                    if (p.active && p.checkCollision(pl)) {
                        if (p.type === PowerupType.SHIELD) {
                            if (pl.activateShield()) {
                                p.active = false;
                                // Pickup effect
                                if (typeof EffectsManager !== 'undefined') {
                                    EffectsManager.addExplosion(p.x, p.y, 20, pl.colors.shield || '#00aaff');
                                }
                            }
                        } else if (p.type === PowerupType.FULL_REPAIR) {
                            // Full Repair - restore most damaged building
                            if (typeof buildingManager !== 'undefined') {
                                let mostDamagedBuilding = null;
                                let maxMissingBlocks = 0;

                                for (const building of buildingManager.buildings) {
                                    let missingBlocks = 0;
                                    for (let row = 0; row < building.heightBlocks; row++) {
                                        for (let col = 0; col < building.widthBlocks; col++) {
                                            if (!building.blocks[row][col]) missingBlocks++;
                                        }
                                    }
                                    if (missingBlocks > maxMissingBlocks) {
                                        maxMissingBlocks = missingBlocks;
                                        mostDamagedBuilding = building;
                                    }
                                }

                                if (mostDamagedBuilding && maxMissingBlocks > 0) {
                                    // Restore all blocks
                                    for (let row = 0; row < mostDamagedBuilding.heightBlocks; row++) {
                                        for (let col = 0; col < mostDamagedBuilding.widthBlocks; col++) {
                                            mostDamagedBuilding.blocks[row][col] = true;
                                        }
                                    }
                                    console.log(`Full Repair: Restored ${maxMissingBlocks} blocks!`);

                                    // Big visual effect
                                    if (typeof EffectsManager !== 'undefined') {
                                        EffectsManager.addExplosion(
                                            mostDamagedBuilding.x + mostDamagedBuilding.width / 2,
                                            mostDamagedBuilding.y + mostDamagedBuilding.height / 2,
                                            60, '#4ade80'
                                        );
                                    }
                                }
                            }
                            p.active = false;
                            if (typeof EffectsManager !== 'undefined') {
                                EffectsManager.addExplosion(p.x, p.y, 30, '#4ade80');
                            }
                        }
                    }
                });

                // NEW: Material drop collision (auto-collect)
                this.materialDrops.forEach(m => {
                    if (m.active && m.checkCollision(pl)) {
                        const playerIndex = pl.id - 1; // P1=0, P2=1
                        if (m.collect(playerIndex)) {
                            // Pickup effect
                            if (typeof EffectsManager !== 'undefined') {
                                EffectsManager.addExplosion(m.x, m.y, 15, '#fbbf24');
                            }
                            if (typeof SoundManager !== 'undefined') {
                                SoundManager.powerupCollect();
                            }
                        }
                    }
                });
            }
        }

        // Remove inactive powerups and materials
        this.powerups = this.powerups.filter(p => p.active);
        this.materialDrops = this.materialDrops.filter(m => m.active);
    },

    render(ctx) {
        this.powerups.forEach(p => p.render(ctx));
        this.materialDrops.forEach(m => m.render(ctx));  // NEW
    }
};
