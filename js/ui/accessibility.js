/**
 * UI Accessibility Module
 * 
 * Enhances visibility and consistency of main menu UI elements on the intro/home hub.
 * - Detects and hides intro text block by matching content
 * - Applies consistent contrast styling to menu buttons
 * - Dynamically adjusts more-button (three-dots) color based on background luminance
 * - Uses MutationObserver to react to runtime theme/panel changes
 */

(function() {
  'use strict';

  // ============================
  // Configuration
  // ============================

  const CONFIG = {
    // Selectors for intro text elements to hide
    INTRO_TEXT_SELECTORS: [
      '.intro-screen__title-group',
      '.intro-screen__label',
      '.intro-screen__title',
      '.intro-screen__subtitle'
    ],
    
    // Text patterns to match for intro text (case-insensitive partial match)
    INTRO_TEXT_PATTERNS: [
      'Season Start',
      'Big Brother',
      'Configure your cast',
      'Week 1',
      'Setup'
    ],
    
    // Selectors for main menu buttons to apply contrast styling
    MENU_BUTTON_SELECTORS: [
      '.intro-screen__button',
      '.intro-screen__main-btn',
      'button[id*="intro"]',
      '.intro-screen__button-column button'
    ],
    
    // Selector for Play/Continue button (gets .bb-large modifier)
    PLAY_BUTTON_SELECTORS: [
      '#introButtonPlay',
      'button[aria-label*="Play"]',
      'button[aria-label*="Continue"]',
      '.intro-screen__button-column button:first-child'
    ],
    
    // Selector for the more/three-dots button
    MORE_BUTTON_SELECTORS: [
      '#actionMenuBtn',
      '.action-menu-button',
      'button[aria-label*="Actions"]',
      'button[title*="Actions"]'
    ],
    
    // Luminance threshold for determining light vs dark background
    LUMINANCE_THRESHOLD: 0.5,
    
    // Debounce delay for mutation observer (ms)
    MUTATION_DEBOUNCE_DELAY: 100,
    
    // Retry configuration
    INIT_RETRY_DELAY: 200,
    MAX_INIT_RETRIES: 20
  };

  // ============================
  // State
  // ============================

  const state = {
    initialized: false,
    observer: null,
    debounceTimer: null,
    retryCount: 0
  };

  // ============================
  // Utility Functions
  // ============================

  /**
   * Calculate relative luminance of a color
   * @param {string} color - RGB color string (e.g., "rgb(255, 255, 255)")
   * @returns {number} - Luminance value between 0 and 1
   */
  function calculateLuminance(color) {
    const rgb = color.match(/\d+/g);
    if (!rgb || rgb.length < 3) return 0.5; // Default to middle luminance
    
    const [r, g, b] = rgb.map(val => {
      const normalized = parseInt(val, 10) / 255;
      return normalized <= 0.03928
        ? normalized / 12.92
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Get computed background color of an element, walking up the DOM tree
   * @param {HTMLElement} element
   * @returns {string} - RGB color string
   */
  function getBackgroundColor(element) {
    let el = element;
    let maxDepth = 10;
    
    while (el && maxDepth > 0) {
      const bg = window.getComputedStyle(el).backgroundColor;
      
      // Check if background is not transparent
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        return bg;
      }
      
      el = el.parentElement;
      maxDepth--;
    }
    
    // Default to a middle-gray if no background found
    return 'rgb(128, 128, 128)';
  }

  /**
   * Check if background is light or dark based on luminance
   * @param {HTMLElement} element
   * @returns {boolean} - true if light, false if dark
   */
  function isLightBackground(element) {
    const bgColor = getBackgroundColor(element);
    const luminance = calculateLuminance(bgColor);
    return luminance > CONFIG.LUMINANCE_THRESHOLD;
  }

  // ============================
  // Core Functionality
  // ============================

  /**
   * Hide intro text elements that match configured patterns
   */
  function hideIntroText() {
    let hiddenCount = 0;
    
    CONFIG.INTRO_TEXT_SELECTORS.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      
      elements.forEach(el => {
        const text = el.textContent.trim();
        
        // Check if text matches any of the configured patterns
        const matchesPattern = CONFIG.INTRO_TEXT_PATTERNS.some(pattern => 
          text.toLowerCase().includes(pattern.toLowerCase())
        );
        
        if (matchesPattern && !el.classList.contains('bb-hidden-intro')) {
          el.classList.add('bb-hidden-intro');
          hiddenCount++;
          console.info('[UI Accessibility] Hidden intro text:', text.substring(0, 50));
        }
      });
    });
    
    if (hiddenCount > 0) {
      console.info(`[UI Accessibility] Hidden ${hiddenCount} intro text element(s)`);
    }
  }

  /**
   * Apply contrast styling to menu buttons
   */
  function applyContrastToButtons() {
    let styledCount = 0;
    
    // Apply to main menu buttons
    CONFIG.MENU_BUTTON_SELECTORS.forEach(selector => {
      const buttons = document.querySelectorAll(selector);
      
      buttons.forEach(btn => {
        if (!btn.classList.contains('bb-contrast-btn')) {
          btn.classList.add('bb-contrast-btn');
          styledCount++;
        }
      });
    });
    
    // Apply .bb-large modifier to Play/Continue button
    CONFIG.PLAY_BUTTON_SELECTORS.forEach(selector => {
      const playButtons = document.querySelectorAll(selector);
      
      playButtons.forEach(btn => {
        if (!btn.classList.contains('bb-contrast-btn')) {
          btn.classList.add('bb-contrast-btn');
          styledCount++;
        }
        if (!btn.classList.contains('bb-large')) {
          btn.classList.add('bb-large');
        }
      });
    });
    
    if (styledCount > 0) {
      console.info(`[UI Accessibility] Applied contrast styling to ${styledCount} button(s)`);
    }
  }

  /**
   * Update more-button color based on background luminance
   */
  function updateMoreButtonColor() {
    CONFIG.MORE_BUTTON_SELECTORS.forEach(selector => {
      const moreButtons = document.querySelectorAll(selector);
      
      moreButtons.forEach(btn => {
        // Add bb-more-btn class for styling
        if (!btn.classList.contains('bb-more-btn')) {
          btn.classList.add('bb-more-btn');
        }
        
        // Determine if background is light
        const isLight = isLightBackground(btn);
        
        // Apply appropriate color
        if (isLight) {
          // Dark icon for light background
          btn.style.color = '#1d1d1d';
          btn.classList.add('bb-contrast-btn--dark-icon');
          btn.classList.remove('bb-contrast-btn--light-icon');
        } else {
          // Light icon for dark background
          btn.style.color = '#f5f5f5';
          btn.classList.remove('bb-contrast-btn--dark-icon');
          btn.classList.add('bb-contrast-btn--light-icon');
        }
      });
    });
  }

  /**
   * Apply all accessibility enhancements
   */
  function applyEnhancements() {
    hideIntroText();
    applyContrastToButtons();
    updateMoreButtonColor();
  }

  /**
   * Debounced enhancement application
   */
  function debouncedEnhancements() {
    if (state.debounceTimer) {
      clearTimeout(state.debounceTimer);
    }
    
    state.debounceTimer = setTimeout(() => {
      applyEnhancements();
      state.debounceTimer = null;
    }, CONFIG.MUTATION_DEBOUNCE_DELAY);
  }

  /**
   * Setup MutationObserver to watch for DOM changes
   */
  function setupObserver() {
    // Don't setup observer multiple times
    if (state.observer) {
      return;
    }
    
    state.observer = new MutationObserver((mutations) => {
      // Check if relevant changes occurred
      const relevantChange = mutations.some(mutation => {
        // Check if added nodes include buttons or intro elements
        if (mutation.addedNodes.length > 0) return true;
        
        // Check if attributes changed on relevant elements
        if (mutation.type === 'attributes') {
          const target = mutation.target;
          if (target.matches && (
            target.matches('button') ||
            target.matches('[class*="intro"]') ||
            target.matches('[class*="compact-hud"]')
          )) {
            return true;
          }
        }
        
        return false;
      });
      
      if (relevantChange) {
        debouncedEnhancements();
      }
    });
    
    // Observe the entire document for changes
    state.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme']
    });
    
    console.info('[UI Accessibility] MutationObserver active');
  }

  /**
   * Initialize the accessibility module
   */
  function init() {
    if (state.initialized) {
      console.warn('[UI Accessibility] Already initialized');
      return;
    }
    
    console.info('[UI Accessibility] Initializing...');
    
    // Apply initial enhancements
    applyEnhancements();
    
    // Setup observer for dynamic changes
    setupObserver();
    
    state.initialized = true;
    console.info('[UI Accessibility] Initialized successfully');
  }

  /**
   * Retry initialization if DOM isn't ready
   */
  function initWithRetry() {
    // Check if key elements are available
    const hasIntroScreen = document.querySelector('#introScreen, .intro-screen');
    const hasButtons = document.querySelector('button');
    
    if (hasIntroScreen || hasButtons || state.retryCount >= CONFIG.MAX_INIT_RETRIES) {
      // DOM is ready or max retries reached, initialize
      init();
    } else {
      // Retry after delay
      state.retryCount++;
      console.info(`[UI Accessibility] DOM not ready, retrying... (${state.retryCount}/${CONFIG.MAX_INIT_RETRIES})`);
      setTimeout(initWithRetry, CONFIG.INIT_RETRY_DELAY);
    }
  }

  // ============================
  // Event Listeners
  // ============================

  /**
   * Listen for theme changes
   */
  function setupThemeChangeListener() {
    // Listen for custom theme change events
    window.addEventListener('bb:theme-changed', () => {
      console.info('[UI Accessibility] Theme changed, updating colors');
      updateMoreButtonColor();
    });
    
    // Also listen for background theme changes
    if (window.game && window.game.bus) {
      window.game.bus.on('backgroundTheme:changed', () => {
        console.info('[UI Accessibility] Background theme changed, updating colors');
        updateMoreButtonColor();
      });
    }
  }

  // ============================
  // Auto-Initialize
  // ============================

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initWithRetry();
      setupThemeChangeListener();
    });
  } else {
    // DOM already loaded
    initWithRetry();
    setupThemeChangeListener();
  }

  // ============================
  // Public API
  // ============================

  // Expose public API for manual control if needed
  const UIAccessibility = {
    init,
    applyEnhancements,
    hideIntroText,
    applyContrastToButtons,
    updateMoreButtonColor
  };

  // Expose to global scope
  window.UIAccessibility = UIAccessibility;

  console.info('[UI Accessibility] Module loaded');
})();
