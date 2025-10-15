const GAME_SETTINGS = {
    storageKey: 'flappyFreudBestScore',
    physics: {
        gravity: 2200,
        flapVelocity: -720,
        maxFallSpeed: 980,
        pipeSpeed: 240,
        pipeGap: 180,
        pipeWidth: 86,
        pipeSpawnInterval: 1500,
        groundHeight: 86
    },
    spawn: {
        margin: 90,
        xOffset: 40
    },
    freud: {
        radius: 26,
        startXRatio: 0.28,
        startYRatio: 0.45,
        tiltSmoothing: 0.15,
        maxTilt: 0.65,
        tiltVelocityDivisor: 550
    },
    wing: {
        xOffsetFactor: 0.3,
        baseRotation: -0.6,
        animMagnitude: 0.45,
        animSpeedFactor: 3,
        curve1: { x1: 46, y1: -36, x2: 92, y2: -6 },
        curve2: { x1: 62, y1: 20, x2: 0, y2: 14 },
        color: 'rgba(255, 255, 255, 0.85)'
    },
    arms: {
        shoulderXFactor: 0.62,
        shoulderYFactor: -0.1,
        lengthFactor: 1.32,
        elbowLiftFactor: 0.55,
        handRadiusFactor: 0.22,
        lineWidthFactor: 0.2,
        baseRotation: -0.1,
        animMagnitude: 0.5,
        animSpeedFactor: 4.6
    },
    layout: {
        pipeCapHeight: 18,
        pipeShadowWidth: 10,
        groundStripeCount: 5
    },
    timing: {
        maxDelta: 0.035
    },
    visuals: {
        skyTop: '#b6e6ff',
        skyBottom: '#d5f0ff',
        pipeBody: '#89b956',
        pipeHighlight: '#a8d27b',
        pipeShadow: '#5d7f36',
        ground: '#c7a27a',
        groundDetail: '#b08963',
        freudBody: '#f2d1a8',
        freudOutline: '#a57649',
        freudEye: '#2c1a10',
        moustache: '#5a3a24'
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const popup = document.getElementById('flappyfreud-popup');
    const openButton = document.getElementById('open-flappyfreud');
    const startButton = document.getElementById('start-flappyfreud');
    const closeButton = document.getElementById('close-flappyfreud');
    const canvas = document.getElementById('flappyfreud-canvas');
    const scoreLabel = document.getElementById('flappyfreud-score');
    const bestLabel = document.getElementById('flappyfreud-best');
    const messageLabel = document.getElementById('flappyfreud-message');

    if (!popup || !canvas || !scoreLabel || !bestLabel || !messageLabel) {
        return;
    }

    const ctx = canvas.getContext('2d');
    const freudImage = new Image();
    let isFreudImageLoaded = false;

    freudImage.addEventListener('load', () => {
        isFreudImageLoaded = true;
    });

    freudImage.addEventListener('error', () => {
        console.warn('Failed to load Flappy Freud image at images/freud.png');
    });

    freudImage.src = 'images/freud.png';
    const state = {
        isPopupOpen: false,
        isRunning: false,
        devicePixelRatio: window.devicePixelRatio || 1,
        viewportWidth: canvas.width,
        viewportHeight: canvas.height,
        animationFrame: null,
        lastTimestamp: null,
        pipeTimer: 0,
        wingPhase: 0,
        score: 0,
        best: loadBestScore(),
        pipes: [],
        freud: {
            x: 0,
            y: 0,
            radius: GAME_SETTINGS.freud.radius,
            velocity: 0,
            tilt: 0
        }
    };

    const physics = { ...GAME_SETTINGS.physics };
    const spawnConfig = { ...GAME_SETTINGS.spawn };

    updateScoreboard();
    initialiseFreudPosition();

    if (openButton) {
        openButton.addEventListener('click', openGame);
    }

    startButton?.addEventListener('click', startGame);
    closeButton?.addEventListener('click', closeGame);

    window.addEventListener('resize', () => {
        if (state.isPopupOpen) {
            resizeCanvas();
        }
    });

    popup.addEventListener('pointerdown', event => {
        if (event.target === popup) {
            closeGame();
        }
    });

    canvas.addEventListener('pointerdown', event => {
        event.preventDefault();
        if (!state.isPopupOpen) return;
        if (!state.isRunning) {
            startGame();
        }
        flap();
    });

    document.addEventListener('keydown', handleKeyDown);

    function handleKeyDown(event) {
        if (!state.isPopupOpen) return;

        const flapKeys = ['Space', 'ArrowUp', 'KeyW'];
        if (flapKeys.includes(event.code)) {
            event.preventDefault();
            if (!state.isRunning) {
                startGame();
            }
            flap();
            return;
        }

        if (event.code === 'Enter' && !state.isRunning) {
            startGame();
            return;
        }

        if (event.code === 'Escape') {
            closeGame();
        }
    }

    function openGame() {
        if (state.isPopupOpen) return;
        state.isPopupOpen = true;
        popup.style.display = 'flex';
        popup.setAttribute('aria-hidden', 'false');
        resizeCanvas();
        resetGame();
    }

    function closeGame() {
        if (!state.isPopupOpen) return;
        state.isPopupOpen = false;
        popup.style.display = 'none';
        popup.setAttribute('aria-hidden', 'true');
        stopAnimation();
        state.isRunning = false;
        state.lastTimestamp = null;
        messageLabel.textContent = 'Press space or tap to start flying.';
    }

    function startGame() {
        resetGame();
        state.isRunning = true;
        messageLabel.textContent = 'Avoid your unconscious obstacles!';
        if (startButton) {
            startButton.textContent = 'Restart Flight';
            startButton.classList.remove('attention');
        }
        startAnimation();
    }

    function resetGame() {
        state.score = 0;
        state.pipes = [];
        state.freud.radius = GAME_SETTINGS.freud.radius;
        state.freud.velocity = 0;
        state.freud.tilt = 0;
        state.wingPhase = 0;
        state.pipeTimer = physics.pipeSpawnInterval;
        initialiseFreudPosition();
        updateScoreboard();
        if (!state.isRunning) {
            drawFrame();
            messageLabel.textContent = 'Press space or tap to start flying.';
            startButton?.classList.remove('attention');
            if (startButton) {
                startButton.textContent = 'Start Flight';
            }
        }
    }

    function initialiseFreudPosition() {
        const { viewportWidth, viewportHeight } = state;
        const desiredX = viewportWidth * GAME_SETTINGS.freud.startXRatio;
        const desiredY = viewportHeight * GAME_SETTINGS.freud.startYRatio;
        const maxX = viewportWidth - state.freud.radius;
        const groundLevel = viewportHeight - physics.groundHeight - state.freud.radius;
        state.freud.x = Math.min(Math.max(state.freud.radius, desiredX), Math.max(state.freud.radius, maxX));
        state.freud.y = Math.min(Math.max(state.freud.radius, desiredY), Math.max(state.freud.radius, groundLevel));
    }

    function resizeCanvas() {
        const ratio = window.devicePixelRatio || 1;
        state.devicePixelRatio = ratio;

        const rect = canvas.getBoundingClientRect();
        const targetWidth = rect.width > 0 ? rect.width : state.viewportWidth;
        const targetHeight = rect.height > 0 ? rect.height : state.viewportHeight;
        const previousWidth = state.viewportWidth || targetWidth;
        const previousHeight = state.viewportHeight || targetHeight;
        state.viewportWidth = targetWidth;
        state.viewportHeight = targetHeight;

        const scaledWidth = Math.round(targetWidth * ratio);
        const scaledHeight = Math.round(targetHeight * ratio);

        if (canvas.width !== scaledWidth || canvas.height !== scaledHeight) {
            canvas.width = scaledWidth;
            canvas.height = scaledHeight;
        }

        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        if (previousWidth > 0 && previousHeight > 0 && state.isRunning) {
            const widthScale = targetWidth / previousWidth;
            const heightScale = targetHeight / previousHeight;
            state.freud.x *= widthScale;
            state.freud.y *= heightScale;
            state.pipes.forEach(pipe => {
                pipe.x *= widthScale;
                pipe.gapCenter *= heightScale;
            });
        }
        if (!state.isRunning) {
            initialiseFreudPosition();
        }
        drawFrame();
    }

    function loadBestScore() {
        try {
            const stored = localStorage.getItem(GAME_SETTINGS.storageKey);
            const parsed = stored ? Number.parseInt(stored, 10) : 0;
            return Number.isFinite(parsed) ? parsed : 0;
        } catch (error) {
            return 0;
        }
    }

    function saveBestScore() {
        try {
            localStorage.setItem(GAME_SETTINGS.storageKey, String(state.best));
        } catch (error) {
            /* Ignore storage errors */
        }
    }

    function updateScoreboard() {
        scoreLabel.textContent = `Score: ${state.score}`;
        bestLabel.textContent = `Best: ${state.best}`;
    }

    function flap() {
        state.freud.velocity = physics.flapVelocity;
    }

    function startAnimation() {
        stopAnimation();
        const step = (timestamp) => {
            if (!state.isPopupOpen) return;
            if (!state.lastTimestamp) {
                state.lastTimestamp = timestamp;
            }
            const delta = (timestamp - state.lastTimestamp) / 1000;
            state.lastTimestamp = timestamp;
            update(delta);
            drawFrame();
            state.animationFrame = window.requestAnimationFrame(step);
        };
        state.animationFrame = window.requestAnimationFrame(step);
    }

    function stopAnimation() {
        if (state.animationFrame !== null) {
            window.cancelAnimationFrame(state.animationFrame);
            state.animationFrame = null;
        }
    }

    function update(delta) {
        if (!state.isRunning) {
            return;
        }

        const clampedDelta = Math.min(delta, GAME_SETTINGS.timing.maxDelta);
        updateFreud(clampedDelta);
        updatePipes(clampedDelta);
        detectCollisions();
        state.wingPhase += clampedDelta;
    }

    function updateFreud(delta) {
        const freud = state.freud;
        freud.velocity = Math.min(freud.velocity + physics.gravity * delta, physics.maxFallSpeed);
        freud.y += freud.velocity * delta;

        const groundLevel = state.viewportHeight - physics.groundHeight;
        if (freud.y + freud.radius > groundLevel) {
            freud.y = groundLevel - freud.radius;
            triggerGameOver();
        }

        if (freud.y - freud.radius < 0) {
            freud.y = freud.radius;
            freud.velocity = 0;
        }

        const targetTilt = Math.max(
            -GAME_SETTINGS.freud.maxTilt,
            Math.min(GAME_SETTINGS.freud.maxTilt, freud.velocity / GAME_SETTINGS.freud.tiltVelocityDivisor)
        );
        freud.tilt += (targetTilt - freud.tilt) * GAME_SETTINGS.freud.tiltSmoothing;
    }

    function updatePipes(delta) {
        state.pipeTimer += delta * 1000;
        if (state.pipeTimer >= physics.pipeSpawnInterval) {
            state.pipeTimer = 0;
            spawnPipe();
        }

        const removalThreshold = -physics.pipeWidth - 10;
        state.pipes.forEach(pipe => {
            pipe.x -= physics.pipeSpeed * delta;
            if (!pipe.passed && pipe.x + physics.pipeWidth / 2 < state.freud.x) {
                pipe.passed = true;
                state.score += 1;
                if (state.score > state.best) {
                    state.best = state.score;
                    saveBestScore();
                }
                updateScoreboard();
            }
        });

        state.pipes = state.pipes.filter(pipe => pipe.x > removalThreshold);
    }

    function spawnPipe() {
        const halfGap = physics.pipeGap / 2;
        const playableHeight = state.viewportHeight - physics.groundHeight;
        const minCenter = Math.max(halfGap + spawnConfig.margin, halfGap);
        const maxCenter = Math.max(minCenter, playableHeight - spawnConfig.margin - halfGap);
        const range = Math.max(maxCenter - minCenter, 0);
        const gapCenter = minCenter + Math.random() * range;
        state.pipes.push({
            x: state.viewportWidth + spawnConfig.xOffset,
            gapCenter,
            passed: false
        });
    }

    function detectCollisions() {
        const freud = state.freud;
        const halfGap = physics.pipeGap / 2;
        for (const pipe of state.pipes) {
            const pipeLeft = pipe.x - physics.pipeWidth / 2;
            const pipeRight = pipe.x + physics.pipeWidth / 2;
            if (freud.x + freud.radius < pipeLeft || freud.x - freud.radius > pipeRight) {
                continue;
            }

            const gapTop = pipe.gapCenter - halfGap;
            const gapBottom = pipe.gapCenter + halfGap;
            if (freud.y - freud.radius < gapTop || freud.y + freud.radius > gapBottom) {
                triggerGameOver();
                break;
            }
        }
    }

    function triggerGameOver() {
        if (!state.isRunning) return;
        state.isRunning = false;
        messageLabel.textContent = 'Analysis complete. Press enter or tap to retry.';
        if (startButton) {
            startButton.textContent = 'Try Again';
            startButton.classList.add('attention');
        }
    }

    function drawFrame() {
        ctx.setTransform(state.devicePixelRatio, 0, 0, state.devicePixelRatio, 0, 0);
        ctx.clearRect(0, 0, state.viewportWidth, state.viewportHeight);
        drawBackground();
        drawPipes();
        drawGround();
        drawFreud();
    }

    function drawBackground() {
        const gradient = ctx.createLinearGradient(0, 0, 0, state.viewportHeight);
        gradient.addColorStop(0, GAME_SETTINGS.visuals.skyTop);
        gradient.addColorStop(1, GAME_SETTINGS.visuals.skyBottom);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, state.viewportWidth, state.viewportHeight);
    }

    function drawPipes() {
        ctx.fillStyle = GAME_SETTINGS.visuals.pipeBody;
        const halfGap = physics.pipeGap / 2;

        state.pipes.forEach(pipe => {
            const topPipeHeight = pipe.gapCenter - halfGap;
            const bottomPipeY = pipe.gapCenter + halfGap;
            const x = pipe.x - physics.pipeWidth / 2;

            ctx.fillStyle = GAME_SETTINGS.visuals.pipeBody;
            ctx.fillRect(x, 0, physics.pipeWidth, topPipeHeight);
            ctx.fillRect(x, bottomPipeY, physics.pipeWidth, state.viewportHeight - bottomPipeY - physics.groundHeight);

            ctx.fillStyle = GAME_SETTINGS.visuals.pipeHighlight;
            ctx.fillRect(x, topPipeHeight - GAME_SETTINGS.layout.pipeCapHeight, physics.pipeWidth, GAME_SETTINGS.layout.pipeCapHeight);
            ctx.fillRect(x, bottomPipeY, physics.pipeWidth, GAME_SETTINGS.layout.pipeCapHeight);

            ctx.fillStyle = GAME_SETTINGS.visuals.pipeShadow;
            ctx.fillRect(
                x + physics.pipeWidth - GAME_SETTINGS.layout.pipeShadowWidth,
                0,
                GAME_SETTINGS.layout.pipeShadowWidth,
                topPipeHeight
            );
            ctx.fillRect(
                x + physics.pipeWidth - GAME_SETTINGS.layout.pipeShadowWidth,
                bottomPipeY,
                GAME_SETTINGS.layout.pipeShadowWidth,
                state.viewportHeight - bottomPipeY - physics.groundHeight
            );
        });
    }

    function drawGround() {
        const groundY = state.viewportHeight - physics.groundHeight;
        ctx.fillStyle = GAME_SETTINGS.visuals.ground;
        ctx.fillRect(0, groundY, state.viewportWidth, physics.groundHeight);
        ctx.fillStyle = GAME_SETTINGS.visuals.groundDetail;
        const stripeHeight = physics.groundHeight / GAME_SETTINGS.layout.groundStripeCount;
        for (let i = 0; i < GAME_SETTINGS.layout.groundStripeCount; i += 1) {
            if (i % 2 === 0) continue;
            ctx.fillRect(0, groundY + i * stripeHeight, state.viewportWidth, stripeHeight);
        }
    }

    function drawFreud() {
        const freud = state.freud;
        ctx.save();
        ctx.translate(freud.x, freud.y);
        ctx.rotate(freud.tilt);

        if (isFreudImageLoaded && freudImage.naturalWidth && freudImage.naturalHeight) {
            const targetDiameter = freud.radius * 2.4;
            const scale = targetDiameter / Math.max(freudImage.naturalWidth, freudImage.naturalHeight);
            const drawWidth = freudImage.naturalWidth * scale;
            const drawHeight = freudImage.naturalHeight * scale;
            ctx.drawImage(freudImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        } else {
            drawWing(1);
            drawWing(-1);

            ctx.fillStyle = GAME_SETTINGS.visuals.freudBody;
            ctx.strokeStyle = GAME_SETTINGS.visuals.freudOutline;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(0, 0, freud.radius * 1.1, freud.radius, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = GAME_SETTINGS.visuals.freudEye;
            ctx.beginPath();
            ctx.arc(freud.radius * 0.35, -freud.radius * 0.1, freud.radius * 0.18, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = GAME_SETTINGS.visuals.moustache;
            ctx.beginPath();
            ctx.moveTo(-freud.radius * 0.25, freud.radius * 0.15);
            ctx.quadraticCurveTo(0, freud.radius * 0.45, freud.radius * 0.6, freud.radius * 0.15);
            ctx.quadraticCurveTo(freud.radius * 0.35, freud.radius * 0.35, 0, freud.radius * 0.18);
            ctx.quadraticCurveTo(-freud.radius * 0.35, freud.radius * 0.35, -freud.radius * 0.6, freud.radius * 0.15);
            ctx.closePath();
            ctx.fill();
        }

        drawArms();

        ctx.restore();
    }

    function drawWing(direction) {
        const config = GAME_SETTINGS.wing;
        ctx.save();
        ctx.scale(direction, 1);
        ctx.translate(-state.freud.radius * config.xOffsetFactor, 0);
        const animationOffset = Math.sin(state.wingPhase * config.animSpeedFactor + direction) * config.animMagnitude;
        ctx.rotate(config.baseRotation + animationOffset);
        ctx.fillStyle = config.color;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(config.curve1.x1, config.curve1.y1, config.curve1.x2, config.curve1.y2);
        ctx.quadraticCurveTo(config.curve2.x1, config.curve2.y1, config.curve2.x2, config.curve2.y2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function drawArms() {
        drawArm(1);
        drawArm(-1);
    }

    function drawArm(direction) {
        const config = GAME_SETTINGS.arms;
        const radius = state.freud.radius;
        ctx.save();
        ctx.scale(direction, 1);
        ctx.translate(radius * config.shoulderXFactor, radius * config.shoulderYFactor);
        const animationOffset = Math.sin(state.wingPhase * config.animSpeedFactor + direction) * config.animMagnitude;
        ctx.rotate(config.baseRotation + animationOffset);

        const length = radius * config.lengthFactor;
        const elbowLift = radius * config.elbowLiftFactor;
        const handRadius = radius * config.handRadiusFactor;
        const lineWidth = radius * config.lineWidthFactor;

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = GAME_SETTINGS.visuals.freudOutline;
        ctx.fillStyle = GAME_SETTINGS.visuals.freudBody;

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(length * 0.45, -elbowLift, length, 0);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(length, 0, handRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
});
