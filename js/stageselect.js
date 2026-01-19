// Stage Select Screen
const StageSelect = {
    selectedZone: 1,

    init() {
        this.selectedZone = 1;
    },

    update(deltaTime) {
        // Handle input
        if (input.isKeyPressed('ArrowUp') || input.isKeyPressed('KeyW')) {
            this.selectedZone = Math.max(1, this.selectedZone - 1);
        }
        if (input.isKeyPressed('ArrowDown') || input.isKeyPressed('KeyS')) {
            this.selectedZone = Math.min(CONFIG.TOTAL_ZONES, this.selectedZone + 1);
        }

        // Check if zone is unlocked before allowing selection
        if (input.isKeyPressed('Enter') || input.isKeyPressed('Space')) {
            if (game.zoneUnlocked[this.selectedZone - 1]) {
                initGame(1, this.selectedZone);
            }
        }

        // Back to title
        if (input.isKeyPressed('Escape')) {
            game.state = GameState.TITLE;
        }
    },

    render(ctx) {
        // Background
        ctx.fillStyle = '#0a0a15';
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // Title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SELECT ZONE', CONFIG.CANVAS_WIDTH / 2, 120);

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
                ctx.fillText('>', CONFIG.CANVAS_WIDTH / 2 - 150, y);
            }

            // Zone name
            ctx.fillStyle = isUnlocked ? (isSelected ? '#ffcc00' : '#ffffff') : '#666666';
            ctx.font = isSelected ? 'bold 28px monospace' : '24px monospace';
            ctx.fillText(`ZONE ${i}: ${zone.name.toUpperCase()}`, CONFIG.CANVAS_WIDTH / 2, y);

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
    }
};
