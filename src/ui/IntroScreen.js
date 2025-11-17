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

  const FADE_DURATION = 600; // ms
  const PRELOAD_TIMEOUT = 1500; // ms - timeout for background preload
  const LOADING_BUFFER_THRESHOLD = 300; // ms - show loading spinner if preload exceeds this

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

    // Quick icons (top-right)
    const quickIcons = buildQuickIcons();
    
    // Main button column
    const buttonColumn = buildButtonColumn();

    // Optional chips (bottom-right)
    const chips = buildChips();

    content.appendChild(quickIcons);
    content.appendChild(buttonColumn);
    content.appendChild(chips);

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
      { id: 'intro-btn-rules', label: 'Rules', action: 'intro:open:rules' },
      { id: 'intro-btn-profile', label: 'Profile', action: 'intro:open:profile' },
      { id: 'intro-btn-leaderboard', label: 'Leaderboard', action: 'intro:open:leaderboard' },
      { id: 'intro-btn-credits', label: 'Credits', action: 'intro:open:credits' }
    ];

    buttons.forEach(({ id, label, action, primary }, index) => {
      const btn = document.createElement('button');
      btn.id = id;
      btn.className = primary ? 'intro-screen__btn intro-screen__btn--primary' : 'intro-screen__btn';
      btn.textContent = label;
      btn.setAttribute('aria-label', label);
      btn.style.setProperty('--stagger-index', index);

      btn.addEventListener('click', () => {
        console.info(`[IntroHub] action=${action} button="${label}"`);
        
        // Handle Play button specially with idempotence guard
        if (action === 'intro:play') {
          if (playButtonClicked) {
            console.warn('[IntroHub] Play button already clicked, ignoring duplicate click');
            return;
          }
          playButtonClicked = true;
          
          // Set global flag to indicate Play was pressed
          // This prevents Rules modal from showing after Play
          g.__bbPlayInitiated = true;
          console.info('[IntroHub] Set __bbPlayInitiated=true');
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

  function checkForSave() {
    try {
      const save = localStorage.getItem('bbGameState');
      return !!save;
    } catch {
      return false;
    }
  }

  // Helper for both music and sound toggles with retry logic
  function handleAudioToggle(type, btn) {
    const MAX_RETRIES = 10;
    const RETRY_DELAY = 150; // ms
    
    let enabled, methodName, icons;
    if (type === 'music') {
      methodName = 'toggleMusic';
      icons = { on: '🎵', off: '🔇' };
    } else if (type === 'sound') {
      methodName = 'toggleSound';
      icons = { on: '🔊', off: '🔇' };
    } else {
      console.warn('[IntroScreen] Unknown audio type:', type);
      return;
    }
    
    // Try to find audio subsystem with retry logic
    let retryCount = 0;
    
    const tryToggle = () => {
      if (g.game && g.game.audio && typeof g.game.audio[methodName] === 'function') {
        enabled = g.game.audio[methodName]();
        btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
        btn.textContent = enabled ? icons.on : icons.off;
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
        btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
        btn.textContent = enabled ? icons.on : icons.off;
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
    
    // Dispatch custom event to notify SFX module of sound toggle
    try {
      document.dispatchEvent(new CustomEvent('introHubSfx', { 
        detail: { enabled: btn.getAttribute('aria-pressed') === 'true' } 
      }));
    } catch(e) {
      // Ignore dispatch errors
    }
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
    
    // Try bus event FIRST (preferred method when bus is available)
    if (bus) {
      console.info(`[IntroHub] Emitting bus event: ${action}`);
      bus.emit(action, {});
      handled = true;
      return; // Early return - bus events are the primary mechanism
    }
    
    // Fallback: Map actions to global function names (for backward compatibility)
    const actionMap = {
      'intro:play': { fn: 'enterGame', obj: 'StartupFlow', method: 'enterGame' },
      'intro:open:rules': { fn: 'showRulesModal' },
      'intro:open:profile': { fn: 'showProfileModal', fallback: { obj: 'ProfileModal', method: 'open' } },
      'intro:open:settings': { fn: 'showSettingsModal', click: 'btnOpenSettings' },
      'intro:open:leaderboard': { fn: 'showLeaderboard', fallback: { obj: 'ProgressionUI', method: 'showLeaderboard' }, click: 'xpLeaderboardBadge' },
      'intro:open:credits': { fn: 'showCreditsModal', fallback2: 'showCredits' },
      'intro:open:help': { fn: 'showHelpModal', fallback2: 'showHelp', fallback3: 'showRulesModal' }
    };
    
    const mapping = actionMap[action];
    
    if (mapping) {
      // Try primary function
      if (mapping.fn && typeof g[mapping.fn] === 'function') {
        console.info(`[IntroHub] Calling global.${mapping.fn}()`);
        g[mapping.fn]();
        handled = true;
      } else if (mapping.obj && mapping.method && g[mapping.obj] && typeof g[mapping.obj][mapping.method] === 'function') {
        // Try object.method pattern
        console.info(`[IntroHub] Calling global.${mapping.obj}.${mapping.method}()`);
        g[mapping.obj][mapping.method]();
        handled = true;
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
   * @returns {Promise} Resolves when preload completes or times out
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
      const startTime = Date.now();

      const complete = () => {
        if (hasCompleted) return;
        hasCompleted = true;
        
        if (loadTimeout) {
          clearTimeout(loadTimeout);
        }
        
        const elapsed = Date.now() - startTime;
        console.info(`[IntroScreen] Background preload completed in ${elapsed}ms`);
        resolve(url);
      };

      img.onload = () => {
        // Use decode() for smoother rendering if available
        if (img.decode) {
          img.decode()
            .then(complete)
            .catch(() => {
              console.warn('[IntroScreen] Image decode failed, proceeding anyway');
              complete();
            });
        } else {
          complete();
        }
      };

      img.onerror = () => {
        console.warn('[IntroScreen] Background preload failed:', url);
        complete(); // Still proceed even if preload fails
      };

      // Timeout after PRELOAD_TIMEOUT to prevent blocking
      loadTimeout = setTimeout(() => {
        if (!hasCompleted) {
          console.warn(`[IntroScreen] Background preload timeout after ${PRELOAD_TIMEOUT}ms`);
          img.onload = null;
          img.onerror = null;
          complete();
        }
      }, PRELOAD_TIMEOUT);

      // Check if image is already cached
      if (img.complete) {
        complete();
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

    // Idempotence guard - check local state first
    if (isVisible) {
      console.info('[IntroScreen] Already visible, ignoring duplicate showWithPreload() call');
      
      // Emit telemetry for duplicate attempt
      if (window.Telemetry && typeof window.Telemetry.log === 'function') {
        window.Telemetry.log('intro_show_with_preload_duplicate', { isVisible: true });
      }
      
      return;
    }

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
  }

  // ===== PUBLIC API =====

  function show() {
    // Emit telemetry for show start
    if (window.Telemetry && typeof window.Telemetry.log === 'function') {
      window.Telemetry.log('intro_show_start', {});
    }

    // Idempotence guard - if already visible, do nothing
    if (isVisible) {
      console.info('[IntroScreen] Already visible, ignoring duplicate show() call');
      
      // Emit telemetry for duplicate show attempt
      if (window.Telemetry && typeof window.Telemetry.log === 'function') {
        window.Telemetry.log('intro_show_duplicate', { isVisible: true });
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
    if (!isVisible || !container) {
      console.info('[IntroScreen] Already hidden or not initialized, ignoring hide() call');
      return;
    }

    console.info('[IntroScreen] Hiding...');
    
    // Emit telemetry for hide
    if (window.Telemetry && typeof window.Telemetry.log === 'function') {
      window.Telemetry.log('intro_hide', { wasVisible: isVisible });
    }
    
    container.classList.remove('intro-screen--visible');
    
    // CRITICAL: Reset flag immediately when hiding starts
    // This allows hub to be shown again during restart
    window.__bbHubShown = false;
    
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
    if (bus) {
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

    console.info('[IntroScreen] Initialized');

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
      window.Telemetry.log('intro_reset', { wasVisible: isVisible, hadContainer: !!container });
    }
    
    // Hide first if visible
    if (isVisible && container) {
      container.classList.remove('intro-screen--visible');
      container.style.display = 'none';
    }
    
    // CRITICAL: Reset flag immediately during reset
    window.__bbHubShown = false;
    
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
