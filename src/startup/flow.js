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
  let mainScreenZoomLock = null; // Zoom lock instance for main game screen

  // Centralized flow state to prevent duplicate initialization
  const flowState = {
    initialized: false,        // Has startup flow basic init run?
    coreServicesReady: false,  // Have core services been initialized?
    introHubShown: false,      // Has Intro Hub been shown once?
    gameStarted: false         // Has enterGame() already executed?
  };

  // ===== INTRO API RESOLUTION =====

  /**
   * Get IntroScreen API from either namespace
   * Tries window.IntroScreen first, then window.game.IntroScreen
   * @returns {Object|null} IntroScreen API or null if not found
   */
  function getIntroAPI() {
    // Try window.IntroScreen first (new alias)
    if (g.IntroScreen && typeof g.IntroScreen.init === 'function') {
      return g.IntroScreen;
    }
    
    // Try window.game.IntroScreen (primary export)
    if (g.game && g.game.IntroScreen && typeof g.game.IntroScreen.init === 'function') {
      return g.game.IntroScreen;
    }
    
    // Try window.game.introScreen (backward compatibility)
    if (g.game && g.game.introScreen && typeof g.game.introScreen.init === 'function') {
      return g.game.introScreen;
    }
    
    return null;
  }

  // ===== CORE SERVICE INITIALIZATION =====
  
  /**
   * Initialize core services needed before main screen.
   * This includes event bus, settings, and background theme service.
   */
  function initCoreServices() {
    // Guard against duplicate initialization
    if (flowState.coreServicesReady) {
      console.info('[StartupFlow] Core services already initialized, skipping duplicate initCoreServices() call');
      
      // Emit telemetry for duplicate attempt
      if (g.Telemetry && typeof g.Telemetry.log === 'function') {
        g.Telemetry.log('startup_init_core_services_duplicate', {});
      }
      
      return;
    }

    console.info('[StartupFlow] Initializing core services...');

    // Emit telemetry for init start
    if (g.Telemetry && typeof g.Telemetry.log === 'function') {
      g.Telemetry.log('startup_init_start', {});
    }

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

    // Initialize BackgroundTheme service unconditionally (idempotent)
    if (g.BackgroundTheme && typeof g.BackgroundTheme.init === 'function') {
      try {
        g.BackgroundTheme.init({ bus });
        console.info('[StartupFlow] BackgroundTheme init called (idempotent)');
      } catch (e) {
        console.warn('[StartupFlow] BackgroundTheme init failed', e);
      }

      // Sync adaptive setting (if present in config)
      const adaptiveSetting = g.game?.cfg?.adaptiveBackground;
      if (adaptiveSetting !== undefined) {
        try {
          g.BackgroundTheme.setAdaptive(adaptiveSetting);
        } catch (e) {
          console.warn('[StartupFlow] setAdaptive failed', e);
        }
      }

      // Force first theme update to ensure currentTheme is ready before any preload
      try {
        const firstTheme = g.BackgroundTheme.updateTheme(true);
        // If updateTheme returns a promise (async), handle it
        if (firstTheme && typeof firstTheme.then === 'function') {
          firstTheme.then(t => {
            if (t) {
              console.info('[StartupFlow] BackgroundTheme first update complete:', t);
              if (g.Telemetry && typeof g.Telemetry.log === 'function') {
                g.Telemetry.log('startup_bgtheme_first_update', { theme: t.key, reason: t.reason });
              }
            } else {
              console.warn('[StartupFlow] BackgroundTheme first update returned null');
            }
          }).catch(err => console.warn('[StartupFlow] BackgroundTheme first update promise failed', err));
        } else if (firstTheme) {
          console.info('[StartupFlow] BackgroundTheme first update complete:', firstTheme);
          if (g.Telemetry && typeof g.Telemetry.log === 'function') {
            g.Telemetry.log('startup_bgtheme_first_update', { theme: firstTheme.key, reason: firstTheme.reason });
          }
        } else {
          console.warn('[StartupFlow] BackgroundTheme first update returned null');
        }
      } catch (e) {
        console.warn('[StartupFlow] BackgroundTheme first update failed', e);
      }
    }

    // CRITICAL: Resolve and initialize IntroScreen unconditionally
    // Always call init() to ensure module is properly initialized before use
    // init() is idempotent and builds DOM, so multiple calls are safe
    const introAPI = getIntroAPI();
    if (introAPI) {
      introAPI.init({ bus });
      console.info('[StartupFlow] IntroScreen initialized via', introAPI === g.IntroScreen ? 'window.IntroScreen' : 'window.game.IntroScreen');
    } else {
      console.error('[StartupFlow] IntroScreen not available - critical failure');
      
      // Emit telemetry for missing IntroScreen
      if (g.Telemetry && typeof g.Telemetry.log === 'function') {
        g.Telemetry.log('startup_intro_api_missing', {});
      }
    }

    // Initialize IntroHub Background Integration (dev-only override manager)
    try {
      const bgIntegration = g.IntroHubBackgroundIntegration || (g.game && g.game.IntroHubBackgroundIntegration);
      if (bgIntegration && typeof bgIntegration.init === 'function') {
        bgIntegration.init();
        console.info('[StartupFlow] IntroHubBackgroundIntegration initialized');
      }
    } catch (e) {
      console.warn('[StartupFlow] IntroHubBackgroundIntegration init failed (non-critical)', e);
    }

    console.info('[StartupFlow] Core services initialized');

    // Mark core services as ready
    flowState.coreServicesReady = true;

    // Emit telemetry for init done
    if (g.Telemetry && typeof g.Telemetry.log === 'function') {
      g.Telemetry.log('startup_init_done', { hasIntroAPI: !!introAPI });
    }
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

  // ===== BACKGROUND AVATAR WARM-UP =====

  /**
   * Start background warm-up of houseguest avatars after Intro Hub is shown.
   * This preloads avatars opportunistically without blocking the user.
   * When the HousGuests button is pressed, avatars should already be cached.
   */
  async function startAvatarWarmUp() {
    console.info('[StartupFlow] Starting background avatar warm-up...');

    // Check config flag
    const cfg = g.game?.cfg || g.cfg || {};
    if (cfg.preloadAvatars === false) {
      console.info('[StartupFlow] Avatar preloading disabled by config flag');
      return;
    }

    // Emit telemetry
    if (g.Telemetry && typeof g.Telemetry.log === 'function') {
      g.Telemetry.log('startup_avatar_warmup_start', {});
    }

    // Use AvatarPreloader if available (preferred)
    const AvatarPreloader = g.AvatarPreloader || window.AvatarPreloader;
    if (AvatarPreloader && typeof AvatarPreloader.init === 'function') {
      console.info('[StartupFlow] Using AvatarPreloader for warm-up');
      
      try {
        // Get houseguests list
        const Houseguests = g.Houseguests || window.Houseguests;
        if (!Houseguests || typeof Houseguests.getAll !== 'function') {
          console.warn('[StartupFlow] Houseguests data not available');
          return;
        }

        const houseguests = Houseguests.getAll();
        if (!houseguests || houseguests.length === 0) {
          console.warn('[StartupFlow] No houseguests to preload');
          return;
        }

        // Initialize and start preload
        AvatarPreloader.init(houseguests);
        
        // Only register progress callback if not already done
        // The callback will be cleared automatically when preload completes
        if (!AvatarPreloader.isDone()) {
          AvatarPreloader.onProgress((loaded, total) => {
            // Log milestone progress
            if (loaded === total || loaded % 5 === 0) {
              console.info(`[StartupFlow] Avatar warm-up progress: ${loaded}/${total}`);
            }
          });
        }
        
        const result = await AvatarPreloader.start();
        console.info('[StartupFlow] Avatar warm-up complete:', result);

        // Emit telemetry
        if (g.Telemetry && typeof g.Telemetry.log === 'function') {
          g.Telemetry.log('startup_avatar_warmup_complete', {
            total: result.total || 0,
            loaded: result.loaded || 0,
            timedOut: result.timedOut || false
          });
        }
        
        return;
      } catch (err) {
        console.warn('[StartupFlow] AvatarPreloader warm-up error:', err);
      }
    }

    // Fallback to AvatarCache if AvatarPreloader not available
    const AvatarCache = g.AvatarCache || window.AvatarCache;
    if (!AvatarCache || typeof AvatarCache.preloadHouseguests !== 'function') {
      console.warn('[StartupFlow] AvatarCache not available for warm-up');
      return;
    }

    try {
      // Preload houseguest avatars in background (non-blocking)
      // This will use the cache so if already loaded via PLAY flow, it's instant
      const result = await AvatarCache.preloadHouseguests({
        strictMode: false, // Non-strict for background warm-up
        onProgress: (loaded, total) => {
          // Log milestone progress
          if (loaded === total || loaded % 5 === 0) {
            console.info(`[StartupFlow] Avatar warm-up progress: ${loaded}/${total}`);
          }
        }
      });

      console.info('[StartupFlow] Avatar warm-up complete:', result);

      // Emit telemetry
      if (g.Telemetry && typeof g.Telemetry.log === 'function') {
        g.Telemetry.log('startup_avatar_warmup_complete', {
          total: result.total,
          loaded: result.loaded,
          cached: result.cached,
          elapsed: result.elapsed
        });
      }
    } catch (err) {
      console.warn('[StartupFlow] Avatar warm-up error:', err);
      
      // Emit telemetry
      if (g.Telemetry && typeof g.Telemetry.log === 'function') {
        g.Telemetry.log('startup_avatar_warmup_error', { error: err.message });
      }
    }
  }

  // ===== INTRO HUB DISPLAY =====

  /**
   * Show the intro hub screen with preloaded background.
   * Background and buttons appear simultaneously (no delayed fade).
   * CRITICAL: Always use showWithPreload() for smooth appearance
   */
  async function showIntroHub() {
    // Guard against duplicate calls
    if (flowState.introHubShown) {
      console.info('[StartupFlow] Intro Hub already shown, skipping duplicate showIntroHub() call');
      
      // Emit telemetry for duplicate attempt
      if (g.Telemetry && typeof g.Telemetry.log === 'function') {
        g.Telemetry.log('startup_show_hub_duplicate', {});
      }
      
      return;
    }
    
    // Guard against showing hub while avatars are preloading
    const avatarsPreloading = g.game?.state?.avatarsPreloading || g.__avatarsPreloading;
    if (avatarsPreloading === true) {
      console.info('[StartupFlow] Avatars are preloading, skipping showIntroHub() call');
      
      // Emit telemetry for blocked attempt
      if (g.Telemetry && typeof g.Telemetry.log === 'function') {
        g.Telemetry.log('startup_show_hub_blocked_preloading', {});
      }
      
      return;
    }

    console.info('[StartupFlow] Showing intro hub...');

    // Emit telemetry for show hub start
    if (g.Telemetry && typeof g.Telemetry.log === 'function') {
      g.Telemetry.log('startup_show_hub_start', {});
    }

    // Get IntroScreen API from either namespace
    const introAPI = getIntroAPI();
    
    if (!introAPI) {
      console.error('[StartupFlow] IntroScreen not available - critical failure');
      
      // Emit telemetry for show hub error
      if (g.Telemetry && typeof g.Telemetry.log === 'function') {
        g.Telemetry.log('startup_show_hub_error', { reason: 'api_not_found' });
      }
      
      return;
    }

    try {
      // CRITICAL: Always use IntroScreen's showWithPreload for best UX
      // This ensures background is loaded before buttons are displayed
      if (typeof introAPI.showWithPreload === 'function') {
        await introAPI.showWithPreload();
        console.info('[StartupFlow] Intro hub displayed with preloaded background');
      } else if (typeof introAPI.show === 'function') {
        // Fallback to old method if showWithPreload not available
        console.warn('[StartupFlow] showWithPreload not available, using legacy show()');
        await preloadIntroBackground();
        introAPI.show();
        console.info('[StartupFlow] Intro hub displayed');
      } else {
        console.error('[StartupFlow] IntroScreen has no show method - critical failure');
        
        // Emit telemetry for show hub error
        if (g.Telemetry && typeof g.Telemetry.log === 'function') {
          g.Telemetry.log('startup_show_hub_error', { reason: 'no_show_method' });
        }
        
        return;
      }

      // Mark intro hub as shown (only after successful show)
      flowState.introHubShown = true;

      // Emit telemetry for show hub success
      if (g.Telemetry && typeof g.Telemetry.log === 'function') {
        g.Telemetry.log('startup_show_hub_done', {});
      }

      // CRITICAL: Remove initial blocking overlay now that intro hub is visible
      // This signals that the app is ready and prevents half-loaded UI from showing
      console.info('[StartupFlow] Intro hub fully visible, removing initial blocking overlay');
      if (window.InitialBlockingOverlay && typeof window.InitialBlockingOverlay.remove === 'function') {
        window.InitialBlockingOverlay.remove();
      } else {
        // Fallback: dispatch event for overlay to listen to
        window.dispatchEvent(new CustomEvent('bb:app-ready'));
      }

      // Play intro hub lobby music if enabled
      if (typeof g.playIntroHubMusic === 'function') {
        const cfg = (g.game && g.game.cfg) || g.cfg || {};
        const musicEnabled = cfg.musicOn !== false; // default true
        const isMuted = (typeof g.getMuted === 'function') ? g.getMuted() : false;
        
        if (musicEnabled && !isMuted) {
          console.info('[StartupFlow] Playing intro hub lobby music');
          g.playIntroHubMusic();
        } else {
          console.info('[StartupFlow] Skipping lobby music (disabled or muted)');
        }
      }

      // Start background avatar warm-up (non-blocking)
      // This preloads houseguest avatars opportunistically
      // Small delay to let hub render first
      setTimeout(() => {
        startAvatarWarmUp().catch(err => {
          console.warn('[StartupFlow] Avatar warm-up failed:', err);
        });
      }, 500);

    } catch (err) {
      console.error('[StartupFlow] Error showing intro hub:', err);
      
      // Emit telemetry for show hub error
      if (g.Telemetry && typeof g.Telemetry.log === 'function') {
        g.Telemetry.log('startup_show_hub_error', { reason: 'exception', error: err.message });
      }
    }
  }

  // ===== ZOOM LOCK FOR MAIN SCREEN =====

  /**
   * Dynamically import and attach zoom lock to main game screen (.wrap element).
   * Prevents pinch-to-zoom during gameplay.
   */
  async function attachMainScreenZoomLock() {
    try {
      // Find main game screen element
      const mainScreen = document.querySelector('.wrap');
      if (!mainScreen) {
        console.warn('[StartupFlow] Cannot attach zoom lock - main screen not found');
        return;
      }

      // Skip if already attached
      if (mainScreenZoomLock && mainScreenZoomLock.isAttached()) {
        console.info('[StartupFlow] Main screen zoom lock already attached, skipping');
        return;
      }

      // Dynamically import ZoomLock module
      const { ZoomLock } = await import('../../js/utils/zoom-lock.js');
      
      // Create lock for main screen
      mainScreenZoomLock = ZoomLock.forElement(mainScreen);
      mainScreenZoomLock.attach();
      
      console.info('[StartupFlow] Zoom lock attached to main game screen');
    } catch (err) {
      // Fail gracefully - zoom lock is a progressive enhancement
      console.warn('[StartupFlow] Failed to attach main screen zoom lock:', err);
    }
  }

  /**
   * Detach zoom lock from main game screen.
   */
  function detachMainScreenZoomLock() {
    try {
      if (mainScreenZoomLock && mainScreenZoomLock.isAttached()) {
        mainScreenZoomLock.detach();
        mainScreenZoomLock = null;
        console.info('[StartupFlow] Zoom lock detached from main game screen');
      }
    } catch (err) {
      console.warn('[StartupFlow] Failed to detach main screen zoom lock:', err);
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

    // Stop lobby music when transitioning to main game
    try {
      if (typeof g.fadeOutMusic === 'function') {
        g.fadeOutMusic(600); // graceful fade
        console.info('[StartupFlow] Fading out lobby music (600ms)');
      } else if (typeof g.stopIntroHubMusic === 'function') {
        g.stopIntroHubMusic();
        console.info('[StartupFlow] Stopped lobby music');
      }
    } catch(e) {
      console.warn('[StartupFlow] Unable to stop lobby music', e);
    }

    // CRITICAL: Close all open modals before transitioning to main screen
    // This prevents modals from appearing over the game screen
    closeAllModals();

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

    // CRITICAL: Remove roster placeholders before showing actual roster
    // This prevents double avatars (Guest placeholders + actual players)
    removeRosterPlaceholders();

    // Update UI
    if (g.updateHud) g.updateHud();
    if (g.renderPanel) g.renderPanel();

    // Attach zoom lock to main game screen
    attachMainScreenZoomLock();

    console.info('[StartupFlow] Main screen built');
  }
  
  /**
   * Close all open modals to prevent them from appearing over the main game screen.
   * This is called when transitioning from intro hub to main game.
   * IDEMPOTENT: Safe to call multiple times.
   */
  function closeAllModals() {
    console.info('[StartupFlow] Closing all open modals before game start');
    
    // List of known modal selectors
    const modalSelectors = [
      '.rulesDim',
      '.profile-modal-dim',
      '.creditsDim',
      '.leaderboardDim',
      '.helpDim',
      '.settingsDim',
      '.confirmDim',
      '#settingsBackdrop',        // Settings modal
      '.modal-backdrop',          // Generic modal (settings, config)
      '.xp-modal-backdrop',       // XP/Progression modal
      '.socialize-modal-backdrop' // Social maneuvers modal
    ];
    
    // Close each modal that's currently visible
    modalSelectors.forEach(selector => {
      const modal = document.querySelector(selector);
      if (modal) {
        const isVisible = modal.style.display === 'flex' || 
                         modal.classList.contains('open') ||
                         window.getComputedStyle(modal).display !== 'none';
        
        if (isVisible) {
          console.info(`[StartupFlow] Closing modal: ${selector}`);
          
          // Hide the modal
          modal.style.display = 'none';
          modal.classList.remove('open');
          
          // Find and hide panel if it exists
          const panel = modal.querySelector('[class*="Panel"]');
          if (panel) {
            panel.classList.remove('in');
          }
        }
      }
    });
    
    // Restore body scroll (modals may have locked it)
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    
    // Close profile modal using its API if available
    if (g.ProfileModal && typeof g.ProfileModal.hide === 'function') {
      console.info('[StartupFlow] Closing ProfileModal via API');
      g.ProfileModal.hide();
    }
    
    // Close rules modal using its API if available
    if (typeof g.hideRulesModal === 'function') {
      console.info('[StartupFlow] Closing Rules modal via API');
      g.hideRulesModal();
    }
  }
  
  /**
   * Remove roster placeholders to prevent double avatars (Guest + actual players).
   * This is called when transitioning from intro hub to main game.
   * IDEMPOTENT: Safe to call multiple times.
   */
  function removeRosterPlaceholders() {
    console.info('[StartupFlow] Removing roster placeholders before showing actual roster');
    
    // Remove placeholder overlay by ID
    const placeholderOverlay = document.getElementById('bbRosterPlaceholderOverlay');
    if (placeholderOverlay) {
      console.info('[StartupFlow] Removing placeholder overlay');
      placeholderOverlay.remove();
    }
    
    // Remove placeholder visibility attribute
    document.body.removeAttribute('data-roster-placeholders-visible');
    
    // Remove individual placeholder tiles if they exist
    const placeholderTiles = document.querySelectorAll('.placeholder-tile');
    if (placeholderTiles.length > 0) {
      console.info(`[StartupFlow] Removing ${placeholderTiles.length} placeholder tiles`);
      placeholderTiles.forEach(tile => tile.remove());
    }
    
    // Use RosterPlaceholders API if available
    if (g.RosterPlaceholders && typeof g.RosterPlaceholders.hide === 'function') {
      console.info('[StartupFlow] Hiding placeholders via RosterPlaceholders API');
      g.RosterPlaceholders.hide();
    }
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
      
      // Emit telemetry for skip intros
      if (g.Telemetry && typeof g.Telemetry.log === 'function') {
        g.Telemetry.log('startup_skip_intros', {});
      }
      
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
   * Unified entry point for Play → main hub transition.
   * Shows loading overlay immediately, preloads all avatars with progress tracking,
   * then transitions to main hub only when all assets are ready.
   * Handles errors with overlay-level Retry option.
   */
  async function enterGameFromIntro() {
    // Guard against duplicate calls
    if (flowState.gameStarted) {
      console.warn('[StartupFlow] Game already started, ignoring duplicate enterGameFromIntro() call');
      
      if (g.Telemetry && typeof g.Telemetry.log === 'function') {
        g.Telemetry.log('startup_enter_game_duplicate', {});
      }
      
      return;
    }

    // Mark game as starting to prevent race conditions
    flowState.gameStarted = true;

    console.info('[StartupFlow] enterGameFromIntro() - unified Play transition starting');

    // Log telemetry
    if (g.Telemetry && typeof g.Telemetry.log === 'function') {
      g.Telemetry.log('startup_enter_game_from_intro_start', {});
    }

    // Show loading overlay immediately
    const LoadingOverlay = g.LoadingOverlay || window.LoadingOverlay;
    if (!LoadingOverlay) {
      console.error('[StartupFlow] LoadingOverlay not available, falling back to legacy enterGame');
      await legacyEnterGame();
      return;
    }

    LoadingOverlay.showOverlay();

    try {
      // Step 1: Preload and build game cast (get players ready)
      console.info('[StartupFlow] Building game cast...');
      if (typeof g.buildCast === 'function') {
        g.buildCast();
      }

      // Wait a tick for players to be available
      await new Promise(resolve => setTimeout(resolve, 100));

      const players = g.game?.players || g.players || [];
      
      if (!players || players.length === 0) {
        console.warn('[StartupFlow] No players available after buildCast, proceeding anyway');
      }

      // Step 2: Strict avatar preload with progress tracking
      console.info('[StartupFlow] Starting strict avatar preload...');
      
      const AvatarQueue = g.AvatarQueue || window.AvatarQueue;
      if (!AvatarQueue || !AvatarQueue.preloadAvatarsQueued) {
        console.warn('[StartupFlow] AvatarQueue not available, skipping avatar preload');
        LoadingOverlay.updateProgress({ loaded: 1, total: 1 });
      } else {
        const cfg = g.game?.cfg || g.cfg || {};
        const strictMode = cfg.avatarPreloadRequireAll === true;
        
        const result = await AvatarQueue.preloadAvatarsQueued(players, {
          concurrency: cfg.avatarPreloadConcurrency || 8,
          timeout: cfg.avatarPreloadTimeoutMs || (strictMode ? 30000 : 7000),
          strictMode: strictMode,
          onProgress: (loaded, total) => {
            LoadingOverlay.updateProgress({ loaded, total });
          }
        });

        console.info('[StartupFlow] Avatar preload complete:', result);

        // Check for strict mode failure
        if (strictMode && !result.isReady) {
          const errorMsg = `Failed to load all houseguest profiles.\n\nLoaded: ${result.loaded}/${result.total}\nFailed: ${result.failed || 0}${result.timedOut ? '\nTimed out' : ''}`;
          
          LoadingOverlay.showError(errorMsg, {
            showRetry: true,
            onRetry: async () => {
              console.info('[StartupFlow] User requested retry');
              // Reset state and retry
              flowState.gameStarted = false;
              await enterGameFromIntro();
            }
          });
          
          // Keep overlay visible, don't proceed
          console.warn('[StartupFlow] Strict avatar preload failed, waiting for user action');
          return;
        }
      }

      // Step 3: Apply profile or guest mode
      let profile = null;
      if (g.ProfileStorage && g.ProfileService) {
        const lastProfileId = g.ProfileStorage.getLastProfileId();
        if (lastProfileId) {
          profile = g.ProfileStorage.getProfileById(lastProfileId);
          console.info('[StartupFlow] Found last profile:', profile?.displayName);
        }
      }

      if (profile && g.ProfileService) {
        console.info('[StartupFlow] Applying profile:', profile.displayName);
        g.ProfileService.setCurrentProfile(profile);
      } else {
        console.info('[StartupFlow] No profile found, enabling guest mode');
        if (g.ProfileService) {
          g.ProfileService.setGuestMode();
        }
        console.info('[guest-xp] Guest mode active - XP events will be suppressed');
      }

      // Step 4: Mark game as ready
      if (g.DeferredGuards) {
        g.DeferredGuards.markGameReady();
        g.DeferredGuards.flushDeferredTasks();
      } else {
        g.__bbGameReadyToStart = true;
      }

      // Disable auto-popups
      if (g.game && g.game.cfg) {
        g.game.cfg.autoShowRulesOnStart = false;
      }

      // Step 5: Small delay to show 100% before transitioning
      await new Promise(resolve => setTimeout(resolve, 300));

      // Step 6: Hide overlay and build main screen
      await LoadingOverlay.hideOverlay();
      
      buildMainScreen();

      // Mark game as started
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

      // Log telemetry
      if (g.Telemetry && typeof g.Telemetry.log === 'function') {
        g.Telemetry.log('startup_enter_game_from_intro_success', {});
      }

    } catch (err) {
      console.error('[StartupFlow] Error in enterGameFromIntro:', err);
      
      // Show error on overlay with retry
      LoadingOverlay.showError(
        `An error occurred while loading the game.\n\n${err.message || 'Unknown error'}`,
        {
          showRetry: true,
          onRetry: async () => {
            console.info('[StartupFlow] User requested retry after error');
            flowState.gameStarted = false;
            await enterGameFromIntro();
          }
        }
      );

      // Log telemetry
      if (g.Telemetry && typeof g.Telemetry.log === 'function') {
        g.Telemetry.log('startup_enter_game_from_intro_error', { error: err.message });
      }
    }
  }

  /**
   * Legacy enter game function (fallback for when LoadingOverlay not available)
   * Maintains backward compatibility with existing code
   */
  async function legacyEnterGame() {
    console.info('[StartupFlow] Using legacy enterGame() fallback');

    // Prevent duplicate calls
    if (g.DeferredGuards && g.DeferredGuards.isGameStarted()) {
      console.warn('[StartupFlow] Game already started (DeferredGuards), skipping');
      return;
    }

    // Mark game as ready to start
    if (g.DeferredGuards) {
      g.DeferredGuards.markGameReady();
    } else {
      g.__bbGameReadyToStart = true;
    }

    // Set autoShowRulesOnStart to false
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
      console.info('[guest-xp] Guest mode active - XP events will be suppressed');
    }

    // Flush deferred tasks
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

    // Build main screen
    buildMainScreen();

    // Mark game as started
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

  /**
   * Alias for backward compatibility
   * Delegates to new unified entry point
   */
  async function enterGame() {
    await enterGameFromIntro();
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

    // Credits button - play credits video (outro.mp4)
    bus.on('intro:open:credits', function() {
      console.info('[StartupFlow] Credits button clicked');
      if (g.CreditsVideo && typeof g.CreditsVideo.play === 'function') {
        console.info('[StartupFlow] Playing credits video');
        g.CreditsVideo.play();
      } else if (typeof g.showCreditsModal === 'function') {
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

    // News chip button - open News modal
    bus.on('intro:chip:news', function() {
      console.info('[StartupFlow] News chip clicked - opening NewsModal');
      if (window.NewsModal && typeof window.NewsModal.open === 'function') {
        window.NewsModal.open();
      } else {
        console.warn('[StartupFlow] NewsModal not available');
      }
    });

    // Houseguests button - open Houseguests modal (wait for avatar preload if needed)
    bus.on('intro:open:houseguests', async function() {
      console.info('[StartupFlow] Houseguests button clicked');
      
      // Check if avatar preloader is active
      const AvatarPreloader = g.AvatarPreloader || window.AvatarPreloader;
      const LoadingOverlay = g.LoadingOverlay || window.LoadingOverlay;
      
      if (AvatarPreloader && !AvatarPreloader.isDone()) {
        console.info('[StartupFlow] Waiting for avatar preload to complete...');
        
        // Show loading overlay while waiting
        if (LoadingOverlay && typeof LoadingOverlay.showOverlay === 'function') {
          LoadingOverlay.showOverlay();
          
          // Register progress callback once
          // It will be cleared automatically when preload completes
          const progressCallback = (loaded, total) => {
            if (LoadingOverlay && typeof LoadingOverlay.updateProgress === 'function') {
              LoadingOverlay.updateProgress({ loaded, total });
            }
          };
          
          AvatarPreloader.onProgress(progressCallback);
        }
        
        // Wait for preload to finish
        try {
          const result = await AvatarPreloader.whenDone();
          console.info('[StartupFlow] Avatar preload complete before opening Houseguests:', result);
          
          // Hide loading overlay
          if (LoadingOverlay && typeof LoadingOverlay.hideOverlay === 'function') {
            await LoadingOverlay.hideOverlay();
          }
        } catch (err) {
          console.warn('[StartupFlow] Avatar preload error, opening modal anyway:', err);
          
          // Hide loading overlay
          if (LoadingOverlay && typeof LoadingOverlay.hideOverlay === 'function') {
            await LoadingOverlay.hideOverlay();
          }
        }
      }
      
      // Open Houseguests modal
      if (g.HouseguestsModal && typeof g.HouseguestsModal.open === 'function') {
        g.HouseguestsModal.open();
      } else if (window.HouseguestsModal && typeof window.HouseguestsModal.open === 'function') {
        window.HouseguestsModal.open();
      } else {
        console.warn('[StartupFlow] HouseguestsModal not available');
      }
    });
  }

  /**
   * Initialize startup flow controller.
   * Should be called from bootstrap after config is loaded.
   */
  function init() {
    // Prevent duplicate initialization
    if (flowState.initialized || handlersWired) {
      console.warn('[StartupFlow] Already initialized, skipping duplicate init() call');
      
      // Emit telemetry for duplicate attempt
      if (g.Telemetry && typeof g.Telemetry.log === 'function') {
        g.Telemetry.log('startup_init_duplicate', {});
      }
      
      return;
    }
    
    console.info('[StartupFlow] Initializing...');
    
    // CRITICAL: Initialize core services (including IntroScreen)
    // This must happen during init() since bootstrap calls init() but not startupSequence()
    initCoreServices();
    
    wirePlayButton();
    wireIntroHubButtons();
    
    // Mark handlers as wired and flow as initialized after successful registration
    handlersWired = true;
    flowState.initialized = true;
    
    // Set up listener for video end event (fires when video finishes or is skipped)
    // This listener is registered once and will show the intro hub after video ends
    g.addEventListener('bb:intro:finished', async function() {
      console.info('[StartupFlow] Intro video finished event received, showing intro hub');
      
      // Emit telemetry for video finished
      if (g.Telemetry && typeof g.Telemetry.log === 'function') {
        g.Telemetry.log('startup_video_finished', {});
      }
      
      await showIntroHub();
    }, { once: true });
    
    console.info('[StartupFlow] Initialization complete, event handlers wired');
    
    // Don't start sequence here - it will be triggered after DOM ready
    // and after intro-outro-video.js decides whether to show video
  }

  // ===== RESTART TO HUB =====

  /**
   * Restart to intro hub - helper for in-game restart functionality.
   * Hides main screen, resets intro state, and shows hub again.
   * This allows players to return to the hub from within the game.
   */
  async function restartToHub() {
    console.info('[StartupFlow] Restarting to intro hub...');
    
    // Emit telemetry for restart
    if (g.Telemetry && typeof g.Telemetry.log === 'function') {
      g.Telemetry.log('startup_restart_to_hub', {});
    }
    
    // Detach zoom lock from main screen before hiding
    detachMainScreenZoomLock();
    
    // Hide main screen
    const mainScreen = document.querySelector('.wrap');
    if (mainScreen) {
      mainScreen.style.display = 'none';
    }
    
    // Remove main-screen-built class to hide game UI
    document.body.classList.remove('main-screen-built');
    
    // Reset main screen built flag
    mainScreenBuilt = false;
    
    // Reset flow state flags to allow re-showing hub and re-entering game
    flowState.introHubShown = false;
    flowState.gameStarted = false;
    
    // Get IntroScreen API from either namespace
    const introAPI = getIntroAPI();
    
    if (introAPI) {
      // Reset IntroScreen state
      if (typeof introAPI.reset === 'function') {
        introAPI.reset();
        console.info('[StartupFlow] IntroScreen state reset');
      }
      
      // CRITICAL: Ensure __bbHubShown is false before re-showing
      window.__bbHubShown = false;
      
      // Re-initialize IntroScreen to ensure fresh state
      if (typeof introAPI.init === 'function') {
        introAPI.init({ bus });
        console.info('[StartupFlow] IntroScreen re-initialized');
      }
    } else {
      console.error('[StartupFlow] IntroScreen not available for restart');
    }
    
    // Show intro hub again
    await showIntroHub();
    
    console.info('[StartupFlow] Restart to hub complete');
  }

  // ===== PUBLIC API =====

  g.StartupFlow = {
    init,
    startupSequence,
    buildMainScreen,
    preloadIntroBackground,
    showIntroHub,
    enterGame,
    enterGameFromIntro,  // New unified entry point
    legacyEnterGame,     // Fallback for compatibility
    restartToHub
  };
  
  // Expose restartToHub globally for easy access
  // Both on window and window.game for consistency
  g.restartToHub = restartToHub;
  if (g.game) {
    g.game.restartToHub = restartToHub;
  }

  console.info('[StartupFlow] Module loaded');

})(window);
