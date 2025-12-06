// MODULE: minigames/chain-reaction.js
// Chain Reaction - Cell explosion puzzle with strategic clicking

const ChainReactionMinigame = (() => {
  // Config
  const config = {
    rounds: 2,                // <-- reduced rounds
    rows: 8,
    cols: 6,
    tickDelay: 80,            // ms delay between chain ticks for visual clarity
    cssVarCellSize: '--cr-cell-size',
    defaultCellSize: 36       // default cell size in pixels
  };

  // Private state
  let container;
  let grid = []; // 2D array of {count}
  let currentRound = 0;
  let running = false;

  // Helpers
  function createGrid(rows, cols) {
    grid = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        row.push({ count: 0, r, c, el: null });
      }
      grid.push(row);
    }
  }

  function getNeighbors(r, c) {
    const n = [];
    if (r > 0) n.push(grid[r - 1][c]);
    if (r < grid.length - 1) n.push(grid[r + 1][c]);
    if (c > 0) n.push(grid[r][c - 1]);
    if (c < grid[0].length - 1) n.push(grid[r][c + 1]);
    return n;
  }

  function thresholdForCell(r, c) {
    return getNeighbors(r, c).length;
  }

  function hasAnyDoubles() {
    for (const row of grid) {
      for (const cell of row) {
        if (cell.count >= 2) return true;
      }
    }
    return false;
  }

  function renderGrid() {
    container.innerHTML = '';
    const board = document.createElement('div');
    board.className = 'cr-board';
    board.style.setProperty(config.cssVarCellSize, config.defaultCellSize + 'px');

    grid.forEach((row) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'cr-row';
      row.forEach((cell) => {
        const cellEl = document.createElement('button');
        cellEl.className = 'cr-cell';
        cellEl.dataset.r = cell.r;
        cellEl.dataset.c = cell.c;
        cellEl.type = 'button';
        cell.el = cellEl;
        updateCellEl(cell);
        cellEl.addEventListener('click', onCellClick);
        rowEl.appendChild(cellEl);
      });
      board.appendChild(rowEl);
    });
    container.appendChild(board);
  }

  function updateCellEl(cell) {
    const el = cell.el;
    el.textContent = cell.count > 0 ? String(cell.count) : '';
    el.classList.toggle('cr-cell--empty', cell.count === 0);
    el.classList.toggle('cr-cell--active', cell.count >= 2);
  }

  function flashIllegalClick(cellEl) {
    cellEl.classList.add('cr-illegal');
    setTimeout(() => cellEl.classList.remove('cr-illegal'), 300);
  }

  function onCellClick() {
    if (!running) return;
    const r = Number(this.dataset.r);
    const c = Number(this.dataset.c);
    const cell = grid[r][c];

    // Rule: if there is any cell with count >= 2, singles (<2) are NOT clickable.
    const blockingDoubles = hasAnyDoubles();
    if (blockingDoubles && cell.count < 2) {
      // disallow click - visual feedback
      flashIllegalClick(this);
      return;
    }

    // Allowed click
    handleIncrement(cell);
  }

  function handleIncrement(cell) {
    incrementCell(cell);
    processExplosions();
  }

  function incrementCell(cell) {
    cell.count += 1;
    updateCellEl(cell);
  }

  function setCellToZero(cell) {
    cell.count = 0;
    updateCellEl(cell);
  }

  function processExplosions() {
    // Process chain reactions in ticks to allow animation and to avoid synchronous deep recursion
    const queue = [];

    // initial seeds: any cell over threshold
    for (const row of grid) {
      for (const cell of row) {
        if (cell.count >= thresholdForCell(cell.r, cell.c)) {
          queue.push(cell);
        }
      }
    }

    if (queue.length === 0) {
      checkRoundEnd();
      return;
    }

    function tick() {
      if (queue.length === 0) {
        checkRoundEnd();
        return;
      }

      const cell = queue.shift();
      if (cell.count < thresholdForCell(cell.r, cell.c)) {
        // may have changed since queued - skip
        setTimeout(tick, config.tickDelay);
        return;
      }

      // explode
      setCellToZero(cell);
      cell.el.classList.add('cr-explode');
      setTimeout(() => cell.el.classList.remove('cr-explode'), 250);

      const neighbors = getNeighbors(cell.r, cell.c);
      neighbors.forEach((n) => {
        n.count += 1;
        updateCellEl(n);
        if (n.count >= thresholdForCell(n.r, n.c) && !queue.includes(n)) {
          queue.push(n);
        }
      });

      setTimeout(tick, config.tickDelay);
    }

    setTimeout(tick, config.tickDelay);
  }

  function checkRoundEnd() {
    // Are there any non-zero cells left?
    const anyNonZero = grid.some(row => row.some(cell => cell.count > 0));
    if (!anyNonZero) {
      currentRound++;
      if (currentRound >= config.rounds) {
        endGame(true);
      } else {
        setupRound();
      }
    } else {
      // If non-zero left but no explosions in flight, allow further clicks (subject to single/double rule)
    }
  }

  function setupRound() {
    // For each new round we seed some random cells. Keep the seeding conservative.
    for (let i = 0; i < 6 + currentRound * 2; i++) {
      const r = Math.floor(Math.random() * config.rows);
      const c = Math.floor(Math.random() * config.cols);
      const cell = grid[r][c];
      cell.count = Math.max(1, cell.count + 1);
    }
    renderGrid(); // re-render to attach events and update display
  }

  function endGame(won) {
    running = false;
    const msg = document.createElement('div');
    msg.className = 'cr-end';
    msg.textContent = won ? 'Cleared!' : 'Game Over';
    container.appendChild(msg);
    // send event on window.game.bus if available
    try {
      window.game?.bus?.emit?.('minigame:end', { won });
    } catch (err) {
      console.error('[ChainReaction] event emit error', err);
    }
  }

  // Public API
  function init(el) {
    container = el;
    container.classList.add('cr-container');
    createGrid(config.rows, config.cols);
    renderGrid();
  }

  function start() {
    currentRound = 0;
    running = true;
    // initial seed and render
    setupRound();
  }

  function stop() {
    running = false;
  }

  // Expose configurable setters for quick tweaks (useful for testing)
  function setRounds(n) {
    config.rounds = Math.max(1, Math.floor(n));
  }

  function setCellSize(px) {
    config.defaultCellSize = px;
    container && container.style.setProperty(config.cssVarCellSize, px + 'px');
  }

  return {
    init,
    start,
    stop,
    setRounds,
    setCellSize
  };
})();

