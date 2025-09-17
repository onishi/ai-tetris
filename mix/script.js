(() => {
  const boardCanvas = document.getElementById('board');
  const boardCtx = boardCanvas.getContext('2d');
  const nextCanvas = document.getElementById('next');
  const nextCtx = nextCanvas.getContext('2d');
  const holdCanvas = document.getElementById('hold');
  const holdCtx = holdCanvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const levelEl = document.getElementById('level');
  const linesEl = document.getElementById('lines');
  const statusEl = document.getElementById('status');
  const overlay = document.getElementById('overlay');
  const overlayText = document.getElementById('overlay-text');
  const restartButton = document.getElementById('restart-button');

  const COLS = 10;
  const ROWS = 20;
  const BLOCK_SIZE = 32;
  const LINE_SCORES = [0, 100, 300, 500, 800];

  const SHAPES = {
    I: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    O: [
      [1, 1],
      [1, 1],
    ],
    T: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    S: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    Z: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    J: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    L: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
  };

  const COLORS = {
    I: '#65f7ff',
    O: '#ffd966',
    T: '#c07dff',
    S: '#72f587',
    Z: '#ff6f6f',
    J: '#6f9bff',
    L: '#ffb472',
    GHOST: 'rgba(255, 255, 255, 0.12)',
  };

  boardCanvas.width = COLS * BLOCK_SIZE;
  boardCanvas.height = ROWS * BLOCK_SIZE;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);

  const state = {
    board: createMatrix(COLS, ROWS),
    bag: [],
    queue: [],
    current: null,
    hold: { type: null, available: true },
    pos: { x: 0, y: 0 },
    dropCounter: 0,
    dropInterval: 1000,
    lastTime: 0,
    running: false,
    paused: false,
    score: 0,
    level: 1,
    lines: 0,
  };

  function createMatrix(width, height) {
    return Array.from({ length: height }, () => Array(width).fill(0));
  }

  function cloneShape(type) {
    return SHAPES[type].map((row) => [...row]);
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function refillBag() {
    state.bag = shuffle(Object.keys(SHAPES));
  }

  function refillQueue() {
    while (state.queue.length < 3) {
      if (state.bag.length === 0) {
        refillBag();
      }
      const type = state.bag.pop();
      state.queue.push({ type, matrix: cloneShape(type) });
    }
  }

  function spawnPiece(type) {
    if (!type) {
        refillQueue();
        state.current = state.queue.shift();
    } else {
        state.current = { type, matrix: cloneShape(type) };
    }
    state.pos.y = -getTopOffset(state.current.matrix);
    state.pos.x = Math.floor((COLS - state.current.matrix[0].length) / 2);

    if (collide(state.board, state.current.matrix, state.pos)) {
      endGame();
      return;
    }

    refillQueue();
    drawNextPreview();
  }

  function getTopOffset(matrix) {
    for (let y = 0; y < matrix.length; y++) {
      if (matrix[y].some(Boolean)) {
        return y;
      }
    }
    return 0;
  }

  function collide(board, matrix, offset) {
    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        if (!matrix[y][x]) {
          continue;
        }
        const bx = x + offset.x;
        const by = y + offset.y;
        if (bx < 0 || bx >= COLS || by >= ROWS || (by >= 0 && board[by][bx])) {
          return true;
        }
      }
    }
    return false;
  }

  function merge(board, matrix, offset, type) {
    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        if (matrix[y][x] && y + offset.y >= 0) {
          board[y + offset.y][x + offset.x] = type;
        }
      }
    }
  }

  function rotateMatrix(matrix, dir) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const rotated = Array.from({ length: cols }, () => Array(rows).fill(0));

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (dir > 0) {
          rotated[x][rows - 1 - y] = matrix[y][x];
        } else {
          rotated[cols - 1 - x][y] = matrix[y][x];
        }
      }
    }
    return rotated;
  }

  function attemptRotate(dir) {
    if (!state.current) {
      return;
    }
    const rotated = rotateMatrix(state.current.matrix, dir);
    const offsets = [0, -1, 1, -2, 2];

    for (const offset of offsets) {
      const testPosition = { x: state.pos.x + offset, y: state.pos.y };
      if (!collide(state.board, rotated, testPosition)) {
        state.current.matrix = rotated;
        state.pos.x += offset;
        return;
      }
    }
  }

  function clearLines() {
    let cleared = 0;

    outer: for (let y = state.board.length - 1; y >= 0; y--) {
      for (let x = 0; x < state.board[y].length; x++) {
        if (!state.board[y][x]) {
          continue outer;
        }
      }
      const row = state.board.splice(y, 1)[0].fill(0);
      state.board.unshift(row);
      cleared++;
      y++;
    }

    if (cleared > 0) {
      state.lines += cleared;
      state.score += LINE_SCORES[cleared] * state.level;
      state.level = Math.floor(state.lines / 10) + 1;
      state.dropInterval = Math.max(110, 1000 - (state.level - 1) * 70);
    }
  }

  function hardDrop() {
    if (!state.running || state.paused) {
      return;
    }
    while (stepDown()) {
      state.score += 2;
    }
    updateHud();
    lockPiece();
  }

  function softDrop() {
    if (!state.running || state.paused) {
      return;
    }
    if (stepDown()) {
      state.score += 1;
      updateHud();
    }
  }

  function stepDown() {
    state.pos.y++;
    if (collide(state.board, state.current.matrix, state.pos)) {
      state.pos.y--;
      return false;
    }
    return true;
  }

  function lockPiece() {
    if (!state.current) {
      return;
    }
    merge(state.board, state.current.matrix, state.pos, state.current.type);
    clearLines();
    updateHud();
    spawnPiece();
    state.dropCounter = 0;
    state.hold.available = true;
  }

  function movePlayer(dir) {
    if (!state.running || state.paused || !state.current) {
      return;
    }
    const nextPos = { x: state.pos.x + dir, y: state.pos.y };
    if (!collide(state.board, state.current.matrix, nextPos)) {
      state.pos = nextPos;
    }
  }

  function hold() {
      if (!state.hold.available || !state.running || state.paused) {
          return;
      }
      const heldType = state.hold.type;
      state.hold.type = state.current.type;
      state.hold.available = false;
      spawnPiece(heldType);
      drawHoldPreview();
  }

  function update(time = 0) {
    const delta = time - state.lastTime;
    state.lastTime = time;

    if (state.running && !state.paused) {
      state.dropCounter += delta;
      if (state.dropCounter > state.dropInterval) {
        state.dropCounter = 0;
        if (!stepDown()) {
          lockPiece();
        }
      }
    }

    draw();
    requestAnimationFrame(update);
  }

  function draw() {
    boardCtx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);
    drawWell();
    drawMatrix(state.board, { x: 0, y: 0 });

    if (state.current) {
      drawGhost();
      drawMatrix(state.current.matrix, state.pos, state.current.type);
    }
  }

  function drawWell() {
    const gradient = boardCtx.createLinearGradient(0, 0, 0, boardCanvas.height);
    gradient.addColorStop(0, 'rgba(40, 48, 98, 0.45)');
    gradient.addColorStop(1, 'rgba(20, 24, 52, 0.65)');
    boardCtx.fillStyle = gradient;
    boardCtx.fillRect(0, 0, boardCanvas.width, boardCanvas.height);

    boardCtx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    boardCtx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
      boardCtx.beginPath();
      boardCtx.moveTo(x * BLOCK_SIZE, 0);
      boardCtx.lineTo(x * BLOCK_SIZE, ROWS * BLOCK_SIZE);
      boardCtx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      boardCtx.beginPath();
      boardCtx.moveTo(0, y * BLOCK_SIZE);
      boardCtx.lineTo(COLS * BLOCK_SIZE, y * BLOCK_SIZE);
      boardCtx.stroke();
    }
  }

  function drawMatrix(matrix, offset, typeOverride) {
    for (let y = 0; y < matrix.length; y++) {
      for (let x = 0; x < matrix[y].length; x++) {
        const cell = matrix[y][x];
        if (!cell) {
          continue;
        }
        const type = typeOverride || cell;
        drawCell(x + offset.x, y + offset.y, type);
      }
    }
  }

  function drawCell(x, y, type) {
    if (y < 0) {
      return;
    }
    const px = x * BLOCK_SIZE;
    const py = y * BLOCK_SIZE;
    const color = COLORS[type] || COLORS.GHOST;

    boardCtx.fillStyle = color;
    boardCtx.fillRect(px + 1, py + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);

    if (type !== 'GHOST') {
      const shine = boardCtx.createLinearGradient(px, py, px, py + BLOCK_SIZE);
      shine.addColorStop(0, 'rgba(255,255,255,0.55)');
      shine.addColorStop(0.4, 'rgba(255,255,255,0.12)');
      shine.addColorStop(1, 'rgba(0,0,0,0.28)');
      boardCtx.fillStyle = shine;
      boardCtx.fillRect(px + 1, py + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);
    }
  }

  function drawGhost() {
    const ghostPos = { x: state.pos.x, y: state.pos.y };
    while (!collide(state.board, state.current.matrix, { x: ghostPos.x, y: ghostPos.y + 1 })) {
      ghostPos.y++;
    }
    drawMatrix(state.current.matrix, ghostPos, 'GHOST');
  }

  function drawPreview(canvas, context, pieceType) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      if (!pieceType) return;
      const matrix = SHAPES[pieceType];
      const block = Math.floor(Math.min((canvas.width - 16) / matrix[0].length, (canvas.height - 16) / matrix.length));
      const offsetX = (canvas.width - matrix[0].length * block) / 2;
      const offsetY = (canvas.height - matrix.length * block) / 2;

      for (let y = 0; y < matrix.length; y++) {
          for (let x = 0; x < matrix[y].length; x++) {
              if (matrix[y][x]) {
                  context.fillStyle = COLORS[pieceType];
                  context.fillRect(offsetX + x * block, offsetY + y * block, block - 2, block - 2);
              }
          }
      }
  }

  function drawNextPreview() {
      drawPreview(nextCanvas, nextCtx, state.queue[0]?.type);
  }

  function drawHoldPreview() {
      drawPreview(holdCanvas, holdCtx, state.hold.type);
  }

  function updateHud() {
    scoreEl.textContent = state.score.toString();
    levelEl.textContent = state.level.toString();
    linesEl.textContent = state.lines.toString();
  }

  function setStatus(message) {
    if (statusEl) {
      statusEl.textContent = message;
    }
  }

  function startGame() {
    state.board = createMatrix(COLS, ROWS);
    state.bag = [];
    state.queue = [];
    state.current = null;
    state.hold = { type: null, available: true };
    state.score = 0;
    state.level = 1;
    state.lines = 0;
    state.dropInterval = 1000;
    state.dropCounter = 0;
    state.lastTime = 0;
    state.running = true;
    state.paused = false;
    hideOverlay();
    updateHud();
    setStatus('ハイスコアを目指しましょう！');
    spawnPiece();
    drawHoldPreview();
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
  }

  function showOverlay(message) {
    overlayText.textContent = message;
    overlay.classList.remove('hidden');
  }

  function endGame() {
    state.running = false;
    state.current = null;
    showOverlay('ゲームオーバー');
    setStatus('R で再スタートできます');
  }

  function togglePause() {
    if (!state.running) {
      return;
    }
    state.paused = !state.paused;
    if (state.paused) {
      showOverlay('一時停止中');
      setStatus('一時停止中');
    } else {
      hideOverlay();
      setStatus('ハイスコアを目指しましょう！');
    }
  }

  document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      event.preventDefault();
    }

    switch (event.code) {
      case 'Space':
        if (!state.running) {
          startGame();
        } else {
          hardDrop();
        }
        break;
      case 'ArrowLeft':
        movePlayer(-1);
        break;
      case 'ArrowRight':
        movePlayer(1);
        break;
      case 'ArrowDown':
        softDrop();
        break;
      case 'ArrowUp':
        if (state.running && !state.paused) {
          attemptRotate(1);
        }
        break;
      case 'KeyZ':
        if (state.running && !state.paused) {
          attemptRotate(-1);
        }
        break;
      case 'KeyC':
        hold();
        break;
      case 'KeyP':
        togglePause();
        break;
      case 'KeyR':
        startGame();
        break;
    }
  });

  restartButton.addEventListener('click', startGame);

  update();
  setStatus('スペースでゲーム開始');
})();