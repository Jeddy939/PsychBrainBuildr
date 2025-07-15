// neurosnake.js - simple snake variant rewarding Psychbucks

const cellSize = 20;
const gridCount = 20;
let canvas, ctx;
let snake, direction, food, score, intervalId, isPlaying = false;

function initElements(){
    canvas = document.getElementById('neurosnake-canvas');
    ctx = canvas.getContext('2d');
    const openBtn = document.getElementById('open-neurosnake');
    const closeBtn = document.getElementById('close-neurosnake');
    const popup = document.getElementById('neurosnake-popup');
    if(openBtn) openBtn.addEventListener('click', () => {
        popup.style.display = 'flex';
        startGame();
    });
    if(closeBtn) closeBtn.addEventListener('click', () => {
        popup.style.display = 'none';
        stopGame();
    });
    document.addEventListener('keydown', handleKey);
}

function startGame(){
    snake = [{x: Math.floor(gridCount/2), y: Math.floor(gridCount/2)}];
    direction = {x:1, y:0};
    food = spawnFood();
    score = 0;
    isPlaying = true;
    if(intervalId) clearInterval(intervalId);
    intervalId = setInterval(gameLoop, 100);
    draw();
}

function stopGame(){
    isPlaying = false;
    if(intervalId){ clearInterval(intervalId); intervalId = null; }
}

function spawnFood(){
    let pos;
    do {
        pos = {x: Math.floor(Math.random()*gridCount), y: Math.floor(Math.random()*gridCount)};
    } while (snake.some(s => s.x===pos.x && s.y===pos.y));
    return pos;
}

function handleKey(e){
    if(!isPlaying) return;
    switch(e.key){
        case 'ArrowUp': if(direction.y!==1) direction = {x:0,y:-1}; break;
        case 'ArrowDown': if(direction.y!==-1) direction = {x:0,y:1}; break;
        case 'ArrowLeft': if(direction.x!==1) direction = {x:-1,y:0}; break;
        case 'ArrowRight': if(direction.x!==-1) direction = {x:1,y:0}; break;
        default: return;
    }
    e.preventDefault();
}

function gameLoop(){
    const head = {x: snake[0].x + direction.x, y: snake[0].y + direction.y};
    if(head.x<0 || head.x>=gridCount || head.y<0 || head.y>=gridCount || snake.some(s => s.x===head.x && s.y===head.y)){
        endGame();
        return;
    }
    snake.unshift(head);
    if(head.x===food.x && head.y===food.y){
        score += 1;
        food = spawnFood();
    } else {
        snake.pop();
    }
    draw();
}

function draw(){
    ctx.fillStyle = '#000';
    ctx.fillRect(0,0,canvas.width, canvas.height);
    ctx.fillStyle = 'lime';
    snake.forEach(seg => ctx.fillRect(seg.x*cellSize, seg.y*cellSize, cellSize-1, cellSize-1));
    ctx.fillStyle = 'red';
    ctx.fillRect(food.x*cellSize, food.y*cellSize, cellSize-1, cellSize-1);
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
}

document.addEventListener('DOMContentLoaded', initElements);
