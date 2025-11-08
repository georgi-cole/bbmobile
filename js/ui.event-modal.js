// MODULE: ui.event-modal.js
// Generalized event modal system for announcements, twists, and special events
// Displays prominent modal with title, emojis/badge, subtitle, and auto-dismiss

(function(global) {
  'use strict';

  // Modal queue to ensure only one modal is visible at a time
  const modalQueue = [];
  let currentModal = null;
  let isProcessing = false;

  /**
   * Show an event modal with customizable content
   * @param {Object} options - Modal configuration
   * @param {string} options.title - Main title text
   * @param {string} options.emojis - Emoji(s) to display above title
   * @param {string} options.subtitle - Subtitle/description text
   * @param {string} options.badge - Optional badge text (alternative to emojis)
   * @param {number} options.duration - Auto-dismiss duration in milliseconds (default: 4000)
   * @param {number} options.minDisplayTime - Minimum display time before dismissible (default: 500)
   * @param {function} options.callback - Function to call after modal dismisses
   * @param {string} options.tone - Color tone: 'neutral', 'warn', 'danger', 'ok', 'special' (default: 'neutral')
   * @param {string} options.titleFontSize - Custom font size for title (e.g., '1.5rem', '24px')
   * @returns {Promise} Resolves when modal is dismissed
   */
  async function showEventModal(options) {
    const {
      title = 'Event',
      emojis = '⭐',
      subtitle = '',
      badge = '',
      duration = 4000,
      minDisplayTime = 500,
      callback = null,
      tone = 'neutral',
      titleFontSize = null
    } = options;

    return new Promise((resolve) => {
      modalQueue.push({
        title,
        emojis,
        subtitle,
        badge,
        duration,
        minDisplayTime,
        callback,
        tone,
        titleFontSize,
        resolve
      });

      if (!isProcessing) {
        processModalQueue();
      }
    });
  }

  /**
   * Process the modal queue sequentially
   */
  async function processModalQueue() {
    if (isProcessing || modalQueue.length === 0) return;
    
    isProcessing = true;

    while (modalQueue.length > 0) {
      const modalConfig = modalQueue.shift();
      await displayModal(modalConfig);
    }

    isProcessing = false;
  }

  /**
   * Display a single modal
   */
  async function displayModal(config) {
    const {
      title,
      emojis,
      subtitle,
      badge,
      duration,
      minDisplayTime,
      callback,
      tone,
      titleFontSize,
      resolve
    } = config;

    return new Promise((resolveDisplay) => {
      const startTime = Date.now();
      let dismissible = false;
      let dismissed = false;

      // Make modal dismissible after minDisplayTime
      setTimeout(() => {
        dismissible = true;
      }, minDisplayTime);

      // Create modal content (no overlay needed - unified mount provides centering)
      const modal = document.createElement('div');
      modal.className = `event-modal event-modal-${tone}`;
      
      // Tone-based colors
      const toneColors = {
        neutral: { bg: 'linear-gradient(135deg, #1a2f44 0%, #243a50 100%)', border: '#3d5a75' },
        warn: { bg: 'linear-gradient(135deg, #4a3c1a 0%, #5a4620 100%)', border: '#8a6a2a' },
        danger: { bg: 'linear-gradient(135deg, #4a1a1a 0%, #5a2020 100%)', border: '#8a2a2a' },
        ok: { bg: 'linear-gradient(135deg, #1a4a2f 0%, #205a38 100%)', border: '#2a8a4a' },
        special: { bg: 'linear-gradient(135deg, #3a1a4a 0%, #4a205a 100%)', border: '#6a2a8a' }
      };
      const colors = toneColors[tone] || toneColors.neutral;

      modal.style.cssText = `
        background: ${colors.bg};
        border: 3px solid ${colors.border};
        border-radius: 24px;
        padding: 48px 60px;
        text-align: center;
        box-shadow: 0 24px 72px -24px rgba(0, 0, 0, 0.95), 0 12px 32px -12px rgba(0, 0, 0, 0.8);
        max-width: 560px;
        width: 90%;
        position: relative;
      `;

      // Dismiss hint (shown after minDisplayTime)
      const dismissHint = document.createElement('div');
      dismissHint.className = 'event-modal-dismiss-hint';
      dismissHint.textContent = 'Click to dismiss';
      dismissHint.style.cssText = `
        position: absolute;
        top: 12px;
        right: 16px;
        font-size: 0.7rem;
        color: rgba(255, 255, 255, 0.35);
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: none;
        font-weight: 500;
      `;
      modal.appendChild(dismissHint);

      // Emoji/Badge section
      if (badge) {
        const badgeEl = document.createElement('div');
        badgeEl.className = 'event-modal-badge';
        badgeEl.style.cssText = `
          display: inline-block;
          padding: 8px 20px;
          background: rgba(255, 255, 255, 0.15);
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 700;
          color: #ffffff;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 24px;
        `;
        badgeEl.textContent = badge;
        modal.appendChild(badgeEl);
      } else if (emojis) {
        const emojiContainer = document.createElement('div');
        emojiContainer.className = 'event-modal-emojis';
        emojiContainer.style.cssText = `
          font-size: 5rem;
          margin-bottom: 24px;
          display: flex;
          gap: 16px;
          justify-content: center;
          align-items: center;
          line-height: 1;
        `;
        emojiContainer.textContent = emojis;
        modal.appendChild(emojiContainer);
      }

      // Title
      const titleEl = document.createElement('div');
      titleEl.className = 'event-modal-title';
      const defaultFontSize = '2.5rem';
      titleEl.style.cssText = `
        font-size: ${titleFontSize || defaultFontSize};
        font-weight: 800;
        color: #ffffff;
        margin-bottom: 16px;
        text-shadow: 0 3px 12px rgba(0, 0, 0, 0.6);
        letter-spacing: 0.5px;
        line-height: 1.2;
      `;
      titleEl.textContent = title;
      modal.appendChild(titleEl);

      // Subtitle
      if (subtitle) {
        const subtitleEl = document.createElement('div');
        subtitleEl.className = 'event-modal-subtitle';
        subtitleEl.style.cssText = `
          font-size: 1.1rem;
          color: #b2c2d5;
          margin-top: 12px;
          line-height: 1.5;
          font-weight: 500;
        `;
        subtitleEl.textContent = subtitle;
        modal.appendChild(subtitleEl);
      }

      // Mount using unified popup system
      const wrapper = global.mountCenteredPopup(modal, {
        replace: true,
        className: 'event-modal-wrapper',
        dialog: true
      });

      if (!wrapper) {
        console.error('[event-modal] Failed to mount popup');
        if (typeof resolve === 'function') resolve();
        if (typeof resolveDisplay === 'function') resolveDisplay();
        return;
      }

      currentModal = wrapper;

      // Enable dismissal after minDisplayTime
      setTimeout(() => {
        dismissible = true;
        dismissHint.style.opacity = '1';
      }, minDisplayTime);

      // Dismiss handler
      const dismiss = () => {
        if (dismissed) return;
        
        const elapsed = Date.now() - startTime;
        if (!dismissible || elapsed < minDisplayTime) return;
        
        dismissed = true;

        // Fade out with animation
        wrapper.style.animation = 'popupFadeOut 0.3s ease';

        setTimeout(() => {
          global.unmountPopups();
          currentModal = null;

          // Call callback if provided
          if (typeof callback === 'function') {
            try {
              callback();
            } catch (e) {
              console.error('[event-modal] Callback error:', e);
            }
          }

          // Resolve promises
          if (typeof resolve === 'function') resolve();
          if (typeof resolveDisplay === 'function') resolveDisplay();
        }, 300); // Match fade-out duration
      };

      // Click to dismiss (on wrapper, not body)
      wrapper.addEventListener('click', dismiss);

      // ESC to dismiss
      const keyHandler = (e) => {
        if (e.key === 'Escape') dismiss();
      };
      document.addEventListener('keydown', keyHandler);

      // Auto-dismiss after duration
      setTimeout(() => {
        document.removeEventListener('keydown', keyHandler);
        if (!dismissed) dismiss();
      }, duration);
    });
  }

  /**
   * Clear the modal queue (useful for emergency exits or phase changes)
   */
  function clearModalQueue() {
    modalQueue.length = 0;
    if (currentModal) {
      global.unmountPopups();
      currentModal = null;
    }
    isProcessing = false;
  }

  // Expose to global
  global.showEventModal = showEventModal;
  global.clearEventModalQueue = clearModalQueue;

  console.info('[ui.event-modal] Event modal system initialized');

})(window);
