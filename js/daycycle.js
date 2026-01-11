// ============================================
// DAY/NIGHT CYCLE SYSTEM
// ============================================

const TimeOfDay = {
    DAWN: 'dawn',
    DAY: 'day',
    DUSK: 'dusk',
    NIGHT: 'night'
};

const DayCycle = {
    currentTime: TimeOfDay.DAY,
    cycleOrder: [TimeOfDay.DAY, TimeOfDay.DUSK, TimeOfDay.NIGHT, TimeOfDay.DAWN],
    cycleIndex: 0,

    /**
     * Get the score multiplier for the current time of day
     * @returns {number} Score multiplier (1.0 to 1.5)
     */
    getScoreMultiplier() {
        switch (this.currentTime) {
            case TimeOfDay.NIGHT:
                return 1.5;
            case TimeOfDay.DUSK:
            case TimeOfDay.DAWN:
                return 1.25;
            case TimeOfDay.DAY:
            default:
                return 1.0;
        }
    },

    /**
     * Get the display name for the current time of day
     * @returns {string} Display name (e.g., "DAY", "NIGHT")
     */
    getDisplayName() {
        return this.currentTime.toUpperCase();
    },

    /**
     * Advance to the next time of day in the cycle
     */
    advance() {
        this.cycleIndex = (this.cycleIndex + 1) % this.cycleOrder.length;
        this.currentTime = this.cycleOrder[this.cycleIndex];
        console.log(`Time of day changed to: ${this.getDisplayName()}`);
    },

    /**
     * Reset the cycle to DAY
     */
    reset() {
        this.cycleIndex = 0;
        this.currentTime = TimeOfDay.DAY;
    },

    /**
     * Get the sky color for the current time of day
     * @returns {string} Hex color code
     */
    getSkyColor() {
        switch (this.currentTime) {
            case TimeOfDay.NIGHT:
                return CONFIG.COLORS.SKY_NIGHT;
            case TimeOfDay.DUSK:
                return CONFIG.COLORS.SKY_DUSK;
            case TimeOfDay.DAWN:
                return CONFIG.COLORS.SKY_DAWN;
            case TimeOfDay.DAY:
            default:
                return CONFIG.COLORS.SKY;
        }
    },

    /**
     * Get the building light color for the current time of day
     * @returns {string} Hex color code
     */
    getBuildingLightColor() {
        switch (this.currentTime) {
            case TimeOfDay.NIGHT:
                return CONFIG.COLORS.BUILDING_LIGHT_NIGHT;
            case TimeOfDay.DUSK:
                return CONFIG.COLORS.BUILDING_LIGHT_DUSK;
            case TimeOfDay.DAWN:
                return CONFIG.COLORS.BUILDING_LIGHT_DAWN;
            case TimeOfDay.DAY:
            default:
                return CONFIG.COLORS.BUILDING_LIGHT;
        }
    },

    /**
     * Get the building dark color for the current time of day
     * @returns {string} Hex color code
     */
    getBuildingDarkColor() {
        switch (this.currentTime) {
            case TimeOfDay.NIGHT:
                return CONFIG.COLORS.BUILDING_DARK_NIGHT;
            case TimeOfDay.DUSK:
                return CONFIG.COLORS.BUILDING_DARK_DUSK;
            case TimeOfDay.DAWN:
                return CONFIG.COLORS.BUILDING_DARK_DAWN;
            case TimeOfDay.DAY:
            default:
                return CONFIG.COLORS.BUILDING_DARK;
        }
    },

    /**
     * Get the window color for the current time of day
     * @returns {string} Hex color code
     */
    getWindowColor() {
        switch (this.currentTime) {
            case TimeOfDay.NIGHT:
                return CONFIG.COLORS.BUILDING_WINDOW_NIGHT;
            case TimeOfDay.DAY:
            case TimeOfDay.DUSK:
            case TimeOfDay.DAWN:
            default:
                return CONFIG.COLORS.BUILDING_WINDOW;
        }
    },

    /**
     * Get the street color for the current time of day
     * @returns {string} Hex color code
     */
    getStreetColor() {
        switch (this.currentTime) {
            case TimeOfDay.NIGHT:
                return CONFIG.COLORS.STREET_NIGHT;
            case TimeOfDay.DAY:
            case TimeOfDay.DUSK:
            case TimeOfDay.DAWN:
            default:
                return CONFIG.COLORS.STREET;
        }
    },

    /**
     * Get the darkness overlay alpha for the current time of day
     * @returns {number} Alpha value (0 to 0.3)
     */
    getDarknessAlpha() {
        switch (this.currentTime) {
            case TimeOfDay.NIGHT:
                return 0.3;
            case TimeOfDay.DUSK:
                return 0.15;
            case TimeOfDay.DAWN:
                return 0.1;
            case TimeOfDay.DAY:
            default:
                return 0;
        }
    }
};
