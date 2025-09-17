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

let dropCounter = 0;
let dropInterval = 1000; // 1 second
let lastTime = 0;

function gameLoop(time = 0) {
    const deltaTime = time - lastTime;
    lastTime = time;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        player.pos.y++;
        dropCounter = 0;
    }

    draw();
    requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') {
        player.pos.x--;
    } else if (event.key === 'ArrowRight') {
        player.pos.x++;
    } else if (event.key === 'ArrowDown') {
        player.pos.y++;
    } else if (event.key === 'ArrowUp') {
        // Rotate
        const currentShape = player.tetromino.shape[player.rotation];
        const nextRotation = (player.rotation + 1) % player.tetromino.shape.length;
        player.rotation = nextRotation;
    }
});


console.log('Starting Tetris...');
playerReset();
gameLoop();

