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
let overlayEl, closeButton, openButton, startButton;
let brainContainer;

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

let boardMetrics = {
    blockSize: 0,
    offsetX: 0,
    offsetY: 0,
    width: 0,
    height: 0,
    brainBounds: null,
    brainPath: null,
    headPath: null
};

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

function invalidateBoardMetrics() {
    boardMetrics.blockSize = 0;
    boardMetrics.offsetX = 0;
    boardMetrics.offsetY = 0;
    boardMetrics.width = 0;
    boardMetrics.height = 0;
    boardMetrics.brainBounds = null;
    boardMetrics.brainPath = null;
    boardMetrics.headPath = null;
}

function getBrainBounds(width, height) {
    const brainWidth = width * 0.54;
    const brainHeight = height * 0.58;
    const x = width * 0.24;
    const y = height * 0.17;
    return { x, y, width: brainWidth, height: brainHeight };
}

function createHeadPath(width, height) {
    const path = new Path2D();
    const top = height * 0.08;
    const crownX = width * 0.36;
    const foreheadX = width * 0.74;
    const browY = height * 0.26;
    const noseTipX = width * 0.86;
    const noseTipY = height * 0.44;
    const lipsY = height * 0.6;
    const chinY = height * 0.9;
    const neckFrontX = width * 0.54;
    const neckBackX = width * 0.32;

    path.moveTo(crownX, top);
    path.bezierCurveTo(width * 0.46, top * 0.6, width * 0.62, height * 0.1, foreheadX, browY);
    path.quadraticCurveTo(width * 0.78, height * 0.32, noseTipX, noseTipY);
    path.quadraticCurveTo(width * 0.8, height * 0.52, width * 0.82, lipsY);
    path.quadraticCurveTo(width * 0.76, height * 0.68, width * 0.72, height * 0.72);
    path.quadraticCurveTo(width * 0.68, chinY, neckFrontX, height * 0.96);
    path.lineTo(width * 0.36, height * 0.97);
    path.quadraticCurveTo(neckBackX, height * 0.86, width * 0.26, height * 0.7);
    path.quadraticCurveTo(width * 0.18, height * 0.48, width * 0.22, height * 0.28);
    path.quadraticCurveTo(width * 0.26, height * 0.12, crownX, top);
    path.closePath();
    return path;
}

function createBrainPath(width, height) {
    const bounds = getBrainBounds(width, height);
    const { x, y, width: w, height: h } = bounds;
    const topCenterX = x + w * 0.52;
    const path = new Path2D();

    path.moveTo(topCenterX, y);
    path.bezierCurveTo(x + w * 0.38, y - h * 0.08, x + w * 0.16, y + h * 0.02, x + w * 0.12, y + h * 0.18);
    path.bezierCurveTo(x + w * 0.02, y + h * 0.26, x + w * 0.02, y + h * 0.46, x + w * 0.08, y + h * 0.58);
    path.bezierCurveTo(x + w * 0.02, y + h * 0.72, x + w * 0.12, y + h * 0.86, x + w * 0.26, y + h * 0.94);
    path.bezierCurveTo(x + w * 0.4, y + h * 1.02, x + w * 0.58, y + h * 1.02, x + w * 0.7, y + h * 0.96);
    path.bezierCurveTo(x + w * 0.9, y + h * 0.88, x + w * 1.02, y + h * 0.68, x + w * 0.98, y + h * 0.46);
    path.bezierCurveTo(x + w * 1.02, y + h * 0.28, x + w * 0.94, y + h * 0.12, x + w * 0.74, y + h * 0.04);
    path.bezierCurveTo(x + w * 0.66, y - h * 0.04, x + w * 0.58, y - h * 0.04, topCenterX, y);
    path.closePath();
    return path;
}

