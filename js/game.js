// ============================================
// GAME CONSTANTS
// ============================================
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;

// ============================================
// GAME STATE
// ============================================
const GameState = {
    TITLE: 'title',
    PLAYING: 'playing',
    GAME_OVER: 'gameover',
    VICTORY: 'victory'
};

const game = {
    state: GameState.TITLE,
    lastTime: 0,
    deltaTime: 0,
    score: 0,
    finalWave: 0,
    highScoreRank: 0
};

// ============================================
// CANVAS SETUP
// ============================================
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
canvas.width = CONFIG.CANVAS_WIDTH;
canvas.height = CONFIG.CANVAS_HEIGHT;

// Initialize input and sound
input.init();
SoundManager.init();

// Initialize game
function initGame() {
    buildingManager.init();
    player.reset();
    projectileManager.clear();
    enemyManager.reset();
    enemyManager.startWave(1);
    civilianManager.reset();
    DayCycle.reset();
    game.score = 0;
    game.state = GameState.PLAYING;
}

// ============================================
// COLLISION DETECTION
// ============================================
function checkCollisions() {
    // Player projectiles vs buildings
    const playerProjectiles = projectileManager.getPlayerProjectiles();

    for (const proj of playerProjectiles) {
        if (!proj.active) continue;

        for (const building of buildingManager.buildings) {
            for (let row = 0; row < building.heightBlocks; row++) {
                for (let col = 0; col < building.widthBlocks; col++) {
                    if (!building.blocks[row][col]) continue;

                    const blockPos = building.getBlockWorldPosition(row, col);
                    if (circleRectIntersects(
                        { x: proj.x, y: proj.y, radius: proj.radius },
                        blockPos
                    )) {
                        building.destroyBlock(row, col);
                        proj.active = false;
                        break;
                    }
                }
                if (!proj.active) break;
            }
            if (!proj.active) break;
        }
    }

    // Player projectiles vs enemies
    for (const proj of playerProjectiles) {
        if (!proj.active) continue;

        for (const enemy of enemyManager.enemies) {
            if (!enemy.active) continue;

            const dist = Math.sqrt(
                Math.pow(proj.x - enemy.x, 2) +
                Math.pow(proj.y - enemy.y, 2)
            );

            if (dist < proj.radius + enemy.width / 2) {
                enemy.die();
                proj.active = false;
                game.score += Math.floor(100 * DayCycle.getScoreMultiplier());
                break;
            }
        }
    }

    // Player vs buildings (if flying)
    if (player.state === 'flying') {
        const playerBounds = getPlayerBounds(player);

        for (const building of buildingManager.buildings) {
            for (let row = 0; row < building.heightBlocks; row++) {
                for (let col = 0; col < building.widthBlocks; col++) {
                    if (!building.blocks[row][col]) continue;

                    const blockPos = building.getBlockWorldPosition(row, col);
                    if (rectIntersects(playerBounds, blockPos)) {
                        player.die();
                        return;
                    }
                }
            }
        }
    }

    // Player vs enemies
    if (player.state === 'flying') {
        const playerBounds = getPlayerBounds(player);

        for (const enemy of enemyManager.enemies) {
            if (!enemy.active) continue;

            const enemyBounds = {
                x: enemy.x - enemy.width / 2,
                y: enemy.y - enemy.height / 2,
                width: enemy.width,
                height: enemy.height
            };

            if (rectIntersects(playerBounds, enemyBounds)) {
                player.die();
                break;
            }
        }
    }

    // Player projectiles vs boss
    if (enemyManager.boss && enemyManager.boss.active) {
        for (const proj of playerProjectiles) {
            if (!proj.active) continue;

            const boss = enemyManager.boss;
            const dist = Math.sqrt(
                Math.pow(proj.x - boss.x, 2) +
                Math.pow(proj.y - boss.y, 2)
            );

            if (dist < proj.radius + boss.width / 2) {
                proj.active = false;
                const defeated = boss.takeDamage();
                game.score += 50;
                SoundManager.bossHit();

                if (defeated) {
                    game.finalWave = enemyManager.waveNumber;
                    game.highScoreRank = HighScoreManager.addScore(game.score, game.finalWave);
                    game.state = GameState.VICTORY;
                    SoundManager.victory();
                    console.log('BOSS DEFEATED! VICTORY!');
                }
                break;
            }
        }

        // Player vs boss
        if (player.state === 'flying') {
            const playerBounds = getPlayerBounds(player);
            const boss = enemyManager.boss;
            const bossBounds = {
                x: boss.x - boss.width / 2,
                y: boss.y - boss.height / 2,
                width: boss.width,
                height: boss.height
            };

            if (rectIntersects(playerBounds, bossBounds)) {
                player.die();
            }
        }
    }

    // Enemy projectiles vs player
    const enemyProjectiles = projectileManager.getEnemyProjectiles();
    if (player.state === 'flying') {
        const playerBounds = getPlayerBounds(player);

        for (const proj of enemyProjectiles) {
            if (!proj.active) continue;

            if (circleRectIntersects(
                { x: proj.x, y: proj.y, radius: proj.radius },
                playerBounds
            )) {
                player.die();
                proj.active = false;
                break;
            }
        }
    }

    // Enemy projectiles vs buildings
    for (const proj of enemyProjectiles) {
        if (!proj.active) continue;

        for (const building of buildingManager.buildings) {
            for (let row = 0; row < building.heightBlocks; row++) {
                for (let col = 0; col < building.widthBlocks; col++) {
                    if (!building.blocks[row][col]) continue;

                    const blockPos = building.getBlockWorldPosition(row, col);
                    if (circleRectIntersects(
                        { x: proj.x, y: proj.y, radius: proj.radius },
                        blockPos
                    )) {
                        building.destroyBlock(row, col);
                        proj.active = false;
                        break;
                    }
                }
                if (!proj.active) break;
            }
            if (!proj.active) break;
        }
    }

    // Check city destruction percentage
    if (buildingManager.getDestructionPercentage() >= CONFIG.CITY_DESTRUCTION_THRESHOLD) {
        game.finalWave = enemyManager.waveNumber;
        game.highScoreRank = HighScoreManager.addScore(game.score, game.finalWave);
        game.state = GameState.GAME_OVER;
        SoundManager.gameOver();
        console.log('City destroyed! Game Over!');
    }

    // Check player lives
    if (player.lives <= 0) {
        game.finalWave = enemyManager.waveNumber;
        game.highScoreRank = HighScoreManager.addScore(game.score, game.finalWave);
        game.state = GameState.GAME_OVER;
        SoundManager.gameOver();
        console.log('No lives remaining! Game Over!');
    }
}

