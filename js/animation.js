// ============================================
// ANIMATED SPRITE SYSTEM
// Handles sprite sheet animations for particles,
// characters, and effects
// ============================================

/**
 * Parse sprite sheet filename to extract frame dimensions
 * Format: [frameWidth]x[frameHeight]_[name].png
 * Example: "32x32_Civilian_Help.png" -> { frameWidth: 32, frameHeight: 32, name: "Civilian_Help" }
 * @param {string} filename - The sprite sheet filename
 * @returns {Object|null} Parsed dimensions and name, or null if invalid format
 */
function parseSheetFilename(filename) {
    // Extract just the filename if a path is provided
    const basename = filename.split('/').pop().split('\\').pop();

    // Match pattern: [width]x[height]_[name].png
    const match = basename.match(/^(\d+)x(\d+)_(.+)\.(png|jpg|gif)$/i);

    if (!match) {
        return null;
    }

    return {
        frameWidth: parseInt(match[1], 10),
        frameHeight: parseInt(match[2], 10),
        name: match[3]
    };
}

/**
 * Count valid (non-transparent) frames in a sprite sheet
 * @param {HTMLImageElement|HTMLCanvasElement} sheet - The sprite sheet image
 * @param {number} frameWidth - Width of each frame
 * @param {number} frameHeight - Height of each frame
 * @returns {Object} { frameCount, framesPerRow, validFrameIndices }
 */
function countValidFrames(sheet, frameWidth, frameHeight) {
    const framesPerRow = Math.floor(sheet.width / frameWidth);
    const rowCount = Math.floor(sheet.height / frameHeight);
    const totalPossibleFrames = framesPerRow * rowCount;

    // If we can't read pixel data (CORS), assume all frames are valid
    let validFrameIndices = [];

    try {
        // Create a temporary canvas to read pixel data
        const canvas = document.createElement('canvas');
        canvas.width = sheet.width;
        canvas.height = sheet.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(sheet, 0, 0);

        for (let i = 0; i < totalPossibleFrames; i++) {
            const col = i % framesPerRow;
            const row = Math.floor(i / framesPerRow);
            const srcX = col * frameWidth;
            const srcY = row * frameHeight;

            // Get pixel data for this frame
            const imageData = ctx.getImageData(srcX, srcY, frameWidth, frameHeight);
            const data = imageData.data;

            // Check if frame has any non-transparent pixels
            let hasContent = false;
            for (let j = 3; j < data.length; j += 4) { // Check alpha channel
                if (data[j] > 0) {
                    hasContent = true;
                    break;
                }
            }

            if (hasContent) {
                validFrameIndices.push(i);
            }
        }
    } catch (e) {
        console.warn('countValidFrames: Could not read pixel data (CORS?), assuming all frames valid:', e);
        // Fall back to assuming all frames are valid
        for (let i = 0; i < totalPossibleFrames; i++) {
            validFrameIndices.push(i);
        }
    }

    // If no valid frames found, assume all frames are valid (sprite may not have transparency)
    if (validFrameIndices.length === 0) {
        console.warn('countValidFrames: No valid frames detected, assuming all frames valid');
        for (let i = 0; i < totalPossibleFrames; i++) {
            validFrameIndices.push(i);
        }
    }

    return {
        frameCount: validFrameIndices.length,
        framesPerRow: framesPerRow,
        rowCount: rowCount,
        validFrameIndices: validFrameIndices
    };
}

/**
 * AnimatedSprite - Renders animated sprites from sprite sheets
 *
 * Supports both single-row and multi-row sprite sheets:
 * Single row:          Multi-row (grid):
 * +---+---+---+---+    +---+---+---+
 * | 0 | 1 | 2 | 3 |    | 0 | 1 | 2 |
 * +---+---+---+---+    +---+---+---+
 *                      | 3 | 4 | 5 |
 *                      +---+---+---+
 */
