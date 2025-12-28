// MODULE: ui/intermissionCard.js
// Renders intermission offer card inside the faux TV container
// Provides Yes/No choice for playing intermission games while waiting

(function(global) {
  'use strict';

  /**
   * Show intermission offer card inside TV
   * @param {Object} options
   * @param {string} options.compType - 'HOH' or 'Veto'
   * @param {string} options.gameType - 'tictactoe' or 'dotsandboxes' (optional)
   * @param {Function} options.onYes - Callback when user clicks Yes
   * @param {Function} options.onNo - Callback when user clicks No
   * @returns {HTMLElement} The card element
   */
  function showInTv(options) {
    // gameType destructured for API compatibility but unused (message based on compType per design spec)
    // eslint-disable-next-line no-unused-vars
    const { compType, gameType, onYes, onNo } = options;

    // Set intermission active flag
    if (global.game) {
      global.game.__intermissionActive = true;
    }

    // Get TV container using shared utility
    const tvContainer = global.TvContainer?.getTvContainer() || document.getElementById('panel');
    
    // Ensure container is positioned for absolute children
    global.TvContainer?.ensurePositioned(tvContainer);
    
    // Get or create overlay mount inside TV
    const overlay = global.TvContainer?.getOrCreateTvOverlay(tvContainer, 'tv-intermission-overlay');
    
    // Clear any existing content in overlay and configure as grid centering context
    if (overlay) {
      overlay.innerHTML = '';
      // Grid centering with proper padding - overlay acts as positioning context
      overlay.style.cssText = `
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        padding: 8px;
        box-sizing: border-box;
        overflow: visible;
        pointer-events: none;
        z-index: 10;
      `;
    }

    // Create card - compact styling for TV overlay using unified popup card design system
    const card = document.createElement('div');
    card.className = 'intermission-offer-card unified-card unified-card--compact in-tv tv-inline-card game-modal';

    // Title - unified text for both competition types
    const title = document.createElement('div');
    title.className = 'intermission-offer-title unified-card__header';
    title.textContent = 'You cannot compete';
    card.appendChild(title);

    // Message - dynamic based on compType per spec
    const message = document.createElement('div');
    message.className = 'intermission-offer-message unified-card__body';
    // HOH → Tic Tac Toe, Veto → Dots and Boxes (per design spec)
    const messageText = compType === 'Veto'
      ? 'Play Dots and Boxes while you wait?'
      : 'Play Tic Tac Toe while you wait?';
    message.textContent = messageText;
    card.appendChild(message);

    // Buttons container - use unified button system
    const buttons = document.createElement('div');
    buttons.className = 'intermission-offer-buttons unified-card__buttons action-row';

    // Yes button - use unified button CSS
    const yesBtn = document.createElement('button');
    yesBtn.className = 'intermission-offer-button yes unified-card-btn unified-card-btn--primary btn btn-primary';
    const yesLabel = document.createElement('span');
    yesLabel.className = 'btn-label';
    yesLabel.textContent = 'Yes';
    yesBtn.appendChild(yesLabel);
    yesBtn.addEventListener('click', () => {
      if (onYes) onYes();
      removeCard();
    });
    buttons.appendChild(yesBtn);

    // No button - use unified button CSS and emit clock fast-forward event
    const noBtn = document.createElement('button');
    noBtn.className = 'intermission-offer-button no unified-card-btn unified-card-btn--secondary btn btn-secondary';
    const noLabel = document.createElement('span');
    noLabel.className = 'btn-label';
    noLabel.textContent = 'No';
    noBtn.appendChild(noLabel);
    noBtn.addEventListener('click', () => {
      // Emit clock fast-forward event
      try {
        if (global.game && global.game.bus && global.game.bus.emit) {
          global.game.bus.emit('clock:request-fast-forward', { 
            reason: 'intermission_declined', 
            compType: compType 
          });
        }
      } catch (err) {
        console.error('[IntermissionCard] Failed to emit clock fast-forward event:', err);
      }
      
      if (onNo) onNo();
      removeCard();
    });
    buttons.appendChild(noBtn);

    card.appendChild(buttons);
    
    if (overlay) {
      overlay.appendChild(card);
    } else {
      // Fallback: append to TV container directly
      tvContainer.appendChild(card);
    }

    // Add keyframe animation if not already present
    if (!document.getElementById('intermission-card-animations')) {
      const style = document.createElement('style');
      style.id = 'intermission-card-animations';
      style.textContent = `
        @keyframes slideUpFade {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Apply animation to card
    card.style.animation = 'slideUpFade 0.4s ease-out';

    // Store reference for removal
    card._overlay = overlay;

    /**
     * Remove the card from the TV
     */
    function removeCard() {
      // Null-safe: check if card is still in DOM
      if (!card || !card.parentNode) {
        console.info('[IntermissionCard] Card already removed, skipping');
        return;
      }

      // Clear timer monitor if active
      if (card._timerMonitor) {
        clearInterval(card._timerMonitor);
        card._timerMonitor = null;
      }

      card.style.animation = 'slideDownFade 0.3s ease-in';
      card.style.animationFillMode = 'forwards';
      
      // Add fade out animation
      if (!document.getElementById('intermission-card-animations-out')) {
        const style = document.createElement('style');
        style.id = 'intermission-card-animations-out';
        style.textContent = `
          @keyframes slideDownFade {
            from {
              opacity: 1;
              transform: translateY(0);
            }
            to {
              opacity: 0;
              transform: translateY(20px);
            }
          }
        `;
        document.head.appendChild(style);
      }

      setTimeout(() => {
        // Remove using modern remove() method (null-safe)
        if (card) {
          card.remove();
        }
        
        // Clean up empty overlay
        if (overlay && overlay.childElementCount === 0) {
          overlay.style.pointerEvents = 'none';
        }
        
        // Clear intermission active flag
        if (global.game) {
          global.game.__intermissionActive = false;
        }
      }, 300);
    }

    card.remove = removeCard;

    // Set up timer monitor to auto-remove card when phase timer expires
    if (global.game?.endAt) {
      console.info('[IntermissionCard] Setting up timer monitor (endAt:', global.game.endAt, ')');
      
      // Helper to clean up the timer monitor
      function clearTimerMonitor() {
        if (card._timerMonitor) {
          clearInterval(card._timerMonitor);
          card._timerMonitor = null;
        }
      }
      
      card._timerMonitor = setInterval(() => {
        // Check if card was already removed
        if (!card.parentNode) {
          clearTimerMonitor();
          return;
        }
        
        // Check if timer has expired
        const game = global.game;
        if (game?.endAt && game.endAt <= Date.now()) {
          console.info('[IntermissionCard] Timer expired, auto-removing card');
          clearTimerMonitor();
          removeCard();
        }
      }, 500); // Check every 500ms
    } else {
      console.warn('[IntermissionCard] No game.endAt available, card will not auto-remove on timer expiration');
    }
    
    console.info('[IntermissionCard] ✓ Card shown in TV overlay');
    return card;
  }

  /**
   * Remove any active intermission cards
   * Idempotent - safe to call multiple times
   */
  function removeActive() {
    const overlays = document.querySelectorAll('.tv-intermission-overlay');
    let removedCount = 0;
    
    overlays.forEach(overlay => {
      const cards = overlay.querySelectorAll('.intermission-offer-card');
      cards.forEach(card => {
        // Null-safe removal using modern remove() method
        if (card) {
          try {
            // Clear timer monitor if present
            if (card._timerMonitor) {
              clearInterval(card._timerMonitor);
              card._timerMonitor = null;
            }
            card.remove();
            removedCount++;
          } catch (e) {
            console.warn('[IntermissionCard] Failed to remove card:', e);
          }
        }
      });
      // Reset overlay pointer events
      if (overlay) {
        overlay.style.pointerEvents = 'none';
      }
    });
    
    // Clear intermission active flag
    if (global.game) {
      global.game.__intermissionActive = false;
    }
    
    console.info(`[IntermissionCard] ✓ Removed ${removedCount} active card(s)`);
  }

  // Export to global namespace
  global.IntermissionCard = {
    showInTv,
    removeActive
  };

})(window);