// ============================================
// GAME LOOP
// ============================================
function update(deltaTime) {
    switch (game.state) {
        case GameState.TITLE:
            if (input.isKeyJustPressed(Keys.ENTER)) {
                SoundManager.init(); // Ensure audio context is ready
                SoundManager.gameStart();
                initGame();
                console.log('Game started!');
            }
            break;
        case GameState.PLAYING:
            player.update(game.deltaTime);
            projectileManager.update(game.deltaTime);
            enemyManager.update(game.deltaTime, player.x, player.y, projectileManager);
            buildingManager.update(game.deltaTime);
            civilianManager.update(game.deltaTime);

            // Check civilian rescue
            const rescued = civilianManager.checkRescue(player.x, player.y, player.state);
            game.score += rescued * 500;

            checkCollisions();
            break;
        case GameState.GAME_OVER:
            if (input.isKeyJustPressed(Keys.ENTER)) {
                game.state = GameState.TITLE;
            }
            break;
        case GameState.VICTORY:
            if (input.isKeyJustPressed(Keys.ENTER)) {
                game.state = GameState.TITLE;
            }
            break;
    }

    // Clear just pressed at end of frame
    input.clearJustPressed();
}

function render() {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // Render based on state
    switch (game.state) {
        case GameState.TITLE:
            renderTitle();
            break;
        case GameState.PLAYING:
            renderGame();
            break;
        case GameState.GAME_OVER:
            renderGameOver();
            break;
        case GameState.VICTORY:
            renderVictory();
            break;
    }
}

