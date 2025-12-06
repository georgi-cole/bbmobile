(function (root) {
  'use strict';

  const ChainReactionMinigame = (() => {
    // Config
    const config = {
      rounds: 2,
      rows: 8,
      cols: 6,
      colors: ['#ff6b6b', '#6bcfff', '#ffd166', '#8d6bff', '#6bffa3'],
      cellSizeVar: '--cr-cell-size',
      defaultCellSizePx: 36
    };

    // State
    let container = null;
    let grid = []; // grid[r][c] = { color: string } or null
    let running = false;
    let currentRound = 0;

    // Helpers
    function randColor() {
      const idx = Math.floor(Math.random() * config.colors.length);
      return config.colors[idx];
    }

    function createEmptyGrid() {
      grid = [];
      for (let r = 0; r < config.rows; r++) {
        const row = new Array(config.cols).fill(null);
        grid.push(row);
      }
    }

    function seedInitialFill(fillProb = 0.8) {
      for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < config.cols; c++) {
          if (Math.random() < fillProb) {
            grid[r][c] = { color: randColor() };
          } else {
            grid[r][c] = null;
          }
        }
      }
    }

    function seedTiles(count) {
      const empties = [];
      for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < config.cols; c++) {
          if (!grid[r][c]) empties.push([r, c]);
        }
      }
      for (let i = 0; i < count && empties.length > 0; i++) {
        const idx = Math.floor(Math.random() * empties.length);
        const [r, c] = empties.splice(idx, 1)[0];
        grid[r][c] = { color: randColor() };
      }
    }

    function inBounds(r, c) {
      return r >= 0 && r < config.rows && c >= 0 && c < config.cols;
    }

    function getGroup(r, c) {
      const start = grid[r][c];
      if (!start) return [];
      const color = start.color;
      const visited = new Set();
      const stack = [[r, c]];
      const group = [];

      while (stack.length) {
        const [rr, cc] = stack.pop();
        const key = rr + ',' + cc;
        if (visited.has(key)) continue;
        visited.add(key);

        const cell = grid[rr][cc];
        if (!cell || cell.color !== color) continue;
        group.push([rr, cc]);

        // neighbors 4-way
        [
          [rr - 1, cc],
          [rr + 1, cc],
          [rr, cc - 1],
          [rr, cc + 1]
        ].forEach(([nr, nc]) => {
          if (inBounds(nr, nc)) {
            const nKey = nr + ',' + nc;
            if (!visited.has(nKey)) stack.push([nr, nc]);
          }
        });
      }

      return group;
    }

    function anyGroupSizeGE2() {
      const seen = new Set();
      for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < config.cols; c++) {
          const cell = grid[r][c];
          if (!cell) continue;
          const key = r + ',' + c;
          if (seen.has(key)) continue;
          const group = getGroup(r, c);
          group.forEach(([gr, gc]) => seen.add(gr + ',' + gc));
          if (group.length >= 2) return true;
        }
      }
      return false;
    }

    function removeGroup(group) {
      group.forEach(([r, c]) => {
        grid[r][c] = null;
      });
    }

    function applyGravity() {
      for (let c = 0; c < config.cols; c++) {
        let write = config.rows - 1;
        for (let r = config.rows - 1; r >= 0; r--) {
          if (grid[r][c]) {
            if (r !== write) {
              grid[write][c] = grid[r][c];
              grid[r][c] = null;
            }
            write--;
          }
        }
        for (let r = write; r >= 0; r--) {
          grid[r][c] = null;
        }
      }
    }

    function renderGrid() {
      if (!container) return;
      container.innerHTML = '';
      const board = document.createElement('div');
      board.className = 'cr-board';
      board.style.setProperty(config.cellSizeVar, config.defaultCellSizePx + 'px');

      for (let r = 0; r < config.rows; r++) {
        const rowEl = document.createElement('div');
        rowEl.className = 'cr-row';
        for (let c = 0; c < config.cols; c++) {
          const cellEl = document.createElement('button');
          cellEl.className = 'cr-cell';
          cellEl.type = 'button';
          cellEl.dataset.r = String(r);
          cellEl.dataset.c = String(c);
          const cell = grid[r][c];
          if (!cell) {
            cellEl.classList.add('cr-cell--empty');
            cellEl.style.background = 'transparent';
            cellEl.textContent = '';
          } else {
            cellEl.classList.remove('cr-cell--empty');
            cellEl.style.background = cell.color;
            cellEl.textContent = '';
          }
          cellEl.addEventListener('click', onCellClick);
          rowEl.appendChild(cellEl);
        }
        board.appendChild(rowEl);
      }
      container.appendChild(board);
    }

    function flashIllegalClick(cellEl) {
      if (!cellEl) return;
      cellEl.classList.add('cr-illegal');
      setTimeout(() => cellEl.classList.remove('cr-illegal'), 250);
    }

    function onCellClick() {
      if (!running) return;
      const r = Number(this.dataset.r);
      const c = Number(this.dataset.c);
      const cell = grid[r][c];
      if (!cell) {
        flashIllegalClick(this);
        return;
      }

      const blocking = anyGroupSizeGE2();
      const group = getGroup(r, c);
      if (blocking && group.length < 2) {
        flashIllegalClick(this);
        return;
      }

      removeGroup(group);
      applyGravity();
      renderGrid();
      checkRoundEnd();
    }

    function checkRoundEnd() {
      const anyNonEmpty = grid.some(row => row.some(cell => !!cell));
      if (!anyNonEmpty) {
        currentRound++;
        if (currentRound >= config.rounds) {
          endGame(true);
        } else {
          seedTiles(6 + currentRound * 2);
          renderGrid();
        }
      }
      // Game continues if tiles remain
    }

    function endGame(won) {
      running = false;
      if (!container) return;
      const msg = document.createElement('div');
      msg.className = 'cr-end';
      msg.textContent = won ? 'Cleared!' : 'Game Over';
      container.appendChild(msg);
      try {
        root.game && root.game.bus && root.game.bus.emit && root.game.bus.emit('minigame:end', { won });
      } catch (err) {
        // Silently fail if event bus unavailable
      }
    }

    function init(el) {
      container = el;
      container && container.classList && container.classList.add('cr-container');
      createEmptyGrid();
      seedInitialFill(0.82);
      renderGrid();
    }

    function start() {
      currentRound = 0;
      running = true;
      const anyNonEmpty = grid.some(row => row.some(cell => !!cell));
      if (!anyNonEmpty) seedInitialFill(0.82);
      renderGrid();
    }

    function stop() { running = false; }
    function setRounds(n) { config.rounds = Math.max(1, Math.floor(n)); }
    function setCellSize(px) { 
      try { 
        config.defaultCellSizePx = Number(px) || config.defaultCellSizePx; 
        if (container) { 
          const board = container.querySelector && container.querySelector('.cr-board'); 
          if (board) board.style.setProperty(config.cellSizeVar, config.defaultCellSizePx + 'px'); 
        } 
      } catch (_e) {
        // Silently fail if querySelector unavailable
      }
    }

    return { init, start, stop, setRounds, setCellSize };
  })();

  // register under globals
  try {
    root.MinigameModules = root.MinigameModules || {};
    root.MinigameModules.chainReaction = ChainReactionMinigame;
    root.MiniGames = root.MiniGames || {};
    root.MiniGames.chainReaction = ChainReactionMinigame;
    root.MiniGameModules = root.MiniGameModules || {};
    root.MiniGameModules.chainReaction = ChainReactionMinigame;
    root.chainReaction = ChainReactionMinigame;
    root.ChainReactionMinigame = ChainReactionMinigame;
    root.game = root.game || {};
    root.game.MinigameModules = root.game.MinigameModules || {};
    root.game.MinigameModules.chainReaction = ChainReactionMinigame;
  } catch (_e) {
    // Silently fail in restricted environments
  }

  // CommonJS export for Node.js test environments
  /* eslint-disable no-undef */
  try { 
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = ChainReactionMinigame; 
    }
  } catch (_e) {
    // Silently fail if CommonJS not available (browser environment)
  }
  /* eslint-enable no-undef */

})(typeof window !== 'undefined' ? window : this);
