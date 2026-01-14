// AABB collision detection
function rectIntersects(r1, r2) {
    return r1.x < r2.x + r2.width &&
           r1.x + r1.width > r2.x &&
           r1.y < r2.y + r2.height &&
           r1.y + r1.height > r2.y;
}

// Circle-rect collision
function circleRectIntersects(circle, rect) {
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));

    const distanceX = circle.x - closestX;
    const distanceY = circle.y - closestY;
    const distanceSquared = distanceX * distanceX + distanceY * distanceY;

    return distanceSquared < circle.radius * circle.radius;
}

// Point in rect
function pointInRect(px, py, rect) {
    return px >= rect.x && px <= rect.x + rect.width &&
           py >= rect.y && py <= rect.y + rect.height;
}

// Get player bounding box
function getPlayerBounds(player) {
    return {
        x: player.x - player.width / 2,
        y: player.y - player.height / 2,
        width: player.width,
        height: player.height
    };
}

