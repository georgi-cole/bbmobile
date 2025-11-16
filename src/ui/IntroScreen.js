// MODULE: IntroScreen.js
// Intro "hub" screen that appears after the Kolequant intro video
// Features:
// - Two-layer background system for smooth crossfades
// - Main button column (Play/Continue, Rules, Profile, Leaderboard, Settings, Credits)
// - Quick icons (top-right): Help, Music, Sound, Settings
// - Optional chips (bottom-right): Daily, News
// - Dynamic positioning based on BackgroundTheme anchor suggestions
// - Event-driven architecture using window.game.bus

(function(g) {
  'use strict';

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
        return true;
      } else if (g.audio && typeof g.audio[methodName] === 'function') {
        enabled = g.audio[methodName]();
        btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
        btn.textContent = enabled ? icons.on : icons.off;
        if (retryCount > 0) {
          console.info(`[IntroHub] ${type.charAt(0).toUpperCase() + type.slice(1)} toggle succeeded after ${retryCount} retries`);
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
    let handled = false;
    
    // Map actions to global function names
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
          el.click();
          handled = true;
        }
      }
    }
    
    // If not handled by direct calls, try bus event
    if (!handled && bus) {
      console.info(`[IntroHub] Emitting bus event: ${action}`);
      bus.emit(action, {});
      handled = true;
    }
    
    // If still not handled, dispatch CustomEvent as final fallback
    if (!handled) {
      console.warn(`[IntroHub] No handler found for ${action}, dispatching CustomEvent`);
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
    // Global idempotence guard - prevents duplicate shows from different code paths
    if (g.__bbHubShown) {
      console.info('[IntroScreen] Already visible (global flag), ignoring duplicate showWithPreload() call');
      return;
    }
    
    // Idempotence guard
    if (isVisible) {
      console.info('[IntroScreen] Already visible, ignoring duplicate showWithPreload() call');
      return;
    }

    // NOTE: Do NOT set __bbHubShown flag here - it should only be set AFTER the hub is successfully shown
    // This allows retries if DOM mounting fails

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

  // ===== PUBLIC API =====

  function show() {
    // Idempotence guard - if already visible, do nothing
    if (isVisible) {
      console.info('[IntroScreen] Already visible, ignoring duplicate show() call');
      return;
    }

    // Build DOM if not exists
    if (!container) {
      container = buildDOM();
      
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
      
      // Now append to body with background already set
      document.body.appendChild(container);
    } else {
      // Container already exists, just update background if needed
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

    // CRITICAL: Only set global flag AFTER hub is successfully shown and DOM is mounted
    // This ensures retries work if DOM mounting fails on first attempt
    g.__bbHubShown = true;

    console.info('[IntroScreen] Shown');
  }

  function hide() {
    if (!isVisible || !container) return;

    container.classList.remove('intro-screen--visible');
    
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
    // Idempotence guard - prevent double initialization
    if (bus) {
      console.info('[IntroScreen] Already initialized, skipping duplicate init() call');
      return {
        show,
        showWithPreload,
        hide,
        preloadBackground
      };
    }

    bus = options.bus || g.bbGameBus;

    if (!bus) {
      console.error('[IntroScreen] No event bus provided');
      return;
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

    return {
      show,
      showWithPreload,
      hide,
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

  // Export API
  if (!g.IntroScreen) {
    g.IntroScreen = {
      init,
      show,
      showWithPreload,
      hide,
      preloadBackground
    };
  }

})(window);
