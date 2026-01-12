// ============================================
// WEATHER SYSTEM
// ============================================

const WeatherType = {
    CLEAR: 'clear',
    RAIN: 'rain',
    SNOW: 'snow',
    WIND: 'wind',
    LIGHTNING: 'lightning',
    RAIN_WIND: 'rain_wind',
    SNOW_WIND: 'snow_wind',
    RAIN_LIGHTNING: 'rain_lightning'
};

const WeatherManager = {
    currentWeather: WeatherType.CLEAR,
    intensity: 0,  // 0 to 1 for fade in/out
    targetIntensity: 0,

    windDirection: 1,  // 1 = right, -1 = left
    windStrength: 0,   // 0 to 100

    // Particle arrays (will be used in later tasks)
    rainParticles: [],
    snowParticles: [],
    leafParticles: [],

    // Lightning state
    lightningTimer: 0,
    lightningActive: false,
    lightningBolt: null,  // {x1, y1, x2, y2, segments: []}
    lightningFlash: 0,    // Screen flash alpha
    pendingDamage: null,  // {type: 'building'/'enemy', target, x, y}

    reset() {
        this.currentWeather = WeatherType.CLEAR;
        this.intensity = 0;
        this.targetIntensity = 0;
        this.windDirection = Math.random() < 0.5 ? -1 : 1;
        this.windStrength = 0;
        this.rainParticles = [];
        this.snowParticles = [];
        this.leafParticles = [];
        this.lightningTimer = 0;
        this.lightningActive = false;
        this.lightningBolt = null;
        this.lightningFlash = 0;
        this.pendingDamage = null;
    },

    // Start random weather with 20% chance
    startRandomWeather() {
        // Clear existing particles when weather changes
        this.rainParticles = [];
        this.snowParticles = [];
        this.leafParticles = [];

        // 20% chance for weather
        if (Math.random() > 0.2) {
            this.currentWeather = WeatherType.CLEAR;
            this.targetIntensity = 0;
            return;
        }

        // Pick weighted random weather type
        const roll = Math.random() * 100;
        let weather;

        if (roll < 25) {
            weather = WeatherType.RAIN;
        } else if (roll < 45) {
            weather = WeatherType.SNOW;
        } else if (roll < 60) {
            weather = WeatherType.WIND;
        } else if (roll < 70) {
            weather = WeatherType.LIGHTNING;
        } else if (roll < 85) {
            weather = WeatherType.RAIN_WIND;
        } else if (roll < 95) {
            weather = WeatherType.SNOW_WIND;
        } else {
            weather = WeatherType.RAIN_LIGHTNING;
        }

        this.currentWeather = weather;
        this.targetIntensity = 1;

        // Set wind if applicable
        if (this.hasWind()) {
            this.windDirection = Math.random() < 0.5 ? -1 : 1;
            this.windStrength = 40 + Math.random() * 60;  // 40-100
        } else {
            this.windStrength = 0;
        }

        console.log(`Weather started: ${weather}, wind: ${this.windStrength}`);
    },

    // Start fade out
    fadeOut() {
        this.targetIntensity = 0;
    },

    // Check if current weather has rain
    hasRain() {
        return this.currentWeather === WeatherType.RAIN ||
               this.currentWeather === WeatherType.RAIN_WIND ||
               this.currentWeather === WeatherType.RAIN_LIGHTNING;
    },

    // Check if current weather has snow
    hasSnow() {
        return this.currentWeather === WeatherType.SNOW ||
               this.currentWeather === WeatherType.SNOW_WIND;
    },

    // Check if current weather has wind
    hasWind() {
        return this.currentWeather === WeatherType.WIND ||
               this.currentWeather === WeatherType.RAIN_WIND ||
               this.currentWeather === WeatherType.SNOW_WIND;
    },

    // Check if current weather has lightning
    hasLightning() {
        return this.currentWeather === WeatherType.LIGHTNING ||
               this.currentWeather === WeatherType.RAIN_LIGHTNING;
    },

    update(deltaTime) {
        // Smooth intensity transition
        const fadeSpeed = 0.5;  // Takes 2 seconds to fully fade
        if (this.intensity < this.targetIntensity) {
            this.intensity = Math.min(this.targetIntensity, this.intensity + fadeSpeed * deltaTime);
        } else if (this.intensity > this.targetIntensity) {
            this.intensity = Math.max(this.targetIntensity, this.intensity - fadeSpeed * deltaTime);
        }

        // Clear weather when fully faded out
        if (this.intensity <= 0 && this.targetIntensity <= 0) {
            this.currentWeather = WeatherType.CLEAR;
        }

        // Update particles
        this.updateRain(deltaTime);
        this.updateSnow(deltaTime);
        this.updateLeaves(deltaTime);
        this.updateLightning(deltaTime);
    },

    render(ctx) {
        if (this.intensity <= 0) return;

        // Render particles
        this.renderRain(ctx);
        this.renderSnow(ctx);
        this.renderLeaves(ctx);

        // For now, just show a subtle overlay to indicate weather is active
        if (this.hasRain() || this.hasLightning()) {
            ctx.fillStyle = `rgba(100, 100, 120, ${this.intensity * 0.1})`;
            ctx.fillRect(0, CONFIG.SKY_TOP, CONFIG.CANVAS_WIDTH, CONFIG.STREET_Y - CONFIG.SKY_TOP);
        }

        // Render lightning last so flash overlays everything
        this.renderLightning(ctx);
    },

    // Get display name for HUD (optional)
    getDisplayName() {
        if (this.currentWeather === WeatherType.CLEAR) return '';
        return this.currentWeather.replace('_', ' + ').toUpperCase();
    },

    // Initialize rain particles
    initRainParticles() {
        this.rainParticles = [];
        for (let i = 0; i < 150; i++) {
            this.rainParticles.push({
                x: Math.random() * CONFIG.CANVAS_WIDTH,
                y: CONFIG.SKY_TOP + Math.random() * (CONFIG.STREET_Y - CONFIG.SKY_TOP),
                speed: 300 + Math.random() * 200,  // 300-500 px/s
                length: 10 + Math.random() * 10     // 10-20 px
            });
        }
    },

    // Initialize snow particles
    initSnowParticles() {
        this.snowParticles = [];
        for (let i = 0; i < 80; i++) {
            this.snowParticles.push({
                x: Math.random() * CONFIG.CANVAS_WIDTH,
                y: CONFIG.SKY_TOP + Math.random() * (CONFIG.STREET_Y - CONFIG.SKY_TOP),
                speed: 50 + Math.random() * 50,    // 50-100 px/s
                size: 2 + Math.random() * 2,        // 2-4 px
                wobblePhase: Math.random() * Math.PI * 2,
                wobbleSpeed: 2 + Math.random() * 2
            });
        }
    },

    // Update rain particles
    updateRain(deltaTime) {
        if (!this.hasRain()) return;

        // Initialize if needed
        if (this.rainParticles.length === 0) {
            this.initRainParticles();
        }

        const windEffect = this.windStrength * this.windDirection * 0.5;

        this.rainParticles.forEach(p => {
            p.y += p.speed * deltaTime;
            p.x += windEffect * deltaTime;

            // Reset when off screen
            if (p.y > CONFIG.STREET_Y) {
                p.y = CONFIG.SKY_TOP;
                p.x = Math.random() * CONFIG.CANVAS_WIDTH;
            }
            // Wrap horizontally
            if (p.x > CONFIG.CANVAS_WIDTH) p.x = 0;
            if (p.x < 0) p.x = CONFIG.CANVAS_WIDTH;
        });
    },

    // Update snow particles
    updateSnow(deltaTime) {
        if (!this.hasSnow()) return;

        // Initialize if needed
        if (this.snowParticles.length === 0) {
            this.initSnowParticles();
        }

        const windEffect = this.windStrength * this.windDirection * 0.3;

        this.snowParticles.forEach(p => {
            p.wobblePhase += p.wobbleSpeed * deltaTime;

            // Vertical fall + wobble
            p.y += p.speed * deltaTime;
            // Horizontal drift + wind + wobble
            p.x += (Math.sin(p.wobblePhase) * 20 + windEffect) * deltaTime;

            // Reset when off screen
            if (p.y > CONFIG.STREET_Y) {
                p.y = CONFIG.SKY_TOP;
                p.x = Math.random() * CONFIG.CANVAS_WIDTH;
            }
            // Wrap horizontally
            if (p.x > CONFIG.CANVAS_WIDTH) p.x = 0;
            if (p.x < 0) p.x = CONFIG.CANVAS_WIDTH;
        });
    },

    // Render rain
    renderRain(ctx) {
        if (!this.hasRain() || this.intensity <= 0) return;

        ctx.strokeStyle = `rgba(200, 200, 255, ${this.intensity * 0.6})`;
        ctx.lineWidth = 1;

        // Calculate angle based on wind
        const angle = Math.atan2(1, this.windDirection * this.windStrength * 0.01);

        this.rainParticles.forEach(p => {
            const endX = p.x + Math.cos(angle + Math.PI/2) * p.length * 0.3;
            const endY = p.y + Math.sin(angle + Math.PI/2) * p.length;

            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        });
    },

    // Render snow
    renderSnow(ctx) {
        if (!this.hasSnow() || this.intensity <= 0) return;

        ctx.fillStyle = `rgba(255, 255, 255, ${this.intensity * 0.8})`;

        this.snowParticles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
    },

    // Initialize leaf particles
    initLeafParticles() {
        this.leafParticles = [];
        for (let i = 0; i < 30; i++) {
            this.leafParticles.push({
                x: Math.random() * CONFIG.CANVAS_WIDTH,
                y: CONFIG.SKY_TOP + Math.random() * (CONFIG.STREET_Y - CONFIG.SKY_TOP),
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 10,
                size: 4 + Math.random() * 4,
                speedMultiplier: 0.8 + Math.random() * 0.4
            });
        }
    },

    // Update leaf particles
    updateLeaves(deltaTime) {
        if (!this.hasWind() || this.intensity <= 0) return;

        // Initialize if needed
        if (this.leafParticles.length === 0) {
            this.initLeafParticles();
        }

        const windSpeed = this.windStrength * this.windDirection * this.intensity;

        this.leafParticles.forEach(p => {
            // Horizontal movement with wind
            p.x += windSpeed * p.speedMultiplier * deltaTime;

            // Slight vertical drift
            p.y += Math.sin(p.rotation) * 20 * deltaTime;

            // Tumble rotation
            p.rotation += p.rotationSpeed * deltaTime;

            // Reset when off screen (based on wind direction)
            if (this.windDirection > 0 && p.x > CONFIG.CANVAS_WIDTH + 20) {
                p.x = -20;
                p.y = CONFIG.SKY_TOP + Math.random() * (CONFIG.STREET_Y - CONFIG.SKY_TOP);
            } else if (this.windDirection < 0 && p.x < -20) {
                p.x = CONFIG.CANVAS_WIDTH + 20;
                p.y = CONFIG.SKY_TOP + Math.random() * (CONFIG.STREET_Y - CONFIG.SKY_TOP);
            }

            // Keep in vertical bounds
            if (p.y < CONFIG.SKY_TOP) p.y = CONFIG.SKY_TOP;
            if (p.y > CONFIG.STREET_Y) p.y = CONFIG.STREET_Y - 20;
        });
    },

    // Render leaves
    renderLeaves(ctx) {
        if (!this.hasWind() || this.intensity <= 0) return;

        this.leafParticles.forEach(p => {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);

            // Draw leaf shape (simple oval)
            ctx.fillStyle = `rgba(120, 180, 80, ${this.intensity * 0.8})`;
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Leaf vein
            ctx.strokeStyle = `rgba(80, 120, 50, ${this.intensity * 0.6})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(-p.size, 0);
            ctx.lineTo(p.size, 0);
            ctx.stroke();

            ctx.restore();
        });
    },

    // Get wind effect for player (called by player.js)
    getWindEffect() {
        if (!this.hasWind() || this.intensity <= 0) {
            return 0;
        }
        return this.windDirection * this.windStrength * this.intensity * 0.3;
    },

    // Update lightning
    updateLightning(deltaTime) {
        if (!this.hasLightning() || this.intensity <= 0) return;

        // Decrease flash
        if (this.lightningFlash > 0) {
            this.lightningFlash -= deltaTime * 5;
        }

        // Clear bolt after display time
        if (this.lightningBolt && this.lightningBolt.displayTime !== undefined) {
            this.lightningBolt.displayTime -= deltaTime;
            if (this.lightningBolt.displayTime <= 0) {
                this.lightningBolt = null;
            }
        }

        // Timer for next strike
        this.lightningTimer -= deltaTime;
        if (this.lightningTimer <= 0) {
            this.triggerLightning();
            this.lightningTimer = 3 + Math.random() * 5;  // 3-8 seconds
        }
    },

    // Trigger a lightning strike
    triggerLightning() {
        // 70% chance to hit building, 30% sky only
        const hitBuilding = Math.random() < 0.7;

        let targetX, targetY;
        let targetBuilding = null;

        if (hitBuilding && typeof buildingManager !== 'undefined') {
            // Weight buildings by height (taller = more likely)
            const buildings = buildingManager.buildings.filter(b => b.getBlockCount() > 0);
            if (buildings.length > 0) {
                // Calculate weights based on height
                let totalWeight = 0;
                const weights = buildings.map(b => {
                    const weight = b.heightBlocks * b.heightBlocks;  // Square for more emphasis
                    totalWeight += weight;
                    return weight;
                });

                // Pick weighted random building
                let roll = Math.random() * totalWeight;
                for (let i = 0; i < buildings.length; i++) {
                    roll -= weights[i];
                    if (roll <= 0) {
                        targetBuilding = buildings[i];
                        break;
                    }
                }

                if (targetBuilding) {
                    // Find highest block
                    for (let row = 0; row < targetBuilding.heightBlocks; row++) {
                        for (let col = 0; col < targetBuilding.widthBlocks; col++) {
                            if (targetBuilding.blocks[row][col]) {
                                const pos = targetBuilding.getBlockWorldPosition(row, col);
                                targetX = pos.x + pos.width / 2;
                                targetY = pos.y;
                                break;
                            }
                        }
                        if (targetX !== undefined) break;
                    }
                }
            }
        }

        // Default to sky if no building target
        if (targetX === undefined) {
            targetX = 100 + Math.random() * (CONFIG.CANVAS_WIDTH - 200);
            targetY = CONFIG.SKY_TOP + 100 + Math.random() * 200;
        }

        // Generate bolt segments
        const startX = targetX + (Math.random() - 0.5) * 100;
        const startY = CONFIG.SKY_TOP;
        const segments = this.generateBoltSegments(startX, startY, targetX, targetY);

        this.lightningBolt = {
            x1: startX,
            y1: startY,
            x2: targetX,
            y2: targetY,
            segments: segments,
            displayTime: 0.2
        };

        this.lightningFlash = 1;

        // Store pending damage for game.js to process
        if (targetBuilding) {
            this.pendingDamage = {
                type: 'building',
                building: targetBuilding,
                x: targetX,
                y: targetY,
                blocks: 3 + Math.floor(Math.random() * 3)  // 3-5 blocks
            };
        }

        // Play thunder (delayed)
        setTimeout(() => {
            if (typeof SoundManager !== 'undefined') {
                SoundManager.thunder();
            }
        }, 300);
    },

    // Generate jagged bolt segments
    generateBoltSegments(x1, y1, x2, y2) {
        const segments = [];
        const steps = 8;
        let prevX = x1, prevY = y1;

        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            let x = x1 + (x2 - x1) * t;
            let y = y1 + (y2 - y1) * t;

            // Add randomness except for last segment
            if (i < steps) {
                x += (Math.random() - 0.5) * 60;
                y += (Math.random() - 0.5) * 20;
            }

            segments.push({x1: prevX, y1: prevY, x2: x, y2: y});
            prevX = x;
            prevY = y;
        }

        return segments;
    },

    // Render lightning
    renderLightning(ctx) {
        // Screen flash
        if (this.lightningFlash > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${this.lightningFlash * 0.3})`;
            ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        }

        // Bolt
        if (this.lightningBolt && this.lightningBolt.segments) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#88f';
            ctx.shadowBlur = 10;

            this.lightningBolt.segments.forEach(seg => {
                ctx.beginPath();
                ctx.moveTo(seg.x1, seg.y1);
                ctx.lineTo(seg.x2, seg.y2);
                ctx.stroke();
            });

            // Thinner bright core
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#aaf';
            this.lightningBolt.segments.forEach(seg => {
                ctx.beginPath();
                ctx.moveTo(seg.x1, seg.y1);
                ctx.lineTo(seg.x2, seg.y2);
                ctx.stroke();
            });

            ctx.shadowBlur = 0;
        }
    },

    // Get and clear pending damage (called by game.js)
    getPendingLightningDamage() {
        const damage = this.pendingDamage;
        this.pendingDamage = null;
        return damage;
    }
};
