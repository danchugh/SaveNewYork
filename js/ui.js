function renderHUD(ctx, buildingManager, enemyManager, totalScore) {
    const hudY = 10;
    const bottomHudY = CONFIG.SUBWAY_BOTTOM + 10;
    const players = playerManager.players;
    const numPlayers = players.length;

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
    // SCORE (combined or show both)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px monospace';

    if (numPlayers === 1) {
        ctx.fillText('SCORE', CONFIG.CANVAS_WIDTH / 2 - 40, hudY + 16);
        const scoreStr = String(totalScore || 0).padStart(6, '0');
        ctx.fillText(scoreStr, CONFIG.CANVAS_WIDTH / 2 + 30, hudY + 16);
    } else {
        // 2P mode - show combined score in center
        const combinedScore = playerManager.getTotalScore();
        ctx.fillText('TOTAL', CONFIG.CANVAS_WIDTH / 2, hudY + 10);
        const scoreStr = String(combinedScore || 0).padStart(6, '0');
        ctx.fillText(scoreStr, CONFIG.CANVAS_WIDTH / 2, hudY + 24);
    }

    // WAVE (below score in 2P, or to the side in 1P)
    if (numPlayers === 1) {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('WAVE', 200, hudY + 16);
        ctx.fillText(`${enemyManager.waveNumber}-1`, 258, hudY + 16);

        // DMG (for 1P mode, on right)
        const destruction = Math.floor(buildingManager.getDestructionPercentage() * 100);
        const dmgColor = destruction > 60 ? '#ff3300' : destruction > 30 ? '#ffaa00' : '#ffffff';
        ctx.fillStyle = dmgColor;
        ctx.fillText('DMG', CONFIG.CANVAS_WIDTH - 220, hudY + 16);
        ctx.fillText(`${destruction}%`, CONFIG.CANVAS_WIDTH - 175, hudY + 16);
    }

    // === BOTTOM HUD ===
    ctx.textAlign = 'center';
    const destruction = Math.floor(buildingManager.getDestructionPercentage() * 100);
    const cityStatusColor = destruction > 60 ? '#ef4444' : destruction > 30 ? '#fbbf24' : CONFIG.COLORS.HUD_TEXT;
    ctx.fillStyle = cityStatusColor;

    ctx.fillStyle = CONFIG.COLORS.HUD_TEXT;
    if (enemyManager.boss && enemyManager.boss.active) {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('!! BOSS BATTLE !!', CONFIG.CANVAS_WIDTH / 2, bottomHudY + 16);
    } else if (enemyManager.miniBoss && enemyManager.miniBoss.active) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 18px monospace';
        const type = enemyManager.miniBoss.type.toUpperCase();
        ctx.fillText(`!! MINI-BOSS: ${type} !!`, CONFIG.CANVAS_WIDTH / 2, bottomHudY + 16);
    } else if (enemyManager.betweenWaves) {
        ctx.fillText(`WAVE ${enemyManager.waveNumber + 1} INCOMING...`, CONFIG.CANVAS_WIDTH / 2, bottomHudY + 16);
    } else {
        const multiplier = DayCycle.getScoreMultiplier();
        const timeDisplay = DayCycle.getDisplayName();
        let waveText = `WAVE ${enemyManager.waveNumber} - ${timeDisplay}`;
        if (multiplier > 1) {
            waveText += ` (x${multiplier})`;
        }
        ctx.fillText(waveText, CONFIG.CANVAS_WIDTH / 2, bottomHudY + 16);
    }

    // Enemies remaining (right side)
    ctx.textAlign = 'right';
    ctx.font = '18px monospace';
    ctx.fillStyle = CONFIG.COLORS.HUD_TEXT;
    const enemiesLeft = enemyManager.enemiesRemainingInWave + enemyManager.enemies.length;
    if (!enemyManager.boss) {
        ctx.fillText(`ENEMIES: ${enemiesLeft}`, CONFIG.CANVAS_WIDTH - 20, bottomHudY + 16);
    }

    // DMG in 2P mode (bottom center)
    if (numPlayers >= 2) {
        ctx.textAlign = 'left';
        const dmgColor = destruction > 60 ? '#ff3300' : destruction > 30 ? '#ffaa00' : '#ffffff';
        ctx.fillStyle = dmgColor;
        ctx.fillText(`CITY DMG: ${destruction}%`, 20, bottomHudY + 16);
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
}
