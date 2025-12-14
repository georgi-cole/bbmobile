// MODULE: livevote-nomination-ui.js
// Full-screen nomination-style modal overlay for live vote casting
// Provides a unified, accessible interface matching the nominations flow
// Supports 2 and 3 nominee layouts with keyboard shortcuts and emoji animations

(function(global) {
  'use strict';

  const LOG_PREFIX = '[lv-nom-ui]';

  // State
  const state = {
    isOpen: false,
    overlay: null,
    nominees: [],
    timeoutSecs: null,
    onVote: null,
    selectedId: null,
    countdownInterval: null,
    escapeHandler: null,
    keyboardHandler: null
  };

  // Constants
  const EMOJI_POOL = ['😊', '😢', '😡', '😱', '🤔', '😬', '🙏', '💔', '⭐', '🔥', '💯', '👀'];
  const EMOJI_COUNT = 12;
  const EMOJI_SPAWN_INTERVAL = 300; // Spawn new emoji every 300ms

  /**
   * Get avatar URL for a player
   * @param {number} playerId - Player ID
   * @returns {string} Avatar URL
   */
  function getAvatarUrl(playerId) {
    const player = global.getP?.(playerId);
    if (!player) return getDicebearUrl(global.safeName?.(playerId) || 'player');
    
    if (global.resolveAvatar) {
      return global.resolveAvatar(player) || getDicebearUrl(player.name);
    }
    
    return player.avatar || getDicebearUrl(player.name);
  }

  /**
   * Get Dicebear avatar URL
   * @param {string} seed - Seed for avatar generation
   * @returns {string} Avatar URL
   */
  function getDicebearUrl(seed) {
    return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(seed || 'player')}`;
  }

  /**
   * Create and animate floating emojis in the backdrop
   * @param {HTMLElement} backdrop - Backdrop element to append emojis to
   */
  function createFloatingEmojis(backdrop) {
    let emojiCount = 0;
    const maxEmojis = EMOJI_COUNT;

    function spawnEmoji() {
      if (emojiCount >= maxEmojis || !state.isOpen) return;

      const emoji = document.createElement('div');
      emoji.className = 'lvnom-emoji';
      emoji.textContent = EMOJI_POOL[Math.floor(Math.random() * EMOJI_POOL.length)];
      
      // Random horizontal position
      emoji.style.left = `${Math.random() * 100}%`;
      
      // Random animation duration (3-5 seconds)
      const duration = 3000 + Math.random() * 2000;
      emoji.style.animationDuration = `${duration}ms`;
      
      backdrop.appendChild(emoji);
      emojiCount++;

      // Remove emoji after animation completes
      setTimeout(() => {
        if (emoji.parentElement) {
          emoji.remove();
          emojiCount--;
        }
      }, duration);
    }

    // Spawn emojis at intervals
    const spawnInterval = setInterval(() => {
      if (!state.isOpen) {
        clearInterval(spawnInterval);
        return;
      }
      spawnEmoji();
    }, EMOJI_SPAWN_INTERVAL);

    // Initial burst of emojis
    for (let i = 0; i < 5; i++) {
      setTimeout(() => spawnEmoji(), i * 100);
    }
  }

  /**
   * Create the nominee card element
   * @param {Object} nominee - Nominee data { id, name, avatar }
   * @param {number} index - Nominee index (for keyboard shortcuts)
   * @returns {HTMLElement} Nominee card element
   */
  function createNomineeCard(nominee, index) {
    const card = document.createElement('div');
    card.className = 'lvnom-nominee-card';
    card.dataset.nomineeId = nominee.id;
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Evict ${nominee.name}. Press ${index + 1} or Enter to select.`);

    // Avatar
    const avatarWrap = document.createElement('div');
    avatarWrap.className = 'lvnom-avatar-wrap';
    
    const avatar = document.createElement('img');
    avatar.className = 'lvnom-avatar';
    avatar.src = nominee.avatar || getAvatarUrl(nominee.id);
    avatar.alt = nominee.name;
    avatarWrap.appendChild(avatar);
    card.appendChild(avatarWrap);

    // Name
    const name = document.createElement('div');
    name.className = 'lvnom-name';
    name.textContent = nominee.name;
    card.appendChild(name);

    // Keyboard shortcut hint
    const hint = document.createElement('div');
    hint.className = 'lvnom-kbd-hint';
    hint.textContent = `Press ${index + 1}`;
    card.appendChild(hint);

    // Click handler
    card.addEventListener('click', () => selectNominee(nominee.id));
    
    // Enter/Space handler
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectNominee(nominee.id);
      }
    });

    return card;
  }

  /**
   * Select a nominee (update visual state)
   * @param {number} nomineeId - ID of the selected nominee
   */
  function selectNominee(nomineeId) {
    if (!state.isOpen) return;

    console.log(LOG_PREFIX, 'Nominee selected:', nomineeId);
    state.selectedId = nomineeId;

    // Update visual state
    const cards = state.overlay.querySelectorAll('.lvnom-nominee-card');
    cards.forEach(card => {
      if (card.dataset.nomineeId === String(nomineeId)) {
        card.classList.add('selected');
        card.setAttribute('aria-pressed', 'true');
      } else {
        card.classList.remove('selected');
        card.setAttribute('aria-pressed', 'false');
      }
    });

    // Enable submit button
    const submitBtn = state.overlay.querySelector('.lvnom-btn-primary');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.focus(); // Move focus to submit button
    }
  }

  /**
   * Submit the vote
   */
  function submitVote() {
    if (!state.selectedId || !state.onVote) {
      console.warn(LOG_PREFIX, 'Cannot submit vote: no selection or callback');
      return;
    }

    console.log(LOG_PREFIX, 'Submitting vote for:', state.selectedId);
    
    // Call the callback with selected ID
    const callback = state.onVote;
    const selectedId = state.selectedId;
    
    // Hide the overlay first
    hide();
    
    // Then trigger the callback
    callback(selectedId);
  }

  /**
   * Format countdown timer
   * @param {number} seconds - Seconds remaining
   * @returns {string} Formatted time (MM:SS)
   */
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * Start countdown timer
   */
  function startCountdown() {
    if (state.timeoutSecs === null || state.timeoutSecs <= 0) return;

    let remaining = state.timeoutSecs;
    const timerEl = state.overlay?.querySelector('.lvnom-timer');
    
    if (timerEl) {
      timerEl.textContent = formatTime(remaining);
      timerEl.setAttribute('aria-live', 'polite');
    }

    state.countdownInterval = setInterval(() => {
      remaining--;
      
      if (timerEl) {
        timerEl.textContent = formatTime(remaining);
        
        // Add warning class when time is low
        if (remaining <= 10) {
          timerEl.classList.add('warning');
        }
      }

      if (remaining <= 0) {
        clearInterval(state.countdownInterval);
        state.countdownInterval = null;
        
        // Auto-close on timeout (no vote)
        console.log(LOG_PREFIX, 'Timer expired, closing overlay');
        hide();
      }
    }, 1000);
  }

  /**
   * Lock body scroll
   */
  function lockBodyScroll() {
    const body = document.body;
    const html = document.documentElement;
    if (!body || !html) return;

    const scrollY = window.scrollY;
    body.dataset.lvnomScrollY = String(scrollY);
    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';
    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'contain';

    console.debug(LOG_PREFIX, 'Body scroll locked');
  }

  /**
   * Unlock body scroll
   */
  function unlockBodyScroll() {
    const body = document.body;
    const html = document.documentElement;
    if (!body || !html) return;

    const scrollY = parseInt(body.dataset.lvnomScrollY || '0', 10);

    body.style.overflow = '';
    body.style.touchAction = '';
    html.style.overflow = '';
    html.style.overscrollBehavior = '';

    delete body.dataset.lvnomScrollY;

    if (scrollY > 0) {
      window.scrollTo(0, scrollY);
    }

    console.debug(LOG_PREFIX, 'Body scroll unlocked');
  }

  /**
   * Show the live vote nomination overlay
   * @param {Object} options - Configuration options
   * @param {Array<Object>} options.nominees - Array of nominee objects { id, name, avatar }
   * @param {number} [options.timeoutSecs] - Optional countdown timer in seconds
   * @param {Function} options.onVote - Callback when vote is cast: onVote(selectedId)
   */
  function show(options) {
    if (!options || !Array.isArray(options.nominees) || options.nominees.length === 0) {
      console.warn(LOG_PREFIX, 'Invalid options:', options);
      return;
    }

    if (state.isOpen) {
      console.warn(LOG_PREFIX, 'Overlay already open, hiding first');
      hide();
    }

    console.log(LOG_PREFIX, 'Showing overlay with', options.nominees.length, 'nominees');

    // Store state
    state.nominees = options.nominees;
    state.timeoutSecs = options.timeoutSecs || null;
    state.onVote = options.onVote;
    state.selectedId = null;
    state.isOpen = true;

    // Lock body scroll
    lockBodyScroll();

    // Create overlay structure
    const overlay = document.createElement('div');
    overlay.className = 'livevote-nom-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'lvnom-title');
    state.overlay = overlay;

    // Backdrop (dimmed background)
    const backdrop = document.createElement('div');
    backdrop.className = 'lvnom-backdrop';
    overlay.appendChild(backdrop);

    // Start emoji animation
    createFloatingEmojis(backdrop);

    // Modal card
    const modal = document.createElement('div');
    modal.className = 'lvnom-modal';
    overlay.appendChild(modal);

    // Header
    const header = document.createElement('div');
    header.className = 'lvnom-header';
    
    const title = document.createElement('h2');
    title.id = 'lvnom-title';
    title.className = 'lvnom-title';
    title.textContent = 'Cast Your Vote';
    header.appendChild(title);

    const instruction = document.createElement('p');
    instruction.className = 'lvnom-instruction';
    instruction.textContent = 'Select one houseguest to evict:';
    header.appendChild(instruction);

    modal.appendChild(header);

    // Timer (if enabled)
    if (state.timeoutSecs && state.timeoutSecs > 0) {
      const timerWrap = document.createElement('div');
      timerWrap.className = 'lvnom-timer-wrap';
      
      const timer = document.createElement('div');
      timer.className = 'lvnom-timer';
      timer.textContent = formatTime(state.timeoutSecs);
      timerWrap.appendChild(timer);
      
      modal.appendChild(timerWrap);
    }

    // Nominees grid
    const grid = document.createElement('div');
    grid.className = `lvnom-grid lvnom-grid-${state.nominees.length}`;
    
    state.nominees.forEach((nominee, index) => {
      const card = createNomineeCard(nominee, index);
      grid.appendChild(card);
    });
    
    modal.appendChild(grid);

    // Action buttons
    const actions = document.createElement('div');
    actions.className = 'lvnom-actions';

    // Primary button (Evict)
    const evictBtn = document.createElement('button');
    evictBtn.className = 'lvnom-btn lvnom-btn-primary';
    evictBtn.textContent = 'Evict';
    evictBtn.disabled = true; // Disabled until selection
    evictBtn.addEventListener('click', submitVote);
    actions.appendChild(evictBtn);

    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'lvnom-btn lvnom-btn-secondary';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', hide);
    actions.appendChild(cancelBtn);

    modal.appendChild(actions);

    // Append to body
    document.body.appendChild(overlay);

    // Set up event listeners
    setupEventListeners();

    // Start countdown if enabled
    if (state.timeoutSecs && state.timeoutSecs > 0) {
      startCountdown();
    }

    // Focus first nominee card
    setTimeout(() => {
      const firstCard = overlay.querySelector('.lvnom-nominee-card');
      if (firstCard) firstCard.focus();
    }, 100);

    console.log(LOG_PREFIX, 'Overlay shown');
  }

  /**
   * Hide the live vote nomination overlay
   */
  function hide() {
    if (!state.isOpen) return;

    console.log(LOG_PREFIX, 'Hiding overlay');

    // Clear countdown
    if (state.countdownInterval) {
      clearInterval(state.countdownInterval);
      state.countdownInterval = null;
    }

    // Remove event listeners
    removeEventListeners();

    // Remove overlay from DOM
    if (state.overlay && state.overlay.parentElement) {
      state.overlay.remove();
    }

    // Unlock body scroll
    unlockBodyScroll();

    // Reset state
    state.isOpen = false;
    state.overlay = null;
    state.nominees = [];
    state.timeoutSecs = null;
    state.onVote = null;
    state.selectedId = null;

    console.log(LOG_PREFIX, 'Overlay hidden');
  }

  /**
   * Check if overlay is currently open
   * @returns {boolean} True if open
   */
  function isOpen() {
    return state.isOpen;
  }

  /**
   * Set up keyboard and escape handlers
   */
  function setupEventListeners() {
    // ESC key handler
    state.escapeHandler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        hide();
      }
    };
    document.addEventListener('keydown', state.escapeHandler);

    // Keyboard shortcuts (1, 2, 3)
    state.keyboardHandler = (e) => {
      const key = parseInt(e.key, 10);
      if (!isNaN(key) && key >= 1 && key <= state.nominees.length) {
        e.preventDefault();
        const nominee = state.nominees[key - 1];
        if (nominee) {
          selectNominee(nominee.id);
        }
      }
    };
    document.addEventListener('keydown', state.keyboardHandler);

    console.debug(LOG_PREFIX, 'Event listeners set up');
  }

  /**
   * Remove event listeners
   */
  function removeEventListeners() {
    if (state.escapeHandler) {
      document.removeEventListener('keydown', state.escapeHandler);
      state.escapeHandler = null;
    }

    if (state.keyboardHandler) {
      document.removeEventListener('keydown', state.keyboardHandler);
      state.keyboardHandler = null;
    }

    console.debug(LOG_PREFIX, 'Event listeners removed');
  }

  // ========== Public API ==========

  const LiveVoteNominationUI = {
    show,
    hide,
    isOpen
  };

  // Export to global namespace
  if (typeof global.LiveVoteNominationUI !== 'undefined') {
    console.warn(LOG_PREFIX, 'LiveVoteNominationUI already exists, overwriting');
  }
  global.LiveVoteNominationUI = LiveVoteNominationUI;

  console.log(LOG_PREFIX, 'Module loaded');

})(window);
