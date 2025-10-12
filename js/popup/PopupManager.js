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
  function getInterPopupDelay(){
    const defaultDelay = 800;
    
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(prefersReducedMotion){
      return 100; // Minimal delay for reduced motion
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
    const popupFn = PopupQueue.queue.shift();

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

      // Wrap the original close function
      const originalClose = popupElement.__closePopup;
      if(originalClose){
        popupElement.__closePopup = function(){
          // Call original close
          originalClose();
          
          // Unlock scroll
          unlockScroll();
          
          // Clear current popup
          PopupQueue.currentPopup = null;
          
          // Wait for inter-popup delay, then process next
          setTimeout(() => {
            PopupQueue.isProcessing = false;
            processNextPopup();
          }, getInterPopupDelay());
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

  // Enqueue a popup (accepts a function that returns a popup element)
  function enqueuePopup(popupFn){
    if(typeof popupFn !== 'function'){
      console.error('[PopupManager] enqueuePopup requires a function');
      return;
    }

    PopupQueue.queue.push(popupFn);
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

  // Context API for enqueue/close
  const PopupManagerContext = {
    enqueue: enqueuePopup,
    close: closeCurrentPopup,
    clearQueue: clearQueue,
    getQueueLength: getQueueLength,
    isPopupShown: isPopupShown
  };

  // Export to global
  global.PopupManager = PopupManagerContext;

})(window);
