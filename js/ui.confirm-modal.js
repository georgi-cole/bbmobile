// MODULE: ui.confirm-modal.js
// Custom confirmation dialog system for consistent UX across browsers and mobile
// Replaces native confirm() with a styled modal that matches the app's design

(function(global) {
  'use strict';

  let activeConfirm = null;

  /**
   * Show a confirmation modal with Yes/No buttons
   * @param {string} message - The confirmation message to display
   * @param {Object} options - Optional configuration
   * @param {string} options.title - Modal title (default: 'Confirm')
   * @param {string} options.confirmText - Text for confirm button (default: 'Yes')
   * @param {string} options.cancelText - Text for cancel button (default: 'No')
   * @param {string} options.tone - Color tone: 'neutral', 'warn', 'danger' (default: 'warn')
   * @returns {Promise<boolean>} Resolves to true if confirmed, false if cancelled
   */
  async function showConfirm(message, options = {}) {
    const {
      title = 'Confirm',
      confirmText = 'Yes',
      cancelText = 'No',
      tone = 'warn'
    } = options;

    // If there's already an active confirm modal, wait for it
    if (activeConfirm) {
      await activeConfirm;
    }

    return new Promise((resolve) => {
      let resolved = false;

      // Create overlay
      const overlay = document.createElement('div');
      overlay.className = 'confirm-modal-overlay';
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(4, 10, 18, 0.92);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999999;
        opacity: 0;
        transition: opacity 0.25s ease;
        padding: 20px;
      `;

      // Create modal content
      const modal = document.createElement('div');
      modal.className = `confirm-modal confirm-modal-${tone}`;
      
      // Tone-based colors
      const toneColors = {
        neutral: { bg: 'linear-gradient(135deg, #1a2f44 0%, #243a50 100%)', border: '#3d5a75', btnBg: '#2a4a65', btnHover: '#345a7a' },
        warn: { bg: 'linear-gradient(135deg, #4a3c1a 0%, #5a4620 100%)', border: '#8a6a2a', btnBg: '#6a5020', btnHover: '#7a6030' },
        danger: { bg: 'linear-gradient(135deg, #4a1a1a 0%, #5a2020 100%)', border: '#8a2a2a', btnBg: '#6a2020', btnHover: '#7a3030' }
      };
      const colors = toneColors[tone] || toneColors.warn;

      modal.style.cssText = `
        background: ${colors.bg};
        border: 3px solid ${colors.border};
        border-radius: 16px;
        padding: 28px 32px;
        text-align: center;
        box-shadow: 0 20px 60px -16px rgba(0, 0, 0, 0.95), 0 8px 24px -8px rgba(0, 0, 0, 0.8);
        max-width: 480px;
        width: 100%;
        transform: scale(0.9);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        position: relative;
      `;

      // Title
      const titleEl = document.createElement('div');
      titleEl.className = 'confirm-modal-title';
      titleEl.style.cssText = `
        font-size: 1.5rem;
        font-weight: 700;
        color: #ffffff;
        margin-bottom: 16px;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
      `;
      titleEl.textContent = title;
      modal.appendChild(titleEl);

      // Message
      const messageEl = document.createElement('div');
      messageEl.className = 'confirm-modal-message';
      messageEl.style.cssText = `
        font-size: 1rem;
        color: #d5e0f0;
        margin-bottom: 28px;
        line-height: 1.5;
      `;
      messageEl.textContent = message;
      modal.appendChild(messageEl);

      // Button container
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = `
        display: flex;
        gap: 12px;
        justify-content: center;
        flex-wrap: wrap;
      `;

      // Cancel button
      const cancelButton = document.createElement('button');
      cancelButton.className = 'confirm-modal-button confirm-cancel';
      cancelButton.textContent = cancelText;
      cancelButton.style.cssText = `
        padding: 12px 24px;
        font-size: 0.95rem;
        font-weight: 600;
        border: 2px solid #4a5a6a;
        background: #2a3a4a;
        color: #e0e8f0;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 100px;
        font-family: inherit;
      `;

      // Confirm button
      const confirmButton = document.createElement('button');
      confirmButton.className = 'confirm-modal-button confirm-yes';
      confirmButton.textContent = confirmText;
      confirmButton.style.cssText = `
        padding: 12px 24px;
        font-size: 0.95rem;
        font-weight: 600;
        border: 2px solid ${colors.border};
        background: ${colors.btnBg};
        color: #ffffff;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
        min-width: 100px;
        font-family: inherit;
      `;

      // Button hover effects
      cancelButton.addEventListener('mouseenter', () => {
        cancelButton.style.background = '#3a4a5a';
        cancelButton.style.borderColor = '#5a6a7a';
      });
      cancelButton.addEventListener('mouseleave', () => {
        cancelButton.style.background = '#2a3a4a';
        cancelButton.style.borderColor = '#4a5a6a';
      });

      confirmButton.addEventListener('mouseenter', () => {
        confirmButton.style.background = colors.btnHover;
        confirmButton.style.transform = 'scale(1.05)';
      });
      confirmButton.addEventListener('mouseleave', () => {
        confirmButton.style.background = colors.btnBg;
        confirmButton.style.transform = 'scale(1)';
      });

      buttonContainer.appendChild(cancelButton);
      buttonContainer.appendChild(confirmButton);
      modal.appendChild(buttonContainer);

      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      activeConfirm = overlay;

      // Trigger fade-in animation
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        modal.style.transform = 'scale(1)';
        modal.style.opacity = '1';
        
        // Focus the confirm button for accessibility
        confirmButton.focus();
      });

      // Handle resolution
      const handleResolve = (value) => {
        if (resolved) return;
        resolved = true;

        // Fade out
        overlay.style.opacity = '0';
        modal.style.transform = 'scale(0.95)';

        setTimeout(() => {
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
          }
          if (activeConfirm === overlay) {
            activeConfirm = null;
          }
          resolve(value);
        }, 250);
      };

      // Button handlers
      cancelButton.addEventListener('click', () => handleResolve(false));
      confirmButton.addEventListener('click', () => handleResolve(true));

      // Keyboard shortcuts
      const keyHandler = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          handleResolve(false);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleResolve(true);
        }
      };
      document.addEventListener('keydown', keyHandler);

      // Clean up key handler when resolved
      const originalResolve = resolve;
      resolve = (value) => {
        document.removeEventListener('keydown', keyHandler);
        originalResolve(value);
      };

      // Click overlay to cancel (optional)
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          handleResolve(false);
        }
      });
    });
  }

  /**
   * Wrapper function that mimics the native confirm() API
   * Can be used as a drop-in replacement for confirm()
   * @param {string} message - The confirmation message
   * @returns {Promise<boolean>} Resolves to true if confirmed, false if cancelled
   */
  async function confirmAsync(message) {
    return showConfirm(message);
  }

  // Expose to global
  global.showConfirm = showConfirm;
  global.confirmAsync = confirmAsync;

  console.info('[ui.confirm-modal] Custom confirmation modal system initialized');

})(window);
