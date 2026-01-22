// ============================================
// GAME CONSTANTS
// ============================================
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;

// ============================================
// GAME STATE
// ============================================
const GameState = {
    LOADING: 'loading',
    TITLE: 'title',
    STAGE_SELECT: 'stageselect',
    PLAYING: 'playing',
    GAME_OVER: 'gameover',
    VICTORY: 'victory'
};

const game = {
    state: GameState.LOADING,
    lastTime: 0,
    deltaTime: 0,
    score: 0,
    nextBonusLifeAt: CONFIG.BONUS_LIFE_THRESHOLD,
    finalWave: 0,
    highScoreRank: 0,
    currentZone: 1,           // Current zone (1 or 2)
    zoneUnlocked: [true, true], // Zone unlock status [zone1, zone2] - Zone 2 enabled for testing
    // Victory screen state
    victoryStartTime: 0,       // When victory state started
    brickCount: 0,             // Number of remaining blocks
    brickBonus: 0,             // Total brick bonus (25 pts × remaining blocks)
    brickTallyDisplayed: 0,    // Current tally being animated
    zoneJustUnlocked: false,   // Flag for showing unlock message
    victoryPhase: 'tally'      // 'tally' | 'complete'
};

// ============================================
// ZONE PROGRESS PERSISTENCE
// ============================================
function saveZoneProgress() {
    localStorage.setItem('zoneUnlocked', JSON.stringify(game.zoneUnlocked));
}

function loadZoneProgress() {
    const saved = localStorage.getItem('zoneUnlocked');
    if (saved) {
        try {
            game.zoneUnlocked = JSON.parse(saved);
        } catch (e) {
            console.warn('Failed to load zone progress:', e);
        }
    }
}

// Helper function to add score and check for bonus lives
// In 2P mode, each player's individual score triggers their own bonus lives
function addScore(points, playerId = null) {
    if (points <= 0) return;

    // Add to game total (for combined tracking/high score)
    game.score += points;

    // Also add to specific player if identified and check for individual bonus lives
    if (playerId && typeof playerManager !== 'undefined') {
        const p = playerManager.getPlayer(playerId);
        if (p) {
            p.score += points;

            // Check for bonus life based on individual player score
            if (!p.nextBonusLifeAt) p.nextBonusLifeAt = CONFIG.BONUS_LIFE_THRESHOLD;

            while (p.score >= p.nextBonusLifeAt) {
                if (p.lives < CONFIG.MAX_LIVES) {
                    p.lives++;
                    console.log(`Bonus life awarded to P${p.id}! Lives: ${p.lives}, Score: ${p.score}`);

                    if (typeof SoundManager !== 'undefined') {
                        SoundManager.oneUp();
                    }
                    if (typeof EffectsManager !== 'undefined') {
                        const xPos = p.id === 1 ? 150 : CONFIG.CANVAS_WIDTH - 150;
                        EffectsManager.addTextPopup(xPos, 60, `P${p.id} 1UP!`, p.colors.shield);
                    }
                }
                p.nextBonusLifeAt += CONFIG.BONUS_LIFE_THRESHOLD;
            }
        }
    }
}

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
if (typeof IntroManager !== 'undefined') IntroManager.init();

// Number of players (1 or 2) - can be set from menu later
let numPlayers = 1;

