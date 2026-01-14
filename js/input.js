// ============================================
// INPUT HANDLER (Keyboard, Touch, Gamepad)
// Supports 2 players with remappable keys
// ============================================
const Keys = {
    UP: 'ArrowUp',
    DOWN: 'ArrowDown',
    LEFT: 'ArrowLeft',
    RIGHT: 'ArrowRight',
    SPACE: ' ',
    ENTER: 'Enter',
    W: 'w',
    A: 'a',
    S: 's',
    D: 'd',
    Q: 'q'
};

// Virtual actions for abstracted input
const Actions = {
    UP: 'up',
    DOWN: 'down',
    LEFT: 'left',
    RIGHT: 'right',
    FIRE: 'fire',
    START: 'start'
};

const input = {
    keys: {},
    justPressed: {},
    actions: {},
    actionsJustPressed: {},

    // Per-player key bindings (remappable)
    playerBindings: {
        1: {
            [Actions.UP]: [Keys.UP],
            [Actions.DOWN]: [Keys.DOWN],
            [Actions.LEFT]: [Keys.LEFT],
            [Actions.RIGHT]: [Keys.RIGHT],
            [Actions.FIRE]: [Keys.SPACE],
            [Actions.START]: [Keys.ENTER]
        },
        2: {
            [Actions.UP]: [Keys.W, 'W'],
            [Actions.DOWN]: [Keys.S, 'S'],
            [Actions.LEFT]: [Keys.A, 'A'],
            [Actions.RIGHT]: [Keys.D, 'D'],
            [Actions.FIRE]: [Keys.Q, 'Q'],
            [Actions.START]: [Keys.ENTER]
        }
    },

    // Per-player action states
    playerActions: {
        1: {},
        2: {}
    },
    playerActionsJustPressed: {
        1: {},
        2: {}
    },

    // Touch state
    touch: {
        active: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        isFiring: false
    },

    // Gamepad state (supports 2 gamepads)
    gamepads: {},
    gamepadDeadzone: 0.3,

    init() {
        // Keyboard
        window.addEventListener('keydown', (e) => {
            if (!this.keys[e.key]) {
                this.justPressed[e.key] = true;
            }
            this.keys[e.key] = true;

            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        // Touch
        const canvas = document.getElementById('game-canvas');
        if (canvas) {
            canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
            canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
            canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
        }

        // Gamepad
        window.addEventListener('gamepadconnected', (e) => {
            console.log('Gamepad connected:', e.gamepad.id, 'Index:', e.gamepad.index);
            const playerId = e.gamepad.index + 1;
            if (playerId <= 2) {
                this.gamepads[playerId] = e.gamepad.index;
                console.log(`Gamepad assigned to Player ${playerId}`);
            }
        });
        window.addEventListener('gamepaddisconnected', (e) => {
            console.log('Gamepad disconnected');
            for (const [pid, gidx] of Object.entries(this.gamepads)) {
                if (gidx === e.gamepad.index) {
                    delete this.gamepads[pid];
                }
            }
        });
    },

    // Touch handlers (Player 1 only)
    handleTouchStart(e) {
        e.preventDefault();
        for (const touch of e.changedTouches) {
            const rect = e.target.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            const midX = rect.width / 2;

            if (x < midX) {
                this.touch.active = true;
                this.touch.startX = x;
                this.touch.startY = y;
                this.touch.currentX = x;
                this.touch.currentY = y;
            } else {
                this.touch.isFiring = true;
            }
        }
    },

    handleTouchMove(e) {
        e.preventDefault();
        for (const touch of e.changedTouches) {
            const rect = e.target.getBoundingClientRect();
            const x = touch.clientX - rect.left;

            if (this.touch.active && x < rect.width / 2) {
                this.touch.currentX = x;
                this.touch.currentY = touch.clientY - rect.top;
            }
        }
    },

    handleTouchEnd(e) {
        e.preventDefault();
        for (const touch of e.changedTouches) {
            const rect = e.target.getBoundingClientRect();
            const x = touch.clientX - rect.left;

            if (x < rect.width / 2) {
                this.touch.active = false;
            } else {
                this.touch.isFiring = false;
            }
        }
    },

    // Poll all inputs and update per-player action states
    update() {
        this.actionsJustPressed = {};
        this.playerActionsJustPressed = { 1: {}, 2: {} };

        // Update per-player actions from keyboard
        for (const playerId of [1, 2]) {
            const bindings = this.playerBindings[playerId];

            for (const action of Object.values(Actions)) {
                const keys = bindings[action] || [];
                let isDown = false;
                let wasJustPressed = false;

                for (const key of keys) {
                    if (this.keys[key]) isDown = true;
                    if (this.justPressed[key]) wasJustPressed = true;
                }

                this.playerActions[playerId][action] = isDown;
                if (wasJustPressed) {
                    this.playerActionsJustPressed[playerId][action] = true;
                }
            }
        }

        // Touch -> Player 1
        if (this.touch.active) {
            const dx = this.touch.currentX - this.touch.startX;
            const dy = this.touch.currentY - this.touch.startY;
            const threshold = 20;

            if (dx < -threshold) this.playerActions[1][Actions.LEFT] = true;
            if (dx > threshold) this.playerActions[1][Actions.RIGHT] = true;
            if (dy < -threshold) this.playerActions[1][Actions.UP] = true;
            if (dy > threshold) this.playerActions[1][Actions.DOWN] = true;
        }
        if (this.touch.isFiring) {
            this.playerActions[1][Actions.FIRE] = true;
        }

        // Gamepad -> Per-player
        const gpList = navigator.getGamepads();
        for (const [playerIdStr, gpIndex] of Object.entries(this.gamepads)) {
            const playerId = parseInt(playerIdStr);
            const gp = gpList[gpIndex];
            if (!gp) continue;

            const lx = gp.axes[0] || 0;
            const ly = gp.axes[1] || 0;

            if (lx < -this.gamepadDeadzone || gp.buttons[14]?.pressed)
                this.playerActions[playerId][Actions.LEFT] = true;
            if (lx > this.gamepadDeadzone || gp.buttons[15]?.pressed)
                this.playerActions[playerId][Actions.RIGHT] = true;
            if (ly < -this.gamepadDeadzone || gp.buttons[12]?.pressed)
                this.playerActions[playerId][Actions.UP] = true;
            if (ly > this.gamepadDeadzone || gp.buttons[13]?.pressed)
                this.playerActions[playerId][Actions.DOWN] = true;

            if (gp.buttons[0]?.pressed) this.playerActions[playerId][Actions.FIRE] = true;
            if (gp.buttons[9]?.pressed) this.playerActions[playerId][Actions.START] = true;
        }

        // Global actions (for menus)
        for (const action of Object.values(Actions)) {
            this.actions[action] = this.playerActions[1][action] || this.playerActions[2][action];
        }
    },

    // Per-player input API
    isPlayerActionDown(playerId, action) {
        return this.playerActions[playerId]?.[action] === true;
    },

    isPlayerActionJustPressed(playerId, action) {
        return this.playerActionsJustPressed[playerId]?.[action] === true;
    },

    // Remap a key
    remapKey(playerId, action, newKey) {
        if (this.playerBindings[playerId] && this.playerBindings[playerId][action]) {
            this.playerBindings[playerId][action] = [newKey];
            console.log(`Player ${playerId} ${action} remapped to ${newKey}`);
        }
    },

    getBindings(playerId) {
        return this.playerBindings[playerId];
    },

    // Legacy compatibility
    isKeyDown(key) {
        return this.keys[key] === true;
    },

    isKeyJustPressed(key) {
        return this.justPressed[key] === true;
    },

    isActionDown(action) {
        return this.actions[action] === true;
    },

    isActionJustPressed(action) {
        return this.actionsJustPressed[action] === true;
    },

    clearJustPressed() {
        this.justPressed = {};
        this.actionsJustPressed = {};
        this.playerActionsJustPressed = { 1: {}, 2: {} };
    }
};
