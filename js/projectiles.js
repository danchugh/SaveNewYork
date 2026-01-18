class Projectile {
    constructor(x, y, angle, speed, isPlayerProjectile = true, ownerId = 0) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.isPlayerProjectile = isPlayerProjectile;
        this.ownerId = ownerId; // 0 = enemy, 1 = P1, 2 = P2
        this.radius = isPlayerProjectile ? 4 : 5;
        this.active = true;
        this.frame = 0;
    }

    update(deltaTime) {
        this.frame += deltaTime * 10;
        const radians = this.angle * (Math.PI / 180);
        this.x += Math.cos(radians) * this.speed * deltaTime;
        this.y += Math.sin(radians) * this.speed * deltaTime;

        // Deactivate if off screen (with margin for long tails)
        if (this.x < -20 || this.x > CONFIG.CANVAS_WIDTH + 20 ||
            this.y < -20 || this.y > CONFIG.CANVAS_HEIGHT + 20) {
            this.active = false;
        }
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle * Math.PI / 180);

        // Try to use sprite with additive blending
        const spriteKey = this.isPlayerProjectile ? 'projectile_player' : 'projectile_enemy';
        const sprite = typeof AssetManager !== 'undefined' ? AssetManager.getImage(spriteKey) : null;

        if (sprite) {
            // Additive blend mode - black becomes transparent
            ctx.globalCompositeOperation = 'lighter';
            const size = this.isPlayerProjectile ? 32 : 28;
            ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
            ctx.globalCompositeOperation = 'source-over';
        } else if (this.isPlayerProjectile) {
            // Fallback: Player Plasma Bolt (Yellow/Blue)
            ctx.fillStyle = '#fff';
            ctx.fillRect(-6, -2, 12, 4);

            ctx.shadowBlur = 10;
            ctx.shadowColor = '#fbbf24';
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.moveTo(6, 0);
            ctx.lineTo(-8, -4);
            ctx.lineTo(-8, 4);
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#fcd34d';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-8, -2); ctx.lineTo(-12 - Math.random() * 5, -2);
            ctx.moveTo(-8, 2); ctx.lineTo(-12 - Math.random() * 5, 2);
            ctx.stroke();
        } else {
            // Fallback: Enemy Energy Orb (Red/Purple)
            const pulse = 1 + Math.sin(this.frame) * 0.2;

            ctx.shadowBlur = 8;
            ctx.shadowColor = '#ef4444';
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(0, 0, 3 * pulse, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#dc2626';
            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#ffaaaaaa';
            ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                ctx.rotate(this.frame + i * 2);
                ctx.beginPath();
                ctx.moveTo(3, 0); ctx.lineTo(6 + Math.random() * 3, 0);
                ctx.stroke();
            }
        }

        ctx.restore();
    }
}

/**
 * Bomb projectile class - for gunship building bombardment
 * Travels until hitting building or ground, destroys 2x2 block area
 * Does NOT damage player (building-targeting only)
 */
