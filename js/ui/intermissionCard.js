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
    const { compType, gameType, onYes, onNo } = options;

    // Get TV container using shared utility
    const tvContainer = global.TvContainer?.getTvContainer() || document.getElementById('panel');
    
    // Ensure container is positioned for absolute children
    global.TvContainer?.ensurePositioned(tvContainer);
    
    // Get or create overlay mount inside TV
    const overlay = global.TvContainer?.getOrCreateTvOverlay(tvContainer, 'tv-intermission-overlay');
    
    // Clear any existing content in overlay
    if (overlay) {
      overlay.innerHTML = '';
      overlay.style.pointerEvents = 'none'; // Overlay itself doesn't block
    }

    // Create card container
    const cardContainer = document.createElement('div');
    cardContainer.className = 'intermission-card-container';
    cardContainer.style.cssText = `
      pointer-events: auto;
      margin-bottom: 24px;
      padding: 0 16px;
      max-width: 500px;
      width: 100%;
      animation: slideUpFade 0.4s ease-out;
    `;

    // Create card
    const card = document.createElement('div');
    card.className = 'intermission-offer-card in-tv';
    card.style.cssText = `
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(51, 65, 85, 0.95));
      border: 2px solid rgba(96, 165, 250, 0.5);
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(12px);
    `;

    // Title
    const title = document.createElement('div');
    title.className = 'intermission-offer-title';
    title.textContent = `${compType} Competition In Progress`;
    title.style.cssText = `
      font-size: 1.4rem;
      font-weight: 700;
      color: #60a5fa;
      text-align: center;
      margin-bottom: 16px;
      text-shadow: 0 2px 8px rgba(96, 165, 250, 0.4);
    `;
    card.appendChild(title);

    // Message
    const message = document.createElement('div');
    message.className = 'intermission-offer-message';
    const gameName = gameType === 'tictactoe' ? 'Tic Tac Toe' : 
                     gameType === 'dotsandboxes' ? 'Dots and Boxes' : 
                     'a quick game';
    message.textContent = `The ${compType} competition is ongoing. Would you like to play ${gameName} while you wait?`;
    message.style.cssText = `
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.9);
      text-align: center;
      line-height: 1.6;
      margin-bottom: 24px;
    `;
    card.appendChild(message);

    // Buttons container
    const buttons = document.createElement('div');
    buttons.className = 'intermission-offer-buttons';
    buttons.style.cssText = `
      display: flex;
      gap: 12px;
      justify-content: center;
    `;

    // Yes button
    const yesBtn = document.createElement('button');
    yesBtn.className = 'intermission-offer-button yes';
    yesBtn.textContent = 'Yes';
    yesBtn.style.cssText = `
      flex: 1;
      max-width: 150px;
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
    yesBtn.addEventListener('click', () => {
      if (onYes) onYes();
      removeCard();
    });
    yesBtn.addEventListener('mouseenter', () => {
      yesBtn.style.background = 'linear-gradient(135deg, #34d399, #10b981)';
      yesBtn.style.transform = 'translateY(-2px)';
      yesBtn.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
    });
    yesBtn.addEventListener('mouseleave', () => {
      yesBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      yesBtn.style.transform = 'translateY(0)';
      yesBtn.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
    });
    buttons.appendChild(yesBtn);

    // No button
    const noBtn = document.createElement('button');
    noBtn.className = 'intermission-offer-button no';
    noBtn.textContent = 'No';
    noBtn.style.cssText = `
      flex: 1;
      max-width: 150px;
      padding: 12px 24px;
      font-size: 1rem;
      font-weight: 600;
      background: linear-gradient(135deg, #6b7280, #4b5563);
      border: 2px solid #9ca3af;
      border-radius: 8px;
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(75, 85, 99, 0.3);
    `;
    noBtn.addEventListener('click', () => {
      if (onNo) onNo();
      removeCard();
    });
    noBtn.addEventListener('mouseenter', () => {
      noBtn.style.background = 'linear-gradient(135deg, #9ca3af, #6b7280)';
      noBtn.style.transform = 'translateY(-2px)';
      noBtn.style.boxShadow = '0 6px 16px rgba(75, 85, 99, 0.4)';
    });
    noBtn.addEventListener('mouseleave', () => {
      noBtn.style.background = 'linear-gradient(135deg, #6b7280, #4b5563)';
      noBtn.style.transform = 'translateY(0)';
      noBtn.style.boxShadow = '0 4px 12px rgba(75, 85, 99, 0.3)';
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
        if (cardContainer.parentNode) {
          cardContainer.parentNode.removeChild(cardContainer);
        }
        
        // Clean up empty overlay
        if (overlay && overlay.childElementCount === 0) {
          overlay.style.pointerEvents = 'none';
        }
      }, 300);
    }

    cardContainer.remove = removeCard;
    
    console.info('[IntermissionCard] ✓ Card shown in TV overlay');
    return cardContainer;
  }

  /**
   * Remove any active intermission cards
   */
  function removeActive() {
    const overlays = document.querySelectorAll('.tv-intermission-overlay');
    overlays.forEach(overlay => {
      const cards = overlay.querySelectorAll('.intermission-card-container');
      cards.forEach(card => {
        if (card.parentNode) {
          card.parentNode.removeChild(card);
        }
      });
      overlay.style.pointerEvents = 'none';
    });
    console.info('[IntermissionCard] ✓ Removed active cards');
  }

  // Export to global namespace
  global.IntermissionCard = {
    showInTv,
    removeActive
  };

})(window);
