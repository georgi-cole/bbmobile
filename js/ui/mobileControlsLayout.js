// MODULE: mobileControlsLayout.js
// Mobile UI Controls Layout Manager
//
// Purpose: Add Settings and Sound buttons to Houseguests header on mobile
//
// Layout (per user feedback):
// 1. No topbar on mobile
// 2. Buttons next to "Houseguests" heading and next to player pill (16/16): Settings, Sound
// 3. Below in compact HUD: phase pill, week pill, DR button, three dots menu

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
   * Apply mobile layout - add Settings and Sound buttons to houseguests header
   */
  function applyMobileLayout() {
    console.info('[MobileControlsLayout] Applying mobile layout');

    // Find the houseguests header
    const houseguestsHeader = document.querySelector('.houseguests-header');
    if (!houseguestsHeader) {
      console.warn('[MobileControlsLayout] .houseguests-header not found');
      return;
    }

    // Find original buttons for click proxying
    const originalSettingsBtn = document.getElementById('btnOpenSettings');
    const originalSoundBtn = document.getElementById('btnMuteToggle');

    if (!originalSettingsBtn || !originalSoundBtn) {
      console.warn('[MobileControlsLayout] Original buttons not found');
      return;
    }

    // Create mobile controls container if it doesn't exist
    if (!mobileControlsContainer) {
      mobileControlsContainer = document.createElement('div');
      mobileControlsContainer.className = 'mobile-controls-group';
      mobileControlsContainer.style.display = 'inline-flex';
      mobileControlsContainer.style.alignItems = 'center';
      mobileControlsContainer.style.gap = '6px';
    }

    // Create mobile settings button if it doesn't exist
    if (!settingsBtn) {
      settingsBtn = createMobileButton('⚙️', 'Settings', 'btnSettingsMobile');
      settingsBtn.addEventListener('click', () => {
        originalSettingsBtn.click();
      });
    }

    // Create mobile sound button if it doesn't exist
    if (!soundBtn) {
      soundBtn = createMobileButton('🔊', 'Toggle sound', 'btnSoundMobile');
      soundBtn.setAttribute('aria-pressed', 'false');
      
      soundBtn.addEventListener('click', () => {
        originalSoundBtn.click();
        // Sync state
        syncSoundButtonState();
      });

      // Initial state sync
      syncSoundButtonState();
    }

    // Add buttons to container
    mobileControlsContainer.innerHTML = '';
    mobileControlsContainer.appendChild(settingsBtn);
    mobileControlsContainer.appendChild(soundBtn);

    // Append container to houseguests header (at the end, after player pill)
    houseguestsHeader.appendChild(mobileControlsContainer);

    // Sync sound button state periodically
    syncSoundButtonState();
    
    // Listen for sound state changes
    if (originalSoundBtn) {
      const observer = new MutationObserver(syncSoundButtonState);
      observer.observe(originalSoundBtn, {
        attributes: true,
        attributeFilter: ['aria-pressed']
      });
    }

    console.info('[MobileControlsLayout] Mobile layout applied');
  }

  /**
   * Revert to desktop layout
   */
  function revertToDesktopLayout() {
    console.info('[MobileControlsLayout] Reverting to desktop layout');

    // Remove mobile controls container
    if (mobileControlsContainer && mobileControlsContainer.parentNode) {
      mobileControlsContainer.parentNode.removeChild(mobileControlsContainer);
    }

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
