// Brain Tetris - a squishy pink twist on the classic

const COLS = 10;
const ROWS = 20;
const INITIAL_DROP_INTERVAL = 800; // milliseconds
const MIN_DROP_INTERVAL = 120;
const DROP_INTERVAL_STEP = 70;
const PINK_SHADES = ['#ff9ecf', '#ff7eb6', '#ffbcd6', '#ff8fb3', '#ff6fa8', '#ffa4c8'];
const LINE_REWARD = [0, 2, 5, 9, 14];

let canvas, ctx, nextCanvas, nextCtx;
let scoreDisplay, linesDisplay, levelDisplay, messageDisplay;
let overlayEl, closeButton, openButton;

let board;
let currentPiece = null;
let nextPiece = null;
let bag = [];
let dropCounter = 0;
let dropInterval = INITIAL_DROP_INTERVAL;
let lastTime = 0;
let animationId = null;
let animationTick = 0;
let isPopupOpen = false;
let isRunning = false;
let isGameOver = false;
let psychbucksEarned = 0;
let totalLinesCleared = 0;

function createMatrix(width, height) {
    const matrix = [];
    for (let y = 0; y < height; y++) {
        matrix.push(new Array(width).fill(0));
    }
    return matrix;
}

function cloneMatrix(matrix) {
    return matrix.map(row => row.slice());
}

const PIECES = [
    { name: 'I', matrix: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ]},
    { name: 'J', matrix: [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
    ]},
    { name: 'L', matrix: [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
    ]},
    { name: 'O', matrix: [
        [1, 1],
        [1, 1]
    ]},
    { name: 'S', matrix: [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
    ]},
    { name: 'T', matrix: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
    ]},
    { name: 'Z', matrix: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
    ]}
];

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function getNextFromBag() {
    if (bag.length === 0) {
        bag = shuffle(PIECES.map(piece => ({ name: piece.name, matrix: cloneMatrix(piece.matrix) })));
    }
    return bag.pop();
}

function createPiece() {
    const base = getNextFromBag();
    return {
        name: base.name,
        matrix: base.matrix,
        pos: { x: Math.floor(COLS / 2) - Math.ceil(base.matrix[0].length / 2), y: 0 },
        colorIndex: Math.floor(Math.random() * PINK_SHADES.length),
        wobblePhase: Math.random() * Math.PI * 2
    };
}

function rotate(matrix, dir) {
    const rotated = matrix[0].map((_, index) => matrix.map(row => row[index]));
    if (dir > 0) {
        rotated.forEach(row => row.reverse());
        return rotated;
    }
    rotated.reverse();
    return rotated;
}

function collide(boardState, piece) {
    const { matrix, pos } = piece;
    for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < matrix[y].length; x++) {
            if (!matrix[y][x]) continue;
            const boardY = y + pos.y;
            const boardX = x + pos.x;
            if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
                return true;
            }
            if (boardY < 0) {
                continue;
            }
            if (boardState[boardY][boardX]) {
                return true;
            }
        }
    }
    return false;
}

function merge(boardState, piece) {
    const { matrix, pos, colorIndex, wobblePhase } = piece;
    for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < matrix[y].length; x++) {
            if (matrix[y][x]) {
                const boardY = y + pos.y;
                const boardX = x + pos.x;
                if (boardY >= 0) {
                    boardState[boardY][boardX] = {
                        colorIndex,
                        wobblePhase: wobblePhase + (x + y) * 0.4
                    };
                }
            }
        }
    }
}

function sweepBoard() {
    let linesCleared = 0;
    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(cell => cell)) {
            const removed = board.splice(y, 1)[0];
            removed.fill(0);
            board.unshift(removed);
            linesCleared++;
            y++; // Check same row index again after unshift
        }
    }
    if (linesCleared > 0) {
        handleLineClear(linesCleared);
    }
}

function updateDropSpeed() {
    const level = Math.floor(totalLinesCleared / 10) + 1;
    dropInterval = Math.max(MIN_DROP_INTERVAL, INITIAL_DROP_INTERVAL - (level - 1) * DROP_INTERVAL_STEP);
}

function rewardForLines(lines) {
    if (lines < LINE_REWARD.length) {
        return LINE_REWARD[lines];
    }
    return lines * 5;
}

