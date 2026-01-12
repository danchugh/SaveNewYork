// ============================================
// PARALLAX BACKGROUND SYSTEM
// ============================================

// BackgroundManager - Parallax background with scenery
const BackgroundManager = {
    // Animation phase for subtle movement
    time: 0,

    // Foreshadow animation state
    foreshadowX: 480,
    foreshadowDirection: 1,
    foreshadowY: 0,

    // Mountain definitions [x, baseY, width, height, isVolcano]
    mountains: [
        { x: 50, width: 200, height: 180, isVolcano: false },
        { x: 200, width: 280, height: 250, isVolcano: true },  // Volcano!
        { x: 450, width: 220, height: 200, isVolcano: false },
        { x: 650, width: 260, height: 220, isVolcano: false },
        { x: 850, width: 180, height: 160, isVolcano: false }
    ],

    // Forest tree positions
    trees: [], // Generated in init()

    // Stream waypoints
    streamPoints: [],

    // Grass blade positions
    grassBlades: [],

    init() {
        // Generate trees (50-80 trees)
        this.trees = [];
        for (let i = 0; i < 70; i++) {
            this.trees.push({
                x: Math.random() * CONFIG.CANVAS_WIDTH,
                y: 380 + Math.random() * 80,  // Mid-ground area
                height: 20 + Math.random() * 40,
                width: 10 + Math.random() * 15
            });
        }
        // Sort by y for depth
        this.trees.sort((a, b) => a.y - b.y);

        // Generate stream waypoints (wavy path)
        this.streamPoints = [];
        for (let x = 0; x <= CONFIG.CANVAS_WIDTH; x += 40) {
            this.streamPoints.push({
                x: x,
                y: 520 + Math.sin(x * 0.02) * 20
            });
        }

        // Generate grass blades
        this.grassBlades = [];
        for (let i = 0; i < 200; i++) {
            this.grassBlades.push({
                x: Math.random() * CONFIG.CANVAS_WIDTH,
                y: 480 + Math.random() * 100,
                height: 5 + Math.random() * 10,
                phase: Math.random() * Math.PI * 2
            });
        }
    },

    reset() {
        this.time = 0;
        this.foreshadowX = 480;
        this.foreshadowDirection = 1;
        this.foreshadowY = 0;
        this.init();
    },

    update(deltaTime) {
        this.time += deltaTime;
        this.updateForeshadow(deltaTime);
    },

    updateForeshadow(deltaTime) {
        // Slow movement behind mountains
        this.foreshadowX += this.foreshadowDirection * 30 * deltaTime;

        // Bounce at edges (stay in mountain area)
        if (this.foreshadowX > 700) this.foreshadowDirection = -1;
        if (this.foreshadowX < 260) this.foreshadowDirection = 1;

        // Slight vertical bob
        this.foreshadowY = Math.sin(this.time * 2) * 10;
    },

    render(ctx) {
        // Render layers back to front
        this.renderMountains(ctx);
        this.renderForeshadow(ctx);  // Boss foreshadow behind forest
        this.renderForest(ctx);
        this.renderValley(ctx);
        this.renderStream(ctx);
        this.renderGrass(ctx);
    },

    renderForeshadow(ctx) {
        const upcomingBoss = enemyManager.getUpcomingBoss();
        if (!upcomingBoss) return;

        const baseY = 280 + this.foreshadowY;  // Behind mountains
        const x = this.foreshadowX;

        ctx.save();
        ctx.globalAlpha = 0.6;  // Semi-transparent/distant

        if (upcomingBoss === 'charger') {
            // Small red charger with horns
            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.ellipse(x, baseY, 15, 10, 0, 0, Math.PI * 2);
            ctx.fill();

            // Horns
            ctx.fillStyle = '#991b1b';
            ctx.beginPath();
            ctx.moveTo(x - 8, baseY - 6);
            ctx.lineTo(x - 10, baseY - 16);
            ctx.lineTo(x - 4, baseY - 8);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(x + 8, baseY - 6);
            ctx.lineTo(x + 10, baseY - 16);
            ctx.lineTo(x + 4, baseY - 8);
            ctx.closePath();
            ctx.fill();

            // Eyes
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(x - 4, baseY - 2, 3, 0, Math.PI * 2);
            ctx.arc(x + 4, baseY - 2, 3, 0, Math.PI * 2);
            ctx.fill();

        } else if (upcomingBoss === 'gunner') {
            // Small purple gunner
            ctx.fillStyle = '#7c3aed';
            ctx.beginPath();
            ctx.ellipse(x, baseY, 15, 10, 0, 0, Math.PI * 2);
            ctx.fill();

            // Cannon
            ctx.fillStyle = '#4c1d95';
            ctx.fillRect(x - 3, baseY + 6, 6, 8);

            // Eyes (red pupils)
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(x - 4, baseY - 2, 3, 0, Math.PI * 2);
            ctx.arc(x + 4, baseY - 2, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(x - 4, baseY - 2, 1.5, 0, Math.PI * 2);
            ctx.arc(x + 4, baseY - 2, 1.5, 0, Math.PI * 2);
            ctx.fill();

        } else if (upcomingBoss === 'boss') {
            // Large silhouette with glowing eyes
            ctx.fillStyle = '#1a1a2e';
            ctx.beginPath();
            ctx.ellipse(x, baseY, 30, 20, 0, 0, Math.PI * 2);
            ctx.fill();

            // Wings silhouette
            ctx.beginPath();
            ctx.moveTo(x - 15, baseY);
            ctx.quadraticCurveTo(x - 50, baseY - 20, x - 55, baseY + 5);
            ctx.quadraticCurveTo(x - 40, baseY + 10, x - 20, baseY + 5);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(x + 15, baseY);
            ctx.quadraticCurveTo(x + 50, baseY - 20, x + 55, baseY + 5);
            ctx.quadraticCurveTo(x + 40, baseY + 10, x + 20, baseY + 5);
            ctx.closePath();
            ctx.fill();

            // Glowing red eyes
            ctx.fillStyle = '#ef4444';
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(x - 10, baseY - 5, 4, 0, Math.PI * 2);
            ctx.arc(x + 10, baseY - 5, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    },

    renderMountains(ctx) {
        const baseY = 400;  // Mountain base level

        this.mountains.forEach((m, i) => {
            // Get colors based on time of day
            const lightColor = this.getMountainLightColor();
            const darkColor = this.getMountainDarkColor();

            // Draw mountain shape using quadratic curves
            ctx.beginPath();
            ctx.moveTo(m.x - m.width/2, baseY);

            // Left slope
            ctx.quadraticCurveTo(
                m.x - m.width/4, baseY - m.height * 0.6,
                m.x, baseY - m.height
            );

            // Right slope
            ctx.quadraticCurveTo(
                m.x + m.width/4, baseY - m.height * 0.6,
                m.x + m.width/2, baseY
            );

            ctx.closePath();

            // Gradient fill
            const gradient = ctx.createLinearGradient(m.x - m.width/2, baseY - m.height, m.x + m.width/2, baseY);
            gradient.addColorStop(0, lightColor);
            gradient.addColorStop(1, darkColor);
            ctx.fillStyle = gradient;
            ctx.fill();

            // Snow cap on taller mountains (not volcano)
            if (m.height > 180 && !m.isVolcano) {
                ctx.beginPath();
                ctx.moveTo(m.x - 20, baseY - m.height + 30);
                ctx.lineTo(m.x, baseY - m.height);
                ctx.lineTo(m.x + 20, baseY - m.height + 30);
                ctx.closePath();
                ctx.fillStyle = '#fff';
                ctx.fill();
            }

            // Volcano crater
            if (m.isVolcano) {
                ctx.beginPath();
                ctx.ellipse(m.x, baseY - m.height + 10, 25, 8, 0, 0, Math.PI * 2);
                ctx.fillStyle = '#4a0000';
                ctx.fill();

                // Lava glow
                ctx.beginPath();
                ctx.ellipse(m.x, baseY - m.height + 10, 15, 5, 0, 0, Math.PI * 2);
                ctx.fillStyle = '#ff4400';
                ctx.fill();

                // Render volcano smoke (call VolcanoManager)
                if (typeof VolcanoManager !== 'undefined') {
                    VolcanoManager.renderSmoke(ctx);
                }
            }
        });
    },

    renderForest(ctx) {
        const treeColor = this.getForestColor();
        const darkTreeColor = this.getForestDarkColor();

        this.trees.forEach(tree => {
            // Simple triangle tree
            ctx.beginPath();
            ctx.moveTo(tree.x, tree.y - tree.height);
            ctx.lineTo(tree.x - tree.width/2, tree.y);
            ctx.lineTo(tree.x + tree.width/2, tree.y);
            ctx.closePath();

            // Depth-based coloring (further = lighter)
            const depth = (tree.y - 380) / 80;
            ctx.fillStyle = depth < 0.5 ? treeColor : darkTreeColor;
            ctx.fill();
        });
    },

    renderValley(ctx) {
        // Valley floor (behind stream)
        const valleyColor = this.getValleyColor();

        ctx.fillStyle = valleyColor;
        ctx.beginPath();
        ctx.moveTo(0, 480);
        ctx.quadraticCurveTo(CONFIG.CANVAS_WIDTH/2, 500, CONFIG.CANVAS_WIDTH, 480);
        ctx.lineTo(CONFIG.CANVAS_WIDTH, CONFIG.STREET_Y);
        ctx.lineTo(0, CONFIG.STREET_Y);
        ctx.closePath();
        ctx.fill();
    },

    renderStream(ctx) {
        const streamColor = this.getStreamColor();
        const highlightColor = this.getStreamHighlightColor();

        // Animated offset for flowing effect
        const flowOffset = this.time * 30;

        ctx.beginPath();
        ctx.moveTo(this.streamPoints[0].x, this.streamPoints[0].y);

        for (let i = 1; i < this.streamPoints.length; i++) {
            const p = this.streamPoints[i];
            // Add wave animation
            const waveY = p.y + Math.sin((p.x + flowOffset) * 0.05) * 3;
            ctx.lineTo(p.x, waveY);
        }

        // Complete the stream shape
        ctx.lineTo(CONFIG.CANVAS_WIDTH, 540);
        ctx.lineTo(0, 540);
        ctx.closePath();

        ctx.fillStyle = streamColor;
        ctx.fill();

        // Highlight ripples
        ctx.strokeStyle = highlightColor;
        ctx.lineWidth = 1;
        for (let x = 0; x < CONFIG.CANVAS_WIDTH; x += 60) {
            const waveX = x + Math.sin(this.time * 2 + x * 0.1) * 5;
            ctx.beginPath();
            ctx.moveTo(waveX, 525);
            ctx.lineTo(waveX + 20, 525);
            ctx.stroke();
        }
    },

    renderGrass(ctx) {
        const grassColor = this.getGrassColor();

        ctx.strokeStyle = grassColor;
        ctx.lineWidth = 2;

        this.grassBlades.forEach(blade => {
            // Sway animation
            const sway = Math.sin(this.time * 2 + blade.phase) * 3;

            ctx.beginPath();
            ctx.moveTo(blade.x, blade.y);
            ctx.lineTo(blade.x + sway, blade.y - blade.height);
            ctx.stroke();
        });
    },

    // Color getters based on time of day
    getMountainLightColor() {
        switch (DayCycle.currentTime) {
            case TimeOfDay.NIGHT: return '#2a2a4a';
            case TimeOfDay.DUSK: return '#8b4513';
            case TimeOfDay.DAWN: return '#9370db';
            default: return '#6b8e6b';
        }
    },

    getMountainDarkColor() {
        switch (DayCycle.currentTime) {
            case TimeOfDay.NIGHT: return '#1a1a2a';
            case TimeOfDay.DUSK: return '#5c3317';
            case TimeOfDay.DAWN: return '#6a4a8a';
            default: return '#4a6b4a';
        }
    },

    getForestColor() {
        switch (DayCycle.currentTime) {
            case TimeOfDay.NIGHT: return '#1a3a1a';
            case TimeOfDay.DUSK: return '#4a3520';
            case TimeOfDay.DAWN: return '#5a4a6a';
            default: return '#228b22';
        }
    },

    getForestDarkColor() {
        switch (DayCycle.currentTime) {
            case TimeOfDay.NIGHT: return '#0a2a0a';
            case TimeOfDay.DUSK: return '#3a2510';
            case TimeOfDay.DAWN: return '#4a3a5a';
            default: return '#006400';
        }
    },

    getValleyColor() {
        switch (DayCycle.currentTime) {
            case TimeOfDay.NIGHT: return '#1a2a1a';
            case TimeOfDay.DUSK: return '#6b5a3a';
            case TimeOfDay.DAWN: return '#8a7a9a';
            default: return '#7cba3d';
        }
    },

    getStreamColor() {
        switch (DayCycle.currentTime) {
            case TimeOfDay.NIGHT: return '#1a3a5a';
            case TimeOfDay.DUSK: return '#8b6914';
            case TimeOfDay.DAWN: return '#9090b0';
            default: return '#4a90d9';
        }
    },

    getStreamHighlightColor() {
        switch (DayCycle.currentTime) {
            case TimeOfDay.NIGHT: return '#4a6a8a44';
            case TimeOfDay.DUSK: return '#ffd70044';
            case TimeOfDay.DAWN: return '#dda0dd44';
            default: return '#ffffff44';
        }
    },

    getGrassColor() {
        switch (DayCycle.currentTime) {
            case TimeOfDay.NIGHT: return '#1a4a1a';
            case TimeOfDay.DUSK: return '#8b7500';
            case TimeOfDay.DAWN: return '#9a7aaa';
            default: return '#32cd32';
        }
    }
};
