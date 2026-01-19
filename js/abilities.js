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
        console.log('AA Battery spawned - implementation pending');
        if (typeof EffectsManager !== 'undefined') {
            EffectsManager.addTextPopup(building.x + 30, building.y - 30, 'AA BATTERY!', '#00ff88');
        }
    },
    spawnInfantry(building) {
        console.log('Infantry spawned - implementation pending');
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