function handleLineClear(lines) {
    totalLinesCleared += lines;
    const reward = rewardForLines(lines);
    psychbucksEarned += reward;
    updateStats();
    if (reward > 0) {
        const api = window.GameAPI;
        if (api) {
            const gs = api.getGameState();
            if (gs && typeof gs.psychbucks === 'number') {
                gs.psychbucks += reward;
                api.updateDisplays();
                const plural = lines === 1 ? 'line' : 'lines';
                api.logMessage(`Brain Tetris: Cleared ${lines} ${plural}! +${reward} Psychbucks`, 'log-info');
            }
        }
    }
    setMessage(lines >= 4 ? 'Neuro Tetris! Massive neural integration!' : 'Synapses aligned nicely. Keep stacking!');
    updateDropSpeed();
}

function lightenColor(hex, amount) {
    const { r, g, b } = hexToRgb(hex);
    const nr = Math.round(r + (255 - r) * amount);
    const ng = Math.round(g + (255 - g) * amount);
    const nb = Math.round(b + (255 - b) * amount);
    return `rgb(${nr}, ${ng}, ${nb})`;
}

function darkenColor(hex, amount) {
    const { r, g, b } = hexToRgb(hex);
    const nr = Math.round(r * (1 - amount));
    const ng = Math.round(g * (1 - amount));
    const nb = Math.round(b * (1 - amount));
    return `rgb(${nr}, ${ng}, ${nb})`;
}

function hexToRgb(hex) {
    let normalized = hex.replace('#', '');
    if (normalized.length === 3) {
        normalized = normalized.split('').map(ch => ch + ch).join('');
    }
    const num = parseInt(normalized, 16);
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
    };
}

function drawRoundedRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + width - r, y);
    context.quadraticCurveTo(x + width, y, x + width, y + r);
    context.lineTo(x + width, y + height - r);
    context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    context.lineTo(x + r, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();
}

function drawCell(x, y, colorIndex, wobblePhase = 0) {
    if (!ctx) return;
    const blockSize = canvas.width / COLS;
    const baseColor = PINK_SHADES[colorIndex % PINK_SHADES.length];
    const highlight = lightenColor(baseColor, 0.35);
    const shadow = darkenColor(baseColor, 0.35);

    const centerX = x * blockSize + blockSize / 2;
    const centerY = y * blockSize + blockSize / 2;
    const blobSize = blockSize * 0.9;
    const wobble = Math.sin((animationTick + wobblePhase) * 0.12) * blockSize * 0.1;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(Math.sin((animationTick + wobblePhase) * 0.05) * 0.1);
    ctx.scale(1 + wobble / (blockSize * 1.6), 1 - wobble / (blockSize * 1.8));

    const gradient = ctx.createRadialGradient(0, -blobSize * 0.15, blobSize * 0.15, 0, 0, blobSize * 0.6);
    gradient.addColorStop(0, highlight);
    gradient.addColorStop(1, shadow);

    ctx.fillStyle = gradient;
    ctx.strokeStyle = lightenColor(baseColor, 0.15);
    ctx.lineWidth = blockSize * 0.08;
    drawRoundedRect(ctx, -blobSize / 2, -blobSize / 2, blobSize, blobSize, blobSize * 0.4);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
}

function drawBoard() {
    if (!ctx) return;
    ctx.fillStyle = '#2b0a3d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    const blockSize = canvas.width / COLS;
    for (let x = 0; x <= COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * blockSize, 0);
        ctx.lineTo(x * blockSize, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * blockSize);
        ctx.lineTo(canvas.width, y * blockSize);
        ctx.stroke();
    }

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const cell = board[y][x];
            if (cell) {
                drawCell(x, y, cell.colorIndex, cell.wobblePhase);
            }
        }
    }
}

function drawPiece(piece) {
    if (!piece) return;
    const { matrix, pos, colorIndex, wobblePhase } = piece;
    for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < matrix[y].length; x++) {
            if (matrix[y][x]) {
                const drawY = y + pos.y;
                const drawX = x + pos.x;
                if (drawY >= 0) {
                    drawCell(drawX, drawY, colorIndex, wobblePhase + (x + y) * 0.3);
                }
            }
        }
    }
}

