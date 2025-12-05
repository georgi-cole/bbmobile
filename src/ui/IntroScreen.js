// MODULE: IntroScreen.js
// Intro "hub" screen that appears after the Kolequant intro video
// Features:
// - Two-layer background system for smooth crossfades
// - Main button column (Play/Continue, Rules, Profile, Leaderboard, Settings, Credits)
// - Quick icons (top-right): Help, Music, Sound, Settings
// - Optional chips (bottom-right): Daily, News
// - Dynamic positioning based on BackgroundTheme anchor suggestions
// - Event-driven architecture using window.game.bus

// SENTINEL LOG: Script executing
console.info('[IntroScreen] Script executing – pre-init');

(function() {
  'use strict';
  
  // CRITICAL: Bind window.game immediately to prevent lost reference
  const g = window.game = window.game || {};

  let container = null;
  let isVisible = false;
  let currentBgLayer = 'current';
  let bus = null;
  let playButtonClicked = false; // Idempotence guard for Play button

  // Centralized intro screen state to prevent duplicate operations
  const introScreenState = {
    initialized: false,  // Has init() been called successfully?
    visible: false,      // Is the intro screen currently visible?
    animating: false     // Is a show/hide animation in progress?
  };

  const FADE_DURATION = 600; // ms
  const PRELOAD_TIMEOUT = 4500; // ms - timeout for background preload (extended for slow networks)
  const LOADING_BUFFER_THRESHOLD = 300; // ms - show loading spinner if preload exceeds this
  const AVATAR_PRELOAD_TIMEOUT = 6000; // ms - timeout for avatar preloading
  const PLAYERS_READY_TIMEOUT = 8000; // ms - max wait for players to be ready
  const PLAYERS_READY_POLL_INTERVAL = 200; // ms - polling interval for player availability check

  // ===== DOM BUILDING =====

  function buildDOM() {
    const root = document.createElement('div');
    root.id = 'introScreen';
    root.className = 'intro-screen';
    root.setAttribute('role', 'main');
    root.setAttribute('aria-label', 'Game intro screen');

    // Two background layers for crossfading
    const bgCurrent = document.createElement('div');
    bgCurrent.className = 'intro-screen__bg intro-screen__bg--current';
    bgCurrent.setAttribute('aria-hidden', 'true');

    const bgNext = document.createElement('div');
    bgNext.className = 'intro-screen__bg intro-screen__bg--next';
    bgNext.setAttribute('aria-hidden', 'true');

    // Main content container
    const content = document.createElement('div');
    content.className = 'intro-screen__content';

    // App-shell layout wrapper (Epic A / Story A1)
    const appScreen = document.createElement('div');
    appScreen.className = 'app-screen intro-screen__app-shell';

    // Quick icons (top-right) - wrapped in app-screen-header
    const header = document.createElement('div');
    header.className = 'app-screen-header intro-screen__header';
    
    // Title group container for semantic grouping
    const titleGroup = document.createElement('div');
    titleGroup.className = 'intro-screen__title-group';
    
    // Label text (e.g., "Week 1 · Setup")
    const label = document.createElement('p');
    label.className = 'intro-screen__label text-label';
    label.textContent = 'Season Start';
    
    // Main title (game name)
    const title = document.createElement('h1');
    title.className = 'intro-screen__title text-heading-lg';
    title.textContent = 'Big Brother';
    
    // Subtitle/description
    const subtitle = document.createElement('p');
    subtitle.className = 'intro-screen__subtitle text-body';
    subtitle.textContent = 'Configure your cast, competitions, and ceremonies to simulate a full season.';
    
    titleGroup.appendChild(label);
    titleGroup.appendChild(title);
    titleGroup.appendChild(subtitle);
    
    const quickIcons = buildQuickIcons();
    
    header.appendChild(titleGroup);
    header.appendChild(quickIcons);
    
    // Main button column - wrapped in app-screen-body
    const body = document.createElement('div');
    body.className = 'app-screen-body intro-screen__body';
    const buttonColumn = buildButtonColumn();
    body.appendChild(buttonColumn);

    // Optional chips (bottom-right) - wrapped in app-screen-footer
    const footer = document.createElement('div');
    footer.className = 'app-screen-footer intro-screen__footer';
    const chips = buildChips();
    footer.appendChild(chips);

    appScreen.appendChild(header);
    appScreen.appendChild(body);
    appScreen.appendChild(footer);

    content.appendChild(appScreen);

    root.appendChild(bgCurrent);
    root.appendChild(bgNext);
    root.appendChild(content);

    return root;
  }

  function buildQuickIcons() {
    const container = document.createElement('div');
    container.className = 'intro-screen__quick-icons';

    const icons = [
      { id: 'intro-icon-help', label: 'Help', icon: '?', action: 'intro:open:help' },
      { id: 'intro-icon-music', label: 'Music', icon: '🎵', action: 'toggle-music', toggle: true },
      { id: 'intro-icon-sound', label: 'Sound', icon: '🔊', action: 'toggle-sound', toggle: true },
      { id: 'intro-icon-settings', label: 'Settings', icon: '⚙️', action: 'intro:open:settings' }
    ];

    icons.forEach(({ id, label, icon, action, toggle }) => {
      const btn = document.createElement('button');
      btn.id = id;
      btn.className = 'intro-screen__icon-btn';
      btn.textContent = icon;
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
      
      if (toggle) {
        btn.setAttribute('aria-pressed', 'false');
      }

      btn.addEventListener('click', () => {
        console.info(`[IntroHub] action=${action} icon="${label}"`);
        
        if (action === 'toggle-music') {
          handleMusicToggle(btn);
        } else if (action === 'toggle-sound') {
          handleSoundToggle(btn);
        } else {
          // Handle other quick icon actions (Help, Settings)
          handleButtonAction(action, label);
        }
      });

      container.appendChild(btn);
    });

    return container;
  }

  function buildButtonColumn() {
    const column = document.createElement('div');
    column.className = 'intro-screen__button-column';
    column.id = 'introButtonColumn';

    // Check if save exists to determine Play vs Continue
    const hasSave = checkForSave();
    const playLabel = hasSave ? 'Continue' : 'Play';

    const buttons = [
      { id: 'intro-btn-play', label: playLabel, action: 'intro:play', primary: true },
      { id: 'intro-btn-houseguests', label: 'Houseguests', action: 'intro:open:houseguests' },
      { id: 'intro-btn-profile', label: 'Profile', action: 'intro:open:profile' },
      { id: 'intro-btn-leaderboard', label: 'Leaderboard', action: 'intro:open:leaderboard' },
      { id: 'intro-btn-credits', label: 'Credits', action: 'intro:open:credits' }
    ];

    buttons.forEach(({ id, label, action, primary }, index) => {
      const btn = document.createElement('button');
      btn.id = id;
      btn.className = primary ? 'intro-screen__btn intro-screen__btn--primary btn-base btn-primary' : 'intro-screen__btn';
      btn.textContent = label;
      btn.setAttribute('aria-label', label);
      btn.style.setProperty('--stagger-index', index);

      btn.addEventListener('click', async () => {
        console.info(`[IntroHub] action=${action} button="${label}"`);
        
        // Handle Play button specially - delegate to unified flow
        if (action === 'intro:play') {
          if (playButtonClicked) {
            console.warn('[IntroHub] Play button already clicked, ignoring duplicate click');
            return;
          }
          playButtonClicked = true;
          
          // Set global flag to indicate Play was pressed
          g.__bbPlayInitiated = true;
          console.info('[IntroHub] Play button pressed, delegating to unified enterGameFromIntro');
          
          // Delegate to unified entry point in StartupFlow
          // This handles loading overlay, avatar preload, and transition
          const StartupFlow = g.StartupFlow || window.StartupFlow;
          if (StartupFlow && typeof StartupFlow.enterGameFromIntro === 'function') {
            await StartupFlow.enterGameFromIntro();
          } else {
            // Fallback to legacy behavior
            console.warn('[IntroHub] StartupFlow.enterGameFromIntro not available, using fallback');
            handleButtonAction(action, label);
          }
          return;
        }
        
        // Try direct global function calls first, fall back to bus events
        handleButtonAction(action, label);
      });

      column.appendChild(btn);
    });

    return column;
  }

  function buildChips() {
    const container = document.createElement('div');
    container.className = 'intro-screen__chips';

    const chips = [
      { id: 'intro-chip-daily', label: 'Daily', icon: '📅', action: 'intro:chip:daily' },
      { id: 'intro-chip-news', label: 'News', icon: '📰', action: 'intro:chip:news' }
    ];

    chips.forEach(({ id, label, icon, action }) => {
      const chip = document.createElement('button');
      chip.id = id;
      chip.className = 'intro-screen__chip';
      chip.setAttribute('aria-label', label);
      chip.setAttribute('title', label);

      const iconEl = document.createElement('span');
      iconEl.className = 'intro-screen__chip-icon';
      iconEl.textContent = icon;
      iconEl.setAttribute('aria-hidden', 'true');

      const labelEl = document.createElement('span');
      labelEl.className = 'intro-screen__chip-label';
      labelEl.textContent = label;

      chip.appendChild(iconEl);
      chip.appendChild(labelEl);

      chip.addEventListener('click', () => {
        console.info(`[IntroHub] action=${action} chip="${label}"`);
        handleButtonAction(action, label);
      });

      container.appendChild(chip);
    });

    return container;
  }

  // ===== HELPER FUNCTIONS =====

  /**
   * Detect if running on iOS
   */
  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  /**
   * Detect if running in standalone mode (Home Screen app)
   * Supports both iOS (navigator.standalone) and Android/Chrome (display-mode media query)
   * Note: Currently not used in consent flow, but kept for future enhancements
   */
  function isStandalone() { // eslint-disable-line no-unused-vars
    // iOS check
    if (('standalone' in navigator) && (navigator.standalone === true)) {
      return true;
    }
    // Android/Chrome PWA check
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      return true;
    }
    return false;
  }

  function checkForSave() {
    try {
      const save = localStorage.getItem('bbGameState');
      return !!save;
    } catch {
      return false;
    }
  }

  /**
   * Sync quick icon states from config
   */
  function syncQuickIconsFromCfg() {
    try {
      const cfg = (g && ((g.game && g.game.cfg) || g.cfg)) || {};
      const musicOn = cfg.musicOn !== false;
      const sfxOn = cfg.sfxOn !== false;
      
      const musicBtn = document.getElementById('intro-icon-music');
      const soundBtn = document.getElementById('intro-icon-sound');
      
      if (musicBtn) {
        setAudioIconState(musicBtn, 'music', musicOn);
      }
      if (soundBtn) {
        setAudioIconState(soundBtn, 'sound', sfxOn);
      }
      
      console.info('[IntroHub] Quick icons synced from config (music=%s, sfx=%s)', musicOn, sfxOn);
    } catch(e) {
      console.warn('[IntroHub] Failed to sync quick icons from config:', e);
    }
  }

  /**
   * Set audio icon state consistently
   * @param {HTMLElement} btn - Button element
   * @param {string} type - 'music' or 'sound'
   * @param {boolean} enabled - Whether audio is enabled
   */
  function setAudioIconState(btn, type, enabled) {
    const icons = type === 'music' 
      ? { on: '🎵', off: '🔇' }
      : { on: '🔊', off: '🔇' };
    
    btn.textContent = enabled ? icons.on : icons.off;
    btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    btn.classList.toggle('is-off', !enabled);
  }

  // Helper for both music and sound toggles with retry logic
  function handleAudioToggle(type, btn) {
    const MAX_RETRIES = 10;
    const RETRY_DELAY = 150; // ms
    
    let enabled, methodName;
    if (type === 'music') {
      methodName = 'toggleMusic';
    } else if (type === 'sound') {
      methodName = 'toggleSound';
    } else {
      console.warn('[IntroScreen] Unknown audio type:', type);
      return;
    }
    
    // Try to find audio subsystem with retry logic
    let retryCount = 0;
    
    const tryToggle = () => {
      if (g.game && g.game.audio && typeof g.game.audio[methodName] === 'function') {
        enabled = g.game.audio[methodName]();
        setAudioIconState(btn, type, enabled);
        if (retryCount > 0) {
          console.info(`[IntroHub] ${type.charAt(0).toUpperCase() + type.slice(1)} toggle succeeded after ${retryCount} retries`);
        }
        // Dispatch CustomEvent for sound toggle
        if (type === 'sound') {
          try {
            document.dispatchEvent(new CustomEvent('introHubSfx', { detail: { enabled } }));
          } catch(e) {
            // Ignore dispatch errors
          }
        }
        return true;
      } else if (g.audio && typeof g.audio[methodName] === 'function') {
        enabled = g.audio[methodName]();
        setAudioIconState(btn, type, enabled);
        if (retryCount > 0) {
          console.info(`[IntroHub] ${type.charAt(0).toUpperCase() + type.slice(1)} toggle succeeded after ${retryCount} retries`);
        }
        // Dispatch CustomEvent for sound toggle
        if (type === 'sound') {
          try {
            document.dispatchEvent(new CustomEvent('introHubSfx', { detail: { enabled } }));
          } catch(e) {
            // Ignore dispatch errors
          }
        }
        return true;
      }
      return false;
    };
    
    // Initial attempt
    if (tryToggle()) {
      return;
    }
    
    // Retry logic
    console.info(`[IntroHub] ${type.charAt(0).toUpperCase() + type.slice(1)} toggle not yet available, will retry up to ${MAX_RETRIES} times...`);
    
    const retryInterval = setInterval(() => {
      retryCount++;
      
      if (tryToggle()) {
        clearInterval(retryInterval);
      } else if (retryCount >= MAX_RETRIES) {
        clearInterval(retryInterval);
        console.warn(`[IntroHub] ${type.charAt(0).toUpperCase() + type.slice(1)} toggle not available after ${MAX_RETRIES} retries (${MAX_RETRIES * RETRY_DELAY}ms)`);
      }
    }, RETRY_DELAY);
  }

  function handleMusicToggle(btn) {
    handleAudioToggle('music', btn);
  }

  function handleSoundToggle(btn) {
    handleAudioToggle('sound', btn);
  }

  /**
   * Handle button actions by trying direct global function calls first,
   * then falling back to bus events, and finally CustomEvents.
   * This ensures buttons work reliably even if handlers aren't wired yet.
   */
  function handleButtonAction(action, label) {
    // Emit telemetry for button action
    if (window.Telemetry && typeof window.Telemetry.log === 'function') {
      window.Telemetry.log('hub_button_click', { action, label });
    }

    let handled = false;
    
    // Fallback: Map actions to global function names (for backward compatibility)
    const actionMap = {
      'intro:play': { fn: 'enterGame', obj: 'StartupFlow', method: 'enterGame' },
      'intro:open:houseguests': { obj: 'HouseguestsModal', method: 'open' },
      'intro:open:profile': { fn: 'showProfileModal', fallback: { obj: 'ProfileModal', method: 'open' } },
      'intro:open:settings': { fn: 'showSettingsModal', click: 'btnOpenSettings' },
      'intro:open:leaderboard': { fn: 'showLeaderboard', fallback: { obj: 'ProgressionUI', method: 'showLeaderboard' }, click: 'xpLeaderboardBadge' },
      'intro:open:credits': { fallback: { obj: 'CreditsVideo', method: 'play' }, fallback2: 'showCredits' },
      'intro:open:help': { fn: 'showHelpModal', fallback2: 'showHelp', fallback3: 'showRulesModal' },
      'intro:chip:news': { fallback: { obj: 'NewsModal', method: 'open' } },
      'intro:chip:daily': { } // Daily is handled elsewhere
    };
    
    const mapping = actionMap[action];
    
    // Try bus event FIRST (preferred method when bus is available)
    if (bus) {
      console.info(`[IntroHub] Emitting bus event: ${action}`);
      bus.emit(action, {});
      handled = true;
      // Don't return early - still check for fallback handlers below
    }
    
    if (mapping) {
      // Try primary function
      if (mapping.fn && typeof g[mapping.fn] === 'function') {
        console.info(`[IntroHub] Calling global.${mapping.fn}()`);
        g[mapping.fn]();
        handled = true;
      } else if (mapping.obj && mapping.method) {
        // Try object.method pattern - check both g (window.game) and window
        const target = g[mapping.obj] || window[mapping.obj];
        if (target && typeof target[mapping.method] === 'function') {
          console.info(`[IntroHub] Calling global.${mapping.obj}.${mapping.method}()`);
          target[mapping.method]();
          handled = true;
        }
      } else if (mapping.fallback && g[mapping.fallback.obj] && typeof g[mapping.fallback.obj][mapping.fallback.method] === 'function') {
        // Try fallback object.method
        console.info(`[IntroHub] Calling fallback global.${mapping.fallback.obj}.${mapping.fallback.method}()`);
        g[mapping.fallback.obj][mapping.fallback.method]();
        handled = true;
      } else if (mapping.fallback2 && typeof g[mapping.fallback2] === 'function') {
        // Try second fallback function
        console.info(`[IntroHub] Calling fallback global.${mapping.fallback2}()`);
        g[mapping.fallback2]();
        handled = true;
      } else if (mapping.fallback3 && typeof g[mapping.fallback3] === 'function') {
        // Try third fallback function
        console.info(`[IntroHub] Calling fallback global.${mapping.fallback3}()`);
        g[mapping.fallback3]();
        handled = true;
      } else if (mapping.click) {
        // Try clicking an element (for Settings, Leaderboard)
        const el = document.getElementById(mapping.click);
        if (el) {
          console.info(`[IntroHub] Clicking element #${mapping.click}`);
          
          // Emit telemetry for DOM click fallback
          if (window.Telemetry && typeof window.Telemetry.log === 'function') {
            window.Telemetry.log('hub_button_dom_click', { action, elementId: mapping.click });
          }
          
          el.click();
          handled = true;
        }
      }
    }
    
    // If still not handled, dispatch CustomEvent as final fallback
    if (!handled) {
      console.warn(`[IntroHub] No handler found for ${action}, dispatching CustomEvent`);
      
      // Emit telemetry for fallback to CustomEvent
      if (window.Telemetry && typeof window.Telemetry.log === 'function') {
        window.Telemetry.log('hub_button_custom_event_fallback', { action, label });
      }
      
      const eventName = action.replace(/:/g, '-'); // Convert intro:play to intro-play
      const event = new CustomEvent(`bb:ui:${eventName}`, { 
        detail: { action, label },
        bubbles: true 
      });
      window.dispatchEvent(event);
    }
  }

  function updateAnchors(anchor) {
    const column = document.getElementById('introButtonColumn');
    if (!column) return;

    if (anchor && anchor.left && anchor.top) {
      column.style.setProperty('--anchor-left', anchor.left);
      column.style.setProperty('--anchor-top', anchor.top);
    }
  }

  function setBackground(url, immediate = false) {
    if (!container) return;

    const current = container.querySelector('.intro-screen__bg--current');
    const next = container.querySelector('.intro-screen__bg--next');

    if (!current || !next) return;

    if (immediate) {
      // Set immediately without fade
      current.style.backgroundImage = `url(${url})`;
      next.style.backgroundImage = '';
      next.style.opacity = '0';
      currentBgLayer = 'current';
      return;
    }

    // Crossfade to new background
    const targetLayer = currentBgLayer === 'current' ? next : current;
    const sourceLayer = currentBgLayer === 'current' ? current : next;

    // Preload image before fading
    const img = new Image();
    let loadTimeout = null;
    let hasCompleted = false;
    
    const completeTransition = () => {
      if (hasCompleted) return;
      hasCompleted = true;
      
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }
      
      targetLayer.style.backgroundImage = `url(${url})`;
      
      // Optional: decode image for smoother rendering
      if (img.decode && img.complete) {
        img.decode().then(() => {
          targetLayer.style.opacity = '1';
          setTimeout(() => {
            sourceLayer.style.backgroundImage = '';
            sourceLayer.style.opacity = '0';
            currentBgLayer = currentBgLayer === 'current' ? 'next' : 'current';
          }, FADE_DURATION);
        }).catch(() => {
          // Fallback if decode fails
          targetLayer.style.opacity = '1';
          setTimeout(() => {
            sourceLayer.style.backgroundImage = '';
            sourceLayer.style.opacity = '0';
            currentBgLayer = currentBgLayer === 'current' ? 'next' : 'current';
          }, FADE_DURATION);
        });
      } else {
        // Browser doesn't support decode or image not complete, proceed with fade
        targetLayer.style.opacity = '1';
        setTimeout(() => {
          sourceLayer.style.backgroundImage = '';
          sourceLayer.style.opacity = '0';
          currentBgLayer = currentBgLayer === 'current' ? 'next' : 'current';
        }, FADE_DURATION);
      }
    };
    
    img.onload = () => {
      completeTransition();
    };
    
    img.onerror = () => {
      if (hasCompleted) return;
      hasCompleted = true;
      
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }
      
      console.error('[IntroScreen] Failed to load background:', url);
      // Try fallback to daily background
      const fallbackUrl = 'assets/skins/daily-background.png';
      if (url !== fallbackUrl) {
        targetLayer.style.backgroundImage = `url(${fallbackUrl})`;
        targetLayer.style.opacity = '1';
        setTimeout(() => {
          sourceLayer.style.backgroundImage = '';
          sourceLayer.style.opacity = '0';
          currentBgLayer = currentBgLayer === 'current' ? 'next' : 'current';
        }, FADE_DURATION);
      }
    };
    
    // Set timeout for slow/failed loads (5 seconds)
    loadTimeout = setTimeout(() => {
      if (!hasCompleted) {
        console.warn('[IntroScreen] Image load timeout:', url);
        img.onerror = null;
        img.onload = null;
        completeTransition();
      }
    }, 5000);
    
    // Check if image is already cached
    if (img.complete) {
      completeTransition();
    } else {
      img.src = url;
    }
  }

  // ===== BACKGROUND PRELOADING =====

  /**
   * Preload the background image before showing the intro screen.
   * This prevents the flicker where buttons appear before the background.
   * Uses extended timeout (4500ms) with fallback handling.
   * @returns {Promise<Object>} Resolves with { url, timedOut, elapsed }
   */
  function preloadBackground() {
    return new Promise((resolve) => {
      // Get background URL from BackgroundTheme
      let url = 'assets/skins/daily-background.png'; // Default fallback
      if (g.BackgroundTheme && typeof g.BackgroundTheme.getCurrent === 'function') {
        const theme = g.BackgroundTheme.getCurrent();
        if (theme && theme.url) {
          url = theme.url;
        }
      }

      console.info('[IntroScreen] Preloading background:', url);

      const img = new Image();
      let loadTimeout = null;
      let hasCompleted = false;
      let timedOut = false;
      const startTime = Date.now();

      const complete = (success = true, reason = 'loaded') => {
        if (hasCompleted) return;
        hasCompleted = true;
        
        if (loadTimeout) {
          clearTimeout(loadTimeout);
        }
        
        const elapsed = Date.now() - startTime;
        
        if (timedOut) {
          console.warn(`[IntroHubBG] Background preload timeout after ${elapsed}ms - proceeding with fallback state`);
          
          // Log telemetry for timeout fallback
          try {
            if (g.Telemetry && typeof g.Telemetry.log === 'function') {
              g.Telemetry.log('intro_bg_preload_timeout', { elapsed, url });
            }
          } catch (e) {
            // Non-blocking telemetry
          }
        } else if (!success) {
          console.warn(`[IntroHubBG] Background preload failed (${reason}) - proceeding with fallback`);
          
          // Log telemetry for failure
          try {
            if (g.Telemetry && typeof g.Telemetry.log === 'function') {
              g.Telemetry.log('intro_bg_preload_failed', { elapsed, url, reason });
            }
          } catch (e) {
            // Non-blocking telemetry
          }
        } else {
          console.info(`[IntroScreen] Background preload completed in ${elapsed}ms`);
          
          // Log telemetry for success
          try {
            if (g.Telemetry && typeof g.Telemetry.log === 'function') {
              g.Telemetry.log('intro_bg_preload_success', { elapsed, url });
            }
          } catch (e) {
            // Non-blocking telemetry
          }
        }
        
        resolve({ url, timedOut, elapsed });
      };

      img.onload = () => {
        // Use decode() for smoother rendering if available
        if (img.decode) {
          img.decode()
            .then(() => complete(true, 'loaded'))
            .catch(() => {
              console.warn('[IntroScreen] Image decode failed, proceeding anyway');
              complete(true, 'decode-fallback');
            });
        } else {
          complete(true, 'loaded');
        }
      };

      img.onerror = () => {
        console.warn('[IntroHubBG] Background preload error:', url);
        complete(false, 'error'); // Still proceed even if preload fails
      };

      // Timeout after PRELOAD_TIMEOUT to prevent blocking
      loadTimeout = setTimeout(() => {
        if (!hasCompleted) {
          timedOut = true;
          console.warn(`[IntroHubBG] Background preload timeout after ${PRELOAD_TIMEOUT}ms`);
          img.onload = null;
          img.onerror = null;
          complete(false, 'timeout');
        }
      }, PRELOAD_TIMEOUT);

      // Check if image is already cached
      if (img.complete && img.naturalWidth > 0) {
        complete(true, 'cached');
      } else {
        img.src = url;
      }
    });
  }

  /**
   * Show intro screen with preloaded background.
   * This ensures background and buttons appear together (no flicker).
   * @param {boolean} skipPreload - If true, skip preloading (for testing)
   */
  async function showWithPreload(skipPreload = false) {
    // Emit telemetry for showWithPreload start
    if (window.Telemetry && typeof window.Telemetry.log === 'function') {
      window.Telemetry.log('intro_show_with_preload_start', { skipPreload });
    }

    // Idempotence guard - check state first
    if (introScreenState.visible || isVisible) {
      console.info('[IntroScreen] Already visible, ignoring duplicate showWithPreload() call');
      
      // Emit telemetry for duplicate attempt
      if (window.Telemetry && typeof window.Telemetry.log === 'function') {
        window.Telemetry.log('intro_show_with_preload_duplicate', { isVisible: introScreenState.visible });
      }
      
      return;
    }

    // Guard against re-entrant calls while animating
    if (introScreenState.animating) {
      console.warn('[IntroScreen] Animation in progress, ignoring duplicate showWithPreload() call');
      
      // Emit telemetry for animation conflict
      if (window.Telemetry && typeof window.Telemetry.log === 'function') {
        window.Telemetry.log('intro_show_with_preload_animating', { animating: true });
      }
      
      return;
    }

    // Mark as animating to prevent concurrent calls
    introScreenState.animating = true;

    // Global idempotence guard - check flag but don't trust it blindly
    if (window.__bbHubShown) {
      console.warn('[IntroScreen] Global flag __bbHubShown is true but isVisible is false - resetting flag and proceeding');
      window.__bbHubShown = false;
    }

    console.info('[IntroScreen] Preloading background...');

    // Optional: Show loading buffer if preload takes too long
    let loadingBuffer = null;
    const bufferTimer = setTimeout(() => {
      if (!isVisible) {
        console.info('[IntroScreen] Showing loading buffer...');
        loadingBuffer = showLoadingBuffer();
      }
    }, LOADING_BUFFER_THRESHOLD);

    // Preload background
    if (!skipPreload) {
      await preloadBackground();
    }

    // Clear loading buffer timer
    clearTimeout(bufferTimer);
    
    // Remove loading buffer if shown
    if (loadingBuffer) {
      hideLoadingBuffer(loadingBuffer);
    }

    // Now show the intro screen
    // The show() function will set __bbHubShown = true after successful mount
    show();
    
    // CRITICAL: Add bg-ready class AFTER show() to enable button visibility
    // This ensures CSS gating hides buttons until background is loaded
    if (container) {
      container.classList.add('bg-ready');
      console.info('[IntroScreen] Added bg-ready class - buttons now visible');
    }
    
    // Mark as visible and clear animating flag
    introScreenState.visible = true;
    introScreenState.animating = false;
    
    // Emit telemetry for showWithPreload complete
    if (window.Telemetry && typeof window.Telemetry.log === 'function') {
      window.Telemetry.log('intro_show_with_preload_done', { isVisible });
    }
    
    // Note: afterIntroScreenVisible() is called inside show()
  }

  /**
   * Show a lightweight loading buffer (spinner or "Loading..." text)
   * @returns {HTMLElement} The buffer element
   */
  function showLoadingBuffer() {
    const buffer = document.createElement('div');
    buffer.id = 'intro-loading-buffer';
    buffer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: #0a0e14;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9997;
      color: #fff;
      font-size: 18px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;
    buffer.innerHTML = '<div style="text-align: center;">Loading...<br><div style="margin-top: 16px; font-size: 32px;">⏳</div></div>';
    document.body.appendChild(buffer);
    return buffer;
  }

  /**
   * Hide and remove the loading buffer
   * @param {HTMLElement} buffer - The buffer element to remove
   */
  function hideLoadingBuffer(buffer) {
    if (buffer && buffer.parentNode) {
      buffer.style.opacity = '0';
      buffer.style.transition = 'opacity 200ms ease-out';
      setTimeout(() => {
        if (buffer.parentNode) {
          buffer.parentNode.removeChild(buffer);
        }
      }, 200);
    }
  }

  // ===== AVATAR PRELOAD OVERLAY =====

  /**
   * Build and show the avatar preload overlay.
   * Displays a spinner with "Loading houseguest profiles…" text and progress %.
   * Enhanced with role="dialog" aria-modal="true" for accessibility.
   * @returns {HTMLElement} The overlay element
   */
  function buildAvatarPreloadOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'avatarPreloadOverlay';
    overlay.className = 'intro-avatar-preload-overlay avatar-preload-overlay';
    // Enhanced accessibility: dialog with modal behavior
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'avatarPreloadText');
    overlay.setAttribute('aria-busy', 'true');
    
    // Spinner with accessibility
    const spinner = document.createElement('div');
    spinner.className = 'intro-avatar-preload-spinner';
    spinner.setAttribute('role', 'img');
    spinner.setAttribute('aria-label', 'Loading avatars');
    
    // Live region for progress updates
    const liveRegion = document.createElement('div');
    liveRegion.className = 'avatar-preload-live-region sr-only';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.id = 'avatarPreloadLiveRegion';
    
    // Text - updated message
    const text = document.createElement('div');
    text.className = 'intro-avatar-preload-text';
    text.id = 'avatarPreloadText';
    text.textContent = 'Loading houseguest profiles...';
    
    // Progress percentage
    const progress = document.createElement('div');
    progress.className = 'intro-avatar-preload-progress';
    progress.id = 'avatarPreloadProgress';
    progress.setAttribute('role', 'progressbar');
    progress.setAttribute('aria-valuemin', '0');
    progress.setAttribute('aria-valuemax', '100');
    progress.setAttribute('aria-valuenow', '0');
    progress.textContent = '0%';
    
    // Progress bar container
    const progressBarContainer = document.createElement('div');
    progressBarContainer.className = 'intro-avatar-progress-bar-container';
    progressBarContainer.id = 'avatarProgressBarContainer';
    
    // Progress bar fill
    const progressBarFill = document.createElement('div');
    progressBarFill.className = 'intro-avatar-progress-bar-fill';
    progressBarFill.id = 'avatarProgressBarFill';
    progressBarFill.style.width = '0%';
    
    progressBarContainer.appendChild(progressBarFill);
    
    // Error message container (hidden by default)
    const errorContainer = document.createElement('div');
    errorContainer.className = 'intro-avatar-preload-error';
    errorContainer.id = 'avatarPreloadError';
    errorContainer.style.display = 'none';
    errorContainer.setAttribute('role', 'alert');
    
    // Error message text
    const errorText = document.createElement('div');
    errorText.className = 'intro-avatar-preload-error-text';
    errorText.id = 'avatarPreloadErrorText';
    
    // "Proceed anyway" button (QA-only)
    const proceedButton = document.createElement('button');
    proceedButton.className = 'intro-avatar-preload-proceed-btn';
    proceedButton.id = 'avatarPreloadProceedBtn';
    proceedButton.textContent = 'Proceed Anyway';
    proceedButton.setAttribute('aria-label', 'Proceed to game despite avatar loading errors');
    proceedButton.style.display = 'none'; // Hidden by default, shown only if enableProceedAnyway=true
    
    errorContainer.appendChild(errorText);
    errorContainer.appendChild(proceedButton);
    
    overlay.appendChild(spinner);
    overlay.appendChild(liveRegion);
    overlay.appendChild(text);
    overlay.appendChild(progressBarContainer);
    overlay.appendChild(progress);
    overlay.appendChild(errorContainer);
    
    return overlay;
  }

  /**
   * Show the avatar preload overlay with fade-in animation.
   * @returns {HTMLElement} The overlay element
   */
  function showAvatarPreloadOverlay() {
    // Remove any existing overlay
    const existing = document.getElementById('avatarPreloadOverlay');
    if (existing) {
      existing.remove();
    }
    
    const overlay = buildAvatarPreloadOverlay();
    document.body.appendChild(overlay);
    
    // Trigger fade-in (allow reflow first)
    requestAnimationFrame(() => {
      overlay.classList.add('intro-avatar-preload-overlay--visible');
      overlay.classList.add('avatar-preload-overlay--visible');
    });
    
    console.info('[IntroScreen] Avatar preload overlay shown');
    return overlay;
  }

  /**
   * Update the avatar preload overlay progress.
   * @param {number} loaded - Number of avatars loaded
   * @param {number} total - Total number of avatars
   */
  function updateAvatarPreloadProgress(loaded, total) {
    const progress = document.getElementById('avatarPreloadProgress');
    const progressBarFill = document.getElementById('avatarProgressBarFill');
    const liveRegion = document.getElementById('avatarPreloadLiveRegion');
    
    const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
    
    // Update percentage text
    if (progress) {
      progress.textContent = `${percent}%`;
      progress.setAttribute('aria-valuenow', String(percent));
    }
    
    // Animate progress bar fill
    if (progressBarFill) {
      progressBarFill.style.width = `${percent}%`;
    }
    
    // Update live region for screen readers (every 25%)
    if (liveRegion && total > 0) {
      if (percent % 25 === 0 || percent === 100) {
        liveRegion.textContent = `Loading: ${percent}% complete`;
      }
    }
    
    // Log telemetry for progress milestones
    if (percent === 25 || percent === 50 || percent === 75 || percent === 100) {
      try {
        if (g.Telemetry && typeof g.Telemetry.log === 'function') {
          g.Telemetry.log('avatar_preload_progress_milestone', { 
            percent, 
            loaded, 
            total 
          });
        }
      } catch (e) {
        // Non-blocking
      }
    }
  }

  /**
   * Hide and remove the avatar preload overlay with fade-out animation.
   * @param {HTMLElement} overlay - The overlay element
   * @returns {Promise} Resolves when animation completes
   */
  function hideAvatarPreloadOverlay(overlay) {
    return new Promise((resolve) => {
      if (!overlay) {
        overlay = document.getElementById('avatarPreloadOverlay');
      }
      
      if (!overlay) {
        resolve();
        return;
      }
      
      overlay.setAttribute('aria-busy', 'false');
      overlay.classList.remove('intro-avatar-preload-overlay--visible');
      overlay.classList.remove('avatar-preload-overlay--visible');
      overlay.classList.add('intro-avatar-preload-overlay--hiding');
      overlay.classList.add('avatar-preload-overlay--hiding');
      
      // Wait for fade-out animation (300ms from CSS)
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        console.info('[IntroScreen] Avatar preload overlay hidden');
        resolve();
      }, 300);
    });
  }

  /**
   * Wait for players to be ready (built and available)
   * Uses players-ready event or polls for player existence
   * @returns {Promise<Array>} Resolved with array of players
   */
  function waitForPlayersReady() {
    return new Promise((resolve) => {
      // Check if players are already available
      const existingPlayers = g.game?.players || g.players || [];
      if (existingPlayers.length > 0) {
        console.info('[AvatarPreload] Players already available:', existingPlayers.length);
        resolve(existingPlayers);
        return;
      }
      
      console.info('[AvatarPreload] Waiting for players to be ready...');
      
      let resolved = false;
      let pollTimer = null;
      let timeoutTimer = null;
      let eventHandler = null;
      
      // Cleanup function
      function cleanup() {
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
        if (timeoutTimer) {
          clearTimeout(timeoutTimer);
          timeoutTimer = null;
        }
        if (eventHandler) {
          window.removeEventListener('players-ready', eventHandler);
          eventHandler = null;
        }
      }
      
      // Completion handler
      function complete(players, source) {
        if (resolved) return;
        resolved = true;
        cleanup();
        console.info(`[AvatarPreload] Players ready (${source}):`, players.length);
        
        // Log telemetry
        try {
          if (g.Telemetry && typeof g.Telemetry.log === 'function') {
            g.Telemetry.log('players_ready_for_avatars', { count: players.length, source });
          }
        } catch (e) {
          // Non-blocking
        }
        
        resolve(players);
      }
      
      // Handler for players-ready event
      eventHandler = function(event) {
        const players = event?.detail?.players || g.game?.players || g.players || [];
        complete(players, 'event');
      };
      
      // Listen for players-ready event
      window.addEventListener('players-ready', eventHandler);
      
      // Polling fallback - check periodically for players
      pollTimer = setInterval(() => {
        if (resolved) return;
        
        const players = g.game?.players || g.players || [];
        if (players.length > 0) {
          complete(players, 'polling');
        }
      }, PLAYERS_READY_POLL_INTERVAL);
      
      // Timeout - resolve with whatever we have after max wait
      timeoutTimer = setTimeout(() => {
        const players = g.game?.players || g.players || [];
        console.warn('[AvatarPreload] Timeout waiting for players, proceeding with:', players.length);
        complete(players, 'timeout');
      }, PLAYERS_READY_TIMEOUT);
    });
  }

  /**
   * Perform avatar preloading with overlay display and strict mode enforcement.
   * Uses queued parallel loading from avatar-queue.js for better mobile stability.
   * Shows overlay, waits for players to be ready, preloads avatars, updates progress, then hides overlay.
   * In strict mode: only fires avatars:ready event if ALL avatars load+decode successfully.
   * @returns {Promise<Object>} The preload result summary
   */
  async function performAvatarPreload() {
    console.info('[AvatarPreload] Starting avatar preload workflow');
    
    // Set state flag to indicate preloading is in progress
    setAvatarsPreloadingState(true);
    
    // Show overlay immediately so user sees feedback
    const overlay = showAvatarPreloadOverlay();
    updateAvatarPreloadProgress(0, 1); // Show 0% while waiting
    
    // Check for avatar cache module (preferred), avatar-queue module, or legacy preloadAvatars
    const AvatarCacheModule = g.AvatarCache || window.AvatarCache;
    const AvatarQueue = g.AvatarQueue || window.AvatarQueue;
    const preloadAvatarsQueued = AvatarQueue?.preloadAvatarsQueued;
    const legacyPreloadAvatars = g.preloadAvatars || window.preloadAvatars;
    
    // Get config including strict mode flag
    const cfg = g.game?.cfg || g.cfg || {};
    const loadMode = cfg.avatarLoadMode || 'batch';
    const strictMode = cfg.avatarPreloadRequireAll === true;
    const enableProceedAnyway = cfg.enableProceedAnyway === true;
    
    console.info('[AvatarPreload] Strict mode:', strictMode);
    
    // Wait for players to be ready before proceeding
    const players = await waitForPlayersReady();
    
    // Log telemetry for start
    try {
      if (g.Telemetry && typeof g.Telemetry.log === 'function') {
        g.Telemetry.log('avatar_preload_start', { 
          playerCount: players.length,
          strictMode,
          usesAvatarCache: !!AvatarCacheModule
        });
      }
    } catch (e) {
      // Non-blocking
    }
    
    // Skip if no players after waiting
    if (!players || players.length === 0) {
      console.warn('[AvatarPreload] No players to preload avatars for after waiting, skipping');
      setAvatarsPreloadingState(false);
      // Dispatch avatars:ready event even if skipped
      try {
        if (AvatarQueue?.dispatchAvatarsReady) {
          AvatarQueue.dispatchAvatarsReady({ loaded: 0, total: 0, timedOut: false, skipped: true });
        }
      } catch (e) {
        // Non-blocking
      }
      await hideAvatarPreloadOverlay(overlay);
      return { loaded: 0, total: 0, timedOut: false, skipped: true };
    }
    
    // If no preloader is available, skip with warning
    if (!AvatarCacheModule && !preloadAvatarsQueued && !legacyPreloadAvatars) {
      console.warn('[AvatarPreload] No avatar preloader available, skipping');
      setAvatarsPreloadingState(false);
      await hideAvatarPreloadOverlay(overlay);
      return { loaded: 0, total: 0, timedOut: false, skipped: true };
    }
    
    // Log telemetry for workflow start
    try {
      if (g.Telemetry && typeof g.Telemetry.log === 'function') {
        g.Telemetry.log('avatar_preload_workflow_start', { 
          playerCount: players.length,
          loadMode,
          strictMode,
          useQueuedPreloader: !!preloadAvatarsQueued
        });
      }
    } catch (e) {
      // Non-blocking telemetry
    }
    
    try {
      let result;
      
      if (AvatarCacheModule && typeof AvatarCacheModule.preloadPlayers === 'function') {
        // Use unified avatar cache (preferred)
        console.info('[AvatarPreload] Using unified AvatarCache module');
        result = await AvatarCacheModule.preloadPlayers(players, {
          strictMode: strictMode,
          timeout: cfg.avatarPreloadTimeoutMs || (strictMode ? 30000 : AVATAR_PRELOAD_TIMEOUT),
          concurrency: cfg.avatarPreloadConcurrency || 8,
          onProgress: (loaded, total) => {
            // Use requestAnimationFrame for smooth updates
            if (typeof requestAnimationFrame === 'function') {
              requestAnimationFrame(() => updateAvatarPreloadProgress(loaded, total));
            } else {
              updateAvatarPreloadProgress(loaded, total);
            }
          }
        });
      } else if (preloadAvatarsQueued) {
        // Use new queued preloader with concurrency control
        console.info('[AvatarPreload] Using queued avatar preloader');
        result = await preloadAvatarsQueued(players, {
          concurrency: cfg.avatarPreloadConcurrency || 8,
          timeout: cfg.avatarPreloadTimeoutMs || (strictMode ? 30000 : AVATAR_PRELOAD_TIMEOUT),
          readyPercent: cfg.avatarReadyPercent || (strictMode ? 1.0 : 0.99),
          strictMode: strictMode,
          onProgress: (loaded, total) => {
            // Use requestAnimationFrame for smooth updates
            if (typeof requestAnimationFrame === 'function') {
              requestAnimationFrame(() => updateAvatarPreloadProgress(loaded, total));
            } else {
              updateAvatarPreloadProgress(loaded, total);
            }
          }
        });
      } else {
        // Fall back to legacy preloader
        console.info('[AvatarPreload] Using legacy avatar preloader');
        result = await legacyPreloadAvatars(players, {
          timeout: strictMode ? 30000 : AVATAR_PRELOAD_TIMEOUT,
          onProgress: (loaded, total) => {
            if (typeof requestAnimationFrame === 'function') {
              requestAnimationFrame(() => updateAvatarPreloadProgress(loaded, total));
            } else {
              updateAvatarPreloadProgress(loaded, total);
            }
          }
        });
      }
      
      console.info('[AvatarPreload] Avatar preload complete:', result);
      
      // Log summary with timing and statistics
      if (result) {
        console.info('[RosterGate] Preload summary:', {
          total: result.total,
          loaded: result.loaded,
          failed: result.failed || (result.total - result.loaded),
          decodeSupported: result.decodeSupported,
          timedOut: result.timedOut,
          elapsedMs: result.elapsedMs,
          strictMode: result.strictMode,
          isReady: result.isReady
        });
      }
      
      // STRICT MODE ENFORCEMENT
      // Check if preload succeeded according to strict mode rules
      const preloadSuccess = strictMode 
        ? (result.loaded === result.total && result.failed === 0 && !result.timedOut)
        : result.isReady;
      
      if (!preloadSuccess) {
        // Preload failed or timed out in strict mode
        console.warn('[AvatarPreload] STRICT MODE: Preload not successful');
        console.warn(`  - Loaded: ${result.loaded}/${result.total}`);
        console.warn(`  - Failed: ${result.failed || 0}`);
        console.warn(`  - Timed out: ${result.timedOut}`);
        
        // Show error message in overlay
        showAvatarPreloadError(result, enableProceedAnyway);
        
        // Log telemetry for strict mode failure
        try {
          if (g.Telemetry && typeof g.Telemetry.log === 'function') {
            g.Telemetry.log('avatar_preload_strict_failure', {
              loaded: result.loaded,
              total: result.total,
              failed: result.failed || 0,
              timedOut: result.timedOut
            });
          }
        } catch (e) {
          // Non-blocking
        }
        
        // Do NOT dispatch avatars:ready event - system must wait
        // Keep overlay visible with error message
        // User must manually proceed or fix the issue
        
        // Keep __avatarsPreloading flag set so StartupFlow doesn't re-show hub
        return result;
      }
      
      // Success - dispatch avatars:ready event and proceed
      if (AvatarQueue?.dispatchAvatarsReady) {
        AvatarQueue.dispatchAvatarsReady(result);
      }
      
      // Log telemetry for avatars_ready_event
      try {
        if (g.Telemetry && typeof g.Telemetry.log === 'function') {
          g.Telemetry.log('avatars_ready_event', {
            loaded: result?.loaded || 0,
            total: result?.total || 0,
            timedOut: result?.timedOut || false,
            elapsedMs: result?.elapsedMs || 0,
            strictMode
          });
        }
      } catch (e) {
        // Non-blocking telemetry
      }
      
      // Small delay to let user see 100% before hiding
      if (result.loaded > 0 && result.loaded === result.total) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Hide overlay with animation
      await hideAvatarPreloadOverlay(overlay);
      
      // Clear preloading flag
      setAvatarsPreloadingState(false);
      
      return result;
    } catch (err) {
      console.error('[AvatarPreload] Avatar preload error:', err);
      
      // Clear preloading flag
      setAvatarsPreloadingState(false);
      
      // Log telemetry for error
      try {
        if (g.Telemetry && typeof g.Telemetry.log === 'function') {
          g.Telemetry.log('avatar_preload_workflow_error', { error: err.message, strictMode });
        }
      } catch (e) {
        // Non-blocking telemetry
      }
      
      // In strict mode, show error instead of proceeding
      if (strictMode) {
        const errorResult = { 
          loaded: 0, 
          total: players.length, 
          failed: players.length,
          timedOut: false, 
          error: true 
        };
        showAvatarPreloadError(errorResult, enableProceedAnyway);
        return errorResult;
      }
      
      // Non-strict mode: dispatch avatars:ready event with timeout flag on error
      try {
        if (AvatarQueue?.dispatchAvatarsReady) {
          AvatarQueue.dispatchAvatarsReady({ 
            loaded: 0, 
            total: players.length, 
            timedOut: true, 
            error: true 
          });
        }
      } catch (e) {
        // Non-blocking
      }
      
      // Hide overlay and proceed anyway
      await hideAvatarPreloadOverlay(overlay);
      
      return { loaded: 0, total: players.length, timedOut: true, error: true };
    }
  }
  
  /**
   * Get/set avatars preloading state
   * Uses namespaced property to avoid global pollution
   */
  function setAvatarsPreloadingState(state) {
    if (!g.game) g.game = {};
    if (!g.game.state) g.game.state = {};
    g.game.state.avatarsPreloading = state;
    // Keep legacy flag for backward compatibility
    g.__avatarsPreloading = state;
  }
  
  // eslint-disable-next-line no-unused-vars
  function getAvatarsPreloadingState() {
    return g.game?.state?.avatarsPreloading || g.__avatarsPreloading || false;
  }
  
  /**
   * Show error message in avatar preload overlay
   * @param {Object} result - Preload result summary
   * @param {boolean} enableProceedAnyway - Whether to show "Proceed anyway" button
   */
  function showAvatarPreloadError(result, enableProceedAnyway) {
    // Hide spinner and progress
    const spinner = document.querySelector('.intro-avatar-preload-spinner');
    const progress = document.getElementById('avatarPreloadProgress');
    const text = document.getElementById('avatarPreloadText');
    
    if (spinner) spinner.style.display = 'none';
    if (progress) progress.style.display = 'none';
    if (text) text.style.display = 'none';
    
    // Show error container
    const errorContainer = document.getElementById('avatarPreloadError');
    const errorText = document.getElementById('avatarPreloadErrorText');
    const proceedBtn = document.getElementById('avatarPreloadProceedBtn');
    
    if (errorContainer) {
      errorContainer.style.display = 'flex';
    }
    
    // Build error message
    let message = 'Failed to load all houseguest profiles.\n\n';
    if (result.timedOut) {
      message += `Timeout after ${Math.floor((result.elapsedMs || 0) / 1000)}s\n`;
    }
    message += `Loaded: ${result.loaded || 0}/${result.total || 0}\n`;
    message += `Failed: ${result.failed || 0}`;
    
    if (errorText) {
      errorText.textContent = message;
    }
    
    // Show "Proceed anyway" button if enabled
    if (proceedBtn) {
      if (enableProceedAnyway) {
        proceedBtn.style.display = 'block';
        proceedBtn.onclick = () => {
          console.warn('[AvatarPreload] User manually proceeded despite errors');
          // Clear flag and proceed
          setAvatarsPreloadingState(false);
          // Dispatch avatars:ready with error flag
          const AvatarQueue = g.AvatarQueue || window.AvatarQueue;
          if (AvatarQueue?.dispatchAvatarsReady) {
            AvatarQueue.dispatchAvatarsReady({ ...result, manualProceed: true });
          }
          // Hide overlay
          hideAvatarPreloadOverlay(document.getElementById('avatarPreloadOverlay'));
          // Continue to game
          handleButtonAction('intro:play', 'Play');
        };
      } else {
        proceedBtn.style.display = 'none';
      }
    }
    
    console.error('[AvatarPreload] Strict mode error - overlay remains visible');
  }


  /**
   * Build consent overlay DOM structure
   */
  function buildSoundConsentOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'intro-consent-overlay';
    overlay.className = 'intro-consent-overlay';
    
    const card = document.createElement('div');
    card.className = 'intro-consent-card';
    
    const title = document.createElement('h2');
    title.className = 'intro-consent-title';
    title.textContent = 'Enable sound?';
    
    const message = document.createElement('p');
    message.className = 'intro-consent-message';
    message.textContent = 'Allow audio to play music and sound effects.';
    
    const buttonRow = document.createElement('div');
    buttonRow.className = 'intro-consent-buttons';
    
    const allowBtn = document.createElement('button');
    allowBtn.className = 'intro-consent-btn intro-consent-btn--allow';
    allowBtn.textContent = 'Allow';
    allowBtn.addEventListener('click', () => {
      handleConsentAllow();
      hideSoundConsentOverlay();
    });
    
    const muteBtn = document.createElement('button');
    muteBtn.className = 'intro-consent-btn intro-consent-btn--mute';
    muteBtn.textContent = 'Mute for now';
    muteBtn.addEventListener('click', () => {
      handleConsentMute();
      hideSoundConsentOverlay();
    });
    
    buttonRow.appendChild(allowBtn);
    buttonRow.appendChild(muteBtn);
    
    card.appendChild(title);
    card.appendChild(message);
    card.appendChild(buttonRow);
    overlay.appendChild(card);
    
    return overlay;
  }

  /**
   * Show consent overlay for autoplay unlock
   */
  function showSoundConsentOverlay() {
    // Don't show if already exists
    if (document.getElementById('intro-consent-overlay')) {
      console.info('[IntroHub] Consent overlay already shown');
      return;
    }
    
    const overlay = buildSoundConsentOverlay();
    document.body.appendChild(overlay);
    
    // Fade in
    requestAnimationFrame(() => {
      overlay.classList.add('intro-consent-overlay--visible');
    });
    
    console.info('[IntroHub] Consent overlay shown');
  }

  /**
   * Hide consent overlay
   */
  function hideSoundConsentOverlay() {
    const overlay = document.getElementById('intro-consent-overlay');
    if (overlay) {
      overlay.classList.remove('intro-consent-overlay--visible');
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 300);
      console.info('[IntroHub] Consent overlay hidden');
    }
  }

  /**
   * Handle consent Allow action
   */
  function handleConsentAllow() {
    try {
      // Persist consent to localStorage
      try {
        localStorage.setItem('bb_sound_consent', '1');
      } catch(e) {
        console.warn('[IntroHub] Failed to persist consent to localStorage:', e);
      }
      
      const cfg = (g && ((g.game && g.game.cfg) || g.cfg)) || {};
      cfg.musicOn = true;
      cfg.sfxOn = true;
      
      // Update audio system
      if (g.game && g.game.audio) {
        if (typeof g.game.audio.setMusicEnabled === 'function') {
          g.game.audio.setMusicEnabled(true);
        }
        if (typeof g.game.audio.setSfxEnabled === 'function') {
          g.game.audio.setSfxEnabled(true);
        }
      } else if (g.audio) {
        if (typeof g.audio.setMusicEnabled === 'function') {
          g.audio.setMusicEnabled(true);
        }
        if (typeof g.audio.setSfxEnabled === 'function') {
          g.audio.setSfxEnabled(true);
        }
      }
      
      // Update icon states
      const musicBtn = document.getElementById('intro-icon-music');
      const soundBtn = document.getElementById('intro-icon-sound');
      if (musicBtn) setAudioIconState(musicBtn, 'music', true);
      if (soundBtn) setAudioIconState(soundBtn, 'sound', true);
      
      // Start intro hub music immediately (gesture satisfied)
      if (typeof g?.audio?.playMusicForPhase === 'function') {
        g.audio.playMusicForPhase('intro_hub');
      } else if (typeof g?.playIntroHubMusic === 'function') {
        g.playIntroHubMusic();
      }
      
      // Dispatch consent granted event
      try {
        window.dispatchEvent(new CustomEvent('bb:sound-consent-granted'));
        document.dispatchEvent(new CustomEvent('bb:sound-consent-granted'));
      } catch(e) {
        // Ignore dispatch errors
      }
      
      console.info('[IntroHub] Consent granted - audio enabled, persisted to localStorage');
    } catch(e) {
      console.warn('[IntroHub] Failed to handle consent allow:', e);
    }
  }

  /**
   * Handle consent Mute action
   */
  function handleConsentMute() {
    try {
      // Persist denial to localStorage
      try {
        localStorage.setItem('bb_sound_consent', '0');
      } catch(e) {
        console.warn('[IntroHub] Failed to persist consent denial to localStorage:', e);
      }
      
      const cfg = (g && ((g.game && g.game.cfg) || g.cfg)) || {};
      cfg.musicOn = false;
      cfg.sfxOn = false;
      
      // Update audio system
      if (g.game && g.game.audio) {
        if (typeof g.game.audio.setMusicEnabled === 'function') {
          g.game.audio.setMusicEnabled(false);
        }
        if (typeof g.game.audio.setSfxEnabled === 'function') {
          g.game.audio.setSfxEnabled(false);
        }
      } else if (g.audio) {
        if (typeof g.audio.setMusicEnabled === 'function') {
          g.audio.setMusicEnabled(false);
        }
        if (typeof g.audio.setSfxEnabled === 'function') {
          g.audio.setSfxEnabled(false);
        }
      }
      
      // Update icon states
      const musicBtn = document.getElementById('intro-icon-music');
      const soundBtn = document.getElementById('intro-icon-sound');
      if (musicBtn) setAudioIconState(musicBtn, 'music', false);
      if (soundBtn) setAudioIconState(soundBtn, 'sound', false);
      
      console.info('[IntroHub] Consent muted - audio disabled, persisted to localStorage');
    } catch(e) {
      console.warn('[IntroHub] Failed to handle consent mute:', e);
    }
  }

  /**
   * Ensure lobby music plays whenever the hub is visible
   * Includes autoplay-blocked listener for consent prompt
   * For iOS standalone, shows consent overlay immediately
   */
  function ensureLobbyMusic() {
    try {
      const cfg = (g && ((g.game && g.game.cfg) || g.cfg)) || {};
      const musicOn = cfg.musicOn !== false;
      const muted = (typeof g?.getMuted === 'function') ? g.getMuted() : false;

      // Check persisted consent
      let consentGranted = false;
      let consentDenied = false;
      try {
        const consent = localStorage.getItem('bb_sound_consent');
        if (consent === '1') consentGranted = true;
        if (consent === '0') consentDenied = true;
      } catch(e) {
        // Ignore localStorage errors
      }

      // If iOS (Safari or standalone) and no persisted consent decision, show consent overlay immediately
      if (isIOS() && !consentGranted && !consentDenied) {
        console.info('[IntroHub] iOS detected (Safari/standalone), showing consent overlay immediately');
        showSoundConsentOverlay();
        return;
      }

      // If consent was previously granted, enable audio and start music
      if (consentGranted) {
        console.info('[IntroHub] Persisted consent found, enabling audio');
        cfg.musicOn = true;
        cfg.sfxOn = true;
        
        // Dispatch consent granted event for SFX module
        try {
          window.dispatchEvent(new CustomEvent('bb:sound-consent-granted'));
          document.dispatchEvent(new CustomEvent('bb:sound-consent-granted'));
        } catch(e) {
          // Ignore dispatch errors
        }
        
        // Try to start music
        if (typeof g?.audio?.playMusicForPhase === 'function') {
          g.audio.playMusicForPhase('intro_hub');
        } else if (typeof g?.playIntroHubMusic === 'function') {
          g.playIntroHubMusic();
        }
        console.info('[IntroHub] Lobby music started from persisted consent');
        return;
      }

      if (!musicOn || muted) {
        console.info('[IntroHub] Lobby music suppressed (musicOn=%s, muted=%s)', musicOn, muted);
        return;
      }
      if (typeof g?.playIntroHubMusic !== 'function' && typeof g?.audio?.playMusicForPhase !== 'function') {
        console.warn('[IntroHub] Lobby music API not ready');
        return;
      }

      // Listen for autoplay-blocked event
      const autoplayBlockedHandler = () => {
        console.info('[IntroHub] Autoplay blocked, showing consent overlay');
        showSoundConsentOverlay();
      };
      window.addEventListener('bb:audio:autoplay-blocked', autoplayBlockedHandler, { once: true });

      // Initial request (will trigger autoplay-blocked if needed)
      try {
        if (typeof g?.audio?.playMusicForPhase === 'function') {
          g.audio.playMusicForPhase('intro_hub');
        } else {
          g.playIntroHubMusic();
        }
        console.info('[IntroHub] Lobby music requested');
      } catch(e) {
        console.warn('[IntroHub] Lobby music initial request failed', e);
      }
    } catch (e) {
      console.warn('[IntroHub] ensureLobbyMusic error', e);
    }
  }

  /**
   * Add subtle glassy effects to the Play CTA
   * Helper: finds Play CTA via common selectors and adds styling classes
   */
  function decoratePlayCta() {
    try {
      const playBtn =
        document.querySelector('[data-action="intro:start"]') ||
        document.querySelector('#introPlayButton') ||
        document.querySelector('#intro-btn-play') ||
        document.querySelector('.intro-screen__cta--play') ||
        document.querySelector('.intro-screen__btn--play') ||
        document.querySelector('.intro-screen__btn--primary');

      if (!playBtn) {
        console.debug('[IntroHub] Play CTA not found for decoration');
        return;
      }

      playBtn.classList.add('intro-cta--glassy', 'intro-cta--animated');
      console.info('[IntroHub] Play CTA decorated with glassy effects');
    } catch (e) {
      console.debug('[IntroHub] decoratePlayCta skipped', e);
    }
  }

  /**
   * Attach UI SFX to intro screen buttons
   * Called after intro screen becomes visible
   */
  function afterIntroScreenVisible(){
    try {
      const hubRoot = document.getElementById('introScreen');
      if (hubRoot && window.IntroHubSfx) {
        window.IntroHubSfx.attach(hubRoot);
        console.info('[IntroHub] UI SFX attached');
      }
    } catch(e) {
      console.warn('[IntroHub] Failed to attach UI SFX', e);
    }
    
    // Sync quick icons from config
    syncQuickIconsFromCfg();
    
    // Ensure lobby music plays (handles iOS standalone consent)
    ensureLobbyMusic();
    
    // Decorate Play CTA with glassy effects
    try {
      decoratePlayCta();
    } catch (e) {
      console.debug('[IntroHub] decoratePlayCta skipped', e);
    }
  }

  // ===== PUBLIC API =====

  function show() {
    // Emit telemetry for show start
    if (window.Telemetry && typeof window.Telemetry.log === 'function') {
      window.Telemetry.log('intro_show_start', {});
    }

    // Idempotence guard - if already visible, do nothing
    if (introScreenState.visible || isVisible) {
      console.info('[IntroScreen] Already visible, ignoring duplicate show() call');
      
      // Emit telemetry for duplicate show attempt
      if (window.Telemetry && typeof window.Telemetry.log === 'function') {
        window.Telemetry.log('intro_show_duplicate', { isVisible: introScreenState.visible });
      }
      
      return;
    }

    // Global idempotence guard - check flag but don't trust it blindly
    if (window.__bbHubShown) {
      console.warn('[IntroScreen] Global flag __bbHubShown is true but isVisible is false - resetting flag');
      window.__bbHubShown = false;
    }

    // CRITICAL: Ensure DOM is built (should be done in init, but guard here too)
    if (!container) {
      container = buildDOM();
      console.info('[IntroScreen] DOM built during show() - late build');
    }

    // Get initial background from BackgroundTheme BEFORE appending to DOM
    // This ensures background is set before first paint
    if (g.BackgroundTheme && typeof g.BackgroundTheme.getCurrent === 'function') {
      const theme = g.BackgroundTheme.getCurrent();
      if (theme) {
        // Find background layer and set URL before DOM insertion
        const bgCurrent = container.querySelector('.intro-screen__bg--current');
        if (bgCurrent) {
          bgCurrent.style.backgroundImage = `url(${theme.url})`;
        }
        updateAnchors(theme.anchor);
      }
    }
    
    // Append to body if not already in DOM
    if (!container.parentNode) {
      document.body.appendChild(container);
      console.info('[IntroScreen] DOM appended to body');
    } else {
      // Container already in DOM, just update background if needed
      if (g.BackgroundTheme && typeof g.BackgroundTheme.getCurrent === 'function') {
        const theme = g.BackgroundTheme.getCurrent();
        if (theme) {
          setBackground(theme.url, true);
          updateAnchors(theme.anchor);
        }
      }
    }

    // Show with animation
    container.style.display = 'flex';
    
    // Trigger reflow for CSS animation
    void container.offsetWidth;
    
    container.classList.add('intro-screen--visible');
    isVisible = true;
    introScreenState.visible = true;

    // CRITICAL: Set global flag ONLY AFTER hub is fully visible in DOM
    // This ensures __bbHubShown accurately reflects hub visibility
    window.__bbHubShown = true;

    // Attach UI SFX after hub is visible
    afterIntroScreenVisible();

    console.info('[IntroScreen] Shown');

    // Emit telemetry for show complete
    if (window.Telemetry && typeof window.Telemetry.log === 'function') {
      window.Telemetry.log('intro_show_done', { flagSet: window.__bbHubShown });
    }
  }

  function hide() {
    // Idempotent guard - if already hidden, do nothing
    if (!introScreenState.visible && !isVisible) {
      console.info('[IntroScreen] Already hidden, ignoring hide() call');
      return;
    }

    if (!container) {
      console.info('[IntroScreen] Not initialized, ignoring hide() call');
      return;
    }

    console.info('[IntroScreen] Hiding...');
    
    // Emit telemetry for hide
    if (window.Telemetry && typeof window.Telemetry.log === 'function') {
      window.Telemetry.log('intro_hide', { wasVisible: introScreenState.visible });
    }
    
    container.classList.remove('intro-screen--visible');
    
    // CRITICAL: Reset flags immediately when hiding starts
    // This allows hub to be shown again during restart
    window.__bbHubShown = false;
    introScreenState.visible = false;
    
    // Wait for fade-out animation before hiding
    setTimeout(() => {
      if (container) {
        container.style.display = 'none';
      }
      isVisible = false;
      
      console.info('[IntroScreen] Hidden');
    }, 400); // Match CSS transition duration
  }

  function init(options = {}) {
    // Emit telemetry for init start
    if (window.Telemetry && typeof window.Telemetry.log === 'function') {
      window.Telemetry.log('intro_init_start', {});
    }

    // Idempotence guard - prevent double initialization
    if (introScreenState.initialized || bus) {
      console.info('[IntroScreen] Already initialized, skipping duplicate init() call');
      
      // Emit telemetry for duplicate init attempt
      if (window.Telemetry && typeof window.Telemetry.log === 'function') {
        window.Telemetry.log('intro_init_duplicate', {});
      }
      
      return {
        show,
        showWithPreload,
        hide,
        reset,
        preloadBackground
      };
    }

    // Auto-bind bus if not provided (fallback to window.game.bus or window.game.bbGameBus)
    bus = options.bus || g.bus || g.bbGameBus;

    if (!bus) {
      console.error('[IntroScreen] No event bus provided or available');
      
      // Emit telemetry for missing bus
      if (window.Telemetry && typeof window.Telemetry.log === 'function') {
        window.Telemetry.log('intro_init_no_bus', {});
      }
      
      return {
        show,
        showWithPreload,
        hide,
        reset,
        preloadBackground
      };
    }

    // CRITICAL: Build DOM during init to ensure it's ready
    // This makes init idempotent and ensures DOM exists before showing
    if (!container) {
      container = buildDOM();
      console.info('[IntroScreen] DOM built during init');
    }

    // Listen for background theme changes
    bus.on('theme:bg-change', (data) => {
      console.info('[IntroScreen] Background theme changed:', data);
      if (isVisible) {
        setBackground(data.url);
        updateAnchors(data.anchor);
      }
      
      // Announce to screen readers
      announceThemeChange(data.reason);
    });
    
    // Listen for avatars:ready event (dispatched by avatar-queue.js after successful preload)
    // When avatars are ready (all loaded+decoded in strict mode), proceed to game
    window.addEventListener('avatars:ready', async (event) => {
      console.info('[IntroHub] avatars:ready event received', event.detail);
      
      // Hide overlay if visible
      const overlay = document.getElementById('avatarPreloadOverlay');
      if (overlay) {
        await hideAvatarPreloadOverlay(overlay);
      }
      
      // Clear preloading flag
      setAvatarsPreloadingState(false);
      
      // Proceed to game via StartupFlow.enterGame()
      if (g.StartupFlow && typeof g.StartupFlow.enterGame === 'function') {
        console.info('[IntroHub] Calling StartupFlow.enterGame() after avatars ready');
        g.StartupFlow.enterGame();
      } else if (g.enterGame && typeof g.enterGame === 'function') {
        console.info('[IntroHub] Calling enterGame() after avatars ready');
        g.enterGame();
      } else {
        console.warn('[IntroHub] enterGame() not available after avatars ready');
        // Fallback: use handleButtonAction
        handleButtonAction('intro:play', 'Play');
      }
    });

    console.info('[IntroScreen] Initialized');

    // Mark as initialized
    introScreenState.initialized = true;

    // Emit telemetry for init complete
    if (window.Telemetry && typeof window.Telemetry.log === 'function') {
      window.Telemetry.log('intro_init_done', { hasBus: !!bus });
    }

    return {
      show,
      showWithPreload,
      hide,
      reset,
      preloadBackground
    };
  }

  function announceThemeChange(reason) {
    // Create or update aria-live region for accessibility
    let announcer = document.getElementById('intro-screen-announcer');
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = 'intro-screen-announcer';
      announcer.className = 'sr-only';
      announcer.setAttribute('aria-live', 'polite');
      announcer.setAttribute('aria-atomic', 'true');
      document.body.appendChild(announcer);
    }
    
    announcer.textContent = `Background updated: ${reason}`;
  }

  /**
   * Reset the intro screen state for hard restarts.
   * Removes container, resets flags, and prepares for fresh initialization.
   * This is helpful for in-game restart paths that need to fully reset the hub.
   */
  function reset() {
    console.info('[IntroScreen] Resetting state...');
    
    // Emit telemetry for reset
    if (window.Telemetry && typeof window.Telemetry.log === 'function') {
      window.Telemetry.log('intro_reset', { wasVisible: introScreenState.visible, hadContainer: !!container });
    }
    
    // Hide first if visible
    if (isVisible && container) {
      container.classList.remove('intro-screen--visible');
      container.classList.remove('bg-ready');
      container.style.display = 'none';
    }
    
    // Remove any avatar preload overlay
    const avatarOverlay = document.getElementById('avatarPreloadOverlay');
    if (avatarOverlay) {
      avatarOverlay.remove();
    }
    
    // CRITICAL: Reset flags immediately during reset
    window.__bbHubShown = false;
    introScreenState.visible = false;
    introScreenState.animating = false;
    
    // Remove container from DOM
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    
    // Reset state (but keep bus reference for re-initialization)
    container = null;
    isVisible = false;
    currentBgLayer = 'current';
    playButtonClicked = false;
    bus = null; // Reset bus so init() can be called again
    introScreenState.initialized = false; // Allow re-initialization
    
    console.info('[IntroScreen] Reset complete');
  }

  // CRITICAL: Export API immediately and reliably to BOTH namespaces
  // This ensures StartupFlow can find it in either location
  const API = {
    init,
    show,
    showWithPreload,
    hide,
    reset,
    preloadBackground
  };

  // Export to window.game.IntroScreen (primary)
  window.game.IntroScreen = API;

  // Export to window.IntroScreen (alias for StartupFlow compatibility)
  window.IntroScreen = API;

  // Backward compatibility alias
  window.game.introScreen = API;
  
  console.info('[IntroScreen] API exported to window.game.IntroScreen and window.IntroScreen');

})();
