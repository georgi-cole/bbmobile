// MODULE: livevote-ceremony-overlay.js
// Full-screen Ceremony Overlay for mobile Live Vote Part 2 (post-user vote)
// Manages three sequential steps: rollout → announcement → final
// Safe-area aware, hides legacy LV1 elements, prevents overlap/cutoff on mobile

(function(global) {
  'use strict';

  // State
  const state = {
    overlay: null,
    container: null,
    currentStep: null, // 'rollout' | 'announcement' | 'final' | null
    rolloutData: {
      expectedVotes: 0,
      receivedVotes: 0,
      nominees: []
    },
    announcementData: {
      title: '',
      body: [],
      tone: 'evict'
    },
    finalData: {
      evictedId: null,
      evictedName: ''
    }
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

  // Detect if we should use ceremony overlay (mobile only by default)
  function shouldUseCeremonyOverlay() {
    // Use TVFit engine if available for mobile detection
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

  // Create and show the ceremony overlay
  function show(options = {}) {
    const { container = null } = options;

    // Check if we should use ceremony overlay
    if (!shouldUseCeremonyOverlay()) {
      console.log('[CeremonyOverlay] Skipping on desktop/wide viewport');
      return null;
    }

    // Find container (either provided or default to TV)
    const targetContainer = container || document.querySelector('#tv');
    if (!targetContainer) {
      console.warn('[CeremonyOverlay] No container found');
      return null;
    }

    // Hide legacy LV1 elements
    hideLegacyElements();

    // Create overlay element - full-screen with safe-area padding
    const overlay = document.createElement('div');
    overlay.className = 'lv-ceremony-overlay';
    overlay.setAttribute('role', 'region');
    overlay.setAttribute('aria-label', 'Live vote ceremony');

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      overlay.classList.add('reduce-motion');
    }

    // Step container (holds current step content)
    const stepContainer = document.createElement('div');
    stepContainer.className = 'lv-ceremony__step-container';
    overlay.appendChild(stepContainer);

    // Add to container
    targetContainer.appendChild(overlay);
    state.overlay = overlay;
    state.container = targetContainer;
    state.currentStep = null;

    return overlay;
  }

  // Hide legacy LV1 elements that might overlap
  function hideLegacyElements() {
    // Hide legacy live vote elements
    const legacySelectors = [
      '.legacy-livevote-note',
      '.legacy-your-turn',
      '.legacy-waiting',
      '.lv1-portrait',
      '.evict-confirm',
      '.lv-portrait-oversized',
      '.lv-action-banner',
      '.lv-vote-badge'
    ];

    legacySelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        el.style.display = 'none';
        el.dataset.ceremonyHidden = 'true';
      });
    });

    // Dim lv2 overlay if present
    const lv2Overlay = document.querySelector('.lv2-overlay');
    if (lv2Overlay) {
      lv2Overlay.classList.add('ceremony-dimmed');
    }

    // Dim panel if present
    const panel = document.querySelector('#panel');
    if (panel) {
      panel.classList.add('ceremony-dimmed');
    }
  }

  // Restore legacy LV1 elements
  function restoreLegacyElements() {
    // Restore hidden elements
    const hiddenElements = document.querySelectorAll('[data-ceremony-hidden="true"]');
    hiddenElements.forEach(el => {
      el.style.display = '';
      delete el.dataset.ceremonyHidden;
    });

    // Restore lv2 overlay
    const lv2Overlay = document.querySelector('.lv2-overlay');
    if (lv2Overlay) {
      lv2Overlay.classList.remove('ceremony-dimmed');
    }

    // Restore panel
    const panel = document.querySelector('#panel');
    if (panel) {
      panel.classList.remove('ceremony-dimmed');
    }
  }

  // Step 1: Rollout - "Voting in progress" with N/M progress and single feed line
  function showRolloutStep(options = {}) {
    if (!state.overlay) {
      console.warn('[CeremonyOverlay] Cannot show rollout: overlay not initialized');
      return;
    }

    const { expectedVotes = 0, nominees = [] } = options;
    state.currentStep = 'rollout';
    state.rolloutData = {
      expectedVotes,
      receivedVotes: 0,
      nominees
    };

    const stepContainer = state.overlay.querySelector('.lv-ceremony__step-container');
    if (!stepContainer) return;

    // Clear previous step content
    stepContainer.innerHTML = '';

    // Create rollout step content
    const rolloutStep = document.createElement('div');
    rolloutStep.className = 'lv-ceremony__step lv-ceremony__rollout';
    rolloutStep.setAttribute('role', 'status');
    rolloutStep.setAttribute('aria-live', 'polite');

    // Header
    const header = document.createElement('div');
    header.className = 'lv-ceremony__header';
    header.textContent = 'Voting in progress';
    rolloutStep.appendChild(header);

    // Progress pill (N/M format)
    const progress = document.createElement('div');
    progress.className = 'lv-ceremony__progress';
    progress.setAttribute('aria-label', `Vote progress: ${state.rolloutData.receivedVotes} of ${state.rolloutData.expectedVotes} votes received`);
    progress.innerHTML = `
      <span class="progress-label">Waiting for votes...</span>
      <span class="progress-count">${state.rolloutData.receivedVotes}/${state.rolloutData.expectedVotes}</span>
    `;
    rolloutStep.appendChild(progress);

    // Feed container (single line)
    const feed = document.createElement('div');
    feed.className = 'lv-ceremony__feed';
    feed.setAttribute('role', 'log');
    feed.setAttribute('aria-live', 'polite');
    rolloutStep.appendChild(feed);

    stepContainer.appendChild(rolloutStep);

    // Fade in
    requestAnimationFrame(() => {
      rolloutStep.classList.add('visible');
    });
  }

  // Update rollout progress
  function updateRolloutProgress(receivedVotes) {
    if (state.currentStep !== 'rollout') return;

    state.rolloutData.receivedVotes = receivedVotes;

    const progress = state.overlay?.querySelector('.lv-ceremony__progress');
    if (progress) {
      const countSpan = progress.querySelector('.progress-count');
      if (countSpan) {
        countSpan.textContent = `${state.rolloutData.receivedVotes}/${state.rolloutData.expectedVotes}`;
      }
      progress.setAttribute('aria-label', `Vote progress: ${state.rolloutData.receivedVotes} of ${state.rolloutData.expectedVotes} votes received`);
    }
  }

  // Add a vote to the rollout feed
  function addVoteToRollout(vote) {
    if (state.currentStep !== 'rollout') return;

    const feed = state.overlay?.querySelector('.lv-ceremony__feed');
    if (!feed) return;

    const { voterId, voterName, targetName } = vote;

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
    state.rolloutData.receivedVotes++;
    updateRolloutProgress(state.rolloutData.receivedVotes);

    // Fade in
    requestAnimationFrame(() => {
      item.classList.add('visible');
    });
  }

  // Step 2: Announcement - Summary card with result text
  async function showAnnouncementStep(options = {}) {
    if (!state.overlay) {
      console.warn('[CeremonyOverlay] Cannot show announcement: overlay not initialized');
      return;
    }

    const { 
      title = 'Eviction Result', 
      body = [], 
      duration = 3600,
      tone = 'evict'
    } = options;

    state.currentStep = 'announcement';
    state.announcementData = { title, body, tone };

    const stepContainer = state.overlay.querySelector('.lv-ceremony__step-container');
    if (!stepContainer) return;

    // Fade out previous step
    const previousStep = stepContainer.querySelector('.lv-ceremony__step');
    if (previousStep) {
      previousStep.classList.remove('visible');
      await sleep(300);
      previousStep.remove();
    }

    // Create announcement step content
    const announcementStep = document.createElement('div');
    announcementStep.className = 'lv-ceremony__step lv-ceremony__announcement';
    announcementStep.setAttribute('role', 'status');
    announcementStep.setAttribute('aria-live', 'polite');

    // Add tone class
    if (tone === 'evict' || tone === 'live') {
      announcementStep.classList.add(`tone-${tone}`);
    }

    // Title
    const titleEl = document.createElement('h3');
    titleEl.className = 'lv-ceremony__title';
    titleEl.textContent = title;
    announcementStep.appendChild(titleEl);

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
    announcementStep.appendChild(bodyDiv);

    stepContainer.appendChild(announcementStep);

    // Fade in
    await sleep(50);
    announcementStep.classList.add('visible');

    // Auto-transition after duration
    await sleep(duration);
  }

  // Step 3: Final - Centered B&W evictee portrait that fades/vanishes
  async function showFinalStep(options = {}) {
    if (!state.overlay) {
      console.warn('[CeremonyOverlay] Cannot show final: overlay not initialized');
      return;
    }

    const { 
      evictedId, 
      evictedName, 
      holdMs = 3500 
    } = options;

    if (!evictedId || !evictedName) {
      console.warn('[CeremonyOverlay] Cannot show final: missing evictedId or evictedName');
      return;
    }

    state.currentStep = 'final';
    state.finalData = { evictedId, evictedName };

    const stepContainer = state.overlay.querySelector('.lv-ceremony__step-container');
    if (!stepContainer) return;

    // Fade out previous step
    const previousStep = stepContainer.querySelector('.lv-ceremony__step');
    if (previousStep) {
      previousStep.classList.remove('visible');
      await sleep(300);
      previousStep.remove();
    }

    // Create final step content
    const finalStep = document.createElement('div');
    finalStep.className = 'lv-ceremony__step lv-ceremony__final';
    finalStep.setAttribute('role', 'status');
    finalStep.setAttribute('aria-label', `${evictedName} has been evicted`);

    // Portrait container
    const portraitContainer = document.createElement('div');
    portraitContainer.className = 'lv-ceremony__portrait-container';

    // Portrait image
    const portrait = document.createElement('img');
    portrait.className = 'lv-ceremony__portrait';
    portrait.src = getAvatarUrl(evictedId);
    portrait.alt = `${evictedName}'s portrait`;
    portrait.onerror = function() {
      console.warn(`[CeremonyOverlay] Failed to load portrait for ${evictedName}`);
      this.onerror = null;
      this.src = getDicebearUrl(evictedName);
    };
    portraitContainer.appendChild(portrait);

    finalStep.appendChild(portraitContainer);

    // Name label
    const nameLabel = document.createElement('div');
    nameLabel.className = 'lv-ceremony__name';
    nameLabel.textContent = evictedName;
    finalStep.appendChild(nameLabel);

    stepContainer.appendChild(finalStep);

    // Fade in portrait
    await sleep(100);
    finalStep.classList.add('visible');

    // Wait a bit before starting B&W animation
    await sleep(800);

    // Apply black-and-white filter with transition
    portraitContainer.classList.add('grayscale');

    // Hold the portrait
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const holdTime = prefersReducedMotion ? Math.max(holdMs * 0.6, 1000) : Math.max(holdMs, 1200);
    await sleep(holdTime);

    // Fade out
    finalStep.classList.remove('visible');
    await sleep(800);
  }

  // Remove the overlay and restore normal UI
  function hide() {
    if (state.overlay) {
      // Fade out
      state.overlay.style.opacity = '0';
      state.overlay.style.transition = 'opacity 0.3s ease-out';
      
      setTimeout(() => {
        if (state.overlay) {
          state.overlay.remove();
          state.overlay = null;
        }
      }, 300);
    }

    // Restore legacy elements
    restoreLegacyElements();

    // Reset state
    state.container = null;
    state.currentStep = null;
    state.rolloutData = {
      expectedVotes: 0,
      receivedVotes: 0,
      nominees: []
    };
    state.announcementData = {
      title: '',
      body: [],
      tone: 'evict'
    };
    state.finalData = {
      evictedId: null,
      evictedName: ''
    };
  }

  // Helper: sleep
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Export public API
  global.LiveVoteCeremonyOverlay = {
    show,
    hide,
    shouldUseCeremonyOverlay,
    showRolloutStep,
    updateRolloutProgress,
    addVoteToRollout,
    showAnnouncementStep,
    showFinalStep,
    isShowing: () => state.overlay !== null,
    getCurrentStep: () => state.currentStep
  };

})(window);
