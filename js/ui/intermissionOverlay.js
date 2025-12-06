// MODULE: ui/intermissionOverlay.js
// Full-screen overlay for intermission minigames
// Provides dimmed backdrop and centered content area with scroll lock

(function(global) {
  'use strict';

  let activeOverlay = null;
  let previousBodyOverflow = null;
  let previousBodyHeight = null;
  let _listenersAttached = false;
  let closeBtn = null;
  let continueBtn = null;
  let _isShown = false;

  /**
   * Create and show full-screen intermission overlay
   * @param {Object} options
   * @param {Function} options.onClose - Optional callback when overlay is closed
   * @param {boolean} options.waitingForOpponent - If true, shows thinking indicator
   * @returns {Object} Overlay controller with mount/close methods
   */
  function show(options = {}) {
    const { onClose, waitingForOpponent } = options;

    // Close any existing overlay first
    if (activeOverlay) {
      close();
    }

    // Create overlay container
    const overlay = document.createElement('div');
    overlay.className = 'intermission-fullscreen-overlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 10000;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      overflow-y: auto;
      animation: fadeIn 0.3s ease-out;
    `;

    // Create content container (where minigame will be mounted)
    const content = document.createElement('div');
    content.className = 'intermission-overlay-content';
    content.style.cssText = `
      width: 100%;
      max-width: 600px;
      max-height: 100%;
      display: flex;
      flex-direction: column;
      position: relative;
      animation: slideIn 0.3s ease-out;
    `;

    // Add close button (X) at top-right
    closeBtn = document.createElement('button');
    closeBtn.className = 'intermission-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.title = 'Close';
    closeBtn.style.cssText = `
      position: absolute;
      top: -10px;
      right: -10px;
      width: 32px;
      height: 32px;
      background: rgba(100, 100, 100, 0.8);
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      color: #fff;
      font-size: 1.5rem;
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      z-index: 10001;
      pointer-events: auto;
    `;
    closeBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      // Always attempt to close immediately - don't rely on other subsystems
      close();
    });
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'rgba(239, 68, 68, 0.9)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'rgba(100, 100, 100, 0.8)';
    });
    content.appendChild(closeBtn);

    // Add thinking indicator (hidden by default)
    const thinkingIndicator = document.createElement('div');
    thinkingIndicator.className = 'thinking-indicator';
    thinkingIndicator.textContent = 'Thinking...';
    thinkingIndicator.style.cssText = `
      position: absolute;
      bottom: 10px;
      left: 50%;
      transform: translateX(-50%);
      padding: 8px 16px;
      background: rgba(30, 40, 60, 0.9);
      border: 1px solid rgba(100, 150, 200, 0.4);
      border-radius: 6px;
      color: rgba(255, 255, 255, 0.9);
      font-size: 0.9rem;
      z-index: 10001;
      display: ${waitingForOpponent ? 'block' : 'none'};
    `;
    content.appendChild(thinkingIndicator);

    // Add continue button (bottom center, initially hidden)
    continueBtn = document.createElement('button');
    continueBtn.className = 'intermission-continue';
    continueBtn.textContent = waitingForOpponent ? 'Thinking...' : 'Continue';
    continueBtn.disabled = !!waitingForOpponent;
    continueBtn.style.cssText = `
      position: absolute;
      bottom: 10px;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 24px;
      font-size: 1rem;
      font-weight: 600;
      background: ${waitingForOpponent ? 'rgba(100, 100, 100, 0.5)' : 'linear-gradient(135deg, #10b981, #059669)'};
      border: 2px solid ${waitingForOpponent ? 'rgba(150, 150, 150, 0.3)' : '#34d399'};
      border-radius: 8px;
      color: ${waitingForOpponent ? 'rgba(255, 255, 255, 0.5)' : '#fff'};
      cursor: ${waitingForOpponent ? 'not-allowed' : 'pointer'};
      transition: all 0.2s ease;
      z-index: 10001;
      display: none;
    `;
    continueBtn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (continueBtn.disabled) {
        return;
      }
      close();
    });
    if (!waitingForOpponent) {
      continueBtn.addEventListener('mouseenter', () => {
        continueBtn.style.transform = 'translateX(-50%) translateY(-2px)';
        continueBtn.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
      });
      continueBtn.addEventListener('mouseleave', () => {
        continueBtn.style.transform = 'translateX(-50%) translateY(0)';
        continueBtn.style.boxShadow = 'none';
      });
    }
    content.appendChild(continueBtn);

    overlay.appendChild(content);

    // Add animations if not already present
    if (!document.getElementById('intermission-overlay-animations')) {
      const style = document.createElement('style');
      style.id = 'intermission-overlay-animations';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes slideOut {
          from {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          to {
            opacity: 0;
            transform: scale(0.95) translateY(20px);
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Lock body scroll
    previousBodyOverflow = document.body.style.overflow;
    previousBodyHeight = document.body.style.height;
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';

    // Append to body
    document.body.appendChild(overlay);
    activeOverlay = overlay;
    _isShown = true;

    // Attach bus listeners if not already attached
    if (!_listenersAttached) {
      attachBusListeners();
    }

    console.info('[IntermissionOverlay] ✓ Full-screen overlay shown');

    // Return controller
    return {
      /**
       * Get the content mount point for the minigame
       * @returns {HTMLElement}
       */
      getContentMount() {
        return content;
      },

      /**
       * Close the overlay with animation
       */
      close() {
        close(onClose);
      },

      /**
       * Force close immediately without animation
       */
      forceCloseNow() {
        forceCloseNow();
      },

      /**
       * Check if overlay is currently active
       * @returns {boolean}
       */
      isActive() {
        return activeOverlay === overlay && overlay.parentNode === document.body;
      }
    };
  }

  /**
   * Attach event bus listeners for minigame completion
   */
  function attachBusListeners() {
    if (_listenersAttached) return;
    _listenersAttached = true;

    try {
      if (window.game && window.game.bus && typeof window.game.bus.on === 'function') {
        // Listen for minigame completion events
        window.game.bus.on('minigame:complete', onMinigameComplete);
        // Also accept older/alternate name for backward compatibility
        window.game.bus.on('minigame:finished', onMinigameComplete);
        console.info('[IntermissionOverlay] ✓ Bus listeners attached');
      }
    } catch (err) {
      console.warn('[IntermissionOverlay] Could not attach bus listeners', err);
    }
  }

  /**
   * Handle minigame completion event
   * @param {Object} detail - Event detail with game result
   */
  function onMinigameComplete(detail) {
    console.info('[IntermissionOverlay] Minigame complete event received', detail);
    
    // Update continue button
    if (continueBtn) {
      continueBtn.disabled = false;
      continueBtn.textContent = 'Continue';
      continueBtn.classList.remove('disabled');
      continueBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      continueBtn.style.border = '2px solid #34d399';
      continueBtn.style.color = '#fff';
      continueBtn.style.cursor = 'pointer';
    }

    // Hide thinking indicator
    if (activeOverlay) {
      const thinking = activeOverlay.querySelector('.thinking-indicator');
      if (thinking) {
        thinking.style.display = 'none';
      }
    }

    // If overlay is currently shown, auto-close after a brief delay
    if (_isShown && activeOverlay) {
      setTimeout(() => {
        try {
          close();
        } catch (err) {
          console.error('[IntermissionOverlay] Error while auto-closing', err);
        }
      }, 250);
    }
  }

  /**
   * Close the active overlay
   * @param {Function} callback - Optional callback when closed
   */
  function close(callback) {
    if (!activeOverlay) {
      console.warn('[IntermissionOverlay] No active overlay to close');
      return;
    }

    // Mark as not shown first to avoid re-entrancy loops
    _isShown = false;

    const overlay = activeOverlay;
    const content = overlay.querySelector('.intermission-overlay-content');

    // Animate out
    overlay.style.animation = 'fadeOut 0.3s ease-in';
    overlay.style.animationFillMode = 'forwards';
    
    if (content) {
      content.style.animation = 'slideOut 0.3s ease-in';
      content.style.animationFillMode = 'forwards';
    }

    setTimeout(() => {
      // Remove from DOM
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }

      // Restore body scroll
      if (previousBodyOverflow !== null) {
        document.body.style.overflow = previousBodyOverflow;
        previousBodyOverflow = null;
      }
      if (previousBodyHeight !== null) {
        document.body.style.height = previousBodyHeight;
        previousBodyHeight = null;
      }

      activeOverlay = null;
      closeBtn = null;
      continueBtn = null;
      
      console.info('[IntermissionOverlay] ✓ Overlay closed');

      // Emit closed event
      try {
        if (window.game && window.game.bus && typeof window.game.bus.emit === 'function') {
          window.game.bus.emit('intermission:overlay:closed', { source: 'IntermissionOverlay' });
        }
      } catch (err) {
        console.warn('[IntermissionOverlay] Failed to emit closed event', err);
      }

      // Call callback if provided
      if (callback && typeof callback === 'function') {
        callback();
      }
    }, 300);
  }

  /**
   * Force close immediately without animation
   */
  function forceCloseNow() {
    _isShown = false;
    
    if (activeOverlay && activeOverlay.parentNode) {
      activeOverlay.parentNode.removeChild(activeOverlay);
    }

    // Restore body scroll
    if (previousBodyOverflow !== null) {
      document.body.style.overflow = previousBodyOverflow;
      previousBodyOverflow = null;
    }
    if (previousBodyHeight !== null) {
      document.body.style.height = previousBodyHeight;
      previousBodyHeight = null;
    }

    activeOverlay = null;
    closeBtn = null;
    continueBtn = null;

    console.info('[IntermissionOverlay] ✓ Force closed');
  }

  /**
   * Check if an overlay is currently active
   * @returns {boolean}
   */
  function isActive() {
    return activeOverlay !== null && activeOverlay.parentNode === document.body;
  }

  /**
   * Get the content mount point of the active overlay
   * @returns {HTMLElement|null}
   */
  function getActiveContentMount() {
    if (!activeOverlay) return null;
    return activeOverlay.querySelector('.intermission-overlay-content');
  }

  // Export to global namespace
  global.IntermissionOverlay = {
    show,
    close,
    forceCloseNow,
    isActive,
    getActiveContentMount,
    // For tests
    _internal: {
      onMinigameComplete
    }
  };

})(window);