// Initialize game
function initGame(playerCount = 1, zoneNumber = 1) {
    // Set zone early so all managers can reference it
    game.currentZone = zoneNumber;

    numPlayers = playerCount;
    buildingManager.init(zoneNumber);
    playerManager.init(numPlayers);
    // Legacy compat - point player to P1
    player = playerManager.getPlayer(1);
    projectileManager.clear();
    enemyManager.reset();

    // Inform enemyManager about the zone if supported
    if (enemyManager.setZone) {
        enemyManager.setZone(zoneNumber);
    }

    enemyManager.startWave(1);
    civilianManager.reset();
    DayCycle.init();
    DayCycle.reset();
    BackgroundManager.reset();
    WeatherManager.reset();
    VolcanoManager.reset();
    EffectsManager.reset();
    ConstructionManager.reset();
    PowerupManager.reset();
    if (typeof AbilityManager !== 'undefined') AbilityManager.reset();
    if (typeof HeatShimmer !== 'undefined') HeatShimmer.reset();
    game.score = 0;
    game.nextBonusLifeAt = CONFIG.BONUS_LIFE_THRESHOLD;
    game.state = GameState.PLAYING;

    // Show zone splash
    const zoneName = CONFIG.ZONES[zoneNumber].name;
    showZoneSplash(zoneName);
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
                const wasAlive = enemy.active && enemy.state !== EnemyState.DEAD;
                const wasTankAlive = enemy.type === EnemyType.TANK && enemy.health > 0;

                enemy.die();
                proj.active = false;

                // Calculate score based on enemy type
                let baseScore = 100; // Default score
                if (enemy.type === EnemyType.TANK) {
                    if (wasTankAlive && enemy.health > 0) {
                        // Tank took a hit but still alive
                        baseScore = 50;
                    } else if (wasTankAlive && enemy.health <= 0) {
                        // Tank was killed (final hit bonus)
                        baseScore = 300;
                    }
                } else if (enemy.type === EnemyType.BOMBER) {
                    baseScore = 150;
                } else if (enemy.type === EnemyType.SPLITTER) {
                    baseScore = 75;
                }

                addScore(Math.floor(baseScore * DayCycle.getScoreMultiplier()), proj.ownerId);
                break;
            }
        }
    }

    // Players vs buildings (if flying and not in launch grace period)
    for (const p of playerManager.getActivePlayers()) {
        if (p.state !== 'flying' || p.launchGraceTimer > 0) continue;

        const playerBounds = getPlayerBounds(p);

        for (const building of buildingManager.buildings) {
            let hitBuilding = false;
            for (let row = 0; row < building.heightBlocks && !hitBuilding; row++) {
                for (let col = 0; col < building.widthBlocks && !hitBuilding; col++) {
                    if (!building.blocks[row][col]) continue;

                    const blockPos = building.getBlockWorldPosition(row, col);
                    if (rectIntersects(playerBounds, blockPos)) {
                        hitBuilding = true;
                        const speedRatio = p.currentSpeed / CONFIG.PLAYER_MAX_SPEED;
                        const totalDamage = 3 + Math.floor(speedRatio * 7);

                        let destroyed = 0;
                        for (let dr = -2; dr <= 2 && destroyed < totalDamage; dr++) {
                            for (let dc = -2; dc <= 2 && destroyed < totalDamage; dc++) {
                                const tr = row + dr;
                                const tc = col + dc;
                                if (tr >= 0 && tr < building.heightBlocks &&
                                    tc >= 0 && tc < building.widthBlocks &&
                                    building.blocks[tr][tc]) {
                                    building.destroyBlock(tr, tc);
                                    destroyed++;
                                }
                            }
                        }

                        if (typeof EffectsManager !== 'undefined') {
                            EffectsManager.addExplosion(
                                blockPos.x + blockPos.width / 2,
                                blockPos.y + blockPos.height / 2,
                                30, '#ff8800'
                            );
                        }

                        const bounceX = (p.x < blockPos.x + blockPos.width / 2) ? -1 : 1;
                        const bounceY = (p.y < blockPos.y + blockPos.height / 2) ? -1 : 1;
                        p.takeDamage(bounceX, bounceY);
                    }
                }
            }
        }
    }

    // Players vs enemies (if flying and not in launch grace period)
    for (const p of playerManager.getActivePlayers()) {
        if (p.state !== 'flying' || p.launchGraceTimer > 0) continue;

        const playerBounds = getPlayerBounds(p);

        for (const enemy of enemyManager.enemies) {
            if (!enemy.active) continue;

            const enemyBounds = {
                x: enemy.x - enemy.width / 2,
                y: enemy.y - enemy.height / 2,
                width: enemy.width,
                height: enemy.height
            };

            if (rectIntersects(playerBounds, enemyBounds)) {
                enemy.die();
                const bounceX = (p.x < enemy.x) ? -1 : 1;
                const bounceY = (p.y < enemy.y) ? -1 : 1;
                p.takeDamage(bounceX, bounceY);
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
                addScore(50);
                SoundManager.bossHit();

                if (defeated) {
                    game.finalWave = enemyManager.waveNumber;

                    // Calculate brick bonus (25 pts per remaining block)
                    game.brickCount = buildingManager.getTotalBlockCount();
                    game.brickBonus = game.brickCount * 25;
                    game.brickTallyDisplayed = 0;
                    game.victoryStartTime = Date.now();
                    game.victoryPhase = 'tally';

                    // Check if zone unlock is new
                    game.zoneJustUnlocked = false;
                    if (game.currentZone < CONFIG.TOTAL_ZONES && !game.zoneUnlocked[game.currentZone]) {
                        game.zoneUnlocked[game.currentZone] = true;
                        game.zoneJustUnlocked = true;
                        saveZoneProgress();
                        console.log(`Zone ${game.currentZone + 1} unlocked!`);
                    }

                    // Save high score (before adding brick bonus - that comes via tally)
                    game.highScoreRank = HighScoreManager.addScore(game.score + game.brickBonus, game.finalWave);
                    game.state = GameState.VICTORY;
                    SoundManager.victory();
                    console.log(`BOSS DEFEATED! Brick Bonus: ${game.brickCount} × 25 = ${game.brickBonus}`);
                }
                break;
            }
        }

        // Players vs boss (with grace period protection)
        for (const p of playerManager.getActivePlayers()) {
            if (p.state !== 'flying' || p.launchGraceTimer > 0) continue;

            const playerBounds = getPlayerBounds(p);
            const boss = enemyManager.boss;
            const bossBounds = {
                x: boss.x - boss.width / 2,
                y: boss.y - boss.height / 2,
                width: boss.width,
                height: boss.height
            };

            if (rectIntersects(playerBounds, bossBounds)) {
                boss.takeDamage();
                const bounceX = (p.x < boss.x) ? -1 : 1;
                const bounceY = (p.y < boss.y) ? -1 : 1;
                p.takeDamage(bounceX, bounceY);
            }
        }
    }

    // Player projectiles vs mini-boss
    if (enemyManager.miniBoss && enemyManager.miniBoss.active) {
        for (const proj of playerProjectiles) {
            if (!proj.active) continue;

            const miniBoss = enemyManager.miniBoss;
            const dist = Math.sqrt(
                Math.pow(proj.x - miniBoss.x, 2) +
                Math.pow(proj.y - miniBoss.y, 2)
            );

            if (dist < proj.radius + miniBoss.width / 2) {
                proj.active = false;
                miniBoss.takeDamage();
                addScore(Math.floor(75 * DayCycle.getScoreMultiplier()));
                break;
            }
        }

        // Players vs mini-boss (with grace period protection)
        for (const p of playerManager.getActivePlayers()) {
            if (p.state !== 'flying' || p.launchGraceTimer > 0) continue;

            const playerBounds = getPlayerBounds(p);
            const miniBoss = enemyManager.miniBoss;
            const miniBossBounds = {
                x: miniBoss.x - miniBoss.width / 2,
                y: miniBoss.y - miniBoss.height / 2,
                width: miniBoss.width,
                height: miniBoss.height
            };

            if (rectIntersects(playerBounds, miniBossBounds)) {
                const bounceX = (p.x < miniBoss.x) ? -1 : 1;
                const bounceY = (p.y < miniBoss.y) ? -1 : 1;
                p.takeDamage(bounceX, bounceY);
            }
        }
    }

    // Enemy projectiles vs players (with grace period protection)
    const enemyProjectiles = projectileManager.getEnemyProjectiles();
    for (const p of playerManager.getActivePlayers()) {
        if (p.state !== 'flying' || p.launchGraceTimer > 0) continue;

        const playerBounds = getPlayerBounds(p);

        for (const proj of enemyProjectiles) {
            if (!proj.active) continue;

            if (circleRectIntersects(
                { x: proj.x, y: proj.y, radius: proj.radius },
                playerBounds
            )) {
                const bounceX = Math.cos(proj.angle * Math.PI / 180);
                const bounceY = Math.sin(proj.angle * Math.PI / 180);
                p.takeDamage(-bounceX, -bounceY);
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

    // Volcanic rocks collisions
    if (typeof VolcanoManager !== 'undefined') {
        const rocks = VolcanoManager.getRocks();
        const playerProjectiles = projectileManager.getPlayerProjectiles();

        for (const rock of rocks) {
            // Player projectiles vs rocks (can be shot)
            for (const proj of playerProjectiles) {
                if (!proj.active) continue;
                const dist = Math.sqrt(Math.pow(proj.x - rock.x, 2) + Math.pow(proj.y - rock.y, 2));
                if (dist < proj.radius + rock.size) {
                    proj.active = false;
                    VolcanoManager.destroyRock(rock);
                    addScore(25);
                    break;
                }
            }

            if (!rock.active) continue;

            // Rock vs player (with grace period protection)
            if (player.state === 'flying' && player.launchGraceTimer <= 0) {
                const playerBounds = getPlayerBounds(player);
                if (rock.x > playerBounds.x && rock.x < playerBounds.x + playerBounds.width &&
                    rock.y > playerBounds.y && rock.y < playerBounds.y + playerBounds.height) {
                    // Bounce away from rock impact
                    player.takeDamage(0, -1);
                    VolcanoManager.destroyRock(rock);
                    SoundManager.rockImpact();
                }
            }

            if (!rock.active) continue;

            // Rock vs enemies
            for (const enemy of enemyManager.enemies) {
                if (!enemy.active) continue;
                const dist = Math.sqrt(Math.pow(rock.x - enemy.x, 2) + Math.pow(rock.y - enemy.y, 2));
                if (dist < rock.size + enemy.width / 2) {
                    enemy.die();
                    addScore(Math.floor(100 * DayCycle.getScoreMultiplier()));
                    VolcanoManager.destroyRock(rock);
                    SoundManager.rockImpact();
                    break;
                }
            }

            if (!rock.active) continue;

            // Rock vs buildings
            for (const building of buildingManager.buildings) {
                for (let row = 0; row < building.heightBlocks; row++) {
                    for (let col = 0; col < building.widthBlocks; col++) {
                        if (!building.blocks[row][col]) continue;
                        const pos = building.getBlockWorldPosition(row, col);
                        if (rock.x > pos.x && rock.x < pos.x + pos.width &&
                            rock.y > pos.y && rock.y < pos.y + pos.height) {
                            // Destroy 3 blocks near impact
                            let destroyed = 0;
                            for (let dr = -1; dr <= 1 && destroyed < 3; dr++) {
                                for (let dc = -1; dc <= 1 && destroyed < 3; dc++) {
                                    const nr = row + dr, nc = col + dc;
                                    if (nr >= 0 && nr < building.heightBlocks &&
                                        nc >= 0 && nc < building.widthBlocks &&
                                        building.blocks[nr][nc]) {
                                        building.destroyBlock(nr, nc);
                                        destroyed++;
                                    }
                                }
                            }
                            VolcanoManager.destroyRock(rock);
                            SoundManager.rockImpact();
                            if (typeof EffectsManager !== 'undefined') {
                                EffectsManager.addExplosion(rock.x, rock.y, 25, '#ff4400');
                            }
                            break;
                        }
                    }
                    if (!rock.active) break;
                }
                if (!rock.active) break;
            }
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

    // Check player lives - game over only when ALL players are dead
    if (playerManager.allPlayersDead()) {
        game.finalWave = enemyManager.waveNumber;
        game.highScoreRank = HighScoreManager.addScore(game.score, game.finalWave);
        game.state = GameState.GAME_OVER;
        SoundManager.gameOver();
        console.log('All players eliminated! Game Over!');
    }
}

// ============================================
// GAME LOOP
// ============================================
function update(deltaTime) {
    switch (game.state) {
        case GameState.TITLE:
            if (typeof IntroManager !== 'undefined') {
                IntroManager.update(game.deltaTime);
            }
            if (input.isKeyJustPressed(Keys.ENTER)) {
                SoundManager.init(); // Ensure audio context is ready
                SoundManager.gameStart();
                StageSelect.init();
                game.state = GameState.STAGE_SELECT;
                console.log('Entering stage select');
            }
            break;
        case GameState.STAGE_SELECT:
            StageSelect.update(deltaTime);
            break;
        case GameState.PLAYING:
            // Update input state for all players
            input.update();
            playerManager.update(game.deltaTime);
            projectileManager.update(game.deltaTime);
            // Use P1 position for enemy targeting (could be improved for 2P)
            const p1 = playerManager.getPlayer(1);
            enemyManager.update(game.deltaTime, p1 ? p1.x : 0, p1 ? p1.y : 0, projectileManager);
            buildingManager.update(game.deltaTime);
            civilianManager.update(game.deltaTime, p1 ? p1.x : 0, p1 ? p1.y : 0);
            ConstructionManager.update(game.deltaTime);
            BackgroundManager.update(game.deltaTime);
            DayCycle.update(game.deltaTime);
            WeatherManager.update(game.deltaTime);
            VolcanoManager.update(game.deltaTime);
            EffectsManager.update(game.deltaTime);
            PowerupManager.update(game.deltaTime);
            if (typeof AbilityManager !== 'undefined') AbilityManager.update(game.deltaTime);
            if (typeof HeatShimmer !== 'undefined') HeatShimmer.update(game.deltaTime);
            updateZoneSplash(game.deltaTime);

            // Check player collision with charged building flags (Zone 2)
            if (game.currentZone === 2) {
                for (const p of playerManager.getActivePlayers()) {
                    if (p.state !== 'flying') continue;

                    for (const building of buildingManager.buildings) {
                        if (building.isCharged) {
                            const flagX = building.x + (building.widthBlocks * CONFIG.BLOCK_SIZE) / 2;
                            const flagY = building.y - 20;

                            // Check collision with flag area
                            const dx = p.x - flagX;
                            const dy = p.y - flagY;
                            const dist = Math.sqrt(dx * dx + dy * dy);

                            if (dist < 30) {
                                AbilityManager.triggerAbility(building, p);
                            }
                        }
                    }
                }
            }

            // Process lightning damage
            if (typeof WeatherManager !== 'undefined') {
                const lightningDamage = WeatherManager.getPendingLightningDamage();
                if (lightningDamage && lightningDamage.type === 'building') {
                    const building = lightningDamage.building;
                    let destroyed = 0;

                    // Find blocks near strike point and destroy them
                    for (let row = 0; row < building.heightBlocks && destroyed < lightningDamage.blocks; row++) {
                        for (let col = 0; col < building.widthBlocks && destroyed < lightningDamage.blocks; col++) {
                            if (building.blocks[row][col]) {
                                const pos = building.getBlockWorldPosition(row, col);
                                const dist = Math.abs(pos.x + pos.width / 2 - lightningDamage.x);
                                if (dist < 30) {
                                    building.destroyBlock(row, col);
                                    destroyed++;
                                }
                            }
                        }
                    }

                    // Add lightning impact visual effect
                    if (typeof EffectsManager !== 'undefined') {
                        EffectsManager.addLightningImpact(lightningDamage.x, lightningDamage.y);
                    }

                    // Check if lightning hit any enemies
                    if (typeof enemyManager !== 'undefined') {
                        for (const enemy of enemyManager.enemies) {
                            if (!enemy.active) continue;
                            const dist = Math.sqrt(
                                Math.pow(enemy.x - lightningDamage.x, 2) +
                                Math.pow(enemy.y - lightningDamage.y, 2)
                            );
                            if (dist < 50) {
                                enemy.die();
                                addScore(Math.floor(100 * DayCycle.getScoreMultiplier()));
                            }
                        }
                    }
                }
            }

            // Check civilian rescue for all active players and trigger construction crew
            for (const pl of playerManager.getActivePlayers()) {
                const rescueResult = civilianManager.checkRescue(pl.x, pl.y, pl.state);
                if (rescueResult.count > 0) {
                    pl.addScore(rescueResult.count * 500);
                    // Trigger construction crew if building exists
                    if (rescueResult.building) {
                        console.log(`P${pl.id} triggered construction for building at x:`, rescueResult.building.x);
                        ConstructionManager.triggerRepair(rescueResult.building);
                    }
                }
            }

            checkCollisions();
            break;
        case GameState.GAME_OVER:
            if (input.isKeyJustPressed(Keys.ENTER)) {
                game.state = GameState.TITLE;
            }
            break;
        case GameState.VICTORY:
            // Update tally animation
            if (game.victoryPhase === 'tally') {
                const elapsed = Date.now() - game.victoryStartTime;
                // Tally speed: count up over 3 seconds
                const tallyProgress = Math.min(elapsed / 3000, 1);
                game.brickTallyDisplayed = Math.floor(game.brickBonus * tallyProgress);

                if (tallyProgress >= 1) {
                    game.victoryPhase = 'complete';
                    game.score += game.brickBonus;
                }

                // SPACE to skip tally
                if (input.isKeyJustPressed(Keys.SPACE) || input.isKeyJustPressed(Keys.ENTER)) {
                    game.brickTallyDisplayed = game.brickBonus;
                    game.score += game.brickBonus;
                    game.victoryPhase = 'complete';
                }
            } else if (input.isKeyJustPressed(Keys.SPACE) || input.isKeyJustPressed(Keys.ENTER)) {
                game.state = GameState.STAGE_SELECT;
            }
            break;
    }

    // Check Hit Stop
    if (EffectsManager.hitStopTimer > 0) {
        EffectsManager.hitStopTimer -= game.deltaTime;
        return; // Pause game updates
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
            if (typeof IntroManager !== 'undefined') {
                IntroManager.render(ctx);
            }
            break;
        case GameState.STAGE_SELECT:
            StageSelect.render(ctx);
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





function renderGame() {
    // Apply Screen Shake
    ctx.save();
    ctx.translate(EffectsManager.shakeX, EffectsManager.shakeY);

    // Draw sky with dramatic Contra-style gradient
    const skyGradient = ctx.createLinearGradient(0, CONFIG.SKY_TOP, 0, CONFIG.STREET_Y);

    // Get time-appropriate gradient colors
    const isNight = DayCycle.currentTime === 'night';
    const isDusk = DayCycle.currentTime === 'dusk';
    const isDawn = DayCycle.currentTime === 'dawn';

    if (isNight) {
        skyGradient.addColorStop(0, '#0d0d1a');    // Almost black at top
        skyGradient.addColorStop(0.3, '#1a1a2e');  // Deep purple-black
        skyGradient.addColorStop(0.7, '#2d1f3d');  // Purple hint
        skyGradient.addColorStop(1, '#1a1a2e');    // Back to dark
    } else if (isDusk) {
        skyGradient.addColorStop(0, '#2d1b4e');    // Deep purple at top
        skyGradient.addColorStop(0.3, '#4a1942');  // Purple-red
        skyGradient.addColorStop(0.6, '#7c2d12');  // Burnt orange
        skyGradient.addColorStop(1, '#451a03');    // Dark brown at horizon
    } else if (isDawn) {
        skyGradient.addColorStop(0, '#3b1f5b');    // Purple at top
        skyGradient.addColorStop(0.4, '#5b2c6f');  // Lighter purple
        skyGradient.addColorStop(0.7, '#9d4edd');  // Bright purple
        skyGradient.addColorStop(1, '#c77dff');    // Light purple-pink at horizon
    } else {
        // Day - moody atmospheric, not bright blue
        skyGradient.addColorStop(0, '#3d5a73');    // Dark steel blue at top
        skyGradient.addColorStop(0.4, '#5b7c99');  // Muted steel blue
        skyGradient.addColorStop(0.8, '#8fa4b8');  // Lighter at middle
        skyGradient.addColorStop(1, '#b8c9d6');    // Hazy at horizon
    }

    ctx.fillStyle = skyGradient;
    ctx.fillRect(
        -EffectsManager.shakeIntensity,
        CONFIG.SKY_TOP - EffectsManager.shakeIntensity,
        CONFIG.CANVAS_WIDTH + EffectsManager.shakeIntensity * 2,
        CONFIG.STREET_Y - CONFIG.SKY_TOP + EffectsManager.shakeIntensity * 2
    );

    // Draw celestial bodies (stars, sun/moon, clouds, fireflies)
    DayCycle.render(ctx);

    // Draw background (behind buildings)
    BackgroundManager.render(ctx);

    // Draw buildings
    buildingManager.render(ctx);

    // Draw weather effects
    WeatherManager.render(ctx);

    // Draw civilians
    civilianManager.render(ctx);

    // Draw enemies
    enemyManager.render(ctx);

    // Draw volcanic rocks
    VolcanoManager.renderRocks(ctx);

    // Draw powerups
    PowerupManager.render(ctx);

    // Draw players
    playerManager.render(ctx);

    // Draw projectiles
    projectileManager.render(ctx);

    // Draw visual effects (explosions, sparks, etc.)
    EffectsManager.render(ctx);

    // Draw active abilities (Zone 2)
    if (typeof AbilityManager !== 'undefined') AbilityManager.render(ctx);

    // Draw heat shimmer effect (Zone 2 day only)
    if (typeof HeatShimmer !== 'undefined') HeatShimmer.render(ctx, canvas);

    // Draw street (extends to bottom of canvas)
    ctx.fillStyle = DayCycle.getStreetColor();
    ctx.fillRect(
        -EffectsManager.shakeIntensity,
        CONFIG.STREET_Y,
        CONFIG.CANVAS_WIDTH + EffectsManager.shakeIntensity * 2,
        CONFIG.CANVAS_HEIGHT - CONFIG.STREET_Y
    );

    // Draw sidewalk along base of buildings
    const sidewalkColor = DayCycle.currentTime === 'night' ? '#374151' : '#9ca3af';
    ctx.fillStyle = sidewalkColor;
    ctx.fillRect(0, CONFIG.STREET_Y - 8, CONFIG.CANVAS_WIDTH, 8);

    // Curb line
    ctx.fillStyle = DayCycle.currentTime === 'night' ? '#1f2937' : '#6b7280';
    ctx.fillRect(0, CONFIG.STREET_Y - 2, CONFIG.CANVAS_WIDTH, 2);

    // Road lane markings (dashed yellow line)
    ctx.fillStyle = '#fbbf24';
    for (let x = 20; x < CONFIG.CANVAS_WIDTH; x += 60) {
        ctx.fillRect(x, CONFIG.STREET_Y + 15, 30, 3);
    }

    // Draw construction crew (on street)
    ConstructionManager.render(ctx);

    // Draw refuel pads - Metallic/Industrial look
    ctx.fillStyle = '#334155'; // Dark metal
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

    // Pad warning stripes
    ctx.fillStyle = '#f59e0b';
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(
            CONFIG.REFUEL_PAD_LEFT.x - CONFIG.REFUEL_PAD_WIDTH / 2 + 10 + i * 15,
            CONFIG.REFUEL_PAD_LEFT.y - CONFIG.REFUEL_PAD_HEIGHT + 5,
            5, 20
        );
        ctx.fillRect(
            CONFIG.REFUEL_PAD_RIGHT.x - CONFIG.REFUEL_PAD_WIDTH / 2 + 10 + i * 15,
            CONFIG.REFUEL_PAD_RIGHT.y - CONFIG.REFUEL_PAD_HEIGHT + 5,
            5, 20
        );
    }

    // Restore context (End Shake)
    ctx.restore();

    // Draw HUD (Static, not shaken)
    // Draw HUD background (top)
    ctx.fillStyle = CONFIG.COLORS.HUD_BG;
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.SKY_TOP);

    // Draw HUD background (bottom)
    ctx.fillRect(0, CONFIG.SUBWAY_BOTTOM, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT - CONFIG.SUBWAY_BOTTOM);

    // Draw border
    ctx.strokeStyle = CONFIG.COLORS.BORDER;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, CONFIG.CANVAS_WIDTH - 4, CONFIG.CANVAS_HEIGHT - 4);

    // Draw HUD contents
    renderHUD(ctx, buildingManager, enemyManager, playerManager.getTotalScore());

    // Draw zone splash overlay (on top of everything)
    renderZoneSplash(ctx);
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
    // Draw victory background image if available, else fallback to game state
    const victoryBg = typeof AssetManager !== 'undefined' ? AssetManager.getImage('victory_bg') : null;
    if (victoryBg && victoryBg.width > 0) {
        // Draw the victory background scaled to canvas
        ctx.drawImage(victoryBg, 0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    } else {
        // Fallback: draw game state in background
        renderGame();
    }

    // Semi-transparent overlay for text readability
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // Add animated stars effect
    const time = Date.now() / 1000;
    ctx.fillStyle = '#fbbf24';
    for (let i = 0; i < 20; i++) {
        const x = (Math.sin(time + i * 0.7) * 0.5 + 0.5) * CONFIG.CANVAS_WIDTH;
        const y = (Math.cos(time * 0.8 + i * 1.1) * 0.5 + 0.5) * CONFIG.CANVAS_HEIGHT;
        const size = 2 + Math.sin(time * 3 + i) * 1.5;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.textAlign = 'center';
    const centerX = CONFIG.CANVAS_WIDTH / 2;
    const centerY = CONFIG.CANVAS_HEIGHT / 2;

    // Zone complete banner
    const zoneName = game.currentZone === 1 ? 'ZONE 1' : 'ZONE 2';
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 48px monospace';
    ctx.fillText(`★ ${zoneName} COMPLETE ★`, centerX, centerY - 140);

    // City saved message
    const citySaved = 100 - Math.floor(buildingManager.getDestructionPercentage() * 100);
    ctx.fillStyle = '#4ade80';
    ctx.font = '28px monospace';
    ctx.fillText(`City Saved: ${citySaved}%`, centerX, centerY - 80);

    // Brick bonus with tally animation
    ctx.fillStyle = '#fff';
    ctx.font = '24px monospace';
    const displayedTally = game.brickTallyDisplayed.toLocaleString();
    const brickCountDisplay = game.brickCount.toLocaleString();
    ctx.fillText(`Brick Bonus: ${brickCountDisplay} × 25 = ${displayedTally}`, centerX, centerY - 30);

    // Total score (animated during tally)
    const displayScore = game.victoryPhase === 'tally'
        ? (game.score + game.brickTallyDisplayed).toLocaleString()
        : game.score.toLocaleString();
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 36px monospace';
    ctx.fillText(`TOTAL SCORE: ${displayScore}`, centerX, centerY + 30);

    // High score notification
    if (game.highScoreRank > 0) {
        ctx.fillStyle = '#f472b6';
        ctx.font = 'bold 22px monospace';
        ctx.fillText(`★ NEW HIGH SCORE! Rank #${game.highScoreRank} ★`, centerX, centerY + 75);
    }

    // Zone unlock notification (only if just unlocked)
    if (game.zoneJustUnlocked) {
        // Animated glow effect
        const glowAlpha = 0.5 + Math.sin(time * 4) * 0.3;
        ctx.fillStyle = `rgba(74, 222, 128, ${glowAlpha})`;
        ctx.fillRect(centerX - 180, centerY + 100, 360, 50);
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 3;
        ctx.strokeRect(centerX - 180, centerY + 100, 360, 50);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px monospace';
        ctx.fillText(`🔓 ZONE ${game.currentZone + 1} UNLOCKED! 🔓`, centerX, centerY + 132);
    }

    // Continue prompt
    const promptY = game.zoneJustUnlocked ? centerY + 190 : centerY + 140;
    ctx.fillStyle = game.victoryPhase === 'tally' ? '#888' : '#4ade80';
    ctx.font = '20px monospace';
    const promptText = game.victoryPhase === 'tally'
        ? 'Press SPACE to skip...'
        : 'Press SPACE to continue';
    ctx.fillText(promptText, centerX, promptY);
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
console.log('Save New York - Game Initializing...');

// Load assets first, then start game loop
function startGame() {
    const loadingScreen = document.getElementById('loading-screen');
    const loadingBar = document.getElementById('loading-bar');
    const loadingText = document.getElementById('loading-text');

    // Update loading bar periodically
    const updateLoadingUI = () => {
        if (game.state === GameState.LOADING) {
            const progress = AssetManager.getProgress() * 100;
            if (loadingBar) loadingBar.style.width = progress + '%';
            if (loadingText) loadingText.textContent = `Loading... ${Math.floor(progress)}%`;
            requestAnimationFrame(updateLoadingUI);
        }
    };
    updateLoadingUI();

    AssetManager.load().then(() => {
        console.log('Assets loaded, starting game!');

        // Hide loading screen
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            setTimeout(() => loadingScreen.style.display = 'none', 500);
        }

        // Load saved zone progress
        loadZoneProgress();

        // Switch to title state and start loop
        game.state = GameState.TITLE;
        if (typeof IntroManager !== 'undefined') IntroManager.reset();
        console.log('Save New York - Game Initialized');
        requestAnimationFrame(gameLoop);
    }).catch(err => {
        console.error('Failed to load assets:', err);
        // Start anyway with fallback
        game.state = GameState.TITLE;
        if (loadingScreen) loadingScreen.style.display = 'none';
        requestAnimationFrame(gameLoop);
    });
}

startGame();

// ============================================
// DEBUG CONSOLE COMMANDS
// ============================================
// Usage: Type these in browser console
window.debug = {
    // Load specific zone: debug.zone(2)
    zone(zoneNumber) {
        if (zoneNumber < 1 || zoneNumber > CONFIG.TOTAL_ZONES) {
            console.error(`Invalid zone. Valid zones: 1-${CONFIG.TOTAL_ZONES}`);
            return;
        }
        console.log(`Loading Zone ${zoneNumber}...`);
        initGame(1, zoneNumber);
    },

    // Load specific wave in current zone: debug.wave(3)
    wave(waveNumber) {
        const zone = game.currentZone || 1;
        console.log(`Loading Zone ${zone}, Wave ${waveNumber}...`);
        initGame(waveNumber, zone);
    },

    // Unlock all zones
    unlockAll() {
        for (let i = 0; i < CONFIG.TOTAL_ZONES; i++) {
            game.zoneUnlocked[i] = true;
        }
        saveZoneProgress();
        console.log('All zones unlocked!');
    },

    // Give player lives
    lives(count) {
        player.lives = Math.min(count, CONFIG.MAX_LIVES);
        console.log(`Player now has ${player.lives} lives`);
    },

    // Add score
    score(points) {
        addScore(points);
        console.log(`Added ${points} points. Total: ${game.score}`);
    },

    // Give shield
    shield() {
        player.activateShield();
        console.log('Shield activated!');
    }
};

console.log('Debug commands available: debug.zone(n), debug.wave(n), debug.unlockAll(), debug.lives(n), debug.score(n), debug.shield()');
