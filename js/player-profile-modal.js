// MODULE: player-profile-modal.js
// Integrated profile system - uses ProfileStorage, ProfileService, and ProfileModal
// Shows profile selection on first launch or rules acknowledgment
// Supports guest mode with toast notification

(function (global) {
  'use strict';

  let rulesAcknowledged = false;
  let profileSelected = false;

  // Show toast notification
  function showToast(message, duration = 3000) {
    const toast = document.createElement('div');
    toast.className = 'profile-toast';
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
    console.info('[player-profile-modal] profile selected:', profile.displayName);
    
    global.ProfileService.setCurrentProfile(profile);
    profileSelected = true;
    
    // Start the opening sequence
    startGame();
  }

  // Handle guest mode
  function handleGuestMode() {
    console.info('[player-profile-modal] guest mode selected');
    
    global.ProfileService.setGuestMode();
    profileSelected = true;
    
    // Show toast warning
    showToast('⚠️ Playing as Guest - Progress will not be saved');
    
    // Start the opening sequence
    startGame();
  }

  // Start the game
  function startGame() {
    setTimeout(() => {
      if (typeof global.startOpeningSequence === 'function') {
        global.startOpeningSequence();
      } else {
        console.warn('[player-profile-modal] startOpeningSequence not found');
      }
    }, 100);
  }

  // Show profile selection modal
  function showProfileSelectionModal() {
    if (profileSelected) {
      console.info('[player-profile-modal] profile already selected, skipping');
      return;
    }

    // Initialize profile service
    const initResult = global.ProfileService.initializeProfile();
    
    if (initResult.firstLaunch) {
      // First launch - show modal with auto-create option
      console.info('[player-profile-modal] first launch - showing profile creation');
      global.ProfileModal.show({
        autoCreate: true,
        onSelect: handleProfileSelect,
        onGuest: handleGuestMode
      });
    } else if (initResult.profile) {
      // Returning user with last profile - auto-load and start
      console.info('[player-profile-modal] auto-loading last profile:', initResult.profile.displayName);
      profileSelected = true;
      startGame();
    } else if (initResult.showSelection) {
      // Multiple profiles but no last - show selection
      console.info('[player-profile-modal] showing profile selection');
      global.ProfileModal.show({
        onSelect: handleProfileSelect,
        onGuest: handleGuestMode
      });
    }
  }

  // Listen for rules modal closed event
  function setupRulesListener() {
    window.addEventListener('bb:rules:acknowledged', function() {
      console.info('[player-profile-modal] rules acknowledged, checking profile');
      rulesAcknowledged = true;
      setTimeout(() => showProfileSelectionModal(), 150);
    }, { once: true });
  }

  // Function for manual profile selection (e.g., from settings)
  function showProfileModal() {
    global.ProfileModal.show({
      onSelect: (profile) => {
        global.ProfileService.setCurrentProfile(profile);
        console.info('[player-profile-modal] profile switched to:', profile.displayName);
      },
      onGuest: () => {
        global.ProfileService.setGuestMode();
        showToast('⚠️ Playing as Guest - Progress will not be saved');
        console.info('[player-profile-modal] switched to guest mode');
      }
    });
  }

  // Expose to global
  global.showProfileModal = showProfileModal;
  
  // For backward compatibility
  global.hideProfileModal = () => {
    global.ProfileModal.hide();
  };
  
  // Function to allow restart to skip modals
  global.skipModalFlow = function() {
    profileSelected = true;
    rulesAcknowledged = true;
    console.info('[player-profile-modal] modal flow skipped for restart');
  };

  // Initialize
  function init() {
    setupRulesListener();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }

})(window);
