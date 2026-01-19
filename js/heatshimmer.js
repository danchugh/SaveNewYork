// Heat Shimmer Effect - Zone 2 Day Cycle Only
const HeatShimmer = {
    active: false,
    timer: 0,
    interval: 35, // 30-45 seconds between shimmers
    duration: 8,
    intensity: 0,

    reset() {
        this.active = false;
        this.timer = 0;
        this.interval = 30 + Math.random() * 15;
    },

    update(deltaTime) {
        // Only active during day in Zone 2
        if (typeof game === 'undefined' || game.currentZone !== 2) {
            this.active = false;
            return;
        }

        // Check if it's day cycle (if DayCycle exists)
        if (typeof DayCycle !== 'undefined' && DayCycle.currentPeriod !== 'day') {
            this.active = false;
            return;
        }

        this.timer += deltaTime;

        if (!this.active && this.timer >= this.interval) {
            this.active = true;
            this.timer = 0;
            this.intensity = 0;
        }

        if (this.active) {
            // Fade in/out
            if (this.timer < 1) {
                this.intensity = this.timer; // Fade in
            } else if (this.timer > this.duration - 1) {
                this.intensity = this.duration - this.timer; // Fade out
            } else {
                this.intensity = 1;
            }

            if (this.timer >= this.duration) {
                this.active = false;
                this.timer = 0;
                this.interval = 30 + Math.random() * 15;
            }
        }
    },

    render(ctx, canvas) {
        if (!this.active || this.intensity <= 0) return;

        // Create wavy distortion effect
        const time = Date.now() / 1000;
        const waveStrength = 2 * this.intensity;

        ctx.save();

        // Subtle horizontal wave distortion
        // Draw slightly offset horizontal slices
        for (let y = 0; y < CONFIG.CANVAS_HEIGHT; y += 4) {
            const offset = Math.sin(time * 3 + y * 0.02) * waveStrength;

            // Only apply distortion to middle of screen (not HUD areas)
            if (y > 40 && y < CONFIG.CANVAS_HEIGHT - 40) {
                ctx.drawImage(
                    canvas,
                    0, y, CONFIG.CANVAS_WIDTH, 4,
                    offset, y, CONFIG.CANVAS_WIDTH, 4
                );
            }
        }

        // Add slight color tint for heat effect
        ctx.globalAlpha = 0.05 * this.intensity;
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(0, 40, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT - 80);

        ctx.restore();
    }
};
