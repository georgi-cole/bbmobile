/**
 * mobileRoster.badge-machine.js
 * 
 * Badge state machine orchestrator for mobile roster.
 * Manages the pill→emoji flow and combo badge display.
 * 
 * This module wraps and exports the badge animation functions from mobileRoster.js,
 * providing an explicit interface for badge management.
 * 
 * Flow:
 * 1. On badge-granting event (HOH, POV, NOM, SAFE):
 *    - showBadgePill() replaces name footer with centered pill for up to 7s
 * 2. On pill dismissal (timeout or fast-forward):
 *    - Corner emoji(s) appear in top-right of avatar
 * 3. Combo badges (HOH+POV, POV+NOM, etc.):
 *    - Multiple emojis grouped compactly in corner-emoji-group
 * 4. SAFE only shows if it's the sole status token
 * 
 * Events:
 * - player:hoh, player:veto, player:nominated, player:safe -> trigger pill animation
 * - phase:skip, phase:fastforward, game:fastforward -> dismiss pills immediately
 * - badge:remove, nominee:replaced -> clear specific badge
 */

(function(global) {
  'use strict';

  // ============================
  // Configuration
  // ============================

  const CONFIG = {
    // Badge priority order (highest to lowest)
    BADGE_PRIORITY: ['WINNER', 'RUNNER-UP', 'HOH', 'POV', 'NOM', 'SAFE'],
    
    // Badge emojis
    BADGE_EMOJI: {
      'WINNER': '🥇',
      'RUNNER-UP': '🥈',
      'HOH': '👑',
      'POV': '🛡️',
      'NOM': '❓',
      'SAFE': '✅'
    },
    
    // Pill duration before emoji transition
    PILL_DURATION_MS: 7000,
  };

  // ============================
  // State
  // ============================

  const state = {
    initialized: false,
  };

  // ============================
  // Utility Functions
  // ============================

  /**
   * Get MobileRoster module with fallback
   */
  function getMobileRoster() {
    return global.MobileRoster || null;
  }

  /**
   * Check if badge-machine is ready (MobileRoster loaded)
   */
  function isReady() {
    return !!getMobileRoster();
  }

  // ============================
  // Badge Animation API
  // ============================

  /**
   * Trigger badge animation (pill then emoji)
   * This is the main entry point for badge events.
   * 
   * @param {string|number} playerId - Player ID
   * @param {string} badgeType - Badge type ('HOH', 'POV', 'NOM', 'SAFE')
   */
  function triggerBadge(playerId, badgeType) {
    const mr = getMobileRoster();
    if (!mr) {
      console.warn('[BadgeMachine] MobileRoster not available');
      return;
    }
    
    if (typeof mr.triggerBadgeAnimation === 'function') {
      mr.triggerBadgeAnimation(playerId, badgeType);
    } else {
      console.warn('[BadgeMachine] triggerBadgeAnimation not found on MobileRoster');
    }
  }

  /**
   * Dismiss badge pill for a player
   * 
   * @param {string|number} playerId - Player ID
   * @param {boolean} showEmoji - Whether to show corner emoji after dismissal
   */
  function dismissPill(playerId, showEmoji = true) {
    const mr = getMobileRoster();
    if (!mr) return;
    
    if (typeof mr.dismissBadgePill === 'function') {
      mr.dismissBadgePill(playerId, showEmoji);
    }
  }

  /**
   * Dismiss all active badge pills (e.g., on fast-forward)
   * 
   * @param {boolean} showEmojis - Whether to show corner emojis after dismissal
   */
  function dismissAllPills(showEmojis = true) {
    const mr = getMobileRoster();
    if (!mr) return;
    
    if (typeof mr.dismissAllBadgePills === 'function') {
      mr.dismissAllBadgePills(showEmojis);
    }
  }

  /**
   * Show corner emoji for a player
   * 
   * @param {string|number} playerId - Player ID
   * @param {string} badgeType - Badge type ('HOH', 'POV', 'NOM', 'SAFE')
   */
  function showEmoji(playerId, badgeType) {
    const mr = getMobileRoster();
    if (!mr) return;
    
    if (typeof mr.showCornerEmoji === 'function') {
      mr.showCornerEmoji(playerId, badgeType);
    }
  }

  /**
   * Show combo emojis for a player with multiple statuses
   * 
   * @param {string|number} playerId - Player ID
   * @param {Array<string>} badges - Array of badge types in priority order
   */
  function showComboEmojis(playerId, badges) {
    const mr = getMobileRoster();
    if (!mr) return;
    
    if (typeof mr.showComboEmojis === 'function') {
      mr.showComboEmojis(playerId, badges);
    }
  }

  /**
   * Clear corner emoji(s) from a player
   * 
   * @param {string|number} playerId - Player ID
   * @param {string} [badgeType] - Specific badge type to clear, or all if omitted
   */
  function clearEmoji(playerId, badgeType) {
    const mr = getMobileRoster();
    if (!mr) return;
    
    if (typeof mr.clearCornerEmoji === 'function') {
      mr.clearCornerEmoji(playerId, badgeType);
    }
  }

  // ============================
  // Event Subscription
  // ============================

  /**
   * Subscribe to game events for badge updates
   * Called once during initialization.
   */
  function subscribeToEvents() {
    const bus = global.bbGameBus;
    if (!bus) {
      console.warn('[BadgeMachine] bbGameBus not available, skipping event subscription');
      return;
    }

    // Badge-granting events -> MobileRoster handles these, but we can add hooks here
    // Note: MobileRoster.js already subscribes to these events, so we don't duplicate
    
    // Fast-forward and skip events -> ensure pills are dismissed
    bus.on('phase:skip', () => dismissAllPills(true));
    bus.on('phase:fastforward', () => dismissAllPills(true));
    bus.on('game:fastforward', () => dismissAllPills(true));

    console.info('[BadgeMachine] Subscribed to fast-forward events');
  }

  // ============================
  // Initialization
  // ============================

  /**
   * Initialize the badge machine
   * This should be called after MobileRoster is loaded.
   */
  function init() {
    if (state.initialized) {
      console.warn('[BadgeMachine] Already initialized');
      return;
    }

    // Wait for MobileRoster to be available
    if (!isReady()) {
      console.info('[BadgeMachine] Waiting for MobileRoster...');
      const checkReady = setInterval(() => {
        if (isReady()) {
          clearInterval(checkReady);
          completeInit();
        }
      }, 100);
      
      // Timeout after 5 seconds - skip init entirely if MobileRoster not available
      setTimeout(() => {
        clearInterval(checkReady);
        if (!state.initialized) {
          console.warn('[BadgeMachine] MobileRoster not available after 5s, skipping initialization');
          // Don't initialize without MobileRoster - the API functions will gracefully return early
          state.initialized = true; // Mark as "initialized" to prevent duplicate attempts
        }
      }, 5000);
      return;
    }

    completeInit();
  }

  function completeInit() {
    subscribeToEvents();
    state.initialized = true;
    console.info('[BadgeMachine] Initialized');
  }

  // ============================
  // Auto-initialization
  // ============================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already loaded, init after a short delay
    setTimeout(init, 100);
  }

  // ============================
  // Public API
  // ============================

  global.BadgeMachine = {
    init,
    isReady,
    triggerBadge,
    dismissPill,
    dismissAllPills,
    showEmoji,
    showComboEmojis,
    clearEmoji,
    CONFIG,
  };

  console.info('[BadgeMachine] Module loaded');

})(window);
