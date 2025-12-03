/**
 * actionMenu.js
 * 
 * Grouped action menu for top toolbar buttons
 * Consolidates Settings, Rules, Profile, and other action buttons
 * into a single menu button with popover for decluttered mobile UI
 */

(function(global) {
  'use strict';

  // ============================
  // Configuration
  // ============================

  const CONFIG = {
    MENU_BUTTON_ID: 'actionMenuBtn',
    POPOVER_ID: 'actionMenuPopover',
    BACKDROP_ID: 'actionMenuBackdrop',
    MENU_ICON: '⋮', // Vertical ellipsis
    // Timing constants
    FOCUS_ANIMATION_DELAY: 50, // Delay for menu item focus after animation (ms)
    // Initialization retry constants
    RETRY_BASE_DELAY: 100, // Base delay for retry attempts (ms)
    RETRY_MULTIPLIER: 1.5, // Exponential backoff multiplier
    MAX_RETRY_DELAY: 1000, // Maximum retry delay (ms)
    MAX_RETRY_ATTEMPTS: 10, // Maximum number of initialization attempts
    // Buttons to group into the menu (in order)
    GROUPED_BUTTONS: [
      { id: 'btnOpenSettings', icon: '⚙️', label: 'Settings' },
      { id: 'btnRules', icon: '📋', label: 'Rules' },
      { id: 'btnProfile', icon: '👤', label: 'Profile' },
      { id: 'btnStartQuick', icon: '▶', label: 'Restart' },
      // Note: dynamic flag indicates button state changes, but we use static icon
      // in menu since the original button handles its own icon updates
      { id: 'btnMuteToggle', icon: '🔊', label: 'Sound', dynamic: true },
      { id: 'xpLeaderboardBadge', icon: '📊', label: 'Leaderboard' },
    ],
  };

  // ============================
  // State
  // ============================

  const state = {
    initialized: false,
    isOpen: false,
    menuButton: null,
    popover: null,
    backdrop: null,
    initAttempts: 0,
    initTimer: null, // Track initialization timer
  };

  // ============================
  // Initialization
  // ============================

  /**
   * Initialize the action menu
   */
  function init() {
    if (state.initialized) {
      console.warn('[ActionMenu] Already initialized');
      return;
    }

    // Create menu button
    createMenuButton();
    
    // Create popover
    createPopover();
    
    // Create backdrop
    createBackdrop();
    
    // Hide original buttons
    hideOriginalButtons();
    
    // Wire up event listeners
    setupEventListeners();
    
    state.initialized = true;
    console.info('[ActionMenu] Initialized');
  }

  /**
   * Create the menu button (vertical ellipsis)
   */
  function createMenuButton() {
    const toolbar = document.querySelector('.topbar');
    if (!toolbar) {
      console.error('[ActionMenu] Toolbar not found');
      return;
    }

    // Create button
    const button = document.createElement('button');
    button.id = CONFIG.MENU_BUTTON_ID;
    button.className = 'btn iconOnly action-menu-btn';
    button.textContent = CONFIG.MENU_ICON;
    button.setAttribute('aria-label', 'Actions menu');
    button.setAttribute('aria-haspopup', 'true');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('title', 'Actions');
    button.type = 'button';

    // Insert at the end of toolbar (far right)
    toolbar.appendChild(button);

    state.menuButton = button;
  }

  /**
   * Create the popover menu
   */
  function createPopover() {
    const popover = document.createElement('div');
    popover.id = CONFIG.POPOVER_ID;
    popover.className = 'action-menu-popover';
    popover.setAttribute('role', 'menu');
    popover.setAttribute('aria-label', 'Actions menu');

    // Create menu list
    const list = document.createElement('ul');
    list.className = 'action-menu-list';
    list.setAttribute('role', 'none');

    // Filter to only include buttons that exist
    const validButtons = CONFIG.GROUPED_BUTTONS.filter(buttonConfig => {
      const exists = !!document.getElementById(buttonConfig.id);
      if (!exists) {
        console.warn(`[ActionMenu] Original button not found: ${buttonConfig.id}`);
      }
      return exists;
    });

    // Add menu items for each grouped button
    validButtons.forEach((buttonConfig, index) => {
      const originalButton = document.getElementById(buttonConfig.id);

      // Create menu item
      const item = document.createElement('li');
      item.className = 'action-menu-item';
      item.setAttribute('role', 'none');

      const itemButton = document.createElement('button');
      itemButton.type = 'button';
      itemButton.className = 'action-menu-item-btn';
      itemButton.setAttribute('role', 'menuitem');
      itemButton.dataset.originalId = buttonConfig.id;

      // Icon
      const icon = document.createElement('span');
      icon.className = 'action-menu-item-icon';
      icon.textContent = buttonConfig.icon;
      icon.setAttribute('aria-hidden', 'true');

      // Label
      const label = document.createElement('span');
      label.className = 'action-menu-item-label';
      label.textContent = buttonConfig.label;

      itemButton.appendChild(icon);
      itemButton.appendChild(label);
      item.appendChild(itemButton);

      // Add click handler
      itemButton.addEventListener('click', () => {
        handleMenuItemClick(buttonConfig.id);
      });

      list.appendChild(item);

      // Add divider after first item (Settings)
      if (index === 0 && validButtons.length > 1) {
        const divider = document.createElement('div');
        divider.className = 'action-menu-divider';
        divider.setAttribute('role', 'separator');
        list.appendChild(divider);
      }
    });

    popover.appendChild(list);
    document.body.appendChild(popover);

    state.popover = popover;
  }

  /**
   * Create backdrop for click-outside detection
   */
  function createBackdrop() {
    const backdrop = document.createElement('div');
    backdrop.id = CONFIG.BACKDROP_ID;
    backdrop.className = 'action-menu-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');

    backdrop.addEventListener('click', () => {
      closeMenu();
    });

    document.body.appendChild(backdrop);
    state.backdrop = backdrop;
  }

  /**
   * Hide original buttons from toolbar
   */
  function hideOriginalButtons() {
    CONFIG.GROUPED_BUTTONS.forEach(buttonConfig => {
      const button = document.getElementById(buttonConfig.id);
      if (button) {
        button.style.display = 'none';
        button.dataset.hiddenByMenu = 'true';
      }
    });
  }

  /**
   * Show original buttons (for desktop or if menu is disabled)
   */
  function showOriginalButtons() {
    CONFIG.GROUPED_BUTTONS.forEach(buttonConfig => {
      const button = document.getElementById(buttonConfig.id);
      if (button && button.dataset.hiddenByMenu === 'true') {
        button.style.display = '';
        delete button.dataset.hiddenByMenu;
      }
    });
  }

  // ============================
  // Event Handlers
  // ============================

  /**
   * Setup event listeners
   */
  function setupEventListeners() {
    // Menu button click
    if (state.menuButton) {
      state.menuButton.addEventListener('click', toggleMenu);
    }

    // Keyboard navigation
    document.addEventListener('keydown', handleKeyDown);

    // Close menu on window resize (viewport change)
    window.addEventListener('resize', () => {
      if (state.isOpen) {
        closeMenu();
      }
    });
  }

  /**
   * Toggle menu open/closed
   */
  function toggleMenu() {
    if (state.isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  /**
   * Open the menu
   */
  function openMenu() {
    if (state.isOpen) return;

    state.isOpen = true;

    // Update button state
    if (state.menuButton) {
      state.menuButton.setAttribute('aria-expanded', 'true');
    }

    // Show popover
    if (state.popover) {
      state.popover.classList.add('visible');
      
      // Focus first menu item after animation
      setTimeout(() => {
        const firstItem = state.popover.querySelector('.action-menu-item-btn');
        if (firstItem) {
          firstItem.focus();
        }
      }, CONFIG.FOCUS_ANIMATION_DELAY);
    }

    // Show backdrop
    if (state.backdrop) {
      state.backdrop.classList.add('visible');
    }
  }

  /**
   * Close the menu
   */
  function closeMenu() {
    if (!state.isOpen) return;

    state.isOpen = false;

    // Update button state
    if (state.menuButton) {
      state.menuButton.setAttribute('aria-expanded', 'false');
    }

    // Hide popover
    if (state.popover) {
      state.popover.classList.remove('visible');
    }

    // Hide backdrop
    if (state.backdrop) {
      state.backdrop.classList.remove('visible');
    }

    // Return focus to menu button
    if (state.menuButton) {
      state.menuButton.focus();
    }
  }

  /**
   * Handle menu item click
   */
  function handleMenuItemClick(originalButtonId) {
    // Close menu first
    closeMenu();

    // Find and trigger the original button
    const originalButton = document.getElementById(originalButtonId);
    if (originalButton) {
      // Use requestAnimationFrame for better responsiveness
      requestAnimationFrame(() => {
        originalButton.click();
      });
    } else {
      console.warn(`[ActionMenu] Original button not found: ${originalButtonId}`);
    }
  }

  /**
   * Handle keyboard navigation
   */
  function handleKeyDown(e) {
    if (!state.isOpen) {
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        closeMenu();
        break;

      case 'ArrowDown':
        e.preventDefault();
        focusNextItem();
        break;

      case 'ArrowUp':
        e.preventDefault();
        focusPreviousItem();
        break;

      case 'Home':
        e.preventDefault();
        focusFirstItem();
        break;

      case 'End':
        e.preventDefault();
        focusLastItem();
        break;
    }
  }

  /**
   * Focus next menu item
   */
  function focusNextItem() {
    const items = Array.from(state.popover.querySelectorAll('.action-menu-item-btn'));
    const currentIndex = items.indexOf(document.activeElement);
    
    if (currentIndex < items.length - 1) {
      items[currentIndex + 1].focus();
    } else {
      items[0].focus(); // Wrap to first
    }
  }

  /**
   * Focus previous menu item
   */
  function focusPreviousItem() {
    const items = Array.from(state.popover.querySelectorAll('.action-menu-item-btn'));
    const currentIndex = items.indexOf(document.activeElement);
    
    if (currentIndex > 0) {
      items[currentIndex - 1].focus();
    } else {
      items[items.length - 1].focus(); // Wrap to last
    }
  }

  /**
   * Focus first menu item
   */
  function focusFirstItem() {
    const firstItem = state.popover.querySelector('.action-menu-item-btn');
    if (firstItem) {
      firstItem.focus();
    }
  }

  /**
   * Focus last menu item
   */
  function focusLastItem() {
    const items = state.popover.querySelectorAll('.action-menu-item-btn');
    const lastItem = items[items.length - 1];
    if (lastItem) {
      lastItem.focus();
    }
  }

  // ============================
  // Public API
  // ============================

  /**
   * Get current state
   */
  function getState() {
    return {
      initialized: state.initialized,
      isOpen: state.isOpen,
    };
  }

  /**
   * Enable/disable menu (show/hide original buttons)
   */
  function setEnabled(enabled) {
    if (enabled) {
      hideOriginalButtons();
      if (state.menuButton) {
        state.menuButton.style.display = '';
      }
    } else {
      showOriginalButtons();
      if (state.menuButton) {
        state.menuButton.style.display = 'none';
      }
      if (state.isOpen) {
        closeMenu();
      }
    }
  }

  // ============================
  // Auto-initialization
  // ============================

  /**
   * Clear initialization timer
   */
  function clearInitTimer() {
    if (state.initTimer) {
      clearTimeout(state.initTimer);
      state.initTimer = null;
    }
  }

  // Initialize when DOM is ready
  // Use more robust approach with polling for required elements
  function tryInit() {
    // Guard against duplicate initialization
    if (state.initialized) {
      return;
    }

    // Clear any existing timer to prevent buildup
    clearInitTimer();

    const toolbar = document.querySelector('.topbar');
    const requiredButtons = CONFIG.GROUPED_BUTTONS
      .map(b => document.getElementById(b.id))
      .filter(b => b);
    
    // Only init if toolbar and at least some buttons exist
    if (toolbar && requiredButtons.length > 0) {
      init();
    } else if (!state.initialized) {
      // Retry with exponential backoff
      const retryDelay = Math.min(
        CONFIG.RETRY_BASE_DELAY * Math.pow(CONFIG.RETRY_MULTIPLIER, state.initAttempts),
        CONFIG.MAX_RETRY_DELAY
      );
      state.initAttempts += 1;
      
      if (state.initAttempts < CONFIG.MAX_RETRY_ATTEMPTS) {
        state.initTimer = setTimeout(tryInit, retryDelay);
      } else {
        console.warn(`[ActionMenu] Failed to initialize after ${CONFIG.MAX_RETRY_ATTEMPTS} attempts`);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    tryInit();
  }

  // Also try on window load as fallback
  window.addEventListener('load', () => {
    if (!state.initialized) {
      tryInit();
    }
  });

  // ============================
  // Export
  // ============================

  global.ActionMenu = {
    init,
    openMenu,
    closeMenu,
    toggleMenu,
    getState,
    setEnabled,
  };

  console.info('[ActionMenu] Module loaded');

})(window);
