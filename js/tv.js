// MODULE: tv.js
// Dynamic content resizing inside TV viewport using ResizeObserver

(function(g){
  'use strict';

  const TV = g.TV || (g.TV = {});

  let resizeObserver = null;
  let liveBadgeVisible = false;

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

  // Manually trigger resize check
  function resize(){
    const viewport = document.querySelector('.tvViewport');
    if(viewport){
      adjustContentScale(viewport);
    }
  }

  // Set LIVE badge visibility
  function setLiveBadge(visible){
    liveBadgeVisible = visible;
    const badge = document.getElementById('liveBadge');
    if(badge){
      badge.style.display = visible ? 'block' : 'none';
    }
  }

  // Initialize on DOM ready
  function init(){
    const tv = document.getElementById('tv');
    if(tv){
      initFit(tv);
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
  g.TV = TV;

})(window);
