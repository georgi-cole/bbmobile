// MODULE: livevote-rollout.js
// Renders a contained, centered "Voting in progress" overlay during live vote rollout
// Shows progress pill (received/expected) and single feed line
// Safe-area aware and accessible on mobile

(function(global) {
  'use strict';

  // State
  const state = {
    overlay: null,
    expectedVotes: 0,
    receivedVotes: 0,
    nominees: [],
    container: null
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

  // Create and show the rollout overlay
  function show(options = {}) {
    const {
      expectedVotes = 0,
      nominees = [],
      container = null
    } = options;

    // Find container (either provided or default to TV)
    const targetContainer = container || document.querySelector('#tv');
    if (!targetContainer) {
      console.warn('[LiveVoteRollout] No container found');
      return null;
    }

    // Initialize state
    state.expectedVotes = expectedVotes;
    state.receivedVotes = 0;
    state.nominees = nominees;

    // Create overlay element
    const overlay = document.createElement('div');
    overlay.className = 'lv-rollout-overlay';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.setAttribute('aria-label', 'Voting in progress');
    overlay.setAttribute('tabindex', '0');

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      overlay.classList.add('reduce-motion');
    }

    // Header
    const header = document.createElement('div');
    header.className = 'lv-rollout__header';
    header.textContent = 'Voting in progress';
    overlay.appendChild(header);

    // Progress pill
    const progress = document.createElement('div');
    progress.className = 'lv-rollout__progress';
    progress.textContent = `Waiting for votes… ${state.receivedVotes}/${state.expectedVotes}`;
    overlay.appendChild(progress);

    // Feed container (single line at bottom)
    const feed = document.createElement('div');
    feed.className = 'lv-rollout__feed';
    feed.setAttribute('role', 'log');
    feed.setAttribute('aria-live', 'polite');
    overlay.appendChild(feed);

    // Add keyboard handler
    overlay.addEventListener('keydown', handleKeyboard);

    // Add to container
    targetContainer.appendChild(overlay);
    state.overlay = overlay;
    state.container = targetContainer;

    return overlay;
  }

  // Handle keyboard interactions
  function handleKeyboard(event) {
    if (!state.overlay) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      hide();
    }
  }

  // Update progress count
  function updateProgress(received) {
    if (!state.overlay) return;

    state.receivedVotes = received;

    const progress = state.overlay.querySelector('.lv-rollout__progress');
    if (progress) {
      progress.textContent = `Waiting for votes… ${state.receivedVotes}/${state.expectedVotes}`;
    }
  }

  // Add a vote to the feed
  function addVote(vote) {
    if (!state.overlay) return;

    const feed = state.overlay.querySelector('.lv-rollout__feed');
    if (!feed) return;

    const { voterId, voterName, targetName } = vote;

    // Clear previous feed item (only show one at a time)
    feed.innerHTML = '';

    // Create feed item
    const item = document.createElement('div');
    item.className = 'lv-rollout__feed-item';

    // Voter avatar
    const avatar = document.createElement('img');
    avatar.className = 'lv-rollout__avatar';
    avatar.src = getAvatarUrl(voterId);
    avatar.alt = `${voterName}'s avatar`;
    avatar.loading = 'eager';
    avatar.onerror = () => {
      avatar.src = getDicebearUrl(voterName);
    };
    item.appendChild(avatar);

    // Vote text
    const text = document.createElement('div');
    text.className = 'lv-rollout__text';
    text.textContent = `${voterName}: I vote to evict ${targetName}`;
    item.appendChild(text);

    feed.appendChild(item);

    // Update progress
    state.receivedVotes++;
    updateProgress(state.receivedVotes);

    // Fade in
    requestAnimationFrame(() => {
      item.classList.add('visible');
    });
  }

  // Remove the rollout overlay
  function hide() {
    if (!state.overlay) {
      // Already hidden, just reset state to be safe
      state.expectedVotes = 0;
      state.receivedVotes = 0;
      state.nominees = [];
      state.container = null;
      return;
    }

    // Store reference to overlay before clearing state
    const overlayToRemove = state.overlay;
    
    // Immediately clear state so isShowing() returns false
    state.overlay = null;
    state.expectedVotes = 0;
    state.receivedVotes = 0;
    state.nominees = [];
    state.container = null;
    
    // Fade out before removing from DOM
    overlayToRemove.style.opacity = '0';
    overlayToRemove.style.transition = 'opacity 0.3s ease-out';
    
    setTimeout(() => {
      // Remove from DOM after fade completes
      if (overlayToRemove.parentNode) {
        overlayToRemove.remove();
      }
    }, 300);
  }

  // Export public API
  global.LiveVoteRollout = {
    show,
    hide,
    updateProgress,
    addVote,
    isShowing: () => state.overlay !== null
  };

})(window);
