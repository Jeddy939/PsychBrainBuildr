// neurosnake.js - enhanced snake variant rewarding Psychbucks

// Grid size and cell dimension will be adjusted dynamically
let cellSize = 30;
const gridCount = 25;

let canvas, ctx, scoreDisplay, instructionDisplay;
let snake, direction, food, score, intervalId, isPlaying = false,
    speed = 100, blocksEaten = 0, frame = 0;

function resizeCanvas() {
    const size = Math.min(window.innerWidth, window.innerHeight) * 0.8;
    canvas.width = size;
    canvas.height = size;
    cellSize = canvas.width / gridCount;
    draw(); // Redraw immediately
}

function initElements(){
    canvas = document.getElementById('neurosnake-canvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    scoreDisplay = document.getElementById('neurosnake-score');
    instructionDisplay = document.getElementById('neurosnake-instruction');
    const openBtn = document.getElementById('open-neurosnake');
    const closeBtn = document.getElementById('close-neurosnake');
    const popup = document.getElementById('neurosnake-popup');
    if(openBtn) openBtn.addEventListener('click', () => {
        popup.style.display = 'flex';
        resizeCanvas();
        startGame();
    });
    if(closeBtn) closeBtn.addEventListener('click', () => {
        popup.style.display = 'none';
        stopGame();
    });
    document.addEventListener('keydown', handleKey);
    window.addEventListener('resize', resizeCanvas);
}

function startGame(){
    snake = [{x: Math.floor(gridCount/2), y: Math.floor(gridCount/2)}];
    direction = {x:1, y:0};
    food = spawnFood();
    score = 0;
    blocksEaten = 0;
    speed = 100;
    isPlaying = false;
    if(intervalId){ clearInterval(intervalId); intervalId = null; }
    if(scoreDisplay) scoreDisplay.textContent = 'Psychbucks: 0';
    if(instructionDisplay) instructionDisplay.textContent = 'Press an arrow key to start';
    draw();
}

function stopGame(){
    isPlaying = false;
    if(intervalId){
        clearInterval(intervalId);
        intervalId = null;
    }
    if(instructionDisplay) instructionDisplay.textContent = '';
}

function spawnFood(){
    let pos;
    do {
        pos = {x: Math.floor(Math.random()*gridCount), y: Math.floor(Math.random()*gridCount)};
    } while (snake.some(s => s.x===pos.x && s.y===pos.y));
    return pos;
}

function handleKey(e){
    if(!isPlaying){
        switch(e.key){
            case 'ArrowUp': direction = {x:0,y:-1}; break;
            case 'ArrowDown': direction = {x:0,y:1}; break;
            case 'ArrowLeft': direction = {x:-1,y:0}; break;
            case 'ArrowRight': direction = {x:1,y:0}; break;
            default: return;
        }
        isPlaying = true;
        if(instructionDisplay) instructionDisplay.textContent = '';
        intervalId = setInterval(gameLoop, speed);
    } else {
        switch(e.key){
            case 'ArrowUp': if(direction.y!==1) direction = {x:0,y:-1}; break;
            case 'ArrowDown': if(direction.y!==-1) direction = {x:0,y:1}; break;
            case 'ArrowLeft': if(direction.x!==1) direction = {x:-1,y:0}; break;
            case 'ArrowRight': if(direction.x!==-1) direction = {x:1,y:0}; break;
            default: return;
        }
    }
    e.preventDefault();
}

function gameLoop(){
    let nextX = snake[0].x + direction.x;
    let nextY = snake[0].y + direction.y;
    if(nextX < 0) nextX = gridCount - 1;
    else if(nextX >= gridCount) nextX = 0;
    if(nextY < 0) nextY = gridCount - 1;
    else if(nextY >= gridCount) nextY = 0;
    const head = {x: nextX, y: nextY};
    if(snake.some(s => s.x===head.x && s.y===head.y)){
        endGame();
        return;
    }
    snake.unshift(head);
    if(head.x===food.x && head.y===food.y){
        blocksEaten++;
        const rewardPerNeuron = Math.floor((blocksEaten - 1) / 10) + 1;
        score += rewardPerNeuron;
        if(scoreDisplay) scoreDisplay.textContent = `Psychbucks: ${Math.floor(score)}`;
        adjustSpeed();
        food = spawnFood();
    } else {
        snake.pop();
    }
    draw();
}

function draw(){
    // `resizeCanvas` may call draw before the snake is initialized.
    if (!snake) return;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // precompute wiggle positions
    const positions = snake.map((seg, i) => getWigglePosition(seg, i));

    // draw electrical connections between neurons
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0ff';
const CONNECTION_DASH = [6, 4];
ctx.setLineDash(CONNECTION_DASH);
    ctx.lineDashOffset = -frame * 2;
    ctx.beginPath();
    for(let i=0;i<positions.length-1;i++){
        const a = positions[i];
        const b = positions[i+1];
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // draw neuron bodies with dendrites and axons
    positions.forEach((pos, idx) => drawNeuron(pos.x, pos.y, idx, positions));

    // draw food as a bright neuron
    drawFood();

    frame++;
}

function getWigglePosition(seg, index){
    const prev = snake[index-1] || seg;
    const next = snake[index+1] || seg;
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const offset = Math.sin(frame * 0.3 + index) * 3;
    return {
        x: seg.x * cellSize + cellSize/2 + nx * offset,
        y: seg.y * cellSize + cellSize/2 + ny * offset
    };
}

function drawNeuron(x, y, index, positions){
    const r = cellSize * 0.4;

    // neuron body
    const g = ctx.createRadialGradient(x, y, r*0.2, x, y, r);
    g.addColorStop(0, '#ffffcc');
    g.addColorStop(1, '#ff8800');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.fill();

    // dendrites
    ctx.strokeStyle = '#ffcc66';
    ctx.lineWidth = 1;
    const branches = 6;
    for(let i=0;i<branches;i++){
        const angle = (i/branches) * Math.PI*2 + frame*0.05;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(angle)*r, y + Math.sin(angle)*r);
        const segs = 3;
        for(let j=1;j<=segs;j++){
            const t = j/segs;
            const len = r*1.5;
            const off = Math.sin(frame*0.1 + index + i*j)*r*0.3;
            const px = x + Math.cos(angle)*(r + len*t) + Math.cos(angle+Math.PI/2)*off;
            const py = y + Math.sin(angle)*(r + len*t) + Math.sin(angle+Math.PI/2)*off;
            ctx.lineTo(px, py);
        }
        ctx.stroke();
    }

    // axon to next neuron
    if(positions && index < positions.length-1){
        const next = positions[index+1];
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        const dx = next.x - x;
        const dy = next.y - y;
        const segments = 4;
        for(let j=1;j<=segments;j++){
            const t = j/segments;
            const px = x + dx*t + Math.sin(frame*0.2 + j*index)*3*(1-t);
            const py = y + dy*t + Math.cos(frame*0.2 + j*index)*3*(1-t);
            ctx.lineTo(px, py);
        }
        ctx.stroke();
    }
}

function drawFood(){
    const x = food.x * cellSize + cellSize/2;
    const y = food.y * cellSize + cellSize/2;
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(x, y, cellSize*0.3, 0, Math.PI*2);
    ctx.fill();
}

function adjustSpeed(){
    const baseSpeed = 100;
    let newSpeed = Math.max(50, baseSpeed - Math.floor(blocksEaten / 10) * 5);
    if(newSpeed !== speed){
        speed = newSpeed;
        clearInterval(intervalId);
        intervalId = setInterval(gameLoop, speed);
    }
}

function endGame(){
    stopGame();
    const api = window.GameAPI;
    if(api){
        const gs = api.getGameState();
        gs.psychbucks += score;
        api.updateDisplays();
        api.logMessage(`NeuroSnake finished: +${score} Psychbucks!`, 'log-info');
    }
    if(instructionDisplay) instructionDisplay.textContent = 'Game over';
}

document.addEventListener('DOMContentLoaded', initElements);
