// MODULE: utils/idle-timer-exhaust.js
// Automatically exhausts phase timer to 1 second when main screen is in an idle state
// (no modals, popups, games, or user interactions pending)

(function(global) {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════

  let enabled = false;
  let intervalId = null;
  const CHECK_INTERVAL_MS = 500;
  const EXHAUST_THRESHOLD_MS = 1000; // Only exhaust if remaining time > 1 second

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE DETECTION FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check if main screen has been built
   * @returns {boolean}
   */
  function isMainScreenBuilt() {
    return document.body.classList.contains('main-screen-built');
  }

  /**
   * Check if any modal is currently open
   * @returns {boolean}
   */
  function isModalOpen() {
    // Check for visible modal backdrops
    const modalBackdrops = [
      '.modal-backdrop.open',
      '.modal-backdrop[style*="display: flex"]',
      '.modal-backdrop[style*="display:flex"]',
      '[role="dialog"][style*="display: flex"]',
      '[role="dialog"][style*="display:flex"]',
      '.rulesDim[style*="display: flex"]',
      '.settingsDim[style*="display: flex"]',
      '.profile-modal-dim[style*="display: flex"]',
      '.xp-modal-backdrop[style*="display: flex"]',
      '.socialize-modal-backdrop[style*="display: flex"]',
      '.eviction-modal-backdrop[style*="display: flex"]',
      '#settingsBackdrop[style*="display: flex"]',
      '.confirmDim[style*="display: flex"]',
      '.leaderboardDim[style*="display: flex"]',
      '.creditsDim[style*="display: flex"]',
      '.helpDim[style*="display: flex"]'
    ];

    for (const selector of modalBackdrops) {
      const element = document.querySelector(selector);
      if (element) {
        const style = window.getComputedStyle(element);
        if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
          return true;
        }
      }
    }

    // Check if intro screen is visible
    const introScreen = document.getElementById('introScreen');
    if (introScreen) {
      const style = window.getComputedStyle(introScreen);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if any visible cards exist in the TV area
   * @returns {boolean}
   */
  function hasVisibleCards() {
    const tvOverlay = document.getElementById('tvOverlay');
    
    // Check tvOverlay for any visible children
    if (tvOverlay && tvOverlay.children.length > 0) {
      const style = window.getComputedStyle(tvOverlay);
      if (style.visibility !== 'hidden' && style.display !== 'none') {
        // Check if tvOverlay has any visible children
        const children = Array.from(tvOverlay.children);
        for (const child of children) {
          // Skip canvas and badge elements
          if (child.tagName === 'CANVAS' || child.classList.contains('liveBadge') || child.classList.contains('twistBadge')) {
            continue;
          }
          // Quick check using offsetParent (null means element is not visible)
          if (child.offsetParent !== null) {
            return true;
          }
        }
      }
    }
    
    // Check for reveal cards anywhere
    const revealCards = document.querySelectorAll('.revealCard, .diaryRoomCard, .bigAnnounce');
    for (const card of revealCards) {
      if (card.offsetParent !== null) return true;
    }
    
    // Check for decision deck
    const decisionDeck = document.getElementById('decisionDeck');
    if (decisionDeck && decisionDeck.children.length > 0) {
      if (decisionDeck.offsetParent !== null) return true;
    }
    
    return false;
  }

  /**
   * Legacy alias for backwards compatibility
   * @returns {boolean}
   * @deprecated Use hasVisibleCards() instead
   */
  function isPopupCardVisible() {
    return hasVisibleCards();
  }

  /**
   * Check if any fullscreen overlay is displayed
   * @returns {boolean}
   */
  function hasFullscreenOverlay() {
    // Check for any fullscreen overlay
    const overlays = document.querySelectorAll(
      '.fullscreen-overlay, ' +
      '.minigame-fullscreen-overlay, ' +
      '.competition-fullscreen, ' +
      '.livevote-fullscreen-overlay, ' +
      '.fev-overlay, ' +  // Fullscreen eviction vote
      '.nfs-overlay, ' +  // Nominations fullscreen
      '.lv2-container, ' + // Live vote v2
      '[data-fullscreen-modal], ' +
      '.socialize-modal, ' +
      '.finale-fullscreen-overlay'
    );
    
    for (const overlay of overlays) {
      const style = window.getComputedStyle(overlay);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if competition is active (including spectator mode)
   * @returns {boolean}
   */
  function isCompetitionActive() {
    const game = global.game;
    if (!game) return false;
    
    // Check phase - competition phases should never exhaust
    const compPhases = ['hoh', 'veto_comp', 'veto', 'final3_comp1', 'final3_comp2', 'final3_comp3'];
    if (compPhases.includes(game.phase)) return true;
    
    // Check competition flags
    if (game.__compRunning) return true;
    if (game.__minigameActive) return true;
    if (game.__intermissionActive) return true;
    
    // Check for competition instruction cards
    const instructionCards = document.querySelectorAll('.competition-instructions, .comp-prompt, [data-comp-card], .competition-instructions-card');
    for (const card of instructionCards) {
      if (card.offsetParent !== null) return true;
    }
    
    return false;
  }

  /**
   * Check if social phase is active
   * @returns {boolean}
   */
  function isSocialPhaseActive() {
    const game = global.game;
    if (!game) return false;
    
    // Social phases should never exhaust
    if (game.phase === 'social' || game.phase === 'social_intermission') return true;
    
    // Check for social UI
    const socialUI = document.querySelector('#socializeModal, .socialize-modal, #socializeLauncher.active');
    if (socialUI && socialUI.offsetParent !== null) return true;
    
    return false;
  }

  /**
   * Check if ceremony is active
   * @returns {boolean}
   */
  function isCeremonyActive() {
    const game = global.game;
    if (!game) return false;
    
    // Ceremony phases
    const ceremonyPhases = ['nominations', 'veto_ceremony', 'livevote', 'jury'];
    if (ceremonyPhases.includes(game.phase)) {
      // During these phases, only exhaust if ceremony is complete AND no UI visible
      if (game.phase === 'nominations' && !game.nomsLocked) return true;
      if (game.phase === 'veto_ceremony' && !game.__vetoCeremonyResolved) return true;
      if (game.phase === 'livevote' && game.eviction && !game.eviction.sequenceComplete) return true;
      if (game.phase === 'jury' && !game.__juryVotingComplete) return true;
    }
    
    return false;
  }

  /**
   * Check if any interactive buttons are visible that need user action
   * @returns {boolean}
   */
  function hasInteractiveButtons() {
    // Check for any visible interactive buttons that need user action
    const buttons = document.querySelectorAll(
      '.decision-card button, ' +
      '.intermission-offer-button, ' +
      '.comp-start-btn, ' +
      '.btn-play-comp, ' +
      '[data-action="start-hoh"], ' +
      '[data-action="start-veto"], ' +
      '.nominate-btn, ' +
      '.vote-btn, ' +
      '.veto-use-btn, ' +
      '.veto-keep-btn, ' +
      '.plea-btn, ' +
      'button[data-nominee], ' +
      '.fev-player-card, ' +  // Eviction vote cards
      '.lv2-nominee-card'     // Live vote nominee cards
    );
    
    for (const btn of buttons) {
      if (btn.offsetParent !== null && !btn.disabled) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Legacy alias for backwards compatibility
   * @returns {boolean}
   * @deprecated Use isCompetitionActive() instead
   */
  function isGameRunning() {
    return isCompetitionActive();
  }

  /**
   * Check if user input is expected (human needs to take action)
   * @returns {boolean}
   */
  function isUserInputExpected() {
    const game = global.game;
    if (!game) return false;

    const phase = game.phase;
    const humanId = game.humanId;

    // Check phase-specific user input requirements
    switch (phase) {
      case 'livevote': {
        // Check if human hasn't voted yet
        // Look for voting UI elements
        const voteButtons = document.querySelectorAll('.vote-button:not([disabled]), button[data-vote]:not([disabled])');
        if (voteButtons.length > 0) return true;
        
        // Check if human is in players and needs to vote
        if (humanId && Array.isArray(game.players)) {
          const human = game.players.find(p => p.id === humanId);
          if (human && !human.eliminated && !game.nominees?.includes(humanId)) {
            // Check if vote has been recorded
            // Multiple flags exist for different voting implementations:
            // - game.humanVoted: Legacy live vote system
            // - game.__humanVotedThisPhase: New live vote v2 system
            if (!game.humanVoted && !game.__humanVotedThisPhase) {
              return true;
            }
          }
        }
        break;
      }

      case 'jury': {
        // Check if human is a juror who hasn't voted
        if (humanId && Array.isArray(game.jury) && game.jury.includes(humanId)) {
          // Check if jury vote has been recorded
          // Verify juryVotes is a Map before checking
          if (game.juryVotes && typeof game.juryVotes.has === 'function' && !game.juryVotes.has(humanId)) {
            return true;
          }
        }
        break;
      }

      case 'nominations': {
        // Check if human is HOH with unlocked nominations
        if (humanId && game.hohId === humanId && !game.nomsLocked) {
          return true;
        }
        break;
      }

      case 'veto_ceremony': {
        // Check if human is POV holder with unresolved ceremony
        if (humanId && game.vetoHolder === humanId && game.vetoSavedId === null) {
          return true;
        }
        break;
      }
    }

    // Check for visible interactive decision buttons
    const decisionButtons = document.querySelectorAll(
      '.decision-card button:not([disabled]), ' +
      '.ceremony-card button:not([disabled]), ' +
      '.interactive-card button:not([disabled])'
    );
    if (decisionButtons.length > 0) {
      // Ensure these are visible
      for (const btn of decisionButtons) {
        const style = window.getComputedStyle(btn);
        if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if game is paused
   * @returns {boolean}
   */
  function isGamePaused() {
    if (global.PauseController && typeof global.PauseController.isPaused === 'function') {
      return global.PauseController.isPaused();
    }
    
    // Fallback check
    const game = global.game;
    if (game && game.isGloballyPaused) {
      return true;
    }

    return false;
  }

  /**
   * Check if an active timer exists
   * @returns {boolean}
   */
  function hasActiveTimer() {
    const game = global.game;
    if (!game) return false;

    const now = Date.now();
    
    // Check game.endAt
    if (game.endAt && typeof game.endAt === 'number' && game.endAt > now) {
      return true;
    }

    // Check game.phaseEndsAt
    if (game.phaseEndsAt && typeof game.phaseEndsAt === 'number' && game.phaseEndsAt > now) {
      return true;
    }

    return false;
  }

  /**
   * Composite check: Is main screen in idle state?
   * Uses a whitelist approach - only exhaust during specific idle phases
   * @returns {boolean}
   */
  function isMainScreenIdle() {
    // Must have main screen built
    if (!isMainScreenBuilt()) return false;
    
    // Must have active timer
    const game = global.game;
    if (!game) return false;
    const endAt = game.endAt || game.phaseEndsAt || 0;
    if (endAt <= Date.now()) return false;
    
    // NEVER exhaust during these conditions:
    if (isModalOpen()) return false;
    if (hasFullscreenOverlay()) return false;
    if (hasVisibleCards()) return false;
    if (isCompetitionActive()) return false;
    if (isSocialPhaseActive()) return false;
    if (isCeremonyActive()) return false;
    if (hasInteractiveButtons()) return false;
    if (isUserInputExpected()) return false;
    if (isGamePaused()) return false;
    if (game.pauseController && typeof game.pauseController.isPaused === 'function' && game.pauseController.isPaused()) return false;
    if (global.PauseController && typeof global.PauseController.isPaused === 'function' && global.PauseController.isPaused()) return false;
    
    // Only exhaust during truly idle intermission-like states
    const idlePhases = ['intermission', 'opening'];
    if (!idlePhases.includes(game.phase)) return false;
    
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TIMER CONTROL FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Exhaust timer if idle state conditions are met
   */
  function exhaustTimerIfIdle() {
    if (!enabled) return;
    if (!isMainScreenIdle()) return;

    const game = global.game;
    if (!game) return;

    const now = Date.now();
    const targetTime = now + EXHAUST_THRESHOLD_MS;

    // Determine which timer to exhaust
    let exhausted = false;
    let remainingMs = 0;
    const phase = game.phase || 'unknown';

    if (game.endAt && typeof game.endAt === 'number' && game.endAt > now) {
      remainingMs = game.endAt - now;
      // Only exhaust if remaining time is greater than threshold
      if (remainingMs > EXHAUST_THRESHOLD_MS) {
        game.endAt = targetTime;
        exhausted = true;
      }
    }

    if (game.phaseEndsAt && typeof game.phaseEndsAt === 'number' && game.phaseEndsAt > now) {
      const phaseRemaining = game.phaseEndsAt - now;
      // Track the larger remaining time for logging
      if (phaseRemaining > remainingMs) {
        remainingMs = phaseRemaining;
      }
      // Only exhaust if remaining time is greater than threshold
      if (phaseRemaining > EXHAUST_THRESHOLD_MS) {
        game.phaseEndsAt = targetTime;
        exhausted = true;
      }
    }

    if (exhausted) {
      console.log(
        `[IdleTimerExhaust] Timer exhausted from ${remainingMs}ms to ${EXHAUST_THRESHOLD_MS}ms (phase=${phase})`
      );

      // Emit telemetry event if available
      if (global.Telemetry && typeof global.Telemetry.log === 'function') {
        global.Telemetry.log('idle_timer_exhaust', {
          phase: phase,
          remainingMs: remainingMs,
          exhaustedTo: EXHAUST_THRESHOLD_MS
        });
      }
    }
  }

  /**
   * Start periodic idle checking
   */
  function start() {
    if (intervalId !== null) {
      console.warn('[IdleTimerExhaust] Already started');
      return;
    }

    console.info('[IdleTimerExhaust] Starting idle timer monitoring');
    intervalId = setInterval(exhaustTimerIfIdle, CHECK_INTERVAL_MS);
  }

  /**
   * Stop periodic idle checking
   */
  function stop() {
    if (intervalId === null) {
      console.warn('[IdleTimerExhaust] Not running');
      return;
    }

    console.info('[IdleTimerExhaust] Stopping idle timer monitoring');
    clearInterval(intervalId);
    intervalId = null;
  }

  /**
   * Enable or disable the feature
   * @param {boolean} value
   */
  function setEnabled(value) {
    enabled = !!value;
    console.info('[IdleTimerExhaust] Feature ' + (enabled ? 'enabled' : 'disabled'));

    if (enabled && intervalId !== null) {
      // Already running, just update flag
    } else if (!enabled && intervalId !== null) {
      // Stop if running and disabled
      stop();
    }
  }

  /**
   * Check if feature is enabled
   * @returns {boolean}
   */
  function isEnabled() {
    return enabled;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  // Read config flag on load
  if (global.game && global.game.cfg && typeof global.game.cfg.enableIdleTimerExhaust === 'boolean') {
    enabled = global.game.cfg.enableIdleTimerExhaust;
    console.info('[IdleTimerExhaust] Initialized with config flag:', enabled);
  } else {
    // Default to enabled
    enabled = true;
    console.info('[IdleTimerExhaust] Initialized with default: enabled');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORTS
  // ═══════════════════════════════════════════════════════════════════════════

  global.IdleTimerExhaust = {
    start,
    stop,
    setEnabled,
    isEnabled,
    isMainScreenIdle,
    exhaustTimerIfIdle,
    
    // Debug helpers
    _debug: {
      isMainScreenBuilt,
      isModalOpen,
      isPopupCardVisible,  // Legacy alias
      hasVisibleCards,
      hasFullscreenOverlay,
      isGameRunning,  // Legacy alias
      isCompetitionActive,
      isSocialPhaseActive,
      isCeremonyActive,
      hasInteractiveButtons,
      isUserInputExpected,
      isGamePaused,
      hasActiveTimer
    }
  };

  console.info('[IdleTimerExhaust] Module loaded');

})(window);
