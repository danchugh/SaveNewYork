// ============================================
// VISUAL EFFECTS SYSTEM (JUICE & PARTICLES)
// ============================================

const EffectsManager = {
    effects: [],

    // Screen Shake State
    shakeIntensity: 0,
    shakeX: 0,
    shakeY: 0,

    // Hit Stop State
    hitStopTimer: 0,

    reset() {
        this.effects = [];
        this.shakeIntensity = 0;
        this.shakeX = 0;
        this.shakeY = 0;
        this.hitStopTimer = 0;

        // Clear animated particles
        if (typeof particleEmitter !== 'undefined') {
            particleEmitter.clear();
        }
    },

    // ============================================
    // JUICE FUNCTIONS
    // ============================================

    // Trigger a screen shake (capped per 2D game best practices)
    shake(intensity) {
        // Cap intensity to prevent excessive shake
        const cappedIntensity = Math.min(intensity, 25);
        // Keep the larger shake if already shaking
        this.shakeIntensity = Math.max(this.shakeIntensity, cappedIntensity);
        // Max shake duration is ~200ms (handled by SCREEN_SHAKE_DECAY)
    },

    // Trigger a frame freeze (hit stop)
    hitStop(duration) {
        this.hitStopTimer = duration;
    },

    // ============================================
    // PARTICLE FUNCTIONS
    // ============================================

    // Add a detailed explosion effect
    addExplosion(x, y, size, color) {
        const particleCount = 12 + Math.floor(size / 3);
        const particles = [];

        // Debris/Chunks
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 / particleCount) * i + Math.random() * 0.5;
            const speed = 60 + Math.random() * 120;
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 6,
                rotation: Math.random() * Math.PI,
                rotSpeed: (Math.random() - 0.5) * 10,
                life: 1,
                color: color || '#f97316' // Orange default
            });
        }

        // Smoke Puffs
        const smokeCount = 5 + Math.floor(size / 10);
        const smoke = [];
        for (let i = 0; i < smokeCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 10 + Math.random() * 30;
            smoke.push({
                x: x + (Math.random() - 0.5) * 10,
                y: y + (Math.random() - 0.5) * 10,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 20, // Float up
                size: 10 + Math.random() * 20,
                life: 1.5,
                angle: Math.random() * Math.PI
            });
        }

        this.effects.push({
            type: 'explosion',
            x: x,
            y: y,
            size: size,
            particles: particles,
            smoke: smoke,
            flash: 0.1, // Initial white flash duration
            life: 1.5,
            maxLife: 1.5
        });

        // Trigger shake based on size
        this.shake(size * 0.5);
    },

    /**
     * Add animated sprite-based explosion
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {string} source - 'building', 'enemy', 'player', 'boss'
     * @param {number} [size=20] - Explosion size (affects particle count)
     */
    addAnimatedExplosion(x, y, source = 'enemy', size = 20) {
        // Check if animated particles are available
        if (typeof particleEmitter === 'undefined' || typeof AssetManager === 'undefined') {
            // Fallback to procedural
            this.addExplosion(x, y, size, '#f97316');
            return;
        }

        // Determine debris type and sprite based on source
        let debrisKey, sparkKey, smokeKey;

        switch (source) {
            case 'building':
                debrisKey = 'debris_concrete';
                sparkKey = 'debris_spark';
                smokeKey = 'debris_smoke';
                break;
            case 'player':
                debrisKey = 'debris_spark';
                sparkKey = 'debris_spark';
                smokeKey = 'debris_smoke';
                break;
            case 'boss':
                debrisKey = 'debris_metal';
                sparkKey = 'debris_spark';
                smokeKey = 'debris_smoke';
                break;
            case 'enemy':
            default:
                debrisKey = 'debris_metal';
                sparkKey = 'debris_spark';
                smokeKey = 'debris_smoke';
                break;
        }

        const debrisSheet = AssetManager.getImage(debrisKey);
        const sparkSheet = AssetManager.getImage(sparkKey);
        const smokeSheet = AssetManager.getImage(smokeKey);

        // If sprites not loaded, fall back to procedural
        if (!debrisSheet && !sparkSheet) {
            this.addExplosion(x, y, size, '#f97316');
            return;
        }

        // Calculate particle count based on size and config
        const sizeMultiplier = Math.max(0.5, size / 20);
        const baseCount = CONFIG.PARTICLE_COUNT_MIN + Math.floor(
            (CONFIG.PARTICLE_COUNT_MAX - CONFIG.PARTICLE_COUNT_MIN) * Math.min(1, sizeMultiplier)
        );

        // Emit main debris (60% of particles)
        if (debrisSheet) {
            // Note: concrete is 2x2 grid (256x256, so 128x128 per frame)
            // metal/spark/smoke are horizontal strips
            const isGrid = debrisKey === 'debris_concrete';
            const frameSize = isGrid ? 128 : 128; // Approximate

            particleEmitter.emit({
                x: x,
                y: y,
                sheet: debrisSheet,
                frameWidth: frameSize,
                frameHeight: frameSize,
                frameCount: 4,
                count: Math.floor(baseCount * 0.6),
                speed: 100 + size * 3,
                gravity: 300,
                lifetime: 0.8 + Math.random() * 0.4,
                scale: 0.15 + (size / 100) * 0.1
            });
        }

        // Emit sparks (30% of particles)
        if (sparkSheet) {
            particleEmitter.emit({
                x: x,
                y: y,
                sheet: sparkSheet,
                frameWidth: 128,
                frameHeight: 128,
                frameCount: 4,
                count: Math.floor(baseCount * 0.3),
                speed: 150 + size * 2,
                gravity: 100,
                lifetime: 0.5 + Math.random() * 0.3,
                scale: 0.2 + (size / 100) * 0.15
            });
        }

        // Emit smoke (10% of particles)
        if (smokeSheet) {
            particleEmitter.emit({
                x: x,
                y: y,
                sheet: smokeSheet,
                frameWidth: 128,
                frameHeight: 128,
                frameCount: 4,
                count: Math.floor(baseCount * 0.1),
                speed: 30,
                gravity: -50, // Float up
                lifetime: 1.0 + Math.random() * 0.5,
                scale: 0.3 + (size / 100) * 0.2
            });
        }

        // Add white flash effect using procedural system
        this.effects.push({
            type: 'explosion_flash',
            x: x,
            y: y,
            size: size,
            life: 0.15,
            maxLife: 0.15
        });

        // Trigger shake
        this.shake(size * 0.5);
    },

    // Add a spark effect (smaller, for shooting rocks/armor)
    addSparks(x, y, color) {
        const particles = [];
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 100 + Math.random() * 100;
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 30,
                size: 1 + Math.random() * 2,
                life: 0.5,
                color: color || '#facc15' // Yellow
            });
        }

        this.effects.push({
            type: 'sparks',
            particles: particles,
            life: 0.5,
            maxLife: 0.5
        });
    },

    // Add lightning strike glow at impact point
    addLightningImpact(x, y) {
        this.effects.push({
            type: 'lightning_impact',
            x: x,
            y: y,
            size: 40,
            life: 0.5,
            maxLife: 0.5
        });
        this.shake(15);
    },

    // Add muzzle flash for player shooting
    addMuzzleFlash(x, y, angle) {
        this.effects.push({
            type: 'muzzle_flash',
            x: x,
            y: y,
            angle: angle,
            life: 0.05, // Very short
            maxLife: 0.05
        });
    },

    // Add floating text popup (for bonuses, damage numbers)
    addTextPopup(x, y, text, color) {
        this.effects.push({
            type: 'text_popup',
            x: x,
            y: y,
            text: text,
            color: color || '#ffffff',
            life: 1.5,
            maxLife: 1.5,
            vy: -40 // Float upward
        });
    },

    // Add sparkle celebration effect
    addSparkles(x, y) {
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const speed = 50 + Math.random() * 50;
            this.effects.push({
                type: 'sparkle',
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 3,
                life: 0.8,
                maxLife: 0.8,
                hue: 40 + Math.random() * 40 // Gold to yellow
            });
        }
    },

    update(deltaTime) {
        // Update Shake
        if (this.shakeIntensity > 0) {
            this.shakeX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
            this.shakeY = (Math.random() - 0.5) * 2 * this.shakeIntensity;
            this.shakeIntensity -= CONFIG.SCREEN_SHAKE_DECAY * deltaTime;
            if (this.shakeIntensity < 0) this.shakeIntensity = 0;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
        }

        // Update Effects
        this.effects.forEach(effect => {
            effect.life -= deltaTime;

            if (effect.type === 'explosion') {
                if (effect.flash > 0) effect.flash -= deltaTime;

                // Debris
                effect.particles.forEach(p => {
                    p.x += p.vx * deltaTime;
                    p.y += p.vy * deltaTime;
                    p.vy += 400 * deltaTime;  // Heavy Gravity
                    p.rotation += p.rotSpeed * deltaTime;
                    p.life -= deltaTime;
                });

                // Smoke
                effect.smoke.forEach(s => {
                    s.x += s.vx * deltaTime;
                    s.y += s.vy * deltaTime;
                    s.size += 10 * deltaTime; // Expand
                    s.life -= deltaTime * 0.8;
                });
            }

            if (effect.type === 'sparks') {
                effect.particles.forEach(p => {
                    p.x += p.vx * deltaTime;
                    p.y += p.vy * deltaTime;
                    p.vy += 300 * deltaTime;
                    p.life -= deltaTime * 2;
                });
            }

            if (effect.type === 'text_popup') {
                effect.y += effect.vy * deltaTime;
            }

            if (effect.type === 'sparkle') {
                effect.x += effect.vx * deltaTime;
                effect.y += effect.vy * deltaTime;
                effect.vx *= 0.95; // Slow down
                effect.vy *= 0.95;
            }
        });

        // Remove dead effects
        this.effects = this.effects.filter(e => e.life > 0);

        // Update animated particles
        if (typeof particleEmitter !== 'undefined') {
            particleEmitter.update(deltaTime);
        }
    },

    render(ctx) {
        // Render animated particles first (behind procedural effects)
        if (typeof particleEmitter !== 'undefined') {
            particleEmitter.render(ctx);
        }

        this.effects.forEach(effect => {
            const alpha = Math.max(0, effect.life / effect.maxLife);

            // Animated explosion flash
            if (effect.type === 'explosion_flash') {
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.beginPath();
                ctx.arc(effect.x, effect.y, effect.size * 1.5, 0, Math.PI * 2);
                ctx.fill();
            }

            if (effect.type === 'muzzle_flash') {
                ctx.save();
                ctx.translate(effect.x, effect.y);
                ctx.rotate(effect.angle * Math.PI / 180);
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.ellipse(15, 0, 10, 5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#60a5fa'; // Blue tinted halo
                ctx.beginPath();
                ctx.ellipse(12, 0, 15, 8, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            if (effect.type === 'explosion') {
                // Initial Flash
                if (effect.flash > 0) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${effect.flash * 10})`;
                    ctx.beginPath();
                    ctx.arc(effect.x, effect.y, effect.size * 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Smoke (draw first to be behind)
                effect.smoke.forEach(s => {
                    if (s.life <= 0) return;
                    const smokeAlpha = Math.min(1, s.life);
                    // Dark grey to black smoke
                    const grey = Math.floor(50 * smokeAlpha);
                    ctx.fillStyle = `rgba(${grey}, ${grey}, ${grey}, ${smokeAlpha * 0.6})`;
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                    ctx.fill();
                });

                // Debris particles
                effect.particles.forEach(p => {
                    if (p.life <= 0) return;
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.rotation);
                    ctx.fillStyle = p.color;
                    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                    ctx.restore();
                });
            }

            if (effect.type === 'sparks') {
                effect.particles.forEach(p => {
                    if (p.life <= 0) return;
                    ctx.fillStyle = p.color;
                    ctx.globalAlpha = p.life;
                    ctx.beginPath();
                    // Elongated sparks
                    ctx.ellipse(p.x, p.y, p.size * 3, p.size, Math.atan2(p.vy, p.vx), 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                });
            }

            if (effect.type === 'lightning_impact') {
                // Electric glow
                const gradient = ctx.createRadialGradient(
                    effect.x, effect.y, 0,
                    effect.x, effect.y, effect.size * 2
                );
                gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
                gradient.addColorStop(0.3, `rgba(100, 200, 255, ${alpha * 0.8})`);
                gradient.addColorStop(1, 'rgba(0, 0, 255, 0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(effect.x, effect.y, effect.size * 2, 0, Math.PI * 2);
                ctx.fill();
            }

            if (effect.type === 'text_popup') {
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.font = 'bold 12px monospace';
                ctx.fillStyle = effect.color;
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.textAlign = 'center';
                ctx.strokeText(effect.text, effect.x, effect.y);
                ctx.fillText(effect.text, effect.x, effect.y);
                ctx.restore();
            }

            if (effect.type === 'sparkle') {
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = `hsl(${effect.hue}, 100%, 70%)`;
                ctx.shadowBlur = 5;
                ctx.shadowColor = `hsl(${effect.hue}, 100%, 50%)`;
                ctx.beginPath();
                // Star shape
                for (let i = 0; i < 4; i++) {
                    const angle = (i / 4) * Math.PI * 2;
                    const x = effect.x + Math.cos(angle) * effect.size;
                    const y = effect.y + Math.sin(angle) * effect.size;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);

                    const midAngle = angle + Math.PI / 4;
                    const midX = effect.x + Math.cos(midAngle) * effect.size * 0.3;
                    const midY = effect.y + Math.sin(midAngle) * effect.size * 0.3;
                    ctx.lineTo(midX, midY);
                }
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        });
    }
};
