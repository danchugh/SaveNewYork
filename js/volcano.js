// ============================================
// VOLCANO SYSTEM
// ============================================

const VolcanoManager = {
    // Volcano position (matches background.js volcano)
    volcanoX: 200,
    volcanoY: 150,  // Top of volcano in background

    // Eruption tracking
    lastEruptionWave: -3,  // Start eligible
    isErupting: false,
    eruptionTimer: 0,
    eruptionDuration: 8,

    // Pre-eruption smoke
    smokeIntensity: 0,
    smokeParticles: [],

    // Volcanic rocks (projectiles)
    rocks: [],

    reset() {
        this.lastEruptionWave = -3;
        this.isErupting = false;
        this.eruptionTimer = 0;
        this.smokeIntensity = 0;
        this.smokeParticles = [];
        this.rocks = [];
    },

    // Check if eruption can happen (called at wave start)
    checkEruption(currentWave) {
        // Must be at least 3 waves since last eruption
        if (currentWave - this.lastEruptionWave < 3) return;

        // 30% chance to erupt
        if (Math.random() > 0.3) return;

        // Start pre-eruption buildup
        this.smokeIntensity = 0.3;
        this.lastEruptionWave = currentWave;

        // Eruption starts after 5 seconds of smoke buildup
        setTimeout(() => {
            this.startEruption();
        }, 5000);

        console.log('Volcano rumbling...');
    },

    startEruption() {
        this.isErupting = true;
        this.eruptionTimer = this.eruptionDuration;
        this.smokeIntensity = 1;

        if (typeof SoundManager !== 'undefined') {
            SoundManager.volcanoEruption();
        }

        console.log('VOLCANO ERUPTING!');
    },

    update(deltaTime) {
        // Update smoke particles
        this.updateSmoke(deltaTime);

        // Update eruption
        if (this.isErupting) {
            this.eruptionTimer -= deltaTime;

            // Spawn rocks during eruption
            if (Math.random() < deltaTime * 2) {  // ~2 rocks per second
                this.spawnRock();
            }

            // End eruption
            if (this.eruptionTimer <= 0) {
                this.isErupting = false;
                this.smokeIntensity = 0.2;  // Residual smoke
                setTimeout(() => {
                    this.smokeIntensity = 0;
                }, 3000);
            }
        }

        // Update rocks
        this.updateRocks(deltaTime);
    },

    updateSmoke(deltaTime) {
        // Spawn smoke if intensity > 0
        if (this.smokeIntensity > 0 && Math.random() < deltaTime * 5 * this.smokeIntensity) {
            this.smokeParticles.push({
                x: this.volcanoX + (Math.random() - 0.5) * 30,
                y: this.volcanoY,
                vx: (Math.random() - 0.5) * 20,
                vy: -30 - Math.random() * 20,
                size: 10 + Math.random() * 20,
                life: 1,
                maxLife: 2 + Math.random()
            });
        }

        // Update existing smoke
        this.smokeParticles.forEach(p => {
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.vy -= 5 * deltaTime;  // Rise faster over time
            p.size += 10 * deltaTime;  // Expand
            p.life -= deltaTime / p.maxLife;
        });

        // Remove dead smoke
        this.smokeParticles = this.smokeParticles.filter(p => p.life > 0);
    },

    spawnRock() {
        // Random trajectory from volcano
        const angle = -Math.PI/2 + (Math.random() - 0.5) * 1.2;  // Upward arc
        const speed = 200 + Math.random() * 150;

        this.rocks.push({
            x: this.volcanoX + (Math.random() - 0.5) * 20,
            y: this.volcanoY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 8 + Math.random() * 8,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 10,
            active: true,
            trail: []  // Fire trail
        });
    },

    updateRocks(deltaTime) {
        const gravity = 200;

        this.rocks.forEach(rock => {
            if (!rock.active) return;

            // Physics
            rock.vy += gravity * deltaTime;
            rock.x += rock.vx * deltaTime;
            rock.y += rock.vy * deltaTime;
            rock.rotation += rock.rotationSpeed * deltaTime;

            // Add trail particle
            if (Math.random() < 0.5) {
                rock.trail.push({
                    x: rock.x,
                    y: rock.y,
                    life: 0.5
                });
            }

            // Update trail
            rock.trail.forEach(t => t.life -= deltaTime * 2);
            rock.trail = rock.trail.filter(t => t.life > 0);

            // Remove if off screen
            if (rock.y > CONFIG.STREET_Y + 50 || rock.x < -50 || rock.x > CONFIG.CANVAS_WIDTH + 50) {
                rock.active = false;
            }
        });

        // Clean up inactive rocks
        this.rocks = this.rocks.filter(r => r.active);
    },

    renderSmoke(ctx) {
        this.smokeParticles.forEach(p => {
            ctx.fillStyle = `rgba(80, 80, 80, ${p.life * 0.5 * this.smokeIntensity})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    },

    renderRocks(ctx) {
        this.rocks.forEach(rock => {
            if (!rock.active) return;

            // Render trail
            rock.trail.forEach(t => {
                ctx.fillStyle = `rgba(255, 150, 50, ${t.life})`;
                ctx.beginPath();
                ctx.arc(t.x, t.y, 4, 0, Math.PI * 2);
                ctx.fill();
            });

            // Render rock
            ctx.save();
            ctx.translate(rock.x, rock.y);
            ctx.rotate(rock.rotation);

            // Glowing rock
            ctx.fillStyle = '#ff4400';
            ctx.beginPath();
            ctx.arc(0, 0, rock.size, 0, Math.PI * 2);
            ctx.fill();

            // Dark spots
            ctx.fillStyle = '#aa2200';
            ctx.beginPath();
            ctx.arc(-rock.size * 0.3, -rock.size * 0.2, rock.size * 0.4, 0, Math.PI * 2);
            ctx.arc(rock.size * 0.2, rock.size * 0.3, rock.size * 0.3, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        });
    },

    // Called by game.js for collision detection
    getRocks() {
        return this.rocks.filter(r => r.active);
    },

    // Called when rock is shot
    destroyRock(rock) {
        rock.active = false;
        if (typeof SoundManager !== 'undefined') {
            SoundManager.rockDestroyed();
        }
        if (typeof EffectsManager !== 'undefined') {
            EffectsManager.addSparks(rock.x, rock.y, '#ff6600');
        }
    }
};
