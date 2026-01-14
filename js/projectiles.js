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

class ProjectileManager {
    constructor() {
        this.projectiles = [];
    }

    add(x, y, angle, speed, isPlayerProjectile = true, ownerId = 0) {
        this.projectiles.push(new Projectile(x, y, angle, speed, isPlayerProjectile, ownerId));
    }

    update(deltaTime) {
        this.projectiles.forEach(p => p.update(deltaTime));
        // Remove inactive projectiles
        this.projectiles = this.projectiles.filter(p => p.active);
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
    }

    clear() {
        this.projectiles = [];
    }
}

const projectileManager = new ProjectileManager();

