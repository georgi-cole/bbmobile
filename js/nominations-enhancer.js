// MODULE: nominations-enhancer.js
// Progressive enhancement for nominee speech cards on mobile
// Adds staggered reveal animations when visible on touch devices

(function(global) {
  'use strict';

  // Detect touch device
  const isTouchDevice = () => {
    return ('ontouchstart' in window) || 
           (navigator.maxTouchPoints > 0) || 
           (navigator.msMaxTouchPoints > 0);
  };

  // Detect mobile viewport (<= 768px)
  const isMobileViewport = () => {
    return window.innerWidth <= 768;
  };

  // Ensure container has data hooks
  function ensureDataHooks(container) {
    if (!container) return;
    
    // Add data hook to container if missing
    if (!container.hasAttribute('data-nom-speeches')) {
      container.setAttribute('data-nom-speeches', '');
    }

    // Add data hooks to cards if missing
    const cards = container.querySelectorAll('.nominee-reaction-card, [data-nom-speech-card]');
    cards.forEach(card => {
      if (!card.hasAttribute('data-nom-speech-card')) {
        card.setAttribute('data-nom-speech-card', '');
      }
    });
  }

  // Initialize stagger animation for a container
  function initStagger(container) {
    if (!container || !isTouchDevice() || !isMobileViewport()) {
      return; // Only activate on touch devices with mobile viewport
    }

    // Ensure data hooks are present
    ensureDataHooks(container);

    // Use IntersectionObserver to trigger when visible
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
          // Container is visible - trigger stagger
          entry.target.classList.add('stagger-ready');
          // Unobserve after triggering once
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: [0.2], // Trigger when 20% visible
      rootMargin: '0px'
    });

    observer.observe(container);
  }

  // Auto-initialize on DOM mutations (for dynamically added speech containers)
  function setupMutationObserver() {
    if (!isTouchDevice() || !isMobileViewport()) {
      return; // Only activate on touch devices with mobile viewport
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if added node is a speech container
            if (node.matches && node.matches('[data-nom-speeches], .nominee-reactions-container, .nominee-speeches, .nominations__speeches')) {
              initStagger(node);
            }
            // Check if container was added as child
            const containers = node.querySelectorAll && node.querySelectorAll('[data-nom-speeches], .nominee-reactions-container, .nominee-speeches, .nominations__speeches');
            if (containers && containers.length > 0) {
              containers.forEach(container => initStagger(container));
            }
          }
        });
      });
    });

    // Observe the TV overlay and main panel for nominee speech containers
    const tvOverlay = document.getElementById('tvOverlay');
    const panel = document.getElementById('panel');
    
    if (tvOverlay) {
      observer.observe(tvOverlay, { childList: true, subtree: true });
    }
    if (panel) {
      observer.observe(panel, { childList: true, subtree: true });
    }
  }

  // Initialize on page load
  function init() {
    // Setup mutation observer for dynamic content
    setupMutationObserver();

    // Initialize any existing containers
    const containers = document.querySelectorAll('[data-nom-speeches], .nominee-reactions-container, .nominee-speeches, .nominations__speeches');
    containers.forEach(container => initStagger(container));
  }

  // Expose public API
  global.initNomineeStagger = initStagger;

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already loaded, init immediately
    init();
  }

})(window);
