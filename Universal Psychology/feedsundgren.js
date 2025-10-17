const GAME_CONFIG = {
    storageKey: 'feedSundgrenBestScore',
    spawnInterval: { min: 520, max: 1200 },
    maxMisses: 5,
    snack: {
        initialGravity: 220,
        maxGravity: 540,
        rampDuration: 80
    },
    snackHorizontalDrift: 24,
    mouth: {
        openSpeed: 320,
        closeSpeed: 520,
        maxGap: 60,
        chewBites: 2,
        catchStretch: 0.85
    },
    sundgren: {
        baseWidth: 96,
        speed: 440,
        floorPadding: 36,
        splitRatio: 0.75,
        movementTilt: 0.18,
        tiltSmoothing: 12,
        tiltDamping: 8,
        maxTilt: 0.4,
        chewTiltImpulse: 4
    },
    floatingTextDuration: 780
};

const SNACK_TYPES = [
    {
        id: 'mnm',
        label: 'M&M',
        radius: 12,
        score: 1,
        colors: { base: '#ffb300', stripe: '#7a3f00', highlight: 'rgba(255, 248, 220, 0.85)' }
    },
    {
        id: 'berry',
        label: 'Berry',
        radius: 14,
        score: 2,
        colors: { base: '#c2185b', highlight: '#f06292', seeds: '#ffd7ef' }
    },
    {
        id: 'peanut',
        label: 'Peanut',
        radius: 16,
        score: 3,
        colors: { base: '#a06628', highlight: '#d89f5d', shadow: '#7b4514' }
    }
];

