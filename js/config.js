// ============================================
// GAME CONFIGURATION
// ============================================
const CONFIG = {
    // Canvas
    CANVAS_WIDTH: 960,
    CANVAS_HEIGHT: 720,

    // Layout zones (Y coordinates) - More sky area
    SKY_TOP: 40,           // Below HUD
    STREET_Y: 620,         // Street level (lowered for more sky)
    SUBWAY_TOP: 645,       // Subway starts here
    SUBWAY_BOTTOM: 690,    // Above bottom HUD

    // Colors (modern pixel art palette)
    COLORS: {
        SKY: '#4a90d9',
        STREET: '#2d2d2d',
        SUBWAY_BG: '#1a1a1a',
        SUBWAY_TUNNEL: '#0d0d0d',
        BUILDING_LIGHT: '#c9b896',
        BUILDING_DARK: '#8b7355',
        BUILDING_WINDOW: '#2d4a6b',
        HUD_BG: '#1a472a',
        HUD_TEXT: '#4ade80',
        BORDER: '#4ade80',

        // Night colors
        SKY_NIGHT: '#1a1a2e',
        STREET_NIGHT: '#1a1a1a',
        BUILDING_LIGHT_NIGHT: '#4a4a5a',
        BUILDING_DARK_NIGHT: '#3a3a4a',
        BUILDING_WINDOW_NIGHT: '#fbbf24',

        // Dusk colors
        SKY_DUSK: '#c2410c',
        BUILDING_LIGHT_DUSK: '#d97706',
        BUILDING_DARK_DUSK: '#92400e',

        // Dawn colors
        SKY_DAWN: '#f472b6',
        BUILDING_LIGHT_DAWN: '#e9d5ff',
        BUILDING_DARK_DAWN: '#c4b5fd'
    },

    // Buildings
    BUILDING_COUNT: 6,
    BLOCK_SIZE: 14,

    // Player - Rotation-based movement, snappy turning
    PLAYER_SPEED: 180,            // Default cruising speed
    PLAYER_MIN_SPEED: 70,         // Minimum speed (can't stop)
    PLAYER_MAX_SPEED: 256,        // Maximum speed with boost (reduced 20%)
    PLAYER_ACCELERATION: 350,     // Speed increase per second
    PLAYER_DECELERATION: 280,     // Speed decrease per second
    PLAYER_TURN_SPEED: 350,       // Degrees per second
    PLAYER_LIVES: 5,
    FUEL_MAX: 100,                // seconds (larger map needs more fuel)
    FUEL_DRAIN_RATE: 1,           // per second
    REFUEL_TIME: 5,               // seconds

    // Refuel pad positions (updated for new street level)
    REFUEL_PAD_LEFT: { x: 50, y: 620 },
    REFUEL_PAD_RIGHT: { x: 910, y: 620 },
    REFUEL_PAD_WIDTH: 60,
    REFUEL_PAD_HEIGHT: 30,

    // Enemies
    ENEMY_MELEE_DAMAGE_TIME_MIN: 3,
    ENEMY_MELEE_DAMAGE_TIME_MAX: 10,

    // Win/Lose
    CITY_DESTRUCTION_THRESHOLD: 0.8  // 80%
};