function drawNextPiece() {
    if (!nextCtx) return;
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (!nextPiece) return;
    const { matrix, colorIndex, wobblePhase } = nextPiece;
    const blockSize = Math.min(nextCanvas.width / matrix[0].length, nextCanvas.height / matrix.length);
    for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < matrix[y].length; x++) {
            if (matrix[y][x]) {
                const cellX = x * blockSize + (nextCanvas.width - blockSize * matrix[0].length) / 2;
                const cellY = y * blockSize + (nextCanvas.height - blockSize * matrix.length) / 2;
                const baseColor = PINK_SHADES[colorIndex % PINK_SHADES.length];
                const highlight = lightenColor(baseColor, 0.35);
                const shadow = darkenColor(baseColor, 0.35);
                const gradient = nextCtx.createRadialGradient(
                    cellX + blockSize / 2,
                    cellY + blockSize / 2 - blockSize * 0.2,
                    blockSize * 0.2,
                    cellX + blockSize / 2,
                    cellY + blockSize / 2,
                    blockSize * 0.6
                );
                gradient.addColorStop(0, highlight);
                gradient.addColorStop(1, shadow);

                nextCtx.save();
                nextCtx.translate(cellX + blockSize / 2, cellY + blockSize / 2);
                nextCtx.rotate(Math.sin((animationTick + wobblePhase) * 0.05) * 0.08);
                nextCtx.fillStyle = gradient;
                nextCtx.strokeStyle = lightenColor(baseColor, 0.1);
                nextCtx.lineWidth = blockSize * 0.1;
                drawRoundedRect(nextCtx, -blockSize * 0.4, -blockSize * 0.4, blockSize * 0.8, blockSize * 0.8, blockSize * 0.25);
                nextCtx.fill();
                nextCtx.stroke();
                nextCtx.restore();
            }
        }
    }
}

function updateStats() {
    if (!scoreDisplay || !linesDisplay || !levelDisplay) return;
    const level = Math.floor(totalLinesCleared / 10) + 1;
    scoreDisplay.textContent = `Psychbucks Earned: ${psychbucksEarned}`;
    linesDisplay.textContent = `Lines Cleared: ${totalLinesCleared}`;
    levelDisplay.textContent = `Level: ${level}`;
}

function setMessage(msg) {
    if (messageDisplay) {
        messageDisplay.textContent = msg;
    }
}

function dropPiece() {
    if (!currentPiece) return;
    currentPiece.pos.y++;
    if (collide(board, currentPiece)) {
        currentPiece.pos.y--;
        lockPiece();
        sweepBoard();
        spawnPiece();
    }
    dropCounter = 0;
}

function lockPiece() {
    merge(board, currentPiece);
}

function spawnPiece() {
    if (!nextPiece) {
        nextPiece = createPiece();
    }
    currentPiece = nextPiece;
    nextPiece = createPiece();
    currentPiece.pos.y = -getSpawnOffset(currentPiece.matrix);
    if (collide(board, currentPiece)) {
        gameOver();
    }
    drawNextPiece();
}

function getSpawnOffset(matrix) {
    for (let y = 0; y < matrix.length; y++) {
        if (matrix[y].some(value => value)) {
            return y;
        }
    }
    return 0;
}

function hardDrop() {
    while (currentPiece && !collide(board, currentPiece)) {
        currentPiece.pos.y++;
    }
    if (currentPiece) {
        currentPiece.pos.y--;
        lockPiece();
        sweepBoard();
        spawnPiece();
        dropCounter = 0;
    }
}

function movePiece(dir) {
    if (!currentPiece) return;
    currentPiece.pos.x += dir;
    if (collide(board, currentPiece)) {
        currentPiece.pos.x -= dir;
    }
}

function rotatePiece(dir) {
    if (!currentPiece) return;
    const originalX = currentPiece.pos.x;
    const originalMatrix = currentPiece.matrix;
    const rotated = rotate(originalMatrix, dir);
    currentPiece.matrix = rotated;

    let offset = 1;
    while (collide(board, currentPiece)) {
        currentPiece.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (Math.abs(offset) > rotated[0].length) {
            currentPiece.matrix = originalMatrix;
            currentPiece.pos.x = originalX;
            return;
        }
    }
}