document.addEventListener('DOMContentLoaded', () => {
    const openButton = document.getElementById('open-feedsundgren');
    const popup = document.getElementById('feedsundgren-popup');
    const closeButton = document.getElementById('close-feedsundgren');
    const startButton = document.getElementById('start-feedsundgren');
    const canvas = document.getElementById('feedsundgren-canvas');
    const scoreLabel = document.getElementById('feedsundgren-score');
    const missedLabel = document.getElementById('feedsundgren-missed');
    const bestLabel = document.getElementById('feedsundgren-best');
    const messageLabel = document.getElementById('feedsundgren-message');

    if (!openButton || !popup || !closeButton || !startButton || !canvas || !scoreLabel || !missedLabel || !bestLabel || !messageLabel) {
        return;
    }

    const ctx = canvas.getContext('2d');
    const sundgrenImage = new Image();
    const backgroundImage = new Image();
    let sundgrenReady = false;
    let backgroundReady = false;

    sundgrenImage.addEventListener('load', () => {
        sundgrenReady = true;
        recalcSundgrenSize();
    });
    sundgrenImage.addEventListener('error', () => console.warn('Unable to load images/sundgren.png'));
    sundgrenImage.src = 'images/sundgren.png';

    backgroundImage.addEventListener('load', () => {
        backgroundReady = true;
    });
    backgroundImage.addEventListener('error', () => console.warn('Unable to load images/sundgrenbackground.png'));
    backgroundImage.src = 'images/sundgrenbackground.png';

    const state = {
        isPopupOpen: false,
        isRunning: false,
        animationFrame: null,
        lastTimestamp: 0,
        spawnTimer: 0,
        nextSpawn: randomBetween(GAME_CONFIG.spawnInterval.min, GAME_CONFIG.spawnInterval.max),
        score: 0,
        missed: 0,
        best: loadBestScore(),
        snacks: [],
        floatingText: [],
        elapsedTime: 0
    };

    const sundgren = {
        x: canvas.width / 2,
        width: GAME_CONFIG.sundgren.baseWidth,
        height: GAME_CONFIG.sundgren.baseWidth,
        top: canvas.height - GAME_CONFIG.sundgren.baseWidth - GAME_CONFIG.sundgren.floorPadding,
        mouthGap: 0,
        mouthState: 'closed',
        chewRemaining: 0,
        rotation: 0,
        rotationVelocity: 0,
        targetRotation: 0
    };

    const keys = new Set();
    let pointerActive = false;

    function loadBestScore() {
        try {
            const stored = Number(localStorage.getItem(GAME_CONFIG.storageKey));
            return Number.isFinite(stored) && stored >= 0 ? stored : 0;
        } catch (error) {
            console.warn('Feed Sundgren: Unable to access localStorage', error);
            return 0;
        }
    }

    function saveBestScore(score) {
        try {
            localStorage.setItem(GAME_CONFIG.storageKey, String(score));
        } catch (error) {
            console.warn('Feed Sundgren: Unable to persist best score', error);
        }
    }

    function recalcSundgrenSize() {
        if (!sundgrenReady) return;
        const desiredWidth = Math.min(GAME_CONFIG.sundgren.baseWidth, canvas.width * 0.2);
        const ratio = sundgrenImage.height ? desiredWidth / sundgrenImage.width : 1;
        sundgren.width = desiredWidth;
        sundgren.height = sundgrenImage.height ? sundgrenImage.height * ratio : desiredWidth;
        sundgren.top = canvas.height - sundgren.height - GAME_CONFIG.sundgren.floorPadding;
        sundgren.x = clamp(sundgren.x, 0, canvas.width - sundgren.width);
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function lerp(start, end, t) {
        return start + (end - start) * t;
    }

    function randomBetween(min, max) {
        return min + Math.random() * (max - min);
    }

    function resetGame() {
        state.score = 0;
        state.missed = 0;
        state.snacks = [];
        state.floatingText = [];
        state.spawnTimer = 0;
        state.nextSpawn = randomBetween(GAME_CONFIG.spawnInterval.min, GAME_CONFIG.spawnInterval.max);
        state.lastTimestamp = performance.now();
        state.elapsedTime = 0;
        sundgren.mouthGap = 0;
        sundgren.mouthState = 'closed';
        sundgren.chewRemaining = 0;
        sundgren.rotation = 0;
        sundgren.rotationVelocity = 0;
        sundgren.targetRotation = 0;
        keys.clear();
        pointerActive = false;
        updateScoreboard();
        messageLabel.textContent = 'Catch the falling snacks before they hit the ground.';
    }

    function updateScoreboard() {
        scoreLabel.textContent = `Snacks: ${state.score}`;
        missedLabel.textContent = `Missed: ${state.missed}/${GAME_CONFIG.maxMisses}`;
        bestLabel.textContent = `Best: ${state.best}`;
    }

    function openGame() {
        popup.style.display = 'flex';
        popup.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        state.isPopupOpen = true;
        startButton.disabled = false;
        startButton.textContent = 'Start Feeding';
        startButton.style.display = 'inline-block';
        resetGame();
        recalcSundgrenSize();
    }

    function closeGame() {
        popup.style.display = 'none';
        popup.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        state.isPopupOpen = false;
        stopGame();
        keys.clear();
        pointerActive = false;
        startButton.disabled = false;
        startButton.style.display = 'inline-block';
        startButton.textContent = 'Start Feeding';
    }

    function startGame() {
        if (state.isRunning) return;
        resetGame();
        state.isRunning = true;
        startButton.disabled = true;
        startButton.style.display = 'none';
        messageLabel.textContent = 'Snacks inbound! Keep Sundgren fed.';
        state.lastTimestamp = performance.now();
        scheduleNextFrame();
    }

    function stopGame() {
        state.isRunning = false;
        if (state.animationFrame !== null) {
            cancelAnimationFrame(state.animationFrame);
            state.animationFrame = null;
        }
    }

    function endGame() {
        stopGame();
        if (state.score > state.best) {
            state.best = state.score;
            saveBestScore(state.best);
        }
        updateScoreboard();
        startButton.textContent = 'Play Again';
        startButton.disabled = false;
        startButton.style.display = 'inline-block';
        messageLabel.textContent = 'Sundgren is still hungry! Try again to beat your best score.';
    }

    function scheduleNextFrame() {
        state.animationFrame = requestAnimationFrame(gameLoop);
    }

    function gameLoop(timestamp) {
        if (!state.isRunning) return;
        const delta = Math.min(32, timestamp - state.lastTimestamp || 16);
        state.lastTimestamp = timestamp;
        update(delta);
        draw();
        scheduleNextFrame();
    }

    function update(deltaMs) {
        const deltaSeconds = deltaMs / 1000;
        state.elapsedTime += deltaSeconds;
        updateMovement(deltaSeconds);
        updateTilt(deltaSeconds);
        updateMouth(deltaMs);
        updateSnacks(deltaSeconds);
        updateFloatingText(deltaMs);
    }

    function updateMovement(deltaSeconds) {
        let moveDirection = 0;
        if (keys.has('ArrowLeft') || keys.has('KeyA')) moveDirection -= 1;
        if (keys.has('ArrowRight') || keys.has('KeyD')) moveDirection += 1;
        if (moveDirection !== 0) {
            const distance = moveDirection * GAME_CONFIG.sundgren.speed * deltaSeconds;
            sundgren.x = clamp(sundgren.x + distance, 0, canvas.width - sundgren.width);
            const target = clamp(
                moveDirection * GAME_CONFIG.sundgren.movementTilt,
                -GAME_CONFIG.sundgren.maxTilt,
                GAME_CONFIG.sundgren.maxTilt
            );
            sundgren.targetRotation = target;
        } else if (!pointerActive) {
            sundgren.targetRotation = 0;
        }
    }

    function updateTilt(deltaSeconds) {
        const config = GAME_CONFIG.sundgren;
        const delta = sundgren.targetRotation - sundgren.rotation;
        sundgren.rotationVelocity += delta * config.tiltSmoothing * deltaSeconds;
        sundgren.rotationVelocity *= Math.max(0, 1 - config.tiltDamping * deltaSeconds);
        const maxVelocity = config.maxTilt * 4;
        sundgren.rotationVelocity = clamp(sundgren.rotationVelocity, -maxVelocity, maxVelocity);
        sundgren.rotation += sundgren.rotationVelocity * deltaSeconds;
        sundgren.rotation = clamp(sundgren.rotation, -config.maxTilt, config.maxTilt);
    }

    function updateMouth(deltaMs) {
        if (sundgren.mouthState === 'opening') {
            sundgren.mouthGap += GAME_CONFIG.mouth.openSpeed * (deltaMs / 1000);
            if (sundgren.mouthGap >= GAME_CONFIG.mouth.maxGap) {
                sundgren.mouthGap = GAME_CONFIG.mouth.maxGap;
                sundgren.mouthState = 'closing';
            }
        } else if (sundgren.mouthState === 'closing') {
            sundgren.mouthGap -= GAME_CONFIG.mouth.closeSpeed * (deltaMs / 1000);
            if (sundgren.mouthGap <= 0) {
                sundgren.mouthGap = 0;
                if (sundgren.chewRemaining > 1) {
                    sundgren.chewRemaining -= 1;
                    sundgren.mouthState = 'opening';
                } else {
                    sundgren.chewRemaining = 0;
                    sundgren.mouthState = 'closed';
                }
            }
        }
    }

    function updateSnacks(deltaSeconds) {
        state.spawnTimer += deltaSeconds * 1000;
        if (state.spawnTimer >= state.nextSpawn) {
            spawnSnack();
            state.spawnTimer = 0;
            state.nextSpawn = randomBetween(GAME_CONFIG.spawnInterval.min, GAME_CONFIG.spawnInterval.max);
        }

        const splitRatio = GAME_CONFIG.sundgren.splitRatio;
        const mouthLineY = sundgren.top + sundgren.height * splitRatio;
        const mouthLeft = sundgren.x + sundgren.width * 0.18;
        const mouthRight = sundgren.x + sundgren.width * 0.82;
        const catchZoneTop = mouthLineY - 28;
        const catchZoneBottom = mouthLineY + 36 + sundgren.mouthGap * GAME_CONFIG.mouth.catchStretch;
        const groundLevel = canvas.height - GAME_CONFIG.sundgren.floorPadding * 0.35;

        for (let i = state.snacks.length - 1; i >= 0; i--) {
            const snack = state.snacks[i];
            snack.time += deltaSeconds;
            snack.y += snack.velocityY * deltaSeconds;
            snack.x += Math.sin(snack.time * snack.swingSpeed + snack.swingOffset) * GAME_CONFIG.snackHorizontalDrift * deltaSeconds;
            snack.rotation += snack.rotationSpeed * deltaSeconds;

            if (
                snack.y + snack.radius >= catchZoneTop &&
                snack.y - snack.radius <= catchZoneBottom &&
                snack.x >= mouthLeft &&
                snack.x <= mouthRight
            ) {
                state.snacks.splice(i, 1);
                handleSnackCaught(snack);
                continue;
            }

            if (snack.y - snack.radius > groundLevel) {
                state.snacks.splice(i, 1);
                handleSnackMissed();
            }
        }
    }

    function updateFloatingText(deltaMs) {
        const duration = GAME_CONFIG.floatingTextDuration;
        for (let i = state.floatingText.length - 1; i >= 0; i--) {
            const text = state.floatingText[i];
            text.elapsed += deltaMs;
            text.y -= deltaMs * 0.05;
            if (text.elapsed >= duration) {
                state.floatingText.splice(i, 1);
            }
        }
    }

    function spawnSnack() {
        const type = SNACK_TYPES[Math.floor(Math.random() * SNACK_TYPES.length)];
        const radius = type.radius + (Math.random() * 4 - 2);
        const x = clamp(Math.random() * canvas.width, radius, canvas.width - radius);
        const progress = clamp(state.elapsedTime / GAME_CONFIG.snack.rampDuration, 0, 1);
        const baseGravity = lerp(GAME_CONFIG.snack.initialGravity, GAME_CONFIG.snack.maxGravity, progress);
        const velocityY = (baseGravity + Math.random() * 140) * (0.7 + type.score * 0.15);
        state.snacks.push({
            type,
            x,
            y: -radius,
            radius,
            velocityY,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 1.8,
            swingSpeed: randomBetween(1.2, 2.2),
            swingOffset: Math.random() * Math.PI * 2,
            time: 0
        });
    }

    function handleSnackCaught(snack) {
        state.score += snack.type.score;
        sundgren.mouthState = 'opening';
        sundgren.chewRemaining = Math.max(GAME_CONFIG.mouth.chewBites, 1);
        const tiltDirection = Math.random() < 0.5 ? -1 : 1;
        sundgren.rotationVelocity += tiltDirection * GAME_CONFIG.sundgren.chewTiltImpulse;
        sundgren.targetRotation = clamp(
            sundgren.targetRotation + tiltDirection * GAME_CONFIG.sundgren.movementTilt * 0.6,
            -GAME_CONFIG.sundgren.maxTilt,
            GAME_CONFIG.sundgren.maxTilt
        );
        state.floatingText.push({
            x: snack.x,
            y: snack.y,
            value: `+${snack.type.score}`,
            color: snack.type.colors.highlight || '#ffe7a8',
            elapsed: 0
        });
        messageLabel.textContent = `Yum! Sundgren loves ${snack.type.label}s.`;
        updateScoreboard();
    }

    function handleSnackMissed() {
        state.missed += 1;
        const remaining = Math.max(GAME_CONFIG.maxMisses - state.missed, 0);
        messageLabel.textContent = remaining > 0
            ? `Uh oh! ${remaining} more spills before Sundgren goes hungry.`
            : 'Too many snacks hit the floor!';
        updateScoreboard();
        if (state.missed >= GAME_CONFIG.maxMisses) {
            endGame();
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground();
        state.snacks.forEach(drawSnack);
        drawSundgren();
        drawFloatingText();
        drawGroundOverlay();
    }

    function drawBackground() {
        if (backgroundReady) {
            ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
        } else {
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#2d1f4d');
            gradient.addColorStop(1, '#0c0818');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    function drawSnack(snack) {
        ctx.save();
        ctx.translate(snack.x, snack.y);
        ctx.rotate(snack.rotation);
        switch (snack.type.id) {
            case 'mnm':
                drawMnm(snack);
                break;
            case 'berry':
                drawBerry(snack);
                break;
            case 'peanut':
            default:
                drawPeanut(snack);
                break;
        }
        ctx.restore();
    }

    function drawMnm(snack) {
        ctx.fillStyle = snack.type.colors.base;
        ctx.beginPath();
        ctx.arc(0, 0, snack.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = snack.type.colors.highlight;
        ctx.beginPath();
        ctx.arc(-snack.radius * 0.2, -snack.radius * 0.2, snack.radius * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = snack.type.colors.stripe;
        ctx.fillRect(-snack.radius * 0.7, -snack.radius * 0.15, snack.radius * 1.4, snack.radius * 0.3);
    }

    function drawBerry(snack) {
        const { base, highlight, seeds } = snack.type.colors;
        ctx.fillStyle = base;
        ctx.beginPath();
        ctx.ellipse(0, 0, snack.radius * 0.85, snack.radius, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = highlight;
        ctx.beginPath();
        ctx.ellipse(-snack.radius * 0.25, -snack.radius * 0.35, snack.radius * 0.35, snack.radius * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = seeds;
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const sx = Math.cos(angle) * snack.radius * 0.45;
            const sy = Math.sin(angle) * snack.radius * 0.45;
            ctx.beginPath();
            ctx.ellipse(sx, sy, snack.radius * 0.12, snack.radius * 0.18, angle, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawPeanut(snack) {
        const { base, highlight, shadow } = snack.type.colors;
        const r = snack.radius;
        ctx.fillStyle = base;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.bezierCurveTo(r, -r * 0.6, r, r * 0.6, 0, r);
        ctx.bezierCurveTo(-r, r * 0.6, -r, -r * 0.6, 0, -r);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = highlight;
        ctx.beginPath();
        ctx.moveTo(-r * 0.25, -r * 0.65);
        ctx.bezierCurveTo(r * 0.35, -r * 0.45, r * 0.35, r * 0.45, -r * 0.25, r * 0.65);
        ctx.bezierCurveTo(-r * 0.45, r * 0.35, -r * 0.45, -r * 0.35, -r * 0.25, -r * 0.65);
        ctx.fill();

        ctx.strokeStyle = shadow;
        ctx.lineWidth = r * 0.18;
        ctx.beginPath();
        ctx.moveTo(-r * 0.25, -r * 0.5);
        ctx.lineTo(-r * 0.25, r * 0.5);
        ctx.stroke();
    }

    function drawSundgren() {
        const splitRatio = GAME_CONFIG.sundgren.splitRatio;
        const topHeight = sundgren.height * splitRatio;
        const bottomHeight = sundgren.height - topHeight;
        const mouthGap = sundgren.mouthGap;
        const topY = sundgren.top - mouthGap / 2;
        const bottomY = sundgren.top + topHeight + mouthGap / 2;
        const centerX = sundgren.x + sundgren.width / 2;
        const centerY = sundgren.top + sundgren.height / 2;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(sundgren.rotation);
        ctx.translate(-centerX, -centerY);

        if (!sundgrenReady) {
            ctx.fillStyle = '#d0c4ff';
            ctx.fillRect(sundgren.x, sundgren.top, sundgren.width, sundgren.height);
            ctx.restore();
            return;
        }

        const imageTopHeight = sundgrenImage.height * splitRatio;
        const imageBottomHeight = sundgrenImage.height - imageTopHeight;

        ctx.drawImage(
            sundgrenImage,
            0,
            0,
            sundgrenImage.width,
            imageTopHeight,
            sundgren.x,
            topY,
            sundgren.width,
            topHeight
        );
        ctx.drawImage(
            sundgrenImage,
            0,
            imageTopHeight,
            sundgrenImage.width,
            imageBottomHeight,
            sundgren.x,
            bottomY,
            sundgren.width,
            bottomHeight
        );

        ctx.restore();
    }

    function drawFloatingText() {
        const duration = GAME_CONFIG.floatingTextDuration;
        state.floatingText.forEach(item => {
            const t = clamp(item.elapsed / duration, 0, 1);
            ctx.globalAlpha = 1 - t;
            ctx.fillStyle = item.color;
            ctx.font = 'bold 20px "Trebuchet MS", "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(item.value, item.x, item.y - t * 20);
            ctx.globalAlpha = 1;
        });
    }

    function drawGroundOverlay() {
        const gradient = ctx.createLinearGradient(0, canvas.height - 80, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(10, 8, 18, 0)');
        gradient.addColorStop(1, 'rgba(10, 8, 18, 0.8)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, canvas.height - 80, canvas.width, 80);
    }

    function moveSundgrenTo(positionX) {
        const previousX = sundgren.x;
        sundgren.x = clamp(positionX - sundgren.width / 2, 0, canvas.width - sundgren.width);
        const deltaX = sundgren.x - previousX;
        if (Math.abs(deltaX) > 1) {
            const normalized = clamp(deltaX / (sundgren.width * 0.6), -1, 1);
            const tilt = normalized * GAME_CONFIG.sundgren.movementTilt;
            sundgren.targetRotation = clamp(tilt, -GAME_CONFIG.sundgren.maxTilt, GAME_CONFIG.sundgren.maxTilt);
        } else if (!hasMovementKeys()) {
            sundgren.targetRotation = 0;
        }
    }

    function hasMovementKeys() {
        return ['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].some(code => keys.has(code));
    }

    function handlePointer(event) {
        if (!state.isPopupOpen) return;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        moveSundgrenTo(x);
    }

    openButton.addEventListener('click', openGame);
    closeButton.addEventListener('click', closeGame);
    popup.addEventListener('pointerdown', event => {
        if (event.target === popup) {
            closeGame();
        }
    });

    startButton.addEventListener('click', startGame);

    document.addEventListener('keydown', event => {
        if (!state.isPopupOpen) return;
        if (event.code === 'Escape') {
            event.preventDefault();
            closeGame();
            return;
        }
        if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(event.code)) {
            event.preventDefault();
            keys.add(event.code);
        }
    });

    document.addEventListener('keyup', event => {
        if (!state.isPopupOpen) return;
        if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(event.code)) {
            keys.delete(event.code);
            if (!pointerActive && !hasMovementKeys()) {
                sundgren.targetRotation = 0;
            }
        }
    });

    canvas.addEventListener('pointerdown', event => {
        pointerActive = true;
        handlePointer(event);
    });

    canvas.addEventListener('pointermove', event => {
        if (!pointerActive) return;
        handlePointer(event);
    });

    canvas.addEventListener('pointerup', () => {
        pointerActive = false;
        if (!hasMovementKeys()) {
            sundgren.targetRotation = 0;
        }
    });

    canvas.addEventListener('pointerleave', () => {
        pointerActive = false;
        if (!hasMovementKeys()) {
            sundgren.targetRotation = 0;
        }
    });

    window.addEventListener('resize', () => {
        if (!state.isPopupOpen) return;
        recalcSundgrenSize();
    });
});
