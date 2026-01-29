// ============================================
// PARALLAX BACKGROUND SYSTEM - Contra Operation Galuga Style
// ============================================

const BackgroundManager = {
    time: 0,
    volcanoPulse: 0,

    // Current zone (1 = city, 2 = desert)
    currentZone: 1,

    // Layer offsets for parallax
    layer1Offset: 0,
    layer2Offset: 0,
    layer3Offset: 0,

    // Generated Elements
    skyline: [],
    ruins: [],
    debris: [],

    // Volcano image asset
    volcanoImage: null,
    volcanoImageLoaded: false,

    // Volcano embers particle system
    embers: [],
    lavaFlows: [],

    // Atmospheric ash particles (falling across entire scene)
    ashParticles: [],

    // Zone 2: Desert elements
    desertDunes: [],
    desertMountains: [],
    dustParticles: [],

    init() {
        // Load volcano image
        this.volcanoImage = new Image();
        this.volcanoImage.onload = () => {
            this.volcanoImageLoaded = true;
            console.log('Volcano image loaded');
        };
        this.volcanoImage.onerror = () => {
            console.warn('Failed to load volcano image, using procedural fallback');
        };
        this.volcanoImage.src = 'assets/volcano_background.png';

        // Initialize lava flows (static paths down the volcano)
        this.lavaFlows = [
            { startX: 0, endX: -120, width: 8, speed: 1.2 },
            { startX: 15, endX: 80, width: 6, speed: 1.0 },
            { startX: -10, endX: -60, width: 5, speed: 0.9 },
            { startX: 5, endX: 140, width: 7, speed: 1.1 },
            { startX: -5, endX: -180, width: 4, speed: 0.8 },
            { startX: 20, endX: 200, width: 5, speed: 1.3 },
        ];

        // Initialize ember particles
        this.embers = [];
        for (let i = 0; i < 25; i++) {
            this.embers.push(this.createEmber());
        }

        // Initialize atmospheric ash particles
        this.ashParticles = [];
        for (let i = 0; i < 40; i++) {
            this.ashParticles.push(this.createAshParticle());
        }

        // LAYER 1: Far distant city silhouettes
        this.skyline = [];
        let x = 0;
        while (x < CONFIG.CANVAS_WIDTH * 1.5) {
            const width = 30 + Math.random() * 60;
            const height = 120 + Math.random() * 180;
            this.skyline.push({
                x: x,
                width: width,
                height: height,
                type: Math.random() > 0.6 ? 'spire' : 'block',
                damaged: Math.random() > 0.4
            });
            x += width - 5;
        }

        // LAYER 2: Mid-ground ruined buildings with windows
        this.ruins = [];
        x = 0;
        while (x < CONFIG.CANVAS_WIDTH * 1.5) {
            if (Math.random() > 0.25) {
                const width = 50 + Math.random() * 80;
                const height = 60 + Math.random() * 120;
                this.ruins.push({
                    x: x,
                    width: width,
                    height: height,
                    windows: this.generateWindows(width, height),
                    crumbled: Math.random() > 0.6
                });
                x += width;
            } else {
                x += 30 + Math.random() * 60;
            }
        }

        // LAYER 3: Foreground rubble and barriers
        this.debris = [];
        x = 0;
        while (x < CONFIG.CANVAS_WIDTH * 2) {
            if (Math.random() < 0.3) {
                this.debris.push({
                    type: 'barrier',
                    x: x,
                    width: 20 + Math.random() * 40,
                    height: 15 + Math.random() * 25
                });
            } else if (Math.random() < 0.2) {
                this.debris.push({
                    type: 'rubble',
                    x: x,
                    width: 30 + Math.random() * 30,
                    height: 10 + Math.random() * 15
                });
            }
            x += 60 + Math.random() * 40;
        }

        // Initialize desert elements for Zone 2
        this.initDesert();
    },

    initDesert() {
        // Desert mountains (far layer)
        this.desertMountains = [];
        let mx = 0;
        while (mx < CONFIG.CANVAS_WIDTH * 1.5) {
            const width = 150 + Math.random() * 200;
            const height = 100 + Math.random() * 150;
            this.desertMountains.push({
                x: mx,
                width: width,
                height: height,
                type: Math.random() > 0.7 ? 'mesa' : 'peak'
            });
            mx += width * 0.7;
        }

        // Desert dunes (mid layer)
        this.desertDunes = [];
        let dx = 0;
        while (dx < CONFIG.CANVAS_WIDTH * 2) {
            const width = 80 + Math.random() * 120;
            const height = 20 + Math.random() * 40;
            this.desertDunes.push({
                x: dx,
                width: width,
                height: height
            });
            dx += width * 0.8;
        }

        // Dust particles
        this.dustParticles = [];
        for (let i = 0; i < 30; i++) {
            this.dustParticles.push(this.createDustParticle());
        }
    },

    createDustParticle() {
        return {
            x: Math.random() * CONFIG.CANVAS_WIDTH,
            y: Math.random() * CONFIG.CANVAS_HEIGHT,
            size: 1 + Math.random() * 2,
            speedX: 20 + Math.random() * 30,
            speedY: -5 + Math.random() * 10,
            opacity: 0.2 + Math.random() * 0.3
        };
    },

    createEmber() {
        return {
            x: (Math.random() - 0.5) * 60,
            y: 0,
            vx: (Math.random() - 0.5) * 20,
            vy: -30 - Math.random() * 50,
            life: Math.random(),
            maxLife: 1.5 + Math.random() * 2,
            size: 1 + Math.random() * 3
        };
    },

    createAshParticle() {
        return {
            x: Math.random() * CONFIG.CANVAS_WIDTH,
            y: -10 - Math.random() * CONFIG.CANVAS_HEIGHT,
            vx: (Math.random() - 0.5) * 10,
            vy: 15 + Math.random() * 25,
            size: 1 + Math.random() * 2,
            opacity: 0.3 + Math.random() * 0.4,
            drift: Math.random() * Math.PI * 2
        };
    },

    generateWindows(w, h) {
        const wins = [];
        const rows = Math.floor(h / 18);
        const cols = Math.floor(w / 14);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (Math.random() > 0.5) continue;
                wins.push({
                    x: 4 + c * 14,
                    y: 8 + r * 18,
                    w: 8,
                    h: 12,
                    lit: Math.random() < 0.15,
                    random: Math.random()  // Store random value for stable rendering
                });
            }
        }
        return wins;
    },

    reset() {
        this.time = 0;
        this.layer1Offset = 0;
        this.layer2Offset = 0;
        this.layer3Offset = 0;
        this.init();
    },

    update(deltaTime) {
        this.time += deltaTime;
        this.volcanoPulse = Math.sin(this.time * 2) * 0.5 + 0.5;

        // Update embers
        for (let i = 0; i < this.embers.length; i++) {
            const e = this.embers[i];
            e.life += deltaTime;
            e.x += e.vx * deltaTime;
            e.y += e.vy * deltaTime;
            e.vy += 5 * deltaTime; // Slight gravity resistance (rising hot air)

            if (e.life > e.maxLife) {
                this.embers[i] = this.createEmber();
            }
        }

        // Update atmospheric ash particles
        for (let i = 0; i < this.ashParticles.length; i++) {
            const a = this.ashParticles[i];
            a.drift += deltaTime;
            a.x += a.vx * deltaTime + Math.sin(a.drift) * 5 * deltaTime;
            a.y += a.vy * deltaTime;

            // Reset particles that fall off screen
            if (a.y > CONFIG.STREET_Y + 50) {
                this.ashParticles[i] = this.createAshParticle();
            }

            // Wrap horizontally
            if (a.x < -10) a.x = CONFIG.CANVAS_WIDTH + 10;
            if (a.x > CONFIG.CANVAS_WIDTH + 10) a.x = -10;
        }

        // Slow parallax drift
        const drift = 3 * deltaTime;
        this.layer1Offset = (this.layer1Offset + drift * 0.3) % 1200;
        this.layer2Offset = (this.layer2Offset + drift * 0.6) % 1200;
        this.layer3Offset = (this.layer3Offset + drift * 1.2) % 1500;

        // Update dust particles (Zone 2)
        for (let i = 0; i < this.dustParticles.length; i++) {
            const d = this.dustParticles[i];
            d.x += d.speedX * deltaTime;
            d.y += d.speedY * deltaTime;

            // Reset particles that go off screen
            if (d.x > CONFIG.CANVAS_WIDTH + 10) {
                this.dustParticles[i] = this.createDustParticle();
                this.dustParticles[i].x = -5;
            }
        }
    },

    render(ctx) {
        const playerX = (typeof player !== 'undefined') ? player.x : CONFIG.CANVAS_WIDTH / 2;
        const offsetX = (playerX - 480);

        // Time of day
        const isNight = typeof DayCycle !== 'undefined' && DayCycle.currentTime === 'night';
        const isDusk = typeof DayCycle !== 'undefined' && DayCycle.currentTime === 'dusk';

        // Check current zone from game state
        const zone = (typeof game !== 'undefined' && game.currentZone) ? game.currentZone : this.currentZone;

        if (zone === 2) {
            // Zone 2: Desert background
            this.renderDesertBackground(ctx, offsetX, isNight, isDusk);
        } else {
            // Zone 1: City background - use procedural rendering with bright sky
            // Render distant skyline silhouettes (sky gradient shows through from game.js)
            this.renderSkyline(ctx, offsetX * 0.15);
            this.renderRuins(ctx, offsetX * 0.3);

            // Render ash particles for Zone 1
            this.ashParticles.forEach(a => {
                ctx.fillStyle = `rgba(200, 180, 160, ${a.opacity})`;
                ctx.fillRect(a.x, a.y, a.size, a.size);
                if (a.size > 1.5) {
                    ctx.fillStyle = `rgba(220, 200, 180, ${a.opacity * 0.3})`;
                    ctx.fillRect(a.x - 1, a.y - 1, a.size + 2, a.size + 2);
                }
            });
        }
    },

    renderDesertBackground(ctx, offsetX, isNight, isDusk) {
        // Desert sky gradient
        const skyGradient = ctx.createLinearGradient(0, 0, 0, CONFIG.STREET_Y);

        if (isNight) {
            skyGradient.addColorStop(0, '#0a1628');
            skyGradient.addColorStop(0.4, '#1a2540');
            skyGradient.addColorStop(1, '#2a3550');
        } else if (isDusk) {
            skyGradient.addColorStop(0, '#4a2850');
            skyGradient.addColorStop(0.3, '#a04030');
            skyGradient.addColorStop(0.6, '#d06020');
            skyGradient.addColorStop(1, '#c09050');
        } else {
            // Day - bright desert sky
            skyGradient.addColorStop(0, '#5090d0');
            skyGradient.addColorStop(0.5, '#80b0e0');
            skyGradient.addColorStop(0.8, '#d0c090');
            skyGradient.addColorStop(1, '#e8d8a0');
        }

        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.STREET_Y);

        // Far mountains (silhouette)
        const mountainColor = isNight ? '#1a2030' : (isDusk ? '#5a3040' : '#8a7060');
        this.desertMountains.forEach(m => {
            const mx = m.x - offsetX * 0.1;
            ctx.fillStyle = mountainColor;
            ctx.beginPath();

            if (m.type === 'mesa') {
                // Flat-topped mesa
                ctx.moveTo(mx, CONFIG.STREET_Y);
                ctx.lineTo(mx + m.width * 0.1, CONFIG.STREET_Y - m.height * 0.8);
                ctx.lineTo(mx + m.width * 0.3, CONFIG.STREET_Y - m.height);
                ctx.lineTo(mx + m.width * 0.7, CONFIG.STREET_Y - m.height);
                ctx.lineTo(mx + m.width * 0.9, CONFIG.STREET_Y - m.height * 0.8);
                ctx.lineTo(mx + m.width, CONFIG.STREET_Y);
            } else {
                // Pointed peak
                ctx.moveTo(mx, CONFIG.STREET_Y);
                ctx.lineTo(mx + m.width * 0.4, CONFIG.STREET_Y - m.height * 0.6);
                ctx.lineTo(mx + m.width * 0.5, CONFIG.STREET_Y - m.height);
                ctx.lineTo(mx + m.width * 0.6, CONFIG.STREET_Y - m.height * 0.6);
                ctx.lineTo(mx + m.width, CONFIG.STREET_Y);
            }
            ctx.closePath();
            ctx.fill();
        });

        // Sand dunes (mid layer)
        const duneColor = isNight ? '#3a3020' : (isDusk ? '#b08050' : '#d0b080');
        const duneShadow = isNight ? '#2a2010' : (isDusk ? '#905030' : '#b09060');

        this.desertDunes.forEach(d => {
            const dx = d.x - offsetX * 0.25;
            const duneY = CONFIG.STREET_Y - d.height;

            // Dune shadow
            ctx.fillStyle = duneShadow;
            ctx.beginPath();
            ctx.moveTo(dx, CONFIG.STREET_Y);
            ctx.quadraticCurveTo(dx + d.width * 0.3, duneY - 5, dx + d.width * 0.5, duneY);
            ctx.quadraticCurveTo(dx + d.width * 0.7, duneY + d.height * 0.3, dx + d.width, CONFIG.STREET_Y);
            ctx.closePath();
            ctx.fill();

            // Dune surface
            ctx.fillStyle = duneColor;
            ctx.beginPath();
            ctx.moveTo(dx, CONFIG.STREET_Y);
            ctx.quadraticCurveTo(dx + d.width * 0.25, duneY, dx + d.width * 0.5, duneY);
            ctx.quadraticCurveTo(dx + d.width * 0.75, duneY + d.height * 0.2, dx + d.width, CONFIG.STREET_Y);
            ctx.closePath();
            ctx.fill();
        });

        // Desert ground
        const groundGradient = ctx.createLinearGradient(0, CONFIG.STREET_Y - 20, 0, CONFIG.CANVAS_HEIGHT);
        if (isNight) {
            groundGradient.addColorStop(0, '#3a3020');
            groundGradient.addColorStop(1, '#2a2010');
        } else if (isDusk) {
            groundGradient.addColorStop(0, '#a08050');
            groundGradient.addColorStop(1, '#806030');
        } else {
            groundGradient.addColorStop(0, '#c4a574');
            groundGradient.addColorStop(1, '#a08050');
        }
        ctx.fillStyle = groundGradient;
        ctx.fillRect(0, CONFIG.STREET_Y, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT - CONFIG.STREET_Y);

        // Dust particles
        this.dustParticles.forEach(d => {
            const sandColor = isNight ? '100, 80, 60' : (isDusk ? '180, 140, 100' : '200, 180, 150');
            ctx.fillStyle = `rgba(${sandColor}, ${d.opacity})`;
            ctx.fillRect(d.x, d.y, d.size, d.size);
        });
    },

    renderVolcano(ctx, offset) {
        const vx = 520 - offset;
        const vy = CONFIG.STREET_Y;
        const volcanoHeight = 450;

        // Time of day colors
        const isNight = typeof DayCycle !== 'undefined' && DayCycle.currentTime === 'night';
        const isDusk = typeof DayCycle !== 'undefined' && DayCycle.currentTime === 'dusk';

        // === IMAGE-BASED VOLCANO (with procedural fallback) ===
        const glow = this.volcanoPulse;

        if (this.volcanoImageLoaded && this.volcanoImage) {
            // Draw the volcano image - scale to fill more of background
            const imgWidth = 1100;
            const imgHeight = 800;
            const drawX = vx - imgWidth / 2;
            const drawY = vy - imgHeight + 120;

            ctx.save();
            ctx.drawImage(this.volcanoImage, drawX, drawY, imgWidth, imgHeight);

            // Apply time-of-day tint overlay
            if (isNight) {
                ctx.globalCompositeOperation = 'multiply';
                ctx.fillStyle = 'rgba(20, 20, 50, 0.4)';
                ctx.fillRect(drawX, drawY, imgWidth, imgHeight);
            } else if (isDusk) {
                ctx.globalCompositeOperation = 'multiply';
                ctx.fillStyle = 'rgba(50, 25, 15, 0.25)';
                ctx.fillRect(drawX, drawY, imgWidth, imgHeight);
            }
            ctx.restore();
        } else {
            // === PROCEDURAL FALLBACK ===
            const baseColor = isNight ? '#0c0a09' : (isDusk ? '#1c1917' : '#1a1a1a');
            const faceColor = isNight ? '#1c1917' : (isDusk ? '#292524' : '#2d2d2d');
            const darkAccent = '#0a0a0a';

            // Draw volcano base
            ctx.fillStyle = baseColor;
            ctx.beginPath();
            ctx.moveTo(vx - 350, vy);
            ctx.quadraticCurveTo(vx - 100, vy - volcanoHeight * 0.7, vx - 50, vy - volcanoHeight);
            ctx.lineTo(vx + 50, vy - volcanoHeight);
            ctx.quadraticCurveTo(vx + 100, vy - volcanoHeight * 0.7, vx + 380, vy);
            ctx.closePath();
            ctx.fill();

            // Draw volcano lighter face
            ctx.fillStyle = faceColor;
            ctx.beginPath();
            ctx.moveTo(vx - 220, vy);
            ctx.quadraticCurveTo(vx - 60, vy - volcanoHeight * 0.6, vx - 30, vy - volcanoHeight + 30);
            ctx.lineTo(vx + 30, vy - volcanoHeight + 30);
            ctx.quadraticCurveTo(vx + 60, vy - volcanoHeight * 0.6, vx + 260, vy);
            ctx.closePath();
            ctx.fill();

            // Dark ridge accents
            ctx.fillStyle = darkAccent;
            ctx.beginPath();
            ctx.moveTo(vx - 300, vy);
            ctx.lineTo(vx - 70, vy - volcanoHeight * 0.85);
            ctx.lineTo(vx - 90, vy - volcanoHeight * 0.85);
            ctx.lineTo(vx - 320, vy);
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(vx + 300, vy);
            ctx.lineTo(vx + 70, vy - volcanoHeight * 0.85);
            ctx.lineTo(vx + 90, vy - volcanoHeight * 0.85);
            ctx.lineTo(vx + 320, vy);
            ctx.fill();
        }

        // === LAVA FLOWS (procedural, applied for fallback mode) ===
        if (!this.volcanoImageLoaded) {
            const lavaColors = ['#ff4500', '#ff6600', '#ff3300', '#ff5500'];

            this.lavaFlows.forEach((flow, index) => {
                const flowProgress = (this.time * flow.speed) % 1;
                const baseAlpha = 0.7 + glow * 0.3;

                // Create gradient for each lava flow
                const startY = vy - volcanoHeight + 20;
                const endY = vy - 30;
                const lavaGrad = ctx.createLinearGradient(0, startY, 0, endY);
                lavaGrad.addColorStop(0, `rgba(255, 200, 50, ${baseAlpha})`);
                lavaGrad.addColorStop(0.3, `rgba(255, 100, 0, ${baseAlpha * 0.9})`);
                lavaGrad.addColorStop(0.7, `rgba(200, 50, 0, ${baseAlpha * 0.7})`);
                lavaGrad.addColorStop(1, `rgba(100, 20, 0, ${baseAlpha * 0.4})`);

                ctx.strokeStyle = lavaGrad;
                ctx.lineWidth = flow.width;
                ctx.lineCap = 'round';
                ctx.beginPath();

                // Wavy lava path
                const segments = 8;
                for (let i = 0; i <= segments; i++) {
                    const t = i / segments;
                    const px = vx + flow.startX + (flow.endX - flow.startX) * t;
                    const py = startY + (endY - startY) * t;
                    const wave = Math.sin(t * 4 + this.time * 2 + index) * 3;

                    if (i === 0) {
                        ctx.moveTo(px + wave, py);
                    } else {
                        ctx.lineTo(px + wave, py);
                    }
                }
                ctx.stroke();

                // Glowing edge
                ctx.strokeStyle = `rgba(255, 255, 100, ${0.3 + glow * 0.2})`;
                ctx.lineWidth = flow.width * 0.3;
                ctx.stroke();
            });

            // === CRATER GLOW ===
            const glowAlpha = isNight ? 1.0 : 0.85;

            // Large ambient glow
            const outerGlow = ctx.createRadialGradient(
                vx, vy - volcanoHeight - 20, 10,
                vx, vy - volcanoHeight + 60, 150
            );
            outerGlow.addColorStop(0, `rgba(255, 150, 50, ${(0.8 + glow * 0.2) * glowAlpha})`);
            outerGlow.addColorStop(0.3, `rgba(255, 80, 0, ${(0.5 + glow * 0.2) * glowAlpha})`);
            outerGlow.addColorStop(0.6, `rgba(150, 30, 0, ${0.3 * glowAlpha})`);
            outerGlow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = outerGlow;
            ctx.beginPath();
            ctx.arc(vx, vy - volcanoHeight + 20, 140, 0, Math.PI * 2);
            ctx.fill();

            // Inner bright glow
            const innerGlow = ctx.createRadialGradient(
                vx, vy - volcanoHeight, 5,
                vx, vy - volcanoHeight + 20, 50
            );
            innerGlow.addColorStop(0, `rgba(255, 255, 200, ${0.9 + glow * 0.1})`);
            innerGlow.addColorStop(0.5, `rgba(255, 150, 50, ${0.7 + glow * 0.2})`);
            innerGlow.addColorStop(1, 'rgba(255, 80, 0, 0)');
            ctx.fillStyle = innerGlow;
            ctx.beginPath();
            ctx.arc(vx, vy - volcanoHeight + 10, 45, 0, Math.PI * 2);
            ctx.fill();

            // Lava pool in crater
            ctx.fillStyle = '#ffcc00';
            ctx.shadowBlur = 25;
            ctx.shadowColor = '#ff6600';
            ctx.beginPath();
            ctx.ellipse(vx, vy - volcanoHeight + 12, 35, 12, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ff4500';
            ctx.beginPath();
            ctx.ellipse(vx, vy - volcanoHeight + 14, 28, 9, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Volcano smoke from VolcanoManager
            if (typeof VolcanoManager !== 'undefined') {
                VolcanoManager.volcanoX = vx;
                VolcanoManager.volcanoY = vy - volcanoHeight + 10;
                VolcanoManager.renderSmoke(ctx);
            }

            // Render embers on top
            this.embers.forEach(e => {
                const alpha = 1 - (e.life / e.maxLife);
                const flicker = 0.7 + Math.sin(this.time * 10 + e.x) * 0.3;

                ctx.fillStyle = `rgba(255, ${150 + Math.random() * 100}, 50, ${alpha * flicker})`;
                ctx.beginPath();
                ctx.arc(vx + e.x, vy - volcanoHeight + e.y, e.size * alpha, 0, Math.PI * 2);
                ctx.fill();

                // Ember glow
                ctx.fillStyle = `rgba(255, 100, 0, ${alpha * 0.3 * flicker})`;
                ctx.beginPath();
                ctx.arc(vx + e.x, vy - volcanoHeight + e.y, e.size * alpha * 2, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        // === EMBERS & SMOKE (for both image and procedural modes) ===
        // Render embers on top
        this.embers.forEach(e => {
            const alpha = 1 - (e.life / e.maxLife);
            const flicker = 0.7 + Math.sin(this.time * 10 + e.x) * 0.3;

            ctx.fillStyle = `rgba(255, ${150 + Math.floor(e.x * 5) % 100}, 50, ${alpha * flicker})`;
            ctx.beginPath();
            ctx.arc(vx + e.x + 60, vy - volcanoHeight - 30 + e.y, e.size * alpha, 0, Math.PI * 2);
            ctx.fill();

            // Ember glow
            ctx.fillStyle = `rgba(255, 100, 0, ${alpha * 0.3 * flicker})`;
            ctx.beginPath();
            ctx.arc(vx + e.x + 60, vy - volcanoHeight - 30 + e.y, e.size * alpha * 2, 0, Math.PI * 2);
            ctx.fill();
        });

        // Volcano smoke (for image mode)
        if (this.volcanoImageLoaded && typeof VolcanoManager !== 'undefined') {
            VolcanoManager.volcanoX = vx + 60;
            VolcanoManager.volcanoY = vy - volcanoHeight - 40;
            VolcanoManager.renderSmoke(ctx);
        }
    },

    renderSkyline(ctx, offset) {
        // Time of day color
        const isNight = typeof DayCycle !== 'undefined' && DayCycle.currentTime === 'night';
        const isDusk = typeof DayCycle !== 'undefined' && DayCycle.currentTime === 'dusk';

        // Try sprite first
        const skylineSprite = typeof AssetManager !== 'undefined' ? AssetManager.getImage('bg_skyline') : null;

        if (skylineSprite) {
            // === SPRITE RENDERING ===
            // Seamlessly tile the skyline sprite horizontally
            const spriteWidth = skylineSprite.width;
            const spriteHeight = skylineSprite.height;
            const baseY = CONFIG.STREET_Y - spriteHeight;

            // Calculate base offset for parallax tiling
            const totalOffset = offset + this.layer1Offset;
            const tileOffset = ((totalOffset % spriteWidth) + spriteWidth) % spriteWidth;

            // Use additive blending for black background transparency
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';

            // Apply time-of-day dimming
            if (isNight) {
                ctx.globalAlpha = 0.6;
            } else if (isDusk) {
                ctx.globalAlpha = 0.8;
            }

            // Draw enough tiles to cover the screen
            for (let x = -tileOffset; x < CONFIG.CANVAS_WIDTH + spriteWidth; x += spriteWidth) {
                ctx.drawImage(skylineSprite, x, baseY);
            }

            ctx.restore();
        } else {
            // === PROCEDURAL FALLBACK ===
            const silhouetteColor = isNight ? '#0f172a' : (isDusk ? '#431407' : '#374151');
            ctx.fillStyle = silhouetteColor;

            this.skyline.forEach(b => {
                let rx = b.x - offset - this.layer1Offset;
                if (rx < -150) rx += 1440;
                if (rx > 1100) rx -= 1440;

                const baseY = CONFIG.STREET_Y;

                // Draw building shape
                if (b.damaged) {
                    ctx.beginPath();
                    ctx.moveTo(rx, baseY);
                    ctx.lineTo(rx, baseY - b.height * 0.7);
                    ctx.lineTo(rx + b.width * 0.3, baseY - b.height);
                    ctx.lineTo(rx + b.width * 0.5, baseY - b.height * 0.85);
                    ctx.lineTo(rx + b.width * 0.7, baseY - b.height * 0.95);
                    ctx.lineTo(rx + b.width, baseY - b.height * 0.6);
                    ctx.lineTo(rx + b.width, baseY);
                    ctx.fill();
                } else {
                    ctx.fillRect(rx, baseY - b.height, b.width, b.height);
                }

                // Antenna on spires
                if (b.type === 'spire' && !b.damaged) {
                    ctx.fillRect(rx + b.width / 2 - 1, baseY - b.height - 25, 2, 25);
                    if ((isNight || isDusk) && Math.floor(this.time * 2) % 2 === 0) {
                        ctx.fillStyle = '#ef4444';
                        ctx.beginPath();
                        ctx.arc(rx + b.width / 2, baseY - b.height - 27, 3, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.fillStyle = silhouetteColor;
                    }
                }
            });
        }
    },

    renderRuins(ctx, offset) {
        const isNight = typeof DayCycle !== 'undefined' && DayCycle.currentTime === 'night';
        const isDusk = typeof DayCycle !== 'undefined' && DayCycle.currentTime === 'dusk';

        // Try sprite first
        const ruinsSprite = typeof AssetManager !== 'undefined' ? AssetManager.getImage('bg_ruins') : null;

        if (ruinsSprite) {
            // === SPRITE RENDERING ===
            const spriteWidth = ruinsSprite.width;
            const spriteHeight = ruinsSprite.height;
            const baseY = CONFIG.STREET_Y - spriteHeight;

            // Calculate base offset for parallax tiling
            const totalOffset = offset + this.layer2Offset;
            const tileOffset = ((totalOffset % spriteWidth) + spriteWidth) % spriteWidth;

            // Use additive blending for black background transparency
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';

            // Apply time-of-day dimming
            if (isNight) {
                ctx.globalAlpha = 0.5;
            } else if (isDusk) {
                ctx.globalAlpha = 0.7;
            }

            // Draw enough tiles to cover the screen
            for (let x = -tileOffset; x < CONFIG.CANVAS_WIDTH + spriteWidth; x += spriteWidth) {
                ctx.drawImage(ruinsSprite, x, baseY);
            }

            ctx.restore();
        } else {
            // === PROCEDURAL FALLBACK ===
            const ruinColor = isNight ? '#1e293b' : (isDusk ? '#78350f' : '#4b5563');
            const windowDark = isNight ? '#0f172a' : '#1f2937';
            const windowLit = '#fbbf24';

            this.ruins.forEach(r => {
                let rx = r.x - offset - this.layer2Offset;
                if (rx < -120) rx += 1440;
                if (rx > 1080) rx -= 1440;

                const baseY = CONFIG.STREET_Y;
                ctx.fillStyle = ruinColor;

                if (r.crumbled) {
                    ctx.beginPath();
                    ctx.moveTo(rx, baseY);
                    ctx.lineTo(rx, baseY - r.height * 0.5);
                    ctx.lineTo(rx + r.width * 0.2, baseY - r.height * 0.8);
                    ctx.lineTo(rx + r.width * 0.4, baseY - r.height * 0.6);
                    ctx.lineTo(rx + r.width * 0.6, baseY - r.height);
                    ctx.lineTo(rx + r.width * 0.8, baseY - r.height * 0.7);
                    ctx.lineTo(rx + r.width, baseY - r.height * 0.4);
                    ctx.lineTo(rx + r.width, baseY);
                    ctx.fill();
                } else {
                    ctx.fillRect(rx, baseY - r.height, r.width, r.height);
                }

                // Windows
                r.windows.forEach(w => {
                    if (r.crumbled && w.random > 0.5) return;
                    const showLit = w.lit && (isNight || isDusk);
                    ctx.fillStyle = showLit ? windowLit : windowDark;
                    ctx.fillRect(rx + w.x, baseY - r.height + w.y, w.w, w.h);
                });
            });
        }
    },

    renderDebris(ctx, offset) {
        const isNight = typeof DayCycle !== 'undefined' && DayCycle.currentTime === 'night';
        const debrisColor = isNight ? '#374151' : '#6b7280';
        ctx.fillStyle = debrisColor;

        this.debris.forEach(d => {
            let dx = d.x - offset - this.layer3Offset;
            if (dx < -80) dx += 1920;
            if (dx > 1040) dx -= 1920;

            const baseY = CONFIG.STREET_Y;

            if (d.type === 'rubble') {
                // Rubble pile
                ctx.beginPath();
                ctx.moveTo(dx, baseY);
                ctx.lineTo(dx + d.width * 0.3, baseY - d.height);
                ctx.lineTo(dx + d.width * 0.6, baseY - d.height * 0.7);
                ctx.lineTo(dx + d.width, baseY);
                ctx.fill();
            }
        });
    }
};
