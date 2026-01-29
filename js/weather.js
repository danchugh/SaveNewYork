// ============================================
// WEATHER SYSTEM
// ============================================

const WeatherType = {
    CLEAR: 'clear',
    // Zone 1 (City) weather
    RAIN: 'rain',
    WIND: 'wind',
    LIGHTNING: 'lightning',
    RAIN_WIND: 'rain_wind',
    RAIN_LIGHTNING: 'rain_lightning',
    // Zone 2 (Desert) weather
    SANDSTORM: 'sandstorm',
    SANDSTORM_LIGHTNING: 'sandstorm_lightning'
};

const WeatherManager = {
    currentWeather: WeatherType.CLEAR,
    intensity: 0,  // 0 to 1 for fade in/out
    targetIntensity: 0,

    windDirection: 1,  // 1 = right, -1 = left
    windStrength: 0,   // 0 to 100

    // Particle arrays
    rainParticles: [],
    mistParticles: [],
    sandParticles: [],  // Zone 2 sandstorm particles

    // Sand particle colors (warm tan/orange palette)
    sandColors: ['#d4a574', '#c4956a', '#e8c49a', '#b8956a', '#deb887'],

    // Splashes
    splashParticles: [],

    // Lightning state
    lightningTimer: 0,
    lightningActive: false,
    lightningBolts: [], // Array of bolts
    lightningFlash: 0,    // Screen flash alpha
    pendingDamage: null,  // {type: 'building'/'enemy', target, x, y}

    reset() {
        this.currentWeather = WeatherType.CLEAR;
        this.intensity = 0;
        this.targetIntensity = 0;
        this.windDirection = Math.random() < 0.5 ? -1 : 1;
        this.windStrength = 0;
        this.rainParticles = [];
        this.mistParticles = [];
        this.sandParticles = [];
        this.splashParticles = [];
        this.lightningTimer = 0;
        this.lightningActive = false;
        this.lightningBolts = [];
        this.lightningFlash = 0;
        this.pendingDamage = null;
    },

    // Start random weather (reduced frequency)
    startRandomWeather() {
        // Clear existing particles when weather changes
        this.rainParticles = [];
        this.mistParticles = [];
        this.sandParticles = [];

        // Get current zone and time of day
        const zone = (typeof game !== 'undefined' && game.currentZone) ? game.currentZone : 1;
        const timeOfDay = (typeof DayCycle !== 'undefined') ? DayCycle.currentTime : 'day';
        const isDay = (timeOfDay === 'day');

        // 55% chance for Clear (reduced weather frequency)
        if (Math.random() < 0.55) {
            this.currentWeather = WeatherType.CLEAR;
            this.targetIntensity = 0;
            return;
        }

        // During daytime, only allow dry lightning (no rain)
        if (isDay && zone === 1) {
            // 70% clear during day, 30% dry lightning
            if (Math.random() < 0.7) {
                this.currentWeather = WeatherType.CLEAR;
                this.targetIntensity = 0;
                return;
            }
            this.currentWeather = WeatherType.LIGHTNING;
            this.targetIntensity = 1;
            this.windStrength = 0;
            console.log(`Weather started: lightning (dry), zone: ${zone}`);
            return;
        }

        // Pick weighted random weather type based on zone
        const roll = Math.random() * 100;
        let weather;

        if (zone === 2) {
            // Zone 2 (Desert): Sandstorm and dry lightning only - NO RAIN
            if (roll < 50) {
                weather = WeatherType.SANDSTORM;
            } else if (roll < 80) {
                weather = WeatherType.SANDSTORM_LIGHTNING;
            } else {
                weather = WeatherType.LIGHTNING; // Dry lightning only
            }
        } else {
            // Zone 1 (City): Rain-based weather (only during dusk/night/dawn)
            if (roll < 40) {
                weather = WeatherType.RAIN;
            } else if (roll < 60) {
                weather = WeatherType.RAIN_WIND;
            } else if (roll < 80) {
                weather = WeatherType.RAIN_LIGHTNING;
            } else {
                weather = WeatherType.LIGHTNING; // Dry lightning
            }
        }

        this.currentWeather = weather;
        this.targetIntensity = 1;

        // Set wind only for wind-based weather types
        this.windDirection = Math.random() < 0.5 ? -1 : 1;
        if (weather === WeatherType.RAIN_WIND || weather === WeatherType.SANDSTORM || weather === WeatherType.SANDSTORM_LIGHTNING) {
            this.windStrength = 30 + Math.random() * 70;
        } else {
            this.windStrength = 0;
        }

        console.log(`Weather started: ${weather}, wind: ${this.windStrength}, direction: ${this.windDirection}, zone: ${zone}`);
    },

    fadeOut() {
        this.targetIntensity = 0;
    },

    hasRain() {
        return this.currentWeather.includes('rain');
    },

    hasSandstorm() {
        return this.currentWeather.includes('sandstorm');
    },

    hasWind() {
        // Wind only applies during explicit wind weather types
        return this.currentWeather.includes('wind') ||
               this.currentWeather.includes('sandstorm');
    },

    hasLightning() {
        return this.currentWeather.includes('lightning');
    },

    // Get wind effect for player movement (returns pixels per second drift)
    // Positive = push right, Negative = push left
    getWindEffect() {
        if (!this.hasWind() || this.intensity <= 0 || this.windStrength <= 0) return 0;
        return this.windDirection * this.windStrength * this.intensity * 0.5; // Scale down for playability
    },

    update(deltaTime) {
        // Smooth intensity transition
        const fadeSpeed = 0.5;
        if (this.intensity < this.targetIntensity) {
            this.intensity = Math.min(this.targetIntensity, this.intensity + fadeSpeed * deltaTime);
        } else if (this.intensity > this.targetIntensity) {
            this.intensity = Math.max(this.targetIntensity, this.intensity - fadeSpeed * deltaTime);
        }

        if (this.intensity <= 0 && this.targetIntensity <= 0) {
            this.currentWeather = WeatherType.CLEAR;
            return;
        }

        // Update particles
        this.updateRain(deltaTime);
        this.updateSand(deltaTime);
        this.updateMist(deltaTime);
        this.updateSplashes(deltaTime);
        this.updateLightning(deltaTime);
    },

    render(ctx) {
        if (this.intensity <= 0) return;

        // Render particles
        this.renderMist(ctx);
        this.renderRain(ctx);
        this.renderSand(ctx);
        this.renderSplashes(ctx);

        // Render lightning last so flash overlays everything
        this.renderLightning(ctx);
    },

    // ===========================================
    // RAIN SYSTEM
    // ===========================================

    initRainParticles() {
        this.rainParticles = [];
        // Layers: 0=close(fast), 1=mid, 2=far(slow)
        // Option 2: Reduced from 400 to 200 particles
        const density = 200;
        for (let i = 0; i < density; i++) {
            this.rainParticles.push({
                x: Math.random() * CONFIG.CANVAS_WIDTH * 1.5 - CONFIG.CANVAS_WIDTH * 0.25,
                y: Math.random() * CONFIG.STREET_Y,
                layer: Math.floor(Math.random() * 3),
                len: 0
            });
        }
    },

    updateRain(deltaTime) {
        if (!this.hasRain()) return;
        if (this.rainParticles.length === 0) this.initRainParticles();

        // Wind angle calculation
        const angle = Math.atan2(10, this.windStrength * this.windDirection * 0.1); // steep angle
        const fallSpeed = 800;

        this.rainParticles.forEach(p => {
            // Speed based on layer (0 is fastest/closest)
            const speed = fallSpeed * (1 - p.layer * 0.2);

            p.x += Math.cos(angle) * speed * deltaTime;
            p.y += Math.sin(angle) * speed * deltaTime;
            p.len = 20 + speed * 0.05; // Streaks based on speed

            // Reset
            if (p.y > CONFIG.STREET_Y) {
                // Splash!
                if (Math.random() > p.layer * 0.3) {
                    this.addSplash(p.x, CONFIG.STREET_Y);
                }
                p.y = -50;
                p.x = Math.random() * CONFIG.CANVAS_WIDTH * 1.5 - CONFIG.CANVAS_WIDTH * 0.25;
            }
        });
    },

    renderRain(ctx) {
        if (!this.hasRain()) return;

        const windX = Math.cos(Math.atan2(10, this.windStrength * this.windDirection * 0.1));
        const windY = Math.sin(Math.atan2(10, this.windStrength * this.windDirection * 0.1));

        this.rainParticles.forEach(p => {
            // Option 1: Reduced opacity - max 60% instead of 90%
            const alpha = (1 - p.layer * 0.2) * this.intensity * 0.7;

            // Option 4: Softer blue-grey color instead of bright white-blue
            ctx.strokeStyle = `rgba(160, 180, 200, ${Math.min(alpha, 0.6)})`;
            // Option 3: Thinner line width - 1px instead of 2px
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + windX * p.len, p.y + windY * p.len);
            ctx.stroke();
        });
    },

    // ===========================================
    // MIST SYSTEM
    // ===========================================

    updateMist(deltaTime) {
        // Add mist particles occasionally
        if (this.mistParticles.length < 20) {
            this.mistParticles.push({
                x: (this.windDirection > 0 ? -100 : CONFIG.CANVAS_WIDTH + 100),
                y: CONFIG.STREET_Y - 50 - Math.random() * 100,
                vx: this.windDirection * (10 + Math.random() * 20),
                size: 50 + Math.random() * 50,
                life: 1,
                alpha: Math.random() * 0.5
            });
        }

        this.mistParticles.forEach(p => {
            p.x += p.vx * deltaTime;
            p.life -= deltaTime * 0.1;
        });

        this.mistParticles = this.mistParticles.filter(p => p.life > 0 && p.x > -200 && p.x < CONFIG.CANVAS_WIDTH + 200);
    },

    renderMist(ctx) {
        this.mistParticles.forEach(p => {
            const alpha = p.alpha * this.intensity * Math.min(1, p.life);
            const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
            gradient.addColorStop(0, `rgba(200, 210, 220, ${alpha * 0.4})`);
            gradient.addColorStop(1, 'rgba(200, 210, 220, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    },

    // ===========================================
    // SPLASH SYSTEM
    // ===========================================

    addSplash(x, y) {
        if (this.splashParticles.length > 50) return; // Limit
        this.splashParticles.push({
            x: x,
            y: y,
            life: 0.2
        });
    },

    updateSplashes(deltaTime) {
        this.splashParticles.forEach(p => p.life -= deltaTime);
        this.splashParticles = this.splashParticles.filter(p => p.life > 0);
    },

    renderSplashes(ctx) {
        ctx.fillStyle = `rgba(200, 220, 255, ${this.intensity * 0.6})`;
        this.splashParticles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y - 2, 2, 0, Math.PI, true); // Semi circle up
            ctx.fill();
        });
    },

    // ===========================================
    // SANDSTORM SYSTEM (Zone 2)
    // ===========================================

    initSandParticles() {
        this.sandParticles = [];
        // 3 layers for parallax: 0=close(fast), 1=mid, 2=far(slow)
        // Subtle ambient effect - not too many particles
        const density = 150;
        for (let i = 0; i < density; i++) {
            this.sandParticles.push({
                x: Math.random() * CONFIG.CANVAS_WIDTH * 1.5,
                y: Math.random() * CONFIG.CANVAS_HEIGHT,
                layer: Math.floor(Math.random() * 3),
                size: 1 + Math.random() * 2,
                colorIndex: Math.floor(Math.random() * this.sandColors.length),
                // Slight vertical wobble for natural movement
                wobbleOffset: Math.random() * Math.PI * 2,
                wobbleSpeed: 2 + Math.random() * 2
            });
        }
    },

    updateSand(deltaTime) {
        if (!this.hasSandstorm()) return;
        if (this.sandParticles.length === 0) this.initSandParticles();

        // Horizontal movement based on wind direction and strength
        const baseSpeed = 200; // Base horizontal speed
        const settleSpeed = 15; // Slow downward drift (sand settling)

        this.sandParticles.forEach(p => {
            // Speed based on layer (0 is fastest/closest)
            const layerMod = 1 - p.layer * 0.25;
            const speed = baseSpeed * layerMod * (this.windStrength / 50);

            // Horizontal movement in wind direction
            p.x += this.windDirection * speed * deltaTime;

            // Slight vertical wobble + settling
            p.wobbleOffset += p.wobbleSpeed * deltaTime;
            const wobble = Math.sin(p.wobbleOffset) * 10 * deltaTime;
            p.y += settleSpeed * deltaTime + wobble;

            // Wrap around horizontally
            if (this.windDirection > 0) {
                if (p.x > CONFIG.CANVAS_WIDTH + 50) {
                    p.x = -50;
                    p.y = Math.random() * CONFIG.CANVAS_HEIGHT;
                }
            } else {
                if (p.x < -50) {
                    p.x = CONFIG.CANVAS_WIDTH + 50;
                    p.y = Math.random() * CONFIG.CANVAS_HEIGHT;
                }
            }

            // Reset if below screen
            if (p.y > CONFIG.CANVAS_HEIGHT + 20) {
                p.y = -20;
                p.x = Math.random() * CONFIG.CANVAS_WIDTH * 1.5;
            }
        });
    },

    renderSand(ctx) {
        if (!this.hasSandstorm()) return;

        this.sandParticles.forEach(p => {
            // Opacity based on layer (closer = more visible) and intensity
            const layerAlpha = (1 - p.layer * 0.2);
            const alpha = layerAlpha * this.intensity * 0.6;

            const color = this.sandColors[p.colorIndex];

            // Draw as small horizontal streaks to show wind direction
            ctx.strokeStyle = color;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = p.size * (1 - p.layer * 0.2);
            ctx.lineCap = 'round';

            // Streak length based on wind strength and layer
            const streakLength = (this.windStrength / 50) * (8 + p.layer * 4);

            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + this.windDirection * streakLength, p.y + 2);
            ctx.stroke();
        });

        ctx.globalAlpha = 1;
        ctx.lineCap = 'butt';
    },

    // ===========================================
    // LIGHTNING SYSTEM
    // ===========================================

    updateLightning(deltaTime) {
        if (!this.hasLightning() || this.intensity <= 0) return;

        // Flash decay
        if (this.lightningFlash > 0) this.lightningFlash -= deltaTime * 5;

        // Bolt decay
        this.lightningBolts = this.lightningBolts.filter(b => {
            b.life -= deltaTime;
            return b.life > 0;
        });

        // Trigger logic
        this.lightningTimer -= deltaTime;
        if (this.lightningTimer <= 0) {
            this.triggerLightning();
            this.lightningTimer = 2 + Math.random() * 4;
        }
    },

    triggerLightning() {
        const startX = Math.random() * CONFIG.CANVAS_WIDTH;
        const startY = CONFIG.SKY_TOP; // Start high
        const endY = CONFIG.STREET_Y;
        const endX = startX + (Math.random() - 0.5) * 300;

        const mainBolt = this.generateBolt(startX, startY, endX, endY, 6);
        this.lightningBolts.push({
            segments: mainBolt,
            life: 0.2, // Flash duration
            width: 3
        });

        // Add branches
        for (let i = 0; i < 3; i++) {
            // Pick a random point on main bolt to branch
            const node = mainBolt[Math.floor(Math.random() * (mainBolt.length - 1))];
            const branchEndX = node.x2 + (Math.random() - 0.5) * 200;
            const branchEndY = node.y2 + 100 + Math.random() * 100;
            const branch = this.generateBolt(node.x2, node.y2, branchEndX, branchEndY, 4);
            this.lightningBolts.push({
                segments: branch,
                life: 0.15,
                width: 1
            });
        }

        this.lightningFlash = 0.5; // Bright flash

        // Thunder
        if (typeof SoundManager !== 'undefined') SoundManager.thunder();

        // Damage (Simplified: just hit random enemy or building near x)
        this.checkLightningDamage(endX);
    },

    generateBolt(x1, y1, x2, y2, displace) {
        if (displace < 2) {
            return [{ x1, y1, x2, y2 }];
        }
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const normalX = -(y2 - y1);
        const normalY = (x2 - x1);
        const dist = Math.sqrt(normalX * normalX + normalY * normalY);

        // Offset normal
        const offset = (Math.random() - 0.5) * displace * 20; // jaggedness
        const discX = midX + (normalX / dist) * offset;
        const discY = midY + (normalY / dist) * offset;

        return [
            ...this.generateBolt(x1, y1, discX, discY, displace / 2),
            ...this.generateBolt(discX, discY, x2, y2, displace / 2)
        ];
    },

    checkLightningDamage(x) {
        // We'll let game.js check this if needed, or do it here
        // Current game implementation checks WeatherManager.getPendingLightningDamage()
        // Let's support that
        this.pendingDamage = {
            type: 'lightning_area',
            x: x,
            y: CONFIG.STREET_Y,
            radius: 100
        };
    },

    getPendingLightningDamage() {
        const d = this.pendingDamage;
        this.pendingDamage = null;
        return d;
    },

    renderLightning(ctx) {
        // Flash overlay
        if (this.lightningFlash > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.lightningFlash * 0.4})`;
            ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        }

        // Bolts
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 10;
        ctx.lineCap = 'round';

        this.lightningBolts.forEach(bolt => {
            ctx.lineWidth = bolt.width;
            ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(1, bolt.life * 10)})`;
            ctx.beginPath();
            bolt.segments.forEach(seg => {
                ctx.moveTo(seg.x1, seg.y1);
                ctx.lineTo(seg.x2, seg.y2);
            });
            ctx.stroke();
        });

        ctx.shadowBlur = 0;
        ctx.lineCap = 'butt';
    }
};
