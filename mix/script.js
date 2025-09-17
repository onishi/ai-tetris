const canvas = document.getElementById('tetris-canvas');
const context = canvas.getContext('2d');

const BLOCK_SIZE = 20;
const ROWS = 20;
const COLS = 12;

canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;

context.scale(BLOCK_SIZE, BLOCK_SIZE);

const board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

const COLORS = [
    null,
    '#FF0D72', // T
    '#0DC2FF', // O
    '#0DFF72', // L
    '#F538FF', // J
    '#FF8E0D', // I
    '#FFE138', // S
    '#3877FF', // Z
];

const TETROMINOES = {
    'T': {
        shape: [
            [[1, 1, 1], [0, 1, 0]],
            [[0, 1], [1, 1], [0, 1]],
            [[0, 1, 0], [1, 1, 1]],
            [[1, 0], [1, 1], [1, 0]]
        ],
        color: 1,
    },
    'O': {
        shape: [
            [[1, 1], [1, 1]]
        ],
        color: 2,
    },
    'L': {
        shape: [
            [[0, 0, 1], [1, 1, 1]],
            [[1, 0], [1, 0], [1, 1]],
            [[1, 1, 1], [1, 0, 0]],
            [[1, 1], [0, 1], [0, 1]]
        ],
        color: 3,
    },
    'J': {
        shape: [
            [[1, 0, 0], [1, 1, 1]],
            [[1, 1], [1, 0], [1, 0]],
            [[1, 1, 1], [0, 0, 1]],
            [[0, 1], [0, 1], [1, 1]]
        ],
        color: 4,
    },
    'I': {
        shape: [
            [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
            [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]]
        ],
        color: 5,
    },
    'S': {
        shape: [
            [[0, 1, 1], [1, 1, 0]],
            [[1, 0], [1, 1], [0, 1]]
        ],
        color: 6,
    },
    'Z': {
        shape: [
            [[1, 1, 0], [0, 1, 1]],
            [[0, 1], [1, 1], [1, 0]]
        ],
        color: 7,
    }
};

const player = {
    pos: { x: 0, y: 0 },
    tetromino: null,
    rotation: 0,
};

function playerReset() {
    const tetrominoes = 'TJLOSIZ';
    const randTetromino = tetrominoes[Math.floor(Math.random() * tetrominoes.length)];
    player.tetromino = TETROMINOES[randTetromino];
    player.rotation = 0;
    player.pos.y = 0;
    player.pos.x = (COLS / 2 | 0) - (player.tetromino.shape[player.rotation][0].length / 2 | 0);
}

function drawBoard() {
    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value > 0) {
                context.fillStyle = COLORS[value];
                context.fillRect(x, y, 1, 1);
            }
        });
    });
}

function drawPiece(piece, offset) {
    piece.shape[piece.rotation].forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillStyle = COLORS[piece.color];
                context.fillRect(x + offset.x, y + offset.y, 1, 1);
            }
        });
    });
}

function draw() {
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    drawBoard();
    if (player.tetromino) {
        drawPiece(player.tetromino, player.pos);
    }
}

function playerDrop() {
    player.pos.y++;
    if (collide(board, player)) {
        player.pos.y--;
        merge(board, player);
        playerReset();
        if (collide(board, player)) {
            // Game Over
            board.forEach(row => row.fill(0));
        }
    }
    dropCounter = 0;
}

function playerMove(dir) {
    player.pos.x += dir;
    if (collide(board, player)) {
        player.pos.x -= dir;
    }
}

function playerRotate() {
    const pos = player.pos.x;
    let offset = 1;
    const nextRotation = (player.rotation + 1) % player.tetromino.shape.length;
    player.rotation = nextRotation;
    while (collide(board, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.tetromino.shape[player.rotation][0].length) {
            player.rotation = (player.rotation + player.tetromino.shape.length - 1) % player.tetromino.shape.length;
            player.pos.x = pos;
            return;
        }
    }
}


let dropCounter = 0;
let dropInterval = 1000; // 1 second
let lastTime = 0;

function gameLoop(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }

    draw();
    requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') {
        playerMove(-1);
    } else if (event.key === 'ArrowRight') {
        playerMove(1);
    } else if (event.key === 'ArrowDown') {
        playerDrop();
    } else if (event.key === 'ArrowUp') {
        playerRotate();
    }
});


console.log('Starting Tetris...');
playerReset();
gameLoop();

Loop();

