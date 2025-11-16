// MODULE: player-profile-modal.js
// Integrated profile system - uses ProfileStorage, ProfileService, and ProfileModal
// Shows profile selection on first launch or rules acknowledgment
// Supports guest mode with toast notification

(function (global) {
  'use strict';

  // Show toast notification
  function showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(26, 38, 52, 0.95);
      color: #ff9933;
      padding: 14px 24px;
      border-radius: 12px;
      border: 2px solid #ff9933;
      font-size: 1rem;
      font-weight: 600;
      z-index: 500;
      box-shadow: 0 4px 16px rgba(0,0,0,0.6);
      animation: slideInUp 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // Handle profile selection
  function handleProfileSelect(profile) {
    global.ProfileService.setCurrentProfile(profile);
    
    // Only start game if Play button was pressed
    // Otherwise, just close the modal and return to hub
    if (global.__bbPlayInitiated) {
      console.info('[player-profile-modal] Play was initiated, starting game with selected profile');
      startGame();
    } else {
      console.info('[player-profile-modal] Play not initiated yet, closing modal and returning to hub');
      // Close the modal
      if (global.ProfileModal && typeof global.ProfileModal.hide === 'function') {
        global.ProfileModal.hide();
      }
    }
  }

  // Handle guest mode
  function handleGuestMode() {
    global.ProfileService.setGuestMode();
    showToast('⚠️ Playing as Guest - Progress will not be saved');
    
    // Only start game if Play button was pressed
    // Otherwise, just close the modal and return to hub
    if (global.__bbPlayInitiated) {
      console.info('[player-profile-modal] Play was initiated, starting game in guest mode');
      startGame();
    } else {
      console.info('[player-profile-modal] Play not initiated yet, closing modal and returning to hub');
      // Close the modal
      if (global.ProfileModal && typeof global.ProfileModal.hide === 'function') {
        global.ProfileModal.hide();
      }
    }
  }

  // Start the game
  function startGame() {
    setTimeout(() => {
      // Guest mode: skip intro and go straight to gameplay
      if (global.ProfileService.isGuestMode()) {
        console.info('[player-profile-modal] guest mode detected, skipping intro');
        
        // Try to mark the user as having started the game
        if (typeof global.markGameStarted === 'function') {
          global.markGameStarted();
        }
        
        // Prefer fast cast flow for smooth, non-theatrical start
        if (typeof global.startFastCastFlow === 'function') {
          global.startFastCastFlow();
        } else {
          // Fallback: dispatch event to continue flow without intro
          window.dispatchEvent(new CustomEvent('bb:intro:finished'));
          console.info('[player-profile-modal] dispatched bb:intro:finished for guest mode');
        }
      } else {
        // Non-guest: normal intro flow
        if (typeof global.startOpeningSequence === 'function') {
          global.startOpeningSequence();
        }
      }
    }, 100);
  }

  // Show profile selection modal
  function showProfileSelectionModal() {
    console.info('[player-profile-modal] showProfileSelectionModal called');
    
    // Defensive checks for required globals
    if (!global.ProfileService) {
      console.error('[player-profile-modal] ProfileService not loaded');
      return;
    }
    if (!global.ProfileModal) {
      console.error('[player-profile-modal] ProfileModal not loaded');
      return;
    }

    const initResult = global.ProfileService.initializeProfile();
    console.info('[player-profile-modal] initializeProfile result:', initResult);
    
    // ALWAYS show the modal - either create form or selection with preselection
    if (initResult.firstLaunch) {
      // First launch: show create form
      console.info('[player-profile-modal] first launch - showing create form');
      global.ProfileModal.show({
        autoCreate: true,
        onSelect: handleProfileSelect,
        onGuest: handleGuestMode
      });
    } else {
      // Profiles exist: show selection modal with last profile preselected
      console.info('[player-profile-modal] showing selection modal with preselect:', initResult.lastProfileId);
      global.ProfileModal.show({
        autoCreate: false,
        preselectId: initResult.lastProfileId,
        onSelect: handleProfileSelect,
        onGuest: handleGuestMode
      });
    }
  }

  // Listen for rules acknowledgment to trigger profile modal
  // NOTE: This auto-show behavior is disabled per startup flow refactor.
  // Profile modal should only open via explicit user action (button clicks).
  function setupRulesListener() {
    console.info('[player-profile-modal] rules listener disabled - profile modal only opens via buttons');
    // Listener removed - profile modal should only show when user explicitly clicks Profile button
    // Old behavior: auto-show after rules acknowledged
    // New behavior: manual trigger only (via showProfileModal())
  }

  // Remove any static "Create Your Profile" text in the UI
  function removeStaticProfileText() {
    // Remove by ID if exists
    const staticProfileById = document.getElementById('staticProfileCreate');
    if (staticProfileById) {
      staticProfileById.style.display = 'none';
      console.info('[player-profile-modal] removed static profile element by ID');
    }
    
    // Remove by class if exists
    const staticProfileByClass = document.querySelector('.static-profile-create');
    if (staticProfileByClass) {
      staticProfileByClass.style.display = 'none';
      console.info('[player-profile-modal] removed static profile element by class');
    }
  }

  // Entry point: Setup event listener after DOMContentLoaded
  document.addEventListener('DOMContentLoaded', function () {
    setupRulesListener();
    removeStaticProfileText();
  });

  // Expose global for testing/integration
  global.PlayerProfileModal = {
    showProfileSelectionModal,
    removeStaticProfileText,
    showToast
  };

  // Expose showProfileModal for the topbar "Switch Profile" button
  global.showProfileModal = function() {
    console.info('[player-profile-modal] showProfileModal called');
    showProfileSelectionModal();
  };

  // Expose hideProfileModal for closing the modal programmatically
  global.hideProfileModal = function() {
    console.info('[player-profile-modal] hideProfileModal called');
    if (global.ProfileModal && typeof global.ProfileModal.hide === 'function') {
      global.ProfileModal.hide();
    } else {
      console.warn('[player-profile-modal] ProfileModal.hide not available');
    }
  };

})(window);