// MODULE: livevote-overlay-fix.js
// Optional helper script for patching LiveVoteOverlay at runtime
// Provides layout-safe scroll and container mounting helpers
// Non-invasive design for easy testing and rollback

(function(global) {
  'use strict';

  const LiveVoteOverlayFix = {
    version: '1.0.0',
    description: 'Layout-pixel-safe centering and shared overlay mounting fix',
    
    /**
     * Layout-pixel-safe scroll to center function
     * Uses offsetLeft/offsetWidth/clientWidth instead of getBoundingClientRect()
     * to avoid transform/scale issues on mobile
     */
    scrollToNomineeCenter(carousel, track, targetNominee, immediate = false) {
      if (!carousel || !track || !targetNominee) return;

      // Use layout pixels (offsetLeft, offsetWidth, clientWidth) instead of
      // getBoundingClientRect() to avoid transform/scale issues on mobile
      const carouselWidth = carousel.clientWidth;
      const carouselCenter = carouselWidth / 2;
      
      // Nominee's position relative to track (layout pixels)
      const nomineeOffsetLeft = targetNominee.offsetLeft;
      const nomineeWidth = targetNominee.offsetWidth;
      const nomineeCenter = nomineeOffsetLeft + nomineeWidth / 2;
      
      // Calculate scroll position to center nominee in carousel
      const targetScrollLeft = nomineeCenter - carouselCenter;
      
      // Scroll the carousel to center the nominee
      carousel.scrollTo({
        left: targetScrollLeft,
        behavior: immediate ? 'auto' : 'smooth'
      });
    },
    
    /**
     * Get shared overlay container
     * Prefers TVContainer.getOrCreateTvOverlay() or #tvOverlay
     */
    getContainer() {
      // Try TVContainer helper if available
      if (global.TVContainer?.getOrCreateTvOverlay) {
        try {
          const tvContainer = global.TVContainer.getTvContainer?.() || 
                             document.querySelector('#tv') || 
                             document.body;
          const overlay = global.TVContainer.getOrCreateTvOverlay(tvContainer, 'tv-overlay-mount');
          if (overlay) {
            console.info('[LiveVoteOverlayFix] ✓ Using TVContainer.getOrCreateTvOverlay()');
            return overlay;
          }
        } catch (e) {
          console.warn('[LiveVoteOverlayFix] TVContainer.getOrCreateTvOverlay() failed:', e);
        }
      }
      
      // Fallback to #tvOverlay if it exists
      const tvOverlay = document.getElementById('tvOverlay');
      if (tvOverlay) {
        console.info('[LiveVoteOverlayFix] ✓ Using #tvOverlay');
        return tvOverlay;
      }
      
      // Last resort: use .tvViewport inside #tv
      const tvViewport = document.querySelector('#tv .tvViewport');
      if (tvViewport) {
        console.info('[LiveVoteOverlayFix] ⚠ Falling back to .tvViewport');
        return tvViewport;
      }
      
      // Final fallback: #tv or body
      console.warn('[LiveVoteOverlayFix] ⚠ Using #tv or body as last resort');
      return document.querySelector('#tv') || document.body;
    },
    
    /**
     * Toggle tvOverlay--interactive class to enable pointer events
     */
    enableInteractive() {
      const tvOverlay = document.getElementById('tvOverlay');
      if (tvOverlay) {
        tvOverlay.classList.add('tvOverlay--interactive');
        console.info('[LiveVoteOverlayFix] ✓ Enabled tvOverlay--interactive');
      }
    },
    
    disableInteractive() {
      const tvOverlay = document.getElementById('tvOverlay');
      if (tvOverlay) {
        tvOverlay.classList.remove('tvOverlay--interactive');
        console.info('[LiveVoteOverlayFix] ✓ Disabled tvOverlay--interactive');
      }
    },
    
    /**
     * Attempt to patch the global LiveVoteOverlay if it exists
     * This is non-invasive and won't break existing functionality
     */
    patchGlobalOverlay() {
      if (!global.LiveVoteOverlay) {
        console.warn('[LiveVoteOverlayFix] LiveVoteOverlay not found, skipping patch');
        return false;
      }
      
      console.info('[LiveVoteOverlayFix] Patching global LiveVoteOverlay...');
      
      // Store original show method
      const originalShow = global.LiveVoteOverlay.show;
      
      // Wrap show method to use our getContainer and enable interactive class
      global.LiveVoteOverlay.show = function(options = {}) {
        if (!options.container) {
          options.container = LiveVoteOverlayFix.getContainer();
        }
        LiveVoteOverlayFix.enableInteractive();
        return originalShow.call(this, options);
      };
      
      // Store original hide method
      const originalHide = global.LiveVoteOverlay.hide;
      
      // Wrap hide method to disable interactive class
      global.LiveVoteOverlay.hide = function() {
        LiveVoteOverlayFix.disableInteractive();
        return originalHide.call(this);
      };
      
      console.info('[LiveVoteOverlayFix] ✓ Patch applied successfully');
      return true;
    }
  };
  
  // Export to global namespace
  global.LiveVoteOverlayFix = LiveVoteOverlayFix;
  
  // Auto-patch if LiveVoteOverlay exists
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (global.LiveVoteOverlay) {
        LiveVoteOverlayFix.patchGlobalOverlay();
      }
    });
  } else {
    if (global.LiveVoteOverlay) {
      LiveVoteOverlayFix.patchGlobalOverlay();
    }
  }

})(window);
