// MODULE: intermission-flow.js
// Manages the intermission game offer and result flow when player is ineligible for competitions
// Handles: offer card → game launch → result modal → continue to competition result

(function(global) {
  'use strict';

  const IntermissionFlow = {};

  /**
   * Randomly select a game to offer
   * @returns {string} 'tictactoe' or 'dotsandboxes'
   */
  function selectRandomGame() {
    const games = ['tictactoe', 'dotsandboxes'];
    return games[Math.floor(Math.random() * games.length)];
  }

  /**
   * Show intermission offer card
   * @param {Object} options
   * @param {string} options.compType - 'HOH' or 'Veto'
   * @param {string} options.gameType - 'tictactoe' or 'dotsandboxes' (optional, randomly selected if not provided)
   * @param {Function} options.onYes - Callback when user chooses to play
   * @param {Function} options.onNo - Callback when user chooses to skip
   */
  function showOfferCard(options) {
    const { compType, onYes, onNo } = options;
    let { gameType } = options;
    
    // Randomly select game if not specified
    if (!gameType) {
      gameType = selectRandomGame();
    }
    
    // Store selected game type for later use
    IntermissionFlow.selectedGameType = gameType;
    
    // Get panel container
    const panel = document.getElementById('panel');
    if (!panel) {
      console.error('[IntermissionFlow] Panel container not found');
      return;
    }

    panel.innerHTML = '';

    // Create offer card
    const card = document.createElement('div');
    card.className = 'intermission-offer-card';

    // Title
    const title = document.createElement('div');
    title.className = 'intermission-offer-title';
    title.textContent = `${compType} Competition In Progress`;
    card.appendChild(title);

    // Message
    const message = document.createElement('div');
    message.className = 'intermission-offer-message';
    const gameName = gameType === 'tictactoe' ? 'Tic Tac Toe' : 'Dots and Boxes';
    message.textContent = `The ${compType} competition is ongoing. Would you like to play some ${gameName} while you wait?`;
    card.appendChild(message);

    // Buttons container
    const buttons = document.createElement('div');
    buttons.className = 'intermission-offer-buttons';

    // Yes button
    const yesBtn = document.createElement('button');
    yesBtn.className = 'intermission-offer-button yes';
    yesBtn.textContent = 'Yes';
    yesBtn.addEventListener('click', () => {
      if (onYes) onYes();
    });
    buttons.appendChild(yesBtn);

    // No button
    const noBtn = document.createElement('button');
    noBtn.className = 'intermission-offer-button no';
    noBtn.textContent = 'No';
    noBtn.addEventListener('click', () => {
      if (onNo) onNo();
    });
    buttons.appendChild(noBtn);

    card.appendChild(buttons);
    panel.appendChild(card);
  }

  /**
   * Launch intermission game
   * @param {Function} onComplete - Callback when game finishes (result: 'human'|'ai'|'draw')
   * @param {string} gameType - 'tictactoe' or 'dotsandboxes' (optional, uses previously selected if not provided)
   */
  function launchGame(onComplete, gameType) {
    // Use previously selected game type if not specified
    if (!gameType) {
      gameType = IntermissionFlow.selectedGameType || 'tictactoe';
    }
    
    // Get panel container
    const panel = document.getElementById('panel');
    if (!panel) {
      console.error('[IntermissionFlow] Panel container not found');
      return;
    }

    panel.innerHTML = '';

    // Create game container
    const gameContainer = document.createElement('div');
    gameContainer.id = 'intermission-game-container';
    panel.appendChild(gameContainer);

    // Initialize appropriate game
    if (gameType === 'dotsandboxes') {
      if (global.DotsAndBoxesIntermission) {
        console.info('[IntermissionFlow] Launching Dots and Boxes');
        global.DotsAndBoxesIntermission.init(gameContainer, (result) => {
          // Show result modal
          showResultModal(result, onComplete);
        });
      } else {
        console.error('[IntermissionFlow] DotsAndBoxesIntermission module not loaded');
        if (onComplete) onComplete();
      }
    } else {
      // Default to Tic Tac Toe
      if (global.TicTacToeIntermission) {
        console.info('[IntermissionFlow] Launching Tic Tac Toe');
        global.TicTacToeIntermission.init(gameContainer, (result) => {
          // Show result modal
          showResultModal(result, onComplete);
        });
      } else {
        console.error('[IntermissionFlow] TicTacToeIntermission module not loaded');
        if (onComplete) onComplete();
      }
    }
  }

  /**
   * Show result modal after game finishes
   * @param {string} result - 'human'|'ai'|'draw'
   * @param {Function} onContinue - Callback to continue to competition result
   */
  function showResultModal(result, onContinue) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'intermission-result-overlay';

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'intermission-result-modal';

    // Title
    const title = document.createElement('div');
    title.className = `intermission-result-title ${result}`;
    if (result === 'human') {
      title.textContent = 'You Win!';
    } else if (result === 'ai') {
      title.textContent = 'You Lose';
    } else {
      title.textContent = 'Draw!';
    }
    modal.appendChild(title);

    // Message
    const message = document.createElement('div');
    message.className = 'intermission-result-message';
    if (result === 'human') {
      message.textContent = 'Great job! You beat the AI.';
    } else if (result === 'ai') {
      message.textContent = 'The AI won this time. Better luck next time!';
    } else {
      message.textContent = 'A well-matched game. Nobody wins!';
    }
    modal.appendChild(message);

    // Buttons container
    const buttons = document.createElement('div');
    buttons.className = 'intermission-result-buttons';

    // Replay button
    const replayBtn = document.createElement('button');
    replayBtn.className = 'intermission-result-button replay';
    replayBtn.textContent = 'Replay';
    replayBtn.addEventListener('click', () => {
      // Remove overlay and restart game
      document.body.removeChild(overlay);
      
      // Cleanup previous game instance (both types)
      if (global.TicTacToeIntermission) {
        global.TicTacToeIntermission.cleanup();
      }
      if (global.DotsAndBoxesIntermission) {
        global.DotsAndBoxesIntermission.cleanup();
      }
      
      // Launch new game (same type as before)
      launchGame(onContinue);
    });
    buttons.appendChild(replayBtn);

    // Continue button
    const continueBtn = document.createElement('button');
    continueBtn.className = 'intermission-result-button continue';
    continueBtn.textContent = 'Continue';
    continueBtn.addEventListener('click', () => {
      // Remove overlay
      document.body.removeChild(overlay);
      
      // Cleanup game (both types)
      if (global.TicTacToeIntermission) {
        global.TicTacToeIntermission.cleanup();
      }
      if (global.DotsAndBoxesIntermission) {
        global.DotsAndBoxesIntermission.cleanup();
      }
      
      // Call continue callback
      if (onContinue) onContinue();
    });
    buttons.appendChild(continueBtn);

    modal.appendChild(buttons);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  /**
   * Main entry point for intermission flow
   * @param {Object} options
   * @param {string} options.compType - 'HOH' or 'Veto'
   * @param {string} options.reason - Reason for ineligibility ('previous_hoh'|'evicted'|'not_selected')
   * @param {Function} options.onComplete - Callback when flow completes (user finished or skipped)
   */
  function start(options) {
    const { compType, reason, onComplete } = options;
    
    // Check if feature is enabled
    const cfg = global.game?.cfg || global.cfg || {};
    if (!cfg.enableIntermissionGames) {
      console.info('[IntermissionFlow] Intermission games disabled, skipping offer');
      if (onComplete) onComplete();
      return;
    }

    // Set status bar message based on reason
    if (global.TvStatus?.set) {
      let statusMessage = '';
      if (reason === 'previous_hoh') {
        statusMessage = 'You are ineligible for this HOH competition (previous Head of Household).';
      } else if (reason === 'evicted') {
        statusMessage = 'You are evicted and cannot compete. Awaiting results...';
      } else if (reason === 'not_selected') {
        statusMessage = `You were not selected for this ${compType} competition.`;
      } else {
        statusMessage = `You are ineligible for this ${compType} competition.`;
      }
      global.TvStatus.set(statusMessage);
    }

    // Show offer card
    showOfferCard({
      compType,
      onYes: () => {
        // User chose to play
        launchGame(onComplete);
      },
      onNo: () => {
        // User chose to skip
        if (onComplete) onComplete();
      }
    });
  }

  // Export to global namespace
  global.IntermissionFlow = {
    start,
    showOfferCard,
    launchGame,
    showResultModal
  };

})(window);
