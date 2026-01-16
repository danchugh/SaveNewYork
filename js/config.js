// ============================================
// GAME CONFIGURATION
// ============================================
const CONFIG = {
    // Version for debugging (increment with each change)
    VERSION: 'v1.0.9',
    // Canvas - Base design resolution (game logic uses these)
    CANVAS_WIDTH: 960,
    CANVAS_HEIGHT: 720,

    // Base resolution for scaling (future-proofing for 1080p)
    BASE_WIDTH: 960,
    BASE_HEIGHT: 720,

    // Layout zones (Y coordinates) - Removed subway, more sky
    SKY_TOP: 40,           // Below HUD
    STREET_Y: 680,         // Street level (at bottom, no subway)

    // Colors - Contra Operation Galuga style palette
    COLORS: {
        // DAY - Moody atmospheric (not bright blue)
        SKY: '#5b7c99',            // Muted steel blue
        SKY_TOP: '#3d5a73',        // Darker at top
        STREET: '#2d2d2d',         // Dark asphalt
        BUILDING_LIGHT: '#6b7280', // Steel grey buildings
        BUILDING_DARK: '#4b5563',  // Darker grey buildings
        BUILDING_WINDOW: '#1f2937', // Very dark windows
        BUILDING_WINDOW_LIT: '#fbbf24', // Amber lit windows

        // UI
        HUD_BG: '#0f0f0f',
        HUD_TEXT: '#22d3ee',   // Cyan neon
        BORDER: '#1a1a2e',     // Deep blue-black

        // NIGHT - Deep purple/dark blue (like concept art)
        SKY_NIGHT: '#1a1a2e',      // Deep purple-black
        SKY_NIGHT_TOP: '#0d0d1a',  // Almost black at top
        STREET_NIGHT: '#0f0f0f',
        BUILDING_LIGHT_NIGHT: '#2d2d44',
        BUILDING_DARK_NIGHT: '#1a1a2e',
        BUILDING_WINDOW_NIGHT: '#fbbf24',

        // DUSK - Orange/red to purple gradient
        SKY_DUSK: '#7c2d12',       // Deep burnt orange
        SKY_DUSK_TOP: '#4a1942',   // Purple at top
        BUILDING_LIGHT_DUSK: '#5c3d2e',
        BUILDING_DARK_DUSK: '#3d2520',

        // DAWN - Purple/pink  
        SKY_DAWN: '#9d4edd',       // Purple
        SKY_DAWN_TOP: '#5b2c6f',   // Deeper purple at top
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

    // Win/Lose
    CITY_DESTRUCTION_THRESHOLD: 0.8
};