function computeBoardMetrics(width, height) {
    const usingSilhouette = Boolean(brainContainer);
    const brainBounds = getBrainBounds(width, height);
    const blockSize = Math.min(brainBounds.width / COLS, brainBounds.height / ROWS);
    const boardWidth = blockSize * COLS;
    const boardHeight = blockSize * ROWS;
    const offsetX = brainBounds.x + (brainBounds.width - boardWidth) / 2;
    const offsetY = brainBounds.y + (brainBounds.height - boardHeight) / 2;

    boardMetrics.blockSize = blockSize;
    boardMetrics.offsetX = offsetX;
    boardMetrics.offsetY = offsetY;
    boardMetrics.width = boardWidth;
    boardMetrics.height = boardHeight;
    boardMetrics.brainBounds = brainBounds;

    if (usingSilhouette) {
        boardMetrics.brainPath = createBrainPath(width, height);
        boardMetrics.headPath = null;
    } else {
        boardMetrics.brainPath = createBrainPath(width, height);
        boardMetrics.headPath = createHeadPath(width, height);
    }
    return boardMetrics;
}

function ensureBoardMetrics() {
    if (!canvas) {
        return boardMetrics;
    }
    if (!boardMetrics.blockSize) {
        computeBoardMetrics(canvas.width, canvas.height);
    }
    return boardMetrics;
}

function drawBrainTexture(context, bounds) {
    if (!bounds) return;
    const { x, y, width, height } = bounds;
    context.save();
    context.globalAlpha = 0.18;
    context.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    context.lineWidth = Math.max(1.2, Math.min(width, height) * 0.015);
    const foldCount = 5;
    for (let i = 0; i < foldCount; i++) {
        const offset = (i / foldCount) * height * 0.85 + height * 0.08;
        context.beginPath();
        let started = false;
        for (let t = 0; t <= 1.01; t += 0.12) {
            const wave = Math.sin((t + i * 0.35 + animationTick * 0.002) * Math.PI * 2) * height * 0.08;
            const px = x + width * (0.18 + t * 0.68) + Math.sin((t + i) * Math.PI * 2) * width * 0.05;
            const py = y + offset + wave;
            if (!started) {
                context.moveTo(px, py);
                started = true;
            } else {
                context.lineTo(px, py);
            }
        }
        context.stroke();
    }
    context.restore();
}

function drawBrainGrid(context, metrics) {
    if (!metrics || !metrics.blockSize) return;
    const { blockSize, offsetX, offsetY } = metrics;
    context.save();
    context.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    context.lineWidth = Math.max(0.6, blockSize * 0.04);
    for (let x = 0; x <= COLS; x++) {
        context.beginPath();
        for (let y = 0; y <= ROWS; y++) {
            const baseX = offsetX + x * blockSize;
            const baseY = offsetY + y * blockSize;
            const wave = Math.sin((y / ROWS) * Math.PI * 2 + x * 0.5) * blockSize * 0.12;
            if (y === 0) {
                context.moveTo(baseX + wave, baseY);
            } else {
                context.lineTo(baseX + wave, baseY);
            }
        }
        context.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
        context.beginPath();
        for (let x = 0; x <= COLS; x++) {
            const baseX = offsetX + x * blockSize;
            const baseY = offsetY + y * blockSize;
            const wave = Math.sin((x / COLS) * Math.PI * 2 + y * 0.6) * blockSize * 0.12;
            if (x === 0) {
                context.moveTo(baseX, baseY + wave);
            } else {
                context.lineTo(baseX, baseY + wave);
            }
        }
        context.stroke();
    }
    context.restore();
}

function drawHeadDetails(context, width, height) {
    context.save();
    context.strokeStyle = 'rgba(70, 40, 38, 0.85)';
    context.lineWidth = Math.max(2, width * 0.012);

    const ear = new Path2D();
    const earX = width * 0.32;
    const earY = height * 0.52;
    ear.ellipse(earX, earY, width * 0.05, height * 0.09, -0.2, 0, Math.PI * 2);
    context.fillStyle = 'rgba(255, 214, 190, 0.9)';
    context.fill(ear);
    context.stroke(ear);

    context.beginPath();
    context.moveTo(earX + width * 0.01, earY - height * 0.02);
    context.quadraticCurveTo(earX + width * 0.025, earY, earX + width * 0.005, earY + height * 0.035);
    context.stroke();

    context.beginPath();
    context.moveTo(width * 0.66, height * 0.36);
    context.quadraticCurveTo(width * 0.7, height * 0.34, width * 0.74, height * 0.38);
    context.stroke();

    context.beginPath();
    context.moveTo(width * 0.68, height * 0.44);
    context.quadraticCurveTo(width * 0.74, height * 0.46, width * 0.78, height * 0.52);
    context.quadraticCurveTo(width * 0.7, height * 0.55, width * 0.72, height * 0.58);
    context.stroke();

    context.beginPath();
    context.moveTo(width * 0.66, height * 0.64);
    context.quadraticCurveTo(width * 0.72, height * 0.66, width * 0.64, height * 0.7);
    context.stroke();

    context.restore();

    context.save();
    const neckShade = context.createLinearGradient(width * 0.38, height * 0.74, width * 0.54, height * 0.98);
    neckShade.addColorStop(0, 'rgba(0, 0, 0, 0)');
    neckShade.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
    context.fillStyle = neckShade;
    context.beginPath();
    context.moveTo(width * 0.5, height * 0.86);
    context.quadraticCurveTo(width * 0.46, height * 0.94, width * 0.36, height * 0.98);
    context.lineTo(width * 0.54, height * 0.98);
    context.closePath();
    context.fill();

    context.restore();
}

