// MODULE: minigames/tictactoe-intermission.js
// Self-contained Tic Tac Toe game for intermission when player is ineligible for competitions
// Does NOT affect main game stats, XP, or affinity - purely for entertainment

(function(global) {
  'use strict';

  const TicTacToeIntermission = {
    gameState: null,
    container: null,
    onComplete: null,
    stallGuardTimer: null,
    isAiMoving: false
  };

  // Stall guard timeout (ms) - failsafe if AI move takes too long
  const STALL_GUARD_TIMEOUT = 2500;

  /**
   * Initialize a new Tic Tac Toe game
   * @param {HTMLElement} container - Container element to render game in
   * @param {Function} onComplete - Callback when game finishes (winner: 'human'|'ai'|'draw'|'cancelled')
   */
  function init(container, onComplete) {
    TicTacToeIntermission.container = container;
    TicTacToeIntermission.onComplete = onComplete;
    TicTacToeIntermission.isAiMoving = false;
    clearStallGuard();
    
    // Initialize game state
    TicTacToeIntermission.gameState = {
      board: Array(9).fill(null), // null = empty, 'X' = human, 'O' = AI
      currentPlayer: 'X', // Human always goes first
      gameOver: false,
      winner: null
    };

    render();
  }

  /**
   * Render the game board
   */
  function render() {
    const container = TicTacToeIntermission.container;
    if (!container) return;

    container.innerHTML = '';
    container.className = 'tictactoe-intermission-game';
    container.style.cssText = `
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 12px;
      gap: 10px;
      max-width: 340px;
      margin: 0 auto;
    `;

    // Exit button (top-right X)
    const exitBtn = document.createElement('button');
    exitBtn.className = 'tictactoe-exit-btn';
    exitBtn.innerHTML = '&times;';
    exitBtn.title = 'Exit game';
    exitBtn.style.cssText = `
      position: absolute;
      top: 4px;
      right: 4px;
      width: 28px;
      height: 28px;
      background: rgba(100, 100, 100, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      color: #fff;
      font-size: 1.4rem;
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      z-index: 10;
    `;
    exitBtn.addEventListener('mouseenter', () => {
      exitBtn.style.background = 'rgba(239, 68, 68, 0.8)';
    });
    exitBtn.addEventListener('mouseleave', () => {
      exitBtn.style.background = 'rgba(100, 100, 100, 0.6)';
    });
    exitBtn.addEventListener('click', handleExit);
    container.appendChild(exitBtn);

    // Game title
    const title = document.createElement('div');
    title.className = 'tictactoe-title';
    title.textContent = 'Tic Tac Toe';
    title.style.cssText = `
      font-size: 1.4rem;
      font-weight: 700;
      color: #ffffff;
      text-align: center;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
      margin-bottom: 4px;
    `;
    container.appendChild(title);

    // Instructions
    const instructions = document.createElement('div');
    instructions.className = 'tictactoe-instructions';
    instructions.textContent = 'You are X. Click a square to make your move.';
    instructions.style.cssText = `
      font-size: 0.85rem;
      color: rgba(255, 255, 255, 0.85);
      text-align: center;
      margin-bottom: 6px;
    `;
    container.appendChild(instructions);

    // Game board
    const board = document.createElement('div');
    board.className = 'tictactoe-board';
    board.style.cssText = `
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      width: 100%;
      max-width: 260px;
      aspect-ratio: 1;
      padding: 10px;
      background: rgba(10, 20, 35, 0.6);
      border: 2px solid rgba(100, 150, 200, 0.3);
      border-radius: 10px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    `;
    
    const state = TicTacToeIntermission.gameState;
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('button');
      cell.className = 'tictactoe-cell';
      cell.dataset.index = i;
      cell.textContent = state.board[i] || '';
      cell.style.cssText = `
        aspect-ratio: 1;
        background: rgba(30, 40, 60, 0.8);
        border: 2px solid rgba(100, 150, 200, 0.4);
        border-radius: 6px;
        font-size: 2rem;
        font-weight: 700;
        color: #ffffff;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      `;
      
      if (state.board[i]) {
        cell.classList.add('filled');
        cell.classList.add(state.board[i] === 'X' ? 'human' : 'ai');
        cell.disabled = true;
        cell.style.cursor = 'default';
        cell.style.opacity = '0.85';
        if (state.board[i] === 'X') {
          cell.style.color = '#4CAF50';
          cell.style.textShadow = '0 0 12px rgba(76, 175, 80, 0.8)';
        } else {
          cell.style.color = '#f44336';
          cell.style.textShadow = '0 0 12px rgba(244, 67, 54, 0.8)';
        }
      } else if (state.gameOver) {
        cell.disabled = true;
        cell.style.cursor = 'not-allowed';
      } else {
        cell.addEventListener('click', () => handleCellClick(i));
      }
      
      board.appendChild(cell);
    }
    
    container.appendChild(board);

    // Status message
    const status = document.createElement('div');
    status.className = 'tictactoe-status';
    status.style.cssText = `
      font-size: 1rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.95);
      text-align: center;
      padding: 10px 16px;
      background: rgba(10, 20, 35, 0.5);
      border: 1px solid rgba(100, 150, 200, 0.3);
      border-radius: 6px;
      min-height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    if (state.gameOver) {
      if (state.winner === 'draw') {
        status.textContent = 'Game Over: Draw!';
      } else if (state.winner === 'X') {
        status.textContent = 'You Win!';
      } else {
        status.textContent = 'Opponent Wins!';
      }
    } else {
      // Changed from "AI is thinking..." to "Thinking..." per spec
      status.textContent = state.currentPlayer === 'X' ? 'Your turn' : 'Thinking...';
    }
    container.appendChild(status);
  }

  /**
   * Handle exit button click
   */
  function handleExit() {
    // Save callback before cleanup (cleanup sets onComplete to null)
    const callback = TicTacToeIntermission.onComplete;
    clearStallGuard();
    cleanup();
    if (callback) {
      callback('cancelled');
    }
  }

  /**
   * Handle cell click
   */
  function handleCellClick(index) {
    const state = TicTacToeIntermission.gameState;
    
    // Ignore if game is over, cell is filled, or AI is moving
    if (state.gameOver || state.board[index] || TicTacToeIntermission.isAiMoving) return;
    
    // Human move
    state.board[index] = 'X';
    state.currentPlayer = 'O';
    render();
    
    // Check for winner
    if (checkWinner()) {
      finishGame();
      return;
    }
    
    // Start AI turn with stall guard
    TicTacToeIntermission.isAiMoving = true;
    startStallGuard();
    
    // AI move after short delay
    setTimeout(() => {
      if (!TicTacToeIntermission.gameState) return; // Guard against cleanup
      
      makeAIMove();
      clearStallGuard();
      TicTacToeIntermission.isAiMoving = false;
      render();
      
      // Check for winner
      if (checkWinner()) {
        finishGame();
      }
    }, 500);
  }

  /**
   * Start stall guard timer
   */
  function startStallGuard() {
    clearStallGuard();
    TicTacToeIntermission.stallGuardTimer = setTimeout(() => {
      console.warn('[TicTacToe] Stall guard triggered - forcing fallback move');
      
      if (!TicTacToeIntermission.gameState) return;
      const state = TicTacToeIntermission.gameState;
      
      // If still AI's turn and game not over, make fallback move
      if (!state.gameOver && state.currentPlayer === 'O') {
        makeFallbackMove();
        TicTacToeIntermission.isAiMoving = false;
        render();
        
        if (checkWinner()) {
          finishGame();
        }
      }
    }, STALL_GUARD_TIMEOUT);
  }

  /**
   * Clear stall guard timer
   */
  function clearStallGuard() {
    if (TicTacToeIntermission.stallGuardTimer) {
      clearTimeout(TicTacToeIntermission.stallGuardTimer);
      TicTacToeIntermission.stallGuardTimer = null;
    }
  }

  /**
   * Make fallback move - first available cell
   */
  function makeFallbackMove() {
    const state = TicTacToeIntermission.gameState;
    if (!state) return;
    
    const emptyIndex = state.board.findIndex(cell => cell === null);
    if (emptyIndex !== -1) {
      state.board[emptyIndex] = 'O';
      state.currentPlayer = 'X';
      console.info('[TicTacToe] Fallback move made at index:', emptyIndex);
    }
  }

  /**
   * Make AI move (simple strategy)
   */
  function makeAIMove() {
    const state = TicTacToeIntermission.gameState;
    if (!state) return;
    
    // Strategy 1: Win if possible
    const winMove = findWinningMove('O');
    if (winMove !== -1) {
      state.board[winMove] = 'O';
      state.currentPlayer = 'X';
      return;
    }
    
    // Strategy 2: Block human from winning
    const blockMove = findWinningMove('X');
    if (blockMove !== -1) {
      state.board[blockMove] = 'O';
      state.currentPlayer = 'X';
      return;
    }
    
    // Strategy 3: Take center if available
    if (!state.board[4]) {
      state.board[4] = 'O';
      state.currentPlayer = 'X';
      return;
    }
    
    // Strategy 4: Take a corner
    const corners = [0, 2, 6, 8];
    const availableCorners = corners.filter(i => !state.board[i]);
    if (availableCorners.length > 0) {
      const randomCorner = availableCorners[Math.floor(Math.random() * availableCorners.length)];
      state.board[randomCorner] = 'O';
      state.currentPlayer = 'X';
      return;
    }
    
    // Strategy 5: Take any available space
    const emptyIndices = state.board.map((val, idx) => val === null ? idx : -1).filter(idx => idx !== -1);
    if (emptyIndices.length > 0) {
      const randomIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
      state.board[randomIndex] = 'O';
      state.currentPlayer = 'X';
    }
  }

  /**
   * Find winning move for a player
   * @param {string} player - 'X' or 'O'
   * @returns {number} Index of winning move, or -1 if none
   */
  function findWinningMove(player) {
    const state = TicTacToeIntermission.gameState;
    if (!state) return -1;
    
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6]             // diagonals
    ];
    
    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      const cells = [state.board[a], state.board[b], state.board[c]];
      
      // Count player marks and empty cells in this pattern
      const playerCount = cells.filter(cell => cell === player).length;
      const emptyCount = cells.filter(cell => cell === null).length;
      
      // If 2 marks and 1 empty, we can win/block here
      if (playerCount === 2 && emptyCount === 1) {
        return pattern.find(i => state.board[i] === null);
      }
    }
    
    return -1;
  }

  /**
   * Check if there's a winner or draw
   * @returns {boolean} True if game is over
   */
  function checkWinner() {
    const state = TicTacToeIntermission.gameState;
    if (!state) return false;
    
    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6]             // diagonals
    ];
    
    // Check for winner
    for (const pattern of winPatterns) {
      const [a, b, c] = pattern;
      if (state.board[a] && 
          state.board[a] === state.board[b] && 
          state.board[a] === state.board[c]) {
        state.winner = state.board[a];
        state.gameOver = true;
        return true;
      }
    }
    
    // Check for draw
    if (state.board.every(cell => cell !== null)) {
      state.winner = 'draw';
      state.gameOver = true;
      return true;
    }
    
    return false;
  }

  /**
   * Finish game and call completion callback
   */
  function finishGame() {
    const state = TicTacToeIntermission.gameState;
    if (!state) return;
    
    clearStallGuard();
    
    // Determine result for callback
    let result;
    if (state.winner === 'X') {
      result = 'human';
    } else if (state.winner === 'O') {
      result = 'ai';
    } else {
      result = 'draw';
    }
    
    // Call completion callback after a short delay
    setTimeout(() => {
      if (TicTacToeIntermission.onComplete) {
        TicTacToeIntermission.onComplete(result);
      }
    }, 800);
  }

  /**
   * Clean up game resources
   */
  function cleanup() {
    clearStallGuard();
    TicTacToeIntermission.gameState = null;
    TicTacToeIntermission.container = null;
    TicTacToeIntermission.onComplete = null;
    TicTacToeIntermission.isAiMoving = false;
  }

  // Export to global namespace
  global.TicTacToeIntermission = {
    init,
    cleanup
  };

})(window);
