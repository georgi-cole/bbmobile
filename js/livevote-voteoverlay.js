// MODULE: livevote-voteoverlay.js
// Renders a full-screen (in-TV) voting overlay with center-emphasis carousel
// Handles nominee selection, Evict button, and vote submission

(function(global) {
  'use strict';

  // State
  const state = {
    nominees: [],
    selectedIndex: 0,
    selectedNominee: null,
    onSubmit: null,
    overlay: null,
    isTieBreak: false,
    allowClose: false,
    onCancel: null
  };

  // Mobile detection helper
  // Returns true if device has coarse pointer (touchscreen) OR viewport is narrow (<820px)
  function isMobile() {
    // Check for coarse pointer (mobile/tablet touchscreen)
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    // Check viewport width
    const isNarrowViewport = window.innerWidth < 820;
    return hasCoarsePointer || isNarrowViewport;
  }

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
  async function show(options = {}) {
    // Idempotency guard: if already open, return early (no-op)
    if (state.overlay !== null) {
      console.debug('[VoteOverlay] Already open, skipping duplicate show()');
      return state.overlay;
    }
    
    const {
      nominees = [],
      onSubmit = null,
      isTieBreak = false,
      container = null,
      allowClose = false,
      onCancel = null
    } = options;

    if (!Array.isArray(nominees) || nominees.length === 0) {
      console.warn('[VoteOverlay] No nominees provided');
      return null;
    }

    // Find container (either provided or default to TV viewport for proper centering)
    // Prefer .tvViewport inside #tv for proper layout integration
    const targetContainer = container || 
      document.querySelector('#tv .tvViewport') || 
      document.querySelector('#tv');
    if (!targetContainer) {
      console.warn('[VoteOverlay] No container found');
      return null;
    }

    // MOBILE FIX: Do not lock body scroll - the overlay itself is scrollable
    // The overlay uses position:fixed with overflow-y:auto to allow internal scrolling.
    // This allows the ceremony page to remain accessible and scrollable behind the overlay
    // while the overlay content can also scroll if needed.
    // We skip body scroll locking to fix mobile scrolling issues (issue #574).
    
    // Note: Body scroll lock has been intentionally removed to allow page scrolling

    // Initialize state
    state.nominees = nominees;
    state.selectedIndex = 0;
    state.selectedNominee = null;
    state.onSubmit = onSubmit;
    state.isTieBreak = isTieBreak;
    state.allowClose = allowClose;
    state.onCancel = onCancel;

    // Create overlay element
    const overlay = document.createElement('div');
    overlay.className = 'lv-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', isTieBreak ? 'Break tie vote' : 'Cast your vote to evict');
    overlay.setAttribute('aria-modal', 'true');

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      overlay.classList.add('reduce-motion');
    }

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

    // Navigation arrows - created here and will be moved to CTA row
    // Always create them (no mobile check), but they'll live in CTA, not carousel
    const prevArrow = document.createElement('button');
    prevArrow.className = 'lv-overlay__arrow prev';
    prevArrow.innerHTML = '◀';
    prevArrow.setAttribute('aria-label', 'Previous nominee');
    prevArrow.onclick = () => navigateCarousel(-1);

    const nextArrow = document.createElement('button');
    nextArrow.className = 'lv-overlay__arrow next';
    nextArrow.innerHTML = '▶';
    nextArrow.setAttribute('aria-label', 'Next nominee');
    nextArrow.onclick = () => navigateCarousel(1);

    carousel.appendChild(track);
    overlay.appendChild(carousel);

    // Confirmation container - placed directly below carousel for proximity to selected avatar
    const confirmContainer = document.createElement('div');
    confirmContainer.className = 'lv-overlay__confirm-container';
    confirmContainer.style.display = 'none'; // Hidden until selection is made
    
    // Status message area (for accessibility announcements and confirmation text)
    const status = document.createElement('div');
    status.className = 'lv-overlay__status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.textContent = 'Select a nominee to evict';
    confirmContainer.appendChild(status);

    // CTA row - 3-column layout: left arrow, Evict button, right arrow
    // Re-parent the navigation arrows created above into CTA (don't duplicate them)
    const ctaRow = document.createElement('div');
    ctaRow.className = 'lv-overlay__cta-row';
    
    // Add left arrow to CTA row (re-parent from above)
    ctaRow.appendChild(prevArrow);

    // Evict button - compact and centered in CTA row
    const evictBtn = document.createElement('button');
    evictBtn.className = 'lv-overlay__evict-btn';
    evictBtn.textContent = 'Evict';
    evictBtn.disabled = true; // Disabled until selection is made
    evictBtn.setAttribute('aria-label', 'Vote to evict selected nominee');
    evictBtn.onclick = handleEvictClick;
    ctaRow.appendChild(evictBtn);
    
    // Add right arrow to CTA row (re-parent from above)
    ctaRow.appendChild(nextArrow);
    
    confirmContainer.appendChild(ctaRow);
    overlay.appendChild(confirmContainer);

    // Close button - only render if explicitly allowed via options.allowClose
    if (allowClose) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'lv-overlay__close';
      closeBtn.innerHTML = '×';
      closeBtn.setAttribute('aria-label', 'Close voting overlay');
      closeBtn.onclick = () => {
        try {
          if (typeof onCancel === 'function') {
            onCancel();
          }
        } catch (e) {
          console.warn('[VoteOverlay] onCancel callback failed', e);
        }
        hide();
      };
      overlay.appendChild(closeBtn);
    }

    // Add keyboard support
    overlay.addEventListener('keydown', handleKeyboard);

    // Add to container
    targetContainer.appendChild(overlay);
    state.overlay = overlay;

    // Initialize nav button states
    updateNavButtons();

    // Focus the first nominee
    const firstNominee = track.querySelector('.lv-overlay__nominee[data-index="0"]');
    if (firstNominee) {
      setTimeout(() => firstNominee.focus(), 100);
    }

    return overlay;
  }

  // Helper: Scroll carousel to center a nominee
  function scrollToNomineeCenter(index, immediate = false) {
    if (!state.overlay) return;

    const carousel = state.overlay.querySelector('.lv-overlay__carousel');
    const track = state.overlay.querySelector('.lv-overlay__track');
    if (!carousel || !track) return;

    const nominees = track.querySelectorAll('.lv-overlay__nominee');
    const targetNominee = nominees[index];
    if (!targetNominee) return;

    // Calculate the delta to center the nominee
    const carouselRect = carousel.getBoundingClientRect();
    const nomineeRect = targetNominee.getBoundingClientRect();
    
    // Calculate the center of the carousel
    const carouselCenter = carouselRect.left + carouselRect.width / 2;
    // Calculate the center of the nominee
    const nomineeCenter = nomineeRect.left + nomineeRect.width / 2;
    
    // Calculate the delta needed to center the nominee
    const delta = nomineeCenter - carouselCenter;
    
    // Scroll the carousel by the delta
    carousel.scrollTo({
      left: carousel.scrollLeft + delta,
      behavior: immediate ? 'auto' : 'smooth'
    });
  }

  // Helper: Update nav button states based on current index
  function updateNavButtons() {
    if (!state.overlay) return;
    
    const prevArrow = state.overlay.querySelector('.lv-overlay__arrow.prev');
    const nextArrow = state.overlay.querySelector('.lv-overlay__arrow.next');
    
    if (prevArrow && nextArrow) {
      // Disable both if single nominee, otherwise disable at bounds
      if (state.nominees.length <= 1) {
        prevArrow.disabled = true;
        nextArrow.disabled = true;
      } else {
        // Disable prev at start, enable otherwise
        prevArrow.disabled = state.selectedIndex === 0;
        // Disable next at end, enable otherwise
        nextArrow.disabled = state.selectedIndex >= state.nominees.length - 1;
      }
    }
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

    // Center the new nominee in the carousel
    scrollToNomineeCenter(newIndex);

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

    // Update nav button states
    updateNavButtons();

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

    // Always center the nominee in the carousel first
    scrollToNomineeCenter(index);

    // If clicked nominee is not centered, update selectedIndex and center class
    if (index !== state.selectedIndex) {
      state.selectedIndex = index;
      nominees.forEach((nominee, i) => {
        if (i === index) {
          nominee.classList.add('center');
          nominee.setAttribute('tabindex', '0');
        } else {
          nominee.classList.remove('center');
          nominee.setAttribute('tabindex', '-1');
        }
      });
      
      // Update nav button states
      updateNavButtons();
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
    const confirmContainer = state.overlay.querySelector('.lv-overlay__confirm-container');
    if (!evictBtn || !confirmContainer) return;

    if (state.selectedNominee !== null) {
      // Show confirmation container when a nominee is selected
      confirmContainer.style.display = 'flex';
      
      // Enable button with just "Evict" label (no player name)
      evictBtn.disabled = false;
      evictBtn.textContent = 'Evict';
      
      const player = global.getP?.(state.selectedNominee);
      if (player) {
        evictBtn.setAttribute('aria-label', `Vote to evict ${player.name}`);
      }
      
      // Reset any submission state if user changes selection
      evictBtn.classList.remove('submitting', 'submitted');
      evictBtn.style.pointerEvents = '';
    } else {
      // Hide confirmation container when no selection
      confirmContainer.style.display = 'none';
      evictBtn.disabled = true;
      evictBtn.textContent = 'Evict';
      evictBtn.setAttribute('aria-label', 'Vote to evict selected nominee');
    }
  }

  // Handle Evict button click
  async function handleEvictClick() {
    if (state.selectedNominee === null) return;
    if (!state.overlay) return;

    const evictBtn = state.overlay.querySelector('.lv-overlay__evict-btn');
    const status = state.overlay.querySelector('.lv-overlay__status');
    if (!evictBtn || !status) return;
    
    // Prevent double submission
    if (evictBtn.classList.contains('submitting') || evictBtn.classList.contains('submitted')) {
      return;
    }

    const selectedId = state.selectedNominee;
    const callback = state.onSubmit;

    // 1. Immediately disable the button to prevent double-tap
    evictBtn.disabled = true;
    evictBtn.classList.add('submitting');
    evictBtn.style.pointerEvents = 'none'; // Extra protection against tap events
    evictBtn.setAttribute('aria-disabled', 'true');

    // 2. Update status text to confirmation
    status.textContent = 'Vote submitted.';
    status.classList.add('submitted');

    // 3. Submit the vote
    let submissionSuccess = true;
    try {
      if (callback) {
        const result = callback(selectedId);
        // If callback returns a promise, wait for it
        if (result && typeof result.then === 'function') {
          await result;
        }
      }
    } catch (error) {
      console.error('[VoteOverlay] Vote submission failed:', error);
      submissionSuccess = false;
      
      // Show error message
      status.textContent = 'Submission failed. Please try again.';
      status.classList.remove('submitted');
      status.classList.add('error');
      
      // Re-enable button after error
      evictBtn.disabled = false;
      evictBtn.classList.remove('submitting');
      evictBtn.classList.add('error');
      evictBtn.style.pointerEvents = '';
      evictBtn.setAttribute('aria-disabled', 'false');
      
      // Clear error state after a delay
      setTimeout(() => {
        if (state.overlay && state.selectedNominee !== null) {
          status.classList.remove('error');
          evictBtn.classList.remove('error');
          const player = global.getP?.(state.selectedNominee);
          if (player) {
            status.textContent = `${player.name} selected. Press Evict to confirm.`;
          }
        }
      }, 3000);
      
      return; // Don't proceed to fade out and hide
    }

    if (!submissionSuccess) return;

    // 4. Mark as submitted and add fade-out class
    evictBtn.classList.remove('submitting');
    evictBtn.classList.add('submitted', 'fade-out');

    // 5. Wait for fade-out animation (300-600ms delay + 200-300ms animation)
    const fadeDelay = 400; // ms to wait before starting fade
    const fadeAnimation = 300; // ms for fade animation
    
    await new Promise(resolve => setTimeout(resolve, fadeDelay));
    
    // Add fade-out to button and status
    evictBtn.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
    evictBtn.style.opacity = '0';
    evictBtn.style.transform = 'scale(0.9)';
    
    status.style.transition = 'opacity 0.3s ease-out';
    status.style.opacity = '0';

    await new Promise(resolve => setTimeout(resolve, fadeAnimation));

    // 6. Close the overlay after fade completes
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
        } else if (document.activeElement.classList.contains('lv-overlay__evict-btn')) {
          // If focus is on evict button and it's enabled, click it
          handleEvictClick();
        }
        break;
      case 'Escape':
        event.preventDefault();
        // Only allow Escape to close if allowClose is true
        if (state.allowClose) {
          if (state.onCancel && typeof state.onCancel === 'function') {
            try {
              state.onCancel();
            } catch (e) {
              console.warn('[VoteOverlay] onCancel callback failed', e);
            }
          }
          hide();
        }
        break;
    }
  }
  // Remove the overlay
  function hide() {
    // Idempotent: if already closed, return early
    if (!state.overlay) {
      console.debug('[VoteOverlay] Already closed, skipping duplicate hide()');
      return;
    }
    
    // Clear countdown timer using shared helper
    if (global.clearVoteCountdown) {
      global.clearVoteCountdown();
    }
    
    // Remove the overlay
    state.overlay.remove();
    state.overlay = null;
    
    // Note: Body scroll lock was not applied, so no need to unlock
    // The overlay is self-contained and scrollable without affecting body scroll
    
    // Reset state
    state.nominees = [];
    state.selectedIndex = 0;
    state.selectedNominee = null;
    state.onSubmit = null;
    state.isTieBreak = false;
    state.allowClose = false;
    state.onCancel = null;
  }

  // Note: Body scroll lock functions removed in fix for issue #574
  // The overlay is now self-contained and scrollable without locking body scroll
  // This allows the ceremony page to remain accessible and scrollable on mobile devices

  // Export public API
  global.LiveVoteOverlay = {
    show,
    hide,
    isOpen: () => state.overlay !== null
  };

})(window);
