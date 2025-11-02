/**
 * TV Background Fix (2025-11-02)
 * 
 * Disable faux viewport background whenever the TV container (#tv) has a real background.
 * Keeps background single-sourced on #tv as set by js/ui.tv-media.js.
 */
(function () {
  'use strict';

  /**
   * Check if TV element has a real background set
   * @param {HTMLElement} tvEl - The TV container element
   * @returns {boolean} True if TV has a real background
   */
  function hasRealTvBg(tvEl) {
    if (!tvEl) return false;
    
    // Check for hasTvBg class
    if (tvEl.classList.contains('hasTvBg')) return true;
    
    // Check for --tv-bg CSS variable with a url()
    const bg = tvEl.style.getPropertyValue('--tv-bg');
    return !!bg && bg.includes('url(');
  }

  /**
   * Apply the fix to ensure single-source background
   */
  function apply() {
    const tv = document.getElementById('tv');
    const viewport = tv ? tv.querySelector('.tvViewport') : null;
    
    if (!tv || !viewport) return;

    if (hasRealTvBg(tv)) {
      // TV has a real background, ensure viewport is transparent
      viewport.style.background = 'none';
      viewport.classList.add('no-faux-bg');
      
      // Remove legacy faux TV attribute if present
      viewport.removeAttribute('data-sm-faux-tv');
      
      // Ensure hasTvBg class is present on TV
      tv.classList.add('hasTvBg');
    }
  }

  // Apply fix on DOM ready
  document.addEventListener('DOMContentLoaded', apply);
  
  // Apply fix on window load (fallback)
  window.addEventListener('load', apply);

  // Watch for changes to TV element (style or class changes)
  // Set up observer after DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    const tvElement = document.getElementById('tv');
    if (tvElement) {
      const observer = new MutationObserver(apply);
      observer.observe(tvElement, {
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }
  });
})();
