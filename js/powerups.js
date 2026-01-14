// ============================================
// POWERUP SYSTEM
// ============================================

const PowerupType = {
    SHIELD: 'shield'
};

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

        // Blue orb
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

        ctx.restore();
    }
}

const PowerupManager = {
    powerups: [],
    waveShieldSpawned: false,
    scheduledParachuteDrop: null,
    enemyDropIndex: -1,

    reset() {
        this.powerups = [];
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

    onEnemyKilled(enemyIndex, x, y) {
        // Check if this enemy should drop the shield
        if (this.enemyDropIndex === enemyIndex && !this.waveShieldSpawned) {
            this.spawnEnemyDrop(x, y);
        }
    },

    update(deltaTime) {
        // Update all powerups
        this.powerups.forEach(p => p.update(deltaTime));

        // Check player collision
        this.powerups.forEach(p => {
            if (p.active && p.checkCollision(player)) {
                if (p.type === PowerupType.SHIELD) {
                    if (player.activateShield()) {
                        p.active = false;
                        // Pickup effect
                        if (typeof EffectsManager !== 'undefined') {
                            EffectsManager.addExplosion(p.x, p.y, 20, '#00aaff');
                        }
                    }
                }
            }
        });

        // Remove inactive powerups
        this.powerups = this.powerups.filter(p => p.active);
    },

    render(ctx) {
        this.powerups.forEach(p => p.render(ctx));
    }
};
