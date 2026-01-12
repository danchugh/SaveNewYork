// ============================================
// DAY/NIGHT CYCLE SYSTEM
// ============================================

const TimeOfDay = {
    DAWN: 'dawn',
    DAY: 'day',
    DUSK: 'dusk',
    NIGHT: 'night'
};

const DayCycle = {
    currentTime: TimeOfDay.DAY,
    cycleOrder: [TimeOfDay.DAY, TimeOfDay.DUSK, TimeOfDay.NIGHT, TimeOfDay.DAWN],
    cycleIndex: 0,

    // Transition system
    transitionProgress: 1,  // 0 to 1, starts complete
    transitionDuration: 3,  // seconds
    previousTime: null,

    // Stars (generated once)
    stars: [],

    // Clouds
    clouds: [],

    // Fireflies (dusk only)
    fireflies: [],

    // Celestial position
    sunMoonPhase: 0.5,  // 0 to 1, position in sky arc

    /**
     * Initialize celestial objects (stars, clouds, fireflies)
     */
    init() {
        // Generate 100 stars
        this.stars = [];
        for (let i = 0; i < 100; i++) {
            this.stars.push({
                x: Math.random() * CONFIG.CANVAS_WIDTH,
                y: CONFIG.SKY_TOP + Math.random() * 200,
                size: 1 + Math.random() * 2,
                twinklePhase: Math.random() * Math.PI * 2,
                twinkleSpeed: 2 + Math.random() * 3
            });
        }

        // Generate 5-8 clouds
        this.clouds = [];
        for (let i = 0; i < 6; i++) {
            this.clouds.push({
                x: Math.random() * CONFIG.CANVAS_WIDTH,
                y: CONFIG.SKY_TOP + 50 + Math.random() * 100,
                width: 80 + Math.random() * 120,
                height: 30 + Math.random() * 30,
                speed: 5 + Math.random() * 10
            });
        }

        // Generate fireflies (for dusk)
        this.fireflies = [];
        for (let i = 0; i < 30; i++) {
            this.fireflies.push({
                x: 100 + Math.random() * 760,
                y: 300 + Math.random() * 280,
                vx: (Math.random() - 0.5) * 20,
                vy: (Math.random() - 0.5) * 20,
                glowPhase: Math.random() * Math.PI * 2
            });
        }

        // Set initial sun position
        this.sunMoonPhase = 0.5;
        this.transitionProgress = 1;
        this.previousTime = null;
    },

    /**
     * Get the score multiplier for the current time of day
     * @returns {number} Score multiplier (1.0 to 1.5)
     */
    getScoreMultiplier() {
        switch (this.currentTime) {
            case TimeOfDay.NIGHT:
                return 1.5;
            case TimeOfDay.DUSK:
            case TimeOfDay.DAWN:
                return 1.25;
            case TimeOfDay.DAY:
            default:
                return 1.0;
        }
    },

    /**
     * Get the display name for the current time of day
     * @returns {string} Display name (e.g., "DAY", "NIGHT")
     */
    getDisplayName() {
        return this.currentTime.toUpperCase();
    },

    /**
     * Advance to the next time of day in the cycle
     */
    advance() {
        this.previousTime = this.currentTime;
        this.cycleIndex = (this.cycleIndex + 1) % this.cycleOrder.length;
        this.currentTime = this.cycleOrder[this.cycleIndex];
        this.transitionProgress = 0;  // Start transition
        console.log(`Time of day changing to: ${this.getDisplayName()}`);
    },

    /**
     * Reset the cycle to DAY
     */
    reset() {
        this.cycleIndex = 0;
        this.currentTime = TimeOfDay.DAY;
        this.transitionProgress = 1;
        this.previousTime = null;
        this.sunMoonPhase = 0.5;
    },

    /**
     * Get the sky color for the current time of day
     * @returns {string} Hex color code
     */
    getSkyColor() {
        switch (this.currentTime) {
            case TimeOfDay.NIGHT:
                return CONFIG.COLORS.SKY_NIGHT;
            case TimeOfDay.DUSK:
                return CONFIG.COLORS.SKY_DUSK;
            case TimeOfDay.DAWN:
                return CONFIG.COLORS.SKY_DAWN;
            case TimeOfDay.DAY:
            default:
                return CONFIG.COLORS.SKY;
        }
    },

    /**
     * Get the building light color for the current time of day
     * @returns {string} Hex color code
     */
    getBuildingLightColor() {
        switch (this.currentTime) {
            case TimeOfDay.NIGHT:
                return CONFIG.COLORS.BUILDING_LIGHT_NIGHT;
            case TimeOfDay.DUSK:
                return CONFIG.COLORS.BUILDING_LIGHT_DUSK;
            case TimeOfDay.DAWN:
                return CONFIG.COLORS.BUILDING_LIGHT_DAWN;
            case TimeOfDay.DAY:
            default:
                return CONFIG.COLORS.BUILDING_LIGHT;
        }
    },

    /**
     * Get the building dark color for the current time of day
     * @returns {string} Hex color code
     */
    getBuildingDarkColor() {
        switch (this.currentTime) {
            case TimeOfDay.NIGHT:
                return CONFIG.COLORS.BUILDING_DARK_NIGHT;
            case TimeOfDay.DUSK:
                return CONFIG.COLORS.BUILDING_DARK_DUSK;
            case TimeOfDay.DAWN:
                return CONFIG.COLORS.BUILDING_DARK_DAWN;
            case TimeOfDay.DAY:
            default:
                return CONFIG.COLORS.BUILDING_DARK;
        }
    },

    /**
     * Get the window color for the current time of day
     * @returns {string} Hex color code
     */
    getWindowColor() {
        switch (this.currentTime) {
            case TimeOfDay.NIGHT:
                return CONFIG.COLORS.BUILDING_WINDOW_NIGHT;
            case TimeOfDay.DAY:
            case TimeOfDay.DUSK:
            case TimeOfDay.DAWN:
            default:
                return CONFIG.COLORS.BUILDING_WINDOW;
        }
    },

    /**
     * Get the street color for the current time of day
     * @returns {string} Hex color code
     */
    getStreetColor() {
        switch (this.currentTime) {
            case TimeOfDay.NIGHT:
                return CONFIG.COLORS.STREET_NIGHT;
            case TimeOfDay.DAY:
            case TimeOfDay.DUSK:
            case TimeOfDay.DAWN:
            default:
                return CONFIG.COLORS.STREET;
        }
    },

    /**
     * Get the darkness overlay alpha for the current time of day
     * @returns {number} Alpha value (0 to 0.3)
     */
    getDarknessAlpha() {
        switch (this.currentTime) {
            case TimeOfDay.NIGHT:
                return 0.3;
            case TimeOfDay.DUSK:
                return 0.15;
            case TimeOfDay.DAWN:
                return 0.1;
            case TimeOfDay.DAY:
            default:
                return 0;
        }
    },

    /**
     * Update method for transitions and animations
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        // Progress transition
        if (this.transitionProgress < 1) {
            this.transitionProgress += deltaTime / this.transitionDuration;
            if (this.transitionProgress > 1) this.transitionProgress = 1;
        }

        // Update sun/moon position based on current time
        // DAY: sun at top (0.5), DUSK: sun setting (0.85), NIGHT: moon (0.5), DAWN: sun rising (0.15)
        const targetPhase = {
            [TimeOfDay.DAY]: 0.5,
            [TimeOfDay.DUSK]: 0.85,
            [TimeOfDay.NIGHT]: 0.5,
            [TimeOfDay.DAWN]: 0.15
        };
        this.sunMoonPhase += (targetPhase[this.currentTime] - this.sunMoonPhase) * deltaTime * 0.5;

        // Update clouds
        this.clouds.forEach(cloud => {
            cloud.x += cloud.speed * deltaTime;
            if (cloud.x > CONFIG.CANVAS_WIDTH + cloud.width) {
                cloud.x = -cloud.width;
            }
        });

        // Update fireflies (only during dusk)
        if (this.currentTime === TimeOfDay.DUSK) {
            this.fireflies.forEach(ff => {
                // Random wandering
                ff.vx += (Math.random() - 0.5) * 40 * deltaTime;
                ff.vy += (Math.random() - 0.5) * 40 * deltaTime;
                // Damping
                ff.vx *= 0.98;
                ff.vy *= 0.98;
                // Clamp velocity
                ff.vx = Math.max(-30, Math.min(30, ff.vx));
                ff.vy = Math.max(-30, Math.min(30, ff.vy));

                ff.x += ff.vx * deltaTime;
                ff.y += ff.vy * deltaTime;

                // Bounds
                if (ff.x < 100) ff.vx = Math.abs(ff.vx);
                if (ff.x > 860) ff.vx = -Math.abs(ff.vx);
                if (ff.y < 300) ff.vy = Math.abs(ff.vy);
                if (ff.y > 580) ff.vy = -Math.abs(ff.vy);

                ff.glowPhase += deltaTime * 5;
            });
        }
    },

    /**
     * Render celestial bodies (stars, sun/moon, clouds, fireflies)
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    render(ctx) {
        this.renderStars(ctx);
        this.renderSunMoon(ctx);
        this.renderClouds(ctx);
        this.renderFireflies(ctx);
    },

    /**
     * Render twinkling stars (visible at night, fading at dusk/dawn)
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    renderStars(ctx) {
        // Stars visible at night, fading at dusk/dawn
        let starAlpha = 0;
        if (this.currentTime === TimeOfDay.NIGHT) starAlpha = 1;
        else if (this.currentTime === TimeOfDay.DUSK) starAlpha = this.transitionProgress * 0.5;
        else if (this.currentTime === TimeOfDay.DAWN) starAlpha = (1 - this.transitionProgress) * 0.5;

        if (starAlpha <= 0) return;

        this.stars.forEach(star => {
            const twinkle = 0.5 + 0.5 * Math.sin(Date.now() / 1000 * star.twinkleSpeed + star.twinklePhase);
            ctx.fillStyle = `rgba(255, 255, 255, ${starAlpha * twinkle})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        });
    },

    /**
     * Render sun or moon depending on time of day
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    renderSunMoon(ctx) {
        const skyHeight = CONFIG.STREET_Y - CONFIG.SKY_TOP - 100;
        const arcY = CONFIG.SKY_TOP + 60;

        // Calculate position along arc
        const x = CONFIG.CANVAS_WIDTH * this.sunMoonPhase;
        const y = arcY + skyHeight * 0.3 * Math.sin(this.sunMoonPhase * Math.PI);

        if (this.currentTime === TimeOfDay.NIGHT) {
            // Moon
            ctx.fillStyle = '#f0f0f0';
            ctx.beginPath();
            ctx.arc(x, y, 25, 0, Math.PI * 2);
            ctx.fill();

            // Craters
            ctx.fillStyle = '#d0d0d0';
            ctx.beginPath();
            ctx.arc(x - 8, y - 5, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + 5, y + 8, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + 10, y - 8, 3, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Sun
            // Glow
            const gradient = ctx.createRadialGradient(x, y, 15, x, y, 60);
            gradient.addColorStop(0, 'rgba(255, 200, 50, 0.6)');
            gradient.addColorStop(1, 'rgba(255, 200, 50, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, 60, 0, Math.PI * 2);
            ctx.fill();

            // Sun body
            ctx.fillStyle = this.currentTime === TimeOfDay.DUSK ? '#ff6b35' : '#ffd700';
            ctx.beginPath();
            ctx.arc(x, y, 20, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    /**
     * Render drifting clouds (visible during day, dusk, dawn)
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    renderClouds(ctx) {
        // Clouds visible during day, dusk, dawn (not night)
        if (this.currentTime === TimeOfDay.NIGHT) return;

        const cloudColor = {
            [TimeOfDay.DAY]: 'rgba(255, 255, 255, 0.7)',
            [TimeOfDay.DUSK]: 'rgba(255, 150, 100, 0.6)',
            [TimeOfDay.DAWN]: 'rgba(255, 200, 220, 0.6)'
        };

        ctx.fillStyle = cloudColor[this.currentTime] || 'rgba(255, 255, 255, 0.7)';

        this.clouds.forEach(cloud => {
            // Draw cloud as overlapping ellipses
            ctx.beginPath();
            ctx.ellipse(cloud.x, cloud.y, cloud.width * 0.3, cloud.height * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cloud.x + cloud.width * 0.25, cloud.y - 5, cloud.width * 0.35, cloud.height * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(cloud.x + cloud.width * 0.5, cloud.y, cloud.width * 0.3, cloud.height * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
        });
    },

    /**
     * Render glowing fireflies (only during dusk)
     * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
     */
    renderFireflies(ctx) {
        // Only during dusk
        if (this.currentTime !== TimeOfDay.DUSK) return;

        this.fireflies.forEach(ff => {
            const glow = 0.3 + 0.7 * Math.abs(Math.sin(ff.glowPhase));

            // Glow effect
            const gradient = ctx.createRadialGradient(ff.x, ff.y, 0, ff.x, ff.y, 8);
            gradient.addColorStop(0, `rgba(200, 255, 100, ${glow})`);
            gradient.addColorStop(1, 'rgba(200, 255, 100, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(ff.x, ff.y, 8, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.fillStyle = `rgba(255, 255, 200, ${glow})`;
            ctx.beginPath();
            ctx.arc(ff.x, ff.y, 2, 0, Math.PI * 2);
            ctx.fill();
        });
    },

    /**
     * Interpolate between two hex colors
     * @param {string} color1 - Starting hex color
     * @param {string} color2 - Ending hex color
     * @param {number} t - Interpolation factor (0 to 1)
     * @returns {string} Interpolated color as rgb string
     */
    lerpColor(color1, color2, t) {
        // Parse hex colors
        const c1 = parseInt(color1.slice(1), 16);
        const c2 = parseInt(color2.slice(1), 16);

        const r1 = (c1 >> 16) & 255, g1 = (c1 >> 8) & 255, b1 = c1 & 255;
        const r2 = (c2 >> 16) & 255, g2 = (c2 >> 8) & 255, b2 = c2 & 255;

        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);

        return `rgb(${r}, ${g}, ${b})`;
    },

    /**
     * Get sky color with smooth transition between phases
     * @returns {string} Sky color (hex or rgb)
     */
    getSkyColorSmooth() {
        if (this.transitionProgress >= 1 || !this.previousTime) {
            return this.getSkyColor();
        }
        const prevColor = this.getColorForTime(this.previousTime, 'sky');
        const nextColor = this.getColorForTime(this.currentTime, 'sky');
        return this.lerpColor(prevColor, nextColor, this.transitionProgress);
    },

    /**
     * Get color for a specific time of day and color type
     * @param {string} time - Time of day
     * @param {string} type - Color type (sky, etc.)
     * @returns {string} Hex color code
     */
    getColorForTime(time, type) {
        const colors = {
            sky: {
                [TimeOfDay.DAY]: CONFIG.COLORS.SKY,
                [TimeOfDay.DUSK]: CONFIG.COLORS.SKY_DUSK,
                [TimeOfDay.NIGHT]: CONFIG.COLORS.SKY_NIGHT,
                [TimeOfDay.DAWN]: CONFIG.COLORS.SKY_DAWN
            }
        };
        return colors[type]?.[time] || colors[type]?.[TimeOfDay.DAY];
    }
};
