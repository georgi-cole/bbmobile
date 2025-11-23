// MODULE: ui/intermissionOverlay.js
// Full-screen overlay for intermission minigames
// Provides dimmed backdrop and centered content area with scroll lock

(function(global) {
  'use strict';

  let activeOverlay = null;
  let previousBodyOverflow = null;
  let previousBodyHeight = null;

  /**
   * Create and show full-screen intermission overlay
   * @param {Object} options
   * @param {Function} options.onClose - Optional callback when overlay is closed
   * @returns {Object} Overlay controller with mount/close methods
   */
  function show(options = {}) {
    const { onClose } = options;

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
       * Check if overlay is currently active
       * @returns {boolean}
       */
      isActive() {
        return activeOverlay === overlay && overlay.parentNode === document.body;
      }
    };
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
      
      console.info('[IntermissionOverlay] ✓ Overlay closed');

      // Call callback if provided
      if (callback && typeof callback === 'function') {
        callback();
      }
    }, 300);
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
    isActive,
    getActiveContentMount
  };

})(window);
