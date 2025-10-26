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

    // Hide legacy LV1 elements (panel content, tally bars, voter lists)
    hideLegacyLV1Elements();

    // Set phase to 'rollout' to manage TV classes
    if (global.lv2 && global.lv2.setPhase) {
      global.lv2.setPhase('rollout');
    }

    // Create overlay element - tv-card pattern
    const overlay = document.createElement('div');
    overlay.className = 'lv-rollout-overlay tv-card';
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

    // Progress pill (N/M format)
    const progress = document.createElement('div');
    progress.className = 'lv-rollout__progress';
    progress.textContent = `${state.receivedVotes}/${state.expectedVotes}`;
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

  // Hide legacy LV1 elements (tally bars, voter lists, old panels)
  function hideLegacyLV1Elements() {
    // Hide panel content if it contains legacy vote UI
    const panel = document.querySelector('#panel');
    if (panel) {
      // Hide tally bars and voter lists
      const tallyBars = panel.querySelectorAll('.lvBarWrap, .lvBar, #lvMultiList, #liveVoteList');
      tallyBars.forEach(el => {
        el.style.display = 'none';
      });
      
      // Hide any legacy vote UI containers
      const legacyContainers = panel.querySelectorAll('.lvCol, .minigame-host');
      legacyContainers.forEach(el => {
        // Only hide if it contains vote-related content
        if (el.textContent.includes('Live Tally') || el.textContent.includes('Voters:')) {
          el.style.display = 'none';
        }
      });
    }
    
    // Hide any lv2 overlay elements that might be lingering
    const lv2Overlay = document.querySelector('.lv2-overlay');
    if (lv2Overlay) {
      // Hide nominees and feed during rollout
      const nominees = lv2Overlay.querySelectorAll('.lv2-contestant');
      const voterFeed = lv2Overlay.querySelector('.lv2-voter-feed');
      nominees.forEach(el => {
        el.style.opacity = '0.3';
        el.style.pointerEvents = 'none';
      });
      if (voterFeed) {
        voterFeed.style.opacity = '0.3';
      }
    }
  }

  // Restore legacy LV1 elements when rollout is hidden
  function restoreLegacyLV1Elements() {
    const panel = document.querySelector('#panel');
    if (panel) {
      const hiddenElements = panel.querySelectorAll('[style*="display: none"]');
      hiddenElements.forEach(el => {
        el.style.display = '';
      });
    }
    
    // Restore lv2 overlay elements
    const lv2Overlay = document.querySelector('.lv2-overlay');
    if (lv2Overlay) {
      const nominees = lv2Overlay.querySelectorAll('.lv2-contestant');
      const voterFeed = lv2Overlay.querySelector('.lv2-voter-feed');
      nominees.forEach(el => {
        el.style.opacity = '';
        el.style.pointerEvents = '';
      });
      if (voterFeed) {
        voterFeed.style.opacity = '';
      }
    }
  }

  // Handle keyboard interactions
  function handleKeyboard(event) {
    if (!state.overlay) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      hide();
    }
  }

  // Update progress count (N/M format)
  function updateProgress(received) {
    if (!state.overlay) return;

    state.receivedVotes = received;

    const progress = state.overlay.querySelector('.lv-rollout__progress');
    if (progress) {
      progress.textContent = `${state.receivedVotes}/${state.expectedVotes}`;
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
    if (state.overlay) {
      // Fade out before removing
      state.overlay.style.opacity = '0';
      state.overlay.style.transition = 'opacity 0.3s ease-out';
      
      setTimeout(() => {
        if (state.overlay) {
          state.overlay.remove();
          state.overlay = null;
        }
      }, 300);
    }

    // Restore legacy LV1 elements
    restoreLegacyLV1Elements();

    // Clear phase
    if (global.lv2 && global.lv2.setPhase) {
      global.lv2.setPhase(null);
    }

    // Reset state
    state.expectedVotes = 0;
    state.receivedVotes = 0;
    state.nominees = [];
    state.container = null;
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
