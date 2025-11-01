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
    var p = getP(id);
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
  var state = {
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

  var overlay = null;
  var keyboardHandler = null;

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
      state.startId = options.startId != null ? options.startId : null;
      state.blockIds = options.blockIds || [];
      state.onIndexChange = options.onIndexChange || null;
      state.resolver = resolve;
      state.isOpen = true;

      // Find starting index
      if (state.startId != null) {
        var startIdx = state.ids.indexOf(state.startId);
        state.currentIndex = startIdx >= 0 ? startIdx : 0;
      } else {
        state.currentIndex = 0;
      }

      render();
      attachEventListeners();
    });
  }

  /**
   * Render the carousel picker UI
   */
  function render() {
    // Remove existing overlay if present
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
      overlay = null;
    }

    // Create overlay
    overlay = document.createElement('div');
    overlay.className = 'carousel-picker-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', state.title);
    overlay.setAttribute('aria-modal', 'true');

    // Top section: Title
    var topSection = document.createElement('div');
    topSection.className = 'carousel-picker-top';
    
    var titleEl = document.createElement('h2');
    titleEl.className = 'carousel-picker-title';
    titleEl.textContent = state.title;
    topSection.appendChild(titleEl);
    
    overlay.appendChild(topSection);

    // Middle section: Avatar with left/right arrows
    var middleSection = document.createElement('div');
    middleSection.className = 'carousel-picker-middle';

    // Left arrow
    var leftArrow = document.createElement('button');
    leftArrow.className = 'carousel-picker-arrow carousel-picker-arrow-left';
    leftArrow.innerHTML = '&#8249;'; // ‹
    leftArrow.setAttribute('aria-label', 'Previous');
    leftArrow.disabled = (state.currentIndex === 0);
    leftArrow.onclick = function(e) {
      if (e) {
        e.stopPropagation();
      }
      if (state.currentIndex > 0) {
        state.currentIndex--;
        if (state.onIndexChange) state.onIndexChange(state.currentIndex);
        render();
      }
    };
    middleSection.appendChild(leftArrow);

    // Avatar container (tappable to select)
    var currentId = state.ids[state.currentIndex];
    var isBlocked = state.blockIds.indexOf(currentId) !== -1;
    var player = getP(currentId);

    var avatarContainer = document.createElement('div');
    avatarContainer.className = 'carousel-picker-avatar-container';
    if (!isBlocked) {
      avatarContainer.classList.add('carousel-picker-avatar-selectable');
      avatarContainer.setAttribute('tabindex', '0');
      avatarContainer.setAttribute('role', 'button');
      avatarContainer.setAttribute('aria-label', 'Select ' + safeName(currentId));
      avatarContainer.onclick = function(e) {
        if (e) {
          e.stopPropagation();
        }
        if (!isBlocked) {
          close(currentId);
        }
      };
      avatarContainer.onkeydown = function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (!isBlocked) {
            close(currentId);
          }
        }
      };
    } else {
      avatarContainer.classList.add('carousel-picker-avatar-blocked');
      avatarContainer.setAttribute('aria-disabled', 'true');
    }

    // Avatar image
    var avatarImg = document.createElement('img');
    avatarImg.className = 'carousel-picker-avatar';
    avatarImg.src = resolveAvatar(currentId);
    avatarImg.alt = safeName(currentId);
    avatarImg.onerror = function() {
      // Fallback already handled in resolveAvatar
    };
    avatarContainer.appendChild(avatarImg);

    // Name under avatar
    var nameLabel = document.createElement('div');
    nameLabel.className = 'carousel-picker-name';
    nameLabel.textContent = safeName(currentId);
    avatarContainer.appendChild(nameLabel);

    // Blocked label (if applicable)
    if (isBlocked) {
      var blockedLabel = document.createElement('div');
      blockedLabel.className = 'carousel-picker-blocked-label';
      blockedLabel.textContent = 'Not Eligible';
      avatarContainer.appendChild(blockedLabel);
    }

    middleSection.appendChild(avatarContainer);

    // Right arrow
    var rightArrow = document.createElement('button');
    rightArrow.className = 'carousel-picker-arrow carousel-picker-arrow-right';
    rightArrow.innerHTML = '&#8250;'; // ›
    rightArrow.setAttribute('aria-label', 'Next');
    rightArrow.disabled = (state.currentIndex === state.ids.length - 1);
    rightArrow.onclick = function(e) {
      if (e) {
        e.stopPropagation();
      }
      if (state.currentIndex < state.ids.length - 1) {
        state.currentIndex++;
        if (state.onIndexChange) state.onIndexChange(state.currentIndex);
        render();
      }
    };
    middleSection.appendChild(rightArrow);

    overlay.appendChild(middleSection);

    // Bottom section: Cancel + Confirm buttons
    var bottomSection = document.createElement('div');
    bottomSection.className = 'carousel-picker-bottom';

    var buttonRow = document.createElement('div');
    buttonRow.className = 'carousel-picker-button-row';

    // Cancel button
    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn carousel-picker-cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.setAttribute('aria-label', 'Cancel selection');
    cancelBtn.onclick = function(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
      close(null);
    };
    buttonRow.appendChild(cancelBtn);

    // Confirm button
    var confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn primary carousel-picker-confirm';
    confirmBtn.textContent = state.actionLabel;
    confirmBtn.setAttribute('aria-label', state.actionLabel + ' ' + safeName(currentId));
    confirmBtn.disabled = isBlocked;
    confirmBtn.onclick = function(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
      if (!isBlocked) {
        close(currentId);
      }
    };
    buttonRow.appendChild(confirmBtn);

    bottomSection.appendChild(buttonRow);

    // Counter (e.g., "3 / 7")
    var counter = document.createElement('div');
    counter.className = 'carousel-picker-counter';
    counter.textContent = (state.currentIndex + 1) + ' / ' + state.ids.length;
    bottomSection.appendChild(counter);

    overlay.appendChild(bottomSection);

    // Add to body
    document.body.appendChild(overlay);

    // Prevent events from bubbling to router/HUD while allowing interaction with controls
    // Strategy: Only stopPropagation on non-interactive targets to prevent HUD/router interference
    // For interactive targets (buttons, inputs), let events bubble to their handlers
    
    var isInteractiveFn = global.isInteractiveEvent || function(e) {
      if (!e || !e.target) return false;
      return !!e.target.closest('button, [role="button"], a, input, select, textarea, [data-action]');
    };

    // Handle click events
    overlay.addEventListener('click', function(e) {
      // Let clicks on interactive controls bubble to their handlers
      if (!isInteractiveFn(e)) {
        e.stopPropagation();
      }
    }, true);

    // Handle pointer events (unified mouse/touch/pen)
    overlay.addEventListener('pointerdown', function(e) {
      if (!isInteractiveFn(e)) {
        e.stopPropagation();
      }
    }, true);

    overlay.addEventListener('pointerup', function(e) {
      if (!isInteractiveFn(e)) {
        e.stopPropagation();
      }
    }, true);

    // Handle touch events with proper passive flag
    overlay.addEventListener('touchstart', function(e) {
      // Don't prevent default on interactive controls to allow click synthesis
      if (!isInteractiveFn(e)) {
        e.stopPropagation();
      }
    }, { passive: true, capture: true });

    overlay.addEventListener('touchend', function(e) {
      // Don't prevent default on interactive controls to allow click synthesis
      if (!isInteractiveFn(e)) {
        e.stopPropagation();
      }
    }, { passive: true, capture: true });

    // Animate in
    requestAnimationFrame(function() {
      overlay.classList.add('carousel-picker-visible');
    });

    // Focus confirm button
    setTimeout(function() {
      confirmBtn.focus();
    }, 100);
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
          render();
        }
      } else if (e.key === 'ArrowRight' || e.key === 'Right') {
        e.preventDefault();
        if (state.currentIndex < state.ids.length - 1) {
          state.currentIndex++;
          if (state.onIndexChange) state.onIndexChange(state.currentIndex);
          render();
        }
      } else if (e.key === 'Enter') {
        // Confirm current selection if not blocked
        var currentId = state.ids[state.currentIndex];
        var isBlocked = state.blockIds.indexOf(currentId) !== -1;
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
        render();
      } else if (e.key === 'End') {
        e.preventDefault();
        state.currentIndex = state.ids.length - 1;
        if (state.onIndexChange) state.onIndexChange(state.currentIndex);
        render();
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
    if (overlay) {
      overlay.classList.remove('carousel-picker-visible');
      setTimeout(function() {
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        overlay = null;
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
