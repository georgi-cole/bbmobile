// MODULE: theme-switcher.js
// Theme switcher system for Big Brother game
// Provides multiple house-inspired themes with dynamic switching

(function(global){
  'use strict';

  const THEME_STORAGE_KEY = 'bb_theme_preference';
  
  // Available themes - Modern stylish themes with diverse aesthetics
  const THEMES = {
    tvstudio: {
      name: 'TV Studio',
      description: 'Dark theme with neon accents, spotlight effects, and modern TV studio vibes'
    },
    modernhouse: {
      name: 'Modern Big Brother House',
      description: 'Light theme with glassmorphism, soft accents, and contemporary design'
    },
    midnight: {
      name: 'Midnight Glass',
      description: 'Original dark glassmorphism with blue/purple gradients and glass textures'
    },
    miami: {
      name: 'Miami Beach',
      description: 'Vibrant tropical theme with turquoise and coral colors'
    },
    cabin: {
      name: 'Wooden Cabin',
      description: 'Warm rustic theme with rich wood tones and cozy atmosphere'
    },
    starrynight: {
      name: 'Starry Night',
      description: 'Deep space theme with twinkling stars and cosmic feel'
    },
    rainbow: {
      name: 'Over the Rainbow',
      description: 'Vibrant multi-colored theme with playful rainbow gradients'
    },
    matrix: {
      name: 'The Matrix',
      description: 'Digital green code rain theme with cyberpunk aesthetics'
    },
    apartment: {
      name: 'Modern Apartment',
      description: 'Clean minimalist theme with warm neutrals and professional look'
    }
  };

  /**
   * Get the current active theme
   * @returns {string} Theme key (e.g., 'tvstudio', 'modernhouse')
   */
  function getCurrentTheme(){
    return document.body.getAttribute('data-theme') || 'tvstudio';
  }

  /**
   * Get the display name for a theme
   * @param {string} themeKey - Theme identifier
   * @returns {string} Theme display name or the key itself if not found
   */
  function getThemeName(themeKey){
    return (THEMES[themeKey] && THEMES[themeKey].name) ? THEMES[themeKey].name : themeKey;
  }

  /**
   * Apply a theme to the UI
   * @param {string} themeKey - Theme identifier (midnight, sunset, ocean, neon)
   */
  function applyTheme(themeKey){
    if(!THEMES[themeKey]){
      console.warn(`[theme-switcher] Unknown theme: ${themeKey}, falling back to tvstudio`);
      themeKey = 'tvstudio';
    }

    // Apply theme data attribute to body
    document.body.setAttribute('data-theme', themeKey);

    // Store preference
    try{
      localStorage.setItem(THEME_STORAGE_KEY, themeKey);
    }catch(e){
      console.warn('[theme-switcher] Failed to save theme preference:', e);
    }

    // Dispatch theme change event for other modules
    const event = new CustomEvent('themeChanged', { detail: { theme: themeKey } });
    document.dispatchEvent(event);

    console.log(`[theme-switcher] Applied theme: ${THEMES[themeKey].name}`);
  }

  /**
   * Load and apply saved theme preference
   */
  function loadSavedTheme(){
    try{
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if(saved && THEMES[saved]){
        applyTheme(saved);
        return saved;
      }
    }catch(e){
      console.warn('[theme-switcher] Failed to load theme preference:', e);
    }
    return 'tvstudio';
  }

  /**
   * Get list of all available themes
   * @returns {Object} Themes object with keys and metadata
   */
  function getAvailableThemes(){
    return THEMES;
  }

  /**
   * Initialize theme system
   */
  function init(){
    loadSavedTheme();
    wireThemeSelector();
    console.log('[theme-switcher] Initialized');
  }

  /**
   * Wire up theme selector in settings modal
   */
  function wireThemeSelector(){
    function attach(el){
      // Set current theme
      el.value = getCurrentTheme();

      // Listen for changes
      if(!el.__themeWired){
        el.__themeWired = true;
        el.addEventListener('change', function(){
          const theme = el.value;
          applyTheme(theme);
          if(typeof window.showNotification === 'function'){
            window.showNotification('Theme changed to ' + getThemeName(theme), 'ok');
          }
        });
      }
    }

    // If already in DOM, attach immediately
    const existing = document.getElementById('themeSelector');
    if(existing){
      attach(existing);
      return;
    }

    // Observe for late insertion of the settings modal / theme selector
    if('MutationObserver' in window){
      const obs = new MutationObserver(function(){
        const el = document.getElementById('themeSelector');
        if(el){
          try{ attach(el); } finally { obs.disconnect(); }
        }
      });
      try{
        obs.observe(document.body, { childList: true, subtree: true });
      }catch(e){
        // In rare cases document.body may not be ready; fallback silently
        document.addEventListener('DOMContentLoaded', function(){
          try{
            obs.observe(document.body, { childList: true, subtree: true });
          }catch(err){
            // Silently fail if observation still can't be set up
          }
        }, { once: true });
      }
    }
    // No warning if not found; it's valid for pages without settings modal
  }

  // Expose API
  global.ThemeSwitcher = {
    init: init,
    applyTheme: applyTheme,
    getCurrentTheme: getCurrentTheme,
    getThemeName: getThemeName,
    getAvailableThemes: getAvailableThemes,
    THEMES: THEMES
  };

  // Auto-initialize when DOM is ready
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, { once: true });
  }else{
    init();
  }

})(window);
