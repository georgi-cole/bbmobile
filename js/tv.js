// MODULE: tv.js
// Dynamic content resizing inside TV viewport using ResizeObserver
// Added: fitInViewport helper for social/event cards with debounced resize

(function(g){
  'use strict';

  const TV = g.TV || (g.TV = {});

  let resizeObserver = null;
  let liveBadgeVisible = false;
  let resizeDebounceTimer = null;

  // Initialize fit/scale engine for TV viewport
  function initFit(rootEl){
    if(!rootEl) return;

    const viewport = document.querySelector('.tvViewport');
    if(!viewport) return;

    // Create ResizeObserver to watch viewport size changes
    if(!resizeObserver && typeof ResizeObserver !== 'undefined'){
      resizeObserver = new ResizeObserver(entries => {
        for(const entry of entries){
          adjustContentScale(entry.target);
        }
      });
      resizeObserver.observe(viewport);
    }
  }

  // Adjust content scale to fit within viewport
  function adjustContentScale(viewport){
    if(!viewport) return;

    // Get viewport dimensions
    const viewportRect = viewport.getBoundingClientRect();
    const viewportWidth = viewportRect.width;
    const viewportHeight = viewportRect.height;

    if(viewportWidth <= 0 || viewportHeight <= 0) return;

    // Find content that needs scaling (cards, overlays, etc.)
    const content = viewport.querySelectorAll('.revealCard, .minigame-host, #tvNow');
    
    content.forEach(el => {
      // Reset any previous scale
      el.style.transform = '';
      
      // Measure natural size
      const rect = el.getBoundingClientRect();
      const contentWidth = rect.width;
      const contentHeight = rect.height;

      // Calculate scale factors
      const scaleX = viewportWidth / contentWidth;
      const scaleY = viewportHeight / contentHeight;
      
      // Use smaller scale to fit both dimensions
      const scale = Math.min(scaleX, scaleY, 1); // Never scale up, only down

      // Apply scale if needed
      if(scale < 0.95){
        el.style.transformOrigin = 'center center';
        el.style.transform = `scale(${scale})`;
      }
    });
  }

  // Fit card in viewport helper (for social/event cards)
  function fitInViewport(el, viewportSel){
    if(!el) return;
    
    const viewport = viewportSel 
      ? document.querySelector(viewportSel)
      : document.querySelector('.tvViewport');
    
    if(!viewport) return;
    
    const viewportRect = viewport.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    
    const scaleX = viewportRect.width / elRect.width;
    const scaleY = viewportRect.height / elRect.height;
    const scale = Math.min(scaleX, scaleY, 1, 0.82); // Min scale 0.82
    
    if(scale < 0.98){
      el.style.transformOrigin = 'center center';
      el.style.transform = `scale(${scale})`;
    }
  }

  // Manually trigger resize check
  function resize(){
    const viewport = document.querySelector('.tvViewport');
    if(viewport){
      adjustContentScale(viewport);
    }
  }

  // Set LIVE badge visibility (only show during livevote phase)
  function setLiveBadge(visible){
    liveBadgeVisible = visible;
    const badge = document.getElementById('liveBadge');
    if(badge){
      badge.style.display = visible ? 'block' : 'none';
    }
  }

  // Debounced resize handler for orientation changes
  function setupResizeHandler(){
    const debouncedResize = () => {
      if(resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
      resizeDebounceTimer = setTimeout(() => {
        resize();
        // Re-fit any visible cards
        document.querySelectorAll('.revealCard, .decisionCard').forEach(el => {
          if(el.offsetParent !== null) fitInViewport(el);
        });
      }, 150);
    };
    
    window.addEventListener('resize', debouncedResize);
    window.addEventListener('orientationchange', debouncedResize);
  }

  // Initialize on DOM ready
  function init(){
    const tv = document.getElementById('tv');
    if(tv){
      initFit(tv);
      setupResizeHandler();
    }
  }

  // Auto-initialize
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

  // Exports
  TV.initFit = initFit;
  TV.resize = resize;
  TV.setLiveBadge = setLiveBadge;
  TV.fitInViewport = fitInViewport;
  TV.fitCard = fitInViewport; // Alias
  g.TV = TV;

})(window);