function update(time = 0) {
    if (!isPopupOpen) {
        animationId = null;
        return;
    }
    const delta = time - lastTime;
    lastTime = time;
    dropCounter += delta;
    animationTick += delta / 16.666; // normalize to frame units

    if (isRunning && dropCounter > dropInterval) {
        dropPiece();
    }

    drawBoard();
    drawPiece(currentPiece);
    drawNextPiece();

    animationId = window.requestAnimationFrame(update);
}

function resizeCanvas() {
    if (!canvas) return;
    const maxWidth = Math.min(window.innerWidth * 0.5, window.innerHeight * 0.75, 520);
    const blockSize = Math.max(18, Math.floor(maxWidth / COLS));
    canvas.width = blockSize * COLS;
    canvas.height = blockSize * ROWS;
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
    if (nextCanvas) {
        const previewSize = Math.max(110, Math.min(window.innerWidth, window.innerHeight) * 0.18);
        nextCanvas.width = previewSize;
        nextCanvas.height = previewSize;
        nextCanvas.style.width = `${previewSize}px`;
        nextCanvas.style.height = `${previewSize}px`;
    }
    drawBoard();
    drawPiece(currentPiece);
    drawNextPiece();
}

function startGame() {
    board = createMatrix(COLS, ROWS);
    psychbucksEarned = 0;
    dropCounter = 0;
    dropInterval = INITIAL_DROP_INTERVAL;
    lastTime = 0;
    animationTick = 0;
    totalLinesCleared = 0;
    bag = [];
    nextPiece = null;
    spawnPiece();
    updateStats();
    setMessage('Use ← → to shift squishy blocks, ↑ to rotate, ↓ to nudge, space to slam!');
    isRunning = true;
    isGameOver = false;
    if (!animationId) {
        animationId = window.requestAnimationFrame(update);
    }
}

function stopGame() {
    isRunning = false;
    if (animationId) {
        window.cancelAnimationFrame(animationId);
        animationId = null;
    }
}

function gameOver() {
    isRunning = false;
    isGameOver = true;
    setMessage('Brain overload! Press Enter to rebuild your cortex.');
}

function handleKeydown(event) {
    if (!isPopupOpen) return;
    const key = event.key;
    if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ', 'Spacebar'].includes(key)) {
        event.preventDefault();
    }
    if (isGameOver && key === 'Enter') {
        startGame();
        return;
    }
    if (!isRunning) return;
    switch (key) {
        case 'ArrowLeft':
            movePiece(-1);
            break;
        case 'ArrowRight':
            movePiece(1);
            break;
        case 'ArrowDown':
            dropPiece();
            break;
        case 'ArrowUp':
            rotatePiece(1);
            break;
        case ' ':
        case 'Spacebar':
            hardDrop();
            break;
        default:
            break;
    }
}

function openPopup() {
    if (!overlayEl) return;
    overlayEl.style.display = 'flex';
    isPopupOpen = true;
    resizeCanvas();
    startGame();
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('resize', resizeCanvas);
    if (!animationId) {
        animationId = window.requestAnimationFrame(update);
    }
}

function closePopup() {
    if (!overlayEl) return;
    overlayEl.style.display = 'none';
    isPopupOpen = false;
    stopGame();
    window.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('resize', resizeCanvas);
}

function init() {
    canvas = document.getElementById('braintetris-canvas');
    nextCanvas = document.getElementById('braintetris-next');
    if (canvas) ctx = canvas.getContext('2d');
    if (nextCanvas) nextCtx = nextCanvas.getContext('2d');
    scoreDisplay = document.getElementById('braintetris-score');
    linesDisplay = document.getElementById('braintetris-lines');
    levelDisplay = document.getElementById('braintetris-level');
    messageDisplay = document.getElementById('braintetris-message');
    overlayEl = document.getElementById('braintetris-popup');
    closeButton = document.getElementById('close-braintetris');
    openButton = document.getElementById('open-braintetris');

    if (closeButton) {
        closeButton.addEventListener('click', closePopup);
    }
    if (openButton) {
        openButton.addEventListener('click', () => {
            openPopup();
        });
    }
}

document.addEventListener('DOMContentLoaded', init);
