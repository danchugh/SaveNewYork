function renderHUD(ctx, player, buildingManager, enemyManager, score) {
    const hudY = 10;
    const bottomHudY = CONFIG.SUBWAY_BOTTOM + 10;

    ctx.font = '18px monospace';
    ctx.textAlign = 'left';

    // Top HUD - Left side: Fuel
    ctx.fillStyle = CONFIG.COLORS.HUD_TEXT;
    ctx.fillText(`FUEL`, 20, hudY + 18);

    // Fuel bar (next to label)
    const fuelBarWidth = 120;
    const fuelBarHeight = 10;
    const fuelBarX = 80;
    const fuelBarY = hudY + 8;

    ctx.fillStyle = '#333';
    ctx.fillRect(fuelBarX, fuelBarY, fuelBarWidth, fuelBarHeight);

    const fuelPercent = player.fuel / CONFIG.FUEL_MAX;
    const fuelColor = fuelPercent > 0.3 ? '#4ade80' : fuelPercent > 0.1 ? '#fbbf24' : '#ef4444';
    ctx.fillStyle = fuelColor;
    ctx.fillRect(fuelBarX, fuelBarY, fuelBarWidth * fuelPercent, fuelBarHeight);

    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 1;
    ctx.strokeRect(fuelBarX, fuelBarY, fuelBarWidth, fuelBarHeight);

    // Top HUD - Center: Score
    ctx.textAlign = 'center';
    ctx.fillStyle = CONFIG.COLORS.HUD_TEXT;
    ctx.fillText(`SCORE: ${score || 0}`, CONFIG.CANVAS_WIDTH / 2, hudY + 18);

    // Top HUD - Right side: Lives
    ctx.textAlign = 'right';
    ctx.fillText(`LIVES: ${player.lives}`, CONFIG.CANVAS_WIDTH - 20, hudY + 18);

    // Bottom HUD - City destruction
    ctx.textAlign = 'left';
    const destruction = Math.floor(buildingManager.getDestructionPercentage() * 100);
    const cityColor = destruction > 60 ? '#ef4444' : destruction > 30 ? '#fbbf24' : CONFIG.COLORS.HUD_TEXT;
    ctx.fillStyle = cityColor;
    ctx.fillText(`CITY DAMAGE: ${destruction}%`, 20, bottomHudY + 16);

    // Bottom HUD - Wave indicator with time of day
    ctx.textAlign = 'center';
    ctx.fillStyle = CONFIG.COLORS.HUD_TEXT;
    if (enemyManager.boss && enemyManager.boss.active) {
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 20px monospace';
        ctx.fillText('!! BOSS BATTLE !!', CONFIG.CANVAS_WIDTH / 2, bottomHudY + 16);
    } else if (enemyManager.betweenWaves) {
        ctx.fillText(`WAVE ${enemyManager.waveNumber + 1} INCOMING...`, CONFIG.CANVAS_WIDTH / 2, bottomHudY + 16);
    } else {
        // Show wave with time of day and multiplier
        const multiplier = DayCycle.getScoreMultiplier();
        const timeDisplay = DayCycle.getDisplayName();
        let waveText = `WAVE ${enemyManager.waveNumber} - ${timeDisplay}`;
        if (multiplier > 1) {
            waveText += ` (x${multiplier})`;
        }
        ctx.fillText(waveText, CONFIG.CANVAS_WIDTH / 2, bottomHudY + 16);
    }

    // Bottom HUD - Right: Enemies remaining
    ctx.textAlign = 'right';
    ctx.font = '18px monospace';
    ctx.fillStyle = CONFIG.COLORS.HUD_TEXT;
    const enemiesLeft = enemyManager.enemiesRemainingInWave + enemyManager.enemies.length;
    if (!enemyManager.boss) {
        ctx.fillText(`ENEMIES: ${enemiesLeft}`, CONFIG.CANVAS_WIDTH - 20, bottomHudY + 16);
    }

    // Refuel indicator (center screen overlay)
    if (player.state === 'refueling') {
        const refuelProgress = player.refuelTimer / CONFIG.REFUEL_TIME;
        ctx.textAlign = 'center';
        ctx.font = '24px monospace';
        ctx.fillStyle = '#4ade80';
        ctx.fillText(`REFUELING... ${Math.floor(refuelProgress * 100)}%`, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2);
    }

    // Speed indicator (small, bottom left corner of play area)
    ctx.textAlign = 'left';
    ctx.font = '12px monospace';
    ctx.fillStyle = '#ffffff88';
    const speedPercent = Math.floor((player.currentSpeed / CONFIG.PLAYER_MAX_SPEED) * 100);
    ctx.fillText(`SPD: ${speedPercent}%`, 20, CONFIG.STREET_Y - 10);
}

