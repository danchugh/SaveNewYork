// ============================================
// GAME CONFIGURATION
// ============================================
const CONFIG = {
    // Version for debugging (increment with each change)
    VERSION: 'v1.0.92',
    // Canvas - Base design resolution (game logic uses these)
    CANVAS_WIDTH: 960,
    CANVAS_HEIGHT: 720,

    // Base resolution for scaling (future-proofing for 1080p)
    BASE_WIDTH: 960,
    BASE_HEIGHT: 720,

    // Layout zones (Y coordinates) - Removed subway, more sky
    SKY_TOP: 40,           // Below HUD
    STREET_Y: 680,         // Street level (at bottom, no subway)

    // Colors - Bright NYC style palette
    COLORS: {
        // DAY - Brighter, cleaner NYC sky
        SKY: '#56B4E9',              // Clear sky blue
        SKY_TOP: '#0077BB',          // Deep blue at top
        STREET: '#4a4a4a',           // Lighter asphalt
        BUILDING_LIGHT: '#A5B5C5',   // Light steel
        BUILDING_DARK: '#8595A5',    // Medium steel
        BUILDING_WINDOW: '#2a3a4a',  // Dark blue windows
        BUILDING_WINDOW_LIT: '#ffd700', // Gold lit windows

        // UI
        HUD_BG: '#0f0f0f',
        HUD_TEXT: '#22d3ee',   // Cyan neon
        BORDER: '#1a1a2e',     // Deep blue-black

        // NIGHT - Deeper blues
        SKY_NIGHT: '#0D1B2A',        // Deep blue-black
        SKY_NIGHT_TOP: '#0d0d1a',    // Almost black at top
        STREET_NIGHT: '#0f0f0f',
        BUILDING_LIGHT_NIGHT: '#1B263B',
        BUILDING_DARK_NIGHT: '#1a1a2e',
        BUILDING_WINDOW_NIGHT: '#fbbf24',

        // DUSK - Warmer orange/gold
        SKY_DUSK: '#CC5500',         // Vibrant orange
        SKY_DUSK_TOP: '#6B2D5C',     // Purple-magenta
        BUILDING_LIGHT_DUSK: '#B87333', // Copper/bronze
        BUILDING_DARK_DUSK: '#3d2520',

        // DAWN - Softer pink/lavender
        SKY_DAWN: '#E0AAFF',         // Soft lavender
        SKY_DAWN_TOP: '#7B2CBF',     // Rich purple
        BUILDING_LIGHT_DAWN: '#6b4984',
        BUILDING_DARK_DAWN: '#4a3660'
    },

    // Juice Settings
    SCREEN_SHAKE_DECAY: 500,
    HIT_STOP_DURATION: 0.1,
    HIT_STOP_BOSS: 0.5,

    // Particle Settings
    PARTICLE_COUNT_MIN: 15,
    PARTICLE_COUNT_MAX: 30,
    PARTICLE_FPS: 10,

    // Buildings - Height cap for more sky space
    BUILDING_COUNT: 6,
    BLOCK_SIZE: 14,
    MAX_BUILDING_HEIGHT: 25, // Maximum blocks tall

    // Player
    PLAYER_SPEED: 180,
    PLAYER_MIN_SPEED: 70,
    PLAYER_MAX_SPEED: 256,
    PLAYER_ACCELERATION: 350,
    PLAYER_DECELERATION: 280,
    PLAYER_TURN_SPEED: 350,
    PLAYER_LIVES: 5,
    MAX_LIVES: 8,
    BONUS_LIFE_THRESHOLD: 6000,

    // Material/Repair System
    MAX_MATERIALS: 50,              // Cap per player
    WAVE_COUNTDOWN_DURATION: 10,    // Seconds between waves
    // Material collection: 
    // - Drones (STANDARD/AGGRESSIVE): chance to DROP physical pickups
    // - Stronger enemies: 75% chance to AUTO-COLLECT directly to player
    MATERIAL_DROP_RATES: {
        // Drones - significantly increased rates and amounts
        DRONE: { chance: 0.25, amount: 2, autoCollect: true },       // Was 15%, 1
        INTERCEPTOR: { chance: 0.40, amount: 3, autoCollect: true }, // Was 20%, 2

        // Heavy/Boss enemies - nearly guaranteed high value drops
        GUNSHIP: { chance: 1.0, amount: 8, autoCollect: true },     // Was 75%, 3
        BOMBER: { chance: 0.50, amount: 4, autoCollect: true },      // Was 75%, 2
        CARRIER: { chance: 0.90, amount: 10, autoCollect: true },    // Was 75%, 5
        TANK: { chance: 0.90, amount: 12, autoCollect: true },       // Tank shares Gunship logic usually, but here distinct

        // Zone 2 enemies
        SAND_CARRIER: { chance: 0.90, amount: 10, autoCollect: true },
        SCORPION: { chance: 0.75, amount: 5, autoCollect: true },
        SANDWORM: { chance: 0.80, amount: 8, autoCollect: true },

        // Mini-boss - guaranteed massive drop
        MINI_BOSS: { chance: 1.0, amount: 15, autoCollect: true }
    },
    FUEL_MAX: 100,
    FUEL_DRAIN_RATE: 1,
    REFUEL_TIME: 5,

    // Refuel pad positions (updated for new street level)
    REFUEL_PAD_LEFT: { x: 50, y: 680 },
    REFUEL_PAD_RIGHT: { x: 925, y: 680 },
    REFUEL_PAD_WIDTH: 60,
    REFUEL_PAD_HEIGHT: 30,

    // Enemies
    ENEMY_MELEE_DAMAGE_TIME_MIN: 3,
    ENEMY_MELEE_DAMAGE_TIME_MAX: 10,

    // Civilian System
    CIVILIAN_RESCUE_RADIUS: 50,       // Doubled from 25 for easier rescues

    // Carrier Configuration
    CARRIER_SPEED: 30,
    CARRIER_ALTITUDE_BUFFER: 50,      // Pixels above tallest building
    CARRIER_ATTACK_COOLDOWN_MIN: 5,   // Seconds (increased frequency for Zone 1)
    CARRIER_ATTACK_COOLDOWN_MAX: 7,   // Seconds
    CARRIER_SPAWN_DRONE_TYPE: 'standard', // 'standard', 'aggressive', or 'random'
    CARRIER_MAX_SPAWNED_DRONES: 10,   // Global limit across all carriers
    CARRIER_SPAWN_FRAME: 28,          // Frame to spawn drones during attack
    CARRIER_DEATH_DAMAGE_MIN: 6,      // Min blocks destroyed on impact
    CARRIER_DEATH_DAMAGE_MAX: 10,     // Max blocks destroyed on impact

    // Sandworm Configuration (Zone 2)
    SANDWORM_FLY_DURATION: 5,         // Seconds to fly before burrowing (configurable)
    SANDWORM_MAX_ATTACKS: 4,          // Max attacks before despawning

    // Gunship Configuration
    GUNSHIP_SPEED: 35,
    GUNSHIP_HEALTH: 4,
    GUNSHIP_ATTACK_COOLDOWN_MIN: 3,   // Seconds (was 6)
    GUNSHIP_ATTACK_COOLDOWN_MAX: 6,   // Seconds (was 12)
    GUNSHIP_ATTACK_FRAME: 4,          // Frame to fire bombs during attack
    GUNSHIP_PROJECTILE_COUNT: 3,      // Number of bombs per attack
    GUNSHIP_BOMB_SPEED: 150,
    GUNSHIP_PATROL_ALTITUDE_OFFSET: 80, // Pixels above tallest building
    GUNSHIP_ATTACK_RANGE: 150,        // Proximity to building to trigger attack
    GUNSHIP_BOMB_DAMAGE: 4,           // 2x2 blocks

    // Missile Configuration (Gunship missile barrage)
    MISSILE_SPEED: 250,
    MISSILE_DAMAGE_MIN: 3,
    MISSILE_DAMAGE_MAX: 5,
    GUNSHIP_MISSILES_PER_BARRAGE: 7,  // 6-8 range, use 7
    GUNSHIP_POST_ATTACK_FLY_TIME: 2,  // Seconds to fly after attack before next attack (was 3)

    // Artillery Configuration (Background artillery event)
    ARTILLERY_MIN_WAVE: 4,
    ARTILLERY_SHELL_COUNT_MIN: 5,
    ARTILLERY_SHELL_COUNT_MAX: 8,
    ARTILLERY_SHELL_INTERVAL: 0.8,
    ARTILLERY_DELAY_MIN: 5,   // Seconds into wave before possible trigger
    ARTILLERY_DELAY_MAX: 15,

    // Dust Devil Configuration (Zone 2 Environmental Hazard)
    DUST_DEVIL_MAX_ACTIVE: 2,
    DUST_DEVIL_SPAWN_MIN: 1,
    DUST_DEVIL_SPAWN_MAX: 4,
    DUST_DEVIL_LIFETIME: 30,
    DUST_DEVIL_SUCTION_RADIUS: 48,
    DUST_DEVIL_CAPTURE_DURATION: 2,
    DUST_DEVIL_THROW_VELOCITY: 750,
    DUST_DEVIL_THROW_BUILDING_DAMAGE: 10,
    DUST_DEVIL_PLAYER_CONTROL_THRESHOLD: 100,
    DUST_DEVIL_THROW_IMMUNITY: 2.0,  // Seconds of immunity after being thrown
    DUST_DEVIL_FADE_DURATION: 1.0,
    DUST_DEVIL_SPEED: 50,
    DUST_DEVIL_PLAYER_BIAS: 0.3,
    DUST_DEVIL_ENEMY_BIAS: 0.2,

    // Sand Carrier Configuration (Zone 2 Sand Barge)
    SAND_CARRIER_HP: 7,
    SAND_CARRIER_SPEED: 25,
    SAND_CARRIER_BLOCKS_TO_MOVE: 15,
    SAND_CARRIER_ATTACK_INTERVAL: 3.5,
    SAND_CARRIER_ARRIVAL_DELAY: 1.0,
    SAND_CARRIER_POD_SPAWN_FRAME: 8,
    SAND_CARRIER_POD_SPREAD: 20,
    SAND_CARRIER_POD_FALL_SPEED: 120,
    SAND_CARRIER_POD_DAMAGE: 3,
    SAND_CARRIER_ELEVATION_OFFSET: 60,
    SAND_CARRIER_HOVER_HEIGHT: 80,

    // Win/Lose
    CITY_DESTRUCTION_THRESHOLD: 0.8,

    // Zone Configuration
    ZONES: {
        1: {
            name: 'New York',
            key: 'city',
            waves: 5,
            miniBossWaves: [2, 4],
            background: 'city'
        },
        2: {
            name: 'Desert Outpost',
            key: 'desert',
            waves: 5,
            miniBossWaves: [2, 4],
            background: 'desert'
        }
    },
    TOTAL_ZONES: 2,

    // Zone-specific enemy stat modifiers
    ZONE_ENEMY_STATS: {
        1: {
            STANDARD: { speed: 60, health: 1 },
            AGGRESSIVE: { speed: 100, health: 1, shotCount: 3 }
        },
        2: {
            STANDARD: { speed: 75, health: 2 },      // +25% speed, +1 HP
            AGGRESSIVE: { speed: 100, health: 1, shotCount: 4, erratic: true }  // 4-shot, erratic movement
        }
    }
};

