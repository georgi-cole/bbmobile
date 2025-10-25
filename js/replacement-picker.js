// MODULE: replacement-picker.js
// Avatar-first replacement nominee picker for veto ceremonies
// Displays eligible houseguests in a grid, with tap-to-confirm flow

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
    // Fallback to basic avatar resolution
    var p = getP(id);
    if (p && p.avatar) return p.avatar;
    if (p && p.img) return p.img;
    if (p && p.photo) return p.photo;
    // Try common paths
    if (p && p.name) return './avatars/' + p.name + '.png';
    return './avatars/' + id + '.png';
  }

  // State management
  var state = {
    isVisible: false,
    eligibleIds: [],
    blockedIds: [],
    selectedId: null,
    onConfirm: null,
    view: 'grid', // 'grid', 'carousel', or 'confirm'
    viewMode: 'auto', // 'auto', 'grid', or 'carousel'
    carouselIndex: 0,
    touchStartX: 0,
    touchEndX: 0
  };

  // DOM elements
  var overlay = null;
  var container = null;

  // Initialize DOM structure
  function initDOM() {
    if (overlay) return; // Already initialized

    var tv = document.getElementById('tv');
    if (!tv) {
      console.warn('[rpPicker] TV element not found');
      return;
    }

    // Create overlay container
    overlay = document.createElement('div');
    overlay.className = 'rp-overlay';
    overlay.style.display = 'none';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Select replacement nominee');
    overlay.setAttribute('aria-modal', 'true');

    // Create content container with fixed design canvas
    container = document.createElement('div');
    container.className = 'rp-fit';
    overlay.appendChild(container);

    tv.appendChild(overlay);

    // Set up ResizeObserver to scale content
    if (typeof ResizeObserver !== 'undefined') {
      var ro = new ResizeObserver(function(entries) {
        if (!state.isVisible) return;
        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i];
          var width = entry.contentRect.width;
          var height = entry.contentRect.height;
          scaleContent(width, height);
        }
      });
      ro.observe(tv);
    }
  }

  // Scale content to fit TV viewport without scrolling
  function scaleContent(tvWidth, tvHeight) {
    if (!container) return;
    
    // Design canvas: 1200x560 (will scale to fit)
    var designWidth = 1200;
    var designHeight = 560;
    
    // Calculate safe area (accounting for TV frame)
    var safeWidth = tvWidth - 32; // 16px padding each side
    var safeHeight = tvHeight - 86; // 44px top + 42px bottom
    
    var scaleX = safeWidth / designWidth;
    var scaleY = safeHeight / designHeight;
    var scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond 1
    
    container.style.width = designWidth + 'px';
    container.style.height = designHeight + 'px';
    container.style.transform = 'scale(' + scale + ')';
    container.style.transformOrigin = 'center center';
  }

  // Build avatar grid view
  function buildGridView() {
    container.innerHTML = '';

    // Title
    var title = document.createElement('div');
    title.className = 'rp-title';
    title.textContent = 'Select Replacement Nominee';
    container.appendChild(title);

    // Grid container
    var grid = document.createElement('div');
    grid.className = 'rp-grid';
    grid.setAttribute('role', 'radiogroup');
    grid.setAttribute('aria-label', 'Available houseguests');

    var allIds = state.eligibleIds.concat(state.blockedIds);
    
    for (var i = 0; i < allIds.length; i++) {
      var playerId = allIds[i];
      var isBlocked = state.blockedIds.indexOf(playerId) !== -1;
      
      var tile = document.createElement('div');
      tile.className = 'rp-tile';
      tile.setAttribute('role', 'radio');
      tile.setAttribute('aria-checked', 'false');
      tile.setAttribute('data-player-id', playerId);
      
      if (isBlocked) {
        tile.classList.add('rp-tile-disabled');
        tile.setAttribute('aria-disabled', 'true');
      } else {
        tile.setAttribute('tabindex', i === 0 ? '0' : '-1');
        (function(id) {
          tile.onclick = function() {
            selectPlayer(id);
          };
          tile.onkeydown = function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              selectPlayer(id);
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
              e.preventDefault();
              focusNextTile(tile);
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
              e.preventDefault();
              focusPrevTile(tile);
            }
          };
        })(playerId);
      }

      // Avatar
      var avatarWrapper = document.createElement('div');
      avatarWrapper.className = 'rp-avatar';
      var avatarImg = document.createElement('img');
      avatarImg.src = resolveAvatar(playerId);
      avatarImg.alt = safeName(playerId);
      avatarImg.onerror = function() {
        // Fallback to dicebear on error
        if (typeof global.getDicebearUrl === 'function') {
          this.src = global.getDicebearUrl(safeName(playerId));
        }
      };
      avatarWrapper.appendChild(avatarImg);
      tile.appendChild(avatarWrapper);

      // Name
      var nameLabel = document.createElement('div');
      nameLabel.className = 'rp-name';
      nameLabel.textContent = safeName(playerId);
      tile.appendChild(nameLabel);

      grid.appendChild(tile);
    }

    container.appendChild(grid);
  }

  // Build carousel view (mobile-first, one avatar per slide)
  function buildCarouselView() {
    container.innerHTML = '';

    // Only show eligible players in carousel
    var carouselIds = state.eligibleIds.slice();
    if (carouselIds.length === 0) {
      console.warn('[rpPicker] No eligible players for carousel');
      return;
    }

    // Ensure carousel index is in bounds
    if (state.carouselIndex < 0) state.carouselIndex = 0;
    if (state.carouselIndex >= carouselIds.length) state.carouselIndex = carouselIds.length - 1;

    var currentId = carouselIds[state.carouselIndex];

    // Title
    var title = document.createElement('div');
    title.className = 'rp-title';
    title.textContent = 'Select Replacement Nominee';
    container.appendChild(title);

    // Carousel container
    var carouselContainer = document.createElement('div');
    carouselContainer.className = 'rp-carousel';
    carouselContainer.setAttribute('role', 'region');
    carouselContainer.setAttribute('aria-label', 'Replacement nominee carousel');

    // Navigation buttons
    var navContainer = document.createElement('div');
    navContainer.className = 'rp-carousel-nav';

    // Left arrow
    var leftBtn = document.createElement('button');
    leftBtn.className = 'rp-carousel-arrow rp-carousel-arrow-left';
    leftBtn.innerHTML = '&#8249;'; // ‹
    leftBtn.setAttribute('aria-label', 'Previous nominee');
    leftBtn.disabled = (state.carouselIndex === 0);
    leftBtn.onclick = function() {
      if (state.carouselIndex > 0) {
        state.carouselIndex--;
        buildCarouselView();
      }
    };

    // Current player card
    var playerCard = document.createElement('div');
    playerCard.className = 'rp-carousel-card';
    
    // Avatar
    var avatarWrapper = document.createElement('div');
    avatarWrapper.className = 'rp-carousel-avatar';
    var avatarImg = document.createElement('img');
    avatarImg.src = resolveAvatar(currentId);
    avatarImg.alt = safeName(currentId);
    avatarImg.onerror = function() {
      if (typeof global.getDicebearUrl === 'function') {
        this.src = global.getDicebearUrl(safeName(currentId));
      }
    };
    avatarWrapper.appendChild(avatarImg);
    playerCard.appendChild(avatarWrapper);

    // Name
    var nameLabel = document.createElement('div');
    nameLabel.className = 'rp-carousel-name';
    nameLabel.textContent = safeName(currentId);
    playerCard.appendChild(nameLabel);

    // Action button
    var nominateBtn = document.createElement('button');
    nominateBtn.className = 'btn primary rp-carousel-nominate';
    nominateBtn.textContent = 'Nominate ' + safeName(currentId);
    nominateBtn.setAttribute('aria-label', 'Nominate ' + safeName(currentId) + ' as replacement');
    nominateBtn.onclick = function() {
      selectPlayer(currentId);
    };
    playerCard.appendChild(nominateBtn);

    // Right arrow
    var rightBtn = document.createElement('button');
    rightBtn.className = 'rp-carousel-arrow rp-carousel-arrow-right';
    rightBtn.innerHTML = '&#8250;'; // ›
    rightBtn.setAttribute('aria-label', 'Next nominee');
    rightBtn.disabled = (state.carouselIndex === carouselIds.length - 1);
    rightBtn.onclick = function() {
      if (state.carouselIndex < carouselIds.length - 1) {
        state.carouselIndex++;
        buildCarouselView();
      }
    };

    navContainer.appendChild(leftBtn);
    navContainer.appendChild(playerCard);
    navContainer.appendChild(rightBtn);
    carouselContainer.appendChild(navContainer);

    // Navigation dots
    if (carouselIds.length > 1) {
      var dotsContainer = document.createElement('div');
      dotsContainer.className = 'rp-carousel-dots';
      dotsContainer.setAttribute('role', 'tablist');

      for (var i = 0; i < carouselIds.length; i++) {
        (function(index) {
          var dot = document.createElement('button');
          dot.className = 'rp-carousel-dot';
          if (index === state.carouselIndex) {
            dot.classList.add('active');
          }
          dot.setAttribute('role', 'tab');
          dot.setAttribute('aria-label', 'Go to nominee ' + (index + 1));
          dot.setAttribute('aria-selected', index === state.carouselIndex ? 'true' : 'false');
          dot.onclick = function() {
            state.carouselIndex = index;
            buildCarouselView();
          };
          dotsContainer.appendChild(dot);
        })(i);
      }

      carouselContainer.appendChild(dotsContainer);
    }

    // Counter (e.g., "3 / 7")
    var counter = document.createElement('div');
    counter.className = 'rp-carousel-counter';
    counter.textContent = (state.carouselIndex + 1) + ' / ' + carouselIds.length;
    carouselContainer.appendChild(counter);

    container.appendChild(carouselContainer);

    // Keyboard navigation
    container.addEventListener('keydown', handleCarouselKeyboard);
    
    // Touch/swipe support
    carouselContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
    carouselContainer.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    // Focus nominate button
    setTimeout(function() {
      nominateBtn.focus();
    }, 50);
  }

  // Handle keyboard navigation in carousel
  function handleCarouselKeyboard(e) {
    if (state.view !== 'carousel') return;
    
    var carouselIds = state.eligibleIds.slice();
    
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (state.carouselIndex > 0) {
        state.carouselIndex--;
        buildCarouselView();
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (state.carouselIndex < carouselIds.length - 1) {
        state.carouselIndex++;
        buildCarouselView();
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      state.carouselIndex = 0;
      buildCarouselView();
    } else if (e.key === 'End') {
      e.preventDefault();
      state.carouselIndex = carouselIds.length - 1;
      buildCarouselView();
    }
  }

  // Handle touch start for swipe
  function handleTouchStart(e) {
    if (e.touches && e.touches.length > 0) {
      state.touchStartX = e.touches[0].clientX;
    }
  }

  // Handle touch end for swipe
  function handleTouchEnd(e) {
    if (e.changedTouches && e.changedTouches.length > 0) {
      state.touchEndX = e.changedTouches[0].clientX;
      handleSwipe();
    }
  }

  // Detect swipe direction and navigate
  function handleSwipe() {
    var swipeThreshold = 50; // Minimum swipe distance in pixels
    var diff = state.touchStartX - state.touchEndX;
    
    if (Math.abs(diff) > swipeThreshold) {
      var carouselIds = state.eligibleIds.slice();
      
      if (diff > 0) {
        // Swipe left (next)
        if (state.carouselIndex < carouselIds.length - 1) {
          state.carouselIndex++;
          buildCarouselView();
        }
      } else {
        // Swipe right (previous)
        if (state.carouselIndex > 0) {
          state.carouselIndex--;
          buildCarouselView();
        }
      }
    }
  }

  // Determine which view mode to use
  function determineViewMode() {
    // If viewMode is explicitly set, use it
    if (state.viewMode === 'grid') return 'grid';
    if (state.viewMode === 'carousel') return 'carousel';
    
    // Auto mode: use carousel on mobile (width < 768px)
    var tv = document.getElementById('tv');
    if (tv) {
      var width = tv.offsetWidth;
      return (width < 768) ? 'carousel' : 'grid';
    }
    
    // Default to grid if can't determine
    return 'grid';
  }

  // Focus management for keyboard navigation
  function focusNextTile(currentTile) {
    var tiles = Array.from(container.querySelectorAll('.rp-tile:not(.rp-tile-disabled)'));
    var idx = tiles.indexOf(currentTile);
    if (idx >= 0 && idx < tiles.length - 1) {
      tiles[idx + 1].focus();
    }
  }

  function focusPrevTile(currentTile) {
    var tiles = Array.from(container.querySelectorAll('.rp-tile:not(.rp-tile-disabled)'));
    var idx = tiles.indexOf(currentTile);
    if (idx > 0) {
      tiles[idx - 1].focus();
    }
  }

  // Select a player and show confirm view
  function selectPlayer(playerId) {
    state.selectedId = playerId;
    state.view = 'confirm';
    buildConfirmView();
  }

  // Build confirm view
  function buildConfirmView() {
    container.innerHTML = '';

    var confirmBox = document.createElement('div');
    confirmBox.className = 'rp-confirm';

    // Large avatar
    var avatarWrapper = document.createElement('div');
    avatarWrapper.className = 'rp-avatar rp-avatar-large';
    var avatarImg = document.createElement('img');
    avatarImg.src = resolveAvatar(state.selectedId);
    avatarImg.alt = safeName(state.selectedId);
    avatarImg.onerror = function() {
      if (typeof global.getDicebearUrl === 'function') {
        this.src = global.getDicebearUrl(safeName(state.selectedId));
      }
    };
    avatarWrapper.appendChild(avatarImg);
    confirmBox.appendChild(avatarWrapper);

    // Name
    var nameLabel = document.createElement('div');
    nameLabel.className = 'rp-name rp-name-large';
    nameLabel.textContent = safeName(state.selectedId);
    confirmBox.appendChild(nameLabel);

    // Question
    var question = document.createElement('div');
    question.className = 'rp-question';
    question.textContent = 'Nominate ' + safeName(state.selectedId) + ' as replacement?';
    confirmBox.appendChild(question);

    // Button row
    var buttonRow = document.createElement('div');
    buttonRow.className = 'rp-actions';

    var backBtn = document.createElement('button');
    backBtn.className = 'btn rp-back';
    backBtn.textContent = 'Back';
    backBtn.setAttribute('aria-label', 'Go back to selection');
    backBtn.onclick = function() {
      state.selectedId = null;
      var viewMode = determineViewMode();
      state.view = viewMode;
      if (viewMode === 'carousel') {
        buildCarouselView();
      } else {
        buildGridView();
        focusFirstTile();
      }
    };

    var okBtn = document.createElement('button');
    okBtn.className = 'btn primary rp-ok';
    okBtn.textContent = 'OK';
    okBtn.setAttribute('aria-label', 'Confirm selection');
    okBtn.onclick = function() {
      confirmSelection();
    };

    // Focus OK button by default
    setTimeout(function() {
      okBtn.focus();
    }, 50);

    buttonRow.appendChild(backBtn);
    buttonRow.appendChild(okBtn);
    confirmBox.appendChild(buttonRow);

    container.appendChild(confirmBox);
  }

  // Focus first eligible tile
  function focusFirstTile() {
    var firstTile = container.querySelector('.rp-tile:not(.rp-tile-disabled)');
    if (firstTile) {
      setTimeout(function() {
        firstTile.focus();
      }, 50);
    }
  }

  // Confirm selection and close picker
  function confirmSelection() {
    var selectedId = state.selectedId;
    hide();
    if (state.onConfirm && typeof state.onConfirm === 'function') {
      state.onConfirm(selectedId);
    }
  }

  // Show picker
  function show(options) {
    if (!options || !options.eligibleIds || options.eligibleIds.length === 0) {
      console.warn('[rpPicker] show() called with no eligible IDs');
      return;
    }

    initDOM();
    
    state.isVisible = true;
    state.eligibleIds = options.eligibleIds || [];
    state.blockedIds = options.blockedIds || [];
    state.onConfirm = options.onConfirm || null;
    state.viewMode = options.viewMode || 'auto';
    state.carouselIndex = 0;
    state.selectedId = null;

    // Determine which view to show
    var viewMode = determineViewMode();
    state.view = viewMode;

    if (viewMode === 'carousel') {
      buildCarouselView();
    } else {
      buildGridView();
    }
    
    overlay.style.display = 'flex';
    
    // Apply initial scaling
    var tv = document.getElementById('tv');
    if (tv) {
      scaleContent(tv.offsetWidth, tv.offsetHeight);
    }

    if (viewMode === 'grid') {
      focusFirstTile();
    }
  }

  // Hide picker
  function hide() {
    state.isVisible = false;
    state.eligibleIds = [];
    state.blockedIds = [];
    state.onConfirm = null;
    state.view = 'grid';
    state.viewMode = 'auto';
    state.selectedId = null;
    state.carouselIndex = 0;

    if (overlay) {
      overlay.style.display = 'none';
    }
    
    // Clean up event listeners
    if (container) {
      container.removeEventListener('keydown', handleCarouselKeyboard);
    }
  }

  // Public API
  global.rpPicker = {
    show: show,
    hide: hide
  };

})(window);
