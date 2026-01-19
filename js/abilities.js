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
        const turret = {
            x: building.x + (building.widthBlocks * CONFIG.BLOCK_SIZE) / 2,
            y: building.y - 10,
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

        for (let i = 0; i < soldierCount; i++) {
            const soldier = {
                x: building.x + 10 + i * 15,
                y: building.y - 5,
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
        console.log('Airstrike triggered - implementation pending');
        if (typeof EffectsManager !== 'undefined') {
            EffectsManager.addTextPopup(CONFIG.CANVAS_WIDTH / 2, 100, 'AIRSTRIKE!', '#ff4444');
        }
    },
    triggerBellSlow() {
        console.log('Bell slow triggered - implementation pending');
        if (typeof EffectsManager !== 'undefined') {
            EffectsManager.addTextPopup(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2, 'TIME SLOW!', '#4488ff');
        }
    },
    triggerTargetingBoost(player) {
        console.log('Targeting boost triggered - implementation pending');
        if (typeof EffectsManager !== 'undefined' && player) {
            EffectsManager.addTextPopup(player.x, player.y - 30, 'TARGETING BOOST!', '#00ff88');
        }
    },
    triggerArtillery() {
        console.log('Artillery triggered - implementation pending');
        if (typeof EffectsManager !== 'undefined') {
            EffectsManager.addTextPopup(CONFIG.CANVAS_WIDTH / 2, 80, 'ARTILLERY!', '#ff8800');
        }
    }
};