function renderBrainBlob(context, centerX, centerY, blockSize, colorIndex, wobblePhase = 0, scale = 1) {
    if (!context) return;
    const baseColor = PINK_SHADES[colorIndex % PINK_SHADES.length];
    const highlight = lightenColor(baseColor, 0.4);
    const shadow = darkenColor(baseColor, 0.45);
    const blobSize = blockSize * 1.05 * scale;
    const wobble = Math.sin((animationTick + wobblePhase) * 0.12) * blockSize * 0.1;

    context.save();
    context.translate(centerX, centerY);
    context.rotate(Math.sin((animationTick + wobblePhase) * 0.05) * 0.09);
    context.scale(1 + wobble / (blockSize * 1.6), 1 - wobble / (blockSize * 1.8));

    const gradient = context.createRadialGradient(-blobSize * 0.2, -blobSize * 0.25, blobSize * 0.1, 0, 0, blobSize * 0.7);
    gradient.addColorStop(0, highlight);
    gradient.addColorStop(0.55, baseColor);
    gradient.addColorStop(1, shadow);

    const path = new Path2D();
    const r = blobSize / 2;
    path.moveTo(-r * 0.55, -r);
    path.bezierCurveTo(r * 0.05, -r * 1.2, r * 0.9, -r * 0.7, r * 0.85, -r * 0.15);
    path.bezierCurveTo(r * 1.1, r * 0.25, r * 0.95, r * 0.75, r * 0.38, r);
    path.bezierCurveTo(-r * 0.1, r * 1.1, -r * 0.88, r * 0.75, -r * 0.92, r * 0.18);
    path.bezierCurveTo(-r * 1.02, -r * 0.35, -r * 0.85, -r * 0.88, -r * 0.35, -r);
    path.closePath();

    context.fillStyle = gradient;
    context.strokeStyle = lightenColor(baseColor, 0.18);
    context.lineWidth = blockSize * 0.06;
    context.lineJoin = 'round';
    context.fill(path);
    context.stroke(path);

    context.lineWidth = blockSize * 0.03;
    context.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    context.beginPath();
    context.moveTo(-r * 0.25, -r * 0.55);
    context.quadraticCurveTo(r * 0.05, -r * 0.05, -r * 0.12, r * 0.55);
    context.stroke();
    context.beginPath();
    context.moveTo(r * 0.22, -r * 0.35);
    context.quadraticCurveTo(r * 0.45, r * 0.05, r * 0.18, r * 0.6);
    context.stroke();

    context.restore();
}

function drawCell(x, y, colorIndex, wobblePhase = 0) {
    if (!ctx) return;
    const metrics = ensureBoardMetrics();
    if (!metrics || !metrics.blockSize) return;
    const { blockSize, offsetX, offsetY, brainPath } = metrics;
    const centerX = offsetX + x * blockSize + blockSize / 2;
    const centerY = offsetY + y * blockSize + blockSize / 2;

    ctx.save();
    if (brainPath) {
        ctx.clip(brainPath);
    }
    renderBrainBlob(ctx, centerX, centerY, blockSize, colorIndex, wobblePhase);
    ctx.restore();
}