function renderTitle() {
    // Draw sky background
    ctx.fillStyle = CONFIG.COLORS.SKY;
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // Draw building silhouettes (scaled for 960x720)
    ctx.fillStyle = '#1a1a2e';
    const silhouettes = [
        { x: 80, w: 70, h: 220 },
        { x: 180, w: 90, h: 450 },
        { x: 310, w: 60, h: 300 },
        { x: 420, w: 110, h: 520 },
        { x: 580, w: 70, h: 340 },
        { x: 700, w: 80, h: 250 },
        { x: 820, w: 90, h: 380 }
    ];
    silhouettes.forEach(s => {
        ctx.fillRect(s.x, CONFIG.CANVAS_HEIGHT - s.h, s.w, s.h);
    });

    // Title
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 72px monospace';
    ctx.fillText('SAVE', CONFIG.CANVAS_WIDTH / 2, 160);
    ctx.fillStyle = '#4ade80';
    ctx.fillText('NEW YORK', CONFIG.CANVAS_WIDTH / 2, 240);

    // Subtitle
    ctx.fillStyle = '#fff';
    ctx.font = '20px monospace';
    ctx.fillText('Defend the city from alien invasion!', CONFIG.CANVAS_WIDTH / 2, 300);

    // Controls
    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px monospace';
    ctx.fillText('LEFT / RIGHT - Turn', CONFIG.CANVAS_WIDTH / 2, 380);
    ctx.fillText('UP / DOWN - Speed up / Slow down', CONFIG.CANVAS_WIDTH / 2, 405);
    ctx.fillText('SPACE - Fire', CONFIG.CANVAS_WIDTH / 2, 430);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Fly over pads to refuel', CONFIG.CANVAS_WIDTH / 2, 465);

    // High Scores
    const highScores = HighScoreManager.getScores();
    let startPromptY = 580;

    if (highScores.length > 0) {
        startPromptY = 640; // Move start prompt down if scores are shown

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('HIGH SCORES', CONFIG.CANVAS_WIDTH / 2, 510);

        ctx.font = '14px monospace';
        const topScores = highScores.slice(0, 5);
        topScores.forEach((entry, index) => {
            const rank = index + 1;
            const scoreText = `${rank}. ${entry.score.toString().padStart(6, ' ')}  Wave ${entry.wave}`;
            ctx.fillStyle = index === 0 ? '#fbbf24' : '#fff';
            ctx.fillText(scoreText, CONFIG.CANVAS_WIDTH / 2, 535 + index * 20);
        });
    }

    // Start prompt (blinking)
    if (Math.floor(Date.now() / 500) % 2 === 0) {
        ctx.fillStyle = '#4ade80';
        ctx.font = '24px monospace';
        ctx.fillText('Press ENTER to Start', CONFIG.CANVAS_WIDTH / 2, startPromptY);
    }

    // Draw green border
    ctx.strokeStyle = CONFIG.COLORS.BORDER;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, CONFIG.CANVAS_WIDTH - 4, CONFIG.CANVAS_HEIGHT - 4);
}

function renderGame() {
    // Draw sky
    ctx.fillStyle = DayCycle.getSkyColor();
    ctx.fillRect(0, CONFIG.SKY_TOP, CONFIG.CANVAS_WIDTH, CONFIG.STREET_Y - CONFIG.SKY_TOP);

    // Draw buildings
    buildingManager.render(ctx);

    // Draw civilians
    civilianManager.render(ctx);

    // Draw enemies
    enemyManager.render(ctx);

    // Draw player
    player.render(ctx);

    // Draw projectiles
    projectileManager.render(ctx);

    // Draw street
    ctx.fillStyle = DayCycle.getStreetColor();
    ctx.fillRect(0, CONFIG.STREET_Y, CONFIG.CANVAS_WIDTH, CONFIG.SUBWAY_TOP - CONFIG.STREET_Y);

    // Draw subway background
    ctx.fillStyle = CONFIG.COLORS.SUBWAY_BG;
    ctx.fillRect(0, CONFIG.SUBWAY_TOP, CONFIG.CANVAS_WIDTH, CONFIG.SUBWAY_BOTTOM - CONFIG.SUBWAY_TOP);

    // Draw subway tunnel (decorative arch)
    ctx.fillStyle = CONFIG.COLORS.SUBWAY_TUNNEL;
    ctx.beginPath();
    ctx.ellipse(CONFIG.CANVAS_WIDTH / 2, CONFIG.SUBWAY_BOTTOM, 280, 50, 0, Math.PI, 0);
    ctx.fill();

    // Draw refuel pads
    ctx.fillStyle = CONFIG.COLORS.HUD_TEXT;
    ctx.fillRect(
        CONFIG.REFUEL_PAD_LEFT.x - CONFIG.REFUEL_PAD_WIDTH / 2,
        CONFIG.REFUEL_PAD_LEFT.y - CONFIG.REFUEL_PAD_HEIGHT,
        CONFIG.REFUEL_PAD_WIDTH,
        CONFIG.REFUEL_PAD_HEIGHT
    );
    ctx.fillRect(
        CONFIG.REFUEL_PAD_RIGHT.x - CONFIG.REFUEL_PAD_WIDTH / 2,
        CONFIG.REFUEL_PAD_RIGHT.y - CONFIG.REFUEL_PAD_HEIGHT,
        CONFIG.REFUEL_PAD_WIDTH,
        CONFIG.REFUEL_PAD_HEIGHT
    );

    // Draw HUD background (top)
    ctx.fillStyle = CONFIG.COLORS.HUD_BG;
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.SKY_TOP);

    // Draw HUD background (bottom)
    ctx.fillRect(0, CONFIG.SUBWAY_BOTTOM, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT - CONFIG.SUBWAY_BOTTOM);

    // Draw border
    ctx.strokeStyle = CONFIG.COLORS.BORDER;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, CONFIG.CANVAS_WIDTH - 4, CONFIG.CANVAS_HEIGHT - 4);

    // Draw HUD
    renderHUD(ctx, player, buildingManager, enemyManager, game.score);
}

