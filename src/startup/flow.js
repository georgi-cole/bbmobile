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

    // Initialize BackgroundTheme service
    if (g.BackgroundTheme && typeof g.BackgroundTheme.init === 'function') {
      g.BackgroundTheme.init({ bus });
      console.info('[StartupFlow] BackgroundTheme initialized');
      
      // Sync with config setting
      const adaptiveSetting = g.game.cfg.adaptiveBackground;
      if (adaptiveSetting !== undefined) {
        g.BackgroundTheme.setAdaptive(adaptiveSetting);
      }
    }

    // Initialize IntroScreen
    if (g.IntroScreen && typeof g.IntroScreen.init === 'function') {
      g.IntroScreen.init({ bus });
      console.info('[StartupFlow] IntroScreen initialized');
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
      // Preload background while video plays
      console.info('[StartupFlow] Waiting for intro video to finish...');
      
      // Listen for video end event to show intro hub
      const videoEndHandler = async () => {
        console.info('[StartupFlow] Intro video finished, showing intro hub');
        await showIntroHub();
      };

      // Hook into bb:intro:finished event
      g.addEventListener('bb:intro:finished', videoEndHandler, { once: true });

      // Also start preloading in parallel with video
      preloadIntroBackground();
    }
  }

  // ===== EVENT WIRING =====

  /**
   * Wire up Play button handler to build main screen after gating.
   */
  function wirePlayButton() {
    if (!bus) return;

    bus.on('intro:play', async function() {
      console.info('[StartupFlow] Play button clicked');

      // Check if rules accepted
      let rulesAccepted = false;
      try {
        rulesAccepted = localStorage.getItem('bb_rules_accepted') === 'true';
      } catch {}

      if (!rulesAccepted) {
        console.info('[StartupFlow] Rules not accepted, opening Rules modal');
        // Open Rules modal - user will return to intro hub after accepting
        if (typeof g.openRulesModal === 'function') {
          g.openRulesModal();
        } else if (typeof g.showRules === 'function') {
          g.showRules();
        }
        return;
      }

      // Check if profile is complete
      const profileComplete = checkProfileComplete();
      if (!profileComplete) {
        console.info('[StartupFlow] Profile incomplete, opening Profile modal');
        // Open Profile modal - user will return to intro hub after completing
        if (g.ProfileModal && typeof g.ProfileModal.open === 'function') {
          g.ProfileModal.open();
        } else if (typeof g.openProfileModal === 'function') {
          g.openProfileModal();
        }
        return;
      }

      // All checks passed - build main screen and start game
      console.info('[StartupFlow] Gating checks passed, building main screen');
      buildMainScreen();

      // Start opening sequence
      if (typeof g.startOpeningSequence === 'function') {
        g.startOpeningSequence();
      } else if (typeof g.startGame === 'function') {
        g.startGame();
      } else {
        console.error('[StartupFlow] No game start function available');
      }
    });
  }

  /**
   * Check if user profile is complete.
   * @returns {boolean} True if profile is complete
   */
  function checkProfileComplete() {
    try {
      // Check if profile service is available
      if (g.ProfileService && typeof g.ProfileService.hasCompleteProfile === 'function') {
        return g.ProfileService.hasCompleteProfile();
      }
      // Fallback: check localStorage
      const profile = localStorage.getItem('bb_user_profile');
      if (!profile) return false;
      const data = JSON.parse(profile);
      return !!(data && data.name && data.name.trim());
    } catch {
      return false;
    }
  }

  // ===== INITIALIZATION =====

  /**
   * Wire up Daily and News chip button handlers (graceful no-ops for now).
   */
  function wireChipButtons() {
    if (!bus) return;

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
    console.info('[StartupFlow] Initializing...');
    
    wirePlayButton();
    wireChipButtons();
    
    // Don't start sequence here - it will be triggered after DOM ready
    // and after intro-outro-video.js decides whether to show video
  }

  // ===== PUBLIC API =====

  g.StartupFlow = {
    init,
    startupSequence,
    buildMainScreen,
    preloadIntroBackground,
    showIntroHub
  };

  console.info('[StartupFlow] Module loaded');

})(window);
