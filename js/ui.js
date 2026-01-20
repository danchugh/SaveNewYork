function renderHUD(ctx, buildingManager, enemyManager, totalScore) {
    const hudY = 10;
    const bottomHudY = CONFIG.SUBWAY_BOTTOM + 10;
    const players = playerManager.players;
    const numPlayers = players.length;

    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';

    // VERSION DISPLAY (top-right corner for debugging)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#666666';
    ctx.font = '10px monospace';
    ctx.fillText(CONFIG.VERSION || 'v?', CONFIG.CANVAS_WIDTH - 5, 12);
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';

    // === TOP HUD - PLAYER 1 (Left Side) ===
    const p1 = players[0];
    if (p1) {
        renderPlayerHUD(ctx, p1, 20, hudY, 'P1', '#00d4aa');
    }

    // === TOP HUD - PLAYER 2 (Right Side, if 2P mode) ===
    if (numPlayers >= 2) {
        const p2 = players[1];
        if (p2) {
            renderPlayerHUD(ctx, p2, CONFIG.CANVAS_WIDTH - 200, hudY, 'P2', '#ff00aa');
        }
    }

    // === CENTER HUD ===
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';

    if (numPlayers === 1) {
        // 1P: Score in center
        ctx.fillText('SCORE', CONFIG.CANVAS_WIDTH / 2 - 40, hudY + 16);
        // Use game.score (or p1.score since they are same for 1P)
        const scoreStr = String(typeof game !== 'undefined' ? game.score : 0).padStart(6, '0');
        ctx.fillText(scoreStr, CONFIG.CANVAS_WIDTH / 2 + 30, hudY + 16);

        // Wave: Left side
        ctx.textAlign = 'left';
        ctx.fillText('WAVE', 280, hudY + 16);
        ctx.fillText(`${game.currentZone}-${enemyManager.waveNumber}`, 338, hudY + 16);

        // DMG: Right side
        const destruction = Math.floor(buildingManager.getDestructionPercentage() * 100);
        const dmgColor = destruction > 60 ? '#ff3300' : destruction > 30 ? '#ffaa00' : '#ffffff';
        ctx.fillStyle = dmgColor;
        ctx.fillText('DMG', CONFIG.CANVAS_WIDTH - 220, hudY + 16);
        ctx.fillText(`${destruction}%`, CONFIG.CANVAS_WIDTH - 175, hudY + 16);

    } else {
        // 2P: Wave and DMG in center (individual scores handled in renderPlayerHUD)

        // Wave
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        const waveText = `WAVE ${game.currentZone}-${enemyManager.waveNumber}`;
        ctx.fillText(waveText, CONFIG.CANVAS_WIDTH / 2, hudY + 10);

        // DMG
        const destruction = Math.floor(buildingManager.getDestructionPercentage() * 100);
        const dmgColor = destruction > 60 ? '#ff3300' : destruction > 30 ? '#ffaa00' : '#ffffff';
        ctx.fillStyle = dmgColor;
        ctx.fillText(`DMG: ${destruction}%`, CONFIG.CANVAS_WIDTH / 2, hudY + 28);
    }


    // Refuel indicators (for any player refueling)
    for (const p of players) {
        if (p.state === 'refueling') {
            const refuelProgress = p.refuelTimer / CONFIG.REFUEL_TIME;
            ctx.textAlign = 'center';
            ctx.font = '20px monospace';
            ctx.fillStyle = p.id === 1 ? '#00d4aa' : '#ff00aa';
            const yOffset = p.id === 1 ? 0 : 30;
            ctx.fillText(`P${p.id} REFUELING... ${Math.floor(refuelProgress * 100)}%`,
                CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + yOffset);
        }
    }
}

// Helper function to render individual player HUD section
function renderPlayerHUD(ctx, p, x, y, label, color) {
    ctx.textAlign = 'left';
    ctx.font = 'bold 12px monospace';

    // Player label
    ctx.fillStyle = color;
    ctx.fillText(label, x, y + 12);

    // Fuel blocks
    const fuelBlocks = 8;
    const blockWidth = 8;
    const blockHeight = 10;
    const blockSpacing = 2;
    const fuelBlockX = x + 25;
    const fuelBlockY = y + 3;

    const fuelPercent = p.fuel / CONFIG.FUEL_MAX;
    const filledBlocks = Math.ceil(fuelPercent * fuelBlocks);

    for (let i = 0; i < fuelBlocks; i++) {
        const bx = fuelBlockX + i * (blockWidth + blockSpacing);

        if (i < filledBlocks) {
            if (fuelPercent > 0.6) {
                ctx.fillStyle = '#ff8800';
            } else if (fuelPercent > 0.3) {
                ctx.fillStyle = '#ffaa00';
            } else {
                ctx.fillStyle = '#ff3300';
            }
        } else {
            ctx.fillStyle = '#333333';
        }

        ctx.fillRect(bx, fuelBlockY, blockWidth, blockHeight);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, fuelBlockY, blockWidth, blockHeight);
    }

    // Lives (ship icons)
    const shipBaseX = x + 120;
    const shipY = y + 10;
    const shipSpacing = 14;

    for (let i = 0; i < p.lives; i++) {
        const sx = shipBaseX + i * shipSpacing;

        ctx.save();
        ctx.translate(sx, shipY);

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(-3, 4);
        ctx.lineTo(0, 2);
        ctx.lineTo(3, 4);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    // Shield indicator
    if (p.shield) {
        const shieldX = shipBaseX + p.lives * shipSpacing + 5;
        ctx.fillStyle = p.colors.shield;
        ctx.shadowBlur = 5;
        ctx.shadowColor = p.colors.shield;
        ctx.beginPath();
        ctx.arc(shieldX, shipY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('S', shieldX, shipY + 3);
    }

    // Display Score below Name
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    const scoreStr = String(p.score || 0).padStart(6, '0');
    // Align score under the label/fuel area
    ctx.fillText(scoreStr, x, y + 28);
}

// Zone splash screen overlay
let zoneSplashTimer = 0;
let zoneSplashText = '';

function showZoneSplash(zoneName) {
    zoneSplashText = `ENTERING ${zoneName.toUpperCase()}`;
    zoneSplashTimer = 3.0; // 3 seconds
}

function updateZoneSplash(deltaTime) {
    if (zoneSplashTimer > 0) {
        zoneSplashTimer -= deltaTime;
    }
}

function renderZoneSplash(ctx) {
    if (zoneSplashTimer <= 0) return;

    const alpha = Math.min(1, zoneSplashTimer / 0.5); // Fade out in last 0.5s

    ctx.save();
    ctx.globalAlpha = alpha * 0.7;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, CONFIG.CANVAS_HEIGHT / 2 - 50, CONFIG.CANVAS_WIDTH, 100);

    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(zoneSplashText, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 10);
    ctx.restore();
}
