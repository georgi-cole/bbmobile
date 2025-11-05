// MODULE: ui/carousel-picker.js
// Reusable full-screen carousel picker for POV ceremonies
// Single-focus carousel with left/right arrows and explicit Confirm pill

(function(global) {
  'use strict';

  // Helper to get player object by ID
  function getP(id) {
    return (global.getP ? global.getP(id) : null);
  }

  // Helper to get player name
  function safeName(id) {
    try {
      return global.safeName ? global.safeName(id) : String(id);
    } catch(e) {
      return String(id);
    }
  }

  // Helper to resolve avatar URL
  function resolveAvatar(id) {
    if (typeof global.resolveAvatar === 'function') {
      return global.resolveAvatar(id);
    }
    const p = getP(id);
    if (p && p.avatar) return p.avatar;
    if (p && p.img) return p.img;
    if (p && p.photo) return p.photo;
    // Fallback to dicebear
    if (p && p.name) {
      return 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(p.name);
    }
    return 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(String(id));
  }

  // State management
  const state = {
    isOpen: false,
    ids: [],
    title: 'Make your choice',
    actionLabel: 'Confirm',
    startId: null,
    blockIds: [],
    currentIndex: 0,
    onIndexChange: null,
    resolver: null
  };

  // Persistent DOM references to prevent re-mounting flicker
  const refs = {
    overlay: null,
    leftArrow: null,
    rightArrow: null,
    avatarContainer: null,
    avatarImg: null,
    nameLabel: null,
    blockedLabel: null,
    confirmBtn: null,
    cancelBtn: null,
    counter: null,
    // Side preview avatars for carousel effect
    prevAvatarContainer: null,
    prevAvatarImg: null,
    nextAvatarContainer: null,
    nextAvatarImg: null
  };

  let keyboardHandler = null;

  /**
   * Open carousel picker
   * @param {Object} options - Configuration
   * @param {number[]} options.ids - Array of player IDs to show in carousel
   * @param {string} [options.title='Make your choice'] - Title text
   * @param {string} [options.actionLabel='Confirm'] - Label for confirm button
   * @param {number} [options.startId] - Initial player ID to focus
   * @param {number[]} [options.blockIds=[]] - Array of blocked player IDs (shown but disabled)
   * @param {Function} [options.onIndexChange] - Callback when index changes (optional)
   * @returns {Promise<number|null>} Selected player ID or null if cancelled
   */
  function openCarouselPicker(options) {
    if (!options || !options.ids || options.ids.length === 0) {
      console.warn('[carousel-picker] openCarouselPicker called with no IDs');
      return Promise.resolve(null);
    }

    return new Promise(function(resolve) {
      state.ids = options.ids.slice();
      state.title = options.title || 'Make your choice';
      state.actionLabel = options.actionLabel || 'Confirm';
      state.startId = options.startId !== null && options.startId !== undefined ? options.startId : null;
      state.blockIds = options.blockIds || [];
      state.onIndexChange = options.onIndexChange || null;
      state.resolver = resolve;
      state.isOpen = true;

      // Find starting index
      if (state.startId !== null && state.startId !== undefined) {
        const startIdx = state.ids.indexOf(state.startId);
        state.currentIndex = startIdx >= 0 ? startIdx : 0;
      } else {
        state.currentIndex = 0;
      }

      buildOverlayOnce();
      attachEventListeners();
    });
  }

  /**
   * Build the carousel picker UI once (avoids re-mount flicker)
   * This function creates the overlay and stores persistent DOM references.
   * Content updates happen via updateUI() to prevent the flash caused by removing/re-adding the overlay.
   */
  function buildOverlayOnce() {
    // Remove existing overlay if present
    if (refs.overlay && refs.overlay.parentNode) {
      refs.overlay.parentNode.removeChild(refs.overlay);
      refs.overlay = null;
    }

    // Create overlay
    refs.overlay = document.createElement('div');
    refs.overlay.className = 'carousel-picker-overlay';
    refs.overlay.setAttribute('role', 'dialog');
    refs.overlay.setAttribute('aria-label', state.title);
    refs.overlay.setAttribute('aria-modal', 'true');

    // Top section: Title
    const topSection = document.createElement('div');
    topSection.className = 'carousel-picker-top';
    
    const titleEl = document.createElement('h2');
    titleEl.className = 'carousel-picker-title';
    titleEl.textContent = state.title;
    topSection.appendChild(titleEl);
    
    refs.overlay.appendChild(topSection);

    // Middle section: Avatar with left/right arrows
    const middleSection = document.createElement('div');
    middleSection.className = 'carousel-picker-middle';

    // Left arrow
    refs.leftArrow = document.createElement('button');
    refs.leftArrow.className = 'carousel-picker-arrow carousel-picker-arrow-left';
    refs.leftArrow.innerHTML = '&#8249;'; // ‹
    refs.leftArrow.setAttribute('aria-label', 'Previous');
    refs.leftArrow.onclick = function(e) {
      if (e) {
        e.stopPropagation();
      }
      if (state.currentIndex > 0) {
        state.currentIndex--;
        if (state.onIndexChange) state.onIndexChange(state.currentIndex);
        smoothSwap('left');
      }
    };
    middleSection.appendChild(refs.leftArrow);

    // Previous player preview (left side, blurred)
    refs.prevAvatarContainer = document.createElement('div');
    refs.prevAvatarContainer.className = 'carousel-picker-side-preview carousel-picker-side-preview-left';
    refs.prevAvatarImg = document.createElement('img');
    refs.prevAvatarImg.className = 'carousel-picker-side-avatar';
    refs.prevAvatarContainer.appendChild(refs.prevAvatarImg);
    middleSection.appendChild(refs.prevAvatarContainer);

    // Avatar container (visual display only, no tap-to-confirm)
    refs.avatarContainer = document.createElement('div');
    refs.avatarContainer.className = 'carousel-picker-avatar-container';

    // Avatar image
    refs.avatarImg = document.createElement('img');
    refs.avatarImg.className = 'carousel-picker-avatar';
    refs.avatarImg.onerror = function() {
      // Fallback already handled in resolveAvatar
    };
    refs.avatarContainer.appendChild(refs.avatarImg);

    // Name under avatar
    refs.nameLabel = document.createElement('div');
    refs.nameLabel.className = 'carousel-picker-name';
    refs.avatarContainer.appendChild(refs.nameLabel);

    // Blocked label (created but may be hidden)
    refs.blockedLabel = document.createElement('div');
    refs.blockedLabel.className = 'carousel-picker-blocked-label';
    refs.blockedLabel.textContent = 'Not Eligible';
    refs.blockedLabel.style.display = 'none'; // Hidden by default
    refs.avatarContainer.appendChild(refs.blockedLabel);

    middleSection.appendChild(refs.avatarContainer);

    // Next player preview (right side, blurred)
    refs.nextAvatarContainer = document.createElement('div');
    refs.nextAvatarContainer.className = 'carousel-picker-side-preview carousel-picker-side-preview-right';
    refs.nextAvatarImg = document.createElement('img');
    refs.nextAvatarImg.className = 'carousel-picker-side-avatar';
    refs.nextAvatarContainer.appendChild(refs.nextAvatarImg);
    middleSection.appendChild(refs.nextAvatarContainer);

    // Right arrow
    refs.rightArrow = document.createElement('button');
    refs.rightArrow.className = 'carousel-picker-arrow carousel-picker-arrow-right';
    refs.rightArrow.innerHTML = '&#8250;'; // ›
    refs.rightArrow.setAttribute('aria-label', 'Next');
    refs.rightArrow.onclick = function(e) {
      if (e) {
        e.stopPropagation();
      }
      if (state.currentIndex < state.ids.length - 1) {
        state.currentIndex++;
        if (state.onIndexChange) state.onIndexChange(state.currentIndex);
        smoothSwap('right');
      }
    };
    middleSection.appendChild(refs.rightArrow);

    refs.overlay.appendChild(middleSection);

    // Bottom section: Cancel + Confirm buttons
    const bottomSection = document.createElement('div');
    bottomSection.className = 'carousel-picker-bottom';

    const buttonRow = document.createElement('div');
    buttonRow.className = 'carousel-picker-button-row';

    // Cancel button
    refs.cancelBtn = document.createElement('button');
    refs.cancelBtn.className = 'btn carousel-picker-cancel';
    refs.cancelBtn.textContent = 'Cancel';
    refs.cancelBtn.setAttribute('aria-label', 'Cancel selection');
    refs.cancelBtn.onclick = function(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
      close(null);
    };
    buttonRow.appendChild(refs.cancelBtn);

    // Confirm button
    refs.confirmBtn = document.createElement('button');
    refs.confirmBtn.className = 'btn primary carousel-picker-confirm';
    refs.confirmBtn.onclick = function(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
      const currentId = state.ids[state.currentIndex];
      const isBlocked = state.blockIds.indexOf(currentId) !== -1;
      if (!isBlocked) {
        close(currentId);
      }
    };
    buttonRow.appendChild(refs.confirmBtn);

    bottomSection.appendChild(buttonRow);

    // Counter (e.g., "3 / 7")
    refs.counter = document.createElement('div');
    refs.counter.className = 'carousel-picker-counter';
    bottomSection.appendChild(refs.counter);

    refs.overlay.appendChild(bottomSection);

    // Add to body
    document.body.appendChild(refs.overlay);

    // Prevent events from bubbling to router/HUD while allowing interaction with controls
    // Strategy: Only stopPropagation on non-interactive targets to prevent HUD/router interference
    // For interactive targets (buttons, inputs), let events bubble to their handlers
    
    const isInteractiveFn = global.isInteractiveEvent || function(e) {
      if (!e || !e.target) return false;
      return !!e.target.closest('button, [role="button"], a, input, select, textarea, [data-action]');
    };

    // Handle click events
    refs.overlay.addEventListener('click', function(e) {
      // Let clicks on interactive controls bubble to their handlers
      if (!isInteractiveFn(e)) {
        e.stopPropagation();
      }
    }, true);

    // Handle pointer events (unified mouse/touch/pen)
    refs.overlay.addEventListener('pointerdown', function(e) {
      if (!isInteractiveFn(e)) {
        e.stopPropagation();
      }
    }, true);

    refs.overlay.addEventListener('pointerup', function(e) {
      if (!isInteractiveFn(e)) {
        e.stopPropagation();
      }
    }, true);

    // Handle touch events with proper passive flag
    refs.overlay.addEventListener('touchstart', function(e) {
      // Don't prevent default on interactive controls to allow click synthesis
      if (!isInteractiveFn(e)) {
        e.stopPropagation();
      }
    }, { passive: true, capture: true });

    refs.overlay.addEventListener('touchend', function(e) {
      // Don't prevent default on interactive controls to allow click synthesis
      if (!isInteractiveFn(e)) {
        e.stopPropagation();
      }
    }, { passive: true, capture: true });

    // Update UI with initial content
    updateUI();

    // Animate in
    requestAnimationFrame(function() {
      refs.overlay.classList.add('carousel-picker-visible');
    });

    // Focus confirm button
    setTimeout(function() {
      refs.confirmBtn.focus();
    }, 100);
  }

  /**
   * Update the UI in place without re-mounting the overlay
   * This is the key to preventing flicker - we only update the dynamic content
   */
  function updateUI() {
    if (!refs.overlay) return;

    const currentId = state.ids[state.currentIndex];
    const isBlocked = state.blockIds.indexOf(currentId) !== -1;

    // Update avatar image and alt text
    refs.avatarImg.src = resolveAvatar(currentId);
    refs.avatarImg.alt = safeName(currentId);

    // Update name label
    refs.nameLabel.textContent = safeName(currentId);

    // Update blocked state
    if (isBlocked) {
      refs.avatarContainer.classList.remove('carousel-picker-avatar-selectable');
      refs.avatarContainer.classList.add('carousel-picker-avatar-blocked');
      refs.avatarContainer.setAttribute('aria-disabled', 'true');
      refs.blockedLabel.style.display = 'block';
    } else {
      refs.avatarContainer.classList.remove('carousel-picker-avatar-blocked');
      refs.avatarContainer.classList.add('carousel-picker-avatar-selectable');
      refs.avatarContainer.removeAttribute('aria-disabled');
      refs.blockedLabel.style.display = 'none';
    }

    // Update confirm button
    refs.confirmBtn.textContent = state.actionLabel;
    refs.confirmBtn.setAttribute('aria-label', state.actionLabel + ' ' + safeName(currentId));
    refs.confirmBtn.disabled = isBlocked;

    // Update arrow states
    refs.leftArrow.disabled = (state.currentIndex === 0);
    refs.rightArrow.disabled = (state.currentIndex === state.ids.length - 1);

    // Update counter
    refs.counter.textContent = (state.currentIndex + 1) + ' / ' + state.ids.length;

    // Update side preview avatars (carousel effect)
    // Previous player preview
    if (state.currentIndex > 0) {
      const prevId = state.ids[state.currentIndex - 1];
      refs.prevAvatarImg.src = resolveAvatar(prevId);
      refs.prevAvatarImg.alt = safeName(prevId);
      refs.prevAvatarContainer.style.visibility = 'visible';
      refs.prevAvatarContainer.style.opacity = '1';
    } else {
      refs.prevAvatarContainer.style.visibility = 'hidden';
      refs.prevAvatarContainer.style.opacity = '0';
    }

    // Next player preview
    if (state.currentIndex < state.ids.length - 1) {
      const nextId = state.ids[state.currentIndex + 1];
      refs.nextAvatarImg.src = resolveAvatar(nextId);
      refs.nextAvatarImg.alt = safeName(nextId);
      refs.nextAvatarContainer.style.visibility = 'visible';
      refs.nextAvatarContainer.style.opacity = '1';
    } else {
      refs.nextAvatarContainer.style.visibility = 'hidden';
      refs.nextAvatarContainer.style.opacity = '0';
    }
  }

  /**
   * Smooth transition between players (optional visual enhancement)
   * Adds/removes CSS classes for animation without removing the overlay
   */
  function smoothSwap(direction) {
    if (!refs.avatarContainer) return;

    // Remove any existing swap classes
    refs.avatarContainer.classList.remove('swap-left', 'swap-right');

    // Trigger reflow to restart animation
    void refs.avatarContainer.offsetWidth;

    // Add direction class for animation (optional - CSS can handle this)
    if (direction === 'left') {
      refs.avatarContainer.classList.add('swap-left');
    } else if (direction === 'right') {
      refs.avatarContainer.classList.add('swap-right');
    }

    // Update UI content
    updateUI();

    // Remove swap class after animation completes
    setTimeout(function() {
      if (refs.avatarContainer) {
        refs.avatarContainer.classList.remove('swap-left', 'swap-right');
      }
    }, 300);
  }

  /**
   * Attach keyboard and gamepad event listeners
   */
  function attachEventListeners() {
    // Remove existing listener if present
    if (keyboardHandler) {
      document.removeEventListener('keydown', keyboardHandler);
      keyboardHandler = null;
    }

    keyboardHandler = function(e) {
      if (!state.isOpen) return;

      if (e.key === 'ArrowLeft' || e.key === 'Left') {
        e.preventDefault();
        if (state.currentIndex > 0) {
          state.currentIndex--;
          if (state.onIndexChange) state.onIndexChange(state.currentIndex);
          smoothSwap('left');
        }
      } else if (e.key === 'ArrowRight' || e.key === 'Right') {
        e.preventDefault();
        if (state.currentIndex < state.ids.length - 1) {
          state.currentIndex++;
          if (state.onIndexChange) state.onIndexChange(state.currentIndex);
          smoothSwap('right');
        }
      } else if (e.key === 'Enter') {
        // Confirm current selection if not blocked
        const currentId = state.ids[state.currentIndex];
        const isBlocked = state.blockIds.indexOf(currentId) !== -1;
        if (!isBlocked) {
          e.preventDefault();
          close(currentId);
        }
      } else if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        close(null);
      } else if (e.key === 'Home') {
        e.preventDefault();
        state.currentIndex = 0;
        if (state.onIndexChange) state.onIndexChange(state.currentIndex);
        smoothSwap('left');
      } else if (e.key === 'End') {
        e.preventDefault();
        state.currentIndex = state.ids.length - 1;
        if (state.onIndexChange) state.onIndexChange(state.currentIndex);
        smoothSwap('right');
      }
    };

    document.addEventListener('keydown', keyboardHandler);
  }

  /**
   * Close the carousel picker
   * @param {number|null} selectedId - Selected player ID or null if cancelled
   */
  function close(selectedId) {
    state.isOpen = false;

    // Remove event listener
    if (keyboardHandler) {
      document.removeEventListener('keydown', keyboardHandler);
      keyboardHandler = null;
    }

    // Animate out
    if (refs.overlay) {
      refs.overlay.classList.remove('carousel-picker-visible');
      setTimeout(function() {
        if (refs.overlay && refs.overlay.parentNode) {
          refs.overlay.parentNode.removeChild(refs.overlay);
        }
        refs.overlay = null;
      }, 300);
    }

    // Resolve promise
    if (state.resolver) {
      state.resolver(selectedId);
      state.resolver = null;
    }

    // Reset state
    state.ids = [];
    state.title = 'Make your choice';
    state.actionLabel = 'Confirm';
    state.startId = null;
    state.blockIds = [];
    state.currentIndex = 0;
    state.onIndexChange = null;
  }

  // Public API
  global.openCarouselPicker = openCarouselPicker;

})(window);
