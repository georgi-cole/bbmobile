// MODULE: minigames/tictactoe-intermission.js
// Self-contained Tic Tac Toe game for intermission when player is ineligible for competitions
// Does NOT affect main game stats, XP, or affinity - purely for entertainment

(function(global) {
  'use strict';

  const TicTacToeIntermission = {
    gameState: null,
    container: null,
    onComplete: null
  };

  /**
   * Initialize a new Tic Tac Toe game
   * @param {HTMLElement} container - Container element to render game in
   * @param {Function} onComplete - Callback when game finishes (winner: 'human'|'ai'|'draw')
   */
  function init(container, onComplete) {
    TicTacToeIntermission.container = container;
    TicTacToeIntermission.onComplete = onComplete;
    
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

    // Game title
    const title = document.createElement('div');
    title.className = 'tictactoe-title';
    title.textContent = 'Tic Tac Toe';
    container.appendChild(title);

    // Instructions
    const instructions = document.createElement('div');
    instructions.className = 'tictactoe-instructions';
    instructions.textContent = 'You are X. Click a square to make your move.';
    container.appendChild(instructions);

    // Game board
    const board = document.createElement('div');
    board.className = 'tictactoe-board';
    
    const state = TicTacToeIntermission.gameState;
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('button');
      cell.className = 'tictactoe-cell';
      cell.dataset.index = i;
      cell.textContent = state.board[i] || '';
      
      if (state.board[i]) {
        cell.classList.add('filled');
        cell.classList.add(state.board[i] === 'X' ? 'human' : 'ai');
        cell.disabled = true;
      } else if (state.gameOver) {
        cell.disabled = true;
      } else {
        cell.addEventListener('click', () => handleCellClick(i));
      }
      
      board.appendChild(cell);
    }
    
    container.appendChild(board);

    // Status message
    const status = document.createElement('div');
    status.className = 'tictactoe-status';
    if (state.gameOver) {
      if (state.winner === 'draw') {
        status.textContent = 'Game Over: Draw!';
      } else if (state.winner === 'X') {
        status.textContent = 'You Win!';
      } else {
        status.textContent = 'AI Wins!';
      }
    } else {
      status.textContent = state.currentPlayer === 'X' ? 'Your turn' : 'AI is thinking...';
    }
    container.appendChild(status);
  }

  /**
   * Handle cell click
   */
  function handleCellClick(index) {
    const state = TicTacToeIntermission.gameState;
    
    // Ignore if game is over or cell is filled
    if (state.gameOver || state.board[index]) return;
    
    // Human move
    state.board[index] = 'X';
    state.currentPlayer = 'O';
    render();
    
    // Check for winner
    if (checkWinner()) {
      finishGame();
      return;
    }
    
    // AI move after short delay
    setTimeout(() => {
      makeAIMove();
      render();
      
      // Check for winner
      if (checkWinner()) {
        finishGame();
      }
    }, 500);
  }

  /**
   * Make AI move (simple strategy)
   */
  function makeAIMove() {
    const state = TicTacToeIntermission.gameState;
    
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
    TicTacToeIntermission.gameState = null;
    TicTacToeIntermission.container = null;
    TicTacToeIntermission.onComplete = null;
  }

  // Export to global namespace
  global.TicTacToeIntermission = {
    init,
    cleanup
  };

})(window);
