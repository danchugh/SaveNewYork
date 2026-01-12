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

    // Lightning state (will be used in later tasks)
    lightningTimer: 0,
    lightningActive: false,

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
    },

    // Start random weather with 20% chance
    startRandomWeather() {
        // Clear existing particles when weather changes
        this.rainParticles = [];
        this.snowParticles = [];

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
        // this.updateLeaves(deltaTime);
        // this.updateLightning(deltaTime);
    },

    render(ctx) {
        if (this.intensity <= 0) return;

        // Render particles
        this.renderRain(ctx);
        this.renderSnow(ctx);
        // this.renderLeaves(ctx);
        // this.renderLightning(ctx);

        // For now, just show a subtle overlay to indicate weather is active
        if (this.hasRain() || this.hasLightning()) {
            ctx.fillStyle = `rgba(100, 100, 120, ${this.intensity * 0.1})`;
            ctx.fillRect(0, CONFIG.SKY_TOP, CONFIG.CANVAS_WIDTH, CONFIG.STREET_Y - CONFIG.SKY_TOP);
        }
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
    }
};
