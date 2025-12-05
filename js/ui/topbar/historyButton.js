// MODULE: ui/topbar/historyButton.js
// Helper to inject History button next to resource indicators in social phase top bar

export const HistoryButton = (() => {
  'use strict';

  // State management
  const state = {
    button: null,
    overlay: null,
    panel: null,
    onOpen: null,
    isOpen: false
  };

  /**
   * Initialize and inject the history button
   * @param {Object} options - Configuration options
   * @param {HTMLElement} options.container - Container element for the button (top bar)
   * @param {Function} options.onOpen - Callback when history button is clicked
   * @param {Object} options.resources - Resource values to display {energy, influence, information}
   * @returns {Object} Public API
   */
  function init(options) {
    if (!options || !options.container) {
      console.warn('[HistoryButton] init: container is required');
      return null;
    }

    state.onOpen = options.onOpen || (() => {});
    
    // Render the button and indicators
    render(options.container, options.resources || {});

    // Set up event listeners
    attachEventListeners();

    console.info('[HistoryButton] Initialized');

    return getPublicAPI();
  }

  /**
   * Render the top bar with indicators and history button
   */
  function render(container, resources) {
    if (!container) return;

    // Validate and sanitize resource values
    const energy = Math.max(0, parseInt(resources.energy, 10) || 0);
    const influence = Math.max(0, parseInt(resources.influence, 10) || 0);
    const information = Math.max(0, parseInt(resources.information, 10) || 0);

    const html = `
      <div class="social-topbar-container">
        <div class="social-topbar-left">
          <div class="social-resource-indicator energy" 
               role="status" 
               aria-label="Energy: ${energy}">
            <span class="social-resource-indicator-icon">⚡</span>
            <span class="social-resource-indicator-value">${energy}</span>
          </div>
          
          <div class="social-resource-indicator influence" 
               role="status" 
               aria-label="Influence: ${influence}">
            <span class="social-resource-indicator-icon">👑</span>
            <span class="social-resource-indicator-value">${influence}</span>
          </div>
          
          <div class="social-resource-indicator information" 
               role="status" 
               aria-label="Insights: ${information}">
            <span class="social-resource-indicator-icon">🔍</span>
            <span class="social-resource-indicator-value">${information}</span>
          </div>
        </div>
        
        <div class="social-topbar-right">
          <button class="social-history-button" 
                  aria-label="View recent activity and history"
                  data-history-btn>
            <span class="social-history-button-icon">📜</span>
            <span class="social-history-button-label">History</span>
          </button>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Get DOM references
    state.button = container.querySelector('[data-history-btn]');
  }

  /**
   * Attach event listeners
   */
  function attachEventListeners() {
    if (state.button) {
      state.button.addEventListener('click', handleButtonClick);
    }

    // Listen for Escape key to close modal
    document.addEventListener('keydown', handleKeydown);
  }

  /**
   * Handle history button click
   */
  function handleButtonClick(e) {
    e.preventDefault();
    openHistory();
  }

  /**
   * Handle keyboard events
   */
  function handleKeydown(e) {
    if (e.key === 'Escape' && state.isOpen) {
      closeHistory();
    }
  }

  /**
   * Open history view
   */
  function openHistory() {
    if (state.isOpen) return;

    // Call the onOpen callback (which should handle rendering history content)
    if (state.onOpen) {
      state.onOpen();
    }

    state.isOpen = true;
    console.info('[HistoryButton] Opened history view');
  }

  /**
   * Close history view
   */
  function closeHistory() {
    if (!state.isOpen) return;

    state.isOpen = false;
    console.info('[HistoryButton] Closed history view');
  }

  /**
   * Update resource values
   */
  function updateResources(resources) {
    if (!state.button) return;

    const container = state.button.closest('.social-topbar-container');
    if (!container) return;

    // Validate and sanitize resource values
    const energy = Math.max(0, parseInt(resources.energy, 10) || 0);
    const influence = Math.max(0, parseInt(resources.influence, 10) || 0);
    const information = Math.max(0, parseInt(resources.information, 10) || 0);

    // Update energy
    const energyIndicator = container.querySelector('.social-resource-indicator.energy .social-resource-indicator-value');
    if (energyIndicator) {
      energyIndicator.textContent = energy;
      energyIndicator.closest('.social-resource-indicator').setAttribute('aria-label', `Energy: ${energy}`);
    }

    // Update influence
    const influenceIndicator = container.querySelector('.social-resource-indicator.influence .social-resource-indicator-value');
    if (influenceIndicator) {
      influenceIndicator.textContent = influence;
      influenceIndicator.closest('.social-resource-indicator').setAttribute('aria-label', `Influence: ${influence}`);
    }

    // Update information
    const informationIndicator = container.querySelector('.social-resource-indicator.information .social-resource-indicator-value');
    if (informationIndicator) {
      informationIndicator.textContent = information;
      informationIndicator.closest('.social-resource-indicator').setAttribute('aria-label', `Insights: ${information}`);
    }
  }

  /**
   * Show modal with history content
   * SECURITY NOTE: The historyHtml parameter must be sanitized by the caller
   * to prevent XSS attacks. This function does not perform HTML sanitization.
   * @param {string} historyHtml - Pre-sanitized HTML content to display in the history panel
   */
  function showHistoryModal(historyHtml) {
    // Create overlay if it doesn't exist
    if (!state.overlay) {
      const overlay = document.createElement('div');
      overlay.className = 'social-history-overlay';
      overlay.innerHTML = `
        <div class="social-history-panel" role="dialog" aria-modal="true" aria-labelledby="history-title">
          <div class="social-history-header">
            <h2 class="social-history-title" id="history-title">Recent Activity</h2>
            <button class="social-history-close" 
                    aria-label="Close history"
                    data-history-close>
              ×
            </button>
          </div>
          <div class="social-history-content" id="historyContent">
            <!-- Content will be inserted here -->
          </div>
          <div class="social-history-footer">
            All social interactions are recorded
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      state.overlay = overlay;
      state.panel = overlay.querySelector('.social-history-panel');

      // Add event listeners
      const closeBtn = overlay.querySelector('[data-history-close]');
      if (closeBtn) {
        closeBtn.addEventListener('click', hideHistoryModal);
      }

      // Close on overlay click (but not panel click)
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          hideHistoryModal();
        }
      });
    }

    // Update content
    const contentContainer = state.overlay.querySelector('#historyContent');
    if (contentContainer) {
      contentContainer.innerHTML = historyHtml;
    }

    // Show modal
    setTimeout(() => {
      state.overlay.classList.add('active');
    }, 10);

    state.isOpen = true;
  }

  /**
   * Hide history modal
   */
  function hideHistoryModal() {
    if (state.overlay) {
      state.overlay.classList.remove('active');
      state.isOpen = false;
      
      // Focus back on history button
      if (state.button) {
        state.button.focus();
      }
    }
  }

  /**
   * Destroy the history button and clean up
   */
  function destroy() {
    // Remove event listeners
    if (state.button) {
      state.button.removeEventListener('click', handleButtonClick);
    }
    document.removeEventListener('keydown', handleKeydown);

    // Remove overlay
    if (state.overlay) {
      state.overlay.remove();
      state.overlay = null;
      state.panel = null;
    }

    // Reset state
    state.button = null;
    state.onOpen = null;
    state.isOpen = false;

    console.info('[HistoryButton] Destroyed');
  }

  /**
   * Public API
   */
  function getPublicAPI() {
    return {
      openHistory,
      closeHistory,
      updateResources,
      showHistoryModal,
      hideHistoryModal,
      destroy
    };
  }

  return {
    init
  };
})();

// Export for global access (if not using ES modules)
if (typeof window !== 'undefined') {
  window.HistoryButton = HistoryButton;
}
