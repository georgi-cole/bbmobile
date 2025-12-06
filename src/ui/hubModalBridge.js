// MODULE: hubModalBridge.js
// Ensures modals appear above the intro hub with correct z-index and pointer-events
// Provides fallback modal handlers for buttons that may not have primary handlers loaded yet
//
// Features:
// - MutationObserver watches for modal roots (.rulesDim, .profile-modal-dim, etc.)
// - Forces z-index: 10050 on modals when they appear
// - Sets intro hub pointer-events: none while any modal is visible
// - Provides placeholder fallback modals for credits and leaderboard if globals absent
// - Auto-wires on load, no manual initialization needed

(function(g) {
  'use strict';

  // Modal root selectors to observe
  const MODAL_SELECTORS = [
    '.rulesDim',
    '.profile-modal-dim',
    '.creditsDim',
    '.leaderboardDim',
    '.helpDim',
    '.settingsDim',
    '#settingsBackdrop',     // Settings modal (uses .modal-backdrop)
    '.modal-backdrop',       // Generic modal backdrop (settings, config, etc.)
    '.xp-modal-backdrop',    // XP/Progression modal
    '.socialize-modal-backdrop' // Social maneuvers modal
  ];

  const MODAL_Z_INDEX = 10050;
  const HUB_Z_INDEX = 9990;

  let observer = null;
  let hubElement = null;
  const activeModals = new Set();
  let previousModals = new Set();
  let styleInjected = false;

  // ===== MODAL MONITORING =====

  /**
   * Get a normalized modal ID for PauseManager tracking
   */
  function getModalId(modalEl) {
    if (!modalEl) return null;
    
    // Map common modal classes/IDs to normalized IDs
    const className = modalEl.className || '';
    const id = modalEl.id || '';
    
    if (className.includes('rulesDim') || id === 'rulesModal') return 'modal:hub:rules';
    if (className.includes('profile-modal-dim') || id === 'profileModal') return 'modal:hub:profile';
    if (className.includes('creditsDim') || id === 'creditsModal') return 'modal:hub:credits';
    if (className.includes('leaderboardDim') || id === 'leaderboardModal') return 'modal:hub:leaderboard';
    if (className.includes('helpDim') || id === 'helpModal') return 'modal:hub:help';
    if (className.includes('settingsDim') || id === 'settingsBackdrop' || id === 'settingsModal') return 'modal:hub:settings';
    if (className.includes('modal-backdrop')) return 'modal:hub:generic';
    if (className.includes('xp-modal-backdrop')) return 'modal:hub:xp';
    if (className.includes('socialize-modal-backdrop')) return 'modal:hub:socialize';
    
    // Fallback: use class name or ID
    return 'modal:hub:' + (id || className.split(' ')[0] || 'unknown');
  }

  /**
   * Check if a modal root is currently visible
   */
  function isModalVisible(modalEl) {
    if (!modalEl) return false;
    const style = window.getComputedStyle(modalEl);
    return style.display !== 'none' && style.opacity !== '0';
  }

  /**
   * Update modal visibility tracking and hub pointer-events
   */
  function updateModalState() {
    // Find all modal roots in DOM
    const modals = MODAL_SELECTORS
      .map(sel => document.querySelector(sel))
      .filter(el => el && isModalVisible(el));

    // Build set of currently visible modal IDs for PauseManager
    const currentModalIds = new Set();
    modals.forEach(modal => {
      const modalId = getModalId(modal);
      if (modalId) {
        currentModalIds.add(modalId);
      }
    });

    // Detect modals that were opened (new in currentModalIds, not in previousModals)
    currentModalIds.forEach(modalId => {
      if (!previousModals.has(modalId)) {
        // Modal opened - notify PauseManager (defensive check)
        if (g.game && g.game.pauseManager && typeof g.game.pauseManager.open === 'function') {
          console.info('[HubModalBridge] Modal opened, pausing game:', modalId);
          try {
            g.game.pauseManager.open(modalId);
          } catch (err) {
            console.error('[HubModalBridge] Failed to pause for modal:', modalId, err);
          }
        }
      }
    });

    // Detect modals that were closed (in previousModals, not in currentModalIds)
    previousModals.forEach(modalId => {
      if (!currentModalIds.has(modalId)) {
        // Modal closed - notify PauseManager (defensive check)
        if (g.game && g.game.pauseManager && typeof g.game.pauseManager.close === 'function') {
          console.info('[HubModalBridge] Modal closed, resuming game:', modalId);
          try {
            g.game.pauseManager.close(modalId);
          } catch (err) {
            console.error('[HubModalBridge] Failed to resume for modal:', modalId, err);
          }
        }
      }
    });

    // Update previousModals for next comparison
    previousModals = new Set(currentModalIds);

    // Update active modals set (for backward compatibility)
    activeModals.clear();
    modals.forEach(modal => {
      activeModals.add(modal);
      
      // Ensure modal has correct z-index
      if (modal.style.zIndex !== String(MODAL_Z_INDEX)) {
        console.info('[HubModalBridge] Elevating modal z-index:', modal.className);
        modal.style.zIndex = MODAL_Z_INDEX;
      }
    });

    // Update hub pointer-events based on modal visibility
    if (!hubElement) {
      hubElement = document.getElementById('introScreen');
    }

    if (hubElement) {
      const hasVisibleModal = activeModals.size > 0;
      const shouldDisablePointer = hasVisibleModal;
      
      if (shouldDisablePointer && hubElement.style.pointerEvents !== 'none') {
        console.info('[HubModalBridge] Disabling hub pointer-events (modal visible)');
        hubElement.style.pointerEvents = 'none';
      } else if (!shouldDisablePointer && hubElement.style.pointerEvents === 'none') {
        console.info('[HubModalBridge] Restoring hub pointer-events (no modals)');
        hubElement.style.pointerEvents = '';
      }
    }
  }

  /**
   * Set up MutationObserver to watch for modal changes
   */
  function setupObserver() {
    if (observer) return; // Already set up

    observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;

      for (const mutation of mutations) {
        // Check if any modal roots were added/removed
        if (mutation.type === 'childList') {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const isModal = MODAL_SELECTORS.some(sel => 
                node.matches && node.matches(sel)
              );
              if (isModal) {
                shouldUpdate = true;
                break;
              }
            }
          }
        }
        
        // Check if modal visibility attributes changed
        if (mutation.type === 'attributes') {
          const target = mutation.target;
          const isModal = MODAL_SELECTORS.some(sel => 
            target.matches && target.matches(sel)
          );
          if (isModal) {
            shouldUpdate = true;
            break;
          }
        }
      }

      if (shouldUpdate) {
        // Debounce updates slightly
        setTimeout(updateModalState, 10);
      }
    });

    // Observe document body for modal additions/changes
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });

    console.info('[HubModalBridge] MutationObserver initialized');
  }

  /**
   * Inject CSS for modal z-indices
   */
  function injectStyles() {
    if (styleInjected) return;

    const style = document.createElement('style');
    style.id = 'hub-modal-bridge-styles';
    style.textContent = `
      /* Hub Modal Bridge - ensure modals appear above intro hub */
      .rulesDim { z-index: ${MODAL_Z_INDEX} !important; }
      .profile-modal-dim { z-index: ${MODAL_Z_INDEX} !important; }
      .creditsDim { z-index: ${MODAL_Z_INDEX} !important; }
      .leaderboardDim { z-index: ${MODAL_Z_INDEX} !important; }
      .helpDim { z-index: ${MODAL_Z_INDEX} !important; }
      .settingsDim { z-index: ${MODAL_Z_INDEX} !important; }
      #settingsBackdrop { z-index: ${MODAL_Z_INDEX} !important; }
      .modal-backdrop { z-index: ${MODAL_Z_INDEX} !important; }
      .xp-modal-backdrop { z-index: ${MODAL_Z_INDEX} !important; }
      .socialize-modal-backdrop { z-index: ${MODAL_Z_INDEX} !important; }
      
      /* Intro screen hub - below modals */
      #introScreen,
      .intro-screen { z-index: ${HUB_Z_INDEX} !important; }
    `;

    document.head.appendChild(style);
    styleInjected = true;
    console.info('[HubModalBridge] Styles injected');
  }

  // ===== FALLBACK MODAL HANDLERS =====

  /**
   * Create a simple placeholder modal
   */
  function createPlaceholderModal(title, content) {
    const dim = document.createElement('div');
    dim.className = 'placeholder-modal-dim';
    dim.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: ${MODAL_Z_INDEX};
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(120% 120% at 50% 10%, rgba(2,6,10,.78), rgba(0,0,0,.92));
      backdrop-filter: blur(2px);
      opacity: 0;
      transition: opacity 0.2s ease;
    `;

    const panel = document.createElement('div');
    panel.style.cssText = `
      width: min(560px, 94vw);
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 24px;
      border-radius: 16px;
      background: linear-gradient(145deg, #0d1624, #0a1320);
      border: 1px solid rgba(120,180,255,.22);
      box-shadow: 0 8px 32px rgba(0,0,0,.6);
      transform: scale(0.95);
      transition: transform 0.2s ease;
    `;

    const titleEl = document.createElement('div');
    titleEl.style.cssText = `
      font-size: 1.5rem;
      font-weight: 700;
      color: #c4d9ec;
      text-align: center;
      margin: 0;
    `;
    titleEl.textContent = title;

    const bodyEl = document.createElement('div');
    bodyEl.style.cssText = `
      flex: 1;
      overflow-y: auto;
      min-height: 100px;
      color: #8cabc8;
      font-size: 1rem;
      line-height: 1.6;
      text-align: center;
      padding: 20px 0;
    `;
    bodyEl.innerHTML = content;

    const footer = document.createElement('div');
    footer.style.cssText = `
      display: flex;
      justify-content: center;
      padding-top: 8px;
      border-top: 1px solid rgba(63, 99, 133, 0.3);
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
      padding: 10px 24px;
      font-size: 1rem;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      border: 1px solid rgba(120, 180, 240, 0.3);
      background: linear-gradient(135deg, #3f6385, #2a4a62);
      color: #fff;
      transition: all 0.2s ease;
    `;

    closeBtn.addEventListener('click', () => {
      dim.style.opacity = '0';
      panel.style.transform = 'scale(0.95)';
      setTimeout(() => {
        if (dim.parentNode) {
          dim.parentNode.removeChild(dim);
        }
        updateModalState();
      }, 200);
    });

    footer.appendChild(closeBtn);
    panel.appendChild(titleEl);
    panel.appendChild(bodyEl);
    panel.appendChild(footer);
    dim.appendChild(panel);

    // Handle ESC key
    dim.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeBtn.click();
      }
    });

    // Prevent backdrop clicks from closing
    dim.addEventListener('mousedown', (e) => {
      if (e.target === dim) {
        e.preventDefault();
        closeBtn.focus();
      }
    });

    return dim;
  }

  /**
   * Show placeholder credits modal
   */
  function showPlaceholderCredits() {
    console.info('[HubModalBridge] Showing placeholder credits modal');
    
    const content = `
      <p><strong>Big Brother Mobile Game</strong></p>
      <p>A comprehensive simulation of the Big Brother game experience</p>
      <br>
      <p>Developed with ❤️ for BB fans everywhere</p>
      <br>
      <p><em>This is a placeholder modal. The full credits system is not yet loaded.</em></p>
    `;

    const modal = createPlaceholderModal('Credits', content);
    document.body.appendChild(modal);

    // Trigger show animation
    requestAnimationFrame(() => {
      modal.style.display = 'flex';
      requestAnimationFrame(() => {
        modal.style.opacity = '1';
        const panel = modal.querySelector('div');
        if (panel) panel.style.transform = 'scale(1)';
      });
    });

    updateModalState();
  }

  /**
   * Show placeholder leaderboard modal
   */
  function showPlaceholderLeaderboard() {
    console.info('[HubModalBridge] Showing placeholder leaderboard modal');
    
    const content = `
      <p><strong>XP Leaderboard</strong></p>
      <br>
      <p>Track your progress and compete with yourself across seasons!</p>
      <br>
      <p><em>This is a placeholder modal. The full leaderboard/progression system is not yet loaded.</em></p>
      <br>
      <p>Start playing to earn XP and unlock achievements!</p>
    `;

    const modal = createPlaceholderModal('Leaderboard', content);
    document.body.appendChild(modal);

    // Trigger show animation
    requestAnimationFrame(() => {
      modal.style.display = 'flex';
      requestAnimationFrame(() => {
        modal.style.opacity = '1';
        const panel = modal.querySelector('div');
        if (panel) panel.style.transform = 'scale(1)';
      });
    });

    updateModalState();
  }

  // ===== EVENT LISTENER SETUP =====

  /**
   * Wire up fallback event listeners for custom events
   */
  function setupFallbackListeners() {
    // Credits fallback
    window.addEventListener('bb:ui:open-credits', (e) => {
      if (e.defaultPrevented) return; // Already handled
      
      console.info('[HubModalBridge] Fallback credits handler triggered');
      
      // Check if primary handler exists
      if (typeof g.showCreditsModal === 'function') {
        g.showCreditsModal();
        e.preventDefault();
      } else if (typeof g.showCredits === 'function') {
        g.showCredits();
        e.preventDefault();
      } else {
        // Show placeholder
        showPlaceholderCredits();
        e.preventDefault();
      }
    });

    // Leaderboard fallback
    window.addEventListener('bb:ui:open-leaderboard', (e) => {
      if (e.defaultPrevented) return; // Already handled
      
      console.info('[HubModalBridge] Fallback leaderboard handler triggered');
      
      // Check if primary handler exists
      if (typeof g.showLeaderboard === 'function') {
        g.showLeaderboard();
        e.preventDefault();
      } else if (g.ProgressionUI && typeof g.ProgressionUI.showLeaderboard === 'function') {
        g.ProgressionUI.showLeaderboard();
        e.preventDefault();
      } else {
        // Show placeholder
        showPlaceholderLeaderboard();
        e.preventDefault();
      }
    });

    console.info('[HubModalBridge] Fallback event listeners registered');
  }

  // ===== INITIALIZATION =====

  /**
   * Initialize the hub modal bridge
   */
  function init() {
    console.info('[HubModalBridge] Initializing...');
    
    injectStyles();
    setupObserver();
    setupFallbackListeners();
    
    // Initial state update
    setTimeout(updateModalState, 100);
    
    // Periodic check (fallback in case observer misses something)
    setInterval(updateModalState, 2000);
    
    console.info('[HubModalBridge] Initialized');
  }

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export API (for testing/debugging)
  g.HubModalBridge = {
    updateModalState,
    showPlaceholderCredits,
    showPlaceholderLeaderboard
  };

})(window);