function drawBoard() {
    if (!ctx || !canvas) return;
    const width = canvas.width;
    const height = canvas.height;
    const metrics = computeBoardMetrics(width, height);
    const { headPath, brainPath, brainBounds, blockSize, offsetX, offsetY } = metrics;

    ctx.clearRect(0, 0, width, height);

    if (!headPath) {
        const boardWidth = blockSize * COLS;
        const boardHeight = blockSize * ROWS;

        ctx.save();
        if (brainPath) {
            ctx.save();
            ctx.fillStyle = 'rgba(9, 12, 21, 0.92)';
            ctx.fill(brainPath);
            ctx.clip(brainPath);
        } else {
            ctx.fillStyle = 'rgba(6, 8, 16, 0.82)';
            ctx.fillRect(offsetX, offsetY, boardWidth, boardHeight);
        }

        const cortexGradient = ctx.createLinearGradient(0, offsetY, 0, offsetY + boardHeight);
        cortexGradient.addColorStop(0, 'rgba(63, 78, 128, 0.85)');
        cortexGradient.addColorStop(1, 'rgba(18, 24, 42, 0.92)');
        ctx.fillStyle = cortexGradient;
        ctx.fillRect(offsetX, offsetY, boardWidth, boardHeight);

        if (brainPath) {
            ctx.restore();
        }
        ctx.lineWidth = Math.max(3, blockSize * 0.16);
        ctx.strokeStyle = 'rgba(203, 211, 255, 0.5)';
        if (brainPath) {
            ctx.shadowColor = 'rgba(12, 14, 26, 0.45)';
            ctx.shadowBlur = Math.max(8, blockSize * 0.9);
            ctx.shadowOffsetY = blockSize * 0.2;
            ctx.stroke(brainPath);
        } else {
            ctx.strokeRect(offsetX, offsetY, boardWidth, boardHeight);
        }
        ctx.restore();

        if (brainPath) {
            ctx.save();
            ctx.clip(brainPath);
            drawBrainTexture(ctx, brainBounds);
            ctx.strokeStyle = 'rgba(203, 211, 255, 0.08)';
            ctx.lineWidth = Math.max(1, blockSize * 0.06);
            for (let x = 1; x < COLS; x++) {
                const lineX = offsetX + x * blockSize;
                ctx.beginPath();
                ctx.moveTo(lineX, offsetY);
                ctx.lineTo(lineX, offsetY + boardHeight);
                ctx.stroke();
            }
            for (let y = 1; y < ROWS; y++) {
                const lineY = offsetY + y * blockSize;
                ctx.beginPath();
                ctx.moveTo(offsetX, lineY);
                ctx.lineTo(offsetX + boardWidth, lineY);
                ctx.stroke();
            }
            ctx.restore();
        }

        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                const cell = board[y][x];
                if (cell) {
                    drawCell(x, y, cell.colorIndex, cell.wobblePhase);
                }
            }
        }

        return;
    }

    const backdrop = ctx.createRadialGradient(
        width * 0.5,
        height * 0.12,
        Math.max(width, height) * 0.1,
        width * 0.5,
        height * 0.65,
        Math.max(width, height)
    );
    backdrop.addColorStop(0, '#14061f');
    backdrop.addColorStop(1, '#1f0a2f');
    ctx.fillStyle = backdrop;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    const skinGradient = ctx.createLinearGradient(width * 0.48, height * 0.02, width * 0.5, height * 0.96);
    skinGradient.addColorStop(0, '#f9d9c7');
    skinGradient.addColorStop(0.55, '#f0bea0');
    skinGradient.addColorStop(1, '#d99570');
    ctx.fillStyle = skinGradient;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = Math.max(12, width * 0.045);
    ctx.shadowOffsetX = width * 0.015;
    ctx.shadowOffsetY = height * 0.03;
    ctx.fill(headPath);
    ctx.restore();

    ctx.save();
    ctx.clip(headPath);
    const headHighlight = ctx.createRadialGradient(width * 0.62, height * 0.28, width * 0.08, width * 0.72, height * 0.32, width * 0.45);
    headHighlight.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
    headHighlight.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = headHighlight;
    ctx.fillRect(width * 0.18, height * 0.06, width * 0.64, height * 0.58);
    ctx.restore();

    ctx.save();
    ctx.clip(brainPath);

    const brainGradient = ctx.createRadialGradient(
        brainBounds.x + brainBounds.width * 0.48,
        brainBounds.y + brainBounds.height * 0.25,
        Math.min(brainBounds.width, brainBounds.height) * 0.18,
        brainBounds.x + brainBounds.width * 0.56,
        brainBounds.y + brainBounds.height * 0.72,
        Math.max(brainBounds.width, brainBounds.height)
    );
    brainGradient.addColorStop(0, 'rgba(255, 225, 240, 0.95)');
    brainGradient.addColorStop(1, 'rgba(206, 90, 152, 0.6)');
    ctx.fillStyle = brainGradient;
    ctx.fillRect(
        brainBounds.x - brainBounds.width * 0.2,
        brainBounds.y - brainBounds.height * 0.2,
        brainBounds.width * 1.4,
        brainBounds.height * 1.4
    );

    drawBrainTexture(ctx, brainBounds);
    drawBrainGrid(ctx, metrics);

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const cell = board[y][x];
            if (cell) {
                drawCell(x, y, cell.colorIndex, cell.wobblePhase);
            }
        }
    }
    ctx.restore();

    ctx.lineWidth = Math.max(5, width * 0.02);
    ctx.strokeStyle = '#522f2a';
    ctx.stroke(headPath);

    drawHeadDetails(ctx, width, height);
}

