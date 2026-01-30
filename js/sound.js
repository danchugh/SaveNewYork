// ============================================
// CONTRA-STYLE SOUND SYSTEM (Web Audio API)
// Punchy, impactful arcade audio effects
// ============================================

// Sound priority and throttle configuration
const SoundConfig = {
    PRIORITY: { CRITICAL: 100, HIGH: 75, MEDIUM: 50, LOW: 25 },

    SOUNDS: {
        // Critical - always play
        playerDeath: { priority: 100, throttle: 0, maxVoices: 2 },
        victory: { priority: 100, throttle: 0, maxVoices: 1 },
        gameOver: { priority: 100, throttle: 0, maxVoices: 1 },
        oneUp: { priority: 100, throttle: 0, maxVoices: 1 },

        // High - important feedback
        shoot: { priority: 75, throttle: 50, maxVoices: 3 },
        enemyDeath: { priority: 75, throttle: 60, maxVoices: 4, intensityScale: true },
        bossHit: { priority: 75, throttle: 100, maxVoices: 2 },
        shieldCollect: { priority: 75, throttle: 0, maxVoices: 1 },
        shieldBreak: { priority: 75, throttle: 0, maxVoices: 1 },
        miniBossAppear: { priority: 75, throttle: 0, maxVoices: 1 },

        // Medium - environmental
        blockDestroyed: { priority: 50, throttle: 25, maxVoices: 3, intensityScale: true },
        fallingCrash: { priority: 50, throttle: 120, maxVoices: 2 },
        tankHit: { priority: 50, throttle: 80, maxVoices: 2 },
        thunder: { priority: 50, throttle: 2000, maxVoices: 1 },

        // Low - can be skipped when busy
        materialCollect: { priority: 25, throttle: 40, maxVoices: 2, intensityScale: true },
        blockRepaired: { priority: 25, throttle: 80, maxVoices: 2 },
    },

    GLOBAL_MAX_VOICES: 16,
    DUCKING_THRESHOLD: 10,      // Start ducking low-priority at this count
    SKIP_THRESHOLD: 14,         // Skip LOW priority entirely above this
    LOW_PRIORITY_DUCK: 0.4      // Volume multiplier when ducking
};

// Voice and throttle state tracking
const SoundState = {
    activeVoices: new Map(),    // soundId -> count of active voices
    totalVoices: 0,
    lastPlayTime: new Map(),    // soundId -> timestamp (ms)
    intensityCounts: new Map(), // soundId -> { count, windowStart }

    reset() {
        this.activeVoices.clear();
        this.totalVoices = 0;
        this.lastPlayTime.clear();
        this.intensityCounts.clear();
    }
};