class AnimatedSprite {
    /**
     * @param {Object} config
     * @param {HTMLImageElement} config.sheet - The sprite sheet image
     * @param {number} config.frameWidth - Width of each frame in pixels
     * @param {number} config.frameHeight - Height of each frame in pixels
     * @param {number} config.frameCount - Total number of valid frames
     * @param {number} [config.framesPerRow] - Frames per row (defaults to frameCount for single-row)
     * @param {number[]} [config.validFrameIndices] - Array of valid frame indices (for sparse sheets)
     * @param {number} [config.fps=10] - Frames per second (8-12 recommended)
     * @param {string} [config.mode='loop'] - 'loop', 'once', 'pingpong'
     * @param {number} [config.scale=1] - Render scale multiplier
     * @param {Function} [config.onComplete] - Callback when 'once' mode finishes
     */
    constructor(config) {
        this.sheet = config.sheet;
        this.frameWidth = config.frameWidth;
        this.frameHeight = config.frameHeight;
        this.frameCount = config.frameCount;
        this.framesPerRow = config.framesPerRow || config.frameCount; // Default: single row
        this.validFrameIndices = config.validFrameIndices || null; // Optional sparse frame support
        this.fps = config.fps || 10;
        this.mode = config.mode || 'loop';
        this.scale = config.scale || 1;
        this.onComplete = config.onComplete || null;

        // Animation state
        this.currentFrame = 0;
        this.frameTimer = 0;
        this.frameDuration = 1 / this.fps;
        this.isPlaying = true;
        this.isComplete = false;
        this.pingPongDirection = 1; // 1 = forward, -1 = backward

        // Optional: rotation and alpha
        this.rotation = 0;
        this.alpha = 1;
    }

    /**
     * Update animation state
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        if (!this.isPlaying || this.isComplete) return;

        this.frameTimer += deltaTime;

        while (this.frameTimer >= this.frameDuration) {
            this.frameTimer -= this.frameDuration;
            this.advanceFrame();
        }
    }

    /**
     * Advance to next frame based on playback mode
     */
    advanceFrame() {
        switch (this.mode) {
            case 'loop':
                this.currentFrame = (this.currentFrame + 1) % this.frameCount;
                break;

            case 'once':
                if (this.currentFrame < this.frameCount - 1) {
                    this.currentFrame++;
                } else {
                    this.isComplete = true;
                    this.isPlaying = false;
                    if (this.onComplete) this.onComplete();
                }
                break;

            case 'pingpong':
                this.currentFrame += this.pingPongDirection;
                if (this.currentFrame >= this.frameCount - 1) {
                    this.pingPongDirection = -1;
                } else if (this.currentFrame <= 0) {
                    this.pingPongDirection = 1;
                }
                break;
        }
    }

    /**
     * Render the current frame
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     */
    render(ctx, x, y) {
        if (!this.sheet || this.isComplete) return;

        // Get the actual frame index in the sprite sheet
        let sheetFrameIndex = this.currentFrame;
        if (this.validFrameIndices && this.validFrameIndices.length > 0) {
            // Use sparse frame mapping
            sheetFrameIndex = this.validFrameIndices[this.currentFrame] || 0;
        }

        // Calculate source position based on row/column
        const col = sheetFrameIndex % this.framesPerRow;
        const row = Math.floor(sheetFrameIndex / this.framesPerRow);
        const srcX = col * this.frameWidth;
        const srcY = row * this.frameHeight;

        const destWidth = this.frameWidth * this.scale;
        const destHeight = this.frameHeight * this.scale;

        ctx.save();
        ctx.translate(x, y);

        if (this.rotation !== 0) {
            ctx.rotate(this.rotation);
        }

        if (this.alpha !== 1) {
            ctx.globalAlpha = this.alpha;
        }

        ctx.drawImage(
            this.sheet,
            srcX, srcY, this.frameWidth, this.frameHeight,
            -destWidth / 2, -destHeight / 2, destWidth, destHeight
        );

        ctx.restore();
    }

    /**
     * Reset animation to beginning
     */
    reset() {
        this.currentFrame = 0;
        this.frameTimer = 0;
        this.isPlaying = true;
        this.isComplete = false;
        this.pingPongDirection = 1;
    }

    /**
     * Jump to specific frame
     * @param {number} frame
     */
    setFrame(frame) {
        this.currentFrame = Math.max(0, Math.min(frame, this.frameCount - 1));
    }

    /**
     * Pause animation
     */
    pause() {
        this.isPlaying = false;
    }

    /**
     * Resume animation
     */
    play() {
        this.isPlaying = true;
    }
}

/**
 * AnimatedParticle - A particle that uses an AnimatedSprite
 * Used for debris, sparks, smoke, etc.
 */
