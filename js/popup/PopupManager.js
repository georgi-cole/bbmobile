// MODULE: popup/PopupManager.js
// Popup queue manager with one-at-a-time sequencing, portal rendering, and scroll lock

(function(global){
  'use strict';

  // Popup queue state
  const PopupQueue = {
    queue: [],
    currentPopup: null,
    isProcessing: false,
    scrollPosition: 0
  };

  // Lock body scroll when popup is shown
  function lockScroll(){
    PopupQueue.scrollPosition = window.pageYOffset;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${PopupQueue.scrollPosition}px`;
    document.body.style.width = '100%';
  }

  // Unlock body scroll when popup is hidden
  function unlockScroll(){
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('position');
    document.body.style.removeProperty('top');
    document.body.style.removeProperty('width');
    window.scrollTo(0, PopupQueue.scrollPosition);
  }

  // Get inter-popup delay with reduced-motion support
  function getInterPopupDelay(customDelay){
    const defaultDelay = 800;
    
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(prefersReducedMotion){
      return 100; // Minimal delay for reduced motion
    }
    
    // Use custom delay if provided
    if(typeof customDelay === 'number' && customDelay >= 0){
      return customDelay;
    }
    
    // Get delay from CSS variable or use default
    const cssDelay = getComputedStyle(document.documentElement)
      .getPropertyValue('--popup-inter-delay')
      .trim();
    
    if(cssDelay){
      const ms = parseInt(cssDelay);
      return isNaN(ms) ? defaultDelay : ms;
    }
    
    return defaultDelay;
  }

  // Get or create popup portal root
  function getPopupRoot(){
    let root = document.getElementById('popup-root');
    if(!root){
      root = document.createElement('div');
      root.id = 'popup-root';
      root.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 999998;
        pointer-events: none;
      `;
      document.body.appendChild(root);
    }
    return root;
  }

  // Process next popup in queue
  function processNextPopup(){
    if(PopupQueue.isProcessing || PopupQueue.queue.length === 0){
      return;
    }

    PopupQueue.isProcessing = true;
    const queueItem = PopupQueue.queue.shift();
    
    // Support both function-only and object with options
    const popupFn = typeof queueItem === 'function' ? queueItem : queueItem.fn;
    const options = typeof queueItem === 'object' ? queueItem : {};

    try {
      // Lock scroll
      lockScroll();

      // Create and show popup
      const popupElement = popupFn();
      
      if(!popupElement){
        console.warn('[PopupManager] Popup function returned null/undefined');
        PopupQueue.isProcessing = false;
        processNextPopup();
        return;
      }

      // Enable pointer events on popup
      popupElement.style.pointerEvents = 'auto';

      // Get portal root and append popup
      const root = getPopupRoot();
      root.appendChild(popupElement);

      // Store current popup
      PopupQueue.currentPopup = popupElement;
      
      // Store custom delay and metadata
      PopupQueue.currentPopup.__customDelay = options.interPopupDelay;
      PopupQueue.currentPopup.__popupType = options.popupType || 'unknown';
      PopupQueue.currentPopup.__shownAt = Date.now();

      // Log telemetry: popup_shown
      if(global.PopupTelemetry){
        global.PopupTelemetry.logPopupShown(options.popupType || 'unknown', {
          queueLength: PopupQueue.queue.length,
          id: options.id || popupElement.id
        });
      }

      // Wrap the original close function
      const originalClose = popupElement.__closePopup;
      if(originalClose){
        popupElement.__closePopup = function(dismissMethod){
          const timeShownMs = Date.now() - (PopupQueue.currentPopup?.__shownAt || Date.now());
          const popupType = PopupQueue.currentPopup?.__popupType || 'unknown';
          
          // Log telemetry: popup_dismissed
          if(global.PopupTelemetry){
            global.PopupTelemetry.logPopupDismissed(popupType, dismissMethod || 'programmatic', {
              timeShownMs
            });
          }
          
          // Call original close
          originalClose();
          
          // Unlock scroll
          unlockScroll();
          
          // Get custom delay from current popup
          const customDelay = PopupQueue.currentPopup?.__customDelay;
          
          // Clear current popup
          PopupQueue.currentPopup = null;
          
          // Wait for inter-popup delay, then process next
          setTimeout(() => {
            PopupQueue.isProcessing = false;
            processNextPopup();
          }, getInterPopupDelay(customDelay));
        };
      } else {
        console.warn('[PopupManager] Popup element missing __closePopup function');
        PopupQueue.isProcessing = false;
      }

    } catch(e){
      console.error('[PopupManager] Error processing popup:', e);
      PopupQueue.isProcessing = false;
      unlockScroll();
      processNextPopup();
    }
  }

  // Enqueue a popup (accepts a function that returns a popup element, or options object)
  function enqueuePopup(popupFnOrOptions, optionsArg){
    let popupFn, options = {};
    
    // Support both legacy (fn, options) and new (options with fn) signatures
    if(typeof popupFnOrOptions === 'function'){
      popupFn = popupFnOrOptions;
      if(typeof optionsArg === 'object' && optionsArg !== null){
        options = optionsArg;
      }
    } else if(typeof popupFnOrOptions === 'object' && popupFnOrOptions !== null){
      popupFn = popupFnOrOptions.fn;
      options = popupFnOrOptions;
    }
    
    if(typeof popupFn !== 'function'){
      console.error('[PopupManager] enqueuePopup requires a function');
      return;
    }

    PopupQueue.queue.push({
      fn: popupFn,
      interPopupDelay: options.interPopupDelay,
      popupType: options.popupType || 'unknown',
      id: options.id
    });
    
    // Log telemetry: popup_queue_depth
    if(global.PopupTelemetry){
      global.PopupTelemetry.logQueueDepth(PopupQueue.queue.length, {
        popupType: options.popupType || 'unknown',
        id: options.id
      });
    }
    
    processNextPopup();
  }

  // Close current popup
  function closeCurrentPopup(){
    if(PopupQueue.currentPopup && PopupQueue.currentPopup.__closePopup){
      PopupQueue.currentPopup.__closePopup();
    }
  }

  // Clear all queued popups
  function clearQueue(){
    PopupQueue.queue = [];
  }

  // Get queue length
  function getQueueLength(){
    return PopupQueue.queue.length;
  }

  // Check if popup is currently shown
  function isPopupShown(){
    return PopupQueue.currentPopup !== null;
  }

  // Show micro-confirmation toast
  function showConfirmationToast(message, duration = 2000){
    const toast = document.createElement('div');
    toast.className = 'social-confirmation-toast';
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      if(toast.parentNode){
        toast.parentNode.removeChild(toast);
      }
    }, duration);
  }

  /**
   * Centralized PopupManager.show(config) for standard game popups.
   *
   * @param {Object} config - Configuration object for the popup.
   * @param {'hoh'|'pov'|'nominations'|'eviction'|'social'|'live-vote'|'info'} [config.type='info'] - Type of popup.
   * @param {string} [config.title='Notification'] - Title of the popup card.
   * @param {string[]} [config.lines=[]] - Array of lines to display in the popup.
   * @param {number} [config.duration=0] - Auto-close duration in milliseconds (0 = manual close).
   * @param {'neutral'|'good'|'bad'|'live'|'noms'|'veto'|'evict'} [config.tone='neutral'] - Tone of the popup.
   * @param {string|null} [config.variant=null] - Variant for CSS class (e.g., 'hoh', 'pov', etc).
   * @param {boolean} [config.closeOnBackdrop=true] - Whether clicking the backdrop closes the popup.
   * @param {boolean} [config.closeOnEsc=true] - Whether pressing Escape closes the popup.
   * @param {boolean} [config.showCloseButton] - Whether to show a close button (default: true if duration is 0).
   * @param {function|null} [config.onClose=null] - Callback function to call when popup closes.
   * @returns {void}
   */
  function showStandardPopup(config = {}){
    const {
      type = 'info',
      title = 'Notification',
      lines = [],
      duration = 0,
      tone = 'neutral',
      variant = null,
      closeOnBackdrop = true,
      closeOnEsc = true,
      showCloseButton = duration === 0,
      onClose = null
    } = config;

    // Check feature flag
    const cfg = global.game?.cfg || {};
    if(!cfg.popup_refresh_enabled){
      // Fall back to legacy showCard
      if(typeof global.showCard === 'function'){
        global.showCard(title, lines, tone, duration || 4200, false);
      }
      return;
    }

    // Enqueue the popup
    enqueuePopup(() => {
      // Build body content from lines
      const bodyContent = lines.map(line => {
        const escapedLine = String(line)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
        return `<p style="margin: 0.5em 0;">${escapedLine}</p>`;
      }).join('');
      
      // Determine header styling based on tone
      let headerStyle = '';
      let themeClass = '';
      if(tone === 'good' || tone === 'winner'){
        headerStyle = 'background: var(--good); color: #0d151f;';
        themeClass = 'popup-theme-good';
      } else if(tone === 'bad' || tone === 'danger'){
        headerStyle = 'background: var(--bad); color: #fff;';
        themeClass = 'popup-theme-bad';
      } else if(tone === 'live'){
        headerStyle = 'background: var(--live); color: #fff;';
        themeClass = 'popup-theme-live';
      } else if(tone === 'noms'){
        headerStyle = 'background: var(--accent); color: #0d151f;';
        themeClass = 'popup-theme-noms';
      } else if(tone === 'veto'){
        headerStyle = 'background: var(--veto); color: #fff;';
        themeClass = 'popup-theme-veto';
      } else if(tone === 'evict'){
        headerStyle = 'background: var(--bad); color: #fff;';
        themeClass = 'popup-theme-evict';
      }
      
      // Build CSS class names: base + variant + theme
      let popupClass = 'popupCard';
      if(variant){
        popupClass += ' popupCard--' + variant;
      }
      if(themeClass){
        popupClass += ' ' + themeClass;
      }
      
      // Create popup
      const popup = global.createBasePopup({
        id: 'popup-' + type + '-' + Date.now(),
        headerText: title,
        bodyContent: bodyContent,
        footerContent: duration > 0 ? '' : '<button class="btn" onclick="PopupManager.close()">OK</button>',
        closeOnBackdrop: closeOnBackdrop,
        closeOnEsc: closeOnEsc,
        showCloseButton: showCloseButton,
        onClose: onClose,
        className: popupClass
      });
      
      // Apply custom header styling if tone specified
      if(headerStyle){
        const header = popup.querySelector('.base-popup-header');
        if(header){
          header.style.cssText += headerStyle;
        }
      }
      
      // Auto-close after duration
      if(duration > 0){
        setTimeout(() => {
          if(popup.__closePopup){
            popup.__closePopup('auto');
          }
        }, duration);
      }
      
      return popup;
    }, {
      popupType: type,
      id: 'popup-' + type + '-' + Date.now()
    });
  }

  // Context API for enqueue/close
  const PopupManagerContext = {
    enqueue: enqueuePopup,
    close: closeCurrentPopup,
    clearQueue: clearQueue,
    getQueueLength: getQueueLength,
    isPopupShown: isPopupShown,
    showConfirmationToast: showConfirmationToast,
    show: showStandardPopup  // New centralized show method
  };

  // Export to global
  global.PopupManager = PopupManagerContext;

})(window);
