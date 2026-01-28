// ============================================
// ARTILLERY MANAGER
// Background artillery event for Wave 4+
// Distant rocket launches from horizon, shells rain down on city
// ============================================

const ArtilleryManager = {
    // State
    isActive: false,
    hasTriggeredThisWave: false,
    scheduledTime: 0,
    waveTimer: 0,

    // Barrage phases: 'idle' -> 'launching' -> 'hanging' -> 'falling' -> 'idle'
    phase: 'idle',
    phaseTimer: 0,

    // Launch trails (ascending rockets)
    launchTrails: [],

    // Target reticles (landing zone indicators)
    targetReticles: [],

    // Falling shells
    fallingShells: [],

    // Smoke/exhaust particles
    smokeParticles: [],

    // Config
    shellCount: 0,
    hangTime: 0,  // Time between launches disappearing and shells falling

    reset() {
        this.isActive = false;
        this.hasTriggeredThisWave = false;
        this.scheduledTime = 0;
        this.waveTimer = 0;
        this.phase = 'idle';
        this.phaseTimer = 0;
        this.launchTrails = [];
        this.targetReticles = [];
        this.fallingShells = [];
        this.smokeParticles = [];
        this.shellCount = 0;
        this.hangTime = 0;
    },

    startWave(waveNum) {
        // Only active in wave 4+
        if (waveNum < (CONFIG.ARTILLERY_MIN_WAVE || 4)) {
            this.hasTriggeredThisWave = true;  // Prevent triggering
            return;
        }

        this.hasTriggeredThisWave = false;
        this.waveTimer = 0;
        this.phase = 'idle';
        this.launchTrails = [];
        this.targetReticles = [];
        this.fallingShells = [];

        // Schedule random trigger time within the wave
        const minDelay = CONFIG.ARTILLERY_DELAY_MIN || 5;
        const maxDelay = CONFIG.ARTILLERY_DELAY_MAX || 15;
        this.scheduledTime = minDelay + Math.random() * (maxDelay - minDelay);

        console.log(`Artillery scheduled for ${this.scheduledTime.toFixed(1)}s into wave ${waveNum}`);
    },

    startBarrage() {
        this.isActive = true;
        this.hasTriggeredThisWave = true;
        this.phase = 'launching';
        this.phaseTimer = 0;

        // Determine shell count
        const minShells = CONFIG.ARTILLERY_SHELL_COUNT_MIN || 5;
        const maxShells = CONFIG.ARTILLERY_SHELL_COUNT_MAX || 8;
        this.shellCount = minShells + Math.floor(Math.random() * (maxShells - minShells + 1));

        // Hang time (dramatic pause between launch and fall)
        this.hangTime = 3 + Math.random() * 2;  // 3-5 seconds

        // Create launch trails and corresponding targets
        this.createLaunchTrails();

        console.log(`Artillery barrage started! ${this.shellCount} shells, ${this.hangTime.toFixed(1)}s hang time`);

        // Distant rumble sound
        if (typeof SoundManager !== 'undefined') {
            SoundManager.buildingCollapse();  // Distant boom
        }
    },

    createLaunchTrails() {
        this.launchTrails = [];
        this.targetReticles = [];

        // Horizon Y position (just above street level, far background)
        const horizonY = CONFIG.STREET_Y + 20;

        for (let i = 0; i < this.shellCount; i++) {
            // Stagger launch times slightly for realism
            const launchDelay = i * 0.15 + Math.random() * 0.1;

            // Launch from random points along the horizon
            const launchX = 50 + Math.random() * (CONFIG.CANVAS_WIDTH - 100);

            // Target location (where shell will land)
            const targetX = 80 + Math.random() * (CONFIG.CANVAS_WIDTH - 160);
            const targetY = CONFIG.STREET_Y - 20 - Math.random() * 80;  // Near ground level

            // Create launch trail
            this.launchTrails.push({
                x: launchX,
                y: horizonY,
                startY: horizonY,
                targetX: targetX,
                targetY: targetY,
                delay: launchDelay,
                launched: false,
                speed: 280 + Math.random() * 80,  // Ascent speed
                alpha: 0,
                trailLength: 0,
                maxTrailLength: 120 + Math.random() * 60,
                // Smoke trail segments
                segments: []
            });

            // Create corresponding target reticle (will appear during hang phase)
            this.targetReticles.push({
                x: targetX,
                y: targetY,
                radius: 0,
                maxRadius: 25 + Math.random() * 15,
                alpha: 0,
                pulsePhase: Math.random() * Math.PI * 2,
                shellLanded: false
            });
        }
    },

    update(deltaTime) {
        // Only process during gameplay
        if (typeof game === 'undefined' || game.state !== GameState.PLAYING) return;
        // Don't run during between-waves countdown
        if (typeof enemyManager !== 'undefined' && enemyManager.betweenWaves) return;

        // Update wave timer
        this.waveTimer += deltaTime;

        // Check if should start barrage
        if (!this.hasTriggeredThisWave && this.waveTimer >= this.scheduledTime) {
            this.startBarrage();
        }

        // Update based on current phase
        switch (this.phase) {
            case 'launching':
                this.updateLaunchPhase(deltaTime);
                break;
            case 'hanging':
                this.updateHangPhase(deltaTime);
                break;
            case 'falling':
                this.updateFallPhase(deltaTime);
                break;
        }

        // Always update smoke particles
        this.updateSmokeParticles(deltaTime);
    },

    updateLaunchPhase(deltaTime) {
        this.phaseTimer += deltaTime;

        let allLaunched = true;
        let allOffScreen = true;

        for (const trail of this.launchTrails) {
            // Check if should start launching
            if (!trail.launched && this.phaseTimer >= trail.delay) {
                trail.launched = true;
                trail.alpha = 1;

                // Launch sound
                if (typeof SoundManager !== 'undefined') {
                    SoundManager.shoot();
                }
            }

            if (!trail.launched) {
                allLaunched = false;
                continue;
            }

            // Move trail upward
            trail.y -= trail.speed * deltaTime;

            // Grow trail length
            if (trail.trailLength < trail.maxTrailLength) {
                trail.trailLength += trail.speed * deltaTime * 0.8;
            }

            // Add smoke segments
            if (Math.random() < 0.3) {
                trail.segments.push({
                    x: trail.x + (Math.random() - 0.5) * 6,
                    y: trail.y + trail.trailLength * 0.5,
                    size: 4 + Math.random() * 4,
                    alpha: 0.6
                });
            }

            // Fade smoke segments
            for (const seg of trail.segments) {
                seg.alpha -= deltaTime * 0.4;
                seg.size += deltaTime * 8;
                seg.y += deltaTime * 5;  // Slight drift down
            }
            trail.segments = trail.segments.filter(s => s.alpha > 0);

            // Check if off screen
            if (trail.y + trail.trailLength > -50) {
                allOffScreen = false;
            } else {
                trail.alpha = 0;
            }
        }

        // Transition to hanging phase when all trails are off screen
        if (allLaunched && allOffScreen) {
            this.phase = 'hanging';
            this.phaseTimer = 0;
            console.log('Artillery: Entering hang phase');

            // Start showing target reticles
            for (const reticle of this.targetReticles) {
                reticle.alpha = 0;
            }
        }
    },

    updateHangPhase(deltaTime) {
        this.phaseTimer += deltaTime;

        // Fade in target reticles
        for (const reticle of this.targetReticles) {
            // Gradually reveal
            const revealProgress = Math.min(1, this.phaseTimer / 1.0);
            reticle.alpha = revealProgress * 0.7;
            reticle.radius = reticle.maxRadius * revealProgress;

            // Pulse effect
            reticle.pulsePhase += deltaTime * 4;
        }

        // Transition to falling phase after hang time
        if (this.phaseTimer >= this.hangTime) {
            this.phase = 'falling';
            this.phaseTimer = 0;
            this.createFallingShells();
            console.log('Artillery: Shells incoming!');

            // Warning sound (descending tone)
            if (typeof SoundManager !== 'undefined') {
                SoundManager.bomberDive();  // Incoming shell whistle
            }
        }
    },

    createFallingShells() {
        this.fallingShells = [];

        for (let i = 0; i < this.targetReticles.length; i++) {
            const reticle = this.targetReticles[i];

            // Shell starts above screen, falls toward reticle
            this.fallingShells.push({
                x: reticle.x + (Math.random() - 0.5) * 20,  // Slight variance
                y: -50 - i * 30,  // Stagger vertically
                targetX: reticle.x,
                targetY: reticle.y,
                speed: 350 + Math.random() * 100,
                rotation: Math.PI * 0.6 + (Math.random() - 0.5) * 0.3,  // Angled down
                reticleIndex: i,
                active: true
            });
        }
    },

    updateFallPhase(deltaTime) {
        this.phaseTimer += deltaTime;

        let allLanded = true;

        for (const shell of this.fallingShells) {
            if (!shell.active) continue;

            allLanded = false;

            // Move shell downward
            shell.y += shell.speed * deltaTime;

            // Slight horizontal drift toward target
            const dx = shell.targetX - shell.x;
            shell.x += dx * deltaTime * 0.5;

            // Add smoke trail
            if (Math.random() < 0.4) {
                this.smokeParticles.push({
                    x: shell.x,
                    y: shell.y - 10,
                    velX: (Math.random() - 0.5) * 20,
                    velY: -30 - Math.random() * 20,
                    size: 3 + Math.random() * 3,
                    alpha: 0.5,
                    color: '#666666'
                });
            }

            // Check for impact
            if (shell.y >= shell.targetY) {
                this.shellImpact(shell);
                shell.active = false;

                // Mark reticle as hit
                if (this.targetReticles[shell.reticleIndex]) {
                    this.targetReticles[shell.reticleIndex].shellLanded = true;
                    this.targetReticles[shell.reticleIndex].alpha = 0;
                }
            }
        }

        // Fade out remaining reticles
        for (const reticle of this.targetReticles) {
            if (reticle.shellLanded) {
                reticle.alpha -= deltaTime * 3;
            }
        }

        // End barrage when all shells have landed
        if (allLanded) {
            this.phase = 'idle';
            this.isActive = false;
            this.launchTrails = [];
            this.targetReticles = [];
            this.fallingShells = [];
            console.log('Artillery barrage complete');
        }
    },

    shellImpact(shell) {
        // Explosion effect
        if (typeof EffectsManager !== 'undefined') {
            EffectsManager.addExplosion(shell.x, shell.y, 30, '#ff6600');
            EffectsManager.shake(4);
        }

        // Sound
        if (typeof SoundManager !== 'undefined') {
            SoundManager.fallingCrash();
        }

        // Damage buildings
        if (typeof buildingManager !== 'undefined') {
            // Find nearest building and damage it
            const damageRadius = 40;
            const damageAmount = CONFIG.MISSILE_DAMAGE_MIN || 3;

            for (const building of buildingManager.buildings) {
                const bCenterX = building.x + (building.widthBlocks * CONFIG.BLOCK_SIZE) / 2;

                if (Math.abs(bCenterX - shell.x) < damageRadius + building.widthBlocks * CONFIG.BLOCK_SIZE / 2) {
                    // Damage this building
                    const blocksToDestroy = damageAmount + Math.floor(Math.random() * 3);
                    for (let j = 0; j < blocksToDestroy; j++) {
                        const hitX = shell.x + (Math.random() - 0.5) * 30;
                        const hitY = shell.y - Math.random() * 40;
                        building.damageAt(hitX, hitY, 1);
                    }
                    break;
                }
            }
        }

        // Smoke cloud at impact
        for (let i = 0; i < 8; i++) {
            this.smokeParticles.push({
                x: shell.x + (Math.random() - 0.5) * 30,
                y: shell.y + (Math.random() - 0.5) * 20,
                velX: (Math.random() - 0.5) * 60,
                velY: -40 - Math.random() * 40,
                size: 10 + Math.random() * 15,
                alpha: 0.7,
                color: '#444444'
            });
        }
    },

    updateSmokeParticles(deltaTime) {
        for (const particle of this.smokeParticles) {
            particle.x += particle.velX * deltaTime;
            particle.y += particle.velY * deltaTime;
            particle.velY += 20 * deltaTime;  // Slight gravity
            particle.size += deltaTime * 15;  // Expand
            particle.alpha -= deltaTime * 0.6;
        }
        this.smokeParticles = this.smokeParticles.filter(p => p.alpha > 0);
    },

    render(ctx) {
        // Only render in wave 4+ and during gameplay
        if (typeof game === 'undefined' || game.state !== GameState.PLAYING) return;
        if (typeof enemyManager === 'undefined' || enemyManager.waveNumber < (CONFIG.ARTILLERY_MIN_WAVE || 4)) return;

        ctx.save();

        // Render launch trails (during launch phase)
        this.renderLaunchTrails(ctx);

        // Render target reticles (during hang and fall phases)
        this.renderTargetReticles(ctx);

        // Render falling shells
        this.renderFallingShells(ctx);

        // Render smoke particles
        this.renderSmokeParticles(ctx);

        ctx.restore();
    },

    renderLaunchTrails(ctx) {
        for (const trail of this.launchTrails) {
            if (trail.alpha <= 0) continue;

            // Draw smoke trail segments (behind)
            for (const seg of trail.segments) {
                ctx.fillStyle = `rgba(180, 180, 180, ${seg.alpha * trail.alpha})`;
                ctx.beginPath();
                ctx.arc(seg.x, seg.y, seg.size, 0, Math.PI * 2);
                ctx.fill();
            }

            // Draw main smoke column
            const gradient = ctx.createLinearGradient(
                trail.x, trail.y,
                trail.x, trail.y + trail.trailLength
            );
            gradient.addColorStop(0, `rgba(255, 200, 100, ${trail.alpha})`);  // Bright tip
            gradient.addColorStop(0.1, `rgba(255, 150, 50, ${trail.alpha * 0.8})`);
            gradient.addColorStop(0.3, `rgba(200, 200, 200, ${trail.alpha * 0.6})`);
            gradient.addColorStop(1, `rgba(150, 150, 150, 0)`);

            ctx.strokeStyle = gradient;
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(trail.x, trail.y);
            ctx.lineTo(trail.x, trail.y + trail.trailLength);
            ctx.stroke();

            // Bright rocket tip
            ctx.fillStyle = `rgba(255, 220, 100, ${trail.alpha})`;
            ctx.beginPath();
            ctx.arc(trail.x, trail.y, 4, 0, Math.PI * 2);
            ctx.fill();

            // Glow effect
            ctx.shadowColor = '#ff8800';
            ctx.shadowBlur = 15;
            ctx.fillStyle = `rgba(255, 150, 50, ${trail.alpha * 0.8})`;
            ctx.beginPath();
            ctx.arc(trail.x, trail.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    },

    renderTargetReticles(ctx) {
        for (const reticle of this.targetReticles) {
            if (reticle.alpha <= 0) continue;

            const pulse = 0.8 + Math.sin(reticle.pulsePhase) * 0.2;
            const r = reticle.radius * pulse;

            // Outer ring
            ctx.strokeStyle = `rgba(255, 50, 50, ${reticle.alpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(reticle.x, reticle.y, r, 0, Math.PI * 2);
            ctx.stroke();

            // Inner crosshairs
            ctx.strokeStyle = `rgba(255, 100, 100, ${reticle.alpha * 0.7})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(reticle.x - r * 0.5, reticle.y);
            ctx.lineTo(reticle.x + r * 0.5, reticle.y);
            ctx.moveTo(reticle.x, reticle.y - r * 0.5);
            ctx.lineTo(reticle.x, reticle.y + r * 0.5);
            ctx.stroke();

            // Shadow/danger zone fill
            ctx.fillStyle = `rgba(255, 0, 0, ${reticle.alpha * 0.15})`;
            ctx.beginPath();
            ctx.arc(reticle.x, reticle.y, r, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    renderFallingShells(ctx) {
        for (const shell of this.fallingShells) {
            if (!shell.active) continue;

            ctx.save();
            ctx.translate(shell.x, shell.y);
            ctx.rotate(shell.rotation);

            // Shell body (elongated oval)
            ctx.fillStyle = '#333333';
            ctx.beginPath();
            ctx.ellipse(0, 0, 6, 14, 0, 0, Math.PI * 2);
            ctx.fill();

            // Nose cone
            ctx.fillStyle = '#222222';
            ctx.beginPath();
            ctx.moveTo(0, -14);
            ctx.lineTo(-4, -8);
            ctx.lineTo(4, -8);
            ctx.closePath();
            ctx.fill();

            // Fins
            ctx.fillStyle = '#444444';
            ctx.beginPath();
            ctx.moveTo(-6, 10);
            ctx.lineTo(-10, 16);
            ctx.lineTo(-4, 12);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(6, 10);
            ctx.lineTo(10, 16);
            ctx.lineTo(4, 12);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        }
    },

    renderSmokeParticles(ctx) {
        for (const particle of this.smokeParticles) {
            ctx.fillStyle = particle.color.replace(')', `, ${particle.alpha})`).replace('rgb', 'rgba');
            if (particle.color.startsWith('#')) {
                // Convert hex to rgba
                const r = parseInt(particle.color.slice(1, 3), 16);
                const g = parseInt(particle.color.slice(3, 5), 16);
                const b = parseInt(particle.color.slice(5, 7), 16);
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${particle.alpha})`;
            }
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
};
