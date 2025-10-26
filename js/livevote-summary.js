// MODULE: livevote-summary.js
// Renders a centered summary card inside the TV showing vote results
// Displays briefly before the final eviction effect on mobile
// Safe-area aware and uses tv-card pattern

(function(global) {
  'use strict';

  // State
  const state = {
    overlay: null,
    container: null
  };

  // Create and show the summary card
  function show(options = {}) {
    const {
      title = 'Eviction Result',
      body = [],
      duration = 3800,
      tone = 'evict',
      container = null
    } = options;

    // Find container (either provided or default to TV)
    const targetContainer = container || document.querySelector('#tv');
    if (!targetContainer) {
      console.warn('[LiveVoteSummary] No container found');
      return null;
    }

    // Set phase to 'summary' to manage TV classes
    if (global.lv2 && global.lv2.setPhase) {
      global.lv2.setPhase('summary');
    }

    // Remove any existing summary card
    const existing = targetContainer.querySelector('.lv-summary-card');
    if (existing) existing.remove();

    // Create summary card - tv-card pattern
    const card = document.createElement('div');
    card.className = 'lv-summary-card tv-card';
    card.setAttribute('role', 'status');
    card.setAttribute('aria-live', 'polite');
    card.setAttribute('aria-label', title);

    // Add tone class
    if (tone === 'evict' || tone === 'live') {
      card.classList.add(`tone-${tone}`);
    }

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      card.classList.add('reduce-motion');
    }

    // Title
    const h3 = document.createElement('h3');
    h3.className = 'lv-summary__title';
    h3.textContent = title;
    card.appendChild(h3);

    // Body content
    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'lv-summary__body';
    const bodyLines = Array.isArray(body) ? body : [body];
    bodyLines.forEach(line => {
      const lineDiv = document.createElement('div');
      lineDiv.className = 'lv-summary__line';
      lineDiv.textContent = line;
      bodyDiv.appendChild(lineDiv);
    });
    card.appendChild(bodyDiv);

    // Add to container
    targetContainer.appendChild(card);
    state.overlay = card;
    state.container = targetContainer;

    // Auto-hide after duration
    setTimeout(() => {
      hide();
    }, duration);

    return card;
  }

  // Hide the summary card
  function hide() {
    if (!state.overlay) return;

    // Fade out
    const card = state.overlay;
    card.style.transition = 'opacity 0.3s ease-out';
    card.style.opacity = '0';

    setTimeout(() => {
      if (card && card.parentNode) {
        card.remove();
      }
    }, 300);

    // Clear phase
    if (global.lv2 && global.lv2.setPhase) {
      global.lv2.setPhase(null);
    }

    // Reset state
    state.overlay = null;
    state.container = null;
  }

  // Check if showing
  function isShowing() {
    return state.overlay !== null;
  }

  // Export public API
  global.LiveVoteSummary = {
    show,
    hide,
    isShowing
  };

})(window);
