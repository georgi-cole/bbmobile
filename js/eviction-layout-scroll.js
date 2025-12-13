/**
 * MODULE: eviction-layout-scroll.js
 * 
 * Purpose: Provides minimal JS behavior for keeping the eviction action bar
 * visible when an avatar is selected. Uses scrollIntoView with 'nearest' to
 * ensure the button doesn't jump outside the overlay.
 * 
 * This module is designed to be small, decoupled from app state, and easily
 * removable/rewirable if needed.
 * 
 * Files Modified:
 * - Integrates with LiveVoteOverlay (.lv-overlay)
 * - Integrates with LV2 overlay (.lv2-overlay)
 */

(function(global) {
  'use strict';

  /**
   * Scroll the action bar (confirm container) into view within the overlay.
   * Uses { block: 'nearest' } to minimize scrolling and keep element in view
   * without jumping to the top or bottom.
   * 
   * @param {HTMLElement} overlayElement - The overlay container element
   */
  function scrollActionBarIntoView(overlayElement) {
    if (!overlayElement) return;
    
    // Try to find the confirm container / action bar
    const confirmContainer = overlayElement.querySelector('.lv-overlay__confirm-container');
    if (confirmContainer) {
      try {
        confirmContainer.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest',
          inline: 'nearest'
        });
      } catch (e) {
        // Fallback for older browsers
        confirmContainer.scrollIntoView(false);
      }
      return;
    }
    
    // Try LV2 overlay structure
    const ctaBar = overlayElement.querySelector('.lv2-cta-row');
    if (ctaBar) {
      try {
        ctaBar.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest',
          inline: 'nearest'
        });
      } catch (e) {
        ctaBar.scrollIntoView(false);
      }
      return;
    }
    
    // Try inline CTA button
    const inlineBtn = overlayElement.querySelector('.lv2-name-btn-selected');
    if (inlineBtn) {
      try {
        inlineBtn.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'nearest',
          inline: 'nearest'
        });
      } catch (e) {
        inlineBtn.scrollIntoView(false);
      }
    }
  }

  /**
   * Update the selected profile preview (image + name) within the selected panel.
   * This is called when a user taps an avatar.
   * 
   * @param {HTMLElement} overlayElement - The overlay container element
   * @param {Object} player - Player data { id, name, avatar }
   */
  function updateSelectedPreview(overlayElement, player) {
    if (!overlayElement || !player) return;
    
    // Try to find the status element
    const status = overlayElement.querySelector('.lv-overlay__status');
    if (status) {
      status.textContent = `${player.name} selected. Tap Evict to confirm.`;
    }
    
    // Scroll action bar into view
    scrollActionBarIntoView(overlayElement);
  }

  /**
   * Enable the Evict button after an avatar is selected.
   * Updates the button text and enables it.
   * 
   * @param {HTMLElement} overlayElement - The overlay container element
   * @param {Object} player - Player data { id, name }
   */
  function enableEvictButton(overlayElement, player) {
    if (!overlayElement) return;
    
    const evictBtn = overlayElement.querySelector('.lv-overlay__evict-btn');
    if (evictBtn) {
      evictBtn.disabled = false;
      evictBtn.setAttribute('aria-label', `Vote to evict ${player?.name || 'selected player'}`);
    }
    
    // Show the confirmation container
    const confirmContainer = overlayElement.querySelector('.lv-overlay__confirm-container');
    if (confirmContainer) {
      confirmContainer.style.display = 'flex';
    }
    
    // Scroll into view
    scrollActionBarIntoView(overlayElement);
  }

  /**
   * Handle avatar selection - combines preview update, button enable, and scroll
   * 
   * @param {HTMLElement} overlayElement - The overlay container element
   * @param {Object} player - Player data { id, name, avatar }
   */
  function onAvatarSelected(overlayElement, player) {
    updateSelectedPreview(overlayElement, player);
    enableEvictButton(overlayElement, player);
    scrollActionBarIntoView(overlayElement);
  }

  // Export public API
  global.EvictionLayoutScroll = {
    scrollActionBarIntoView,
    updateSelectedPreview,
    enableEvictButton,
    onAvatarSelected
  };

})(window);
