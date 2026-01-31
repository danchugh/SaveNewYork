// Building Defense Abilities System
const AbilityManager = {
    activeAbilities: [],

    reset() {
        this.activeAbilities = [];
    },

    triggerAbility(building, player) {
        if (!building.isCharged || !building.ability) return;

        console.log(`Triggering ${building.ability} from ${building.name}`);

        switch (building.ability) {
            case 'aa_battery':
                this.spawnAABattery(building);
                break;
            case 'infantry':
                this.spawnInfantry(building);
                break;
            case 'airstrike':
                this.triggerAirstrike();
                break;
            case 'bell_slow':
                this.triggerBellSlow();
                break;
            case 'targeting_boost':
                this.triggerTargetingBoost(player);
                break;
            case 'artillery':
                this.triggerArtillery();
                break;
        }

        building.resetCharge();

        // Play pickup sound
        if (typeof SoundManager !== 'undefined') {
            SoundManager.powerUp && SoundManager.powerUp();
        }
    },

    update(deltaTime) {
        // Update active abilities
        for (let i = this.activeAbilities.length - 1; i >= 0; i--) {
            const ability = this.activeAbilities[i];
            ability.duration -= deltaTime;

            if (ability.update) ability.update(deltaTime);

            if (ability.duration <= 0) {
                if (ability.onEnd) ability.onEnd();
                this.activeAbilities.splice(i, 1);
            }
        }
    },

    render(ctx) {
        for (const ability of this.activeAbilities) {
            if (ability.render) ability.render(ctx);
        }
    },

    // Ability implementations (stubs - will be detailed in Phase 5)
    spawnAABattery(building) {
        // Place turret on top of rooftop blocks
        // building.y is the top coordinate, add BLOCK_SIZE so turret sits on visible roof
        const roofY = building.y + CONFIG.BLOCK_SIZE;
        const turret = {
            x: building.x + (building.widthBlocks * CONFIG.BLOCK_SIZE) / 2,
            y: roofY,
            duration: 20,
            fireRate: 0.5,
            fireTimer: 0,
            target: null,

            update(deltaTime) {
                this.fireTimer -= deltaTime;

                // Find nearest enemy
                if (typeof enemyManager !== 'undefined') {
                    let nearest = null;
                    let nearestDist = 300; // Max range

                    for (const enemy of enemyManager.enemies) {
                        if (!enemy.active || enemy.state === EnemyState.DYING || enemy.state === EnemyState.DEAD) continue;
                        const dist = Math.sqrt((enemy.x - this.x) ** 2 + (enemy.y - this.y) ** 2);
                        if (dist < nearestDist) {
                            nearestDist = dist;
                            nearest = enemy;
                        }
                    }
                    this.target = nearest;
                }

                // Fire at target
                if (this.target && this.fireTimer <= 0) {
                    this.fireTimer = this.fireRate;
                    const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x) * 180 / Math.PI;
                    if (typeof projectileManager !== 'undefined') {
                        projectileManager.add(this.x, this.y, angle, 400, true, 0);
                    }
                    if (typeof SoundManager !== 'undefined') SoundManager.shoot();
                }
            },

            render(ctx) {
                // Draw turret base
                ctx.fillStyle = '#4a5568';
                ctx.fillRect(this.x - 12, this.y - 5, 24, 10);

                // Draw barrel pointing at target
                ctx.strokeStyle = '#718096';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);

                if (this.target) {
                    const angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
                    ctx.lineTo(this.x + Math.cos(angle) * 15, this.y + Math.sin(angle) * 15);
                } else {
                    ctx.lineTo(this.x, this.y - 15);
                }
                ctx.stroke();
            }
        };

        this.activeAbilities.push(turret);
        if (typeof EffectsManager !== 'undefined') {
            EffectsManager.addTextPopup(building.x + 30, building.y - 30, 'AA BATTERY!', '#00ff88');
        }
    },
    spawnInfantry(building) {
        const soldierCount = 3 + Math.floor(Math.random() * 2); // 3-4 soldiers
        // Place soldiers on rooftop blocks, spaced across the building width
        // building.y is the top coordinate, but soldiers need to stand ON the blocks
        // Add offset so soldier feet (at y) are on the visible roof surface
        const roofY = building.y + CONFIG.BLOCK_SIZE; // Stand on top block surface
        const buildingWidth = building.widthBlocks * CONFIG.BLOCK_SIZE;
        const spacing = buildingWidth / (soldierCount + 1);

        for (let i = 0; i < soldierCount; i++) {
            const soldier = {
                x: building.x + spacing * (i + 1),
                y: roofY,
                duration: 17 + Math.random() * 3, // 15-20 seconds
                fireRate: 1.0,
                fireTimer: Math.random(),

                update(deltaTime) {
                    this.fireTimer -= deltaTime;

                    if (this.fireTimer <= 0) {
                        this.fireTimer = this.fireRate;

                        // Fire at random angle upward
                        const angle = -90 + (Math.random() - 0.5) * 60; // -120 to -60 degrees
                        if (typeof projectileManager !== 'undefined') {
                            projectileManager.add(this.x, this.y, angle, 250, true, 0);
                        }
                    }
                },

                render(ctx) {
                    // Simple soldier sprite (procedural)
                    ctx.fillStyle = '#2d5016'; // Army green body
                    ctx.fillRect(this.x - 3, this.y - 8, 6, 8);
                    ctx.fillStyle = '#f5deb3'; // Skin tone head
                    ctx.beginPath();
                    ctx.arc(this.x, this.y - 10, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            };

            this.activeAbilities.push(soldier);
        }

        if (typeof EffectsManager !== 'undefined') {
            EffectsManager.addTextPopup(building.x + 30, building.y - 30, 'INFANTRY!', '#00ff88');
        }
    },
    triggerAirstrike() {
        const jet = {
            x: -100,
            y: 150 + Math.random() * 100,
            duration: 3,
            speed: 600,
            hasFired: false,

            update(deltaTime) {
                this.x += this.speed * deltaTime;

                // Fire at all airborne enemies when crossing screen center
                if (!this.hasFired && this.x > CONFIG.CANVAS_WIDTH / 2) {
                    this.hasFired = true;

                    if (typeof enemyManager !== 'undefined') {
                        for (const enemy of enemyManager.enemies) {
                            if (!enemy.active) continue;
                            // Damage all flying enemies
                            if (enemy.state === EnemyState.FLYING || enemy.state === EnemyState.ATTACKING) {
                                enemy.die(); // Instant kill
                                if (typeof addScore === 'function') addScore(100);
                            }
                        }
                    }

                    if (typeof EffectsManager !== 'undefined') {
                        EffectsManager.shake(10);
                        // Explosion trail across screen
                        for (let x = 100; x < CONFIG.CANVAS_WIDTH - 100; x += 80) {
                            EffectsManager.addExplosion(x, this.y, 30, '#ff6600');
                        }
                    }
                    if (typeof SoundManager !== 'undefined') SoundManager.explosion();
                }
            },

            render(ctx) {
                // Simple jet shape (procedural)
                ctx.save();
                ctx.translate(this.x, this.y);

                // Fuselage
                ctx.fillStyle = '#4a5568';
                ctx.beginPath();
                ctx.moveTo(30, 0);
                ctx.lineTo(-20, -10);
                ctx.lineTo(-30, -5);
                ctx.lineTo(-30, 5);
                ctx.lineTo(-20, 10);
                ctx.closePath();
                ctx.fill();

                // Afterburner flame
                ctx.fillStyle = '#ff8800';
                ctx.beginPath();
                ctx.moveTo(-30, -3);
                ctx.lineTo(-50 - Math.random() * 10, 0);
                ctx.lineTo(-30, 3);
                ctx.closePath();
                ctx.fill();

                ctx.restore();
            }
        };

        this.activeAbilities.push(jet);
        if (typeof EffectsManager !== 'undefined') {
            EffectsManager.addTextPopup(CONFIG.CANVAS_WIDTH / 2, 100, 'AIRSTRIKE INCOMING!', '#ff4444');
        }
    },
    triggerBellSlow() {
        const bellEffect = {
            duration: 9, // 8-10 seconds
            slowFactor: 0.3, // 30% speed

            update(deltaTime) {
                // Apply slow to all enemies
                if (typeof enemyManager !== 'undefined') {
                    for (const enemy of enemyManager.enemies) {
                        enemy.bellSlowed = true;
                    }
                }
                // Apply slow to enemy projectiles
                if (typeof projectileManager !== 'undefined') {
                    for (const proj of projectileManager.projectiles) {
                        if (!proj.isPlayerProjectile) {
                            proj.bellSlowed = true;
                        }
                    }
                }
            },

            onEnd() {
                // Remove slow from all enemies
                if (typeof enemyManager !== 'undefined') {
                    for (const enemy of enemyManager.enemies) {
                        enemy.bellSlowed = false;
                    }
                }
                if (typeof projectileManager !== 'undefined') {
                    for (const proj of projectileManager.projectiles) {
                        proj.bellSlowed = false;
                    }
                }
            },

            render(ctx) {
                // Screen-wide blue tint
                ctx.fillStyle = 'rgba(100, 150, 255, 0.1)';
                ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
            }
        };

        this.activeAbilities.push(bellEffect);
        if (typeof EffectsManager !== 'undefined') {
            EffectsManager.addTextPopup(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2, 'TIME SLOW!', '#4488ff');
            EffectsManager.shake(5);
        }
    },
    triggerTargetingBoost(player) {
        const boost = {
            duration: 10,
            player: player,

            update(deltaTime) {
                if (this.player) {
                    this.player.targetingBoost = true;
                    this.player.fireRateBoost = true;
                }
            },

            onEnd() {
                if (this.player) {
                    this.player.targetingBoost = false;
                    this.player.fireRateBoost = false;
                }
            },

            render(ctx) {
                // Glow around player
                if (this.player) {
                    ctx.save();
                    ctx.globalAlpha = 0.3;
                    ctx.fillStyle = '#00ff88';
                    ctx.beginPath();
                    ctx.arc(this.player.x, this.player.y, 40, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            }
        };

        this.activeAbilities.push(boost);
        if (typeof EffectsManager !== 'undefined' && player) {
            EffectsManager.addTextPopup(player.x, player.y - 30, 'TARGETING BOOST!', '#00ff88');
        }
    },
    triggerArtillery() {
        const shellCount = 3 + Math.floor(Math.random() * 2); // 3-4 shells

        // Find enemy positions for targeting
        const targets = [];
        if (typeof enemyManager !== 'undefined') {
            for (const enemy of enemyManager.enemies) {
                if (enemy.active && enemy.state !== EnemyState.DYING && enemy.state !== EnemyState.DEAD) {
                    targets.push({ x: enemy.x, y: enemy.y });
                }
            }
        }

        // Fire shells at random targets or positions
        for (let i = 0; i < shellCount; i++) {
            const delay = i * 0.3;

            setTimeout(() => {
                let targetX, targetY;

                if (targets.length > 0) {
                    const target = targets[Math.floor(Math.random() * targets.length)];
                    targetX = target.x + (Math.random() - 0.5) * 50;
                    targetY = target.y + (Math.random() - 0.5) * 50;
                } else {
                    targetX = 100 + Math.random() * (CONFIG.CANVAS_WIDTH - 200);
                    targetY = 100 + Math.random() * 300;
                }

                // Create explosion at target
                if (typeof EffectsManager !== 'undefined') {
                    EffectsManager.addExplosion(targetX, targetY, 40, '#ff6600');
                    if (EffectsManager.addAnimatedExplosion) {
                        EffectsManager.addAnimatedExplosion(targetX, targetY, 'enemy', 35);
                    }
                    EffectsManager.shake(5);
                }

                // Damage enemies in radius
                if (typeof enemyManager !== 'undefined') {
                    for (const enemy of enemyManager.enemies) {
                        if (!enemy.active) continue;
                        const dist = Math.sqrt((enemy.x - targetX) ** 2 + (enemy.y - targetY) ** 2);
                        if (dist < 60) {
                            enemy.die(); // Instant kill
                            if (typeof addScore === 'function') addScore(100);
                        }
                    }
                }

                if (typeof SoundManager !== 'undefined') SoundManager.explosion();
            }, delay * 1000);
        }

        if (typeof EffectsManager !== 'undefined') {
            EffectsManager.addTextPopup(CONFIG.CANVAS_WIDTH / 2, 80, 'ARTILLERY BARRAGE!', '#ff8800');
        }
    }
};
