// MODULE: evictionModal.js
// Provides a viewport-level modal for displaying eviction results
// Escapes TV overlay clipping by rendering directly to document.body

(function(global) {
  'use strict';

  let currentModal = null;
  let previousFocus = null;

  /**
   * Show eviction result modal
   * @param {Object} options - Modal configuration
   * @param {string} options.title - Modal title (e.g., "Eviction Result")
   * @param {string[]} options.lines - Array of text lines to display
   * @param {number} [options.duration=3800] - Auto-dismiss duration in ms (0 = manual close only)
   * @param {string} [options.tone='evict'] - Visual tone/theme
   * @returns {Promise} Resolves when modal is dismissed
   */
  function showEvictionResultModal(options = {}) {
    return new Promise((resolve) => {
      // Close existing modal if any
      if (currentModal) {
        hideModal();
      }

      const {
        title = 'Eviction Result',
        lines = [],
        duration = 3800,
        tone = 'evict'
      } = options;

      // Store current focus to restore later
      previousFocus = document.activeElement;

      // Create modal root if it doesn't exist
      let modalRoot = document.getElementById('eviction-modal-root');
      if (!modalRoot) {
        modalRoot = document.createElement('div');
        modalRoot.id = 'eviction-modal-root';
        document.body.appendChild(modalRoot);
      }

      // Create modal layer
      const layer = document.createElement('div');
      layer.className = 'eviction-modal-layer';
      layer.setAttribute('role', 'dialog');
      layer.setAttribute('aria-modal', 'true');
      layer.setAttribute('aria-labelledby', 'eviction-modal-title');

      // Create backdrop
      const backdrop = document.createElement('div');
      backdrop.className = 'eviction-modal-backdrop';
      backdrop.onclick = () => {
        hideModal();
        resolve();
      };
      layer.appendChild(backdrop);

      // Create card
      const card = document.createElement('div');
      card.className = `eviction-modal-card ${tone}`;
      card.setAttribute('role', 'document');

      // Create title
      const titleEl = document.createElement('h2');
      titleEl.id = 'eviction-modal-title';
      titleEl.className = 'eviction-modal-title';
      titleEl.textContent = title;
      card.appendChild(titleEl);

      // Create body with lines
      if (lines.length > 0) {
        const body = document.createElement('div');
        body.className = 'eviction-modal-body';
        lines.forEach(line => {
          const p = document.createElement('p');
          p.textContent = sanitizeText(line);
          body.appendChild(p);
        });
        card.appendChild(body);
      }

      // Create close button
      const closeBtn = document.createElement('button');
      closeBtn.className = 'eviction-modal-close';
      closeBtn.innerHTML = '×';
      closeBtn.setAttribute('aria-label', 'Close modal');
      closeBtn.onclick = () => {
        hideModal();
        resolve();
      };
      card.appendChild(closeBtn);

      layer.appendChild(card);
      modalRoot.appendChild(layer);

      currentModal = layer;

      // Focus the card for accessibility
      setTimeout(() => {
        card.setAttribute('tabindex', '-1');
        card.focus();
      }, 100);

      // Add keyboard support
      const handleKeydown = (e) => {
        if (e.key === 'Escape') {
          hideModal();
          resolve();
        } else if (e.key === 'Tab') {
          // Trap focus within modal
          trapFocus(e, card);
        }
      };
      layer.addEventListener('keydown', handleKeydown);

      // Auto-dismiss after duration if specified
      if (duration > 0) {
        setTimeout(() => {
          if (currentModal === layer) {
            hideModal();
            resolve();
          }
        }, duration);
      }
    });
  }

  /**
   * Hide current modal
   */
  function hideModal() {
    if (!currentModal) return;

    const layer = currentModal;
    layer.classList.add('fade-out');

    setTimeout(() => {
      if (layer.parentNode) {
        layer.parentNode.removeChild(layer);
      }
      currentModal = null;

      // Restore previous focus
      if (previousFocus && typeof previousFocus.focus === 'function') {
        try {
          previousFocus.focus();
        } catch (e) {
          // Focus restore failed, ignore
        }
      }
      previousFocus = null;
    }, 200); // Match CSS fade-out duration
  }

  /**
   * Trap focus within modal (for Tab key accessibility)
   */
  function trapFocus(event, container) {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  /**
   * Sanitize text to prevent XSS
   * Simple sanitizer for plain text display only
   * NOTE: For more complex HTML content, use a library like DOMPurify
   */
  function sanitizeText(text) {
    if (typeof text !== 'string') return '';
    // Create a text node to safely escape HTML entities
    const div = document.createElement('div');
    div.textContent = text;
    // Return the sanitized text (HTML entities are automatically escaped)
    return div.innerHTML;
  }

  // Export API to both window and global for consistency with codebase patterns
  const api = {
    show: showEvictionResultModal,
    hide: hideModal
  };
  
  global.EvictionModal = api;
  if (typeof window !== 'undefined' && window !== global) {
    window.EvictionModal = api;
  }

  console.info('[evictionModal] Module initialized');

})(window);
