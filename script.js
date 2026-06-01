const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const startBtn = document.getElementById('start-btn');
const leaderboardList = document.getElementById('leaderboard-list');

context.scale(20, 20);

const COLORS = [
    null, '#ff007f', '#00f0ff', '#ffbc00', '#9d4edd', '#39ff14', '#ff5e00', '#001eff'
];

function createMatrix(w, h) {
    const matrix = [];
    while (h--) matrix.push(new Array(w).fill(0));
    return matrix;
}

function createPiece(type) {
    if (type === 'T') return [[0, 1, 0], [1, 1, 1], [0, 0, 0]];
    if (type === 'I') return [[0, 2, 0, 0], [0, 2, 0, 0], [0, 2, 0, 0], [0, 2, 0, 0]];
    if (type === 'O') return [[3, 3], [3, 3]];
    if (type === 'Z') return [[4, 4, 0], [0, 4, 4], [0, 0, 0]];
    if (type === 'S') return [[0, 5, 5], [5, 5, 0], [0, 0, 0]];
    if (type === 'J') return [[0, 6, 0], [0, 6, 0], [6, 6, 0]];
    if (type === 'L') return [[0, 7, 0], [0, 7, 0], [0, 7, 7]];
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) arena[y + player.pos.y][x + player.pos.x] = value;
        });
    });
}

function drawMatrix(matrix, offset) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillStyle = COLORS[value];
                context.fillRect(x + offset.x, y + offset.y, 1, 1);
                context.strokeStyle = '#0d0d11';
                context.lineWidth = 0.08;
                context.strokeRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

function arenaSweep() {
    let rowCount = 1;
    outer: for (let y = arena.length - 1; y > 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) continue outer;
        }
        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;

        player.score += rowCount * 10;
        player.linesCleared++;
        rowCount *= 2;

        // Level up every 10 lines
        if (player.linesCleared % 10 === 0 && player.level < 300) {
            player.level++;
            // DYNAMIC ACCELERATION: Drops 15% faster every single level
            // Starting at 600ms, Level 2 becomes 510ms, Level 5 is ~310ms, Level 15 is 50ms (max speed)
            dropInterval = Math.max(50, 600 * Math.pow(0.85, player.level - 1)); 
        }
    }
}

function draw() {
    context.fillStyle = '#0d0d11';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    context.strokeStyle = 'rgba(255, 255, 255, 0.02)';
    context.lineWidth = 0.02;
    for (let i = 0; i < 12; i++) {
        context.beginPath(); context.moveTo(i, 0); context.lineTo(i, 24); context.stroke();
    }
    for (let i = 0; i < 24; i++) {
        context.beginPath(); context.moveTo(0, i); context.lineTo(12, i); context.stroke();
    }

    drawMatrix(arena, {x: 0, y: 0});
    drawMatrix(player.matrix, player.pos);
}

let dropCounter = 0;
let dropInterval = 600; // Increased base speed (from 1000ms down to 600ms)
let lastTime = 0;

function update(time = 0) {
    if (gameOver) return;
    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }

    draw();
    requestAnimationFrame(update);
}

function updateDisplays() {
    scoreElement.innerText = player.score;
    levelElement.innerText = player.level;
}

function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateDisplays();
    }
    dropCounter = 0;
}

// HARD DROP SHORTCUT: Drops the piece immediately to the bottom
function playerHardDrop() {
    while (!collide(arena, player)) {
        player.pos.y++;
    }
    player.pos.y--; // Move back one step to the last valid position
    merge(arena, player);
    playerReset();
    arenaSweep();
    updateDisplays();
    dropCounter = 0;
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) player.pos.x -= dir;
}

function playerReset() {
    const pieces = 'ILJSZOT';
    player.matrix = createPiece(pieces[pieces.length * Math.random() | 0]);
    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);

    if (collide(arena, player)) {
        gameOver = true;
        handleGameOver();
    }
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    if (dir > 0) matrix.forEach(row => row.reverse());
    else matrix.reverse();
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

function loadLeaderboard() {
    const scores = JSON.parse(localStorage.getItem('tetrisLeaderboard')) || [];
    leaderboardList.innerHTML = '';
    scores.forEach(entry => {
        const li = document.createElement('li');
        li.innerText = `${entry.name.substring(0,10).toUpperCase()}: ${entry.score}`;
        leaderboardList.appendChild(li);
    });
}

function saveHighScore(name, score, level) {
    let scores = JSON.parse(localStorage.getItem('tetrisLeaderboard')) || [];
    scores.push({ name, score, level });
    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, 5);
    localStorage.setItem('tetrisLeaderboard', JSON.stringify(scores));
    loadLeaderboard();
}

function handleGameOver() {
    alert(`Grid Overrun! Final Score: ${player.score}`);
    const name = prompt("Enter Cyber-Runner Tag:") || "Anon";
    saveHighScore(name, player.score, player.level);
}

document.addEventListener('keydown', event => {
    if (gameOver) return;
    
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
        event.preventDefault(); 
    }

    if (event.key === 'ArrowLeft') playerMove(-1);
    else if (event.key === 'ArrowRight') playerMove(1);
    else if (event.key === 'ArrowDown') playerDrop();
    else if (event.key === 'q' || event.key === 'ArrowUp') playerRotate(1);
    else if (event.key === ' ') playerHardDrop(); // Binds spacebar to Hard Drop
});

const arena = createMatrix(12, 24);
const player = { pos: {x: 0, y: 0}, matrix: null, score: 0, level: 1, linesCleared: 0 };
let gameOver = true;

startBtn.addEventListener('click', () => {
    arena.forEach(row => row.fill(0));
    player.score = 0;
    player.level = 1;
    player.linesCleared = 0;
    dropInterval = 600; // Reset back to fast base speed on new game
    gameOver = false;
    updateDisplays();
    playerReset();
    update();
});

loadLeaderboard();