function drawPiece(piece) {
    if (!piece) return;
    const { matrix, pos, colorIndex, wobblePhase } = piece;
    const metrics = ensureBoardMetrics();
    ctx.save();
    if (metrics && metrics.brainPath) {
        ctx.clip(metrics.brainPath);
    }
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
    ctx.restore();
}

function drawNextPiece() {
    if (!nextCtx) return;
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (!nextPiece) return;
    const { matrix, colorIndex, wobblePhase } = nextPiece;
    const padding = Math.min(nextCanvas.width, nextCanvas.height) * 0.18;
    const blockSize = Math.min(
        (nextCanvas.width - padding) / matrix[0].length,
        (nextCanvas.height - padding) / matrix.length
    );
    const offsetX = (nextCanvas.width - blockSize * matrix[0].length) / 2;
    const offsetY = (nextCanvas.height - blockSize * matrix.length) / 2;

    const previewPath = new Path2D();
    const radiusX = nextCanvas.width * 0.42;
    const radiusY = nextCanvas.height * 0.38;
    previewPath.ellipse(nextCanvas.width / 2, nextCanvas.height / 2, radiusX, radiusY, 0, 0, Math.PI * 2);

    nextCtx.save();
    nextCtx.fillStyle = 'rgba(6, 8, 16, 0.9)';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    nextCtx.clip(previewPath);
    const previewGradient = nextCtx.createRadialGradient(
        nextCanvas.width * 0.48,
        nextCanvas.height * 0.28,
        Math.min(radiusX, radiusY) * 0.25,
        nextCanvas.width / 2,
        nextCanvas.height / 2,
        Math.max(radiusX, radiusY)
    );
    previewGradient.addColorStop(0, 'rgba(92, 110, 184, 0.9)');
    previewGradient.addColorStop(1, 'rgba(18, 24, 42, 0.9)');
    nextCtx.fillStyle = previewGradient;
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    nextCtx.strokeStyle = 'rgba(203, 211, 255, 0.3)';
    nextCtx.lineWidth = Math.max(1.5, blockSize * 0.08);
    nextCtx.beginPath();
    nextCtx.ellipse(nextCanvas.width / 2, nextCanvas.height / 2, radiusX, radiusY, 0, 0, Math.PI * 2);
    nextCtx.stroke();

    nextCtx.restore();

    nextCtx.save();
    nextCtx.clip(previewPath);
    for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < matrix[y].length; x++) {
            if (matrix[y][x]) {
                const centerX = offsetX + x * blockSize + blockSize / 2;
                const centerY = offsetY + y * blockSize + blockSize / 2;
                renderBrainBlob(nextCtx, centerX, centerY, blockSize, colorIndex, wobblePhase + (x + y) * 0.25, 0.9);
            }
        }
    }
    nextCtx.restore();
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

function resetGameState() {
    board = createMatrix(COLS, ROWS);
    currentPiece = null;
    nextPiece = null;
    psychbucksEarned = 0;
    dropCounter = 0;
    dropInterval = INITIAL_DROP_INTERVAL;
    lastTime = 0;
    animationTick = 0;
    totalLinesCleared = 0;
    bag = [];
    isRunning = false;
    isGameOver = false;
    invalidateBoardMetrics();
    updateStats();
}

