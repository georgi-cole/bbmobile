// MODULE: livevote-voteoverlay.js
// Renders a full-screen (in-TV) voting overlay with center-emphasis carousel
// Handles nominee selection, Evict button, and vote submission

(function(global) {
  'use strict';

  // State
  let state = {
    nominees: [],
    selectedIndex: 0,
    selectedNominee: null,
    onSubmit: null,
    overlay: null,
    isTieBreak: false
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

  // Create and show the voting overlay
  function show(options = {}) {
    const {
      nominees = [],
      onSubmit = null,
      isTieBreak = false,
      container = null
    } = options;

    if (!Array.isArray(nominees) || nominees.length === 0) {
      console.warn('[VoteOverlay] No nominees provided');
      return null;
    }

    // Find container (either provided or default to TV)
    const targetContainer = container || document.querySelector('#tv');
    if (!targetContainer) {
      console.warn('[VoteOverlay] No container found');
      return null;
    }

    // Initialize state
    state.nominees = nominees;
    state.selectedIndex = 0;
    state.selectedNominee = null;
    state.onSubmit = onSubmit;
    state.isTieBreak = isTieBreak;

    // Create overlay element
    const overlay = document.createElement('div');
    overlay.className = 'lv-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', isTieBreak ? 'Break tie vote' : 'Cast your vote to evict');
    overlay.setAttribute('aria-modal', 'true');

    // Header
    const header = document.createElement('div');
    header.className = 'lv-overlay__header';
    header.textContent = isTieBreak ? 'Break the tie.' : 'Cast your vote to evict.';
    overlay.appendChild(header);

    // Carousel container
    const carousel = document.createElement('div');
    carousel.className = 'lv-overlay__carousel';
    carousel.setAttribute('role', 'group');
    carousel.setAttribute('aria-label', 'Nominee carousel');

    // Track (contains all nominees)
    const track = document.createElement('div');
    track.className = 'lv-overlay__track';

    nominees.forEach((nomineeId, index) => {
      const player = global.getP?.(nomineeId);
      if (!player) return;

      const nomineeEl = document.createElement('div');
      nomineeEl.className = 'lv-overlay__nominee';
      nomineeEl.dataset.index = index;
      nomineeEl.dataset.nomineeId = nomineeId;
      nomineeEl.setAttribute('role', 'button');
      nomineeEl.setAttribute('tabindex', index === 0 ? '0' : '-1');
      nomineeEl.setAttribute('aria-label', `Select ${player.name} to evict`);

      // Mark center nominee
      if (index === 0) {
        nomineeEl.classList.add('center');
      }

      // Avatar container
      const avatarContainer = document.createElement('div');
      avatarContainer.className = 'lv-overlay__avatar-container';

      // Avatar image
      const avatar = document.createElement('img');
      avatar.className = 'lv-overlay__avatar';
      avatar.src = getAvatarUrl(nomineeId);
      avatar.alt = `${player.name}'s avatar`;
      avatar.loading = 'eager';
      avatar.onerror = () => {
        avatar.src = getDicebearUrl(player.name);
      };
      avatarContainer.appendChild(avatar);
      nomineeEl.appendChild(avatarContainer);

      // Name
      const name = document.createElement('div');
      name.className = 'lv-overlay__nominee-name';
      name.textContent = player.name;
      nomineeEl.appendChild(name);

      // Click handler
      nomineeEl.onclick = () => selectNominee(index);

      track.appendChild(nomineeEl);
    });

    carousel.appendChild(track);

    // Navigation arrows
    if (nominees.length > 1) {
      const prevArrow = document.createElement('button');
      prevArrow.className = 'lv-overlay__arrow prev';
      prevArrow.innerHTML = '◀';
      prevArrow.setAttribute('aria-label', 'Show previous nominee');
      prevArrow.onclick = () => navigateCarousel(-1);
      carousel.appendChild(prevArrow);

      const nextArrow = document.createElement('button');
      nextArrow.className = 'lv-overlay__arrow next';
      nextArrow.innerHTML = '▶';
      nextArrow.setAttribute('aria-label', 'Show next nominee');
      nextArrow.onclick = () => navigateCarousel(1);
      carousel.appendChild(nextArrow);
    }

    overlay.appendChild(carousel);

    // Status message area (for accessibility announcements)
    const status = document.createElement('div');
    status.className = 'lv-overlay__status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.textContent = 'Select a nominee to evict';
    overlay.appendChild(status);

    // Action dock with Evict button
    const dock = document.createElement('div');
    dock.className = 'lv-overlay__dock';

    const evictBtn = document.createElement('button');
    evictBtn.className = 'lv-overlay__evict-btn';
    evictBtn.textContent = 'Evict';
    evictBtn.disabled = true; // Disabled until selection is made
    evictBtn.setAttribute('aria-label', 'Vote to evict selected nominee');
    evictBtn.onclick = handleEvictClick;
    dock.appendChild(evictBtn);

    overlay.appendChild(dock);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'lv-overlay__close';
    closeBtn.innerHTML = '×';
    closeBtn.setAttribute('aria-label', 'Close voting overlay');
    closeBtn.onclick = hide;
    overlay.appendChild(closeBtn);

    // Add keyboard support
    overlay.addEventListener('keydown', handleKeyboard);

    // Add to container
    targetContainer.appendChild(overlay);
    state.overlay = overlay;

    // Focus the first nominee
    const firstNominee = track.querySelector('.lv-overlay__nominee[data-index="0"]');
    if (firstNominee) {
      setTimeout(() => firstNominee.focus(), 100);
    }

    return overlay;
  }

  // Navigate carousel (swipe or arrow)
  function navigateCarousel(direction) {
    if (!state.overlay || state.nominees.length <= 1) return;

    const track = state.overlay.querySelector('.lv-overlay__track');
    if (!track) return;

    // Update selected index
    let newIndex = state.selectedIndex + direction;
    if (newIndex < 0) newIndex = state.nominees.length - 1;
    if (newIndex >= state.nominees.length) newIndex = 0;

    state.selectedIndex = newIndex;

    // Update center class
    const nominees = track.querySelectorAll('.lv-overlay__nominee');
    nominees.forEach((nominee, index) => {
      if (index === newIndex) {
        nominee.classList.add('center');
        nominee.setAttribute('tabindex', '0');
      } else {
        nominee.classList.remove('center');
        nominee.setAttribute('tabindex', '-1');
      }
    });

    // Announce to screen readers
    const player = global.getP?.(state.nominees[newIndex]);
    if (player) {
      const status = state.overlay.querySelector('.lv-overlay__status');
      if (status) {
        status.textContent = `Now showing ${player.name}`;
      }
    }
  }

  // Select a nominee (tap on avatar)
  function selectNominee(index) {
    if (!state.overlay) return;

    const track = state.overlay.querySelector('.lv-overlay__track');
    if (!track) return;

    const nominees = track.querySelectorAll('.lv-overlay__nominee');
    const clickedNominee = nominees[index];
    if (!clickedNominee) return;

    const nomineeId = parseInt(clickedNominee.dataset.nomineeId);

    // If clicked nominee is not centered, navigate to it first
    if (index !== state.selectedIndex) {
      navigateCarousel(index - state.selectedIndex);
    }

    // Toggle selection
    if (state.selectedNominee === nomineeId) {
      // Deselect
      state.selectedNominee = null;
      clickedNominee.classList.remove('selected');
      updateEvictButton();
      
      // Announce deselection
      const status = state.overlay.querySelector('.lv-overlay__status');
      const player = global.getP?.(nomineeId);
      if (status && player) {
        status.textContent = `${player.name} deselected`;
      }
    } else {
      // Select this nominee (and deselect others)
      state.selectedNominee = nomineeId;
      nominees.forEach(n => n.classList.remove('selected'));
      clickedNominee.classList.add('selected');
      updateEvictButton();
      
      // Announce selection
      const status = state.overlay.querySelector('.lv-overlay__status');
      const player = global.getP?.(nomineeId);
      if (status && player) {
        status.textContent = `${player.name} selected. Press Evict to confirm.`;
      }
    }
  }

  // Update Evict button state based on selection
  function updateEvictButton() {
    if (!state.overlay) return;

    const evictBtn = state.overlay.querySelector('.lv-overlay__evict-btn');
    if (!evictBtn) return;

    if (state.selectedNominee !== null) {
      evictBtn.disabled = false;
      const player = global.getP?.(state.selectedNominee);
      if (player) {
        evictBtn.textContent = `Evict ${player.name}`;
        evictBtn.setAttribute('aria-label', `Vote to evict ${player.name}`);
      }
    } else {
      evictBtn.disabled = true;
      evictBtn.textContent = 'Evict';
      evictBtn.setAttribute('aria-label', 'Vote to evict selected nominee');
    }
  }

  // Handle Evict button click
  function handleEvictClick() {
    if (state.selectedNominee === null) return;

    // Submit the vote
    if (state.onSubmit) {
      state.onSubmit(state.selectedNominee);
    }

    // Close the overlay
    hide();
  }

  // Handle keyboard navigation
  function handleKeyboard(event) {
    if (!state.overlay) return;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        navigateCarousel(-1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        navigateCarousel(1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        // If focus is on a nominee, select it
        if (document.activeElement.classList.contains('lv-overlay__nominee')) {
          const index = parseInt(document.activeElement.dataset.index);
          selectNominee(index);
        }
        // If focus is on evict button and it's enabled, click it
        else if (document.activeElement.classList.contains('lv-overlay__evict-btn')) {
          handleEvictClick();
        }
        break;
      case 'Escape':
        event.preventDefault();
        hide();
        break;
    }
  }

  // Remove the overlay
  function hide() {
    if (state.overlay) {
      state.overlay.remove();
      state.overlay = null;
    }
    
    // Reset state
    state.nominees = [];
    state.selectedIndex = 0;
    state.selectedNominee = null;
    state.onSubmit = null;
  }

  // Export public API
  global.LiveVoteOverlay = {
    show,
    hide,
    isOpen: () => state.overlay !== null
  };

})(window);
