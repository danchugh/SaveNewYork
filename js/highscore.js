// ============================================
// HIGH SCORE MANAGER
// ============================================
const HighScoreManager = {
    STORAGE_KEY: 'saveNewYork_highScores',
    MAX_SCORES: 10,

    /**
     * Load scores from localStorage
     * @returns {Array} Array of score objects {score, wave, date}
     */
    getScores() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.warn('Failed to load high scores:', e);
        }
        return [];
    },

    /**
     * Save scores to localStorage
     * @param {Array} scores - Array of score objects
     */
    saveScores(scores) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(scores));
        } catch (e) {
            console.warn('Failed to save high scores:', e);
        }
    },

    /**
     * Check if a score qualifies for the high score table
     * @param {number} score - The score to check
     * @returns {boolean} True if score qualifies
     */
    isHighScore(score) {
        const scores = this.getScores();
        if (scores.length < this.MAX_SCORES) {
            return true;
        }
        return score > scores[scores.length - 1].score;
    },

    /**
     * Add a new score to the high score table
     * @param {number} score - The score to add
     * @param {number} wave - The wave reached
     * @returns {number} Rank (1-10) if qualified, 0 if not
     */
    addScore(score, wave) {
        const scores = this.getScores();

        // Create new score entry
        const newEntry = {
            score: score,
            wave: wave,
            date: Date.now()
        };

        // Find insertion position
        let rank = 0;
        for (let i = 0; i < scores.length; i++) {
            if (score > scores[i].score) {
                rank = i + 1;
                scores.splice(i, 0, newEntry);
                break;
            }
        }

        // If not inserted yet, add to end (if there's room)
        if (rank === 0) {
            if (scores.length < this.MAX_SCORES) {
                scores.push(newEntry);
                rank = scores.length;
            } else {
                // Score doesn't qualify
                return 0;
            }
        }

        // Trim to max scores
        while (scores.length > this.MAX_SCORES) {
            scores.pop();
        }

        // Save updated scores
        this.saveScores(scores);

        return rank;
    },

    /**
     * Get the highest score
     * @returns {number} The highest score, or 0 if no scores exist
     */
    getHighestScore() {
        const scores = this.getScores();
        if (scores.length > 0) {
            return scores[0].score;
        }
        return 0;
    },

    /**
     * Clear all high scores (for testing)
     */
    clearScores() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            console.log('High scores cleared');
        } catch (e) {
            console.warn('Failed to clear high scores:', e);
        }
    }
};
