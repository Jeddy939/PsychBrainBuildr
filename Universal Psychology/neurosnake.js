// neurosnake.js - simple snake variant rewarding Psychbucks

const cellSize = 20;
const gridCount = 20;
let canvas, ctx, scoreDisplay, instructionDisplay;
let snake, direction, food, score, intervalId, isPlaying = false, speed = 100, blocksEaten = 0, rewardValue = 2;

function initElements(){
    canvas = document.getElementById('neurosnake-canvas');
    ctx = canvas.getContext('2d');
    scoreDisplay = document.getElementById('neurosnake-score');
    instructionDisplay = document.getElementById('neurosnake-instruction');
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
    blocksEaten = 0;
    rewardValue = 2;
    speed = 100;
    isPlaying = false;
    if(intervalId){ clearInterval(intervalId); intervalId = null; }
    if(scoreDisplay) scoreDisplay.textContent = 'Psychbucks: 0';
    if(instructionDisplay) instructionDisplay.textContent = 'Press an arrow key to start';
    draw();
}

function stopGame(){
    isPlaying = false;
    if(intervalId){ clearInterval(intervalId); intervalId = null; }
function stopGame(){
    isPlaying = false;
    if(intervalId){ clearInterval(intervalId); intervalId = null; }
    if(instructionDisplay) instructionDisplay.textContent = '';
}
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
        score += rewardValue;
        blocksEaten++;
        rewardValue *= 1.5;
        if(scoreDisplay) scoreDisplay.textContent = `Psychbucks: ${Math.floor(score)}`;
        adjustSpeed();
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

function adjustSpeed(){
    let newSpeed = speed;
    if(score >= 1024) newSpeed = 50;
    else if(score >= 128) newSpeed = 75;
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