function updateStartButtonLabel() {
    if (!startButton) return;
    if (isRunning) {
        startButton.textContent = 'Restart Brain Tetris';
    } else if (isGameOver) {
        startButton.textContent = 'Play Again';
    } else {
        startButton.textContent = 'Start Brain Tetris';
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
    const brainRect = brainContainer ? brainContainer.getBoundingClientRect() : null;
    let availableWidth = Math.min(window.innerWidth * 0.65, 420);
    let availableHeight = Math.min(window.innerHeight * 0.6, 520);
    if (brainRect && brainRect.width > 0 && brainRect.height > 0) {
        availableWidth = brainRect.width;
        availableHeight = brainRect.height;
    }

    let blockSize = Math.floor(Math.min(availableWidth / COLS, availableHeight / ROWS));
    if (brainRect) {
        blockSize = Math.max(4, blockSize);
    } else {
        blockSize = Math.max(14, blockSize);
    }
    if (blockSize <= 0) {
        return;
    }

    canvas.width = blockSize * COLS;
    canvas.height = blockSize * ROWS;
    if (brainRect) {
        canvas.style.width = '100%';
        canvas.style.height = '100%';
    } else {
        canvas.style.width = `${canvas.width}px`;
        canvas.style.height = `${canvas.height}px`;
    }
    if (nextCanvas) {
        let previewSize;
        if (brainRect && brainRect.width > 0) {
            previewSize = Math.max(110, Math.min(brainRect.width * 0.55, 200));
        } else {
            previewSize = Math.max(90, Math.min(blockSize * 4, window.innerWidth * 0.25, window.innerHeight * 0.25));
        }
        nextCanvas.width = previewSize;
        nextCanvas.height = previewSize;
        nextCanvas.style.width = `${previewSize}px`;
        nextCanvas.style.height = `${previewSize}px`;
    }
    invalidateBoardMetrics();
    drawBoard();
    drawPiece(currentPiece);
    drawNextPiece();
}

function startGame() {
    resetGameState();
    spawnPiece();
    dropCounter = 0;
    setMessage('Use ← → to shift squishy blocks, ↑ to rotate, ↓ to nudge, space to slam!');
    isRunning = true;
    isGameOver = false;
    updateStartButtonLabel();
    drawBoard();
    drawPiece(currentPiece);
    drawNextPiece();
    if (!animationId) {
        animationId = window.requestAnimationFrame(update);
    }
}

function stopGame() {
    isRunning = false;
    updateStartButtonLabel();
    if (animationId) {
        window.cancelAnimationFrame(animationId);
        animationId = null;
    }
}

function gameOver() {
    isRunning = false;
    isGameOver = true;
    setMessage('Brain overload! Press Start to rebuild your cortex.');
    updateStartButtonLabel();
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
    if (!isRunning) {
        if (key === 'Enter') {
            startGame();
        }
        return;
    }
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
    resetGameState();
    setMessage('Press Start to grow your squishy cortex!');
    updateStartButtonLabel();
    resizeCanvas();
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('resize', resizeCanvas);
    if (!animationId) {
        animationId = window.requestAnimationFrame(update);
    }
    if (startButton) {
        startButton.focus();
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
    brainContainer = document.getElementById('braintetris-brain');
    if (canvas) ctx = canvas.getContext('2d');
    if (nextCanvas) nextCtx = nextCanvas.getContext('2d');
    scoreDisplay = document.getElementById('braintetris-score');
    linesDisplay = document.getElementById('braintetris-lines');
    levelDisplay = document.getElementById('braintetris-level');
    messageDisplay = document.getElementById('braintetris-message');
    overlayEl = document.getElementById('braintetris-popup');
    closeButton = document.getElementById('close-braintetris');
    openButton = document.getElementById('open-braintetris');
    startButton = document.getElementById('start-braintetris');

    if (closeButton) {
        closeButton.addEventListener('click', closePopup);
    }
    if (openButton) {
        openButton.addEventListener('click', () => {
            openPopup();
        });
    }
    if (startButton) {
        startButton.addEventListener('click', () => {
            startGame();
        });
    }
    updateStartButtonLabel();
}

document.addEventListener('DOMContentLoaded', init);
