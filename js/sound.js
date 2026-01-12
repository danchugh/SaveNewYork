// ============================================
// RETRO SOUND SYSTEM (Web Audio API)
// ============================================

const SoundManager = {
    ctx: null,
    enabled: true,
    masterVolume: 0.3,

    init() {
        // Create audio context on first user interaction
        if (!this.ctx) {
            try {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('Web Audio API not supported');
                this.enabled = false;
            }
        }
    },

    // Resume audio context (needed for browsers that suspend it)
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    // Play a simple tone
    playTone(frequency, duration, type = 'square', volume = 1) {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const oscillator = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.ctx.currentTime);

        gainNode.gain.setValueAtTime(volume * this.masterVolume, this.ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        oscillator.start(this.ctx.currentTime);
        oscillator.stop(this.ctx.currentTime + duration);
    },

    // Play noise burst (for explosions)
    playNoise(duration, volume = 1) {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        const gainNode = this.ctx.createGain();

        noise.buffer = buffer;
        noise.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        gainNode.gain.setValueAtTime(volume * this.masterVolume, this.ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

        noise.start(this.ctx.currentTime);
    },

    // ========== GAME SOUNDS ==========

    shoot() {
        // High pitched pew sound
        this.playTone(800, 0.08, 'square', 0.4);
        setTimeout(() => this.playTone(600, 0.05, 'square', 0.3), 20);
    },

    enemyDeath() {
        // Descending chirp
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'square';
        osc.frequency.setValueAtTime(400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.3 * this.masterVolume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.15);
    },

    playerDeath() {
        // Explosion noise + descending tone
        this.playNoise(0.3, 0.6);
        setTimeout(() => {
            this.playTone(200, 0.2, 'sawtooth', 0.4);
            setTimeout(() => this.playTone(100, 0.3, 'sawtooth', 0.3), 100);
        }, 50);
    },

    blockDestroyed() {
        // Quick crunch
        this.playNoise(0.05, 0.3);
        this.playTone(150, 0.05, 'square', 0.2);
    },

    buildingCollapse() {
        // Rumbling crash
        this.playNoise(0.4, 0.5);
        this.playTone(80, 0.3, 'sawtooth', 0.4);
        setTimeout(() => this.playNoise(0.2, 0.3), 200);
    },

    refuelStart() {
        // Rising tone
        this.playTone(300, 0.1, 'sine', 0.3);
        setTimeout(() => this.playTone(400, 0.1, 'sine', 0.3), 100);
    },

    refuelComplete() {
        // Happy jingle
        this.playTone(400, 0.1, 'square', 0.3);
        setTimeout(() => this.playTone(500, 0.1, 'square', 0.3), 100);
        setTimeout(() => this.playTone(600, 0.15, 'square', 0.3), 200);
    },

    bossHit() {
        // Deep thud
        this.playTone(100, 0.15, 'sawtooth', 0.5);
        this.playNoise(0.1, 0.4);
    },

    victory() {
        // Victory fanfare
        const notes = [523, 659, 784, 1047]; // C E G C
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.2, 'square', 0.4), i * 150);
        });
    },

    gameOver() {
        // Sad descending notes
        const notes = [400, 350, 300, 200];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.25, 'sawtooth', 0.4), i * 200);
        });
    },

    gameStart() {
        // Start jingle
        this.playTone(440, 0.1, 'square', 0.3);
        setTimeout(() => this.playTone(550, 0.1, 'square', 0.3), 100);
        setTimeout(() => this.playTone(660, 0.15, 'square', 0.4), 200);
    },

    enemyFalling() {
        // Whistle down sound
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.5);

        gain.gain.setValueAtTime(0.2 * this.masterVolume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.5);
    },

    fallingCrash() {
        // Heavy impact
        this.playNoise(0.25, 0.7);
        this.playTone(60, 0.2, 'sawtooth', 0.6);
        setTimeout(() => this.playTone(40, 0.15, 'sawtooth', 0.4), 100);
    },

    enemySplit() {
        // Quick ascending chirps for splitter
        this.playTone(800, 0.1, 'sine', 0.3);
        setTimeout(() => this.playTone(1000, 0.1, 'sine', 0.3), 50);
        setTimeout(() => this.playTone(600, 0.1, 'sine', 0.25), 100);
    },

    tankHit() {
        // Metallic clank
        this.playTone(200, 0.1, 'square', 0.4);
        this.playNoise(0.05, 0.3);
    },

    tankDeath() {
        // Heavy explosion
        this.playNoise(0.4, 0.7);
        this.playTone(80, 0.3, 'sawtooth', 0.5);
        setTimeout(() => this.playNoise(0.3, 0.5), 150);
    },

    bomberDive() {
        // Rising siren/whistle for diving bomber
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.5);

        gain.gain.setValueAtTime(0.2 * this.masterVolume, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.3 * this.masterVolume, this.ctx.currentTime + 0.5);

        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + 0.5);
    },

    bomberCrash() {
        // Ground impact explosion
        this.playNoise(0.3, 0.5);
        this.playTone(50, 0.2, 'sawtooth', 0.5);
    },

    thunder() {
        // Low rumble
        this.playNoise(0.8, 0.5);
        this.playTone(60, 0.5, 'sawtooth', 0.4);
        setTimeout(() => {
            this.playNoise(0.5, 0.3);
            this.playTone(40, 0.4, 'sawtooth', 0.3);
        }, 200);
    },

    miniBossAppear() {
        this.playTone(150, 0.3, 'sawtooth', 0.4);
        setTimeout(() => this.playTone(200, 0.3, 'sawtooth', 0.4), 200);
        setTimeout(() => this.playTone(250, 0.4, 'sawtooth', 0.5), 400);
    },

    miniBossHit() {
        this.playTone(150, 0.1, 'square', 0.4);
        this.playNoise(0.08, 0.4);
    },

    miniBossDefeat() {
        this.playNoise(0.5, 0.6);
        this.playTone(300, 0.2, 'square', 0.5);
        setTimeout(() => this.playTone(400, 0.2, 'square', 0.5), 150);
        setTimeout(() => this.playTone(500, 0.3, 'square', 0.6), 300);
    },

    miniBossCharge() {
        this.playTone(80, 0.3, 'sawtooth', 0.5);
        this.playNoise(0.2, 0.3);
    },

    miniBossRam() {
        this.playNoise(0.4, 0.7);
        this.playTone(50, 0.3, 'sawtooth', 0.6);
    },

    miniBossShoot() {
        this.playTone(500, 0.05, 'square', 0.3);
        this.playTone(400, 0.05, 'square', 0.25);
    },

    // ========== AMBIENT SOUNDS ==========

    // Ambient sound state
    ambientInterval: null,
    currentAmbient: null,

    // Stop any playing ambient sound
    stopAmbient() {
        if (this.ambientInterval) {
            clearInterval(this.ambientInterval);
            this.ambientInterval = null;
        }
        this.currentAmbient = null;
    },

    // Cricket chirps for night/dusk
    startCrickets() {
        this.stopAmbient();
        this.currentAmbient = 'crickets';

        // Play cricket chirp pattern every 2-4 seconds
        const playCricket = () => {
            if (!this.enabled || !this.ctx) return;
            this.resume();

            // Quick high-pitched chirps (3 rapid chirps)
            for (let i = 0; i < 3; i++) {
                setTimeout(() => {
                    this.playTone(4000 + Math.random() * 1000, 0.05, 'sine', 0.08);
                }, i * 60);
            }
        };

        playCricket();  // Play immediately
        this.ambientInterval = setInterval(playCricket, 2000 + Math.random() * 2000);
    },

    // Bird calls for day/dawn
    startBirds() {
        this.stopAmbient();
        this.currentAmbient = 'birds';

        const playBird = () => {
            if (!this.enabled || !this.ctx) return;
            this.resume();

            // Chirping bird call - frequency sweep
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

        playBird();  // Play immediately
        this.ambientInterval = setInterval(playBird, 3000 + Math.random() * 4000);
    },

    // Update ambient based on time of day
    updateAmbientForTime(timeOfDay) {
        if (timeOfDay === 'night' || timeOfDay === 'dusk') {
            if (this.currentAmbient !== 'crickets') {
                this.startCrickets();
            }
        } else if (timeOfDay === 'day' || timeOfDay === 'dawn') {
            if (this.currentAmbient !== 'birds') {
                this.startBirds();
            }
        }
    }
};
