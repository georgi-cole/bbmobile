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
    
    // Clear any existing content in overlay and update positioning
    if (overlay) {
      overlay.innerHTML = '';
      overlay.style.pointerEvents = 'none'; // Overlay itself doesn't block
      // Update to center positioning (in case overlay was created with old settings)
      overlay.style.justifyContent = 'center';
      overlay.style.padding = '20px';
    }

    // Create card container - sized to fit TV overlay without scroll
    const cardContainer = document.createElement('div');
    cardContainer.className = 'intermission-card-container game-modal';
    cardContainer.style.cssText = `
      pointer-events: auto;
      padding: 0 8px;
      max-width: clamp(260px, 86vw, 360px);
      width: 100%;
      max-height: 90%;
      overflow: hidden;
      animation: slideUpFade 0.4s ease-out;
    `;

    // Create card - compact styling for TV overlay using TV inline card standards
    const card = document.createElement('div');
    card.className = 'intermission-offer-card in-tv tv-inline-card';
    card.style.cssText = `
      background: rgba(30, 41, 59, 0.75);
      border: none;
      outline: none;
      border-radius: 12px;
      padding: 16px;
      max-width: min(780px, 92%);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    `;

    // Title - unified text for both competition types
    const title = document.createElement('div');
    title.className = 'intermission-offer-title';
    title.textContent = 'You cannot compete';
    title.style.cssText = `
      font-size: 1.2rem;
      font-weight: 700;
      color: #60a5fa;
      text-align: center;
      margin-bottom: 10px;
      text-shadow: 0 2px 8px rgba(96, 165, 250, 0.4);
    `;
    card.appendChild(title);

    // Message - dynamic based on compType per spec
    const message = document.createElement('div');
    message.className = 'intermission-offer-message';
    // HOH → Tic Tac Toe, Veto → Dots and Boxes (per design spec)
    const messageText = compType === 'Veto'
      ? 'Play Dots and Boxes while you wait?'
      : 'Play Tic Tac Toe while you wait?';
    message.textContent = messageText;
    message.style.cssText = `
      font-size: 0.95rem;
      color: rgba(255, 255, 255, 0.9);
      text-align: center;
      line-height: 1.5;
      margin-bottom: 14px;
    `;
    card.appendChild(message);

    // Buttons container - use CSS classes from buttons.css
    const buttons = document.createElement('div');
    buttons.className = 'intermission-offer-buttons action-row';

    // Yes button - use consistent button CSS
    const yesBtn = document.createElement('button');
    yesBtn.className = 'intermission-offer-button yes btn btn-primary';
    const yesLabel = document.createElement('span');
    yesLabel.className = 'btn-label';
    yesLabel.textContent = 'Yes';
    yesBtn.appendChild(yesLabel);
    yesBtn.addEventListener('click', () => {
      if (onYes) onYes();
      removeCard();
    });
    buttons.appendChild(yesBtn);

    // No button - use consistent button CSS and emit clock fast-forward event
    const noBtn = document.createElement('button');
    noBtn.className = 'intermission-offer-button no btn btn-secondary';
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
    cardContainer.appendChild(card);
    
    if (overlay) {
      overlay.appendChild(cardContainer);
    } else {
      // Fallback: append to TV container directly
      tvContainer.appendChild(cardContainer);
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

    // Store reference for removal
    cardContainer._overlay = overlay;

    /**
     * Remove the card from the TV
     */
    function removeCard() {
      // Null-safe: check if cardContainer is still in DOM
      if (!cardContainer || !cardContainer.parentNode) {
        console.info('[IntermissionCard] Card already removed, skipping');
        return;
      }

      cardContainer.style.animation = 'slideDownFade 0.3s ease-in';
      cardContainer.style.animationFillMode = 'forwards';
      
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
        if (cardContainer) {
          cardContainer.remove();
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

    cardContainer.remove = removeCard;
    
    console.info('[IntermissionCard] ✓ Card shown in TV overlay');
    return cardContainer;
  }

  /**
   * Remove any active intermission cards
   * Idempotent - safe to call multiple times
   */
  function removeActive() {
    const overlays = document.querySelectorAll('.tv-intermission-overlay');
    let removedCount = 0;
    
    overlays.forEach(overlay => {
      const cards = overlay.querySelectorAll('.intermission-card-container');
      cards.forEach(card => {
        // Null-safe removal using modern remove() method
        if (card) {
          try {
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
