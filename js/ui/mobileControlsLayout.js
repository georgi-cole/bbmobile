// MODULE: mobileControlsLayout.js
// Mobile UI Controls Layout Manager
//
// Purpose: Create hg-count-cluster grouping player pill, settings, and speaker buttons
//
// Mobile Layout (≤768px):
// 1. No topbar on mobile
// 2. In houseguests-header: "Houseguests" h1, then hg-count-cluster containing:
//    - Player pill (👥 16/16)
//    - Settings button (⚙️ settings-btn)
//    - Speaker button (🔊 speaker-chip)
// 3. In compact HUD below: phase pill, week pill, DR button, three dots menu
//    (settings and speaker buttons are hidden from compact HUD on mobile)
//
// Desktop Layout (>768px):
// - Original topbar visible with all buttons
// - No hg-count-cluster (player pill stays inline, settings/speaker in topbar)

(function(global) {
  'use strict';

  const MobileControlsLayout = global.MobileControlsLayout || (global.MobileControlsLayout = {});

  const MOBILE_BREAKPOINT = 768;
  let isMobile = false;
  let mobileControlsContainer = null;
  let settingsBtn = null;
  let soundBtn = null;
  let initialized = false;

  /**
   * Initialize mobile controls layout
   */
  function init() {
    if (initialized) {
      console.warn('[MobileControlsLayout] Already initialized');
      return;
    }

    console.info('[MobileControlsLayout] Initializing...');

    // Check initial viewport size
    checkViewport();

    // Listen for viewport changes
    window.addEventListener('resize', checkViewport);

    initialized = true;
    console.info('[MobileControlsLayout] Initialized');
  }

  /**
   * Check viewport size and update layout accordingly
   */
  function checkViewport() {
    const width = window.innerWidth;
    const shouldBeMobile = width <= MOBILE_BREAKPOINT;

    if (shouldBeMobile !== isMobile) {
      isMobile = shouldBeMobile;
      
      if (isMobile) {
        applyMobileLayout();
      } else {
        revertToDesktopLayout();
      }
    }
  }

  /**
   * Apply mobile layout - Settings and Sound buttons now appear in compact HUD on mobile
   * This function no longer creates the hg-count-cluster with settings/sound buttons
   */
  function applyMobileLayout() {
    console.info('[MobileControlsLayout] Applying mobile layout (buttons in compact HUD)');

    // NOTE: Settings and Sound buttons are now placed in the compact HUD pill row on mobile
    // They are created by compactHud.js and styled to match other pills
    // This module no longer manages them on mobile

    // Nothing to do here - mobile layout is handled via CSS and compactHud.js
    console.info('[MobileControlsLayout] Mobile layout applied (no-op - buttons in HUD)');
  }

  /**
   * Revert to desktop layout
   */
  function revertToDesktopLayout() {
    console.info('[MobileControlsLayout] Reverting to desktop layout (no-op)');

    // Nothing to do here - desktop layout is handled via CSS
    // Settings and Sound buttons appear in topbar on desktop
    
    console.info('[MobileControlsLayout] Desktop layout restored');
  }

  /**
   * Create a mobile control button
   * @param {string} icon - Button icon emoji
   * @param {string} label - Accessible label
   * @param {string} id - Button ID
   * @returns {HTMLButtonElement}
   */
  function createMobileButton(icon, label, id) {
    const button = document.createElement('button');
    button.id = id;
    button.className = 'mobile-control-btn';
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
    button.textContent = icon;
    
    return button;
  }

  /**
   * Sync sound button state with original
   */
  function syncSoundButtonState() {
    if (!soundBtn) return;

    const originalSoundBtn = document.getElementById('btnMuteToggle');
    if (!originalSoundBtn) return;

    const isPressed = originalSoundBtn.getAttribute('aria-pressed') === 'true';
    soundBtn.setAttribute('aria-pressed', isPressed ? 'true' : 'false');
    soundBtn.textContent = isPressed ? '🔇' : '🔊';
  }

  /**
   * Cleanup and destroy
   */
  function destroy() {
    window.removeEventListener('resize', checkViewport);
    revertToDesktopLayout();
    mobileControlsContainer = null;
    settingsBtn = null;
    soundBtn = null;
    initialized = false;
    console.info('[MobileControlsLayout] Destroyed');
  }

  // Public API
  MobileControlsLayout.init = init;
  MobileControlsLayout.destroy = destroy;

  global.MobileControlsLayout = MobileControlsLayout;

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already loaded, use setTimeout to ensure other modules are ready
    setTimeout(init, 100);
  }

})(window);
