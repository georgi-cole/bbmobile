/**
 * MODULE: vote-overlay-fixes.js
 * 
 * Purpose: Fixes for mobile vote UI alignment issues
 * - Ensures exactly one Evict button exists in TV panel
 * - Reparents avatar/carousel into TV panel after render
 * - Removes duplicate buttons safely
 * 
 * This module integrates with the vote/intermission lifecycle via the event bus.
 */

(function(global) {
  'use strict';

  /**
   * Removes duplicate Evict buttons, ensuring exactly one exists inside the TV panel.
   * Removes duplicates outside the panel only.
   * Updated to support both intermission overlay and lv-overlay structures.
   */
  function removeDuplicateEvictButtons() {
    // Try to find panel in either intermission overlay or lv-overlay structure
    const panel = document.querySelector('#tv .tv-intermission-overlay .intermission-card-container') ||
                  document.querySelector('#tv .lv-overlay');
    if (!panel) return;

    // Search for all possible evict button class variations
    const allBtns = Array.from(document.querySelectorAll('.lv-overlay__evict-btn, .evictBtn, .lv2-cta-btn'));
    const inPanel = allBtns.filter(btn => panel.contains(btn));
    let outsidePanel = allBtns.filter(btn => !panel.contains(btn));

    // If no buttons in panel, move the first outside button into panel
    if (inPanel.length === 0 && outsidePanel.length > 0) {
      const btnToMove = outsidePanel[0];
      // For lv-overlay, append to confirm container if it exists, else to panel root
      const confirmContainer = panel.querySelector('.lv-overlay__confirm-container');
      const ctaRow = panel.querySelector('.lv-overlay__cta-row');
      const targetContainer = ctaRow || confirmContainer || panel;
      targetContainer.appendChild(btnToMove);
      // Update outsidePanel array to exclude the moved button
      outsidePanel = outsidePanel.slice(1);
    } else if (inPanel.length > 1) {
      // If multiple buttons in panel, remove extras
      inPanel.slice(1).forEach(btn => btn.remove());
    }

    // Remove all remaining buttons outside the panel
    outsidePanel.forEach(btn => btn.remove());
  }

  /**
   * Mounts the vote stage (avatar/carousel) into the TV panel after render.
   * This ensures the avatar appears inside the TV overlay with the CTA elements.
   */
  function mountVoteStageIntoPanel() {
    const panel = document.querySelector('#tv .tv-intermission-overlay .intermission-card-container');
    const stage = panel?.querySelector('.voteStage');
    if (!panel || !stage) return;

    // Try to find the avatar/carousel root element
    // Check for multiple possible selectors used in the app
    const selectors = [
      '.selected-nominee',
      '.vote-carousel',
      '.big-avatar',
      '.lv-overlay__carousel',
      '.nominee-carousel'
    ];

    for (const selector of selectors) {
      const avatarRoot = document.querySelector(selector);
      if (avatarRoot && !stage.contains(avatarRoot)) {
        stage.appendChild(avatarRoot);
        console.info('[VoteOverlayFix] ✓ Mounted carousel into voteStage');
        break;
      }
    }
  }

  /**
   * Wire up the fix functions to the event bus lifecycle events.
   * Hooks into intermission:show and vote:show events if available.
   */
  function wireVoteOverlayFixes() {
    const bus = global?.game?.bus;
    
    const onShow = () => {
      requestAnimationFrame(() => {
        removeDuplicateEvictButtons(); // Clean up buttons first
        mountVoteStageIntoPanel();     // Then mount components
      });
    };

    if (bus && typeof bus.on === 'function') {
      // Wire up to event bus if available
      bus.on('intermission:show', onShow);
      bus.on('vote:show', onShow);
      console.info('[VoteOverlayFix] ✓ Wired to event bus');
    } else {
      // Fallback: run on DOMContentLoaded
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onShow);
      } else {
        // DOM already loaded, run immediately
        onShow();
      }
      console.info('[VoteOverlayFix] ✓ Wired to DOMContentLoaded (fallback)');
    }
  }

  // Initialize on module load
  wireVoteOverlayFixes();

  // Export public API
  global.VoteOverlayFix = {
    removeDuplicateEvictButtons,
    mountVoteStageIntoPanel,
    wireVoteOverlayFixes
  };

})(window);
