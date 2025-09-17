document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('tetris-canvas');
    const context = canvas.getContext('2d');
    const holdCanvas = document.getElementById('hold-canvas');
    const holdContext = holdCanvas.getContext('2d');
    const nextCanvas = document.getElementById('next-canvas');
    const nextContext = nextCanvas.getContext('2d');

    const scoreElement = document.getElementById('score');
    const levelElement = document.getElementById('level');
    const linesElement = document.getElementById('lines');
    const gameOverElement = document.getElementById('game-over');
    const restartButton = document.getElementById('restart-button');

    const COLS = 10;
    const ROWS = 20;
    const BLOCK_SIZE = 30;
    const PREVIEW_BLOCK_SIZE = 20;

    canvas.width = COLS * BLOCK_SIZE;
    canvas.height = ROWS * BLOCK_SIZE;

    context.scale(BLOCK_SIZE, BLOCK_SIZE);

    const COLORS = {
        'I': '#00ffff', // Cyan
        'J': '#0000ff', // Blue
        'L': '#ff7f00', // Orange
        'O': '#ffff00', // Yellow
        'S': '#00ff00', // Green
        'T': '#800080', // Purple
        'Z': '#ff0000'  // Red
    };

    const SHAPES = {
        'I': [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
        'J': [[1,0,0], [1,1,1], [0,0,0]],
        'L': [[0,0,1], [1,1,1], [0,0,0]],
        'O': [[1,1], [1,1]],
        'S': [[0,1,1], [1,1,0], [0,0,0]],
        'T': [[0,1,0], [1,1,1], [0,0,0]],
        'Z': [[1,1,0], [0,1,1], [0,0,0]]
    };

    let grid;
    let player;
    let nextPieces;
    let holdPiece;
    let canHold;
    let score;
    let level;
    let lines;
    let dropCounter;
    let dropInterval;
    let gameOver;
    let animationFrameId;

    const pieceBag = [];

    function createPiece(type) {
        return {
            type: type,
            matrix: SHAPES[type],
            pos: { x: Math.floor(COLS / 2) - Math.floor(SHAPES[type][0].length / 2), y: 0 }
        };
    }

    function generatePieceBag() {
        const pieces = 'IOTSZJL';
        while (pieceBag.length < pieces.length * 2) {
            const shuffled = pieces.split('').sort(() => Math.random() - 0.5);
            pieceBag.push(...shuffled);
        }
    }

    function getNextPiece() {
        if (pieceBag.length < 7) {
            generatePieceBag();
        }
        return pieceBag.shift();
    }

    function playerReset() {
        nextPieces = [getNextPiece(), getNextPiece(), getNextPiece(), getNextPiece()];
        player = createPiece(getNextPiece());
        
        if (collide(grid, player)) {
            gameOver = true;
        }
        
        canHold = true;
        drawNext();
        drawHold();
    }

    function init() {
        grid = createGrid(COLS, ROWS);
        score = 0;
        level = 1;
        lines = 0;
        holdPiece = null;
        gameOver = false;
        
        updateScoreboard();
        playerReset();
        
        dropCounter = 0;
        dropInterval = 1000;
        
        gameOverElement.classList.add('hidden');
        
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
        gameLoop();
    }

    function createGrid(cols, rows) {
        const grid = [];
        while (rows--) {
            grid.push(new Array(cols).fill(0));
        }
        return grid;
    }

    function collide(grid, player) {
        const [m, o] = [player.matrix, player.pos];
        for (let y = 0; y < m.length; ++y) {
            for (let x = 0; x < m[y].length; ++x) {
                if (m[y][x] !== 0 &&
                   (grid[y + o.y] && grid[y + o.y][x + o.x]) !== 0) {
                    return true;
                }
            }
        }
        return false;
    }

    function draw() {
        context.fillStyle = '#0d0d0d';
        context.fillRect(0, 0, canvas.width, canvas.height);
        drawGrid(grid, {x: 0, y: 0});
        drawGhostPiece();
        drawGrid(player.matrix, player.pos, true);
    }
    
    function drawGrid(grid, offset, isPlayer = false) {
        grid.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const color = COLORS[value];
                    context.fillStyle = color;
                    context.fillRect(x + offset.x, y + offset.y, 1, 1);

                    // Neon glow effect
                    context.shadowColor = color;
                    context.shadowBlur = isPlayer ? 15 : 5;
                }
            });
        });
        context.shadowBlur = 0;
    }

    function drawGhostPiece() {
        const ghost = { ...player, pos: { ...player.pos } };
        while (!collide(grid, ghost)) {
            ghost.pos.y++;
        }
        ghost.pos.y--;

        ghost.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    context.fillStyle = 'rgba(255, 255, 255, 0.15)';
                    context.fillRect(x + ghost.pos.x, y + ghost.pos.y, 1, 1);
                }
            });
        });
    }

    function drawOnSideCanvas(ctx, pieceType, blockSize) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        if (!pieceType) return;

        const matrix = SHAPES[pieceType];
        const color = COLORS[pieceType];
        const scale = blockSize / BLOCK_SIZE;
        
        const matrixSize = matrix.length;
        const offsetX = (ctx.canvas.width / scale - matrixSize) / 2;
        const offsetY = (ctx.canvas.height / scale - matrixSize) / 2;

        ctx.save();
        ctx.scale(scale, scale);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;

        matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    ctx.fillRect(x + offsetX, y + offsetY, 1, 1);
                }
            });
        });
        ctx.restore();
    }
    
    function drawNext() {
        nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
        const blockSize = PREVIEW_BLOCK_SIZE;
        const scale = blockSize / BLOCK_SIZE;
        
        nextPieces.forEach((pieceType, index) => {
            const matrix = SHAPES[pieceType];
            const color = COLORS[pieceType];
            const matrixSize = matrix.length;
            
            const canvasCenterX = nextCanvas.width / scale / 2;
            const pieceWidth = matrix.reduce((max, row) => Math.max(max, row.filter(c => c).length), 0);
            const offsetX = canvasCenterX - pieceWidth / 2;
            const offsetY = 2 + index * 5;

            nextContext.save();
            nextContext.scale(scale, scale);
            nextContext.fillStyle = color;
            nextContext.shadowColor = color;
            nextContext.shadowBlur = 8;

            matrix.forEach((row, y) => {
                row.forEach((value, x) => {
                    if (value !== 0) {
                        nextContext.fillRect(x + offsetX, y + offsetY, 1, 1);
                    }
                });
            });
            nextContext.restore();
        });
    }

    function drawHold() {
        drawOnSideCanvas(holdContext, holdPiece, PREVIEW_BLOCK_SIZE);
    }

    function merge(grid, player) {
        player.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    grid[y + player.pos.y][x + player.pos.x] = player.type;
                }
            });
        });
    }

    function playerDrop() {
        player.pos.y++;
        if (collide(grid, player)) {
            player.pos.y--;
            lockPiece();
            return;
        }
        dropCounter = 0;
    }

    function playerMove(dir) {
        player.pos.x += dir;
        if (collide(grid, player)) {
            player.pos.x -= dir;
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

    function playerRotate(dir) {
        const pos = player.pos.x;
        let offset = 1;
        const originalMatrix = JSON.parse(JSON.stringify(player.matrix));
        rotate(player.matrix, dir);
        
        while (collide(grid, player)) {
            player.pos.x += offset;
            offset = -(offset + (offset > 0 ? 1 : -1));
            if (offset > player.matrix[0].length) {
                rotate(player.matrix, -dir); // revert rotation
                player.pos.x = pos;
                return;
            }
        }
        
        // T-Spin check logic
        if (player.type === 'T') {
            player.lastMoveWasRotate = true;
        } else {
            player.lastMoveWasRotate = false;
        }
    }
    
    function hardDrop() {
        while (!collide(grid, player)) {
            player.pos.y++;
        }
        player.pos.y--;
        lockPiece();
    }

    function hold() {
        if (!canHold) return;

        if (holdPiece) {
            [player, holdPiece] = [createPiece(holdPiece), player.type];
            player.pos = { x: Math.floor(COLS / 2) - Math.floor(SHAPES[player.type][0].length / 2), y: 0 };
        } else {
            holdPiece = player.type;
            player = createPiece(getNextPiece());
            nextPieces.push(getNextPiece());
            nextPieces.shift();
        }
        
        canHold = false;
        drawHold();
        drawNext();
    }

    function lockPiece() {
        const tSpin = checkTSpin();
        merge(grid, player);
        sweepGrid(tSpin);
        
        player.type = nextPieces.shift();
        player.matrix = SHAPES[player.type];
        player.pos = { x: Math.floor(COLS / 2) - Math.floor(player.matrix[0].length / 2), y: 0 };
        
        nextPieces.push(getNextPiece());

        if (collide(grid, player)) {
            gameOver = true;
        }
        
        canHold = true;
        player.lastMoveWasRotate = false;
        updateScoreboard();
        drawNext();
    }
    
    function checkTSpin() {
        if (player.type !== 'T' || !player.lastMoveWasRotate) {
            return false;
        }

        const [m, o] = [player.matrix, player.pos];
        const corners = [
            (grid[o.y] && grid[o.y][o.x]) !== 0,
            (grid[o.y] && grid[o.y][o.x + 2]) !== 0,
            (grid[o.y + 2] && grid[o.y + 2][o.x]) !== 0,
            (grid[o.y + 2] && grid[o.y + 2][o.x + 2]) !== 0
        ];
        
        return corners.filter(c => c).length >= 3;
    }

    function sweepGrid(isTSpin) {
        let clearedLines = 0;
        outer: for (let y = grid.length - 1; y > 0; --y) {
            for (let x = 0; x < grid[y].length; ++x) {
                if (grid[y][x] === 0) {
                    continue outer;
                }
            }
            const row = grid.splice(y, 1)[0].fill(0);
            grid.unshift(row);
            ++y;
            clearedLines++;
        }
        
        if (clearedLines > 0) {
            let lineScore = 0;
            if (isTSpin) {
                // T-Spin scoring
                const tSpinScores = [0, 800, 1200, 1600];
                lineScore = tSpinScores[clearedLines] * level;
            } else {
                // Standard scoring
                const lineScores = [0, 100, 300, 500, 800];
                lineScore = lineScores[clearedLines] * level;
            }
            score += lineScore;
            lines += clearedLines;
            
            if (lines >= level * 10) {
                level++;
                dropInterval = Math.max(100, 1000 - (level - 1) * 50);
            }
        }
    }

    function updateScoreboard() {
        scoreElement.innerText = score;
        levelElement.innerText = level;
        linesElement.innerText = lines;
    }

    let lastTime = 0;
    function gameLoop(time = 0) {
        if (gameOver) {
            gameOverElement.classList.remove('hidden');
            context.fillStyle = 'rgba(0,0,0,0.75)';
            context.fillRect(0, 0, canvas.width, canvas.height);
            return;
        }

        const deltaTime = time - lastTime;
        lastTime = time;
        dropCounter += deltaTime;

        if (dropCounter > dropInterval) {
            playerDrop();
        }

        draw();
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    document.addEventListener('keydown', event => {
        if (gameOver) return;

        switch (event.code) {
            case 'ArrowLeft':
                playerMove(-1);
                break;
            case 'ArrowRight':
                playerMove(1);
                break;
            case 'ArrowDown':
                playerDrop();
                break;
            case 'ArrowUp':
                playerRotate(1);
                break;
            case 'Space':
                event.preventDefault();
                hardDrop();
                break;
            case 'KeyC':
                hold();
                break;
        }
    });
    
    restartButton.addEventListener('click', () => {
        init();
    });

    init();
});
