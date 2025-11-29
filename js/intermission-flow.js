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
  // Note: selectRandomGame kept for potential future use but currently unused
  // eslint-disable-next-line no-unused-vars
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
    
    // Per design spec: HOH → Tic Tac Toe, Veto → Dots and Boxes
    if (!gameType) {
      gameType = compType === 'Veto' ? 'dotsandboxes' : 'tictactoe';
    }
    
    // Store selected game type for later use
    IntermissionFlow.selectedGameType = gameType;
    
    // Use new IntermissionCard module if available (renders in TV)
    if (global.IntermissionCard && typeof global.IntermissionCard.showInTv === 'function') {
      console.info('[IntermissionFlow] Using IntermissionCard.showInTv (in-TV rendering)');
      global.IntermissionCard.showInTv({
        compType,
        gameType,
        onYes,
        onNo
      });
      return;
    }
    
    // Fallback: original panel-based rendering
    console.warn('[IntermissionFlow] IntermissionCard not available, using fallback panel rendering');
    
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

    // Title - unified text per design spec
    const title = document.createElement('div');
    title.className = 'intermission-offer-title';
    title.textContent = 'You cannot compete';
    card.appendChild(title);

    // Message - dynamic based on compType per design spec
    const message = document.createElement('div');
    message.className = 'intermission-offer-message';
    const messageText = compType === 'Veto'
      ? 'Play Dots and Boxes while you wait?'
      : 'Play Tic Tac Toe while you wait?';
    message.textContent = messageText;
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
    
    // Use new IntermissionOverlay if available (full-screen rendering)
    if (global.IntermissionOverlay && typeof global.IntermissionOverlay.show === 'function') {
      console.info('[IntermissionFlow] Using IntermissionOverlay (full-screen rendering)');
      
      // Create full-screen overlay
      const overlayController = global.IntermissionOverlay.show();
      const gameContainer = overlayController.getContentMount();

      // Initialize appropriate game
      if (gameType === 'dotsandboxes') {
        if (global.DotsAndBoxesIntermission) {
          console.info('[IntermissionFlow] Launching Dots and Boxes in overlay');
          global.DotsAndBoxesIntermission.init(gameContainer, (result) => {
            // Show result modal (keep overlay open)
            showResultModal(result, onComplete, overlayController);
          });
        } else {
          console.error('[IntermissionFlow] DotsAndBoxesIntermission module not loaded');
          overlayController.close();
          if (onComplete) onComplete();
        }
      } else {
        // Default to Tic Tac Toe
        if (global.TicTacToeIntermission) {
          console.info('[IntermissionFlow] Launching Tic Tac Toe in overlay');
          global.TicTacToeIntermission.init(gameContainer, (result) => {
            // Show result modal (keep overlay open)
            showResultModal(result, onComplete, overlayController);
          });
        } else {
          console.error('[IntermissionFlow] TicTacToeIntermission module not loaded');
          overlayController.close();
          if (onComplete) onComplete();
        }
      }
      
      return;
    }
    
    // Fallback: original panel-based rendering
    console.warn('[IntermissionFlow] IntermissionOverlay not available, using fallback panel rendering');
    
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
   * @param {Object} overlayController - Optional overlay controller from IntermissionOverlay
   */
  function showResultModal(result, onContinue, overlayController) {
    // Create modal overlay (on top of game overlay if using new system)
    const overlay = document.createElement('div');
    overlay.className = 'intermission-result-overlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 10001;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: fadeIn 0.3s ease-out;
    `;

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'intermission-result-modal';
    modal.style.cssText = `
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.98), rgba(51, 65, 85, 0.98));
      border: 2px solid rgba(96, 165, 250, 0.6);
      border-radius: 20px;
      padding: 32px;
      max-width: 400px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
      text-align: center;
      animation: slideIn 0.3s ease-out;
    `;

    // Title
    const title = document.createElement('div');
    title.className = `intermission-result-title ${result}`;
    if (result === 'human') {
      title.textContent = 'You Win!';
      title.style.color = '#10b981';
    } else if (result === 'ai') {
      title.textContent = 'You Lose';
      title.style.color = '#ef4444';
    } else {
      title.textContent = 'Draw!';
      title.style.color = '#f59e0b';
    }
    title.style.cssText += `
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 16px;
      text-shadow: 0 2px 12px currentColor;
    `;
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
    message.style.cssText = `
      font-size: 1.1rem;
      color: rgba(255, 255, 255, 0.9);
      margin-bottom: 24px;
      line-height: 1.6;
    `;
    modal.appendChild(message);

    // Buttons container
    const buttons = document.createElement('div');
    buttons.className = 'intermission-result-buttons';
    buttons.style.cssText = `
      display: flex;
      gap: 12px;
      justify-content: center;
    `;

    // Replay button
    const replayBtn = document.createElement('button');
    replayBtn.className = 'intermission-result-button replay';
    replayBtn.textContent = 'Replay';
    replayBtn.style.cssText = `
      flex: 1;
      padding: 12px 24px;
      font-size: 1rem;
      font-weight: 600;
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      border: 2px solid #60a5fa;
      border-radius: 8px;
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    `;
    replayBtn.addEventListener('click', () => {
      // Remove result modal
      document.body.removeChild(overlay);
      
      // Cleanup previous game instance (both types)
      if (global.TicTacToeIntermission) {
        global.TicTacToeIntermission.cleanup();
      }
      if (global.DotsAndBoxesIntermission) {
        global.DotsAndBoxesIntermission.cleanup();
      }
      
      // Relaunch game in same overlay
      launchGame(onContinue);
    });
    replayBtn.addEventListener('mouseenter', () => {
      replayBtn.style.transform = 'translateY(-2px)';
      replayBtn.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
    });
    replayBtn.addEventListener('mouseleave', () => {
      replayBtn.style.transform = 'translateY(0)';
      replayBtn.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
    });
    buttons.appendChild(replayBtn);

    // Continue button
    const continueBtn = document.createElement('button');
    continueBtn.className = 'intermission-result-button continue';
    continueBtn.textContent = 'Continue';
    continueBtn.style.cssText = `
      flex: 1;
      padding: 12px 24px;
      font-size: 1rem;
      font-weight: 600;
      background: linear-gradient(135deg, #10b981, #059669);
      border: 2px solid #34d399;
      border-radius: 8px;
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    `;
    continueBtn.addEventListener('click', () => {
      // Remove result modal
      document.body.removeChild(overlay);
      
      // Close the game overlay if using new system
      if (overlayController && typeof overlayController.close === 'function') {
        overlayController.close();
      }
      
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
    continueBtn.addEventListener('mouseenter', () => {
      continueBtn.style.transform = 'translateY(-2px)';
      continueBtn.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
    });
    continueBtn.addEventListener('mouseleave', () => {
      continueBtn.style.transform = 'translateY(0)';
      continueBtn.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
    });
    buttons.appendChild(continueBtn);

    modal.appendChild(buttons);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  /**
   * Force cleanup of intermission UI elements
   * Idempotent - safe to call multiple times
   * @param {string} reason - Reason for cleanup (for logging)
   */
  function forceCleanup(reason) {
    console.info(`[IntermissionFlow] forceCleanup reason=${reason}`);
    
    // Remove intermission card from TV
    if (global.IntermissionCard && typeof global.IntermissionCard.removeActive === 'function') {
      global.IntermissionCard.removeActive();
    }
    
    // Close any active intermission overlay/game
    if (global.IntermissionOverlay && typeof global.IntermissionOverlay.close === 'function') {
      global.IntermissionOverlay.close();
    }
    
    // Clear intermission active flag
    if (global.game) {
      global.game.__intermissionActive = false;
    }
    
    console.info('[IntermissionFlow] Cleanup complete');
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

    // Set intermission active flag
    if (global.game) {
      global.game.__intermissionActive = true;
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
        // User chose to play - suspend timer
        console.info('[IntermissionFlow] User chose to play, suspending phase timer');
        
        // Emit timer suspend event
        if (global.game?.bus) {
          global.game.bus.emit('phase:timer:suspend', { reason: 'intermission' });
        }
        
        // Launch game
        launchGame(() => {
          // Game completed or user clicked Continue
          console.info('[IntermissionFlow] Intermission complete, skipping to results');
          
          // Emit skip-to-results event
          if (global.game?.bus) {
            global.game.bus.emit('phase:timer:skip-to-results', { 
              reason: 'intermission', 
              compType 
            });
          }
          
          // Call original onComplete if needed
          if (onComplete) onComplete();
        });
      },
      onNo: () => {
        // User chose to skip - jump directly to results
        console.info('[IntermissionFlow] User chose to skip, jumping to results');
        
        // Emit skip-to-results event immediately
        if (global.game?.bus) {
          global.game.bus.emit('phase:timer:skip-to-results', { 
            reason: 'intermission_skip', 
            compType 
          });
        }
        
        // Call onComplete
        if (onComplete) onComplete();
      }
    });
  }

  // Export to global namespace
  global.IntermissionFlow = {
    start,
    showOfferCard,
    launchGame,
    showResultModal,
    forceCleanup
  };

  // ═══ Phase Change Event Listeners ═══
  // Listen for phase changes and cleanup intermission UI when leaving competition phases
  if (typeof document !== 'undefined' && document.addEventListener) {
    // Listen for bb:phase:changed custom event (dispatched by ui.hud-and-router.js)
    document.addEventListener('bb:phase:changed', function(event) {
      const newPhase = event.detail?.phase;
      const oldPhase = event.detail?.oldPhase;
      
      // Cleanup if transitioning away from HOH or veto phases
      if ((oldPhase === 'hoh' || oldPhase === 'veto_competition') && 
          newPhase !== 'hoh' && newPhase !== 'veto_competition') {
        console.info(`[IntermissionFlow] Phase changed from ${oldPhase} to ${newPhase}, cleaning up`);
        forceCleanup('phase_change');
      }
    });
    
    console.info('[IntermissionFlow] ✓ Event listeners registered');
  }

  // Listen for competition results shown (if event bus is available)
  if (global.game?.bus && typeof global.game.bus.on === 'function') {
    global.game.bus.on('competition:results:shown', function() {
      console.info('[IntermissionFlow] Competition results shown, cleaning up');
      forceCleanup('competition_results_shown');
    });
  }

})(window);
