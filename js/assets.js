// ============================================
// ASSET MANAGER - Preloads images and sounds
// ============================================
const AssetManager = {
    images: {},
    sounds: {},

    totalAssets: 0,
    loadedAssets: 0,

    // Keys that require transparency processing (removal of black background)
    transparencyKeys: [
        'projectile_player', 'projectile_enemy',
        'enemy_drone', 'enemy_interceptor', 'enemy_gunship', 'enemy_carrier', 'enemy_missile',
        'boss_main', 'miniboss_charger', 'miniboss_gunner'
    ],

    // Asset manifest - add entries here as sprites are created
    manifest: {
        images: {
            // Phase 2 - Player & Projectiles
            // Using additive blend mode ('lighter') - black backgrounds become transparent
            'player_p1': 'assets/player_p1.svg',
            'player_p2': 'assets/player_p2.svg',
            'projectile_player': 'assets/projectile_player.png',
            'projectile_enemy': 'assets/projectile_enemy.png',

            // Phase 3 - Enemies (all with black backgrounds)
            'enemy_drone': 'assets/enemy_drone.png',
            'enemy_interceptor': 'assets/enemy_interceptor.png',
            'enemy_gunship': 'assets/enemy_gunship.png',
            'enemy_carrier': 'assets/enemy_carrier.png',
            'enemy_missile': 'assets/enemy_missile.png',

            // Phase 4 - Bosses & Mini-Bosses
            'boss_main': 'assets/boss_main.png',
            'miniboss_charger': 'assets/miniboss_charger.png',
            'miniboss_gunner': 'assets/miniboss_gunner.png',

            // Phase 5 - Environment
            // Building tileset (4x4 grid, dynamically scaled from actual image dimensions)
            'building_tileset': 'assets/building_tileset.png',
            // Background - custom cityscape
            'bg_cityscape': 'assets/bg_cityscape.jpg',
            // Legacy parallax layers (kept for reference)
            'bg_skyline': 'assets/bg_skyline.png',
            'bg_ruins': 'assets/bg_ruins.png',

            // Splash screen assets (already exist)
            'splash_bg': 'assets/splash_bg.png',
            'splash_logo': 'assets/splash_logo.png'
        },
        sounds: {
            // Future: Add sound file paths here
            // 'shoot': 'assets/sounds/shoot.wav'
        }
    },

    /**
     * Initialize and load all assets
     * @returns {Promise} Resolves when all assets are loaded
     */
    load() {
        return new Promise((resolve, reject) => {
            const imageKeys = Object.keys(this.manifest.images);
            const soundKeys = Object.keys(this.manifest.sounds);

            this.totalAssets = imageKeys.length + soundKeys.length;
            this.loadedAssets = 0;

            if (this.totalAssets === 0) {
                resolve();
                return;
            }

            const checkComplete = () => {
                if (this.loadedAssets >= this.totalAssets) {
                    console.log('AssetManager: All assets loaded!');
                    resolve();
                }
            };

            // Load images
            imageKeys.forEach(key => {
                const img = new Image();
                img.onload = () => {
                    // Check if this image needs transparency processing
                    if (this.transparencyKeys.includes(key)) {
                        try {
                            this.images[key] = this.processTransparency(img);
                        } catch (e) {
                            console.warn(`AssetManager: Transparency processing blocked for '${key}' (CORS). Using original.`, e);
                            this.images[key] = img;
                        }
                    } else {
                        this.images[key] = img;
                    }

                    this.loadedAssets++;
                    console.log(`AssetManager: Loaded image '${key}' (${this.loadedAssets}/${this.totalAssets})`);
                    checkComplete();
                };
                img.onerror = () => {
                    console.warn(`AssetManager: Failed to load image '${key}'`);
                    this.loadedAssets++;
                    checkComplete();
                };
                img.src = this.manifest.images[key];
            });

            // Load sounds (using AudioContext for better control)
            soundKeys.forEach(key => {
                fetch(this.manifest.sounds[key])
                    .then(response => response.arrayBuffer())
                    .then(buffer => {
                        if (SoundManager.ctx) {
                            return SoundManager.ctx.decodeAudioData(buffer);
                        }
                        throw new Error('No audio context');
                    })
                    .then(audioBuffer => {
                        this.sounds[key] = audioBuffer;
                        this.loadedAssets++;
                        console.log(`AssetManager: Loaded sound '${key}' (${this.loadedAssets}/${this.totalAssets})`);
                        checkComplete();
                    })
                    .catch(err => {
                        console.warn(`AssetManager: Failed to load sound '${key}'`, err);
                        this.loadedAssets++;
                        checkComplete();
                    });
            });
        });
    },

    /**
     * Get loading progress (0-1)
     */
    getProgress() {
        if (this.totalAssets === 0) return 1;
        return this.loadedAssets / this.totalAssets;
    },

    /**
     * Get an image by key
     */
    getImage(key) {
        return this.images[key] || null;
    },

    /**
     * Get a sound buffer by key
     */
    getSound(key) {
        return this.sounds[key] || null;
    },

    /**
     * Play a loaded sound
     */
    playSound(key, volume = 1) {
        const buffer = this.sounds[key];
        if (!buffer || !SoundManager.ctx || !SoundManager.enabled) return;

        SoundManager.resume();
        const source = SoundManager.ctx.createBufferSource();
        const gain = SoundManager.ctx.createGain();
        source.buffer = buffer;
        source.connect(gain);
        gain.connect(SoundManager.ctx.destination);
        gain.gain.value = volume * SoundManager.masterVolume;
        source.start(0);
    },

    /**
     * Process an image to make black pixels transparent (Chroma Key)
     */
    processTransparency(img) {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Loop through pixels
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // If pixel is black (or very close to it), make it transparent
            // Threshold of 15 allows for compression artifacts
            if (r < 15 && g < 15 && b < 15) {
                data[i + 3] = 0; // Alpha = 0
            }
        }

        ctx.putImageData(imageData, 0, 0);

        const newImg = new Image();
        newImg.src = canvas.toDataURL();
        return newImg;
    }
};
