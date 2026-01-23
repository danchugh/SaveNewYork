// Stage Select Screen
const StageSelect = {
    selectedZone: 1,
    previousZone: 1,
    transitionAlpha: 0,      // 0 = showing previous, 1 = showing current
    transitionSpeed: 3,      // Alpha change per second (crossfade speed)

    init() {
        this.selectedZone = 1;
        this.previousZone = 1;
        this.transitionAlpha = 1; // Start fully showing zone 1
    },

    update(deltaTime) {
        // Handle input
        let zoneChanged = false;

        if (input.isKeyJustPressed('ArrowUp') || input.isKeyJustPressed('KeyW') || input.isKeyJustPressed('w') || input.isKeyJustPressed('W')) {
            const newZone = Math.max(1, this.selectedZone - 1);
            if (newZone !== this.selectedZone) {
                this.previousZone = this.selectedZone;
                this.selectedZone = newZone;
                this.transitionAlpha = 0;
                zoneChanged = true;
            }
        }
        if (input.isKeyJustPressed('ArrowDown') || input.isKeyJustPressed('KeyS') || input.isKeyJustPressed('s') || input.isKeyJustPressed('S')) {
            const newZone = Math.min(CONFIG.TOTAL_ZONES, this.selectedZone + 1);
            if (newZone !== this.selectedZone) {
                this.previousZone = this.selectedZone;
                this.selectedZone = newZone;
                this.transitionAlpha = 0;
                zoneChanged = true;
            }
        }

        // Update crossfade transition
        if (this.transitionAlpha < 1) {
            this.transitionAlpha = Math.min(1, this.transitionAlpha + this.transitionSpeed * deltaTime);
        }

        // Check if zone is unlocked before allowing selection
        if (input.isKeyJustPressed('Enter') || input.isKeyJustPressed('Space')) {
            if (game.zoneUnlocked[this.selectedZone - 1]) {
                // Get player count from intro screen selection
                const playerCount = (typeof IntroManager !== 'undefined') ? IntroManager.state.selectedPlayers : 1;
                initGame(playerCount, this.selectedZone);
            }
        }

        // Back to title
        if (input.isKeyJustPressed('Escape')) {
            game.state = GameState.TITLE;
        }
    },

    render(ctx) {
        // Draw zone background images with crossfade
        this.renderBackground(ctx);

        // Dark overlay for readability
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#000000';
        ctx.fillText('SELECT ZONE', CONFIG.CANVAS_WIDTH / 2, 120);
        ctx.shadowBlur = 0;

        // Zone options
        const startY = 220;
        const spacing = 80;

        for (let i = 1; i <= CONFIG.TOTAL_ZONES; i++) {
            const zone = CONFIG.ZONES[i];
            const y = startY + (i - 1) * spacing;
            const isSelected = this.selectedZone === i;
            const isUnlocked = game.zoneUnlocked[i - 1];

            // Selection indicator
            if (isSelected) {
                ctx.fillStyle = '#ffcc00';
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#ffcc00';
                ctx.fillText('>', CONFIG.CANVAS_WIDTH / 2 - 150, y);
                ctx.shadowBlur = 0;
            }

            // Zone name
            ctx.fillStyle = isUnlocked ? (isSelected ? '#ffcc00' : '#ffffff') : '#666666';
            ctx.font = isSelected ? 'bold 28px monospace' : '24px monospace';
            ctx.shadowBlur = isSelected ? 10 : 0;
            ctx.shadowColor = isSelected ? '#ffcc00' : '#000000';
            ctx.fillText(`ZONE ${i}: ${zone.name.toUpperCase()}`, CONFIG.CANVAS_WIDTH / 2, y);
            ctx.shadowBlur = 0;

            // Lock indicator
            if (!isUnlocked) {
                ctx.fillStyle = '#ff4444';
                ctx.font = '16px monospace';
                ctx.fillText('[LOCKED - Complete Zone 1]', CONFIG.CANVAS_WIDTH / 2, y + 25);
            }
        }

        // Instructions
        ctx.fillStyle = '#888888';
        ctx.font = '14px monospace';
        ctx.fillText('UP/DOWN to select, ENTER to start, ESC for title', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT - 50);
    },

    renderBackground(ctx) {
        const prevBg = AssetManager.getImage(`zone${this.previousZone}_bg`);
        const currBg = AssetManager.getImage(`zone${this.selectedZone}_bg`);

        // Draw previous zone background (fading out)
        if (prevBg && this.transitionAlpha < 1) {
            ctx.globalAlpha = 1 - this.transitionAlpha;
            ctx.drawImage(prevBg, 0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        }

        // Draw current zone background (fading in)
        if (currBg) {
            ctx.globalAlpha = this.transitionAlpha;
            ctx.drawImage(currBg, 0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        } else {
            // Fallback: solid color if image not loaded
            ctx.globalAlpha = 1;
            ctx.fillStyle = this.selectedZone === 1 ? '#1a1a2e' : '#2d1810';
            ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        }

        ctx.globalAlpha = 1;
    }
};
