const PlayerState = {
    DOCKED: 'docked',
    FLYING: 'flying',
    REFUELING: 'refueling',
    EXPLODING: 'exploding'
};

class Player {
    constructor() {
        this.reset();
    }

    reset() {
        // Spawn at random pad, pointing up
        const pad = Math.random() < 0.5 ? CONFIG.REFUEL_PAD_LEFT : CONFIG.REFUEL_PAD_RIGHT;
        this.x = pad.x;
        this.y = pad.y - CONFIG.REFUEL_PAD_HEIGHT - 15;
        this.angle = -90; // -90 = pointing up (0 = right)
        this.state = PlayerState.DOCKED;

        this.speed = CONFIG.PLAYER_SPEED;
        this.minSpeed = CONFIG.PLAYER_MIN_SPEED;
        this.maxSpeed = CONFIG.PLAYER_MAX_SPEED;
        this.currentSpeed = this.speed;
        this.acceleration = CONFIG.PLAYER_ACCELERATION;
        this.deceleration = CONFIG.PLAYER_DECELERATION;
        this.turnSpeed = CONFIG.PLAYER_TURN_SPEED;

        this.fuel = CONFIG.FUEL_MAX;
        this.lives = CONFIG.PLAYER_LIVES;

        this.refuelTimer = 0;
        this.explosionTimer = 0;

        this.fireCooldown = 0;
        this.fireRate = 0.2; // seconds between shots

        // Launch grace period - prevents immediate re-docking
        this.launchGraceTimer = 0;

        // Jet dimensions
        this.width = 24;
        this.height = 14;
    }

    update(deltaTime) {
        switch (this.state) {
            case PlayerState.DOCKED:
                this.updateDocked();
                break;
            case PlayerState.FLYING:
                this.updateFlying(deltaTime);
                break;
            case PlayerState.REFUELING:
                this.updateRefueling(deltaTime);
                break;
            case PlayerState.EXPLODING:
                this.updateExploding(deltaTime);
                break;
        }
    }

    updateDocked() {
        // Wait for UP key to launch
        if (input.isKeyJustPressed(Keys.UP)) {
            this.state = PlayerState.FLYING;
            this.currentSpeed = this.speed;
            this.launchGraceTimer = 0.5; // Half second grace period
            console.log('Launched!');
        }
    }

    updateFlying(deltaTime) {
        // Decrement launch grace timer
        if (this.launchGraceTimer > 0) {
            this.launchGraceTimer -= deltaTime;
        }

        // Turn with left/right - INSTANT snappy response, no drag
        if (input.isKeyDown(Keys.LEFT)) {
            this.angle -= this.turnSpeed * deltaTime;
        }
        if (input.isKeyDown(Keys.RIGHT)) {
            this.angle += this.turnSpeed * deltaTime;
        }

        // Normalize angle to 0-360
        while (this.angle < 0) this.angle += 360;
        while (this.angle >= 360) this.angle -= 360;

        // Thrust control: UP to accelerate, DOWN to decelerate
        if (input.isKeyDown(Keys.UP)) {
            this.currentSpeed += this.acceleration * deltaTime;
        } else if (input.isKeyDown(Keys.DOWN)) {
            this.currentSpeed -= this.deceleration * deltaTime;
        }

        // Clamp speed to min/max bounds - no gradual return, stays where you set it
        this.currentSpeed = Math.max(this.minSpeed, Math.min(this.maxSpeed, this.currentSpeed));

        // Shoot with space
        this.fireCooldown -= deltaTime;
        if (input.isKeyDown(Keys.SPACE) && this.fireCooldown <= 0) {
            this.shoot();
            this.fireCooldown = this.fireRate;
        }

        // Move forward in facing direction at current speed - NO DRAG
        const radians = this.angle * (Math.PI / 180);
        this.x += Math.cos(radians) * this.currentSpeed * deltaTime;
        this.y += Math.sin(radians) * this.currentSpeed * deltaTime;

        // Add wind effect (only when flying)
        if (typeof WeatherManager !== 'undefined') {
            const windEffect = WeatherManager.getWindEffect();
            this.x += windEffect * deltaTime;
        }

        // Drain fuel
        this.fuel -= CONFIG.FUEL_DRAIN_RATE * deltaTime;

        // Screen wrap horizontal with kill walls
        const WRAP_MARGIN = 40;   // How far off-screen before wrapping
        const KILL_MARGIN = 100;  // How far off-screen before death

        // Kill walls - too far off screen = death
        if (this.x < -KILL_MARGIN || this.x > CONFIG.CANVAS_WIDTH + KILL_MARGIN) {
            this.die();
            return;
        }

        // Screen wrap at smaller margin
        if (this.x < -WRAP_MARGIN) this.x = CONFIG.CANVAS_WIDTH + WRAP_MARGIN;
        if (this.x > CONFIG.CANVAS_WIDTH + WRAP_MARGIN) this.x = -WRAP_MARGIN;

        // Clamp vertical (no wrap, just limits)
        if (this.y < CONFIG.SKY_TOP + 10) this.y = CONFIG.SKY_TOP + 10;
        if (this.y > CONFIG.STREET_Y - 10) this.y = CONFIG.STREET_Y - 10;

        // Check for refuel pad collision (only after grace period)
        if (this.launchGraceTimer <= 0) {
            this.checkRefuelPads();
        }

        // Check for out of fuel
        if (this.fuel <= 0) {
            this.die();
        }
    }

