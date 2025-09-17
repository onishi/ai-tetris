const canvas = document.getElementById('board');
const context = canvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextContext = nextCanvas.getContext('2d');

const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const linesElement = document.getElementById('lines');
const overlay = document.getElementById('overlay');
const overlayText = document.getElementById('overlay-text');
const restartButton = document.getElementById('restart-button');

context.scale(20, 20);
nextContext.scale(20, 20);

const COLS = 12;
const ROWS = 20;

let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

const COLORS = {
    'T': 'purple',
    'O': 'yellow',
    'L': 'orange',
    'J': 'blue',
    'I': 'cyan',
    'S': 'green',
    'Z': 'red'
};

const TETROMINOES = {
    'T': [[1, 1, 1], [0, 1, 0]],
    'O': [[1, 1], [1, 1]],
    'L': [[0, 0, 1], [1, 1, 1]],
    'J': [[1, 0, 0], [1, 1, 1]],
    'I': [[1, 1, 1, 1]],
    'S': [[0, 1, 1], [1, 1, 0]],
    'Z': [[1, 1, 0], [0, 1, 1]]
};

const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    piece: null,
    nextPiece: null,
    score: 0,
    level: 1,
    lines: 0,
};

let gameState = 'start'; // 'start', 'playing', 'paused', 'gameover'

function arenaSweep() {
    let rowCount = 1;
    let linesCleared = 0;
    outer: for (let y = board.length - 1; y > 0; --y) {
        for (let x = 0; x < board[y].length; ++x) {
            if (board[y][x] === 0) {
                continue outer;
            }
        }

        const row = board.splice(y, 1)[0].fill(0);
        board.unshift(row);
        ++y;

        linesCleared++;
        player.score += rowCount * 10;
        rowCount *= 2;
    }
    player.lines += linesCleared;

    if (linesCleared > 0) {
        player.level = Math.floor(player.lines / 10) + 1;
        dropInterval = 1000 - (player.level * 50);
        if (dropInterval < 100) {
            dropInterval = 100;
        }
    }
}

function collide(board, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (board[y + o.y] &&
                    board[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function drawPiece(matrix, offset, color, targetContext) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                targetContext.fillStyle = color;
                targetContext.fillRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

function draw() {
    // Draw main board
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillStyle = COLORS[value];
                context.fillRect(x, y, 1, 1);
            }
        });
    });
    if (player.matrix) {
        drawPiece(player.matrix, player.pos, COLORS[player.piece], context);
    }

    // Draw next piece
    nextContext.fillStyle = '#000';
    nextContext.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (player.nextPiece) {
        const matrix = TETROMINOES[player.nextPiece];
        const color = COLORS[player.nextPiece];
        const offset = {
            x: (nextCanvas.width / 20 / 2) - (matrix[0].length / 2),
            y: (nextCanvas.height / 20 / 2) - (matrix.length / 2),
        };
        drawPiece(matrix, offset, color, nextContext);
    }
}

function merge(board, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                board[y + player.pos.y][x + player.pos.x] = player.piece;
            }
        });
    });
}

function playerDrop() {
    player.pos.y++;
    if (collide(board, player)) {
        player.pos.y--;
        merge(board, player);
        if (spawnNewPiece()) {
            gameState = 'gameover';
        }
        arenaSweep();
        updateScore();
    }
    dropCounter = 0;
}

function playerHardDrop() {
    while (!collide(board, player)) {
        player.pos.y++;
    }
    player.pos.y--;
    merge(board, player);
    if (spawnNewPiece()) {
        gameState = 'gameover';
    }
    arenaSweep();
    updateScore();
    dropCounter = 0;
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(board, player)) {
        player.pos.x -= dir;
    }
}

function spawnNewPiece() {
    const pieces = 'TJLOSIZ';
    player.piece = player.nextPiece;
    player.nextPiece = pieces[pieces.length * Math.random() | 0];
    player.matrix = JSON.parse(JSON.stringify(TETROMINOES[player.piece]));
    player.pos.y = 0;
    player.pos.x = (board[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
    
    return collide(board, player);
}

function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(board, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
        }
    }
    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;

function update(time = 0) {
    if (gameState === 'playing') {
        const deltaTime = time - lastTime;
        lastTime = time;

        dropCounter += deltaTime;
        if (dropCounter > dropInterval) {
            playerDrop();
        }
    }

    draw();
    handleGameState();
    requestAnimationFrame(update);
}

function updateScore() {
    scoreElement.innerText = player.score;
    linesElement.innerText = player.lines;
    levelElement.innerText = player.level;
}

function handleGameState() {
    if (gameState === 'start') {
        overlayText.innerText = 'Press Space to Start';
        overlay.classList.remove('hidden');
        restartButton.classList.add('hidden');
    } else if (gameState === 'paused') {
        overlayText.innerText = 'Paused';
        overlay.classList.remove('hidden');
        restartButton.classList.add('hidden');
    } else if (gameState === 'gameover') {
        overlayText.innerText = 'Game Over';
        overlay.classList.remove('hidden');
        restartButton.classList.remove('hidden');
    } else if (gameState === 'playing') {
        overlay.classList.add('hidden');
    }
}

function startGame() {
    board.forEach(row => row.fill(0));
    player.score = 0;
    player.lines = 0;
    player.level = 1;
    const pieces = 'TJLOSIZ';
    player.nextPiece = pieces[pieces.length * Math.random() | 0];
    if (spawnNewPiece()) {
        gameState = 'gameover';
        return;
    }
    updateScore();
    gameState = 'playing';
}

restartButton.addEventListener('click', () => {
    startGame();
});

document.addEventListener('keydown', event => {
    if (gameState === 'start' && event.key === ' ') {
        startGame();
        return;
    }

    if (event.key === 'p') {
        if (gameState === 'playing') {
            gameState = 'paused';
        } else if (gameState === 'paused') {
            gameState = 'playing';
        }
        return;
    }

    if (gameState !== 'playing') {
        return;
    }

    if (event.key === 'ArrowLeft') {
        playerMove(-1);
    } else if (event.key === 'ArrowRight') {
        playerMove(1);
    } else if (event.key === 'ArrowDown') {
        playerDrop();
    } else if (event.key === 'ArrowUp') {
        playerRotate(1);
    } else if (event.key === ' ') {
        playerHardDrop();
    }
});

update();