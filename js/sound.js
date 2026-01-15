// ============================================
// CONTRA-STYLE SOUND SYSTEM (Web Audio API)
// Punchy, impactful arcade audio effects
// ============================================

const SoundManager = {
    ctx: null,
    enabled: true,
    masterVolume: 0.3, // Keep original volume as requested

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

    // Rate limiting for rapid-fire sounds
    lastShootTime: 0,
    shootCooldown: 50, // milliseconds between shots

    shoot() {
        // Rate limit to prevent echo from overlapping samples
        const now = Date.now();
        if (now - this.lastShootTime < this.shootCooldown) return;
        this.lastShootTime = now;

        // Try loaded sample first, fallback to oscillator
        if (this.playBuffer('shoot', 0.5)) return;
        // Punchy rapid-fire like Contra machine gun
        this.playLaser(1200, 400, 0.06, 0.6);
        this.playPunchyTone(200, 0.03, 'square', 0.3, true);
    },

    enemyDeath() {
        // Try loaded sample first
        if (this.playBuffer('enemy_death', 0.7)) return;
        // Fallback: Sharp explosion with satisfying crunch
        if (!this.enabled || !this.ctx) return;
        this.resume();

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
        gain.gain.setValueAtTime(0.5 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);

        // Noise burst overlay
        this.playNoise(0.1, 0.5);
    },

    playerDeath() {
        // Use explosion sample for deeper impact, or try player_death
        if (this.playBuffer('explosion', 1.0)) return;
        // Fallback: Deep cinematic explosion
        this.playLayeredExplosion(0.8, 1.2, 30); // Lower freq for deeper rumble
        setTimeout(() => this.playLayeredExplosion(0.5, 0.8, 25), 100);
        setTimeout(() => this.playPunchyTone(50, 0.4, 'sawtooth', 0.9), 50);
    },

    blockDestroyed() {
        // Try loaded sample first
        if (this.playBuffer('block_destroy', 0.6)) return;
        // Fallback: Quick debris crunch
        this.playPunchyTone(300, 0.04, 'square', 0.4, true);
        this.playNoise(0.06, 0.5);
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
        // Try loaded sample first
        if (this.playBuffer('boss_hit', 0.8)) return;
        // Fallback: Heavy metallic impact
        this.playPunchyTone(150, 0.12, 'sawtooth', 0.7, true);
        this.playNoise(0.08, 0.6);
        this.playPunchyTone(80, 0.1, 'square', 0.5);
    },

    victory() {
        // Try loaded sample first
        if (this.playBuffer('victory', 0.8)) return;
        // Fallback: Epic victory fanfare
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playPunchyTone(freq, 0.25, 'square', 0.6), i * 150);
        });
        setTimeout(() => this.playNoise(0.3, 0.3), 600);
    },

    gameOver() {
        // Try loaded sample first
        if (this.playBuffer('game_over', 0.8)) return;
        // Fallback: Dramatic descending doom
        const notes = [400, 300, 200, 100];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playPunchyTone(freq, 0.3, 'sawtooth', 0.5), i * 250);
        });
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
        // Ground-shaking impact
        this.playLayeredExplosion(0.35, 0.9, 45);
    },

    enemySplit() {
        // Alien split effect
        this.playLaser(600, 1200, 0.08, 0.4);
        setTimeout(() => this.playLaser(800, 400, 0.08, 0.35), 60);
    },

    tankHit() {
        // Metallic armor clang
        this.playPunchyTone(250, 0.08, 'square', 0.6, true);
        this.playNoise(0.05, 0.4);
    },

    tankDeath() {
        // Massive vehicle explosion
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
        // Rolling thunder with multiple cracks
        this.playLayeredExplosion(1.0, 0.7, 30);
        setTimeout(() => {
            this.playNoise(0.6, 0.5);
            this.playPunchyTone(50, 0.5, 'sawtooth', 0.5);
        }, 150);
        setTimeout(() => this.playNoise(0.4, 0.3), 400);
    },

    volcanoEruption() {
        // Deep earth-shaking rumble
        this.playLayeredExplosion(1.8, 0.9, 25);
        setTimeout(() => this.playLayeredExplosion(1.2, 0.7, 35), 400);
        setTimeout(() => {
            this.playNoise(1.0, 0.5);
            this.playPunchyTone(20, 1.0, 'sawtooth', 0.6);
        }, 800);
    },

    rockDestroyed() {
        // Boulder shatter
        this.playPunchyTone(250, 0.1, 'square', 0.5, true);
        this.playNoise(0.12, 0.6);
    },

    rockImpact() {
        // Heavy rock collision
        this.playLayeredExplosion(0.25, 0.7, 60);
    },

    miniBossAppear() {
        // Try loaded sample first
        if (this.playBuffer('boss_warning', 0.8)) return;
        // Fallback: Dramatic warning klaxon
        this.playPunchyTone(150, 0.4, 'sawtooth', 0.6);
        setTimeout(() => this.playPunchyTone(200, 0.4, 'sawtooth', 0.6), 250);
        setTimeout(() => this.playPunchyTone(300, 0.5, 'square', 0.7), 500);
        setTimeout(() => this.playNoise(0.2, 0.4), 750);
    },

    miniBossHit() {
        // Armored impact
        this.playPunchyTone(180, 0.08, 'square', 0.6, true);
        this.playNoise(0.06, 0.5);
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
        // Hammering/building sound
        this.playPunchyTone(200 + Math.random() * 100, 0.05, 'square', 0.3);
        this.playNoise(0.03, 0.2);
    },

    // ========== SHIELD SOUNDS ==========

    shieldCollect() {
        // Magical chime sound for shield pickup
        this.playPunchyTone(880, 0.1, 'sine', 0.4);
        setTimeout(() => this.playPunchyTone(1100, 0.1, 'sine', 0.5), 50);
        setTimeout(() => this.playPunchyTone(1320, 0.15, 'sine', 0.6), 100);
        setTimeout(() => this.playPunchyTone(1760, 0.2, 'sine', 0.5), 150);
    },

    shieldBreak() {
        // Glass shattering / energy dissipation
        this.playNoise(0.15, 0.5);
        this.playPunchyTone(400, 0.1, 'sawtooth', 0.4);
        setTimeout(() => this.playPunchyTone(300, 0.1, 'sawtooth', 0.3), 50);
        setTimeout(() => this.playPunchyTone(200, 0.15, 'square', 0.3), 100);
        setTimeout(() => this.playNoise(0.1, 0.3), 80);
    },

    // ========== BONUS LIFE SOUND ==========

    oneUp() {
        // Try loaded sample first
        if (this.playBuffer('one_up', 0.8)) return;
        // Fallback: Classic 1UP sound - triumphant ascending cascade
        this.playPunchyTone(523, 0.12, 'square', 0.5);  // C5
        setTimeout(() => this.playPunchyTone(659, 0.12, 'square', 0.5), 80);  // E5
        setTimeout(() => this.playPunchyTone(784, 0.12, 'square', 0.5), 160); // G5
        setTimeout(() => this.playPunchyTone(1047, 0.2, 'square', 0.6), 240); // C6
        setTimeout(() => this.playPunchyTone(1319, 0.25, 'sine', 0.5), 340);  // E6 (held)
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
    }
};