class BombProjectile {
    constructor(x, y, angle, speed) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.radius = 8;
        this.active = true;
        this.frame = 0;
        this.gravity = 50; // Slight gravity for arc
        this.velX = Math.cos(angle * Math.PI / 180) * speed;
        this.velY = Math.sin(angle * Math.PI / 180) * speed;
    }

    update(deltaTime) {
        this.frame += deltaTime * 10;

        // Apply gravity for slight arc
        this.velY += this.gravity * deltaTime;

        // Move
        this.x += this.velX * deltaTime;
        this.y += this.velY * deltaTime;

        // Check building collision
        if (typeof buildingManager !== 'undefined') {
            for (const building of buildingManager.buildings) {
                // Quick AABB bounds check
                if (this.x < building.x || this.x > building.x + building.widthBlocks * CONFIG.BLOCK_SIZE ||
                    this.y < building.y || this.y > building.y + building.heightBlocks * CONFIG.BLOCK_SIZE) {
                    continue;
                }

                // Check individual blocks
                for (let row = 0; row < building.heightBlocks; row++) {
                    for (let col = 0; col < building.widthBlocks; col++) {
                        if (!building.blocks[row][col]) continue;

                        const pos = building.getBlockWorldPosition(row, col);

                        // Point collision
                        if (this.x > pos.x && this.x < pos.x + pos.width &&
                            this.y > pos.y && this.y < pos.y + pos.height) {

                            // Hit! Destroy 2x2 block area
                            for (let dr = 0; dr < 2; dr++) {
                                for (let dc = 0; dc < 2; dc++) {
                                    const nr = row + dr;
                                    const nc = col + dc;
                                    if (nr >= 0 && nr < building.heightBlocks &&
                                        nc >= 0 && nc < building.widthBlocks &&
                                        building.blocks[nr]?.[nc]) {
                                        building.destroyBlock(nr, nc);
                                    }
                                }
                            }

                            // Explosion effect
                            if (typeof EffectsManager !== 'undefined') {
                                EffectsManager.addExplosion(this.x, this.y, 25, '#ff6600');
                                EffectsManager.addAnimatedExplosion(this.x, this.y, 'enemy', 20);
                                EffectsManager.shake(3);
                            }
                            if (typeof SoundManager !== 'undefined') {
                                SoundManager.blockDestroy();
                            }

                            this.active = false;
                            return;
                        }
                    }
                }
            }
        }

        // Ground collision
        if (this.y > CONFIG.STREET_Y) {
            // Ground explosion
            if (typeof EffectsManager !== 'undefined') {
                EffectsManager.addExplosion(this.x, CONFIG.STREET_Y - 10, 20, '#ff6600');
                EffectsManager.addSparks(this.x, CONFIG.STREET_Y - 5, '#ffaa00');
            }
            if (typeof SoundManager !== 'undefined') {
                SoundManager.blockDestroy();
            }
            this.active = false;
            return;
        }

        // Off screen (sides only - let gravity handle top)
        if (this.x < -20 || this.x > CONFIG.CANVAS_WIDTH + 20) {
            this.active = false;
        }
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // Rotation based on velocity
        const angle = Math.atan2(this.velY, this.velX);
        ctx.rotate(angle);

        // Bomb body - orange/red with glow
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ff4400';

        // Main bomb shape (oval)
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.ellipse(0, 0, 10, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Inner highlight
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.ellipse(-2, -1, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Fins
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#cc4400';
        ctx.beginPath();
        ctx.moveTo(-8, 0);
        ctx.lineTo(-12, -4);
        ctx.lineTo(-12, 4);
        ctx.closePath();
        ctx.fill();

        // Trailing sparks/fire
        const trailLength = 3 + Math.random() * 4;
        ctx.fillStyle = '#ffcc00';
        for (let i = 0; i < 3; i++) {
            const tx = -10 - Math.random() * trailLength;
            const ty = (Math.random() - 0.5) * 4;
            ctx.beginPath();
            ctx.arc(tx, ty, 1.5 + Math.random(), 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

class ProjectileManager {
    constructor() {
        this.projectiles = [];
        this.bombs = [];  // Separate array for bombs
    }

    add(x, y, angle, speed, isPlayerProjectile = true, ownerId = 0) {
        this.projectiles.push(new Projectile(x, y, angle, speed, isPlayerProjectile, ownerId));
    }

    addBomb(x, y, angle, speed) {
        this.bombs.push(new BombProjectile(x, y, angle, speed));
    }

    update(deltaTime) {
        this.projectiles.forEach(p => p.update(deltaTime));
        // Remove inactive projectiles
        this.projectiles = this.projectiles.filter(p => p.active);

        // Update bombs
        this.bombs.forEach(b => b.update(deltaTime));
        this.bombs = this.bombs.filter(b => b.active);
    }

    getPlayerProjectiles() {
        return this.projectiles.filter(p => p.isPlayerProjectile);
    }

    getEnemyProjectiles() {
        return this.projectiles.filter(p => !p.isPlayerProjectile);
    }

    render(ctx) {
        // Render bright projectiles on top with "lighter" composition if possible for glow?
        // Standard render is fine for now
        this.projectiles.forEach(p => p.render(ctx));

        // Render bombs
        this.bombs.forEach(b => b.render(ctx));
    }

    clear() {
        this.projectiles = [];
        this.bombs = [];
    }
}

const projectileManager = new ProjectileManager();

