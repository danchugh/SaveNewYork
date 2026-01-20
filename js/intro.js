const IntroManager = {
    assets: {
        bg: new Image(),
        logo: new Image(),
        loaded: 0,
        total: 2
    },
    state: {
        time: 0,
        phase: 'fading_in', // fading_in, main, starting
        logoScale: 5,
        bgScroll: 0,
        alpha: 0,
        selectedPlayers: 1 // 1 or 2 player mode selection
    },

    init() {
        this.assets.bg.src = 'assets/splash_bg.png';
        this.assets.bg.onload = () => this.assets.loaded++;

        this.assets.logo.src = 'assets/splash_logo.png';
        this.assets.logo.onload = () => this.assets.loaded++;

        this.reset();
    },

    reset() {
        this.state.time = 0;
        this.state.phase = 'fading_in';
        this.state.logoScale = 5;
        this.state.bgScroll = 0;
        this.state.alpha = 0;
        this.state.selectedPlayers = 1;
    },

    update(deltaTime) {
        this.state.time += deltaTime;

        // Background scroll (slow parallax feel)
        this.state.bgScroll = (this.state.time * 50) % CONFIG.CANVAS_WIDTH;

        // Phase logic
        if (this.state.phase === 'fading_in') {
            this.state.alpha += deltaTime; // 1 second fade in

            // Logo slam effect
            if (this.state.logoScale > 1) {
                this.state.logoScale -= deltaTime * 15;
                if (this.state.logoScale < 1) {
                    this.state.logoScale = 1;
                    // Add shake effect here if possible via EffectsManager
                    if (typeof EffectsManager !== 'undefined') {
                        EffectsManager.shake(10, 0.2);
                    }
                }
            }

            if (this.state.alpha >= 1 && this.state.logoScale <= 1) {
                this.state.alpha = 1;
                this.state.phase = 'main';
            }
        } else if (this.state.phase === 'main') {
            // Handle player count selection with Up/Down
            if (input.isKeyJustPressed('ArrowUp') || input.isKeyJustPressed('w') || input.isKeyJustPressed('W')) {
                this.state.selectedPlayers = 1;
            }
            if (input.isKeyJustPressed('ArrowDown') || input.isKeyJustPressed('s') || input.isKeyJustPressed('S')) {
                this.state.selectedPlayers = 2;
            }
        } else if (this.state.phase === 'starting') {
            // Flash effect or transition out
        }
    },

    render(ctx) {
        if (this.assets.loaded < this.assets.total) {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.fillText('LOADING...', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2);
            return;
        }

        // 1. Draw Background (with scroll)
        // Draw twice to loop
        // Assuming image is wide enough or we stretch. 
        // For safe tiling, we draw it covering the screen.
        // The generated image might not be perfectly seamless, but let's try to pan it slowly.
        // If it's 16:9, it might just fit. Let's draw it to fill.

        // Save Context
        ctx.save();

        // Draw Background
        const bgRatio = this.assets.bg.width / this.assets.bg.height;
        const screenRatio = CONFIG.CANVAS_WIDTH / CONFIG.CANVAS_HEIGHT;

        // Source rectangle (pan horizontally)
        // We act as if the camera is panning right, so image moves left
        // We'll just draw the image scaled to height, and tiled horizontally
        const scale = CONFIG.CANVAS_HEIGHT / this.assets.bg.height;
        const scaledWidth = this.assets.bg.width * scale;

        let x = -this.state.bgScroll;
        while (x < CONFIG.CANVAS_WIDTH) {
            ctx.drawImage(this.assets.bg, x, 0, scaledWidth, CONFIG.CANVAS_HEIGHT);
            x += scaledWidth - 1; // -1 to prevent gaps
        }

        // Overlay a dark gradient at the bottom for text readability
        const gradient = ctx.createLinearGradient(0, CONFIG.CANVAS_HEIGHT / 2, 0, CONFIG.CANVAS_HEIGHT);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(0.5, 'rgba(0,0,0,0.4)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.8)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // 2. Draw Logo
        // Use blending to make black transparent if needed, or just normal draw if it's a PNG with transparency.
        // The generator usually makes full images. If it has a black background, specific blend modes help.
        // Screen mode makes black transparent and lights up everything else.
        ctx.globalCompositeOperation = 'screen';

        const logoW = 600 * this.state.logoScale;
        const logoH = 300 * this.state.logoScale;
        const logoX = (CONFIG.CANVAS_WIDTH - logoW) / 2;
        const logoY = 50 + (1 - this.state.logoScale) * 100; // Move up as it scales down? Or just center. 

        // Let's center it roughly at top 1/3
        const targetY = 50;

        ctx.drawImage(
            this.assets.logo,
            CONFIG.CANVAS_WIDTH / 2 - logoW / 2,
            CONFIG.CANVAS_HEIGHT / 2 - logoH / 2 - 50, // Center it slightly above mid
            logoW,
            logoH
        );

        ctx.globalCompositeOperation = 'source-over';

        // 3. UI Elements (Fade in with alpha)
        ctx.globalAlpha = Math.min(1, this.state.time * 0.5); // Fade in slower

        // Player Selection Menu
        if (this.state.phase === 'main') {
            const menuY = CONFIG.CANVAS_HEIGHT - 180;
            const pulse = 0.5 + 0.5 * Math.sin(this.state.time * 3);

            ctx.font = 'bold 20px monospace';
            ctx.textAlign = 'center';

            // 1 PLAYER option
            if (this.state.selectedPlayers === 1) {
                ctx.fillStyle = '#00ffff';
                ctx.shadowColor = '#00ffff';
                ctx.shadowBlur = 10;
                ctx.fillText('► 1 PLAYER ◄', CONFIG.CANVAS_WIDTH / 2, menuY);
            } else {
                ctx.fillStyle = '#666666';
                ctx.shadowBlur = 0;
                ctx.fillText('  1 PLAYER  ', CONFIG.CANVAS_WIDTH / 2, menuY);
            }

            // 2 PLAYERS option
            if (this.state.selectedPlayers === 2) {
                ctx.fillStyle = '#ff00aa';
                ctx.shadowColor = '#ff00aa';
                ctx.shadowBlur = 10;
                ctx.fillText('► 2 PLAYERS ◄', CONFIG.CANVAS_WIDTH / 2, menuY + 35);
            } else {
                ctx.fillStyle = '#666666';
                ctx.shadowBlur = 0;
                ctx.fillText('  2 PLAYERS  ', CONFIG.CANVAS_WIDTH / 2, menuY + 35);
            }

            ctx.shadowBlur = 0;

            // Press Enter prompt
            ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + pulse * 0.5})`;
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 5 * pulse;
            ctx.font = 'bold 18px monospace';
            ctx.fillText('PRESS ENTER TO START', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT - 100);
            ctx.shadowBlur = 0;
        }

        // Controls (Small at bottom)
        ctx.fillStyle = '#aaaaaa';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('P1: WASD + SPACE    P2: ARROWS + SHIFT', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT - 40);

        // Credits / Ver
        ctx.fillStyle = '#666666';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(CONFIG.VERSION, CONFIG.CANVAS_WIDTH - 10, CONFIG.CANVAS_HEIGHT - 10);

        ctx.textAlign = 'left';
        ctx.fillText('HIGH SCORE: ' + HighScoreManager.getHighestScore(), 10, CONFIG.CANVAS_HEIGHT - 10);

        ctx.restore();
    }
};
