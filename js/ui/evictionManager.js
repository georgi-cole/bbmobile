// MODULE: evictionManager.js
// Central EvictionManager UI for live eviction flows
// Handles single/double/triple eviction layouts with strict validation
// Backwards-compatible via global.LiveVoteOverlay registration

(function(global) {
  'use strict';

  // State
  const state = {
    rootElement: null,
    nominees: [],
    evictCount: 0,
    selectedNomineeId: null,
    onVote: null,
    voteSubmitted: false,
    container: null
  };

  /**
   * Get avatar URL for a nominee
   * @param {string} nomineeId - Nominee player ID
   * @returns {string} Avatar URL
   */
  function getAvatarUrl(nomineeId) {
    if (global.resolveAvatar) {
      const player = global.getP?.(nomineeId);
      if (player) {
        return global.resolveAvatar(player) || getDicebearUrl(player.name);
      }
    }
    const player = global.getP?.(nomineeId);
    if (player?.avatar) return player.avatar;
    return getDicebearUrl(global.safeName?.(nomineeId) || 'player');
  }

  /**
   * Get Dicebear fallback avatar
   * @param {string} seed - Name or ID seed
   * @returns {string} Dicebear URL
   */
  function getDicebearUrl(seed) {
    return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(seed || 'player')}`;
  }

  /**
   * Get safe player name
   * @param {string} nomineeId - Nominee player ID
   * @returns {string} Player name
   */
  function getPlayerName(nomineeId) {
    return global.safeName?.(nomineeId) || nomineeId;
  }

  /**
   * Emit event to game bus
   * @param {string} eventName - Event name
   * @param {object} data - Event data
   */
  function emitEvent(eventName, data = {}) {
    try {
      if (global.game?.bus?.emit) {
        global.game.bus.emit(eventName, data);
        console.debug(`[EvictionManager] Event emitted: ${eventName}`, data);
      }
    } catch (err) {
      console.warn(`[EvictionManager] Error emitting event ${eventName}:`, err);
    }
  }

  /**
   * Find TV overlay container in order of priority
   * @param {HTMLElement|null} providedContainer - Optional provided container
   * @returns {HTMLElement} Container element
   */
  function findContainer(providedContainer) {
    if (providedContainer && providedContainer instanceof HTMLElement) {
      return providedContainer;
    }

    // Search in priority order
    const selectors = [
      '[data-faux-tv]',
      '[data-sm-faux-tv]',
      '.tvViewport',
      '#tv',
      '#panel'
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        console.debug(`[EvictionManager] Found container: ${selector}`);
        return el;
      }
    }

    console.debug('[EvictionManager] Using document.body as fallback container');
    return document.body;
  }

  /**
   * Handle nominee selection
   * @param {string} nomineeId - Selected nominee ID
   */
  function handleSelect(nomineeId) {
    if (state.voteSubmitted) {
      console.debug('[EvictionManager] Vote already submitted, ignoring selection');
      return;
    }

    state.selectedNomineeId = nomineeId;
    console.debug(`[EvictionManager] Nominee selected: ${nomineeId}`);

    // Update UI to show selected state
    updateSelectionUI();

    emitEvent('eviction:selected', { nomineeId });
  }

  /**
   * Update UI to reflect current selection
   */
  function updateSelectionUI() {
    if (!state.rootElement) return;

    const items = state.rootElement.querySelectorAll('.eviction-manager-item');
    items.forEach(item => {
      const nomineeId = item.dataset.nomineeId;
      const isSelected = nomineeId === state.selectedNomineeId;
      
      // Toggle selected class
      if (isSelected) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }

      // Show/hide Evict button
      const btn = item.querySelector('.eviction-manager-evict-btn');
      if (btn) {
        btn.style.display = isSelected ? 'block' : 'none';
      }
    });
  }

  /**
   * Handle Evict button click
   * @param {string} nomineeId - Nominee to evict
   */
  async function handleEvict(nomineeId) {
    if (state.voteSubmitted) {
      console.debug('[EvictionManager] Vote already submitted');
      return;
    }

    console.debug(`[EvictionManager] Evict button clicked for: ${nomineeId}`);

    // Disable button immediately
    state.voteSubmitted = true;
    const btn = state.rootElement?.querySelector(`[data-nominee-id="${nomineeId}"] .eviction-manager-evict-btn`);
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Voting...';
    }

    emitEvent('eviction:vote', { nomineeId });

    // Call onVote callback
    if (typeof state.onVote === 'function') {
      try {
        await state.onVote(nomineeId);
        console.debug('[EvictionManager] onVote callback completed');
        emitEvent('eviction:vote:ack', { nomineeId });
      } catch (err) {
        console.error('[EvictionManager] onVote callback error:', err);
        // Re-enable button on error
        state.voteSubmitted = false;
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Evict';
        }
        return;
      }
    } else {
      emitEvent('eviction:vote:ack', { nomineeId });
    }

    // Auto-hide after vote
    setTimeout(() => {
      hide();
    }, 300);
  }

  /**
   * Handle keyboard navigation
   * @param {KeyboardEvent} e - Keyboard event
   */
  function handleKeyboard(e) {
    if (state.voteSubmitted) return;

    const items = Array.from(state.rootElement?.querySelectorAll('.eviction-manager-item') || []);
    const currentIndex = items.findIndex(item => item.classList.contains('focused'));

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowUp': {
        e.preventDefault();
        if (currentIndex > 0) {
          items[currentIndex]?.classList.remove('focused');
          items[currentIndex - 1]?.classList.add('focused');
          items[currentIndex - 1]?.focus();
        }
        break;
      }

      case 'ArrowRight':
      case 'ArrowDown': {
        e.preventDefault();
        if (currentIndex < items.length - 1) {
          items[currentIndex]?.classList.remove('focused');
          items[currentIndex + 1]?.classList.add('focused');
          items[currentIndex + 1]?.focus();
        } else if (currentIndex === -1 && items.length > 0) {
          items[0]?.classList.add('focused');
          items[0]?.focus();
        }
        break;
      }

      case 'Enter':
      case ' ': {
        e.preventDefault();
        const focusedItem = items[currentIndex];
        if (focusedItem) {
          const nomineeId = focusedItem.dataset.nomineeId;
          if (state.selectedNomineeId === nomineeId) {
            // Already selected, trigger evict
            handleEvict(nomineeId);
          } else {
            // Select nominee
            handleSelect(nomineeId);
          }
        }
        break;
      }

      case 'Escape': {
        e.preventDefault();
        hide();
        break;
      }
    }
  }

  /**
   * Render the UI
   * @returns {HTMLElement} Root element
   */
  function render() {
    const root = document.createElement('div');
    root.className = 'eviction-manager-root';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'eviction-manager-title');

    // Header
    const header = document.createElement('div');
    header.className = 'eviction-manager-header';
    header.id = 'eviction-manager-title';
    header.textContent = 'Vote to Evict';
    root.appendChild(header);

    // List container with scroll-snap
    const list = document.createElement('div');
    list.className = 'eviction-manager-list';
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', 'Select nominee to evict');

    state.nominees.forEach((nomineeId, index) => {
      const item = document.createElement('div');
      item.className = 'eviction-manager-item';
      item.dataset.nomineeId = nomineeId;
      item.setAttribute('role', 'option');
      item.setAttribute('tabindex', index === 0 ? '0' : '-1');
      item.setAttribute('aria-label', `Vote to evict ${getPlayerName(nomineeId)}`);

      // Avatar
      const avatar = document.createElement('div');
      avatar.className = 'eviction-manager-avatar';
      const img = document.createElement('img');
      img.src = getAvatarUrl(nomineeId);
      img.alt = getPlayerName(nomineeId);
      img.setAttribute('loading', 'eager');
      avatar.appendChild(img);

      // Name
      const name = document.createElement('div');
      name.className = 'eviction-manager-name';
      name.textContent = getPlayerName(nomineeId);

      // Evict button (hidden initially)
      const btn = document.createElement('button');
      btn.className = 'eviction-manager-evict-btn';
      btn.textContent = 'Evict';
      btn.style.display = 'none';
      btn.setAttribute('aria-label', `Confirm eviction of ${getPlayerName(nomineeId)}`);
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleEvict(nomineeId);
      });

      // Click handler for item
      item.addEventListener('click', () => {
        handleSelect(nomineeId);
      });

      // Focus handler
      item.addEventListener('focus', () => {
        item.classList.add('focused');
      });
      item.addEventListener('blur', () => {
        item.classList.remove('focused');
      });

      item.appendChild(avatar);
      item.appendChild(name);
      item.appendChild(btn);
      list.appendChild(item);
    });

    root.appendChild(list);

    // Keyboard listener
    root.addEventListener('keydown', handleKeyboard);

    // Focus first item
    requestAnimationFrame(() => {
      const firstItem = list.querySelector('.eviction-manager-item');
      if (firstItem) {
        firstItem.focus();
      }
    });

    return root;
  }

  /**
   * Show the EvictionManager UI
   * @param {object} options - Configuration options
   * @param {string[]} options.nominees - Array of nominee IDs
   * @param {number} options.evictCount - Number of evictions
   * @param {HTMLElement|null} [options.container] - Optional container element (DEPRECATED - always uses document.body)
   * @param {function|null} [options.onVote] - Optional vote callback
   * @returns {HTMLElement|null} Root element or null on validation error
   */
  function show(options) {
    if (!options || !Array.isArray(options.nominees) || typeof options.evictCount !== 'number') {
      console.error('[EvictionManager] Invalid options:', options);
      return null;
    }

    const { nominees, evictCount, onVote } = options;

    // STRICT VALIDATION: nominees.length must equal evictCount + 1
    if (nominees.length !== evictCount + 1) {
      console.error(
        `[EvictionManager] Validation failed: nominees.length (${nominees.length}) !== evictCount + 1 (${evictCount + 1}). ` +
        `Expected ${evictCount + 1} nominees for ${evictCount} eviction(s).`
      );
      
      // Show inline error in UI
      const errorMsg = document.createElement('div');
      errorMsg.className = 'eviction-manager-error';
      errorMsg.textContent = `Configuration error: Expected ${evictCount + 1} nominees for ${evictCount} eviction(s), got ${nominees.length}.`;
      document.body.appendChild(errorMsg);
      setTimeout(() => errorMsg.remove(), 5000);
      
      return null;
    }

    console.info(`[EvictionManager] Showing UI: ${nominees.length} nominees, ${evictCount} eviction(s)`);

    // Close any existing UI first
    if (typeof global.closeAllVoteUI === 'function') {
      global.closeAllVoteUI();
    }

    // Initialize state
    state.nominees = nominees;
    state.evictCount = evictCount;
    state.selectedNomineeId = null;
    state.onVote = onVote || null;
    state.voteSubmitted = false;
    state.container = document.body; // FIXED: Always use document.body to avoid stacking context issues

    // Render UI
    state.rootElement = render();
    
    // FIXED: Apply defensive inline styles to ensure overlay is always interactive and on top
    state.rootElement.style.position = 'fixed';
    state.rootElement.style.inset = '0';
    state.rootElement.style.width = '100vw';
    state.rootElement.style.height = '100vh';
    state.rootElement.style.zIndex = '2147483000'; // Very high z-index to sit above all UI
    state.rootElement.style.pointerEvents = 'auto'; // Ensure interactivity
    
    // Add body class to signal overlay is open
    document.documentElement.classList.add('live-vote-overlay-open');
    
    // Append to document.body (not container)
    state.container.appendChild(state.rootElement);

    emitEvent('eviction:opened', { nominees, evictCount });

    return state.rootElement;
  }

  /**
   * Programmatic vote
   * @param {string} nomineeId - Nominee to vote for
   */
  function vote(nomineeId) {
    if (state.voteSubmitted) {
      console.debug('[EvictionManager] Vote already submitted');
      return;
    }

    if (!state.nominees.includes(nomineeId)) {
      console.error(`[EvictionManager] Invalid nominee ID: ${nomineeId}`);
      return;
    }

    handleSelect(nomineeId);
    handleEvict(nomineeId);
  }

  /**
   * Hide/teardown the UI
   */
  function hide() {
    console.debug('[EvictionManager] Hiding UI');

    if (state.rootElement && state.rootElement.parentElement) {
      state.rootElement.parentElement.removeChild(state.rootElement);
    }
    
    // Remove body class to signal overlay is closed
    document.documentElement.classList.remove('live-vote-overlay-open');

    // Reset state
    state.rootElement = null;
    state.nominees = [];
    state.evictCount = 0;
    state.selectedNomineeId = null;
    state.onVote = null;
    state.voteSubmitted = false;
    state.container = null;

    emitEvent('eviction:closed', {});
  }

  /**
   * Check if UI is currently open
   * @returns {boolean} True if open
   */
  function isOpen() {
    return state.rootElement !== null && state.rootElement.parentElement !== null;
  }

  // Public API
  const EvictionManager = {
    show,
    vote,
    hide,
    teardown: hide, // Alias
    isOpen
  };

  // Export to global scope
  global.EvictionManager = EvictionManager;
  // Note: LiveVoteOverlay backwards compatibility is handled by livevote-adapter.js

  console.info('[EvictionManager] Module initialized');

})(window);
