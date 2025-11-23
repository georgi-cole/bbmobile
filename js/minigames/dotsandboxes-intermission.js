// MODULE: minigames/dotsandboxes-intermission.js
// Self-contained Dots and Boxes game for intermission when player is ineligible for competitions
// Does NOT affect main game stats, XP, or affinity - purely for entertainment

(function(global) {
  'use strict';

  const DotsAndBoxesIntermission = {
    gameState: null,
    container: null,
    onComplete: null
  };

  // 4x4 grid (5x5 dots, 4x4 boxes)
  const GRID_SIZE = 4;

  /**
   * Initialize a new Dots and Boxes game
   * @param {HTMLElement} container - Container element to render game in
   * @param {Function} onComplete - Callback when game finishes (winner: 'human'|'ai'|'draw')
   */
  function init(container, onComplete) {
    DotsAndBoxesIntermission.container = container;
    DotsAndBoxesIntermission.onComplete = onComplete;
    
    // Initialize game state
    DotsAndBoxesIntermission.gameState = {
      // Track edges: h[row][col] for horizontal, v[row][col] for vertical
      horizontalEdges: Array(GRID_SIZE + 1).fill(null).map(() => Array(GRID_SIZE).fill(null)),
      verticalEdges: Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE + 1).fill(null)),
      // Track completed boxes
      boxes: Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)),
      currentPlayer: 'human', // 'human' or 'ai'
      scores: { human: 0, ai: 0 },
      gameOver: false,
      lastMove: null
    };

    render();
  }

  /**
   * Render the game board
   */
  function render() {
    const container = DotsAndBoxesIntermission.container;
    if (!container) return;

    container.innerHTML = '';
    container.className = 'dotsandboxes-intermission-game';

    // Game title
    const title = document.createElement('div');
    title.className = 'dotsandboxes-title';
    title.textContent = 'Dots and Boxes';
    container.appendChild(title);

    // Score display
    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'dotsandboxes-score';
    const state = DotsAndBoxesIntermission.gameState;
    scoreDiv.textContent = `You: ${state.scores.human} | AI: ${state.scores.ai}`;
    container.appendChild(scoreDiv);

    // Instructions
    const instructions = document.createElement('div');
    instructions.className = 'dotsandboxes-instructions';
    instructions.textContent = 'Click on a line to claim it. Complete boxes to score!';
    container.appendChild(instructions);

    // Game board
    const board = document.createElement('div');
    board.className = 'dotsandboxes-board';
    
    // Create grid with dots and lines
    for (let row = 0; row <= GRID_SIZE; row++) {
      for (let col = 0; col <= GRID_SIZE; col++) {
        // Create dot
        const dot = document.createElement('div');
        dot.className = 'dotsandboxes-dot';
        dot.style.gridRow = (row * 2) + 1;
        dot.style.gridColumn = (col * 2) + 1;
        board.appendChild(dot);
        
        // Create horizontal edge (if not last row)
        if (row < GRID_SIZE + 1 && col < GRID_SIZE) {
          const hEdge = document.createElement('div');
          hEdge.className = 'dotsandboxes-edge horizontal';
          hEdge.style.gridRow = (row * 2) + 1;
          hEdge.style.gridColumn = (col * 2) + 2;
          hEdge.dataset.type = 'h';
          hEdge.dataset.row = row;
          hEdge.dataset.col = col;
          
          const owner = state.horizontalEdges[row][col];
          if (owner) {
            hEdge.classList.add('claimed');
            hEdge.classList.add(owner);
          } else if (!state.gameOver && state.currentPlayer === 'human') {
            hEdge.classList.add('available');
            hEdge.addEventListener('click', () => handleEdgeClick('h', row, col));
          }
          
          board.appendChild(hEdge);
        }
        
        // Create vertical edge (if not last col)
        if (row < GRID_SIZE && col < GRID_SIZE + 1) {
          const vEdge = document.createElement('div');
          vEdge.className = 'dotsandboxes-edge vertical';
          vEdge.style.gridRow = (row * 2) + 2;
          vEdge.style.gridColumn = (col * 2) + 1;
          vEdge.dataset.type = 'v';
          vEdge.dataset.row = row;
          vEdge.dataset.col = col;
          
          const owner = state.verticalEdges[row][col];
          if (owner) {
            vEdge.classList.add('claimed');
            vEdge.classList.add(owner);
          } else if (!state.gameOver && state.currentPlayer === 'human') {
            vEdge.classList.add('available');
            vEdge.addEventListener('click', () => handleEdgeClick('v', row, col));
          }
          
          board.appendChild(vEdge);
        }
        
        // Create box (if not last row/col)
        if (row < GRID_SIZE && col < GRID_SIZE) {
          const box = document.createElement('div');
          box.className = 'dotsandboxes-box';
          box.style.gridRow = (row * 2) + 2;
          box.style.gridColumn = (col * 2) + 2;
          
          const boxOwner = state.boxes[row][col];
          if (boxOwner) {
            box.classList.add('completed');
            box.classList.add(boxOwner);
            box.textContent = boxOwner === 'human' ? '●' : '○';
          }
          
          board.appendChild(box);
        }
      }
    }
    
    container.appendChild(board);

    // Status message
    const status = document.createElement('div');
    status.className = 'dotsandboxes-status';
    if (state.gameOver) {
      if (state.scores.human > state.scores.ai) {
        status.textContent = 'Game Over: You Win!';
      } else if (state.scores.ai > state.scores.human) {
        status.textContent = 'Game Over: AI Wins!';
      } else {
        status.textContent = 'Game Over: Draw!';
      }
    } else {
      status.textContent = state.currentPlayer === 'human' ? 'Your turn' : 'AI is thinking...';
    }
    container.appendChild(status);
  }

  /**
   * Handle edge click
   */
  function handleEdgeClick(type, row, col) {
    const state = DotsAndBoxesIntermission.gameState;
    
    // Ignore if game is over or not human's turn
    if (state.gameOver || state.currentPlayer !== 'human') return;
    
    // Check if edge is already claimed
    const edges = type === 'h' ? state.horizontalEdges : state.verticalEdges;
    if (edges[row][col]) return;
    
    // Claim edge
    edges[row][col] = 'human';
    state.lastMove = { type, row, col };
    
    // Check if any boxes were completed
    const completedBoxes = checkAndCompleteBoxes('human');
    
    // If boxes completed, human gets another turn
    if (completedBoxes > 0) {
      state.currentPlayer = 'human';
    } else {
      state.currentPlayer = 'ai';
    }
    
    render();
    
    // Check for game over
    if (checkGameOver()) {
      finishGame();
      return;
    }
    
    // AI move after short delay if it's AI's turn
    if (state.currentPlayer === 'ai') {
      setTimeout(() => {
        makeAIMove();
        render();
        
        // Check for game over after AI move
        if (checkGameOver()) {
          finishGame();
        }
      }, 500);
    }
  }

  /**
   * Check and complete any boxes formed by the last move
   */
  function checkAndCompleteBoxes(player) {
    const state = DotsAndBoxesIntermission.gameState;
    let completed = 0;
    
    // Check all boxes
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        // Skip if box already completed
        if (state.boxes[row][col]) continue;
        
        // Check if all 4 edges are claimed
        const top = state.horizontalEdges[row][col];
        const bottom = state.horizontalEdges[row + 1][col];
        const left = state.verticalEdges[row][col];
        const right = state.verticalEdges[row][col + 1];
        
        if (top && bottom && left && right) {
          state.boxes[row][col] = player;
          state.scores[player]++;
          completed++;
        }
      }
    }
    
    return completed;
  }

  /**
   * Make AI move (simple greedy strategy)
   */
  function makeAIMove() {
    // Strategy 1: Complete a box if possible
    const completingMove = findCompletingMove();
    if (completingMove) {
      claimEdge(completingMove.type, completingMove.row, completingMove.col, 'ai');
      return;
    }
    
    // Strategy 2: Avoid giving opponent a box (safe moves)
    const safeMove = findSafeMove();
    if (safeMove) {
      claimEdge(safeMove.type, safeMove.row, safeMove.col, 'ai');
      return;
    }
    
    // Strategy 3: Take any available move
    const anyMove = findAnyMove();
    if (anyMove) {
      claimEdge(anyMove.type, anyMove.row, anyMove.col, 'ai');
    }
  }

  /**
   * Claim an edge for a player
   */
  function claimEdge(type, row, col, player) {
    const state = DotsAndBoxesIntermission.gameState;
    const edges = type === 'h' ? state.horizontalEdges : state.verticalEdges;
    edges[row][col] = player;
    
    // Check if any boxes were completed
    const completedBoxes = checkAndCompleteBoxes(player);
    
    // If boxes completed, player gets another turn (continue AI moves)
    if (completedBoxes > 0) {
      state.currentPlayer = 'ai';
      // Continue AI turn
      setTimeout(() => {
        if (!checkGameOver()) {
          makeAIMove();
          render();
          if (checkGameOver()) {
            finishGame();
          }
        }
      }, 500);
    } else {
      state.currentPlayer = 'human';
    }
  }

  /**
   * Find a move that completes a box
   */
  function findCompletingMove() {
    const state = DotsAndBoxesIntermission.gameState;
    
    // Check horizontal edges
    for (let row = 0; row <= GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (state.horizontalEdges[row][col]) continue;
        
        // Would claiming this edge complete a box?
        if (wouldCompleteBox('h', row, col)) {
          return { type: 'h', row, col };
        }
      }
    }
    
    // Check vertical edges
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col <= GRID_SIZE; col++) {
        if (state.verticalEdges[row][col]) continue;
        
        // Would claiming this edge complete a box?
        if (wouldCompleteBox('v', row, col)) {
          return { type: 'v', row, col };
        }
      }
    }
    
    return null;
  }

  /**
   * Find a safe move that doesn't give opponent a box
   */
  function findSafeMove() {
    const state = DotsAndBoxesIntermission.gameState;
    
    // Check horizontal edges
    for (let row = 0; row <= GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (state.horizontalEdges[row][col]) continue;
        
        // Would claiming this edge give opponent a box on next turn?
        if (!wouldGiveOpponentBox('h', row, col)) {
          return { type: 'h', row, col };
        }
      }
    }
    
    // Check vertical edges
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col <= GRID_SIZE; col++) {
        if (state.verticalEdges[row][col]) continue;
        
        // Would claiming this edge give opponent a box on next turn?
        if (!wouldGiveOpponentBox('v', row, col)) {
          return { type: 'v', row, col };
        }
      }
    }
    
    return null;
  }

  /**
   * Find any available move
   */
  function findAnyMove() {
    const state = DotsAndBoxesIntermission.gameState;
    
    // Check horizontal edges
    for (let row = 0; row <= GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (!state.horizontalEdges[row][col]) {
          return { type: 'h', row, col };
        }
      }
    }
    
    // Check vertical edges
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col <= GRID_SIZE; col++) {
        if (!state.verticalEdges[row][col]) {
          return { type: 'v', row, col };
        }
      }
    }
    
    return null;
  }

  /**
   * Check if claiming an edge would complete a box
   */
  function wouldCompleteBox(type, row, col) {
    const state = DotsAndBoxesIntermission.gameState;
    
    // Temporarily claim the edge
    const edges = type === 'h' ? state.horizontalEdges : state.verticalEdges;
    const original = edges[row][col];
    edges[row][col] = 'test';
    
    let completes = false;
    
    // Check adjacent boxes
    if (type === 'h') {
      // Check box above
      if (row > 0 && isBoxComplete(row - 1, col)) {
        completes = true;
      }
      // Check box below
      if (row < GRID_SIZE && isBoxComplete(row, col)) {
        completes = true;
      }
    } else {
      // Check box left
      if (col > 0 && isBoxComplete(row, col - 1)) {
        completes = true;
      }
      // Check box right
      if (col < GRID_SIZE && isBoxComplete(row, col)) {
        completes = true;
      }
    }
    
    // Restore original state
    edges[row][col] = original;
    
    return completes;
  }

  /**
   * Check if claiming an edge would give opponent a box
   */
  function wouldGiveOpponentBox(type, row, col) {
    const state = DotsAndBoxesIntermission.gameState;
    
    // Temporarily claim the edge
    const edges = type === 'h' ? state.horizontalEdges : state.verticalEdges;
    const original = edges[row][col];
    edges[row][col] = 'test';
    
    let givesBox = false;
    
    // Check adjacent boxes for 3 claimed edges
    if (type === 'h') {
      // Check box above
      if (row > 0 && countClaimedEdges(row - 1, col) === 3) {
        givesBox = true;
      }
      // Check box below
      if (row < GRID_SIZE && countClaimedEdges(row, col) === 3) {
        givesBox = true;
      }
    } else {
      // Check box left
      if (col > 0 && countClaimedEdges(row, col - 1) === 3) {
        givesBox = true;
      }
      // Check box right
      if (col < GRID_SIZE && countClaimedEdges(row, col) === 3) {
        givesBox = true;
      }
    }
    
    // Restore original state
    edges[row][col] = original;
    
    return givesBox;
  }

  /**
   * Check if a box is complete
   */
  function isBoxComplete(row, col) {
    const state = DotsAndBoxesIntermission.gameState;
    return state.horizontalEdges[row][col] &&
           state.horizontalEdges[row + 1][col] &&
           state.verticalEdges[row][col] &&
           state.verticalEdges[row][col + 1];
  }

  /**
   * Count claimed edges for a box
   */
  function countClaimedEdges(row, col) {
    const state = DotsAndBoxesIntermission.gameState;
    let count = 0;
    if (state.horizontalEdges[row][col]) count++;
    if (state.horizontalEdges[row + 1][col]) count++;
    if (state.verticalEdges[row][col]) count++;
    if (state.verticalEdges[row][col + 1]) count++;
    return count;
  }

  /**
   * Check if game is over
   */
  function checkGameOver() {
    const state = DotsAndBoxesIntermission.gameState;
    
    // Game is over when all boxes are completed
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (!state.boxes[row][col]) {
          return false;
        }
      }
    }
    
    state.gameOver = true;
    return true;
  }

  /**
   * Finish game and call completion callback
   */
  function finishGame() {
    const state = DotsAndBoxesIntermission.gameState;
    
    // Determine result for callback
    let result;
    if (state.scores.human > state.scores.ai) {
      result = 'human';
    } else if (state.scores.ai > state.scores.human) {
      result = 'ai';
    } else {
      result = 'draw';
    }
    
    // Call completion callback after a short delay
    setTimeout(() => {
      if (DotsAndBoxesIntermission.onComplete) {
        DotsAndBoxesIntermission.onComplete(result);
      }
    }, 800);
  }

  /**
   * Clean up game resources
   */
  function cleanup() {
    DotsAndBoxesIntermission.gameState = null;
    DotsAndBoxesIntermission.container = null;
    DotsAndBoxesIntermission.onComplete = null;
  }

  // Export to global namespace
  global.DotsAndBoxesIntermission = {
    init,
    cleanup
  };

})(window);
