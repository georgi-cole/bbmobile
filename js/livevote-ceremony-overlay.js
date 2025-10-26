// MODULE: livevote-ceremony-overlay.js
// Full-screen ceremony overlay for mobile live vote Part 2 (post-user vote)
// Runs the remainder of the eviction flow in ordered, sequential steps:
// 1. Rollout: "Voting in progress" with progress pill and feed line
// 2. Announcement: "By a vote of X to Y, [Name] has been evicted"
// 3. Evictee Reveal: Centered portrait with black-and-white fade
//
// Mobile-first, safe-area aware, never overlaps or gets cut off on phones.

(function(global) {
  'use strict';

  // State
  const state = {
    overlay: null,
    currentStep: null,
    expectedVotes: 0,
    receivedVotes: 0,
    nominees: [],
    container: null,
    onComplete: null
  };

  // Get avatar helper (fallback to global if available)
  function getAvatarUrl(playerId) {
    if (global.resolveAvatar) {
      const player = global.getP?.(playerId);
      if (player) {
        return global.resolveAvatar(player) || getDicebearUrl(player.name);
      }
    }
    const player = global.getP?.(playerId);
    if (player?.avatar) return player.avatar;
    return getDicebearUrl(global.safeName?.(playerId) || 'player');
  }

  function getDicebearUrl(seed) {
    return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(seed || 'player')}`;
  }

  // Sleep helper
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create and show the ceremony overlay
   * @param {Object} options - Configuration options
   * @param {number} options.expectedVotes - Total number of expected votes
   * @param {Array} options.nominees - Array of nominee IDs
   * @param {Function} options.onComplete - Callback when ceremony completes
   * @returns {HTMLElement|null} The overlay element
   */
  function show(options = {}) {
    const {
      expectedVotes = 0,
      nominees = [],
      onComplete = null
    } = options;

    // Initialize state
    state.expectedVotes = expectedVotes;
    state.receivedVotes = 0;
    state.nominees = nominees;
    state.currentStep = null;
    state.onComplete = onComplete;

    // Lock body scroll
    lockBodyScroll();

    // Create overlay element - full-screen with dimmed backdrop
    const overlay = document.createElement('div');
    overlay.className = 'lv-ceremony-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Live vote ceremony');

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      overlay.classList.add('reduce-motion');
    }

    // Content container - centered, safe-area aware
    const content = document.createElement('div');
    content.className = 'lv-ceremony__content';
    overlay.appendChild(content);

    // Add to body
    document.body.appendChild(overlay);
    state.overlay = overlay;
    state.container = content;

    // Fade in overlay
    requestAnimationFrame(() => {
      overlay.classList.add('visible');
    });

    return overlay;
  }

  /**
   * Hide and cleanup the ceremony overlay
   */
  function hide() {
    if (!state.overlay) return;

    // Fade out
    const overlay = state.overlay;
    overlay.classList.remove('visible');

    setTimeout(() => {
      if (overlay && overlay.parentNode) {
        overlay.remove();
      }
    }, 300);

    // Unlock body scroll
    unlockBodyScroll();

    // Call completion callback
    if (state.onComplete) {
      state.onComplete();
    }

    // Reset state
    state.overlay = null;
    state.container = null;
    state.currentStep = null;
    state.expectedVotes = 0;
    state.receivedVotes = 0;
    state.nominees = [];
    state.onComplete = null;
  }

  /**
   * Step 1: Show rollout ("Voting in progress" with progress and feed)
   * @param {Object} options - Rollout options
   * @param {number} options.expectedVotes - Total expected votes
   */
  function showRollout(options = {}) {
    if (!state.container) return;

    const { expectedVotes = state.expectedVotes } = options;
    state.expectedVotes = expectedVotes;
    state.receivedVotes = 0;
    state.currentStep = 'rollout';

    // Clear content
    state.container.innerHTML = '';

    // Create rollout card
    const card = document.createElement('div');
    card.className = 'lv-ceremony__card';

    // Header
    const header = document.createElement('div');
    header.className = 'lv-ceremony__header';
    header.textContent = 'Voting in progress';
    card.appendChild(header);

    // Progress pill (N/M format)
    const progress = document.createElement('div');
    progress.className = 'lv-ceremony__progress';
    progress.textContent = `${state.receivedVotes}/${state.expectedVotes}`;
    card.appendChild(progress);

    // Feed container (single line)
    const feed = document.createElement('div');
    feed.className = 'lv-ceremony__feed';
    feed.setAttribute('role', 'log');
    feed.setAttribute('aria-live', 'polite');
    card.appendChild(feed);

    state.container.appendChild(card);

    // Fade in card
    requestAnimationFrame(() => {
      card.classList.add('visible');
    });
  }

  /**
   * Add a vote to the rollout feed
   * @param {Object} vote - Vote details
   * @param {number} vote.voterId - Voter's player ID
   * @param {string} vote.voterName - Voter's name
   * @param {number} vote.targetId - Target nominee ID
   * @param {string} vote.targetName - Target nominee name
   */
  async function addVote(vote) {
    if (!state.container || state.currentStep !== 'rollout') return;

    const feed = state.container.querySelector('.lv-ceremony__feed');
    if (!feed) return;

    const { voterId, voterName, targetId, targetName } = vote;

    // Clear previous feed item (only show one at a time)
    feed.innerHTML = '';

    // Create feed item
    const item = document.createElement('div');
    item.className = 'lv-ceremony__feed-item';

    // Voter avatar
    const avatar = document.createElement('img');
    avatar.className = 'lv-ceremony__avatar';
    avatar.src = getAvatarUrl(voterId);
    avatar.alt = `${voterName}'s avatar`;
    avatar.loading = 'eager';
    avatar.onerror = () => {
      avatar.src = getDicebearUrl(voterName);
    };
    item.appendChild(avatar);

    // Vote text
    const text = document.createElement('div');
    text.className = 'lv-ceremony__text';
    text.textContent = `${voterName}: I vote to evict ${targetName}`;
    item.appendChild(text);

    feed.appendChild(item);

    // Update progress
    state.receivedVotes++;
    updateProgress(state.receivedVotes);

    // Fade in
    await sleep(50);
    item.classList.add('visible');
  }

  /**
   * Update progress count (N/M format)
   * @param {number} received - Number of votes received
   */
  function updateProgress(received) {
    if (!state.container) return;

    state.receivedVotes = received;

    const progress = state.container.querySelector('.lv-ceremony__progress');
    if (progress) {
      progress.textContent = `${state.receivedVotes}/${state.expectedVotes}`;
    }
  }

  /**
   * Step 2: Show announcement ("By a vote of X to Y, [Name] has been evicted")
   * @param {Object} options - Announcement options
   * @param {string} options.title - Card title (e.g., "Eviction Result")
   * @param {Array<string>} options.body - Body text lines
   * @param {number} options.duration - Display duration in ms
   * @param {string} options.tone - Tone class (e.g., "evict")
   */
  async function showAnnouncement(options = {}) {
    if (!state.container) return;

    const {
      title = 'Eviction Result',
      body = [],
      duration = 3800,
      tone = 'evict'
    } = options;

    state.currentStep = 'announcement';

    // Fade out previous content
    const existingCard = state.container.querySelector('.lv-ceremony__card');
    if (existingCard) {
      existingCard.classList.remove('visible');
      await sleep(300);
    }

    // Clear content
    state.container.innerHTML = '';

    // Create announcement card
    const card = document.createElement('div');
    card.className = 'lv-ceremony__card';
    if (tone) {
      card.classList.add(`tone-${tone}`);
    }

    // Title
    const h3 = document.createElement('h3');
    h3.className = 'lv-ceremony__title';
    h3.textContent = title;
    card.appendChild(h3);

    // Body content
    const bodyDiv = document.createElement('div');
    bodyDiv.className = 'lv-ceremony__body';
    const bodyLines = Array.isArray(body) ? body : [body];
    bodyLines.forEach(line => {
      const lineDiv = document.createElement('div');
      lineDiv.className = 'lv-ceremony__line';
      lineDiv.textContent = line;
      bodyDiv.appendChild(lineDiv);
    });
    card.appendChild(bodyDiv);

    state.container.appendChild(card);

    // Fade in card
    await sleep(50);
    card.classList.add('visible');

    // Hold for duration
    await sleep(duration);
  }

  /**
   * Step 3: Show evictee reveal (centered portrait with black-and-white fade)
   * @param {Object} options - Evictee options
   * @param {number} options.evictedId - Evicted player ID
   * @param {string} options.evictedName - Evicted player name
   * @param {number} options.holdMs - Hold duration in ms
   */
  async function showEvictee(options = {}) {
    if (!state.container) return;

    const {
      evictedId,
      evictedName,
      holdMs = 3500
    } = options;

    if (!evictedId || !evictedName) {
      console.warn('[CeremonyOverlay] Missing evictedId or evictedName');
      return;
    }

    state.currentStep = 'evictee';

    // Fade out previous content
    const existingCard = state.container.querySelector('.lv-ceremony__card');
    if (existingCard) {
      existingCard.classList.remove('visible');
      await sleep(300);
    }

    // Clear content
    state.container.innerHTML = '';

    // Create evictee card
    const card = document.createElement('div');
    card.className = 'lv-ceremony__card lv-ceremony__evictee-card';

    // Portrait container
    const portraitEl = document.createElement('div');
    portraitEl.className = 'lv-ceremony__portrait';

    // Portrait image
    const img = document.createElement('img');
    img.src = getAvatarUrl(evictedId);
    img.alt = evictedName;
    img.onerror = function() {
      console.warn(`[CeremonyOverlay] Failed to load evictee avatar for ${evictedName}`);
      this.onerror = null;
      this.src = getDicebearUrl(evictedName);
    };
    portraitEl.appendChild(img);

    // Name label
    const nameEl = document.createElement('div');
    nameEl.className = 'lv-ceremony__evictee-name';
    nameEl.textContent = evictedName;

    card.appendChild(portraitEl);
    card.appendChild(nameEl);

    state.container.appendChild(card);

    // Fade in card
    await sleep(100);
    card.classList.add('visible');

    // Wait for portrait to be visible
    await sleep(800);

    // Animate to black-and-white
    portraitEl.classList.add('grayscale');

    // Hold the portrait
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const remainingHold = prefersReducedMotion
      ? Math.max(holdMs * 0.6, 1000)
      : Math.max(holdMs - 800, 1200);
    await sleep(remainingHold);

    // Fade out card
    card.classList.remove('visible');
    await sleep(400);
  }

  /**
   * Lock body scroll (prevent background scrolling on mobile)
   */
  function lockBodyScroll() {
    const body = document.body;
    if (!body) return;

    const scrollY = window.scrollY;
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.dataset.scrollLocked = 'true';
    body.dataset.scrollY = String(scrollY);
  }

  /**
   * Unlock body scroll
   */
  function unlockBodyScroll() {
    const body = document.body;
    if (!body || body.dataset.scrollLocked !== 'true') return;

    const scrollY = parseInt(body.dataset.scrollY || '0', 10);
    body.style.position = '';
    body.style.top = '';
    body.style.width = '';
    delete body.dataset.scrollLocked;
    delete body.dataset.scrollY;
    window.scrollTo(0, scrollY);
  }

  /**
   * Check if ceremony overlay should be used (mobile viewport detection)
   * @returns {boolean}
   */
  function shouldUseCeremonyOverlay() {
    // Use TVFit engine if available
    if (global.TVFit) {
      return global.TVFit.isMobile() || global.TVFit.isNarrow();
    }

    // Fallback to viewport detection
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isPortrait = height > width;
    const isNarrow = width < 820;

    return isNarrow || isPortrait;
  }

  // Export public API
  global.LiveVoteCeremonyOverlay = {
    show,
    hide,
    showRollout,
    addVote,
    updateProgress,
    showAnnouncement,
    showEvictee,
    shouldUseCeremonyOverlay,
    isShowing: () => state.overlay !== null,
    getCurrentStep: () => state.currentStep
  };

})(window);