function renderGameOver() {
    // Draw the game state in background
    renderGame();

    // Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    ctx.textAlign = 'center';

    // Game Over text
    ctx.fillStyle = '#ef4444';
    ctx.font = '64px monospace';
    ctx.fillText('GAME OVER', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 - 80);

    // High score notification
    if (game.highScoreRank > 0) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 24px monospace';
        ctx.fillText(`NEW HIGH SCORE! Rank #${game.highScoreRank}`, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 - 30);
    }

    // Final score
    ctx.fillStyle = '#fff';
    ctx.font = '28px monospace';
    ctx.fillText(`Final Score: ${game.score}`, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 10);

    // City destruction
    const destruction = Math.floor(buildingManager.getDestructionPercentage() * 100);
    ctx.fillText(`City Destroyed: ${destruction}%`, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 50);

    // Restart prompt
    ctx.fillStyle = '#4ade80';
    ctx.font = '20px monospace';
    ctx.fillText('Press ENTER to try again', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 110);
}

function renderVictory() {
    // Draw the game state in background
    renderGame();

    // Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    ctx.textAlign = 'center';

    // Victory text
    ctx.fillStyle = '#fbbf24';
    ctx.font = '64px monospace';
    ctx.fillText('VICTORY!', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 - 100);

    ctx.fillStyle = '#4ade80';
    ctx.font = '32px monospace';
    ctx.fillText('NEW YORK IS SAVED!', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 - 50);

    // High score notification
    if (game.highScoreRank > 0) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 24px monospace';
        ctx.fillText(`NEW HIGH SCORE! Rank #${game.highScoreRank}`, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 - 10);
    }

    // Final score
    ctx.fillStyle = '#fff';
    ctx.font = '28px monospace';
    ctx.fillText(`Final Score: ${game.score}`, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 30);

    // Stats
    const destruction = Math.floor(buildingManager.getDestructionPercentage() * 100);
    ctx.font = '20px monospace';
    ctx.fillText(`City Damage: ${destruction}%`, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 70);
    ctx.fillText(`Lives Remaining: ${player.lives}`, CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 100);

    // Restart prompt
    ctx.fillStyle = '#4ade80';
    ctx.fillText('Press ENTER to play again', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2 + 150);
}

function gameLoop(currentTime) {
    // Calculate delta time
    game.deltaTime = (currentTime - game.lastTime) / 1000; // Convert to seconds
    game.lastTime = currentTime;

    // Cap delta time to prevent huge jumps
    if (game.deltaTime > 0.1) game.deltaTime = 0.1;

    update(game.deltaTime);
    render();

    requestAnimationFrame(gameLoop);
}

// ============================================
// START GAME
// ============================================
console.log('Save New York - Game Initialized');
requestAnimationFrame(gameLoop);
