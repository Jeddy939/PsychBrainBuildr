const FREUD_IMAGE_SRC = 'images/freud.png';
const STORAGE_KEY = 'flappyfreud-best-score';

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

document.addEventListener('DOMContentLoaded', () => {
    const openBtn = document.getElementById('open-flappyfreud');
    const popup = document.getElementById('flappyfreud-popup');
    const canvas = document.getElementById('flappyfreud-canvas');
    const startBtn = document.getElementById('start-flappyfreud');
    const closeBtn = document.getElementById('close-flappyfreud');
    const instructions = document.getElementById('flappyfreud-instructions');
    const scoreDisplay = document.getElementById('flappyfreud-score');
    const bestDisplay = document.getElementById('flappyfreud-best');

    if (!openBtn || !popup || !canvas || !startBtn || !closeBtn || !instructions || !scoreDisplay || !bestDisplay) {
        return;
    }

    const ctx = canvas.getContext('2d');
    const freudImage = new Image();
    freudImage.addEventListener('load', drawScene);
    freudImage.src = FREUD_IMAGE_SRC;

    const physics = {
        gravity: 900,
        flapStrength: 360,
        pipeInterval: 1.6,
        pipeSpeed: 160,
        pipeWidth: 70,
        gapHeight: 180,
        groundHeight: 60
    };

    const state = {
        running: false,
        ready: true,
        pipes: [],
        score: 0,
        best: Number(localStorage.getItem(STORAGE_KEY) || 0),
        animationId: null,
        lastTimestamp: 0,
        pipeTimer: 0,
        wingPhase: 0,
        freud: {
            x: canvas.width * 0.28,
            y: canvas.height / 2,
            vy: 0,
            radius: 28
        }
    };

    updateScoreboard();
    drawScene();

    function attachControls() {
        window.addEventListener('keydown', handleKeyDown);
        canvas.addEventListener('pointerdown', handlePointerDown, { passive: false });
        canvas.addEventListener('pointermove', preventPointerScroll, { passive: false });
    }

    function detachControls() {
        window.removeEventListener('keydown', handleKeyDown);
        canvas.removeEventListener('pointerdown', handlePointerDown);
        canvas.removeEventListener('pointermove', preventPointerScroll);
    }

    function preventPointerScroll(event) {
        if (popup.style.display === 'flex') {
            event.preventDefault();
        }
    }

    function resetGame() {
        cancelAnimationFrame(state.animationId);
        state.animationId = null;
        state.running = false;
        state.ready = true;
        state.pipes = [];
        state.score = 0;
        state.pipeTimer = 0;
        state.freud.y = canvas.height / 2;
        state.freud.vy = 0;
        state.wingPhase = 0;
        state.lastTimestamp = 0;
        startBtn.disabled = false;
        startBtn.textContent = 'Start Session';
        instructions.textContent = 'Press space or tap to flap.';
        updateScoreboard();
        drawScene();
    }

    function openGame() {
        popup.style.display = 'flex';
        resetGame();
        attachControls();
    }

    function closeGame() {
        popup.style.display = 'none';
        detachControls();
        resetGame();
    }

    function startGame() {
        if (state.running) return;
        state.running = true;
        state.ready = false;
        state.score = 0;
        state.pipeTimer = 0;
        state.pipes = [];
        state.freud.y = canvas.height / 2;
        state.freud.vy = -physics.flapStrength * 0.6;
        state.wingPhase = 0;
        state.lastTimestamp = performance.now();
        instructions.textContent = 'Guide Freud through the defenses!';
        startBtn.disabled = true;
        state.animationId = requestAnimationFrame(loop);
    }

    function handleKeyDown(event) {
        if (popup.style.display !== 'flex') return;
        if (event.code === 'Space' || event.code === 'ArrowUp') {
            event.preventDefault();
            flap();
        } else if (event.code === 'Escape') {
            event.preventDefault();
            closeGame();
        }
    }

    function handlePointerDown(event) {
        event.preventDefault();
        flap();
    }

    function flap() {
        if (state.ready) {
            startGame();
        }
        if (!state.running) return;
        state.freud.vy = -physics.flapStrength;
        state.wingPhase += 0.4;
    }

    function loop(timestamp) {
        const delta = Math.min((timestamp - state.lastTimestamp) / 1000, 0.045);
        state.lastTimestamp = timestamp;
        update(delta);
        drawScene();
        if (state.running) {
            state.animationId = requestAnimationFrame(loop);
        }
    }

    function update(delta) {
        state.freud.vy += physics.gravity * delta;
        state.freud.y += state.freud.vy * delta;
        state.freud.y = clamp(state.freud.y, state.freud.radius, canvas.height - physics.groundHeight - state.freud.radius);
        state.wingPhase += delta * 6;

        state.pipeTimer += delta;
        if (state.pipeTimer >= physics.pipeInterval) {
            state.pipeTimer = 0;
            spawnPipe();
        }

        state.pipes.forEach(pipe => {
            pipe.x -= physics.pipeSpeed * delta;
        });
        while (state.pipes.length && state.pipes[0].x + physics.pipeWidth < -10) {
            state.pipes.shift();
        }

        checkForScore();
        if (checkForCollision()) {
            triggerGameOver();
        }
    }

    function spawnPipe() {
        const margin = 90;
        const gapCenter = margin + Math.random() * (canvas.height - physics.groundHeight - margin * 2);
        state.pipes.push({
            x: canvas.width + 40,
            gapCenter,
            passed: false
        });
    }

    function checkForScore() {
        state.pipes.forEach(pipe => {
            if (!pipe.passed && pipe.x + physics.pipeWidth < state.freud.x) {
                pipe.passed = true;
                state.score += 1;
                if (state.score > state.best) {
                    state.best = state.score;
                    localStorage.setItem(STORAGE_KEY, String(state.best));
                }
                updateScoreboard();
            }
        });
    }

    function checkForCollision() {
        if (state.freud.y >= canvas.height - physics.groundHeight - state.freud.radius) {
            return true;
        }

        return state.pipes.some(pipe => {
            const gapTop = pipe.gapCenter - physics.gapHeight / 2;
            const gapBottom = pipe.gapCenter + physics.gapHeight / 2;
            const withinX = state.freud.x + state.freud.radius > pipe.x && state.freud.x - state.freud.radius < pipe.x + physics.pipeWidth;
            if (!withinX) return false;
            if (state.freud.y - state.freud.radius < gapTop) return true;
            if (state.freud.y + state.freud.radius > gapBottom) return true;
            return false;
        });
    }

    function triggerGameOver() {
        state.running = false;
        state.ready = true;
        state.freud.vy = 0;
        instructions.textContent = `Analysis complete! Score ${state.score}.`;
        startBtn.disabled = false;
        startBtn.textContent = 'Try Again';
    }

    function updateScoreboard() {
        scoreDisplay.textContent = `Score: ${state.score}`;
        bestDisplay.textContent = `Best: ${state.best}`;
    }

    function drawScene() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground();
        drawPipes();
        drawFreud();
        drawGround();
    }

    function drawBackground() {
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#d2ecff');
        gradient.addColorStop(0.6, '#87b8e8');
        gradient.addColorStop(1, '#f5d7a3');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        for (let i = 0; i < 4; i++) {
            const cloudWidth = 120 + Math.sin(state.wingPhase + i) * 20;
            const x = (i * 140 + state.wingPhase * 40) % (canvas.width + cloudWidth) - cloudWidth;
            const y = 40 + i * 60;
            ctx.beginPath();
            ctx.ellipse(x, y, cloudWidth * 0.6, 28, 0, 0, Math.PI * 2);
            ctx.ellipse(x + 40, y - 10, cloudWidth * 0.45, 22, 0, 0, Math.PI * 2);
            ctx.ellipse(x + 80, y + 6, cloudWidth * 0.5, 20, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawPipes() {
        state.pipes.forEach(pipe => {
            const gapTop = pipe.gapCenter - physics.gapHeight / 2;
            const gapBottom = pipe.gapCenter + physics.gapHeight / 2;
            ctx.fillStyle = '#7ec850';
            ctx.fillRect(pipe.x, 0, physics.pipeWidth, gapTop);
            ctx.fillRect(pipe.x - 6, gapTop - 24, physics.pipeWidth + 12, 24);
            ctx.fillRect(pipe.x, gapBottom, physics.pipeWidth, canvas.height - gapBottom - physics.groundHeight);
            ctx.fillRect(pipe.x - 6, gapBottom, physics.pipeWidth + 12, 24);
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.fillRect(pipe.x + 8, gapTop + 12, 12, gapBottom - gapTop - 24);
        });
    }

    function drawFreud() {
        ctx.save();
        ctx.translate(state.freud.x, state.freud.y);
        const tilt = clamp(state.freud.vy / 600, -0.5, 0.5);
        ctx.rotate(tilt);
        drawWing(-1);
        drawWing(1);
        const size = state.freud.radius * 2.2;
        if (freudImage.complete && freudImage.naturalWidth > 0) {
            ctx.drawImage(freudImage, -size / 2, -size / 2, size, size);
        } else {
            ctx.fillStyle = '#f4f4f4';
            ctx.beginPath();
            ctx.arc(0, 0, state.freud.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#2f2f2f';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('F', 0, 1);
        }
        ctx.restore();
    }

    function drawWing(direction) {
        ctx.save();
        ctx.scale(direction, 1);
        ctx.translate(-state.freud.radius * 0.3, 0);
        ctx.rotate(-0.6 + Math.sin(state.wingPhase * 3 + direction) * 0.45);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(46, -36, 92, -6);
        ctx.quadraticCurveTo(62, 20, 0, 14);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function drawGround() {
        ctx.fillStyle = '#c59b6d';
        ctx.fillRect(0, canvas.height - physics.groundHeight, canvas.width, physics.groundHeight);
        ctx.fillStyle = '#b2885a';
        ctx.fillRect(0, canvas.height - physics.groundHeight, canvas.width, 8);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        for (let i = 0; i < canvas.width; i += 26) {
            ctx.fillRect(i, canvas.height - physics.groundHeight + 18, 18, 6);
        }
    }

    openBtn.addEventListener('click', openGame);
    startBtn.addEventListener('click', startGame);
    closeBtn.addEventListener('click', closeGame);
});
