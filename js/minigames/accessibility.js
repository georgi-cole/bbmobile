// MODULE: minigames/accessibility.js
// Accessibility utilities for minigames
// Provides ARIA roles, focus management, keyboard navigation, and reduced motion

(function(g){
  'use strict';

  // Track focus trap state
  let activeFocusTrap = null;
  let reducedMotionEnabled = false;

  /**
   * Check if user prefers reduced motion
   * @returns {boolean} True if reduced motion is preferred
   */
  function prefersReducedMotion(){
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches || reducedMotionEnabled;
  }

  /**
   * Enable/disable reduced motion mode
   * @param {boolean} enabled - Whether to enable reduced motion
   */
  function setReducedMotion(enabled){
    reducedMotionEnabled = enabled;
    
    if(enabled){
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.classList.remove('reduced-motion');
    }
    
    console.info(`[Accessibility] Reduced motion: ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Apply ARIA attributes to an element
   * @param {HTMLElement} element - Target element
   * @param {Object} attrs - ARIA attributes
   */
  function applyAria(element, attrs){
    for(const [key, value] of Object.entries(attrs)){
      if(value === null || value === undefined){
        element.removeAttribute(key);
      } else {
        element.setAttribute(key, value);
      }
    }
  }

  /**
   * Make an element accessible as a button
   * @param {HTMLElement} element - Target element
   * @param {Object} options - Accessibility options
   */
  function makeAccessibleButton(element, options = {}){
    const {
      label = null,
      pressed = null,
      disabled = false,
      describedBy = null
    } = options;

    applyAria(element, {
      'role': 'button',
      'tabindex': disabled ? '-1' : '0',
      'aria-label': label,
      'aria-pressed': pressed !== null ? pressed.toString() : null,
      'aria-disabled': disabled ? 'true' : null,
      'aria-describedby': describedBy
    });

    // Add keyboard support
    if(!disabled){
      element.addEventListener('keydown', (e) => {
        if(e.key === 'Enter' || e.key === ' '){
          e.preventDefault();
          element.click();
        }
      });
    }
  }

  /**
   * Create an accessible container for a minigame
   * @param {Object} options - Container options
   * @returns {HTMLElement} Accessible container
   */
  function createAccessibleContainer(options = {}){
    const {
      label = 'Minigame',
      description = null,
      live = false
    } = options;

    const container = document.createElement('div');
    
    applyAria(container, {
      'role': live ? 'region' : 'group',
      'aria-label': label,
      'aria-describedby': description ? `${label}-desc` : null,
      'aria-live': live ? 'polite' : null,
      'aria-atomic': live ? 'true' : null
    });

    if(description){
      const descEl = document.createElement('div');
      descEl.id = `${label}-desc`;
      descEl.className = 'sr-only';
      descEl.textContent = description;
      container.appendChild(descEl);
    }

    return container;
  }

  /**
   * Create screen reader only text
   * @param {string} text - Text content
   * @returns {HTMLElement} SR-only element
   */
  function createSROnly(text){
    const el = document.createElement('span');
    el.className = 'sr-only';
    el.textContent = text;
    return el;
  }

  /**
   * Announce message to screen readers
   * @param {string} message - Message to announce
   * @param {string} priority - 'polite' or 'assertive'
   */
  function announceToSR(message, priority = 'polite'){
    let announcer = document.getElementById('sr-announcer');
    
    if(!announcer){
      announcer = document.createElement('div');
      announcer.id = 'sr-announcer';
      announcer.className = 'sr-only';
      announcer.setAttribute('aria-live', priority);
      announcer.setAttribute('aria-atomic', 'true');
      document.body.appendChild(announcer);
    }

    // Clear and update
    announcer.textContent = '';
    setTimeout(() => {
      announcer.textContent = message;
    }, 100);
  }

  /**
   * Create a focus trap for modal/popup
   * @param {HTMLElement} container - Container to trap focus within
   * @returns {Function} Cleanup function
   */
  function createFocusTrap(container){
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if(focusableElements.length === 0){
      return () => {};
    }

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // Save previously focused element
    const previouslyFocused = document.activeElement;

    // Focus first element
    firstFocusable.focus();

    const trapFocus = (e) => {
      if(e.key !== 'Tab') return;

      if(e.shiftKey){
        // Shift + Tab
        if(document.activeElement === firstFocusable){
          e.preventDefault();
          lastFocusable.focus();
        }
      } else {
        // Tab
        if(document.activeElement === lastFocusable){
          e.preventDefault();
          firstFocusable.focus();
        }
      }
    };

    container.addEventListener('keydown', trapFocus);

    activeFocusTrap = {
      container,
      previouslyFocused,
      cleanup: () => {
        container.removeEventListener('keydown', trapFocus);
        if(previouslyFocused && typeof previouslyFocused.focus === 'function'){
          previouslyFocused.focus();
        }
        activeFocusTrap = null;
      }
    };

    return activeFocusTrap.cleanup;
  }

  /**
   * Release active focus trap
   */
  function releaseFocusTrap(){
    if(activeFocusTrap && activeFocusTrap.cleanup){
      activeFocusTrap.cleanup();
    }
  }

  /**
   * Add keyboard navigation to a list of elements
   * @param {Array<HTMLElement>} elements - Elements to navigate
   * @param {Object} options - Navigation options
   */
  function addKeyboardNav(elements, options = {}){
    const {
      orientation = 'vertical', // 'vertical' or 'horizontal'
      wrap = true,
      onSelect = null
    } = options;

    let currentIndex = 0;

    const keys = orientation === 'vertical' ? 
      { prev: 'ArrowUp', next: 'ArrowDown' } : 
      { prev: 'ArrowLeft', next: 'ArrowRight' };

    elements.forEach((el, index) => {
      el.setAttribute('tabindex', index === 0 ? '0' : '-1');
      
      el.addEventListener('keydown', (e) => {
        let newIndex = currentIndex;

        if(e.key === keys.next){
          e.preventDefault();
          newIndex = currentIndex + 1;
          if(newIndex >= elements.length){
            newIndex = wrap ? 0 : elements.length - 1;
          }
        } else if(e.key === keys.prev){
          e.preventDefault();
          newIndex = currentIndex - 1;
          if(newIndex < 0){
            newIndex = wrap ? elements.length - 1 : 0;
          }
        } else if(e.key === 'Home'){
          e.preventDefault();
          newIndex = 0;
        } else if(e.key === 'End'){
          e.preventDefault();
          newIndex = elements.length - 1;
        } else if(e.key === 'Enter' || e.key === ' '){
          e.preventDefault();
          if(onSelect){
            onSelect(elements[currentIndex], currentIndex);
          }
          return;
        }

        if(newIndex !== currentIndex){
          elements[currentIndex].setAttribute('tabindex', '-1');
          elements[newIndex].setAttribute('tabindex', '0');
          elements[newIndex].focus();
          currentIndex = newIndex;
        }
      });

      el.addEventListener('focus', () => {
        currentIndex = index;
      });
    });
  }

  /**
   * Create skip link for minigame
   * @param {HTMLElement} container - Minigame container
   * @param {Function} onSkip - Skip callback
   * @returns {HTMLElement} Skip link element
   */
  function createSkipLink(container, onSkip){
    const skipLink = document.createElement('a');
    skipLink.href = '#';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Skip minigame';
    
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 0;
      background: #4a90e2;
      color: white;
      padding: 8px 16px;
      text-decoration: none;
      border-radius: 4px;
      z-index: 1000;
      transition: top 0.2s;
    `;

    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '8px';
    });

    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });

    skipLink.addEventListener('click', (e) => {
      e.preventDefault();
      onSkip();
    });

    container.style.position = 'relative';
    container.insertBefore(skipLink, container.firstChild);

    return skipLink;
  }

  /**
   * Apply mobile-friendly touch targets
   * @param {HTMLElement} element - Target element
   * @param {number} minSize - Minimum size in pixels (default 44)
   */
  function applyTouchTarget(element, minSize = 44){
    const rect = element.getBoundingClientRect();
    
    if(rect.width < minSize || rect.height < minSize){
      // Add padding to meet minimum
      const paddingNeeded = Math.max(0, (minSize - Math.min(rect.width, rect.height)) / 2);
      element.style.padding = `${paddingNeeded}px`;
      element.style.minWidth = `${minSize}px`;
      element.style.minHeight = `${minSize}px`;
    }
  }

  /**
   * Add high contrast mode detection
   * @param {Function} callback - Called when contrast mode changes
   * @returns {Function} Cleanup function
   */
  function watchContrastMode(callback){
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    
    const handler = (e) => {
      callback(e.matches);
    };

    // Check initial state
    callback(mediaQuery.matches);

    // Watch for changes
    if(mediaQuery.addEventListener){
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      // Legacy support
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }

  /**
   * Create accessible timer display
   * @param {HTMLElement} container - Container element
   * @param {Object} options - Timer options
   * @returns {Object} Timer controls
   */
  function createAccessibleTimer(container, options = {}){
    const {
      initialTime = 0,
      format = 'seconds',
      label = 'Timer',
      announceInterval = 10000 // Announce every 10 seconds
    } = options;

    const timerEl = document.createElement('div');
    timerEl.setAttribute('role', 'timer');
    timerEl.setAttribute('aria-label', label);
    timerEl.setAttribute('aria-live', 'off'); // We'll announce manually
    container.appendChild(timerEl);

    let currentTime = initialTime;
    let lastAnnounce = 0;

    const update = (time) => {
      currentTime = time;
      
      const formatted = format === 'seconds' ? 
        `${(time / 1000).toFixed(1)}s` : 
        `${time}ms`;
      
      timerEl.textContent = formatted;

      // Announce at intervals for screen readers
      if(time - lastAnnounce >= announceInterval){
        announceToSR(`${label}: ${formatted}`, 'polite');
        lastAnnounce = time;
      }
    };

    return {
      element: timerEl,
      update,
      announce: () => announceToSR(`${label}: ${timerEl.textContent}`, 'polite')
    };
  }

  // Add CSS for screen reader only content
  const style = document.createElement('style');
  style.textContent = `
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }

    /* Reduced motion styles */
    .reduced-motion *,
    .reduced-motion *::before,
    .reduced-motion *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }

    /* Skip link styles */
    .skip-link:focus {
      outline: 2px solid currentColor;
      outline-offset: 2px;
    }
  `;
  document.head.appendChild(style);

  // Watch for reduced motion preference changes
  const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const handleMotionChange = (e) => {
    if(e.matches && !reducedMotionEnabled){
      setReducedMotion(true);
      console.info('[Accessibility] System reduced motion detected');
    }
  };

  if(motionMediaQuery.addEventListener){
    motionMediaQuery.addEventListener('change', handleMotionChange);
  } else {
    motionMediaQuery.addListener(handleMotionChange);
  }

  // Check initial state
  if(motionMediaQuery.matches){
    setReducedMotion(true);
  }

  // Export API
  g.MinigameAccessibility = {
    // Motion
    prefersReducedMotion,
    setReducedMotion,
    
    // ARIA
    applyAria,
    makeAccessibleButton,
    createAccessibleContainer,
    createSROnly,
    announceToSR,
    
    // Focus management
    createFocusTrap,
    releaseFocusTrap,
    
    // Navigation
    addKeyboardNav,
    createSkipLink,
    
    // Mobile
    applyTouchTarget,
    
    // Utilities
    watchContrastMode,
    createAccessibleTimer
  };

  console.info('[MinigameAccessibility] Module loaded');

})(window);
