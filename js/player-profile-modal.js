// MODULE: player-profile-modal.js
// Integrated profile system - uses ProfileStorage, ProfileService, and ProfileModal
// Shows profile selection on first launch or rules acknowledgment
// Supports guest mode with toast notification

(function (global) {
  'use strict';

  let profileSelected = false;

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
    profileSelected = true;
    startGame();
  }

  // Handle guest mode
  function handleGuestMode() {
    global.ProfileService.setGuestMode();
    profileSelected = true;
    showToast('⚠️ Playing as Guest - Progress will not be saved');
    startGame();
  }

  // Start the game
  function startGame() {
    setTimeout(() => {
      if (typeof global.startOpeningSequence === 'function') {
        global.startOpeningSequence();
      }
    }, 100);
  }

  // Show profile selection modal
  function showProfileSelectionModal() {
    if (profileSelected) return;

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
    
    if (initResult.firstLaunch) {
      global.ProfileModal.show({
        autoCreate: true,
        onSelect: handleProfileSelect,
        onGuest: handleGuestMode
      });
    } else if (initResult.profile) {
      profileSelected = true;
      startGame();
    } else if (initResult.showSelection) {
      global.ProfileModal.show({
        onSelect: handleProfileSelect,
        onGuest: handleGuestMode
      });
    }
  }

  // Listen for rules acknowledgment to trigger profile modal
  function setupRulesListener() {
    window.addEventListener('bb:rules:acknowledged', function () {
      showProfileSelectionModal();
    });
  }

  // Remove any static "Create Your Profile" text in the UI
  function removeStaticProfileText() {
    Array.from(document.querySelectorAll('*')).forEach(el => {
      if (
        el.textContent &&
        el.textContent.trim() === 'Create Your Profile'
      ) {
        el.style.display = 'none';
      }
    });
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

})(window);