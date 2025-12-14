// MODULE: evictionUI.js
// New ground-up eviction voting flow with double-tap/double-click interaction
// Replaces old voting system completely - no legacy dependencies

(function(global) {
  'use strict';

  /**
   * Eviction UI State
   */
  const state = {
    active: false,
    nominees: [],
    eligible: false,
    phaseId: null,
    timeoutMs: null,
    voteCast: false,
    votedNomineeId: null,
    container: null,
    detectors: [],
    config: {
      tapWindow: 350,           // Double-tap detection window (ms)
      glowDuration: 2000,       // Glow animation duration (ms)
      confirmationDelay: 800,   // Delay before continuing flow (ms)
      debugMode: false          // Enable debug logging
    }
  };

  /**
   * Debug logger
   */
  function log(...args) {
    if (state.config.debugMode) {
      console.log('[EvictionUI]', ...args);
    }
  }

  /**
   * Listen for eviction phase start event
   * Expected payload: { nominees: [{id, name, avatarUrl, seatId}], eligible: boolean, phaseId?: string, timeoutMs?: number }
   */
  function initialize() {
    log('Initializing eviction UI');

    // Listen on game bus
    const bus = getBus();
    if (!bus) {
      console.warn('[EvictionUI] No event bus found - cannot initialize');
      return;
    }

    // Listen for eviction start event
    bus.on('phase:eviction:start', handleEvictionStart);
    
    log('Registered event listener for phase:eviction:start');
  }

  /**
   * Get event bus instance
   */
  function getBus() {
    return global.game?.bus || global.bbGameBus || null;
  }

  /**
   * Handle eviction phase start
   */
  function handleEvictionStart(payload) {
    log('Eviction start event received', payload);

    // Validate payload
    if (!payload || !Array.isArray(payload.nominees)) {
      console.error('[EvictionUI] Invalid payload - nominees array required', payload);
      return;
    }

    // Extract data
    state.nominees = payload.nominees || [];
    state.eligible = payload.eligible !== false; // Default to true
    state.phaseId = payload.phaseId || null;
    state.timeoutMs = payload.timeoutMs || null;
    state.voteCast = false;
    state.votedNomineeId = null;

    log('State updated', {
      nominees: state.nominees.length,
      eligible: state.eligible,
      phaseId: state.phaseId
    });

    // If not eligible, skip voting UI and go to faux-TV view
    if (!state.eligible) {
      log('User is ineligible to vote - navigating to faux-TV view');
      navigateToFauxTV();
      return;
    }

    // Show voting UI
    showVotingUI();
  }

  /**
   * Show the voting UI with nominees and instruction card
   */
  function showVotingUI() {
    log('Showing voting UI');

    state.active = true;

    // Clear any existing UI
    cleanup(false);

    // Create container
    const container = document.createElement('div');
    container.className = 'eviction-ui-container';
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', 'Eviction voting');

    // Create instruction card
    const card = createInstructionCard();
    container.appendChild(card);

    // Create nominee roster
    const roster = createNomineeRoster();
    container.appendChild(roster);

    // Append to body or TV overlay
    const tvOverlay = document.getElementById('tvOverlay') || document.getElementById('tv');
    const target = tvOverlay || document.body;
    
    if (!target) {
      console.error('[EvictionUI] No target element found for UI');
      return;
    }

    target.appendChild(container);
    state.container = container;

    // Apply CSS class to body for styling hooks
    document.body.classList.add('eviction-voting-active');

    log('Voting UI rendered');
  }

  /**
   * Create instruction card
   */
  function createInstructionCard() {
    const card = document.createElement('div');
    card.className = 'eviction-instruction-card';
    card.setAttribute('role', 'alert');
    card.setAttribute('aria-live', 'polite');

    const heading = document.createElement('h3');
    heading.textContent = 'Live Eviction Vote';
    card.appendChild(heading);

    const instruction = document.createElement('p');
    instruction.className = 'eviction-instruction-text';
    instruction.textContent = 'Double-tap on the nominee you want to evict';
    card.appendChild(instruction);

    const hint = document.createElement('p');
    hint.className = 'eviction-instruction-hint';
    hint.textContent = 'Keyboard: Use Tab to navigate, then press Enter or Space to select';
    card.appendChild(hint);

    return card;
  }

  /**
   * Create nominee roster with avatars
   */
  function createNomineeRoster() {
    const roster = document.createElement('div');
    roster.className = 'eviction-nominee-roster';
    roster.setAttribute('role', 'list');

    state.nominees.forEach(nominee => {
      const tile = createNomineeTile(nominee);
      roster.appendChild(tile);
    });

    return roster;
  }

  /**
   * Create a single nominee tile
   */
  function createNomineeTile(nominee) {
    const tile = document.createElement('div');
    tile.className = 'eviction-nominee glow';
    tile.dataset.nomineeId = nominee.id;
    tile.setAttribute('role', 'button');
    tile.setAttribute('tabindex', '0');
    tile.setAttribute('aria-label', `Vote to evict ${nominee.name}. Double-tap or press Enter to confirm.`);

    // Avatar
    const avatarContainer = document.createElement('div');
    avatarContainer.className = 'eviction-nominee-avatar';

    const avatar = document.createElement('img');
    avatar.src = nominee.avatarUrl || getDefaultAvatar(nominee.name);
    avatar.alt = nominee.name;
    avatar.loading = 'eager';

    // Handle image load error
    avatar.onerror = function() {
      console.warn(`[EvictionUI] Failed to load avatar for ${nominee.name}`);
      this.src = getDefaultAvatar(nominee.name);
    };

    avatarContainer.appendChild(avatar);
    tile.appendChild(avatarContainer);

    // Name label
    const nameLabel = document.createElement('div');
    nameLabel.className = 'eviction-nominee-name';
    nameLabel.textContent = nominee.name;
    tile.appendChild(nameLabel);

    // Attach double-tap detector
    const detector = global.DoubleTapUtil.createSingleUseDetector(
      tile,
      (event, data) => {
        log('Double-tap detected on nominee', nominee.name, data);
        handleVoteCast(nominee);
      },
      {
        tapWindow: state.config.tapWindow,
        debugMode: state.config.debugMode
      }
    );

    state.detectors.push(detector);

    // Keyboard support
    tile.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        log('Keyboard activation on nominee', nominee.name);
        handleVoteCast(nominee);
      }
    });

    return tile;
  }

  /**
   * Get default avatar URL (fallback)
   */
  function getDefaultAvatar(name) {
    const seed = encodeURIComponent(name || 'player');
    return `https://api.dicebear.com/6.x/bottts/svg?seed=${seed}`;
  }

  /**
   * Handle vote cast
   */
  function handleVoteCast(nominee) {
    // Prevent duplicate votes
    if (state.voteCast) {
      log('Vote already cast - ignoring');
      return;
    }

    log('Casting vote for nominee', nominee.name);

    state.voteCast = true;
    state.votedNomineeId = nominee.id;

    // Disable all detectors
    state.detectors.forEach(detector => {
      if (detector && typeof detector.destroy === 'function') {
        detector.destroy();
      }
    });
    state.detectors = [];

    // Disable all tiles
    const tiles = document.querySelectorAll('.eviction-nominee');
    tiles.forEach(tile => {
      tile.classList.remove('glow');
      tile.classList.add('disabled');
      tile.setAttribute('aria-disabled', 'true');
      tile.removeAttribute('tabindex');

      // Highlight voted tile
      if (tile.dataset.nomineeId === String(nominee.id)) {
        tile.classList.add('voted');
      }
    });

    // Show visual confirmation
    showConfirmation(nominee);

    // Emit vote event
    emitVoteEvent(nominee);

    // Continue flow after delay
    setTimeout(() => {
      continueFlow();
    }, state.config.confirmationDelay);
  }

  /**
   * Show visual confirmation of vote
   */
  function showConfirmation(nominee) {
    // Update instruction card
    const card = document.querySelector('.eviction-instruction-card');
    if (card) {
      card.classList.add('confirmed');
      
      const heading = card.querySelector('h3');
      if (heading) {
        heading.textContent = 'Vote Cast';
      }

      const instruction = card.querySelector('.eviction-instruction-text');
      if (instruction) {
        instruction.textContent = `You voted to evict ${nominee.name}`;
        instruction.classList.add('confirmed-text');
      }

      const hint = card.querySelector('.eviction-instruction-hint');
      if (hint) {
        hint.style.display = 'none';
      }
    }

    // Show toast/animation
    showToast(`Your vote to evict ${nominee.name} has been recorded.`);
  }

  /**
   * Show toast notification
   */
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'eviction-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = message;

    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });

    // Auto-remove after animation
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  /**
   * Emit vote event to game bus
   */
  function emitVoteEvent(nominee) {
    const bus = getBus();
    if (!bus) {
      console.error('[EvictionUI] Cannot emit vote event - no bus available');
      return;
    }

    const voterId = global.game?.humanId || global.game?.local?.id || null;
    if (voterId === null) {
      console.error('[EvictionUI] Cannot emit vote event - no voter ID');
      return;
    }

    const payload = {
      voterId: voterId,
      nomineeId: nominee.id,
      timestamp: Date.now(),
      phaseId: state.phaseId
    };

    log('Emitting eviction:vote:cast event', payload);

    try {
      bus.emit('eviction:vote:cast', payload);
      log('Vote event emitted successfully');
    } catch (error) {
      console.error('[EvictionUI] Failed to emit vote event:', error);
    }
  }

  /**
   * Continue to next part of flow (faux-TV/diary-room view)
   */
  function continueFlow() {
    log('Continuing to faux-TV view');

    // Clean up UI
    cleanup(true);

    // Navigate to faux-TV view
    navigateToFauxTV();
  }

  /**
   * Navigate to faux-TV view to observe other votes
   */
  function navigateToFauxTV() {
    log('Navigating to faux-TV view');

    // Use existing app function if available
    if (typeof global.beginDiaryRoomSequence === 'function') {
      log('Using existing beginDiaryRoomSequence function');
      global.beginDiaryRoomSequence();
      return;
    }

    // Fallback: emit event for other systems to handle
    const bus = getBus();
    if (bus) {
      bus.emit('eviction:continue-to-faux-tv');
    }

    // Additional fallback: update UI to show waiting state
    const panel = document.querySelector('#panel');
    if (panel) {
      panel.innerHTML = '<div class="eviction-waiting"><h3>Eviction in Progress</h3><p>Watching other houseguests cast their votes...</p></div>';
    }
  }

  /**
   * Clean up UI and detectors
   * @param {boolean} removeFromDOM - Whether to remove container from DOM
   */
  function cleanup(removeFromDOM = true) {
    log('Cleaning up', { removeFromDOM });

    // Destroy all detectors
    state.detectors.forEach(detector => {
      if (detector && typeof detector.destroy === 'function') {
        detector.destroy();
      }
    });
    state.detectors = [];

    // Remove container if requested
    if (removeFromDOM && state.container) {
      state.container.remove();
      state.container = null;
    }

    // Remove body class
    document.body.classList.remove('eviction-voting-active');

    // Reset state
    state.active = false;
    state.nominees = [];
    state.voteCast = false;
    state.votedNomineeId = null;
  }

  /**
   * Emergency abort (called if phase closes before vote)
   */
  function abort() {
    log('Aborting eviction UI');

    // Destroy detectors
    state.detectors.forEach(detector => {
      if (detector && typeof detector.destroy === 'function') {
        detector.destroy();
      }
    });
    state.detectors = [];

    // Remove UI
    if (state.container) {
      state.container.remove();
      state.container = null;
    }

    document.body.classList.remove('eviction-voting-active');

    state.active = false;
  }

  /**
   * Get current state (for debugging/testing)
   */
  function getState() {
    return { ...state, detectors: state.detectors.length };
  }

  /**
   * Update configuration
   */
  function configure(newConfig) {
    state.config = { ...state.config, ...newConfig };
    log('Configuration updated', state.config);
  }

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  // Export public API
  global.EvictionUI = {
    initialize,
    cleanup,
    abort,
    getState,
    configure
  };

  console.info('[EvictionUI] Module loaded');

})(window);
