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
    // This creates the "hg-count-cluster" - a group containing player pill + settings + speaker
    if (!mobileControlsContainer) {
      mobileControlsContainer = document.createElement('div');
      mobileControlsContainer.className = 'hg-count-cluster mobile-controls-group';
      mobileControlsContainer.setAttribute('id', 'hgCountCluster');
      mobileControlsContainer.setAttribute('role', 'group');
      mobileControlsContainer.setAttribute('aria-label', 'Player count and controls');
      mobileControlsContainer.style.display = 'inline-flex';
      mobileControlsContainer.style.alignItems = 'center';
      mobileControlsContainer.style.gap = '6px';
    }

    // Find the player pill (it should already exist in the houseguests-header)
    const playerPill = document.getElementById('playersChipInline');
    
    // Create mobile settings button if it doesn't exist
    if (!settingsBtn) {
      settingsBtn = createMobileButton('⚙️', 'Settings', 'settings-btn');
      settingsBtn.classList.add('settings-btn');
      settingsBtn.addEventListener('click', () => {
        originalSettingsBtn.click();
      });
    }
    
    // Ensure settings button is visible (remove any inline display style)
    settingsBtn.style.display = '';

    // Create mobile sound button if it doesn't exist
    if (!soundBtn) {
      soundBtn = createMobileButton('🔊', 'Toggle sound', 'speaker-chip');
      soundBtn.classList.add('speaker-chip');
      soundBtn.setAttribute('aria-pressed', 'false');
      
      soundBtn.addEventListener('click', () => {
        originalSoundBtn.click();
        // Sync state
        syncSoundButtonState();
      });

      // Initial state sync
      syncSoundButtonState();
    }
    
    // Ensure sound button is visible (remove any inline display style)
    soundBtn.style.display = '';

    // Always rebuild the container with proper order: player pill, settings, speaker
    mobileControlsContainer.innerHTML = '';
    
    // If player pill exists, move it into the cluster first
    if (playerPill) {
      // Move player pill into the cluster (whether it's in header or already in container)
      mobileControlsContainer.appendChild(playerPill);
    }
    
    // Add settings and speaker buttons after player pill
    mobileControlsContainer.appendChild(settingsBtn);
    mobileControlsContainer.appendChild(soundBtn);

    // Append container to houseguests header if not already there
    if (!mobileControlsContainer.parentNode || mobileControlsContainer.parentNode !== houseguestsHeader) {
      houseguestsHeader.appendChild(mobileControlsContainer);
    }

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

    // Before removing the container, move the player pill back to houseguests-header if needed
    const houseguestsHeader = document.querySelector('.houseguests-header');
    const playerPill = document.getElementById('playersChipInline');
    
    if (playerPill && mobileControlsContainer && playerPill.parentNode === mobileControlsContainer) {
      // Move player pill back to houseguests header (after h1)
      if (houseguestsHeader) {
        const h1 = houseguestsHeader.querySelector('h1');
        if (h1 && h1.nextSibling) {
          houseguestsHeader.insertBefore(playerPill, h1.nextSibling);
        } else {
          houseguestsHeader.appendChild(playerPill);
        }
      }
    }

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
