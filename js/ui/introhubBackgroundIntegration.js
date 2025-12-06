// MODULE: introhubBackgroundIntegration.js
// Integration shim between BackgroundManager and intro hub background selection
// Provides resolveIntroBackground(meta) that respects manager overrides and falls back to auto-selection

(function(g) {
  'use strict';

  const BackgroundManager = g.BackgroundManager || (g.game && g.game.BackgroundManager);
  
  // Placeholder list of available backgrounds (will be replaced with actual data)
  // In real usage, this should be populated from window.game.data.introBackgrounds
  const DEFAULT_BACKGROUNDS = [
    { id: 'day', label: 'Day', filename: 'daily-background.png' },
    { id: 'night', label: 'Night', filename: 'night-background.png' },
    { id: 'sunrise', label: 'Sunrise', filename: 'sunrise-background.png' },
    { id: 'sunset', label: 'Sunset', filename: 'sunset-background.png' },
    { id: 'rain', label: 'Rain', filename: 'rainy-background.png' },
    { id: 'snow', label: 'Snow', filename: 'night-snow-background.png' },
    { id: 'snowday', label: 'Snow Day', filename: 'snowday-background.png' },
    { id: 'thunderstorm', label: 'Thunderstorm', filename: 'thunderstorm-background.png' },
    { id: 'xmasDay', label: 'Christmas Day', filename: 'xmas-day-background.png' },
    { id: 'xmasEve', label: 'Christmas Eve', filename: 'xmas-eve-background.png' },
    { id: 'xmasyNight', label: 'Christmas Night', filename: 'xmasy-night-background.png' }
  ];

  let availableBackgrounds = DEFAULT_BACKGROUNDS;
  let isInitialized = false;

  // ===== AUTO RESOLVER (PLACEHOLDER) =====
  // This is a simplified version. In production, this should call the actual
  // BackgroundTheme logic or replicate its key determination logic.

  function autoResolveIntroBackground(meta) {
    // Placeholder auto-resolution logic
    // In real usage, this should call BackgroundTheme.getCurrent() or similar
    
    // Check if BackgroundTheme is available
    if (g.BackgroundTheme && typeof g.BackgroundTheme.getCurrent === 'function') {
      const current = g.BackgroundTheme.getCurrent();
      if (current && current.key) {
        return current.key;
      }
    }
    
    // Fallback: simple time-based logic
    const now = new Date();
    const hour = now.getHours();
    const month = now.getMonth(); // 0-indexed
    const day = now.getDate();
    
    // Holiday override (Dec 20 - Jan 1)
    if ((month === 11 && day >= 20) || (month === 0 && day <= 1)) {
      // Christmas period
      if (month === 11 && day === 24) {
        return 'xmasEve';
      } else if (month === 11 && day === 25) {
        return 'xmasDay';
      } else if (hour >= 20 || hour < 6) {
        return 'xmasyNight';
      } else {
        return 'xmasDay';
      }
    }
    
    // Time of day
    if (hour >= 5 && hour < 9) {
      return 'sunrise';
    } else if (hour >= 9 && hour < 17) {
      return 'day';
    } else if (hour >= 17 && hour < 20) {
      return 'sunset';
    } else {
      return 'night';
    }
  }

  // ===== PUBLIC API =====

  /**
   * Resolve the intro background based on manager overrides or auto-selection
   * @param {Object} meta - Optional metadata (e.g., { occasion: 'xmas' })
   * @returns {Object} - { id, url, filename }
   */
  function resolveIntroBackground(meta = {}) {
    if (!BackgroundManager) {
      console.warn('[IntroHubBackgroundIntegration] BackgroundManager not available, using auto resolver');
      const id = autoResolveIntroBackground(meta);
      return getBackgroundData(id);
    }
    
    const activeId = BackgroundManager.getActiveBackground(meta, autoResolveIntroBackground);
    return getBackgroundData(activeId);
  }

  /**
   * Get background data (URL, filename) for a given ID
   * @param {string} id - Background ID
   * @returns {Object} - { id, url, filename, label }
   */
  function getBackgroundData(id) {
    const bg = availableBackgrounds.find(b => b.id === id);
    if (!bg) {
      console.warn('[IntroHubBackgroundIntegration] Unknown background ID:', id, 'using fallback');
      const fallback = availableBackgrounds.find(b => b.id === 'day') || availableBackgrounds[0];
      return {
        id: fallback.id,
        url: `assets/skins/${fallback.filename}`,
        filename: fallback.filename,
        label: fallback.label
      };
    }
    
    return {
      id: bg.id,
      url: `assets/skins/${bg.filename}`,
      filename: bg.filename,
      label: bg.label
    };
  }

  /**
   * Apply the resolved background to the intro hub element
   * This is a helper function that can be called to update the background
   * @param {Object} meta - Optional metadata
   */
  function applyIntroBackground(meta = {}) {
    const resolved = resolveIntroBackground(meta);
    console.info('[IntroHubBackgroundIntegration] Applying background:', resolved);
    
    // Try to find intro hub background element
    // This could be .introhub-background, .intro-screen__bg, or similar
    const bgElements = [
      document.querySelector('.introhub-background'),
      document.querySelector('.intro-screen__bg--current'),
      document.querySelector('.intro-screen__bg')
    ];
    
    for (const el of bgElements) {
      if (el) {
        el.style.backgroundImage = `url(${resolved.url})`;
        console.info('[IntroHubBackgroundIntegration] Background applied to element:', el.className);
        break;
      }
    }
    
    // Also emit event for IntroScreen to handle via setBackground
    if (g.game && g.game.bus && typeof g.game.bus.emit === 'function') {
      g.game.bus.emit('theme:bg-change', {
        key: resolved.id,
        url: resolved.url,
        anchor: { left: '50vw', top: '50vh' },
        reason: 'backgroundManager override or auto'
      });
    }
  }

  /**
   * Initialize the integration
   * Sets available backgrounds and initializes BackgroundManager
   */
  async function init() {
    if (isInitialized) {
      console.warn('[IntroHubBackgroundIntegration] Already initialized');
      return;
    }
    
    // Try to get backgrounds from window.game.data.introBackgrounds
    if (g.game && g.game.data && Array.isArray(g.game.data.introBackgrounds)) {
      availableBackgrounds = g.game.data.introBackgrounds;
      console.info('[IntroHubBackgroundIntegration] Loaded backgrounds from game.data:', availableBackgrounds.length);
    } else {
      console.info('[IntroHubBackgroundIntegration] Using default backgrounds:', availableBackgrounds.length);
    }
    
    // Set available backgrounds in BackgroundManager
    if (BackgroundManager) {
      BackgroundManager.setAvailableBackgrounds(availableBackgrounds);
      console.info('[IntroHubBackgroundIntegration] BackgroundManager configured');
      
      // Load assets from manifest and populate UI
      if (typeof BackgroundManager.refreshAssetsAndPopulateUI === 'function') {
        try {
          const manifestBackgrounds = await BackgroundManager.refreshAssetsAndPopulateUI();
          if (manifestBackgrounds && manifestBackgrounds.length > 0) {
            availableBackgrounds = manifestBackgrounds;
            console.info('[IntroHubBackgroundIntegration] Loaded backgrounds from manifest:', manifestBackgrounds.length);
          }
        } catch (err) {
          console.warn('[IntroHubBackgroundIntegration] Failed to load manifest, using defaults:', err);
        }
      }
      
      // Initialize BackgroundManager
      if (typeof BackgroundManager.init === 'function') {
        BackgroundManager.init();
      }
    }
    
    // Listen for manager changes and reapply background
    window.addEventListener('bgmgr:changed', () => {
      console.info('[IntroHubBackgroundIntegration] Manager preferences changed, reapplying background');
      applyIntroBackground();
    });
    
    isInitialized = true;
    console.info('[IntroHubBackgroundIntegration] Initialized');
  }

  // ===== EXPORT =====

  const API = {
    init,
    resolveIntroBackground,
    applyIntroBackground,
    getBackgroundData,
    // Dev inspection
    getAvailableBackgrounds: () => availableBackgrounds
  };

  if (!g.game) g.game = {};
  g.game.IntroHubBackgroundIntegration = API;
  g.IntroHubBackgroundIntegration = API;

  console.info('[IntroHubBackgroundIntegration] Module loaded');

})(window);
