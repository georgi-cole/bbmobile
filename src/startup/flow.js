// MODULE: startup/flow.js
// Orchestrates the application startup sequence to prevent race conditions and flicker.
//
// SEQUENCE:
// 1. Boot: Initialize core services (bus, settings, BackgroundTheme) - NO main screen build yet
// 2. Video: Show Kolequant intro video (or skip if skipIntros setting enabled)
// 3. Intro Hub: Display intro hub with preloaded background (background + buttons appear together)
// 4. Play: After Play button pressed and gating checks pass, build main game screen
//
// This ensures:
// - No main screen elements visible before Play is pressed
// - No flicker from background loading after buttons appear
// - Clean separation between intro flow and game initialization

(function(g) {
  'use strict';

  let mainScreenBuilt = false;
  let bus = null;
  let handlersWired = false; // Track if event handlers have been registered

  // ===== CORE SERVICE INITIALIZATION =====
  
  /**
   * Initialize core services needed before main screen.
   * This includes event bus, settings, and background theme service.
   */
  function initCoreServices() {
    console.info('[StartupFlow] Initializing core services...');

    // Ensure game object exists
    if (!g.game) {
      g.game = { cfg: {}, players: [] };
    }

    // Ensure event bus exists
    if (!g.bbGameBus) {
      console.warn('[StartupFlow] bbGameBus not found, creating minimal bus');
      g.bbGameBus = {
        listeners: {},
        on(event, handler) {
          if (!this.listeners[event]) this.listeners[event] = [];
          this.listeners[event].push(handler);
        },
        emit(event, ...args) {
          if (this.listeners[event]) {
            this.listeners[event].forEach(h => {
              try { h(...args); } catch(e) { console.error(`[EventBus] Error in ${event} handler:`, e); }
            });
          }
          return true;
        }
      };
    }

    bus = g.bbGameBus;

    // Initialize BackgroundTheme service (only if not already initialized)
    // Check for existence of getCurrent method as indicator of initialization
    if (g.BackgroundTheme && typeof g.BackgroundTheme.init === 'function') {
      if (!g.BackgroundTheme.getCurrent) {
        g.BackgroundTheme.init({ bus });
        console.info('[StartupFlow] BackgroundTheme initialized');
      } else {
        console.info('[StartupFlow] BackgroundTheme already initialized, skipping');
      }
      
      // Sync with config setting (safe to do even if already initialized)
      const adaptiveSetting = g.game.cfg.adaptiveBackground;
      if (adaptiveSetting !== undefined) {
        g.BackgroundTheme.setAdaptive(adaptiveSetting);
      }
    }

    // Initialize IntroScreen (only if not already initialized)
    // Check for existence of show method as indicator of initialization
    if (g.IntroScreen && typeof g.IntroScreen.init === 'function') {
      if (!g.IntroScreen.show) {
        g.IntroScreen.init({ bus });
        console.info('[StartupFlow] IntroScreen initialized');
      } else {
        console.info('[StartupFlow] IntroScreen already initialized, skipping');
      }
    }

    console.info('[StartupFlow] Core services initialized');
  }

  // ===== BACKGROUND PRELOADING =====

  /**
   * Preload the intro hub background image before showing the intro screen.
   * This prevents the flicker where buttons appear before the background loads.
   * @returns {Promise<string>} Resolves with the background URL
   */
  async function preloadIntroBackground() {
    console.info('[StartupFlow] Preloading intro hub background...');

    // Get current theme from BackgroundTheme service
    let theme = null;
    if (g.BackgroundTheme && typeof g.BackgroundTheme.getCurrent === 'function') {
      theme = g.BackgroundTheme.getCurrent();
    }

    // Fallback to daily background if no theme available
    const url = theme ? theme.url : 'assets/skins/daily-background.png';

    return new Promise((resolve) => {
      const img = new Image();
      let loadTimeout = null;
      let hasCompleted = false;

      const complete = () => {
        if (hasCompleted) return;
        hasCompleted = true;
        
        if (loadTimeout) {
          clearTimeout(loadTimeout);
        }
        
        console.info('[StartupFlow] Background preloaded:', url);
        resolve(url);
      };

      img.onload = () => {
        // Optionally use decode() for smoother rendering
        if (img.decode) {
          img.decode()
            .then(complete)
            .catch(complete); // Still complete on decode failure
        } else {
          complete();
        }
      };

      img.onerror = () => {
        console.warn('[StartupFlow] Background preload failed:', url);
        complete(); // Still proceed even if preload fails
      };

      // Timeout after 1500ms to prevent blocking
      loadTimeout = setTimeout(() => {
        console.warn('[StartupFlow] Background preload timeout:', url);
        img.onload = null;
        img.onerror = null;
        complete();
      }, 1500);

      // Check if already cached
      if (img.complete) {
        complete();
      } else {
        img.src = url;
      }
    });
  }

  // ===== INTRO HUB DISPLAY =====

  /**
   * Show the intro hub screen with preloaded background.
   * Background and buttons appear simultaneously (no delayed fade).
   */
  async function showIntroHub() {
    console.info('[StartupFlow] Showing intro hub...');

    // Preload background first
    await preloadIntroBackground();

    // Show intro screen
    if (g.IntroScreen && typeof g.IntroScreen.show === 'function') {
      g.IntroScreen.show();
      console.info('[StartupFlow] Intro hub displayed');
    } else {
      console.error('[StartupFlow] IntroScreen.show not available');
    }
  }

  // ===== MAIN SCREEN INITIALIZATION =====

  /**
   * Build and display the main game screen.
   * This should only be called after:
   * 1. User presses Play button
   * 2. Gating checks pass (rules accepted, profile complete)
   * 
   * Guards against multiple invocations.
   */
  function buildMainScreen() {
    if (mainScreenBuilt) {
      console.info('[StartupFlow] Main screen already built, skipping');
      return;
    }

    console.info('[StartupFlow] Building main game screen...');
    mainScreenBuilt = true;

    // Hide intro screen
    if (g.IntroScreen && typeof g.IntroScreen.hide === 'function') {
      g.IntroScreen.hide();
    }

    // Mark that main screen is being built (shows main game elements via CSS)
    document.body.classList.add('main-screen-built');

    // Build cast and initialize main game UI
    // This was previously done in bootstrap() during initial boot
    if (typeof g.buildCast === 'function') {
      g.buildCast();
    } else {
      console.error('[StartupFlow] buildCast function not available');
    }

    // Update UI
    if (g.updateHud) g.updateHud();
    if (g.renderPanel) g.renderPanel();

    console.info('[StartupFlow] Main screen built');
  }

  // ===== STARTUP ORCHESTRATION =====

  /**
   * Main startup orchestration function.
   * Handles the complete boot → video → intro hub sequence.
   */
  async function startupSequence() {
    console.info('[StartupFlow] Starting startup sequence...');

    // Step 1: Initialize core services (but don't build main screen yet)
    initCoreServices();

    // Step 2: Check skipIntros setting
    const skipIntros = g.game?.cfg?.skipIntros || false;

    if (skipIntros) {
      // Skip video, go straight to intro hub
      console.info('[StartupFlow] skipIntros enabled, showing intro hub directly');
      await showIntroHub();
    } else {
      // Video will play via intro-outro-video.js
      // Just preload background in parallel - don't show intro hub yet
      // The bb:intro:finished event will trigger showIntroHub()
      console.info('[StartupFlow] Video will play, preloading background...');
      preloadIntroBackground();
    }
  }

  // ===== ENTER GAME ORCHESTRATION =====

  /**
   * Enter game - main orchestration function called when Play button is pressed.
   * Handles profile loading/guest mode and starts the game.
   */
  async function enterGame() {
    console.info('[StartupFlow] enterGame() called');

    // Prevent duplicate calls (idempotence check)
    if (g.DeferredGuards && g.DeferredGuards.isGameStarted()) {
      console.warn('[StartupFlow] Game already started, ignoring duplicate enterGame() call');
      return;
    }

    // Mark game as ready to start (unblocks deferred tasks)
    if (g.DeferredGuards) {
      g.DeferredGuards.markGameReady();
    } else {
      console.warn('[StartupFlow] DeferredGuards not available, proceeding without guards');
      // Set legacy flag for backward compatibility
      g.__bbGameReadyToStart = true;
    }

    // Set autoShowRulesOnStart to false to prevent auto-popups
    if (g.game && g.game.cfg) {
      g.game.cfg.autoShowRulesOnStart = false;
    }

    // Look up last-used profile
    let profile = null;
    if (g.ProfileStorage && g.ProfileService) {
      const lastProfileId = g.ProfileStorage.getLastProfileId();
      if (lastProfileId) {
        profile = g.ProfileStorage.getProfileById(lastProfileId);
        console.info('[StartupFlow] found last profile:', profile?.displayName);
      }
    }

    // Apply profile or set guest mode
    if (profile && g.ProfileService) {
      console.info('[StartupFlow] applying profile:', profile.displayName);
      g.ProfileService.setCurrentProfile(profile);
    } else {
      console.info('[StartupFlow] no profile found, enabling guest mode');
      if (g.ProfileService) {
        g.ProfileService.setGuestMode();
      }
      // Log guest mode marker for verification
      console.info('[guest-xp] Guest mode active - XP events will be suppressed');
    }

    // Flush deferred tasks (HUD, roster placeholders, etc.)
    if (g.DeferredGuards) {
      g.DeferredGuards.flushDeferredTasks();
    }

    // Build/rebuild game if needed
    if (!g.game || !g.game.players || g.game.players.length === 0) {
      console.info('[StartupFlow] building game cast');
      if (typeof g.buildCast === 'function') {
        g.buildCast();
      }
    }

    // Build main screen and start game
    buildMainScreen();

    // Mark game as started (prevents duplicate starts)
    if (g.DeferredGuards) {
      g.DeferredGuards.markGameStarted();
    } else {
      g.__bbGameStarted = true;
    }

    // Start opening sequence
    if (typeof g.startOpeningSequence === 'function') {
      g.startOpeningSequence();
    } else if (typeof g.startGame === 'function') {
      g.startGame();
    } else {
      console.error('[StartupFlow] No game start function available');
    }
  }

  // ===== EVENT WIRING =====

  /**
   * Wire up Play button handler to call enterGame().
   */
  function wirePlayButton() {
    if (!bus || handlersWired) return; // Prevent duplicate registration

    bus.on('intro:play', async function() {
      console.info('[StartupFlow] Play button clicked');
      await enterGame();
    });
  }

  /**
   * Check if user profile is complete.
   * @returns {boolean} True if profile is complete
   * NOTE: Currently unused, kept for potential future gating checks
   */
  function checkProfileComplete() { // eslint-disable-line no-unused-vars
    try {
      // Check if profile service is available
      if (g.ProfileService && typeof g.ProfileService.hasCompleteProfile === 'function') {
        return g.ProfileService.hasCompleteProfile();
      }
      // Fallback: check localStorage using StorageSafe (consistent with bootstrap.js)
      if (g.StorageSafe && typeof g.StorageSafe.get === 'function') {
        const profile = g.StorageSafe.get('bb_user_profile', null);
        if (!profile) return false;
        const data = JSON.parse(profile);
        return !!(data && data.name && data.name.trim());
      }
      return false;
    } catch {
      return false;
    }
  }

  // ===== INITIALIZATION =====

  /**
   * Wire up Intro Hub button handlers.
   */
  function wireIntroHubButtons() {
    if (!bus || handlersWired) return; // Prevent duplicate registration

    // Rules button - opens Rules modal
    bus.on('intro:open:rules', function() {
      console.info('[StartupFlow] Rules button clicked');
      if (typeof g.showRulesModal === 'function') {
        g.showRulesModal();
      } else if (typeof g.openRulesModal === 'function') {
        g.openRulesModal();
      } else {
        console.warn('[StartupFlow] Rules modal function not available');
      }
    });

    // Profile button - opens Profile modal
    bus.on('intro:open:profile', function() {
      console.info('[StartupFlow] Profile button clicked');
      if (typeof g.showProfileModal === 'function') {
        g.showProfileModal();
      } else if (g.ProfileModal && typeof g.ProfileModal.open === 'function') {
        g.ProfileModal.open();
      } else {
        console.warn('[StartupFlow] Profile modal function not available');
      }
    });

    // Settings button - opens Settings modal (same as topbar Settings)
    bus.on('intro:open:settings', function() {
      console.info('[StartupFlow] Settings button clicked');
      // Trigger the same settings modal as the topbar button
      const settingsBtn = document.getElementById('btnOpenSettings');
      if (settingsBtn) {
        settingsBtn.click();
      } else if (typeof g.openSettings === 'function') {
        g.openSettings();
      } else {
        console.warn('[StartupFlow] Settings modal function not available');
      }
    });

    // Leaderboard button - shows leaderboard/XP panel
    bus.on('intro:open:leaderboard', function() {
      console.info('[StartupFlow] Leaderboard button clicked');
      // Trigger the same leaderboard as the topbar badge button
      const leaderboardBtn = document.getElementById('xpLeaderboardBadge');
      if (leaderboardBtn) {
        leaderboardBtn.click();
      } else if (typeof g.showLeaderboard === 'function') {
        g.showLeaderboard();
      } else if (g.bus) {
        g.bus.emit('progression:show-panel', {});
      } else {
        console.warn('[StartupFlow] Leaderboard function not available');
      }
    });

    // Credits button - shows credits/end credits
    bus.on('intro:open:credits', function() {
      console.info('[StartupFlow] Credits button clicked');
      if (typeof g.showCreditsModal === 'function') {
        g.showCreditsModal();
      } else if (typeof g.showCredits === 'function') {
        g.showCredits();
      } else {
        console.warn('[StartupFlow] Credits function not available');
      }
    });

    // Help button - shows help/instructions
    bus.on('intro:open:help', function() {
      console.info('[StartupFlow] Help button clicked');
      if (typeof g.showHelpModal === 'function') {
        g.showHelpModal();
      } else if (typeof g.showHelp === 'function') {
        g.showHelp();
      } else {
        // Fallback: show Rules modal as it contains game instructions
        console.info('[StartupFlow] Help modal not available, showing Rules modal instead');
        if (typeof g.showRulesModal === 'function') {
          g.showRulesModal();
        }
      }
    });

    // Daily chip button - placeholder for future implementation
    bus.on('intro:chip:daily', function() {
      console.info('[StartupFlow] Daily chip clicked (not yet implemented)');
      // TODO: Implement daily challenge feature
    });

    // News chip button - placeholder for future implementation
    bus.on('intro:chip:news', function() {
      console.info('[StartupFlow] News chip clicked (not yet implemented)');
      // TODO: Implement news/announcements feature
    });
  }

  /**
   * Initialize startup flow controller.
   * Should be called from bootstrap after config is loaded.
   */
  function init() {
    // Prevent duplicate initialization
    if (handlersWired) {
      console.info('[StartupFlow] Already initialized, skipping');
      return;
    }
    
    console.info('[StartupFlow] Initializing...');
    
    wirePlayButton();
    wireIntroHubButtons();
    
    // Mark handlers as wired after successful registration
    handlersWired = true;
    
    // Set up listener for video end event (fires when video finishes or is skipped)
    // This listener is registered once and will show the intro hub after video ends
    g.addEventListener('bb:intro:finished', async function() {
      console.info('[StartupFlow] Intro video finished event received, showing intro hub');
      await showIntroHub();
    }, { once: true });
    
    // Don't start sequence here - it will be triggered after DOM ready
    // and after intro-outro-video.js decides whether to show video
  }

  // ===== PUBLIC API =====

  g.StartupFlow = {
    init,
    startupSequence,
    buildMainScreen,
    preloadIntroBackground,
    showIntroHub,
    enterGame
  };

  console.info('[StartupFlow] Module loaded');

})(window);
