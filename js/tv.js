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

  // Set twist badge state
  let currentTwistWeek = null;
  let twistBadgeVisible = false;
  
  function setTwistBadge(twistType, visible){
    const badge = document.getElementById('twistBadge');
    if(!badge) return;
    
    const textEl = badge.querySelector('.twistBadgeText');
    
    if(visible && twistType){
      // Set simple one-liner badge text
      const twistNames = {
        'double': 'Double Eviction',
        'triple': 'Triple Eviction'
      };
      const twistName = twistNames[twistType] || twistType;
      
      if(textEl) textEl.textContent = twistName;
      
      // Ensure badge is visible with appropriate z-index for desktop visibility
      badge.style.display = 'flex';
      badge.style.zIndex = '20'; // Raise z-index to ensure visibility above other TV elements
      
      // Update tooltip if present
      let tooltip = badge.querySelector('.twistTooltip');
      if(!tooltip){
        tooltip = document.createElement('div');
        tooltip.className = 'twistTooltip';
        badge.appendChild(tooltip);
      }
      tooltip.textContent = `${twistName} active this week`;
      
      twistBadgeVisible = true;
      
      // Store current week for tracking
      const game = window.game || {};
      currentTwistWeek = game.week;
    } else {
      badge.style.display = 'none';
      twistBadgeVisible = false;
      currentTwistWeek = null;
    }
  }
  
  // Check if twist badge should be shown (called on phase changes and HUD updates)
  function updateTwistBadge(){
    const game = window.game || {};
    
    // Hide badge if week changed
    if(currentTwistWeek !== null && game.week !== currentTwistWeek){
      setTwistBadge(null, false);
      return;
    }
    
    // Check for active twist (supporting legacy flags for backward compatibility)
    const isDouble = game.__twistMode === 'double' || game.doubleEvictionWeek === true;
    const isTriple = game.__twistMode === 'triple' || game.tripleEvictionWeek === true;
    
    // Show badge if twist is active AND:
    // - EITHER the modal flow completed (badge flag is true)
    // - OR the modal implementation is not available (fallback for test/harness flows)
    const modalAvailable = typeof window.showEventModal === 'function';
    const badgeShownViaModal = game.__twistBadgeShown === true;
    const shouldShowBadge = badgeShownViaModal || (!modalAvailable && (isDouble || isTriple));
    
    if(isTriple && shouldShowBadge){
      setTwistBadge('triple', true);
    } else if(isDouble && shouldShowBadge){
      setTwistBadge('double', true);
    } else if(twistBadgeVisible){
      // Clear badge if no twist is active or badge not yet shown
      setTwistBadge(null, false);
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
      
      // Ensure twist badge element exists (defensive creation if missing from DOM)
      ensureTwistBadgeElement();
    }
  }
  
  // Defensively create twist badge element if it doesn't exist in the DOM
  function ensureTwistBadgeElement(){
    const tv = document.getElementById('tv');
    if(!tv) return;
    
    let badge = document.getElementById('twistBadge');
    if(!badge){
      console.info('[TV] Creating missing twist badge element');
      
      // Prefer tvOverlay container if present (prevents clipping on desktop)
      let container = document.getElementById('tvOverlay');
      if(!container){
        // Fallback to tvViewport
        container = tv.querySelector('.tvViewport');
      }
      
      if(!container){
        console.warn('[TV] Cannot create twist badge: no suitable container found');
        return;
      }
      
      // Create badge structure matching index.html
      badge = document.createElement('div');
      badge.id = 'twistBadge';
      badge.className = 'twistBadge';
      badge.setAttribute('aria-live', 'polite');
      badge.setAttribute('aria-label', 'Active twist');
      badge.style.display = 'none';
      
      const dot = document.createElement('span');
      dot.className = 'twistBadgeDot';
      
      const text = document.createElement('span');
      text.className = 'twistBadgeText';
      text.textContent = '';
      
      badge.appendChild(dot);
      badge.appendChild(text);
      container.appendChild(badge);
      
      console.info('[TV] Twist badge created in container:', container.id);
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
  TV.setTwistBadge = setTwistBadge;
  TV.updateTwistBadge = updateTwistBadge;
  TV.fitInViewport = fitInViewport;
  TV.fitCard = fitInViewport; // Alias
  g.TV = TV;

})(window);
