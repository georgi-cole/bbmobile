/**
 * MODULE: vote-overlay-safe-dedupe.js
 * 
 * Purpose: Safe deduplication of Evict buttons in vote overlay
 * Ensures exactly one Evict button exists inside the TV panel after mount.
 * 
 * Safety rules:
 * 1. Never removes the only in-panel Evict button
 * 2. If no button exists in panel, moves an outside button into the panel
 * 3. Removes duplicate buttons only when safe to do so
 * 
 * This helper runs after overlay mount and prevents the dedupe routines
 * from accidentally deleting the only CTA button.
 */

(function(global) {
  'use strict';

  /**
   * Safe deduplication of Evict buttons.
   * Ensures exactly one button exists inside the TV panel.
   */
  function safeDedupeEvictButtons() {
    // Try to find panel in either intermission overlay or lv-overlay structure
    const panel = document.querySelector('#tv .tv-intermission-overlay .intermission-card-container') ||
                  document.querySelector('#tv .lv-overlay');
    
    if (!panel) {
      console.debug('[VoteOverlaySafeDedupe] No panel found, skipping dedupe');
      return;
    }

    // Search for all possible evict button class variations
    const allBtns = Array.from(document.querySelectorAll(
      '.lv-overlay__evict-btn, .evictBtn, .lv2-cta-btn, button[data-action="evict"]'
    ));
    
    if (allBtns.length === 0) {
      console.debug('[VoteOverlaySafeDedupe] No Evict buttons found at all');
      return;
    }

    const inPanel = allBtns.filter(btn => panel.contains(btn));
    let outsidePanel = allBtns.filter(btn => !panel.contains(btn));

    console.debug('[VoteOverlaySafeDedupe] Found buttons:', {
      total: allBtns.length,
      inPanel: inPanel.length,
      outsidePanel: outsidePanel.length
    });

    // CASE 1: No buttons in panel, but buttons exist outside
    // ACTION: Move the first outside button into the panel (safe recovery)
    if (inPanel.length === 0 && outsidePanel.length > 0) {
      const btnToMove = outsidePanel[0];
      
      // Find the best container within the panel:
      // Priority: CTA row > confirm container > panel root
      const ctaRow = panel.querySelector('.lv-overlay__cta-row');
      const confirmContainer = panel.querySelector('.lv-overlay__confirm-container');
      const targetContainer = ctaRow || confirmContainer || panel;
      
      console.info('[VoteOverlaySafeDedupe] ✓ Moving outside button into panel');
      targetContainer.appendChild(btnToMove);
      
      // Update outsidePanel array to exclude the moved button
      outsidePanel = outsidePanel.slice(1);
    } else if (inPanel.length > 1) {
      // CASE 2: Multiple buttons in panel
      // ACTION: Keep the first one, remove extras
      console.info('[VoteOverlaySafeDedupe] ✓ Removing duplicate in-panel buttons (keeping first)');
      inPanel.slice(1).forEach(btn => {
        console.debug('[VoteOverlaySafeDedupe]   - Removing duplicate:', btn);
        btn.remove();
      });
    }

    // CASE 3: Buttons exist outside the panel (and we have at least one inside)
    // ACTION: Remove all outside buttons (they're duplicates)
    if (outsidePanel.length > 0 && inPanel.length >= 1) {
      console.info('[VoteOverlaySafeDedupe] ✓ Removing outside panel buttons');
      outsidePanel.forEach(btn => {
        console.debug('[VoteOverlaySafeDedupe]   - Removing outside button:', btn);
        btn.remove();
      });
    }

    console.info('[VoteOverlaySafeDedupe] ✓ Dedupe complete');
  }

  /**
   * Wire up safe dedupe to event bus or fallback to DOM events.
   * Runs after overlay mount to ensure buttons are in place.
   */
  function wireSafeDedupe() {
    const bus = global?.game?.bus;
    
    const runDedupe = () => {
      // Use requestAnimationFrame to run after DOM updates
      requestAnimationFrame(() => {
        safeDedupeEvictButtons();
      });
    };

    // Wire to event bus if available
    if (bus && typeof bus.on === 'function') {
      bus.on('intermission:show', runDedupe);
      bus.on('vote:show', runDedupe);
      bus.on('vote:render', runDedupe);
      console.info('[VoteOverlaySafeDedupe] ✓ Wired to event bus');
    } else if (typeof MutationObserver !== 'undefined') {
      // Fallback: use MutationObserver to detect overlay mount
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            // Check if an overlay was added
            const addedNodes = Array.from(mutation.addedNodes);
            const hasOverlay = addedNodes.some(node => 
              node.classList?.contains('lv-overlay') ||
              node.classList?.contains('tv-intermission-overlay')
            );
            
            if (hasOverlay) {
              runDedupe();
            }
          }
        }
      });
      
      // Observe the TV viewport for overlay additions
      const tvViewport = document.querySelector('#tv .tvViewport') || document.querySelector('#tv');
      if (tvViewport) {
        observer.observe(tvViewport, {
          childList: true,
          subtree: true
        });
        console.info('[VoteOverlaySafeDedupe] ✓ Wired to MutationObserver (fallback)');
      }
    } else {
      // Final fallback: run on DOMContentLoaded
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runDedupe);
      } else {
        runDedupe();
      }
      console.info('[VoteOverlaySafeDedupe] ✓ Wired to DOMContentLoaded (fallback)');
    }
  }

  // Initialize on module load
  wireSafeDedupe();

  // Export public API
  global.VoteOverlaySafeDedupe = {
    safeDedupeEvictButtons,
    wireSafeDedupe
  };

})(window);
