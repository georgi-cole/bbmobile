// MODULE: lv2-shim.js
// Minimal compatibility shim for window.lv2 API
// Routes createCtaBar to EvictionCarousel when available; otherwise provides fallback UI
// Prevents runtime errors if legacy livevote files are absent

(function(global) {
  'use strict';

  // State for tracking active UI
  const state = {
    container: null,
    nominees: [],
    onVoteCallback: null,
    isActive: false
  };

  /**
   * Initialize lv2 with nominees
   * @param {Object} config - Configuration object with leftName, rightName, leftId, rightId
   */
  function init(config) {
    if (!config || (!config.leftName && !config.rightName)) {
      console.warn('[lv2-shim] Invalid init config', config);
      return;
    }

    // Build nominees array from config
    state.nominees = [];
    if (config.leftName && config.leftId !== null && config.leftId !== undefined) {
      const leftPlayer = global.getP ? global.getP(config.leftId) : null;
      state.nominees.push({
        id: config.leftId,
        name: config.leftName,
        photo: leftPlayer?.avatar || `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(config.leftName)}`
      });
    }
    if (config.rightName && config.rightId !== null && config.rightId !== undefined) {
      const rightPlayer = global.getP ? global.getP(config.rightId) : null;
      state.nominees.push({
        id: config.rightId,
        name: config.rightName,
        photo: rightPlayer?.avatar || `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(config.rightName)}`
      });
    }

    console.debug('[lv2-shim] Initialized with nominees:', state.nominees);
  }

  /**
   * Create CTA bar for voting
   * Routes to EvictionCarousel if available; otherwise shows fallback UI
   */
  function createCtaBar() {
    if (!state.nominees.length) {
      console.warn('[lv2-shim] No nominees available for createCtaBar');
      return;
    }

    // Find container (TV or panel)
    const container = findContainer();
    if (!container) {
      console.warn('[lv2-shim] No container found for createCtaBar');
      return;
    }

    state.container = container;

    // Try to use EvictionCarousel if available
    if (global.EvictionCarousel && typeof global.EvictionCarousel.render === 'function') {
      try {
        global.EvictionCarousel.render(container, state.nominees, {
          onVote: async (nomineeId) => {
            console.debug('[lv2-shim] Vote triggered via EvictionCarousel:', nomineeId);
            if (state.onVoteCallback) {
              await state.onVoteCallback(nomineeId);
            }
          }
        });
        state.isActive = true;
        console.debug('[lv2-shim] Rendered EvictionCarousel');
        return;
      } catch (err) {
        console.error('[lv2-shim] Error rendering EvictionCarousel:', err);
      }
    }

    // Fallback: simple button UI
    renderFallbackUI(container);
  }

  /**
   * Find suitable container for UI (TV area or panel)
   */
  function findContainer() {
    const selectors = ['[data-faux-tv]', '[data-sm-faux-tv]', '.tvViewport', '#tv', '#panel'];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return document.body;
  }

  /**
   * Render fallback UI when EvictionCarousel is not available
   */
  function renderFallbackUI(container) {
    cleanup(); // Clear any existing UI

    const fallbackRoot = document.createElement('div');
    fallbackRoot.className = 'lv2-shim-fallback';
    fallbackRoot.style.cssText = 'padding: 20px; text-align: center;';

    const title = document.createElement('div');
    title.textContent = 'Vote to Evict';
    title.style.cssText = 'font-size: 18px; font-weight: bold; margin-bottom: 16px;';
    fallbackRoot.appendChild(title);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;';

    state.nominees.forEach(nominee => {
      const btn = document.createElement('button');
      btn.textContent = `Evict ${nominee.name}`;
      btn.style.cssText = 'padding: 10px 20px; font-size: 16px; cursor: pointer; border: 2px solid #d9534f; background: white; color: #d9534f; border-radius: 8px;';
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.style.opacity = '0.6';
        console.debug('[lv2-shim] Fallback vote:', nominee.id);
        if (state.onVoteCallback) {
          await state.onVoteCallback(nominee.id);
        }
      });
      buttonContainer.appendChild(btn);
    });

    fallbackRoot.appendChild(buttonContainer);
    container.appendChild(fallbackRoot);
    state.container = fallbackRoot;
    state.isActive = true;

    console.debug('[lv2-shim] Rendered fallback UI');
  }

  /**
   * Set whether it's the user's turn to vote
   * @param {boolean} isActive - Whether user can vote now
   */
  function setTurn(isActive) {
    // In the shim, we don't need to do much here since EvictionCarousel
    // handles its own state, and fallback UI is always ready
    console.debug('[lv2-shim] setTurn:', isActive);
  }

  /**
   * Push a vote (for AI/other players)
   * @param {number} nomineeId - ID of the nominee receiving a vote
   */
  function pushVote(nomineeId) {
    console.debug('[lv2-shim] pushVote:', nomineeId);
    // Shim doesn't animate vote cards, just logs
    try {
      if (global.game?.bus?.emit) {
        global.game.bus.emit('eviction:vote', { nomineeId, isAI: true });
      }
    } catch (e) {
      console.debug('[lv2-shim] Could not emit vote event:', e);
    }
  }

  /**
   * Finish voting phase
   */
  function finish() {
    console.debug('[lv2-shim] finish called');
    cleanup();
  }

  /**
   * Clean up and remove UI
   */
  function cleanup() {
    if (global.EvictionCarousel && typeof global.EvictionCarousel.teardown === 'function') {
      try {
        global.EvictionCarousel.teardown();
      } catch (err) {
        console.error('[lv2-shim] Error tearing down EvictionCarousel:', err);
      }
    }

    if (state.container && state.container.parentNode) {
      try {
        state.container.parentNode.removeChild(state.container);
      } catch (e) {
        console.debug('[lv2-shim] Could not remove container:', e);
      }
    }

    state.container = null;
    state.isActive = false;
    console.debug('[lv2-shim] Cleanup complete');
  }

  // Stub methods for backward compatibility (do nothing in shim)
  function updateCtaBar() { console.debug('[lv2-shim] updateCtaBar (stub)'); }
  function hideCtaBar() { console.debug('[lv2-shim] hideCtaBar (stub)'); }
  function showTurnIndicator() { setTurn(true); }
  function hideTurnIndicator() { setTurn(false); }
  function beginResultCardPhase() { console.debug('[lv2-shim] beginResultCardPhase (stub)'); }
  function endResultCardPhase() { console.debug('[lv2-shim] endResultCardPhase (stub)'); }
  function showEvicteeFinal() { console.debug('[lv2-shim] showEvicteeFinal (stub)'); }
  function supportsInlineCard() { return false; }
  function showInlineCard() { console.debug('[lv2-shim] showInlineCard (stub)'); }
  function enterExternalOverlayMode() { console.debug('[lv2-shim] enterExternalOverlayMode (stub)'); }
  function exitExternalOverlayMode() { console.debug('[lv2-shim] exitExternalOverlayMode (stub)'); }

  // Public API compatible with window.lv2
  const lv2 = {
    init: init,
    createCtaBar: createCtaBar,
    setTurn: setTurn,
    pushVote: pushVote,
    finish: finish,
    cleanup: cleanup,
    updateCtaBar: updateCtaBar,
    hideCtaBar: hideCtaBar,
    showTurnIndicator: showTurnIndicator,
    hideTurnIndicator: hideTurnIndicator,
    beginResultCardPhase: beginResultCardPhase,
    endResultCardPhase: endResultCardPhase,
    showEvicteeFinal: showEvicteeFinal,
    supportsInlineCard: supportsInlineCard,
    showInlineCard: showInlineCard,
    enterExternalOverlayMode: enterExternalOverlayMode,
    exitExternalOverlayMode: exitExternalOverlayMode,
    
    // Expose onVoteCallback setter for external integration
    setOnVote: function(callback) {
      state.onVoteCallback = callback;
    },
    
    // Read-only properties
    get enabled() {
      return true; // Shim is always enabled
    },
    set enabled(val) {
      console.debug('[lv2-shim] enabled setter (ignored):', val);
    },
    get reducedMotion() {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  };

  // Expose on global only if not already defined
  if (!global.lv2) {
    global.lv2 = lv2;
    console.debug('[lv2-shim] Shim API exposed on window.lv2');
  } else {
    console.debug('[lv2-shim] window.lv2 already exists, skipping shim');
  }

})(window);