    updateRefueling(deltaTime) {
        this.refuelTimer += deltaTime;

        // Refuel progress
        const refuelProgress = this.refuelTimer / CONFIG.REFUEL_TIME;
        this.fuel = Math.min(CONFIG.FUEL_MAX, CONFIG.FUEL_MAX * refuelProgress);

        if (this.refuelTimer >= CONFIG.REFUEL_TIME) {
            this.fuel = CONFIG.FUEL_MAX;
            this.state = PlayerState.DOCKED;
            this.refuelTimer = 0;
            SoundManager.refuelComplete();
            console.log('Refuel complete!');
        }
    }

    updateExploding(deltaTime) {
        this.explosionTimer += deltaTime;
        if (this.explosionTimer >= 1) {
            this.respawn();
        }
    }

    checkRefuelPads() {
        const leftPad = CONFIG.REFUEL_PAD_LEFT;
        const rightPad = CONFIG.REFUEL_PAD_RIGHT;
        const padW = CONFIG.REFUEL_PAD_WIDTH;
        const padH = CONFIG.REFUEL_PAD_HEIGHT;

        // Check left pad
        if (this.x > leftPad.x - padW/2 && this.x < leftPad.x + padW/2 &&
            this.y > leftPad.y - padH - 20 && this.y < leftPad.y) {
            this.dock(leftPad);
        }

        // Check right pad
        if (this.x > rightPad.x - padW/2 && this.x < rightPad.x + padW/2 &&
            this.y > rightPad.y - padH - 20 && this.y < rightPad.y) {
            this.dock(rightPad);
        }
    }

    dock(pad) {
        this.x = pad.x;
        this.y = pad.y - CONFIG.REFUEL_PAD_HEIGHT - 15;
        this.angle = -90; // Point up
        this.currentSpeed = this.speed; // Reset to default speed
        this.state = PlayerState.REFUELING;
        this.refuelTimer = 0;
        SoundManager.refuelStart();
        console.log('Docking and refueling...');
    }

    shoot() {
        const radians = this.angle * (Math.PI / 180);
        const bulletX = this.x + Math.cos(radians) * (this.width / 2 + 5);
        const bulletY = this.y + Math.sin(radians) * (this.width / 2 + 5);
        projectileManager.add(bulletX, bulletY, this.angle, 450, true);
        SoundManager.shoot();
    }

    die() {
        this.lives--;
        this.state = PlayerState.EXPLODING;
        this.explosionTimer = 0;
        SoundManager.playerDeath();
        console.log('Player died! Lives remaining:', this.lives);
    }

    respawn() {
        if (this.lives > 0) {
            // Respawn at random pad
            const pad = Math.random() < 0.5 ? CONFIG.REFUEL_PAD_LEFT : CONFIG.REFUEL_PAD_RIGHT;
            this.x = pad.x;
            this.y = pad.y - CONFIG.REFUEL_PAD_HEIGHT - 15;
            this.angle = -90;
            this.currentSpeed = this.speed;
            this.fuel = CONFIG.FUEL_MAX;
            this.state = PlayerState.DOCKED;
            this.explosionTimer = 0;
        }
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle * Math.PI / 180);

        if (this.state === PlayerState.EXPLODING) {
            // Draw explosion
            ctx.fillStyle = '#ff6b35';
            ctx.beginPath();
            ctx.arc(0, 0, 18 + this.explosionTimer * 25, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(0, 0, 10 + this.explosionTimer * 12, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Draw jet body
            ctx.fillStyle = '#e0e0e0';
            ctx.beginPath();
            ctx.moveTo(this.width / 2, 0);              // Nose
            ctx.lineTo(-this.width / 2, -this.height / 2); // Top wing
            ctx.lineTo(-this.width / 3, 0);             // Back indent
            ctx.lineTo(-this.width / 2, this.height / 2);  // Bottom wing
            ctx.closePath();
            ctx.fill();

            // Draw cockpit
            ctx.fillStyle = '#4a90d9';
            ctx.beginPath();
            ctx.ellipse(2, 0, 6, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Draw engine glow when flying
            if (this.state === PlayerState.FLYING) {
                // Glow intensity based on speed
                const speedRatio = (this.currentSpeed - this.minSpeed) / (this.maxSpeed - this.minSpeed);
                const glowSize = 6 + speedRatio * 10;

                ctx.fillStyle = '#ff6b35';
                ctx.beginPath();
                ctx.moveTo(-this.width / 2, -4);
                ctx.lineTo(-this.width / 2 - glowSize, 0);
                ctx.lineTo(-this.width / 2, 4);
                ctx.closePath();
                ctx.fill();

                // Inner flame
                ctx.fillStyle = '#ffdd00';
                ctx.beginPath();
                ctx.moveTo(-this.width / 2, -2);
                ctx.lineTo(-this.width / 2 - glowSize * 0.6, 0);
                ctx.lineTo(-this.width / 2, 2);
                ctx.closePath();
                ctx.fill();
            }
        }

        ctx.restore();
    }
}

const player = new Player();
