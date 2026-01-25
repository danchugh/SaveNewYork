// ============================================
// ARTILLERY MANAGER
// Background artillery event for Wave 4+
// Distant artillery silhouette fires shells that arc toward the city
// ============================================

const ArtilleryManager = {
    // Position (far right background)
    artilleryX: CONFIG.CANVAS_WIDTH - 80,
    artilleryY: 160,

    // State
    isActive: false,
    hasTriggeredThisWave: false,
    scheduledTime: 0,
    waveTimer: 0,

    // Barrage state
    shellsRemaining: 0,
    shellInterval: CONFIG.ARTILLERY_SHELL_INTERVAL || 0.8,
    shellTimer: 0,

    // Visuals
    muzzleFlash: 0,
    smokeParticles: [],
    recoilOffset: 0,

    reset() {
        this.isActive = false;
        this.hasTriggeredThisWave = false;
        this.scheduledTime = 0;
        this.waveTimer = 0;
        this.shellsRemaining = 0;
        this.shellTimer = 0;
        this.muzzleFlash = 0;
        this.smokeParticles = [];
        this.recoilOffset = 0;
    },

    startWave(waveNum) {
        // Only active in wave 4+
        if (waveNum < (CONFIG.ARTILLERY_MIN_WAVE || 4)) {
            this.hasTriggeredThisWave = true;  // Prevent triggering
            return;
        }

        this.hasTriggeredThisWave = false;
        this.waveTimer = 0;
        this.shellsRemaining = 0;
        this.isActive = false;

        // Schedule random trigger time within the wave
        const minDelay = CONFIG.ARTILLERY_DELAY_MIN || 5;
        const maxDelay = CONFIG.ARTILLERY_DELAY_MAX || 15;
        this.scheduledTime = minDelay + Math.random() * (maxDelay - minDelay);

        console.log(`Artillery scheduled for ${this.scheduledTime.toFixed(1)}s into wave ${waveNum}`);
    },

    startBarrage() {
        this.isActive = true;
        this.hasTriggeredThisWave = true;
        const minShells = CONFIG.ARTILLERY_SHELL_COUNT_MIN || 5;
        const maxShells = CONFIG.ARTILLERY_SHELL_COUNT_MAX || 8;
        this.shellsRemaining = minShells + Math.floor(Math.random() * (maxShells - minShells + 1));
        this.shellTimer = 0;  // Fire first shell immediately

        console.log(`Artillery barrage started! Firing ${this.shellsRemaining} shells`);

        // Play sound
        if (typeof SoundManager !== 'undefined') {
            SoundManager.bossHit();  // Use as artillery rumble
        }
    },

    fireShell() {
        if (this.shellsRemaining <= 0) return;

        this.shellsRemaining--;
        this.muzzleFlash = 0.3;  // Flash duration
        this.recoilOffset = 8;   // Recoil animation

        // Add smoke particles
        for (let i = 0; i < 5; i++) {
            this.smokeParticles.push({
                x: this.artilleryX - 25,
                y: this.artilleryY - 10,
                velX: -20 - Math.random() * 30,
                velY: -10 - Math.random() * 20,
                size: 8 + Math.random() * 8,
                alpha: 0.8,
                rotation: Math.random() * Math.PI * 2
            });
        }

        // Calculate arc trajectory for shell
        // Shell needs to travel from artillery position to somewhere in the city
        // Target: random building or center of screen
        let targetX = 100 + Math.random() * (CONFIG.CANVAS_WIDTH - 300);
        let targetY = CONFIG.STREET_Y - 50 - Math.random() * 200;

        // Calculate initial velocity for arc
        // Using simple projectile physics
        const dx = targetX - this.artilleryX;
        const dy = targetY - this.artilleryY;
        const t = 2.0;  // Time to reach target (adjust for arc height)

        // Initial velocity: vx = dx/t, vy = (dy - 0.5*g*t^2) / t
        // For our BombProjectile, we'll use angle/speed
        const arcHeight = 150;  // Extra height for nice arc
        const angle = Math.atan2(dy - arcHeight, dx) * 180 / Math.PI;

        // Spawn bomb projectile with calculated trajectory
        if (typeof projectileManager !== 'undefined') {
            // Adjust angle to be more horizontal (shells come from far right)
            const shellAngle = 200 + Math.random() * 40;  // 200-240 degrees (down-left)
            const shellSpeed = 180 + Math.random() * 40;

            projectileManager.addBomb(
                this.artilleryX - 20,
                this.artilleryY - 5,
                shellAngle,
                shellSpeed
            );
        }

        // Sound effect
        if (typeof SoundManager !== 'undefined') {
            SoundManager.shoot();
        }

        // Screen shake
        if (typeof EffectsManager !== 'undefined') {
            EffectsManager.shake(2);
        }

        console.log(`Artillery shell fired! ${this.shellsRemaining} remaining`);
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

        // Update active barrage
        if (this.isActive && this.shellsRemaining > 0) {
            this.shellTimer -= deltaTime;
            if (this.shellTimer <= 0) {
                this.fireShell();
                this.shellTimer = this.shellInterval;
            }
        } else if (this.isActive && this.shellsRemaining <= 0) {
            this.isActive = false;
            console.log('Artillery barrage complete');
        }

        // Update muzzle flash
        if (this.muzzleFlash > 0) {
            this.muzzleFlash -= deltaTime;
        }

        // Update recoil
        if (this.recoilOffset > 0) {
            this.recoilOffset -= deltaTime * 40;
            if (this.recoilOffset < 0) this.recoilOffset = 0;
        }

        // Update smoke particles
        for (const particle of this.smokeParticles) {
            particle.x += particle.velX * deltaTime;
            particle.y += particle.velY * deltaTime;
            particle.velY += 10 * deltaTime;  // Gravity
            particle.size += deltaTime * 5;   // Expand
            particle.alpha -= deltaTime * 0.8;
            particle.rotation += deltaTime * 2;
        }
        this.smokeParticles = this.smokeParticles.filter(p => p.alpha > 0);
    },

    render(ctx) {
        // Only render in wave 4+ and during gameplay
        if (typeof game === 'undefined' || game.state !== GameState.PLAYING) return;
        if (typeof enemyManager === 'undefined' || enemyManager.waveNumber < (CONFIG.ARTILLERY_MIN_WAVE || 4)) return;

        ctx.save();

        // Draw smoke particles (behind artillery)
        for (const particle of this.smokeParticles) {
            ctx.save();
            ctx.translate(particle.x, particle.y);
            ctx.rotate(particle.rotation);
            ctx.fillStyle = `rgba(100, 100, 100, ${particle.alpha})`;
            ctx.beginPath();
            ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Artillery position with recoil
        const drawX = this.artilleryX + this.recoilOffset;
        const drawY = this.artilleryY;

        // Draw distant artillery silhouette
        ctx.fillStyle = '#1a1a2e';  // Dark silhouette

        // Base/platform
        ctx.fillRect(drawX - 30, drawY + 15, 60, 20);

        // Barrel (angled toward city)
        ctx.save();
        ctx.translate(drawX, drawY + 5);
        ctx.rotate(-0.4);  // Angle up-left
        ctx.fillRect(-50, -6, 50, 12);
        ctx.restore();

        // Main body
        ctx.beginPath();
        ctx.arc(drawX, drawY + 5, 18, 0, Math.PI * 2);
        ctx.fill();

        // Wheels
        ctx.fillStyle = '#0d0d1a';
        ctx.beginPath();
        ctx.arc(drawX - 20, drawY + 28, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(drawX + 20, drawY + 28, 10, 0, Math.PI * 2);
        ctx.fill();

        // Muzzle flash effect
        if (this.muzzleFlash > 0) {
            ctx.save();
            ctx.translate(drawX - 45, drawY - 5);
            ctx.rotate(-0.4);

            // Outer glow
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = `rgba(255, 200, 50, ${this.muzzleFlash * 2})`;
            ctx.beginPath();
            ctx.arc(0, 0, 25, 0, Math.PI * 2);
            ctx.fill();

            // Inner flash
            ctx.fillStyle = `rgba(255, 255, 200, ${this.muzzleFlash * 3})`;
            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        // Warning indicator when barrage is active
        if (this.isActive && this.shellsRemaining > 0) {
            const pulse = 0.5 + Math.sin(Date.now() / 100) * 0.3;
            ctx.fillStyle = `rgba(255, 50, 50, ${pulse})`;
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('INCOMING!', drawX, drawY - 30);

            // Shell count indicator
            ctx.fillStyle = '#ff4444';
            ctx.fillText(`${this.shellsRemaining}`, drawX, drawY - 45);
        }

        ctx.restore();
    }
};