// Legacy compatibility layer for old render-based interface
(function(g){
  'use strict';

  // Score calculation constants
  const WIN_BASE_SCORE = 60;
  const WIN_BONUS_RANGE = 40;
  const LOSS_MAX_SCORE = 60;
  const FORCED_LOSS_MIN = 30;
  const FORCED_LOSS_RANGE = 25;

  /**
   * Legacy render function for backwards compatibility
   * Maps the old render(container, onComplete, options) API to the new ChainReactionMinigame API
   * 
   * @param {HTMLElement} container - Container element for the game UI
   * @param {Function} onComplete - Callback function(score) when game ends
   * @param {Object} options - Game options (debugMode, competitionMode)
   */
  function render(container, onComplete, options = {}){
    const { 
      debugMode = false, 
      competitionMode = false
    } = options;

    // Initialize with new API (uses default config values: 2 rounds, 36px cells)
    try {
      ChainReactionMinigame.init(container);
      ChainReactionMinigame.setRounds(2);
      ChainReactionMinigame.setCellSize(36);
    } catch (err) {
      console.error('[ChainReaction] Initialization failed:', err);
      if (typeof onComplete === 'function') {
        onComplete(0); // Return 0 score on initialization failure
      }
      return;
    }

    // Mock the game bus to capture the end event and call onComplete
    const originalBus = g.game?.bus;
    const mockBus = {
      emit: (event, data) => {
        if (event === 'minigame:end') {
          // Calculate score based on win/loss
          // Won = high score (WIN_BASE_SCORE to 100), Lost = low score (0 to LOSS_MAX_SCORE)
          let score = data.won ? (WIN_BASE_SCORE + Math.random() * WIN_BONUS_RANGE) : (Math.random() * LOSS_MAX_SCORE);
          score = Math.round(score);

          // Apply competition mode logic if needed
          if (competitionMode && g.GameUtils && !debugMode) {
            const playerSucceeded = data.won;
            const shouldWin = g.GameUtils.determineGameResult(playerSucceeded, false);
            if (!shouldWin && playerSucceeded) {
              // Force loss despite success
              score = Math.round(FORCED_LOSS_MIN + Math.random() * FORCED_LOSS_RANGE);
              console.log('[ChainReaction] Win probability applied: success forced to loss');
            }
          }

          // Call the original onComplete callback
          if (typeof onComplete === 'function') {
            onComplete(score);
          }

          // Restore original bus
          if (g.game) {
            g.game.bus = originalBus;
          }
        }
        // Also call original bus if it exists
        if (originalBus && originalBus.emit) {
          originalBus.emit(event, data);
        }
      }
    };

    // Temporarily replace the bus
    if (!g.game) g.game = {};
    g.game.bus = mockBus;

    // Start the game
    ChainReactionMinigame.start();
  }

  // Export to legacy MiniGames namespace
  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.chainReaction = { render };

})(window);

// Register module in global MinigameModules namespace for runtime resolution
(function(g){
  'use strict';
  
  // Initialize MinigameModules namespace if not exists
  if(typeof g.MinigameModules === 'undefined'){
    g.MinigameModules = {};
  }
  
  // Register the ChainReactionMinigame module under 'chainReaction' key
  g.MinigameModules.chainReaction = ChainReactionMinigame;
  
  // Also register in window.game.MinigameModules if window.game exists
  if(g.game && typeof g.game === 'object'){
    if(typeof g.game.MinigameModules === 'undefined'){
      g.game.MinigameModules = {};
    }
    g.game.MinigameModules.chainReaction = ChainReactionMinigame;
  }
  
  console.info('[ChainReaction] Module registered globally');
  
})(window);

// CommonJS export for Node.js environments (defensive)
/* eslint-disable no-undef */
if(typeof module !== 'undefined' && module.exports){
  module.exports = { ChainReactionMinigame };
}
/* eslint-enable no-undef */
