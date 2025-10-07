// MODULE: theme-switcher.js
// Theme switcher system for Big Brother game
// Provides multiple house-inspired themes with dynamic switching

(function(global){
  'use strict';

  const THEME_STORAGE_KEY = 'bb_theme_preference';
  
  // Available themes
  const THEMES = {
    classic: {
      name: 'Classic',
      description: 'Original Big Brother dark blue theme'
    },
    wooden: {
      name: 'Wooden House',
      description: 'Warm cabin vibes with wood grain texture'
    },
    studio: {
      name: 'TV Studio',
      description: 'Bright professional broadcast look'
    },
    modern: {
      name: 'Modern House',
      description: 'Sleek minimalist with fiber texture'
    }
  };

  /**
   * Get the current active theme
   * @returns {string} Theme key (e.g., 'classic', 'wooden')
   */
  function getCurrentTheme(){
    return document.body.getAttribute('data-theme') || 'classic';
  }

  /**
   * Apply a theme to the UI
   * @param {string} themeKey - Theme identifier (classic, wooden, studio, modern)
   */
  function applyTheme(themeKey){
    if(!THEMES[themeKey]){
      console.warn(`[theme-switcher] Unknown theme: ${themeKey}, falling back to classic`);
      themeKey = 'classic';
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
    return 'classic';
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
    // Wait for DOM to be ready and settings modal to exist
    const themeSelector = document.getElementById('themeSelector');
    if(!themeSelector){
      // Retry after a short delay if element not found yet
      setTimeout(wireThemeSelector, 100);
      return;
    }

    // Set current theme
    themeSelector.value = getCurrentTheme();

    // Listen for changes
    if(!themeSelector.__themeWired){
      themeSelector.__themeWired = true;
      themeSelector.addEventListener('change', function(){
        const theme = themeSelector.value;
        applyTheme(theme);
        
        // Show notification if available
        if(typeof window.showNotification === 'function'){
          window.showNotification('Theme changed to ' + THEMES[theme].name, 'ok');
        }
      });
    }
  }

  // Expose API
  global.ThemeSwitcher = {
    init: init,
    applyTheme: applyTheme,
    getCurrentTheme: getCurrentTheme,
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
