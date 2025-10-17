const MENTAL_OBSTACLES = [
    'Repression',
    'Projection',
    'Denial',
    'Oedipus Complex',
    'Superego Guilt',
    'Transference',
    'Countertransference',
    'Thanatos Drive',
    'Eros Overload',
    'Fixation at Oral Stage',
    'Fixation at Anal Stage',
    'Fixation at Phallic Stage',
    'Latent Desires',
    'Dream Symbolism',
    'Freudian Slip',
    'Infantile Sexuality',
    'Defense Mechanisms',
    'Unresolved Complex',
    'Pleasure Principle',
    'Reality Principle',
    'Id Impulses',
    'Ego Anxiety',
    'Symbolic Substitution',
    'Psychic Conflict'
];

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
        lineWidthFactor: 0.26,
        baseRotation: -0.1,
        animMagnitude: 0.5,
        animSpeedFactor: 4.6,
        sleeveColor: '#101010',
        sleeveOutline: '#262626',
        cuffColor: '#f5f5f5',
        cuffWidthFactor: 0.52,
        handColor: '#f6d4b4',
        handOutline: '#2c1a10',
        handOffsetFactor: 0.8,
        fingerSeparationFactor: 0.55
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
        lastObstacle: null,
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
        state.lastObstacle = null;
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

    function awardPsychbucks() {
        const reward = Math.max(0, Math.floor(state.score));
        if (reward <= 0) {
            return;
        }
        const api = window.GameAPI;
        if (!api || typeof api.getGameState !== 'function') {
            return;
        }
        const globalState = api.getGameState();
        if (!globalState || typeof globalState.psychbucks !== 'number') {
            return;
        }
        globalState.psychbucks += reward;
        if (typeof api.updateDisplays === 'function') {
            api.updateDisplays();
        }
        if (typeof api.logMessage === 'function') {
            api.logMessage(`Flappy Freud: Navigated ${state.score} obstacles. +${reward} Psychbucks`, 'log-info');
        }
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
            passed: false,
            label: getNextObstacleLabel()
        });
    }

    function getNextObstacleLabel() {
        if (MENTAL_OBSTACLES.length === 0) {
            return '';
        }
        let choice = MENTAL_OBSTACLES[Math.floor(Math.random() * MENTAL_OBSTACLES.length)];
        if (MENTAL_OBSTACLES.length > 1) {
            let safety = 0;
            while (choice === state.lastObstacle && safety < 10) {
                choice = MENTAL_OBSTACLES[Math.floor(Math.random() * MENTAL_OBSTACLES.length)];
                safety += 1;
            }
        }
        state.lastObstacle = choice;
        return choice;
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
        updateScoreboard();
        awardPsychbucks();
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

            drawPipeLabel(pipe, x, topPipeHeight, bottomPipeY);
        });
    }

    function drawPipeLabel(pipe, pipeX, topPipeHeight, bottomPipeY) {
        if (!pipe.label) {
            return;
        }

        const availableWidth = physics.pipeWidth - 18;
        const topAreaHeight = Math.max(0, topPipeHeight - GAME_SETTINGS.layout.pipeCapHeight - 18);
        const bottomAreaHeight = Math.max(
            0,
            (state.viewportHeight - physics.groundHeight) - (bottomPipeY + GAME_SETTINGS.layout.pipeCapHeight) - 18
        );

        let areaY;
        let areaHeight;
        if (topAreaHeight >= bottomAreaHeight && topAreaHeight > 28) {
            areaY = 12;
            areaHeight = topAreaHeight;
        } else if (bottomAreaHeight > 28) {
            areaY = bottomPipeY + GAME_SETTINGS.layout.pipeCapHeight + 12;
            areaHeight = bottomAreaHeight;
        } else {
            areaY = Math.max(12, topAreaHeight > 0 ? 12 : bottomPipeY + GAME_SETTINGS.layout.pipeCapHeight + 12);
            areaHeight = Math.max(28, Math.max(topAreaHeight, bottomAreaHeight));
        }

        const centerX = pipeX + physics.pipeWidth / 2;
        const { fontSize, lines, lineHeight } = calculateLabelLayout(pipe.label, availableWidth, areaHeight);
        if (!lines.length) {
            return;
        }

        const totalHeight = lines.length * lineHeight;
        const textTop = areaY + areaHeight / 2 - totalHeight / 2;
        const padding = Math.max(6, fontSize * 0.4);
        const backgroundTop = textTop - padding / 2;
        const backgroundHeight = totalHeight + padding;
        const backgroundWidth = availableWidth + padding;
        const backgroundLeft = centerX - backgroundWidth / 2;

        ctx.save();
        ctx.fillStyle = 'rgba(250, 250, 245, 0.88)';
        ctx.strokeStyle = 'rgba(33, 66, 38, 0.45)';
        ctx.lineWidth = 2;
        drawRoundedRect(backgroundLeft, backgroundTop, backgroundWidth, backgroundHeight, Math.min(12, padding));
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#15311b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `600 ${fontSize}px "Comic Sans MS", "Baloo 2", sans-serif`;

        let currentY = textTop + lineHeight / 2;
        for (const line of lines) {
            ctx.fillText(line, centerX, currentY);
            currentY += lineHeight;
        }

        ctx.restore();
    }

    function calculateLabelLayout(text, maxWidth, maxHeight) {
        const context = ctx;
        const maxFont = Math.min(26, Math.max(14, physics.pipeWidth * 0.32));
        const minFont = 10;
        const fontFamily = '"Comic Sans MS", "Baloo 2", sans-serif';
        let fontSize = maxFont;
        let lines = [];
        let lineHeight = 0;

        while (fontSize >= minFont) {
            context.font = `600 ${fontSize}px ${fontFamily}`;
            lines = wrapTextLines(text, maxWidth);
            lineHeight = fontSize * 1.18;
            const neededHeight = lines.length * lineHeight;
            if (neededHeight <= maxHeight || fontSize === minFont) {
                if (neededHeight > maxHeight && lines.length > 1) {
                    const maxLines = Math.max(1, Math.floor(maxHeight / lineHeight));
                    lines = lines.slice(0, maxLines);
                }
                break;
            }
            fontSize -= 1;
        }

        return { fontSize, lines, lineHeight };
    }

    function wrapTextLines(text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const { width } = ctx.measureText(testLine);
            if (width <= maxWidth || !currentLine) {
                currentLine = testLine;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }

        if (currentLine) {
            lines.push(currentLine);
        }

        return lines;
    }

    function drawRoundedRect(x, y, width, height, radius) {
        const cornerRadius = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
        ctx.beginPath();
        ctx.moveTo(x + cornerRadius, y);
        ctx.lineTo(x + width - cornerRadius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + cornerRadius);
        ctx.lineTo(x + width, y + height - cornerRadius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - cornerRadius, y + height);
        ctx.lineTo(x + cornerRadius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - cornerRadius);
        ctx.lineTo(x, y + cornerRadius);
        ctx.quadraticCurveTo(x, y, x + cornerRadius, y);
        ctx.closePath();
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
        const sleeveWidth = radius * config.lineWidthFactor;
        const sleeveEnd = length - handRadius * config.handOffsetFactor;
        const cuffWidth = Math.max(1.2, sleeveWidth * config.cuffWidthFactor);
        const handCenterX = length + handRadius * 0.1;

        // Draw sleeve
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = sleeveWidth;
        ctx.strokeStyle = config.sleeveColor;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(sleeveEnd * 0.45, -elbowLift, sleeveEnd, 0);
        ctx.stroke();

        // Sleeve outline for definition
        ctx.lineWidth = Math.max(1.2, sleeveWidth * 0.22);
        ctx.strokeStyle = config.sleeveOutline;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(sleeveEnd * 0.45, -elbowLift, sleeveEnd, 0);
        ctx.stroke();

        // Cuff accent
        ctx.lineWidth = cuffWidth;
        ctx.strokeStyle = config.cuffColor;
        ctx.beginPath();
        ctx.moveTo(sleeveEnd - cuffWidth * 0.4, 0);
        ctx.lineTo(sleeveEnd + cuffWidth * 0.4, 0);
        ctx.stroke();

        // Hand
        ctx.fillStyle = config.handColor;
        ctx.strokeStyle = config.handOutline;
        ctx.lineWidth = Math.max(1.4, sleeveWidth * 0.18);
        ctx.beginPath();
        ctx.arc(handCenterX, 0, handRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Simple finger separations for cartoon styling
        const fingerLength = handRadius * 1.05;
        const fingerSpread = config.fingerSeparationFactor * handRadius;
        ctx.lineWidth = Math.max(1, sleeveWidth * 0.16);
        ctx.beginPath();
        ctx.moveTo(handCenterX + fingerSpread * 0.2, -handRadius * 0.6);
        ctx.quadraticCurveTo(handCenterX + fingerLength, -handRadius * 0.15, handCenterX + fingerSpread * 0.6, handRadius * 0.05);
        ctx.moveTo(handCenterX + fingerSpread * 0.05, 0);
        ctx.quadraticCurveTo(handCenterX + fingerLength * 0.8, handRadius * 0.2, handCenterX + fingerSpread * 0.45, handRadius * 0.55);
        ctx.stroke();

        ctx.restore();
    }
});