const SoundManager = {
    ctx: null,
    enabled: true,
    masterVolume: 0.3, // Keep original volume as requested
    _debugSound: false, // Set to true to log blocked sounds

    init() {
        if (!this.ctx) {
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('Web Audio API not supported');
                this.enabled = false;
            }
        }
    },

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    // Core sound dispatcher with throttling, voice limiting, and priority
    _requestSound(soundId, playFn, duration = 0.2) {
        if (!this.enabled || !this.ctx) return false;

        const config = SoundConfig.SOUNDS[soundId];
        if (!config) {
            // Unconfigured sound - play directly (backward compat)
            playFn(1.0);
            return true;
        }

        const now = Date.now();
        let blockReason = null;

        // 1. Throttle check
        const lastPlay = SoundState.lastPlayTime.get(soundId) || 0;
        if (config.throttle > 0 && now - lastPlay < config.throttle) {
            blockReason = 'throttled';
        }

        // 2. Voice limit check (per-sound)
        if (!blockReason) {
            const activeCount = SoundState.activeVoices.get(soundId) || 0;
            if (activeCount >= config.maxVoices) {
                blockReason = 'maxVoices';
            }
        }

        // 3. Global voice limit with priority check
        if (!blockReason && SoundState.totalVoices >= SoundConfig.GLOBAL_MAX_VOICES) {
            if (config.priority < SoundConfig.PRIORITY.CRITICAL) {
                blockReason = 'globalLimit';
            }
            // Critical sounds always play
        }

        // 4. Skip low priority when very busy
        if (!blockReason && config.priority <= SoundConfig.PRIORITY.LOW) {
            if (SoundState.totalVoices >= SoundConfig.SKIP_THRESHOLD) {
                blockReason = 'skipThreshold';
            }
        }

        // If blocked, log and return
        if (blockReason) {
            if (this._debugSound) {
                console.log(`[Sound] ${soundId} blocked: ${blockReason}, active: ${SoundState.totalVoices}`);
            }
            return false;
        }

        // 5. Ducking for low priority when busy
        let volumeMod = 1.0;
        if (config.priority <= SoundConfig.PRIORITY.LOW) {
            if (SoundState.totalVoices >= SoundConfig.DUCKING_THRESHOLD) {
                volumeMod = SoundConfig.LOW_PRIORITY_DUCK;
            }
        }

        // 6. Intensity scaling for rapid calls
        if (config.intensityScale) {
            let intensity = SoundState.intensityCounts.get(soundId);
            const window = 400; // 400ms window
            if (!intensity || now - intensity.windowStart > window) {
                intensity = { count: 0, windowStart: now };
            }
            intensity.count++;
            SoundState.intensityCounts.set(soundId, intensity);
            // Scale volume up slightly for rapid calls (max 1.4x)
            volumeMod *= Math.min(1.4, 1.0 + (intensity.count - 1) * 0.08);
        }

        // Update state
        SoundState.lastPlayTime.set(soundId, now);
        const activeCount = SoundState.activeVoices.get(soundId) || 0;
        SoundState.activeVoices.set(soundId, activeCount + 1);
        SoundState.totalVoices++;

        // Play the sound
        this.resume();
        playFn(volumeMod);

        // Schedule voice release
        setTimeout(() => {
            const count = SoundState.activeVoices.get(soundId) || 1;
            SoundState.activeVoices.set(soundId, Math.max(0, count - 1));
            SoundState.totalVoices = Math.max(0, SoundState.totalVoices - 1);
        }, duration * 1000 + 50);

        return true;
    },

    /**
     * Play a loaded AudioBuffer from AssetManager
     * @param {string} key - The sound key in AssetManager.sounds
     * @param {number} volume - Volume multiplier (0-1)
     * @returns {boolean} True if sample was played, false if not available
     */
    playBuffer(key, volume = 1.0) {
        if (!this.enabled || !this.ctx) return false;

        // Check if we have a loaded sample
        const buffer = typeof AssetManager !== 'undefined' ? AssetManager.sounds[key] : null;
        if (!buffer) return false;

        this.resume();

        const source = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        source.buffer = buffer;
        source.connect(gain);
        gain.connect(this.ctx.destination);
        gain.gain.setValueAtTime(volume * this.masterVolume, this.ctx.currentTime);
        source.start(this.ctx.currentTime);

        return true;
    },

    // ========== ENHANCED AUDIO HELPERS ==========

    // Create distortion curve for gritty sound
    createDistortionCurve(amount = 50) {
        const samples = 44100;
        const curve = new Float32Array(samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1;
            curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
        }
        return curve;
    },

    // Punchy tone with hard attack - Contra style
    playPunchyTone(frequency, duration, type = 'square', volume = 1, useDistortion = false) {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const now = this.ctx.currentTime;

        if (useDistortion) {
            const distortion = this.ctx.createWaveShaper();
            distortion.curve = this.createDistortionCurve(20);
            distortion.oversample = '2x';
            osc.connect(distortion);
            distortion.connect(gain);
        } else {
            osc.connect(gain);
        }
        gain.connect(this.ctx.destination);

        osc.type = type;
        osc.frequency.setValueAtTime(frequency, now);

        // Hard attack, quick decay for punch
        const vol = volume * this.masterVolume;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(vol * 1.5, now + 0.005); // Fast attack with overshoot
        gain.gain.linearRampToValueAtTime(vol, now + 0.02); // Quick settle
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.start(now);
        osc.stop(now + duration);
    },

    // Layered explosion - multiple noise bursts for impact
    playLayeredExplosion(duration, volume = 1, lowFreq = 40) {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const now = this.ctx.currentTime;

        // Layer 1: Low rumble
        const bufferSize1 = Math.floor(this.ctx.sampleRate * duration);
        const buffer1 = this.ctx.createBuffer(1, bufferSize1, this.ctx.sampleRate);
        const data1 = buffer1.getChannelData(0);
        for (let i = 0; i < bufferSize1; i++) {
            data1[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize1 * 0.3));
        }
        const noise1 = this.ctx.createBufferSource();
        const gain1 = this.ctx.createGain();
        const lowpass = this.ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 200;
        noise1.buffer = buffer1;
        noise1.connect(lowpass);
        lowpass.connect(gain1);
        gain1.connect(this.ctx.destination);
        gain1.gain.setValueAtTime(volume * this.masterVolume * 1.2, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + duration);
        noise1.start(now);

        // Layer 2: Mid crunch
        const bufferSize2 = Math.floor(this.ctx.sampleRate * duration * 0.7);
        const buffer2 = this.ctx.createBuffer(1, bufferSize2, this.ctx.sampleRate);
        const data2 = buffer2.getChannelData(0);
        for (let i = 0; i < bufferSize2; i++) {
            data2[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize2 * 0.15));
        }
        const noise2 = this.ctx.createBufferSource();
        const gain2 = this.ctx.createGain();
        const bandpass = this.ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.value = 800;
        bandpass.Q.value = 1;
        noise2.buffer = buffer2;
        noise2.connect(bandpass);
        bandpass.connect(gain2);
        gain2.connect(this.ctx.destination);
        gain2.gain.setValueAtTime(volume * this.masterVolume * 0.8, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.7);
        noise2.start(now);

        // Layer 3: Bass thump
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(lowFreq, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + duration * 0.8);
        oscGain.gain.setValueAtTime(volume * this.masterVolume * 1.5, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.8);
        osc.start(now);
        osc.stop(now + duration);
    },

    // Laser/beam sound with frequency sweep
    playLaser(startFreq, endFreq, duration, volume = 1) {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const now = this.ctx.currentTime;

        // Main oscillator
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(startFreq, now);
        osc1.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(volume * this.masterVolume, now + 0.003);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc1.start(now);
        osc1.stop(now + duration);

        // Harmonic overtone for richness
        const osc2 = this.ctx.createOscillator();
        const gain2 = this.ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(this.ctx.destination);
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(startFreq * 1.5, now);
        osc2.frequency.exponentialRampToValueAtTime(endFreq * 1.5, now + duration);
        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(volume * this.masterVolume * 0.3, now + 0.003);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc2.start(now);
        osc2.stop(now + duration);
    },

    // Simple noise burst (legacy compatibility)
    playNoise(duration, volume = 1) {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const bufferSize = Math.floor(this.ctx.sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.5));
        }

        const noise = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        noise.buffer = buffer;
        noise.connect(gain);
        gain.connect(this.ctx.destination);
        gain.gain.setValueAtTime(volume * this.masterVolume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        noise.start(this.ctx.currentTime);
    },

    // Simple tone (legacy compatibility)
    playTone(frequency, duration, type = 'square', volume = 1) {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
        gain.gain.setValueAtTime(volume * this.masterVolume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + duration);
    },

    shoot() {
        this._requestSound('shoot', (volMod) => {
            // Try loaded sample first, fallback to oscillator
            if (this.playBuffer('shoot', 0.5 * volMod)) return;
            // Punchy rapid-fire like Contra machine gun
            this.playLaser(1200, 400, 0.06, 0.6 * volMod);
            this.playPunchyTone(200, 0.03, 'square', 0.3 * volMod, true);
        }, 0.08);
    },

    enemyDeath() {
        this._requestSound('enemyDeath', (volMod) => {
            // Try loaded sample first
            if (this.playBuffer('enemy_death', 0.7 * volMod)) return;
            // Fallback: Sharp explosion with satisfying crunch
            if (!this.ctx) return;

            const now = this.ctx.currentTime;

            // Fast descending sweep
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const distortion = this.ctx.createWaveShaper();
            distortion.curve = this.createDistortionCurve(30);
            osc.connect(distortion);
            distortion.connect(gain);
            gain.connect(this.ctx.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
            gain.gain.setValueAtTime(0.5 * volMod * this.masterVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);

            // Noise burst overlay
            this.playNoise(0.1, 0.5 * volMod);
        }, 0.15);
    },

    playerDeath() {
        this._requestSound('playerDeath', (volMod) => {
            // Use explosion sample for deeper impact, or try player_death
            if (this.playBuffer('explosion', 1.0 * volMod)) return;
            // Fallback: Deep cinematic explosion
            this.playLayeredExplosion(0.8, 1.2 * volMod, 30); // Lower freq for deeper rumble
            setTimeout(() => this.playLayeredExplosion(0.5, 0.8 * volMod, 25), 100);
            setTimeout(() => this.playPunchyTone(50, 0.4, 'sawtooth', 0.9 * volMod), 50);
        }, 0.8);
    },

    blockDestroyed() {
        this._requestSound('blockDestroyed', (volMod) => {
            // Try loaded sample first
            if (this.playBuffer('block_destroy', 0.6 * volMod)) return;
            // Fallback: Quick debris crunch
            this.playPunchyTone(300, 0.04, 'square', 0.4 * volMod, true);
            this.playNoise(0.06, 0.5 * volMod);
        }, 0.08);
    },

    buildingCollapse() {
        // Heavy structural collapse
        this.playLayeredExplosion(0.5, 0.8, 60);
        setTimeout(() => this.playNoise(0.3, 0.5), 150);
        setTimeout(() => this.playPunchyTone(40, 0.4, 'sawtooth', 0.6), 200);
    },

    refuelStart() {
        // Power-up charging sound
        this.playPunchyTone(400, 0.08, 'sine', 0.4);
        setTimeout(() => this.playPunchyTone(600, 0.08, 'sine', 0.4), 80);
    },

    refuelComplete() {
        // Try loaded sample first
        if (this.playBuffer('refuel_complete', 0.7)) return;
        // Fallback: Satisfying power-up jingle
        this.playPunchyTone(523, 0.1, 'square', 0.5);
        setTimeout(() => this.playPunchyTone(659, 0.1, 'square', 0.5), 100);
        setTimeout(() => this.playPunchyTone(784, 0.15, 'square', 0.6), 200);
    },

    bossHit() {
        this._requestSound('bossHit', (volMod) => {
            // Try loaded sample first
            if (this.playBuffer('boss_hit', 0.8 * volMod)) return;
            // Fallback: Heavy metallic impact
            this.playPunchyTone(150, 0.12, 'sawtooth', 0.7 * volMod, true);
            this.playNoise(0.08, 0.6 * volMod);
            this.playPunchyTone(80, 0.1, 'square', 0.5 * volMod);
        }, 0.15);
    },

    victory() {
        this._requestSound('victory', (volMod) => {
            // Try loaded sample first
            if (this.playBuffer('victory', 0.8 * volMod)) return;
            // Fallback: Epic victory fanfare
            const notes = [523, 659, 784, 1047];
            notes.forEach((freq, i) => {
                setTimeout(() => this.playPunchyTone(freq, 0.25, 'square', 0.6 * volMod), i * 150);
            });
            setTimeout(() => this.playNoise(0.3, 0.3 * volMod), 600);
        }, 1.0);
    },

    gameOver() {
        this._requestSound('gameOver', (volMod) => {
            // Try loaded sample first
            if (this.playBuffer('game_over', 0.8 * volMod)) return;
            // Fallback: Dramatic descending doom
            const notes = [400, 300, 200, 100];
            notes.forEach((freq, i) => {
                setTimeout(() => this.playPunchyTone(freq, 0.3, 'sawtooth', 0.5 * volMod), i * 250);
            });
        }, 1.0);
    },

    gameStart() {
        // Energetic start sound
        this.playLaser(300, 800, 0.15, 0.5);
        setTimeout(() => this.playPunchyTone(660, 0.2, 'square', 0.6), 150);
    },

    takeoff() {
        // Spaceship launch sound - building thrust and whoosh
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const now = this.ctx.currentTime;

        // Layer 1: Low frequency thrust rumble (building up)
        const rumble = this.ctx.createOscillator();
        const rumbleGain = this.ctx.createGain();
        rumble.connect(rumbleGain);
        rumbleGain.connect(this.ctx.destination);
        rumble.type = 'sawtooth';
        rumble.frequency.setValueAtTime(40, now);
        rumble.frequency.exponentialRampToValueAtTime(80, now + 0.3);
        rumble.frequency.exponentialRampToValueAtTime(150, now + 0.8);
        rumbleGain.gain.setValueAtTime(0.3 * this.masterVolume, now);
        rumbleGain.gain.linearRampToValueAtTime(0.6 * this.masterVolume, now + 0.4);
        rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        rumble.start(now);
        rumble.stop(now + 1.0);

        // Layer 2: Jet afterburner whoosh (ascending)
        const jet = this.ctx.createOscillator();
        const jetGain = this.ctx.createGain();
        jet.connect(jetGain);
        jetGain.connect(this.ctx.destination);
        jet.type = 'square';
        jet.frequency.setValueAtTime(100, now + 0.2);
        jet.frequency.exponentialRampToValueAtTime(400, now + 0.7);
        jet.frequency.exponentialRampToValueAtTime(800, now + 1.0);
        jetGain.gain.setValueAtTime(0, now);
        jetGain.gain.linearRampToValueAtTime(0.25 * this.masterVolume, now + 0.3);
        jetGain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        jet.start(now + 0.2);
        jet.stop(now + 1.0);

        // Layer 3: Noise burst for rocket exhaust
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.8);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        const noise = this.ctx.createBufferSource();
        const noiseGain = this.ctx.createGain();
        const lowpass = this.ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 600;
        noise.buffer = buffer;
        noise.connect(lowpass);
        lowpass.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noiseGain.gain.setValueAtTime(0.4 * this.masterVolume, now + 0.1);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
        noise.start(now + 0.1);
    },

    enemyFalling() {
        // Dramatic whistle down
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.6);
        gain.gain.setValueAtTime(0.4 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
    },

    fallingCrash() {
        this._requestSound('fallingCrash', (volMod) => {
            // Ground-shaking impact
            this.playLayeredExplosion(0.35, 0.9 * volMod, 45);
        }, 0.35);
    },

    enemySplit() {
        // Alien split effect
        this.playLaser(600, 1200, 0.08, 0.4);
        setTimeout(() => this.playLaser(800, 400, 0.08, 0.35), 60);
    },

    tankHit() {
        this._requestSound('tankHit', (volMod) => {
            // Metallic armor clang
            this.playPunchyTone(250, 0.08, 'square', 0.6 * volMod, true);
            this.playNoise(0.05, 0.4 * volMod);
        }, 0.1);
    },

    tankDeath() {
        // Massive vehicle explosion (not throttled - important event)
        this.playLayeredExplosion(0.5, 1.0, 50);
        setTimeout(() => this.playLayeredExplosion(0.35, 0.7, 70), 150);
    },

    bomberDive() {
        // Menacing dive siren
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const distortion = this.ctx.createWaveShaper();
        distortion.curve = this.createDistortionCurve(15);
        osc.connect(distortion);
        distortion.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.6);
        gain.gain.setValueAtTime(0.35 * this.masterVolume, now);
        gain.gain.linearRampToValueAtTime(0.5 * this.masterVolume, now + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
        osc.start(now);
        osc.stop(now + 0.65);
    },

    bomberCrash() {
        // Aircraft destruction
        this.playLayeredExplosion(0.4, 0.9, 55);
    },

    thunder() {
        this._requestSound('thunder', (volMod) => {
            // Rolling thunder with multiple cracks
            this.playLayeredExplosion(1.0, 0.7 * volMod, 30);
            setTimeout(() => {
                this.playNoise(0.6, 0.5 * volMod);
                this.playPunchyTone(50, 0.5, 'sawtooth', 0.5 * volMod);
            }, 150);
            setTimeout(() => this.playNoise(0.4, 0.3 * volMod), 400);
        }, 1.0);
    },

    volcanoEruption() {
        // Deep earth-shaking rumble (not throttled - rare event)
        this.playLayeredExplosion(1.8, 0.9, 25);
        setTimeout(() => this.playLayeredExplosion(1.2, 0.7, 35), 400);
        setTimeout(() => {
            this.playNoise(1.0, 0.5);
            this.playPunchyTone(20, 1.0, 'sawtooth', 0.6);
        }, 800);
    },

    rockDestroyed() {
        // Boulder shatter (not throttled - uses same pattern as blockDestroyed but less frequent)
        this.playPunchyTone(250, 0.1, 'square', 0.5, true);
        this.playNoise(0.12, 0.6);
    },

    rockImpact() {
        // Heavy rock collision (not throttled - rare event)
        this.playLayeredExplosion(0.25, 0.7, 60);
    },

    miniBossAppear() {
        this._requestSound('miniBossAppear', (volMod) => {
            // Try loaded sample first
            if (this.playBuffer('boss_warning', 0.8 * volMod)) return;
            // Fallback: Dramatic warning klaxon
            this.playPunchyTone(150, 0.4, 'sawtooth', 0.6 * volMod);
            setTimeout(() => this.playPunchyTone(200, 0.4, 'sawtooth', 0.6 * volMod), 250);
            setTimeout(() => this.playPunchyTone(300, 0.5, 'square', 0.7 * volMod), 500);
            setTimeout(() => this.playNoise(0.2, 0.4 * volMod), 750);
        }, 1.0);
    },

    miniBossHit() {
        // Armored impact (uses bossHit throttle pattern)
        this._requestSound('bossHit', (volMod) => {
            this.playPunchyTone(180, 0.08, 'square', 0.6 * volMod, true);
            this.playNoise(0.06, 0.5 * volMod);
        }, 0.1);
    },

    miniBossDefeat() {
        // Epic destruction cascade
        this.playLayeredExplosion(0.6, 1.0, 45);
        setTimeout(() => {
            this.playPunchyTone(400, 0.2, 'square', 0.7);
            this.playLayeredExplosion(0.4, 0.8, 60);
        }, 200);
        setTimeout(() => this.playPunchyTone(600, 0.3, 'square', 0.8), 400);
    },

    miniBossCharge() {
        // Intimidating power-up
        this.playPunchyTone(60, 0.4, 'sawtooth', 0.7);
        this.playNoise(0.25, 0.4);
    },

    miniBossRam() {
        // Try loaded sample first
        if (this.playBuffer('miniboss_ram', 0.9)) return;
        // Fallback: Devastating charge impact
        this.playLayeredExplosion(0.45, 0.9, 40);
        this.playPunchyTone(40, 0.35, 'sawtooth', 0.8);
    },

    miniBossShoot() {
        // Heavy enemy weapon
        this.playLaser(600, 200, 0.08, 0.5);
        this.playPunchyTone(300, 0.04, 'square', 0.4, true);
    },

    // ========== CIVILIAN SOUNDS ==========

    civilianScream() {
        // Falling scream - descending pitch
        this.playLaser(800, 300, 0.6, 0.4);
        this.playLaser(600, 200, 0.5, 0.3);
    },

    civilianRescued() {
        // Happy pickup jingle
        this.playPunchyTone(523, 0.08, 'square', 0.5); // C5
        setTimeout(() => this.playPunchyTone(659, 0.08, 'square', 0.5), 80); // E5
        setTimeout(() => this.playPunchyTone(784, 0.15, 'square', 0.6), 160); // G5
    },

    // ========== CONSTRUCTION SOUNDS ==========

    constructionArrive() {
        // Truck horn
        this.playPunchyTone(220, 0.3, 'sawtooth', 0.4);
        this.playPunchyTone(277, 0.3, 'sawtooth', 0.3);
    },

    constructionComplete() {
        // Success fanfare
        this.playPunchyTone(392, 0.1, 'square', 0.5); // G4
        setTimeout(() => this.playPunchyTone(494, 0.1, 'square', 0.5), 100); // B4
        setTimeout(() => this.playPunchyTone(587, 0.2, 'square', 0.6), 200); // D5
    },

    blockRepaired() {
        this._requestSound('blockRepaired', (volMod) => {
            // Hammering/building sound
            this.playPunchyTone(200 + Math.random() * 100, 0.05, 'square', 0.3 * volMod);
            this.playNoise(0.03, 0.2 * volMod);
        }, 0.08);
    },

    // ========== SHIELD SOUNDS ==========

    shieldCollect() {
        this._requestSound('shieldCollect', (volMod) => {
            // Magical chime sound for shield pickup
            this.playPunchyTone(880, 0.1, 'sine', 0.4 * volMod);
            setTimeout(() => this.playPunchyTone(1100, 0.1, 'sine', 0.5 * volMod), 50);
            setTimeout(() => this.playPunchyTone(1320, 0.15, 'sine', 0.6 * volMod), 100);
            setTimeout(() => this.playPunchyTone(1760, 0.2, 'sine', 0.5 * volMod), 150);
        }, 0.35);
    },

    shieldBreak() {
        this._requestSound('shieldBreak', (volMod) => {
            // Glass shattering / energy dissipation
            this.playNoise(0.15, 0.5 * volMod);
            this.playPunchyTone(400, 0.1, 'sawtooth', 0.4 * volMod);
            setTimeout(() => this.playPunchyTone(300, 0.1, 'sawtooth', 0.3 * volMod), 50);
            setTimeout(() => this.playPunchyTone(200, 0.15, 'square', 0.3 * volMod), 100);
            setTimeout(() => this.playNoise(0.1, 0.3 * volMod), 80);
        }, 0.25);
    },

    // ========== MATERIAL SOUNDS ==========

    materialCollect() {
        this._requestSound('materialCollect', (volMod) => {
            // Metallic clink sound for collecting materials - like picking up coins/scrap
            if (!this.ctx) return;

            const now = this.ctx.currentTime;

            // High metallic ping
            const osc1 = this.ctx.createOscillator();
            const gain1 = this.ctx.createGain();
            osc1.connect(gain1);
            gain1.connect(this.ctx.destination);
            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(2400, now);
            osc1.frequency.exponentialRampToValueAtTime(1800, now + 0.08);
            gain1.gain.setValueAtTime(0.35 * volMod * this.masterVolume, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc1.start(now);
            osc1.stop(now + 0.1);

            // Second harmonic clink (slightly delayed)
            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(this.ctx.destination);
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(3200, now + 0.02);
            osc2.frequency.exponentialRampToValueAtTime(2000, now + 0.08);
            gain2.gain.setValueAtTime(0, now);
            gain2.gain.linearRampToValueAtTime(0.25 * volMod * this.masterVolume, now + 0.02);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            osc2.start(now + 0.02);
            osc2.stop(now + 0.12);

            // Tiny noise for texture
            this.playNoise(0.03, 0.15 * volMod);
        }, 0.12);
    },

    // ========== BONUS LIFE SOUND ==========

    oneUp() {
        this._requestSound('oneUp', (volMod) => {
            // Try loaded sample first
            if (this.playBuffer('one_up', 0.8 * volMod)) return;
            // Fallback: Classic 1UP sound - triumphant ascending cascade
            this.playPunchyTone(523, 0.12, 'square', 0.5 * volMod);  // C5
            setTimeout(() => this.playPunchyTone(659, 0.12, 'square', 0.5 * volMod), 80);  // E5
            setTimeout(() => this.playPunchyTone(784, 0.12, 'square', 0.5 * volMod), 160); // G5
            setTimeout(() => this.playPunchyTone(1047, 0.2, 'square', 0.6 * volMod), 240); // C6
            setTimeout(() => this.playPunchyTone(1319, 0.25, 'sine', 0.5 * volMod), 340);  // E6 (held)
        }, 0.5);
    },

    // ========== AMBIENT SOUNDS ==========


    ambientInterval: null,
    currentAmbient: null,

    stopAmbient() {
        if (this.ambientInterval) {
            clearInterval(this.ambientInterval);
            this.ambientInterval = null;
        }
        this.currentAmbient = null;
    },

    startCrickets() {
        this.stopAmbient();
        this.currentAmbient = 'crickets';

        const playCricket = () => {
            if (!this.enabled || !this.ctx) return;
            this.resume();

            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    this.playTone(4000 + Math.random() * 1000, 0.05, 'sine', 0.08);
                }, i * 60);
            }
        };

        playCricket();
        this.ambientInterval = setInterval(playCricket, 2000 + Math.random() * 2000);
    },

    startBirds() {
        this.stopAmbient();
        this.currentAmbient = 'birds';

        const playBird = () => {
            if (!this.enabled || !this.ctx) return;
            this.resume();

            const startFreq = 1500 + Math.random() * 500;
            const endFreq = 2000 + Math.random() * 1000;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(endFreq, this.ctx.currentTime + 0.1);
            osc.frequency.linearRampToValueAtTime(startFreq, this.ctx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.06 * this.masterVolume, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.08 * this.masterVolume, this.ctx.currentTime + 0.1);
            gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
            osc.start(this.ctx.currentTime);
            osc.stop(this.ctx.currentTime + 0.3);
        };

        playBird();
        this.ambientInterval = setInterval(playBird, 3000 + Math.random() * 4000);
    },

    updateAmbientForTime(timeOfDay) {
        // Disabled ambient sounds - they interfere with gameplay audio
        // and the bird chirps sound like enemy effects
        this.stopAmbient();
    },

    // ========== DUST DEVIL SOUNDS ==========

    dustDevilSuction() {
        // Ascending whoosh + noise for suction effect
        this.playLaser(100, 400, 0.3, 0.4);
        this.playNoise(0.3, 0.4);
    },

    dustDevilSpin() {
        // Periodic whoosh while entities inside
        this.playNoise(0.2, 0.3);
        this.playPunchyTone(150, 0.15, 'sine', 0.2);
    },

    dustDevilThrow() {
        // Descending whoosh for throw
        this.playLaser(500, 100, 0.25, 0.5);
        this.playNoise(0.2, 0.5);
    },

    // ========== VULTURE KING SOUNDS ==========

    vultureScreech() {
        // High-pitched attack screech for swoop attacks
        this._requestSound('vultureScreech', (volMod) => {
            if (!this.ctx) return;

            const now = this.ctx.currentTime;

            // Main screech - ascending harsh tone
            const osc1 = this.ctx.createOscillator();
            const gain1 = this.ctx.createGain();
            osc1.connect(gain1);
            gain1.connect(this.ctx.destination);
            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(800, now);
            osc1.frequency.exponentialRampToValueAtTime(1600, now + 0.1);
            osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.25);
            gain1.gain.setValueAtTime(0, now);
            gain1.gain.linearRampToValueAtTime(0.4 * volMod * this.masterVolume, now + 0.02);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc1.start(now);
            osc1.stop(now + 0.3);

            // Harmonic overtone for harshness
            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(this.ctx.destination);
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(1200, now);
            osc2.frequency.exponentialRampToValueAtTime(2000, now + 0.1);
            gain2.gain.setValueAtTime(0.2 * volMod * this.masterVolume, now);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc2.start(now);
            osc2.stop(now + 0.2);

            // Noise burst for texture
            this.playNoise(0.15, 0.25 * volMod);
        }, 0.3);
    },

    vultureWingFlap() {
        // Periodic wing flap during flight - whooshing sound
        this._requestSound('vultureWingFlap', (volMod) => {
            if (!this.ctx) return;

            const now = this.ctx.currentTime;

            // Low whoosh for wing flap
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const lowpass = this.ctx.createBiquadFilter();
            lowpass.type = 'lowpass';
            lowpass.frequency.value = 400;
            osc.connect(lowpass);
            lowpass.connect(gain);
            gain.connect(this.ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(80, now);
            osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.2);
            gain.gain.setValueAtTime(0.15 * volMod * this.masterVolume, now);
            gain.gain.linearRampToValueAtTime(0.25 * volMod * this.masterVolume, now + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);

            // Subtle noise for air displacement
            this.playNoise(0.15, 0.1 * volMod);
        }, 0.25);
    },

    vultureDive() {
        // Menacing descending whoosh for building dive attacks
        this._requestSound('vultureDive', (volMod) => {
            if (!this.ctx) return;

            const now = this.ctx.currentTime;

            // Main descending whoosh
            const osc1 = this.ctx.createOscillator();
            const gain1 = this.ctx.createGain();
            const distortion = this.ctx.createWaveShaper();
            distortion.curve = this.createDistortionCurve(20);
            osc1.connect(distortion);
            distortion.connect(gain1);
            gain1.connect(this.ctx.destination);
            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(400, now);
            osc1.frequency.exponentialRampToValueAtTime(100, now + 0.5);
            gain1.gain.setValueAtTime(0.3 * volMod * this.masterVolume, now);
            gain1.gain.linearRampToValueAtTime(0.5 * volMod * this.masterVolume, now + 0.3);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            osc1.start(now);
            osc1.stop(now + 0.6);

            // Low rumble for power
            const osc2 = this.ctx.createOscillator();
            const gain2 = this.ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(this.ctx.destination);
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(60, now);
            osc2.frequency.exponentialRampToValueAtTime(40, now + 0.5);
            gain2.gain.setValueAtTime(0.25 * volMod * this.masterVolume, now);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
            osc2.start(now);
            osc2.stop(now + 0.5);

            // Wind noise layer
            this.playNoise(0.4, 0.35 * volMod);
        }, 0.6);
    },

    vultureDebrisFall() {
        // Falling whistle + rumble
        this._requestSound('vultureDebrisFall', (volMod) => {
            if (!this.ctx) return;

            const now = this.ctx.currentTime;

            // Whistle (falling bomb sound)
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 1.5);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.3 * volMod * this.masterVolume, now + 0.5);
            gain.gain.linearRampToValueAtTime(0, now + 1.5);
            osc.start(now);
            osc.stop(now + 1.5);

            // Rumble layer
            this.playNoise(1.5, 0.2 * volMod);
        }, 1.6);
    }
};
