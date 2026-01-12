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

        // Update particles (to be implemented in Tasks 6-7)
        // this.updateRain(deltaTime);
        // this.updateSnow(deltaTime);
        // this.updateLeaves(deltaTime);
        // this.updateLightning(deltaTime);
    },

    render(ctx) {
        if (this.intensity <= 0) return;

        // Render particles (to be implemented in Tasks 6-8)
        // this.renderRain(ctx);
        // this.renderSnow(ctx);
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
    }
};