class AnimatedParticle {
    /**
     * @param {Object} config
     * @param {number} config.x - Start X position
     * @param {number} config.y - Start Y position
     * @param {number} config.vx - Velocity X
     * @param {number} config.vy - Velocity Y
     * @param {AnimatedSprite} config.sprite - The animated sprite to render
     * @param {number} [config.gravity=0] - Gravity to apply
     * @param {number} [config.lifetime=1] - How long particle lives (seconds)
     * @param {number} [config.fadeStart=0.7] - When to start fading (0-1)
     * @param {number} [config.rotationSpeed=0] - Rotation speed (radians/sec)
     */
    constructor(config) {
        this.x = config.x;
        this.y = config.y;
        this.vx = config.vx || 0;
        this.vy = config.vy || 0;
        this.sprite = config.sprite;
        this.gravity = config.gravity || 0;
        this.lifetime = config.lifetime || 1;
        this.fadeStart = config.fadeStart || 0.7;
        this.rotationSpeed = config.rotationSpeed || 0;

        this.age = 0;
        this.active = true;
    }

    update(deltaTime) {
        if (!this.active) return;

        // Physics
        this.vy += this.gravity * deltaTime;
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;

        // Rotation
        if (this.rotationSpeed !== 0) {
            this.sprite.rotation += this.rotationSpeed * deltaTime;
        }

        // Aging
        this.age += deltaTime;

        // Fade out
        const lifeProgress = this.age / this.lifetime;
        if (lifeProgress >= this.fadeStart) {
            const fadeProgress = (lifeProgress - this.fadeStart) / (1 - this.fadeStart);
            this.sprite.alpha = 1 - fadeProgress;
        }

        // Death
        if (this.age >= this.lifetime) {
            this.active = false;
        }

        // Update sprite animation
        this.sprite.update(deltaTime);
    }

    render(ctx) {
        if (!this.active) return;
        this.sprite.render(ctx, this.x, this.y);
    }
}

/**
 * ParticleEmitter - Manages a pool of AnimatedParticles
 */
class ParticleEmitter {
    constructor() {
        this.particles = [];
    }

    /**
     * Spawn particles for an explosion effect
     * @param {Object} config
     * @param {number} config.x - Center X
     * @param {number} config.y - Center Y
     * @param {HTMLImageElement} config.sheet - Sprite sheet for particles
     * @param {number} config.frameWidth - Width per frame
     * @param {number} config.frameHeight - Height per frame
     * @param {number} config.frameCount - Number of frames
     * @param {number} [config.count=20] - Number of particles
     * @param {number} [config.speed=100] - Base speed
     * @param {number} [config.gravity=200] - Gravity
     * @param {number} [config.lifetime=1] - Particle lifetime
     * @param {number} [config.scale=1] - Particle scale
     */
    emit(config) {
        const count = config.count || 20;

        for (let i = 0; i < count; i++) {
            // Random direction
            const angle = Math.random() * Math.PI * 2;
            const speed = config.speed * (0.5 + Math.random() * 0.5);

            const sprite = new AnimatedSprite({
                sheet: config.sheet,
                frameWidth: config.frameWidth,
                frameHeight: config.frameHeight,
                frameCount: config.frameCount,
                fps: 10,
                mode: 'loop',
                scale: config.scale || (0.5 + Math.random() * 0.5)
            });

            // Randomize starting frame
            sprite.setFrame(Math.floor(Math.random() * config.frameCount));

            const particle = new AnimatedParticle({
                x: config.x,
                y: config.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 50, // Upward bias
                sprite: sprite,
                gravity: config.gravity || 200,
                lifetime: config.lifetime || (0.5 + Math.random() * 0.5),
                fadeStart: 0.6,
                rotationSpeed: (Math.random() - 0.5) * 10
            });

            this.particles.push(particle);
        }
    }

    update(deltaTime) {
        for (const p of this.particles) {
            p.update(deltaTime);
        }
        // Remove dead particles
        this.particles = this.particles.filter(p => p.active);
    }

    render(ctx) {
        for (const p of this.particles) {
            p.render(ctx);
        }
    }

    clear() {
        this.particles = [];
    }
}

// Global particle emitter instance
const particleEmitter = new ParticleEmitter();
